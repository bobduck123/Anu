from __future__ import annotations

import argparse
import ast
import json
import os
import re
import sys
from datetime import timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
DEFAULT_RESULT = REPO_ROOT / "docs/program/evidence/presence-first-pilot-ggm-onboarding-proof/ggm_setup_result.json"
DEFAULT_PRIVATE_ENV = REPO_ROOT / ".env.presence-first-pilot-ggm.local"
CREATED_BY = "presence_first_pilot_onboarding"
PILOT_TAG = {
    "controlled_launch_pilot": True,
    "pilot_code": "ggm",
    "pilot_stage": "first_pilot",
    "created_by": CREATED_BY,
}
REQUIRED_TABLES = {"node", "user", "presence_node", "presence_pass", "room_key", "presence_enquiry", "encounter"}

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
        ("PRESENCE_PILOT_GGM_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL")
        if environment == "hosted_controlled_launch"
        else ("PRESENCE_PILOT_GGM_DATABASE_URL", "DATABASE_URL")
    )
    raw = next((os.environ.get(name) for name in names if os.environ.get(name)), None)
    if not raw:
        raise RuntimeError(f"Set one of {', '.join(names)} before GGM pilot setup.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if environment == "hosted_controlled_launch" and not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Hosted GGM pilot setup requires PostgreSQL.")
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
            raise RuntimeError(f"GGM pilot setup schema is incomplete: {missing}")
        return {"required_tables_present": sorted(REQUIRED_TABLES)}


def _tag(environment: str, **extra: Any) -> dict[str, Any]:
    return {**PILOT_TAG, "environment": environment, **extra}


def _metadata(existing: dict[str, Any] | None, environment: str, **extra: Any) -> dict[str, Any]:
    return {**(existing or {}), **_tag(environment, **extra)}


def _get_or_create(model, criteria: dict[str, Any], **values):
    row = model.query.filter_by(**criteria).first()
    created = row is None
    if created:
        row = model(**criteria)
        from manara_backend_app.extensions import db

        db.session.add(row)
    for key, value in values.items():
        setattr(row, key, value)
    return row, created


def _token(username: str) -> str:
    from flask_jwt_extended import create_access_token

    return create_access_token(
        identity=username,
        additional_claims={"aud": "public", "token_use": "public", "role": "participant", "username": username},
        expires_delta=timedelta(days=7),
    )


def _public_result(summary: dict[str, Any]) -> dict[str, Any]:
    private = {"owner_token", "room_key_token", "revoked_room_key_token"}
    return {
        **{key: value for key, value in summary.items() if key not in private},
        "private_env_written": True,
        "tokens_written": {
            "owner_token": bool(summary.get("owner_token")),
            "room_key_token": bool(summary.get("room_key_token")),
            "revoked_room_key_token": bool(summary.get("revoked_room_key_token")),
        },
    }


def _env_quote(value: str) -> str:
    return value if re.match(r"^[A-Za-z0-9_./:@,+\\=-]+$", value) else json.dumps(value)


def _write_private_env(path: Path, summary: dict[str, Any], *, backend_url: str, frontend_url: str) -> None:
    rows = {
        "PRESENCE_PILOT_GGM_BACKEND_URL": backend_url,
        "PRESENCE_PILOT_GGM_FRONTEND_URL": frontend_url,
        "PRESENCE_PILOT_GGM_ROOM_ID": str(summary["room_id"]),
        "PRESENCE_PILOT_GGM_ROOM_SLUG": summary["room_slug"],
        "PRESENCE_PILOT_GGM_OWNER_TOKEN": summary["owner_token"],
        "PRESENCE_PILOT_GGM_ROOMKEY_TOKEN": summary["room_key_token"],
        "PRESENCE_PILOT_GGM_REVOKED_ROOMKEY_TOKEN": summary["revoked_room_key_token"],
        "PRESENCE_PILOT_GGM_FOREIGN_ROOM_ID": str(summary["foreign_room_id"]),
        "PRESENCE_PILOT_GGM_ENQUIRY_EXPECTED": summary["enquiry_expected"],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Generated by backend/scripts/setup_presence_pilot_ggm.py",
        "# Local handoff for tagged GGM pilot smoke only. Do not commit.",
    ]
    lines.extend(f"{key}={_env_quote(value)}" for key, value in rows.items() if value)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _dry_run(app, environment: str) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.models import PresenceNode, RoomKey, User

        room = PresenceNode.query.filter_by(slug="ggm-christina-goddard").first()
        owner = User.query.filter_by(username="presence-first-pilot-ggm-owner").first()
        room_key = RoomKey.query.filter_by(room_id=getattr(room, "id", None), campaign_label="GGM first pilot QR RoomKey").first()
        return {
            "mode": "dry_run",
            "environment": environment,
            "would_create": {
                "owner": owner is None,
                "room": room is None,
                "active_room_key": room_key is None,
                "foreign_owner_isolation_room": PresenceNode.query.filter_by(slug="ggm-first-pilot-isolation-room").first() is None,
            },
            "existing": {
                "owner_user_id": getattr(owner, "id", None),
                "room_id": getattr(room, "id", None),
                "room_slug": getattr(room, "slug", "ggm-christina-goddard"),
                "active_room_key_id": getattr(room_key, "id", None),
            },
            "enquiry_configuration": "active only when PRESENCE_PILOT_GGM_ENQUIRY_EMAIL is supplied before --apply",
            "halls": "deferred unless --enable-hall is used with --apply",
            "secret_values_printed": False,
        }


def _apply(app, args: argparse.Namespace) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import Node, PresenceHall, PresenceNode, PresencePass, RoomKey, User
        from manara_backend_app.services.presence_hall_service import create_hall
        from manara_backend_app.services.presence_pass_service import create_pass, create_room_key

        actions: list[str] = []
        tenant, tenant_created = _get_or_create(
            Node,
            {"slug": "presence-first-pilot-ggm"},
            name="Presence First Pilot GGM",
            status="active",
            is_default=False,
        )
        actions.append("created_tenant" if tenant_created else "verified_tenant")
        owner, owner_created = _get_or_create(
            User,
            {"username": "presence-first-pilot-ggm-owner"},
            pseudonym="GGM First Pilot Owner",
            email=args.owner_email,
            role="participant",
            password="presence-first-pilot-token-auth-only",
            bio=f"controlled_launch_pilot ggm {args.environment} {CREATED_BY}",
        )
        foreign_owner, _ = _get_or_create(
            User,
            {"username": "presence-first-pilot-ggm-foreign-owner"},
            pseudonym="GGM First Pilot Isolation Owner",
            email="presence-first-pilot-ggm-foreign-owner@example.test",
            role="participant",
            password="presence-first-pilot-token-auth-only",
            bio=f"controlled_launch_pilot ggm isolation {args.environment} {CREATED_BY}",
        )
        db.session.flush()
        actions.append("created_owner" if owner_created else "verified_owner")

        room, room_created = _get_or_create(
            PresenceNode,
            {"slug": "ggm-christina-goddard"},
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            display_name="Christina Kerkvliet Goddard",
            headline="Watercolour works across memory, colour, and lived landscape.",
            bio="GGM first pilot Presence Room for Christina Kerkvliet Goddard's external artist portfolio.",
            short_bio="Artist portfolio entry Room for selected watercolour works.",
            node_type="studio",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="gallery_white",
            plan_type="artist_presence",
            status="published",
            visibility="public",
            public_status="public",
            location_label="Moana, South Australia",
            primary_cta_label="View external portfolio",
            primary_cta_url=args.external_site_url,
            enquiry_email=args.enquiry_email,
            business_functions_enabled=True,
            directory_ready=True,
            archive_ready=True,
            node_metadata=_metadata(getattr(PresenceNode.query.filter_by(slug="ggm-christina-goddard").first(), "node_metadata", None), args.environment, integration_model="external_site_plus_presence_room"),
        )
        isolation_room, isolation_created = _get_or_create(
            PresenceNode,
            {"slug": "ggm-first-pilot-isolation-room"},
            tenant_id=tenant.id,
            owner_user_id=foreign_owner.id,
            display_name="GGM First Pilot Isolation Room",
            headline="Private owner analytics isolation proof.",
            bio="Tagged first-pilot access-boundary fixture.",
            node_type="studio",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="clean_light",
            plan_type="artist_presence",
            status="draft",
            visibility="private",
            public_status="draft",
            business_functions_enabled=False,
            node_metadata=_tag(args.environment, fixture="owner_isolation_room"),
        )
        db.session.flush()
        actions.append("created_room" if room_created else "verified_room")
        actions.append("created_isolation_room" if isolation_created else "verified_isolation_room")

        room.node_metadata = _metadata(room.node_metadata, args.environment, fixture="pilot_room")
        isolation_room.node_metadata = _metadata(isolation_room.node_metadata, args.environment, fixture="owner_isolation_room")
        pass_row = PresencePass.query.filter_by(room_id=room.id, label="GGM first pilot QR Presence Pass").first()
        if not pass_row:
            pass_row = create_pass(
                room,
                owner,
                {"pass_type": "qr", "label": "GGM first pilot QR Presence Pass", "metadata": _tag(args.environment, fixture="pilot_pass")},
            )
            actions.append("created_pass")
        else:
            pass_row.metadata_json = _metadata(pass_row.metadata_json, args.environment, fixture="pilot_pass")
            actions.append("verified_pass")
        db.session.flush()

        room_key = RoomKey.query.filter_by(room_id=room.id, campaign_label="GGM first pilot QR RoomKey").first()
        if not room_key:
            room_key = create_room_key(
                room,
                owner,
                {"key_type": "qr", "campaign_label": "GGM first pilot QR RoomKey", "metadata": _tag(args.environment, fixture="pilot_room_key")},
                presence_pass=pass_row,
            )
            actions.append("created_active_room_key")
        room_key.status = "active"
        room_key.metadata_json = _metadata(room_key.metadata_json, args.environment, fixture="pilot_room_key")
        revoked_key = RoomKey.query.filter_by(room_id=room.id, campaign_label="GGM first pilot revoked-proof RoomKey").first()
        if not revoked_key:
            revoked_key = create_room_key(
                room,
                owner,
                {"key_type": "qr", "campaign_label": "GGM first pilot revoked-proof RoomKey", "metadata": _tag(args.environment, fixture="revoked_room_key")},
                presence_pass=pass_row,
            )
            actions.append("created_revoked_room_key")
        revoked_key.status = "revoked"
        revoked_key.metadata_json = _metadata(revoked_key.metadata_json, args.environment, fixture="revoked_room_key")
        db.session.flush()
        pass_row.default_room_key_id = room_key.id

        hall = None
        if args.enable_hall:
            hall = PresenceHall.query.filter_by(slug="ggm-first-pilot-hall").first()
            if not hall:
                hall = create_hall(
                    {
                        "host_type": "room",
                        "title": "GGM First Pilot Hall",
                        "slug": "ggm-first-pilot-hall",
                        "description": "Optional first-pilot Hall. Do not present it as realtime.",
                        "hall_type": "studio_hall",
                        "visibility": "unlisted",
                        "status": "scheduled",
                        "metadata": _tag(args.environment, fixture="optional_pilot_hall"),
                    },
                    host_type="room",
                    host_room=room,
                    actor_user=owner,
                )
                actions.append("created_optional_hall")
            hall.metadata_json = _metadata(hall.metadata_json, args.environment, fixture="optional_pilot_hall")

        db.session.commit()
        owner_token = _token(owner.username)
        return {
            "mode": "apply",
            "environment": args.environment,
            "actions": actions,
            "tenant_id": tenant.id,
            "owner_user_id": owner.id,
            "room_id": room.id,
            "room_slug": room.slug,
            "room_status": room.status,
            "room_visibility": room.visibility,
            "enquiry_expected": "active" if room.enquiry_email else "capture_only",
            "enquiry_destination_configured": bool(room.enquiry_email),
            "presence_pass_id": pass_row.id,
            "room_key_id": room_key.id,
            "revoked_room_key_id": revoked_key.id,
            "foreign_room_id": isolation_room.id,
            "hall_id": getattr(hall, "id", None),
            "halls": "optional_hall_enabled" if hall else "deferred",
            "qr_payload_template": f"{args.frontend_url.rstrip('/')}/r/<roomkey-token>",
            "rollback_owner": "controlled launch operator",
            "owner_token": owner_token,
            "room_key_token": room_key.public_token,
            "revoked_room_key_token": revoked_key.public_token,
            "secret_values_printed": False,
        }


def _write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or verify tagged first-pilot GGM Presence Room records.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Inspect existing records and show safe proposed setup.")
    mode.add_argument("--apply", action="store_true", help="Create/update only tagged deterministic GGM pilot records.")
    parser.add_argument("--environment", choices=("local", "hosted_controlled_launch"), default="local")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_RESULT)
    parser.add_argument("--private-env-file", type=Path, default=DEFAULT_PRIVATE_ENV)
    parser.add_argument("--backend-url", default=os.environ.get("PRESENCE_PILOT_GGM_BACKEND_URL") or "https://anu-back-end.vercel.app")
    parser.add_argument("--frontend-url", default=os.environ.get("PRESENCE_PILOT_GGM_FRONTEND_URL") or "https://your-presence.vercel.app")
    parser.add_argument("--external-site-url", default=os.environ.get("PRESENCE_PILOT_GGM_EXTERNAL_SITE_URL") or "http://www.ckgoddard.com.au/")
    parser.add_argument("--owner-email", default=os.environ.get("PRESENCE_PILOT_GGM_OWNER_EMAIL") or "presence-first-pilot-ggm-owner@example.test")
    parser.add_argument("--enquiry-email", default=os.environ.get("PRESENCE_PILOT_GGM_ENQUIRY_EMAIL"))
    parser.add_argument("--enable-hall", action="store_true", help="Create the optional unlisted scheduled GGM pilot Hall.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    if args.environment == "hosted_controlled_launch":
        _load_env_file(args.backend_env_file)
    app = _build_app(_database_url(args.environment))
    schema = _assert_schema(app)
    if args.apply:
        summary = _apply(app, args)
        _write_private_env(args.private_env_file, summary, backend_url=args.backend_url, frontend_url=args.frontend_url)
        result = {"schema": schema, "setup": _public_result(summary), "secret_values_printed": False}
    else:
        result = {"schema": schema, "setup": _dry_run(app, args.environment), "secret_values_printed": False}
    _write_result(args.output_json, result)
    print(json.dumps({"output_json": str(args.output_json), **result}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
