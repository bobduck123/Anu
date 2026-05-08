"""Presence owner identity provisioning.

Presence owner routes are ANU-native: they accept the same validated JWTs as
the rest of the backend, then resolve the token subject to a local ANU User.
For first-time Supabase users, this helper provisions a least-privilege user so
Studio can show an empty owner state instead of failing identity lookup.
"""

from __future__ import annotations

import re
from typing import Any

from flask import current_app
from flask_jwt_extended import get_jwt, get_jwt_identity
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.security import generate_password_hash

from ..extensions import db
from ..models import User


SAFE_PRESENCE_OWNER_ROLE = "participant"
SAFE_EXISTING_PRESENCE_OWNER_ROLES = {"participant", "user", "member"}
_LOCAL_EMAIL_DOMAIN = "presence-owner.local"


def _clean_text(value: Any, max_len: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:max_len]


def _normalise_email(value: Any) -> str | None:
    text = _clean_text(value, 150)
    if not text or "@" not in text:
        return None
    return text.lower()


def _claim_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _safe_slug(value: str, *, fallback: str, max_len: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    slug = slug[:max_len].strip("-")
    return slug or fallback


def _unique_user_field(field_name: str, base: str, *, max_len: int) -> str:
    base = base[:max_len].strip("-_ .") or "presence-owner"
    candidate = base
    suffix = 2
    while User.query.filter(getattr(User, field_name) == candidate).first():
        suffix_text = f"-{suffix}"
        candidate = f"{base[: max_len - len(suffix_text)]}{suffix_text}"
        suffix += 1
    return candidate


def _subject_from_identity_and_claims(identity: Any, claims: dict[str, Any]) -> str | None:
    if isinstance(identity, dict):
        for key in ("sub", "user_id", "global_subject_id"):
            value = _clean_text(identity.get(key), 120)
            if value:
                return value
    elif isinstance(identity, str):
        value = _clean_text(identity, 120)
        if value and not value.startswith("control::"):
            return value

    for key in ("sub", "user_id", "global_subject_id"):
        value = _clean_text(claims.get(key), 120)
        if value:
            return value
    return None


def _candidate_usernames(identity: Any, claims: dict[str, Any]) -> list[str]:
    candidates: list[str] = []
    if isinstance(identity, dict):
        for key in ("username", "preferred_username"):
            value = _clean_text(identity.get(key), 150)
            if value:
                candidates.append(value)
    elif isinstance(identity, str):
        value = _clean_text(identity, 150)
        if value:
            candidates.append(value.split("control::", 1)[1] if value.startswith("control::") else value)

    for key in ("username", "preferred_username"):
        value = _clean_text(claims.get(key), 150)
        if value:
            candidates.append(value.split("control::", 1)[1] if value.startswith("control::") else value)

    unique: list[str] = []
    for candidate in candidates:
        if candidate not in unique:
            unique.append(candidate)
    return unique


def _display_name_from_claims(claims: dict[str, Any], email: str | None, subject: str | None) -> str:
    user_metadata = _claim_dict(claims.get("user_metadata"))
    for key in ("display_name", "name", "full_name"):
        value = _clean_text(user_metadata.get(key), 80)
        if value:
            return value
    if email:
        return email.split("@", 1)[0][:80] or "Presence Owner"
    if subject:
        return f"Presence {subject[:8]}"
    return "Presence Owner"


def _looks_like_external_supabase_claims(claims: dict[str, Any], email: str | None) -> bool:
    return bool(
        email
        or isinstance(claims.get("user_metadata"), dict)
        or isinstance(claims.get("app_metadata"), dict)
        or claims.get("iss")
        or claims.get("provider")
    )


def _is_safe_email_match(user: User) -> bool:
    return (getattr(user, "role", "") or "").lower() in SAFE_EXISTING_PRESENCE_OWNER_ROLES


def _synthetic_email(subject: str | None) -> str:
    stable = _safe_slug(subject or "owner", fallback="owner", max_len=64).replace("-", "")
    return f"presence+{stable[:48]}@{_LOCAL_EMAIL_DOMAIN}"


def _find_existing_user(
    *,
    usernames: list[str],
    email: str | None,
    subject: str | None,
    allow_username_lookup: bool,
) -> User | None:
    if subject:
        user = User.query.filter_by(global_subject_id=subject).first()
        if user:
            return user

    if allow_username_lookup:
        for username in usernames:
            user = User.query.filter_by(username=username).first()
            if user:
                return user

    if email:
        user = User.query.filter_by(email=email).first()
        if user:
            if subject and user.global_subject_id and user.global_subject_id != subject:
                current_app.logger.warning(
                    "Presence owner identity conflict for email %s", email
                )
                return None
            if not _is_safe_email_match(user):
                current_app.logger.warning(
                    "Presence owner refused privileged email-only match for %s", email
                )
                return None
            if subject and not user.global_subject_id:
                user.global_subject_id = subject
                db.session.commit()
            return user
    return None


def _provision_user(*, email: str | None, subject: str | None, claims: dict[str, Any]) -> User:
    stable_seed = subject or email or "owner"
    username_base = "presence-" + _safe_slug(stable_seed, fallback="owner", max_len=70)
    pseudonym_base = _display_name_from_claims(claims, email, subject)
    user = User(
        global_subject_id=subject,
        username=_unique_user_field("username", username_base, max_len=150),
        pseudonym=_unique_user_field("pseudonym", pseudonym_base, max_len=80),
        email=email or _synthetic_email(subject),
        password=generate_password_hash("external-supabase-auth-managed"),
        role=SAFE_PRESENCE_OWNER_ROLE,
        node_id=None,
        points=0,
        level=1,
        points_to_level_up=100,
    )
    db.session.add(user)
    db.session.commit()
    return user


def resolve_or_provision_presence_owner() -> User | None:
    """Resolve or create a local least-privilege User for a validated JWT.

    This helper assumes `alpha_jwt_required` has already validated the token.
    It intentionally ignores role/admin-like JWT metadata for provisioning.
    """
    try:
        identity = get_jwt_identity()
        claims = get_jwt() or {}
    except Exception:
        return None

    subject = _subject_from_identity_and_claims(identity, claims)
    email = _normalise_email(claims.get("email"))
    if not email and isinstance(identity, dict):
        email = _normalise_email(identity.get("email"))

    usernames = _candidate_usernames(identity, claims)
    allow_username_lookup = not _looks_like_external_supabase_claims(claims, email)

    try:
        existing = _find_existing_user(
            usernames=usernames,
            email=email,
            subject=subject,
            allow_username_lookup=allow_username_lookup,
        )
        if existing:
            return existing
        if not subject and not email:
            return None
        return _provision_user(email=email, subject=subject, claims=claims)
    except IntegrityError:
        db.session.rollback()
        try:
            return _find_existing_user(
                usernames=usernames,
                email=email,
                subject=subject,
                allow_username_lookup=allow_username_lookup,
            )
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Presence owner identity lookup failed after integrity retry")
            return None
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("Presence owner identity resolution failed")
        return None
