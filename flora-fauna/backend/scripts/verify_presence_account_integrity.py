from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import timedelta
from pathlib import Path
from typing import Any

from flask_jwt_extended import create_access_token
from sqlalchemy import func, text


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
DEFAULT_OUTPUT = REPO_ROOT / (
    "docs/program/evidence/presence-e4hatu-auth-repair-proof/"
    "account_integrity_result.json"
)
DEFAULT_ROOM_SLUG = "ggm-christina-goddard"
CONTROLLED_LAUNCH_SOURCE = "controlled_launch_pilot"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.provision_presence_pilot_admin import (  # noqa: E402
    _build_app,
    _database_url,
    _load_env_file,
)


def subject_fingerprint(value: Any) -> str | None:
    text_value = str(value or "").strip()
    if not text_value:
        return None
    return hashlib.sha256(text_value.encode("utf-8")).hexdigest()[:12]


def redact_email(value: str | None) -> str | None:
    email = str(value or "").strip().lower()
    if "@" not in email:
        return None
    local, domain = email.split("@", 1)
    return f"{local[:2]}***@{domain}"


def assert_single_app_user(email: str, rows: list[Any]) -> None:
    if len(rows) > 1:
        raise RuntimeError(f"Multiple Presence app users exist for {email}; stop before repair.")


def assert_single_auth_user(email: str, rows: list[Any]) -> None:
    if len(rows) > 1:
        raise RuntimeError(f"Multiple Supabase auth users exist for {email}; stop before repair.")


def assert_subject_rebind_available(
    subject: str | None,
    *,
    target_user_id: int | None,
    rows: list[Any],
) -> None:
    if not subject:
        raise RuntimeError("Supabase auth subject is missing; cannot repair binding.")
    conflicts = [row for row in rows if getattr(row, "id", None) != target_user_id]
    if conflicts:
        raise RuntimeError("Supabase auth subject is already bound to another Presence app user.")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _clean_email(value: str) -> str:
    email = str(value or "").strip().lower()
    if "@" not in email or len(email) > 150:
        raise RuntimeError("A valid account email is required.")
    return email


def _auth_user_rows(email: str) -> list[dict[str, Any]]:
    from manara_backend_app.extensions import db

    rows = db.session.execute(
        text(
            """
            select
              id::text as id,
              email,
              aud,
              role,
              email_confirmed_at is not null as email_confirmed,
              last_sign_in_at,
              banned_until,
              deleted_at,
              raw_app_meta_data,
              raw_user_meta_data
            from auth.users
            where lower(email) = :email
            order by created_at asc
            """
        ),
        {"email": email},
    ).mappings()
    return [dict(row) for row in rows]


def _identity_rows(subjects: list[str]) -> list[dict[str, Any]]:
    from manara_backend_app.extensions import db

    if not subjects:
        return []
    rows = db.session.execute(
        text(
            """
            select
              user_id::text as user_id,
              provider,
              count(*) over (partition by user_id, provider) as provider_count
            from auth.identities
            where user_id::text = any(:subjects)
            order by user_id asc, provider asc
            """
        ),
        {"subjects": subjects},
    ).mappings()
    return [dict(row) for row in rows]


def _auth_snapshot(email: str) -> dict[str, Any]:
    rows = _auth_user_rows(email)
    assert_single_auth_user(email, rows)
    identities = _identity_rows([row["id"] for row in rows])
    auth_user = rows[0] if rows else None
    if not auth_user:
        return {
            "exists": False,
            "user_count": 0,
            "subject": None,
            "subject_fingerprint": None,
            "identities": [],
        }

    providers = [row["provider"] for row in identities]
    provider_counts = {
        row["provider"]: int(row["provider_count"])
        for row in identities
    }
    return {
        "exists": True,
        "user_count": len(rows),
        "subject": auth_user["id"],
        "subject_fingerprint": subject_fingerprint(auth_user["id"]),
        "email_redacted": redact_email(auth_user.get("email")),
        "email_confirmed": bool(auth_user.get("email_confirmed")),
        "last_sign_in_present": auth_user.get("last_sign_in_at") is not None,
        "banned": auth_user.get("banned_until") is not None,
        "deleted": auth_user.get("deleted_at") is not None,
        "aud": auth_user.get("aud"),
        "role": auth_user.get("role"),
        "providers": providers,
        "provider_counts": provider_counts,
        "has_email_identity": "email" in providers,
        "has_duplicate_provider_identity": any(count > 1 for count in provider_counts.values()),
        "app_metadata_keys": sorted((auth_user.get("raw_app_meta_data") or {}).keys()),
        "user_metadata_keys": sorted((auth_user.get("raw_user_meta_data") or {}).keys()),
    }


def _presence_user_rows(email: str):
    from manara_backend_app.models import User

    return User.query.filter(func.lower(User.email) == email).order_by(User.id.asc()).all()


def _presence_snapshot(email: str, auth_snapshot: dict[str, Any], room_slug: str) -> dict[str, Any]:
    from manara_backend_app.models import ObserverProfile, PresenceNode
    from manara_backend_app.services.presence_entitlement_service import (
        internal_lifetime_free_entitlement_for_user,
        is_active_internal_lifetime_free_entitlement,
    )

    users = _presence_user_rows(email)
    assert_single_app_user(email, users)
    user = users[0] if users else None
    auth_subject = auth_snapshot.get("subject")
    subject_rows = []
    if auth_subject:
        from manara_backend_app.models import User

        subject_rows = User.query.filter_by(global_subject_id=auth_subject).order_by(User.id.asc()).all()
    room = PresenceNode.query.filter_by(slug=room_slug).first()
    entitlement = internal_lifetime_free_entitlement_for_user(user.id) if user else None
    original_owner_id = None
    if room:
        original_owner_id = (
            ((room.node_metadata or {}).get("pilot_admin_provisioning") or {})
            .get("original_owner_user_id")
        )
    return {
        "exists": bool(user),
        "email_count": len(users),
        "user": user,
        "user_id": getattr(user, "id", None),
        "role": getattr(user, "role", None),
        "active": bool(user and not user.is_suspended),
        "required_account_fields_present": bool(
            user and user.username and user.pseudonym and user.email
        ),
        "stored_subject": getattr(user, "global_subject_id", None),
        "stored_subject_fingerprint": subject_fingerprint(
            getattr(user, "global_subject_id", None)
        ),
        "subject_matches_supabase": bool(
            user and auth_subject and user.global_subject_id == auth_subject
        ),
        "supabase_subject_bound_user_ids": [row.id for row in subject_rows],
        "supabase_subject_bound_user_count": len(subject_rows),
        "optional_observer_profile_count": (
            ObserverProfile.query.filter_by(user_id=user.id).count()
            if user
            else 0
        ),
        "room": room,
        "room_id": getattr(room, "id", None),
        "room_slug": getattr(room, "slug", None),
        "room_owner_user_id": getattr(room, "owner_user_id", None),
        "room_owned_by_target": bool(user and room and room.owner_user_id == user.id),
        "room_original_owner_user_id": original_owner_id,
        "entitlement": entitlement,
        "entitlement_id": getattr(entitlement, "id", None),
        "entitlement_user_id": getattr(entitlement, "user_id", None),
        "entitlement_belongs_to_target": bool(
            user and entitlement and entitlement.user_id == user.id
        ),
        "entitlement_active_internal_lifetime_free": (
            is_active_internal_lifetime_free_entitlement(entitlement)
        ),
    }


def _supabase_headers(app, subject: str, email: str) -> dict[str, str]:
    with app.app_context():
        token = create_access_token(
            identity=subject,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": "authenticated",
                "email": email,
                "user_metadata": {"display_name": "Account integrity probe"},
                "app_metadata": {"provider": "email"},
            },
            expires_delta=timedelta(minutes=10),
        )
    return {"Authorization": f"Bearer {token}"}


def _public_headers(app, username: str, role: str) -> dict[str, str]:
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": role,
                "username": username,
            },
            expires_delta=timedelta(minutes=10),
        )
    return {"Authorization": f"Bearer {token}"}


def _negative_user(presence: dict[str, Any]):
    from manara_backend_app.models import User

    original_owner_id = presence.get("room_original_owner_user_id")
    if original_owner_id:
        candidate = User.query.get(original_owner_id)
        if candidate and candidate.id != presence.get("user_id") and candidate.role != "platform_admin":
            return candidate
    return (
        User.query.filter(User.id != presence.get("user_id"))
        .filter(User.role != "platform_admin")
        .order_by(User.id.asc())
        .first()
    )


def _status(response) -> dict[str, Any]:
    return {"status": response.status_code, "ok": 200 <= response.status_code < 300}


def _route_checks(
    app,
    *,
    email: str,
    auth_snapshot: dict[str, Any],
    presence: dict[str, Any],
) -> dict[str, Any]:
    client = app.test_client()
    public_origin = "https://public.test"
    room_id = presence.get("room_id")
    room_slug = presence.get("room_slug")
    subject = auth_snapshot.get("subject")
    target_headers = _supabase_headers(app, subject, email) if subject else {}

    owner_nodes = client.get(
        "/api/presence/owner/nodes",
        headers=target_headers,
        base_url=public_origin,
    )
    owner_detail = client.get(
        f"/api/presence/owner/nodes/{room_id}",
        headers=target_headers,
        base_url=public_origin,
    ) if room_id else None
    analytics = client.get(
        f"/api/presence/owner/rooms/{room_id}/analytics",
        headers=target_headers,
        base_url=public_origin,
    ) if room_id else None
    passes = client.get(
        f"/api/presence/owner/rooms/{room_id}/passes",
        headers=target_headers,
        base_url=public_origin,
    ) if room_id else None
    keys = client.get(
        f"/api/presence/owner/rooms/{room_id}/keys",
        headers=target_headers,
        base_url=public_origin,
    ) if room_id else None
    public_room = client.get(
        f"/api/presence/public/{room_slug}",
        base_url=public_origin,
    ) if room_slug else None

    negative = _negative_user(presence)
    negative_headers = (
        _public_headers(app, negative.username, negative.role)
        if negative
        else {}
    )
    negative_analytics = client.get(
        f"/api/presence/owner/rooms/{room_id}/analytics",
        headers=negative_headers,
        base_url=public_origin,
    ) if room_id and negative else None
    negative_control = client.post(
        "/auth/control-token",
        json={"requires_mfa": True},
        headers=negative_headers,
        base_url=public_origin,
    ) if negative else None

    public_text = ""
    if public_room is not None:
        public_text = json.dumps(public_room.get_json(silent=True) or {}, sort_keys=True)
    public_redacted = bool(
        public_room is not None
        and public_room.status_code == 200
        and email.lower() not in public_text.lower()
        and "platform_admin" not in public_text
        and "internal_lifetime_free" not in public_text
    )

    return {
        "target_supabase_subject_owner_nodes": _status(owner_nodes),
        "target_owner_detail": _status(owner_detail) if owner_detail is not None else None,
        "target_owner_analytics": _status(analytics) if analytics is not None else None,
        "target_owner_passes": _status(passes) if passes is not None else None,
        "target_owner_room_keys": _status(keys) if keys is not None else None,
        "public_room": _status(public_room) if public_room is not None else None,
        "public_room_redacts_target_email_admin_entitlement": public_redacted,
        "negative_user_id": getattr(negative, "id", None),
        "negative_owner_analytics": (
            _status(negative_analytics) if negative_analytics is not None else None
        ),
        "negative_control_token_issue": (
            _status(negative_control) if negative_control is not None else None
        ),
    }


def _repair_binding(
    presence: dict[str, Any],
    auth_snapshot: dict[str, Any],
    *,
    apply: bool,
) -> dict[str, Any]:
    from manara_backend_app.extensions import db
    from manara_backend_app.models import User

    user = presence.get("user")
    auth_subject = auth_snapshot.get("subject")
    if not user:
        raise RuntimeError("Presence app user is missing; cannot repair binding.")
    if not auth_snapshot.get("exists"):
        raise RuntimeError("Supabase auth user is missing; cannot repair binding.")

    subject_rows = User.query.filter_by(global_subject_id=auth_subject).order_by(User.id.asc()).all()
    assert_subject_rebind_available(
        auth_subject,
        target_user_id=user.id,
        rows=subject_rows,
    )
    would_rebind = user.global_subject_id != auth_subject
    result = {
        "action": "rebind_presence_global_subject",
        "mode": "repair_apply" if apply else "repair_dry_run",
        "would_rebind": would_rebind,
        "applied": False,
        "user_id": user.id,
        "from_subject_fingerprint": subject_fingerprint(user.global_subject_id),
        "to_subject_fingerprint": subject_fingerprint(auth_subject),
    }
    if apply and would_rebind:
        user.global_subject_id = auth_subject
        db.session.commit()
        result["applied"] = True
    elif apply:
        db.session.rollback()
    return result


def _summary(
    *,
    email: str,
    compare_email: str | None,
    auth_snapshot: dict[str, Any],
    presence: dict[str, Any],
    route_checks: dict[str, Any],
    compare_auth_snapshot: dict[str, Any] | None,
    repair: dict[str, Any] | None,
) -> dict[str, Any]:
    entitlement = presence.get("entitlement")
    checks = {
        "supabase_auth_user_exists": bool(auth_snapshot.get("exists")),
        "supabase_email_identity": bool(auth_snapshot.get("has_email_identity")),
        "supabase_auth_user_healthy": bool(
            auth_snapshot.get("email_confirmed")
            and not auth_snapshot.get("banned")
            and not auth_snapshot.get("deleted")
        ),
        "presence_app_user_exists": bool(presence.get("exists")),
        "presence_email_unique": presence.get("email_count") == 1,
        "presence_required_account_fields": bool(
            presence.get("required_account_fields_present")
        ),
        "presence_user_active": bool(presence.get("active")),
        "supabase_subject_matches_presence": bool(
            presence.get("subject_matches_supabase")
        ),
        "supabase_subject_unique_in_presence": (
            presence.get("supabase_subject_bound_user_count") in {0, 1}
        ),
        "platform_admin_role": presence.get("role") == "platform_admin",
        "ggm_room_owner": bool(presence.get("room_owned_by_target")),
        "internal_lifetime_free_entitlement": bool(
            presence.get("entitlement_active_internal_lifetime_free")
            and presence.get("entitlement_belongs_to_target")
        ),
        "target_owner_nodes_accept_supabase_subject": bool(
            (route_checks.get("target_supabase_subject_owner_nodes") or {}).get("ok")
        ),
        "target_owner_analytics_accept_supabase_subject": bool(
            (route_checks.get("target_owner_analytics") or {}).get("ok")
        ),
        "target_room_keys_accept_supabase_subject": bool(
            (route_checks.get("target_owner_room_keys") or {}).get("ok")
        ),
        "public_room_redaction": bool(
            route_checks.get("public_room_redacts_target_email_admin_entitlement")
        ),
        "normal_user_owner_analytics_denied": (
            (route_checks.get("negative_owner_analytics") or {}).get("status") == 403
        ),
        "normal_user_control_token_denied": (
            (route_checks.get("negative_control_token_issue") or {}).get("status") == 403
        ),
    }
    return {
        "email": email,
        "checks": checks,
        "ok": all(checks.values()),
        "supabase": {
            key: value
            for key, value in auth_snapshot.items()
            if key != "subject"
        },
        "presence": {
            "user_id": presence.get("user_id"),
            "role": presence.get("role"),
            "active": presence.get("active"),
            "email_count": presence.get("email_count"),
            "required_account_fields_present": presence.get(
                "required_account_fields_present"
            ),
            "stored_subject_fingerprint": presence.get("stored_subject_fingerprint"),
            "subject_matches_supabase": presence.get("subject_matches_supabase"),
            "supabase_subject_bound_user_ids": presence.get(
                "supabase_subject_bound_user_ids"
            ),
            "optional_observer_profile_count": presence.get(
                "optional_observer_profile_count"
            ),
            "room": {
                "id": presence.get("room_id"),
                "slug": presence.get("room_slug"),
                "owner_user_id": presence.get("room_owner_user_id"),
                "owned_by_target": presence.get("room_owned_by_target"),
            },
            "entitlement": {
                "id": presence.get("entitlement_id"),
                "user_id": presence.get("entitlement_user_id"),
                "belongs_to_target": presence.get("entitlement_belongs_to_target"),
                "active_internal_lifetime_free": presence.get(
                    "entitlement_active_internal_lifetime_free"
                ),
                "status": getattr(entitlement, "status", None),
                "billing_mode": getattr(entitlement, "billing_mode", None),
                "price_cents": getattr(entitlement, "price_cents", None),
                "lifetime": bool(getattr(entitlement, "lifetime", False)),
                "ends_at": (
                    entitlement.ends_at.isoformat()
                    if entitlement and entitlement.ends_at
                    else None
                ),
                "source": getattr(entitlement, "source", None),
            },
        },
        "route_checks": route_checks,
        "compare_account": {
            "requested": bool(compare_email),
            "email_redacted": redact_email(compare_email),
            "supabase": (
                {
                    key: value
                    for key, value in compare_auth_snapshot.items()
                    if key != "subject"
                }
                if compare_auth_snapshot
                else None
            ),
        },
        "repair": repair,
        "secret_values_printed": False,
        "tokens_printed": False,
    }


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify or repair Presence account integrity against Supabase auth."
    )
    parser.add_argument("--email", default="e4hatu@gmail.com")
    parser.add_argument("--compare-email")
    parser.add_argument(
        "--environment",
        choices=("local", "hosted_controlled_launch"),
        default="local",
    )
    parser.add_argument("--room-slug", default=DEFAULT_ROOM_SLUG)
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--verify", action="store_true")
    mode.add_argument("--repair-dry-run", action="store_true")
    mode.add_argument("--repair-apply", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    email = _clean_email(args.email)
    compare_email = _clean_email(args.compare_email) if args.compare_email else None
    if args.environment == "hosted_controlled_launch":
        _load_env_file(args.backend_env_file)
    app = _build_app(_database_url(args.environment))

    with app.app_context():
        auth_snapshot = _auth_snapshot(email)
        compare_auth_snapshot = _auth_snapshot(compare_email) if compare_email else None
        presence = _presence_snapshot(email, auth_snapshot, args.room_slug)
        repair = None
        if args.repair_dry_run or args.repair_apply:
            repair = _repair_binding(
                presence,
                auth_snapshot,
                apply=bool(args.repair_apply),
            )
            auth_snapshot = _auth_snapshot(email)
            presence = _presence_snapshot(email, auth_snapshot, args.room_slug)
        route_checks = _route_checks(
            app,
            email=email,
            auth_snapshot=auth_snapshot,
            presence=presence,
        )
        result = _summary(
            email=email,
            compare_email=compare_email,
            auth_snapshot=auth_snapshot,
            presence=presence,
            route_checks=route_checks,
            compare_auth_snapshot=compare_auth_snapshot,
            repair=repair,
        )

    result.update(
        {
            "environment": args.environment,
            "room_slug": args.room_slug,
            "operation": (
                "repair_apply"
                if args.repair_apply
                else "repair_dry_run"
                if args.repair_dry_run
                else "verify"
            ),
        }
    )
    _write_json(args.output_json, result)
    print(json.dumps({"output_json": str(args.output_json), **result}, indent=2, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
