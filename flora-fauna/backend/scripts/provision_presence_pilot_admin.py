from __future__ import annotations

import argparse
import ast
import json
import os
import re
import secrets
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import func, inspect
from sqlalchemy.engine import make_url
from werkzeug.security import generate_password_hash


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
DEFAULT_OUTPUT = REPO_ROOT / "docs/program/evidence/presence-ggm-admin-account-proof/account_provisioning_result.json"
TARGET_ROLE = "platform_admin"
TARGET_PLAN_REASON = "first_pilot_owner_admin"
CREATED_BY = "provision_presence_pilot_admin"
REQUIRED_TABLES = {"user", "presence_node", "presence_plan_entitlement"}

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _load_env_file(path: Path | None) -> None:
    if not path or not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.removeprefix("export ").split("=", 1)
        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            try:
                value = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                value = value[1:-1]
        os.environ[key.strip()] = str(value)


def _database_url(environment: str) -> str:
    names = (
        ("PRESENCE_PILOT_ADMIN_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL")
        if environment == "hosted_controlled_launch"
        else ("PRESENCE_PILOT_ADMIN_DATABASE_URL", "DATABASE_URL")
    )
    raw = next((os.environ.get(name) for name in names if os.environ.get(name)), None)
    if not raw:
        raise RuntimeError(f"Set one of {', '.join(names)} before pilot admin provisioning.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if environment == "hosted_controlled_launch" and not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Hosted pilot admin provisioning requires PostgreSQL.")
    return url.render_as_string(hide_password=False)


def _build_app(database_url: str):
    os.environ["DATABASE_URL"] = database_url
    from backend_factory import load_create_app

    return load_create_app()({"SQLALCHEMY_DATABASE_URI": database_url, "AUTO_CREATE_ALL": False})


def _assert_schema(app) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.extensions import db

        present = set(inspect(db.engine).get_table_names())
        missing = sorted(REQUIRED_TABLES - present)
        if missing:
            raise RuntimeError(f"Pilot admin schema is incomplete: {missing}")
        return {"required_tables_present": sorted(REQUIRED_TABLES)}


def _write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _pilot_tag(environment: str, pilot_code: str, **extra: Any) -> dict[str, Any]:
    return {
        "controlled_launch_pilot": True,
        "pilot_code": pilot_code,
        "pilot_stage": "first_pilot",
        "environment": environment,
        "created_by": CREATED_BY,
        **extra,
    }


def _clean_email(value: str) -> str:
    email = str(value or "").strip().lower()
    if "@" not in email or len(email) > 150:
        raise RuntimeError("A valid account email is required.")
    return email


def _find_user(email: str):
    from manara_backend_app.models import User

    return User.query.filter(func.lower(User.email) == email).first()


def _safe_slug(value: str, fallback: str, max_len: int) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (slug[:max_len].strip("-") or fallback)[:max_len]


def _unique_user_field(field_name: str, base: str, max_len: int) -> str:
    from manara_backend_app.models import User

    base = base[:max_len].strip("-_ .") or "pilot-admin"
    candidate = base
    suffix = 2
    while User.query.filter(getattr(User, field_name) == candidate).first():
        suffix_text = f"-{suffix}"
        candidate = f"{base[: max_len - len(suffix_text)]}{suffix_text}"
        suffix += 1
    return candidate


def _create_local_user(email: str, pilot_code: str, environment: str):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import User

    identity_seed = _safe_slug(email.split("@", 1)[0], "owner", 64)
    user = User(
        username=_unique_user_field("username", f"presence-{pilot_code}-pilot-admin-{identity_seed}", 150),
        pseudonym=_unique_user_field("pseudonym", f"{pilot_code.upper()} Pilot Admin", 80),
        email=email,
        password=generate_password_hash(secrets.token_urlsafe(64)),
        role="participant",
        bio=(
            f"controlled_launch_pilot {pilot_code} {environment} "
            f"{CREATED_BY}; external auth binding required for hosted use"
        ),
        points=0,
        level=1,
        points_to_level_up=100,
    )
    db.session.add(user)
    db.session.flush()
    return user


def _load_ggm_room(room_slug: str, pilot_code: str):
    from manara_backend_app.models import PresenceNode

    room = PresenceNode.query.filter_by(slug=room_slug).first()
    if not room:
        raise RuntimeError(f"Pilot Room not found for slug {room_slug}.")
    metadata = room.node_metadata or {}
    if metadata.get("pilot_code") != pilot_code or metadata.get("controlled_launch_pilot") is not True:
        raise RuntimeError(f"Presence Room {room_slug} is not tagged for controlled-launch pilot {pilot_code}.")
    return room


def _owner_metadata(
    room,
    *,
    environment: str,
    pilot_code: str,
    target_user_id: int,
    previous_owner_user_id: int | None,
) -> dict[str, Any]:
    metadata = dict(room.node_metadata or {})
    provision = dict(metadata.get("pilot_admin_provisioning") or {})
    if provision.get("original_owner_user_id") is None and previous_owner_user_id != target_user_id:
        provision["original_owner_user_id"] = previous_owner_user_id
    provision.update(
        _pilot_tag(
            environment,
            pilot_code,
            target_owner_user_id=target_user_id,
            last_owner_user_id_before_provision=previous_owner_user_id,
        )
    )
    metadata["pilot_admin_provisioning"] = provision
    return metadata


def _entitlement_summary(row) -> dict[str, Any]:
    if not row:
        return {
            "exists": False,
            "status": None,
            "plan_code": None,
            "billing_mode": None,
            "price_cents": None,
            "lifetime": None,
            "ends_at": None,
        }
    return {
        "exists": True,
        "id": row.id,
        "status": row.status,
        "plan_code": row.plan_code,
        "billing_mode": row.billing_mode,
        "price_cents": row.price_cents,
        "lifetime": bool(row.lifetime),
        "ends_at": row.ends_at.isoformat() if row.ends_at else None,
        "source": row.source,
        "reason": row.reason,
    }


def _verification(email: str, pilot_code: str, room_slug: str) -> dict[str, Any]:
    from manara_backend_app.services.presence_entitlement_service import (
        internal_lifetime_free_entitlement_for_user,
        is_active_internal_lifetime_free_entitlement,
    )

    user = _find_user(email)
    room = _load_ggm_room(room_slug, pilot_code)
    entitlement = (
        internal_lifetime_free_entitlement_for_user(user.id)
        if user
        else None
    )
    checks = {
        "app_user_exists": bool(user),
        "platform_admin_role": bool(user and user.role == TARGET_ROLE),
        "ggm_room_owner": bool(user and room.owner_user_id == user.id),
        "internal_lifetime_free_entitlement": is_active_internal_lifetime_free_entitlement(entitlement),
    }
    return {
        "ok": all(checks.values()),
        "checks": checks,
        "user_id": getattr(user, "id", None),
        "room_id": room.id,
        "room_slug": room.slug,
        "room_owner_user_id": room.owner_user_id,
        "global_subject_bound": bool(user and user.global_subject_id),
        "entitlement": _entitlement_summary(entitlement),
    }


def _dry_run(args: argparse.Namespace) -> dict[str, Any]:
    from manara_backend_app.services.presence_entitlement_service import internal_lifetime_free_entitlement_for_user

    email = _clean_email(args.email)
    user = _find_user(email)
    room = _load_ggm_room(args.room_slug, args.pilot_code)
    entitlement = internal_lifetime_free_entitlement_for_user(user.id) if user else None
    hosted_identity_pending = args.environment == "hosted_controlled_launch" and user is None
    return {
        "mode": "dry_run",
        "environment": args.environment,
        "email": email,
        "app_user": {
            "exists": bool(user),
            "id": getattr(user, "id", None),
            "role": getattr(user, "role", None),
            "global_subject_bound": bool(user and user.global_subject_id),
        },
        "room": {
            "id": room.id,
            "slug": room.slug,
            "current_owner_user_id": room.owner_user_id,
            "would_set_owner_user_id": getattr(user, "id", None),
        },
        "entitlement": _entitlement_summary(entitlement),
        "would_create_local_app_user": args.environment == "local" and user is None,
        "hosted_account_action_required": (
            "account must first sign in or be provider-bound before privileged hosted apply"
            if hosted_identity_pending
            else None
        ),
        "would_assign_role": bool(user and user.role != TARGET_ROLE),
        "would_assign_entitlement": bool(user and not entitlement),
        "secret_values_printed": False,
    }


def _apply(args: argparse.Namespace) -> dict[str, Any]:
    from manara_backend_app.extensions import db
    from manara_backend_app.services.presence_entitlement_service import (
        CONTROLLED_LAUNCH_SOURCE,
        ensure_internal_lifetime_free_entitlement,
    )

    email = _clean_email(args.email)
    room = _load_ggm_room(args.room_slug, args.pilot_code)
    user = _find_user(email)
    if args.environment == "hosted_controlled_launch" and user is None:
        db.session.rollback()
        return {
            "mode": "apply",
            "environment": args.environment,
            "email": email,
            "status": "pending_auth_provider_account",
            "room": {"id": room.id, "slug": room.slug, "current_owner_user_id": room.owner_user_id},
            "hosted_account_action_required": (
                "Sign in or create the external auth account so the app has a bindable User before privileged apply."
            ),
            "mutated": False,
            "secret_values_printed": False,
        }

    user_created = False
    if not user:
        user = _create_local_user(email, args.pilot_code, args.environment)
        user_created = True

    prior_role = user.role
    prior_owner_user_id = room.owner_user_id
    user.role = TARGET_ROLE
    room.owner_user_id = user.id
    room.node_metadata = _owner_metadata(
        room,
        environment=args.environment,
        pilot_code=args.pilot_code,
        target_user_id=user.id,
        previous_owner_user_id=prior_owner_user_id,
    )
    entitlement, entitlement_created = ensure_internal_lifetime_free_entitlement(
        user,
        source=CONTROLLED_LAUNCH_SOURCE,
        reason=TARGET_PLAN_REASON,
        metadata=_pilot_tag(
            args.environment,
            args.pilot_code,
            audit_note="GGM first pilot account",
            entitlement_label="comped_for_life",
        ),
    )
    db.session.commit()
    return {
        "mode": "apply",
        "environment": args.environment,
        "email": email,
        "status": "applied",
        "mutated": True,
        "app_user": {
            "id": user.id,
            "created": user_created,
            "global_subject_bound": bool(user.global_subject_id),
        },
        "role_grant": {
            "previous_role": prior_role,
            "assigned_role": user.role,
            "changed": prior_role != user.role,
        },
        "room": {
            "id": room.id,
            "slug": room.slug,
            "previous_owner_user_id": prior_owner_user_id,
            "owner_user_id": room.owner_user_id,
        },
        "entitlement": {**_entitlement_summary(entitlement), "created": entitlement_created},
        "verification": _verification(email, args.pilot_code, args.room_slug),
        "secret_values_printed": False,
    }


def _verify(args: argparse.Namespace) -> dict[str, Any]:
    return {
        "mode": "verify",
        "environment": args.environment,
        "email": _clean_email(args.email),
        "verification": _verification(_clean_email(args.email), args.pilot_code, args.room_slug),
        "secret_values_printed": False,
    }


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision or verify a controlled-launch Presence pilot admin.")
    parser.add_argument("--email", default="e4hatu@gmail.com")
    parser.add_argument("--pilot-code", default="ggm")
    parser.add_argument("--room-slug", default="ggm-christina-goddard")
    parser.add_argument("--environment", choices=("local", "hosted_controlled_launch"), default="local")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--dry-run", action="store_true")
    modes.add_argument("--apply", action="store_true")
    modes.add_argument("--verify", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    if args.environment == "hosted_controlled_launch":
        _load_env_file(args.backend_env_file)
    app = _build_app(_database_url(args.environment))
    schema = _assert_schema(app)
    with app.app_context():
        if args.apply:
            operation = _apply(args)
        elif args.verify:
            operation = _verify(args)
        else:
            operation = _dry_run(args)
    result = {
        "schema": schema,
        "operation": operation,
        "secret_values_printed": False,
    }
    _write_result(args.output_json, result)
    print(json.dumps({"output_json": str(args.output_json), **result}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
