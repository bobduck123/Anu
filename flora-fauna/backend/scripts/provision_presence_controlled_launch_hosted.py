from __future__ import annotations

import argparse
import ast
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import inspect
from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
DEFAULT_OUTPUT_ENV = REPO_ROOT / ".env.presence-controlled-launch.hosted.local"
CREATED_BY = "smoke_presence_controlled_launch_hosted"
REQUIRED_TABLES = {
    "presence_garden",
    "observation",
    "observation_echo",
    "garden_seed",
    "garden_nurture",
    "garden_prune",
    "shared_space",
    "presence_hall",
    "hall_session",
    "hall_participant",
    "hall_zone",
    "hall_portal",
    "hall_stall",
    "hall_activity_event",
}
CONTROL_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.analytics.read",
    "presence.nfc.manage",
]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _load_env_file(path: Path) -> None:
    if not path.exists():
        raise RuntimeError(f"Backend env file is missing: {path}")
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        key, raw_value = line.split("=", 1)
        key = key.strip()
        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            try:
                value = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                value = value[1:-1]
        os.environ[key] = str(value)


def _pooled_database_url() -> str:
    raw = (
        os.environ.get("PRESENCE_HOSTED_FIXTURE_DATABASE_URL")
        or os.environ.get("POSTGRES_URL")
        or os.environ.get("DATABASE_URL")
    )
    if not raw:
        raise RuntimeError("Set POSTGRES_URL or PRESENCE_HOSTED_FIXTURE_DATABASE_URL for hosted fixture provisioning.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Hosted controlled-launch fixtures require PostgreSQL.")
    return url.render_as_string(hide_password=False)


def _build_app(database_url: str):
    os.environ["DATABASE_URL"] = database_url
    from backend_factory import load_create_app

    return load_create_app()(
        {
            "SQLALCHEMY_DATABASE_URI": database_url,
            "AUTO_CREATE_ALL": False,
        }
    )


def _assert_schema(app) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.extensions import db

        inspector = inspect(db.engine)
        present = set(inspector.get_table_names())
        missing = sorted(REQUIRED_TABLES - present)
        if missing:
            raise RuntimeError(f"Hosted Gardens/Halls schema is incomplete: {missing}")
        return {
            "required_tables_present": sorted(REQUIRED_TABLES),
            "hall_activity_event_present": "hall_activity_event" in present,
        }


def _tag(environment: str, **extra: Any) -> dict[str, Any]:
    return {
        "controlled_launch_smoke": True,
        "environment": environment,
        "created_by": CREATED_BY,
        **extra,
    }


def _get_or_create(model, criteria: dict[str, Any], **values):
    row = model.query.filter_by(**criteria).first()
    if row:
        for key, value in values.items():
            setattr(row, key, value)
        return row
    row = model(**criteria, **values)
    from manara_backend_app.extensions import db

    db.session.add(row)
    return row


def _get_or_create_user(User, *, username: str, pseudonym: str, email: str, role: str, environment: str):
    return _get_or_create(
        User,
        {"username": username},
        pseudonym=pseudonym,
        email=email,
        role=role,
        password="controlled-launch-smoke-token-auth-only",
        bio=f"controlled_launch_smoke {environment} {CREATED_BY}",
    )


def _zone_by_title(hall_id: int, title: str):
    from manara_backend_app.models import HallZone

    return HallZone.query.filter_by(hall_id=hall_id, title=title).first()


def _portal_by_label(hall_id: int, label: str):
    from manara_backend_app.models import HallPortal

    return HallPortal.query.filter_by(hall_id=hall_id, label=label).first()


def _stall_by_room(hall_id: int, room_id: int):
    from manara_backend_app.models import HallStall

    return HallStall.query.filter_by(hall_id=hall_id, room_id=room_id).first()


def _session_by_title(hall_id: int, title: str):
    from manara_backend_app.models import HallSession

    return HallSession.query.filter_by(hall_id=hall_id, title=title).first()


def _metadata_row(row, environment: str, **extra: Any):
    row.metadata_json = {**(getattr(row, "metadata_json", None) or {}), **_tag(environment, **extra)}
    return row


def _create_public_token(username: str) -> str:
    from flask_jwt_extended import create_access_token

    return create_access_token(
        identity=username,
        additional_claims={"aud": "public", "token_use": "public", "role": "participant", "username": username},
        expires_delta=timedelta(days=7),
    )


def _create_control_token(user) -> str:
    from flask_jwt_extended import create_access_token, decode_token
    from manara_backend_app.security.control_plane import record_control_token_grant

    token = create_access_token(
        identity=f"control::{user.username}",
        additional_claims={
            "aud": "control",
            "token_use": "control",
            "requires_mfa": True,
            "role": "platform_admin",
            "scp": CONTROL_SCOPES,
        },
        expires_delta=timedelta(hours=12),
    )
    claims = decode_token(token)
    record_control_token_grant(
        jti=claims["jti"],
        user_id=user.id,
        role="platform_admin",
        audience="control",
        scopes=CONTROL_SCOPES,
        expires_at=datetime.utcfromtimestamp(int(claims["exp"])),
    )
    return token


def _seed(app, *, environment: str) -> dict[str, Any]:
    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import (
            GardenSeed,
            MoodBoard,
            MoodBoardItem,
            Node,
            Observation,
            Path as PresencePath,
            PresenceGarden,
            PresenceHall,
            PresenceNode,
            RoomKey,
            User,
        )
        from manara_backend_app.services.presence_garden_service import get_or_create_default_garden, update_garden
        from manara_backend_app.services.presence_hall_service import add_portal, add_stall, add_zone, create_hall, create_session
        from manara_backend_app.services.presence_observation_service import create_observation
        from manara_backend_app.services.presence_pass_service import create_pass, create_room_key
        from manara_backend_app.services.presence_path_service import generate_path_from_hall
        from manara_backend_app.services.presence_seed_service import create_or_update_seed
        from manara_backend_app.services.presence_social_service import (
            add_mood_board_item,
            create_mood_board,
            get_or_create_observer_for_user,
        )

        tenant = _get_or_create(
            Node,
            {"slug": "presence-controlled-launch-smoke"},
            name="Presence Controlled Launch Smoke",
            status="active",
            is_default=False,
        )
        owner_user = _get_or_create_user(
            User,
            username="presence-controlled-launch-owner",
            pseudonym="Presence Launch Smoke Owner",
            email="presence-controlled-launch-owner@example.test",
            role="participant",
            environment=environment,
        )
        observer_user = _get_or_create_user(
            User,
            username="presence-controlled-launch-observer",
            pseudonym="Presence Launch Smoke Observer",
            email="presence-controlled-launch-observer@example.test",
            role="participant",
            environment=environment,
        )
        second_observer_user = _get_or_create_user(
            User,
            username="presence-controlled-launch-observer-two",
            pseudonym="Presence Launch Smoke Observer Two",
            email="presence-controlled-launch-observer-two@example.test",
            role="participant",
            environment=environment,
        )
        foreign_owner_user = _get_or_create_user(
            User,
            username="presence-controlled-launch-owner-foreign",
            pseudonym="Presence Launch Smoke Foreign Owner",
            email="presence-controlled-launch-owner-foreign@example.test",
            role="participant",
            environment=environment,
        )
        admin_user = _get_or_create_user(
            User,
            username="presence-controlled-launch-admin",
            pseudonym="Presence Launch Smoke Admin",
            email="presence-controlled-launch-admin@example.test",
            role="platform_admin",
            environment=environment,
        )
        db.session.flush()

        room = _get_or_create(
            PresenceNode,
            {"slug": "presence-controlled-launch-smoke-room"},
            tenant_id=tenant.id,
            owner_user_id=owner_user.id,
            display_name="Presence Controlled Launch Smoke Room",
            headline="Controlled launch verification Room.",
            bio="Non-client fixture for hosted Presence smoke.",
            node_type="studio",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="gallery_white",
            plan_type="pro",
            status="published",
            visibility="public",
            public_status="public",
            business_functions_enabled=True,
            directory_ready=True,
            map_ready=True,
            archive_ready=True,
            marketplace_ready=True,
            location_label="Hosted Smoke",
            node_metadata=_tag(environment, fixture="owner_room"),
        )
        stall_room = _get_or_create(
            PresenceNode,
            {"slug": "presence-controlled-launch-smoke-stall-room"},
            tenant_id=tenant.id,
            owner_user_id=owner_user.id,
            display_name="Presence Controlled Launch Smoke Stall",
            headline="Fixture Room used inside a Hall stall.",
            bio="Non-client Hall stall fixture.",
            node_type="studio",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="clean_light",
            plan_type="pro",
            status="published",
            visibility="public",
            public_status="public",
            business_functions_enabled=True,
            directory_ready=True,
            node_metadata=_tag(environment, fixture="stall_room"),
        )
        foreign_room = _get_or_create(
            PresenceNode,
            {"slug": "presence-controlled-launch-smoke-foreign-room"},
            tenant_id=tenant.id,
            owner_user_id=foreign_owner_user.id,
            display_name="Presence Controlled Launch Foreign Room",
            headline="Fixture for owner isolation checks.",
            bio="Non-client foreign Room fixture.",
            node_type="studio",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="clean_light",
            plan_type="pro",
            status="published",
            visibility="public",
            public_status="public",
            business_functions_enabled=True,
            directory_ready=True,
            node_metadata=_tag(environment, fixture="foreign_room"),
        )
        db.session.flush()

        observer = get_or_create_observer_for_user(
            observer_user,
            {
                "alias": "presence-launch-smoke-mask",
                "mask_name": "Launch Smoke Mask",
                "bio_fragment": "Controlled launch smoke Mask.",
            },
        )
        second_observer = get_or_create_observer_for_user(
            second_observer_user,
            {
                "alias": "presence-launch-smoke-private",
                "mask_name": "Launch Smoke Private Mask",
                "bio_fragment": "Controlled launch private visibility check.",
                "visibility": "private",
            },
        )
        observer.visibility = "public_mask"
        second_observer.visibility = "private"
        db.session.flush()

        garden = get_or_create_default_garden(
            observer,
            {"title": "Presence Launch Smoke Garden", "slug": observer.alias, "visibility": "public"},
        )
        update_garden(
            garden,
            {
                "title": "Presence Launch Smoke Garden",
                "slug": observer.alias,
                "description": "Controlled launch Garden smoke fixture.",
                "visibility": "public",
                "theme_key": "smoke",
            },
        )
        _metadata_row(garden, environment, fixture="public_garden")
        private_garden = get_or_create_default_garden(
            second_observer,
            {"title": "Presence Launch Private Garden", "slug": second_observer.alias, "visibility": "private"},
        )
        update_garden(private_garden, {"slug": second_observer.alias, "visibility": "private"})
        _metadata_row(private_garden, environment, fixture="private_garden")
        db.session.flush()

        mood_board = MoodBoard.query.filter_by(observer_id=observer.id, title="Presence Launch Smoke Mood Board").first()
        if not mood_board:
            mood_board = create_mood_board(
                "observer",
                {
                    "title": "Presence Launch Smoke Mood Board",
                    "description": f"controlled_launch_smoke {environment} {CREATED_BY}",
                    "visibility": "private",
                    "board_type": "mood",
                },
                observer=observer,
            )
            db.session.flush()
        mood_item = MoodBoardItem.query.filter_by(mood_board_id=mood_board.id, item_type="room", item_id=room.id).first()
        if not mood_item:
            mood_item = add_mood_board_item(
                mood_board,
                {
                    "item_type": "room",
                    "item_id": room.id,
                    "title": room.display_name,
                    "description": "Controlled launch plantable Mood Board item.",
                    "tags": ["controlled_launch_smoke", environment, CREATED_BY],
                    "position_index": 1,
                    "source_context": CREATED_BY,
                },
                observer=observer,
            )
        db.session.flush()

        observation = Observation.query.filter_by(
            author_observer_id=observer.id,
            body="Controlled launch smoke source Observation.",
        ).first()
        if not observation:
            observation = create_observation(
                observer,
                {
                    "observation_type": "room",
                    "body": "Controlled launch smoke source Observation.",
                    "visibility": "public",
                    "room_id": room.id,
                    "metadata": _tag(environment, fixture="source_observation"),
                },
                garden=garden,
            )
        db.session.flush()

        seed = create_or_update_seed(
            garden,
            seed_type="room",
            seed_id=stall_room.id,
            source_type="same_room",
            source_ref_id="controlled-launch-smoke-seed",
            reason_label="Controlled launch Seed for nurture and prune smoke.",
            metadata=_tag(environment, source_label=stall_room.display_name, fixture="mutable_seed"),
        )
        seed.status = "active"
        db.session.flush()

        hall = PresenceHall.query.filter_by(slug="presence-controlled-launch-smoke-hall").first()
        if not hall:
            hall = create_hall(
                {
                    "host_type": "room",
                    "title": "Presence Controlled Launch Smoke Hall",
                    "slug": "presence-controlled-launch-smoke-hall",
                    "description": "Public hosted Hall fixture for controlled launch smoke.",
                    "hall_type": "market_hall",
                    "visibility": "public",
                    "status": "live",
                    "capacity": 30,
                    "rules_text": "Use Mask or Room identity.",
                    "metadata": _tag(environment, fixture="public_hall"),
                },
                host_type="room",
                host_room=room,
                actor_user=owner_user,
            )
        hall.status = "live"
        hall.visibility = "public"
        hall.host_room_id = room.id
        hall.attached_room_id = room.id
        _metadata_row(hall, environment, fixture="public_hall")
        foreign_hall = PresenceHall.query.filter_by(slug="presence-controlled-launch-smoke-foreign-hall").first()
        if not foreign_hall:
            foreign_hall = create_hall(
                {
                    "host_type": "room",
                    "title": "Presence Controlled Launch Foreign Hall",
                    "slug": "presence-controlled-launch-smoke-foreign-hall",
                    "description": "Private Hall fixture for isolation checks.",
                    "hall_type": "studio_hall",
                    "visibility": "private",
                    "status": "scheduled",
                    "metadata": _tag(environment, fixture="foreign_private_hall"),
                },
                host_type="room",
                host_room=foreign_room,
                actor_user=foreign_owner_user,
            )
        foreign_hall.visibility = "private"
        foreign_hall.status = "scheduled"
        _metadata_row(foreign_hall, environment, fixture="foreign_private_hall")
        db.session.flush()

        lobby = _zone_by_title(hall.id, "Launch Lobby")
        if not lobby:
            lobby = add_zone(
                hall,
                {
                    "zone_type": "lobby",
                    "title": "Launch Lobby",
                    "description": "Controlled launch lobby.",
                    "metadata": _tag(environment, order_index=1, fixture="hall_zone"),
                },
            )
        stall_zone = _zone_by_title(hall.id, "Launch Stall")
        if not stall_zone:
            stall_zone = add_zone(
                hall,
                {
                    "zone_type": "stall",
                    "title": "Launch Stall",
                    "description": "Controlled launch stall zone.",
                    "metadata": _tag(environment, order_index=2, fixture="hall_stall_zone"),
                },
            )
        db.session.flush()
        _metadata_row(lobby, environment, fixture="hall_zone")
        _metadata_row(stall_zone, environment, fixture="hall_stall_zone")

        stall = _stall_by_room(hall.id, stall_room.id)
        if not stall:
            stall = add_stall(
                hall,
                {
                    "zone_id": stall_zone.id,
                    "room_id": stall_room.id,
                    "placement_type": "standard",
                    "metadata": _tag(environment, short_pitch="Hosted smoke stall.", fixture="hall_stall"),
                },
                room=stall_room,
            )
        db.session.flush()
        _metadata_row(stall, environment, fixture="hall_stall")

        path = PresencePath.query.filter_by(trailhead_type="hall", trailhead_id=hall.id, status="active").first()
        if not path:
            path = generate_path_from_hall(hall)
        db.session.flush()
        hall.attached_path_id = path.id

        portal = _portal_by_label(hall.id, "Launch Smoke Path")
        if not portal:
            portal = add_portal(
                hall,
                {
                    "zone_id": lobby.id,
                    "target_type": "path",
                    "target_id": path.id,
                    "label": "Launch Smoke Path",
                    "description": "Controlled launch Hall trailhead.",
                    "metadata": _tag(environment, destination_slug=f"path-{path.id}", fixture="hall_portal"),
                },
            )
        db.session.flush()
        _metadata_row(portal, environment, fixture="hall_portal")

        session = _session_by_title(hall.id, "Launch Smoke Session")
        if not session:
            session = create_session(
                hall,
                {
                    "title": "Launch Smoke Session",
                    "description": "Hosted controlled launch smoke session.",
                    "session_type": "talk",
                    "status": "live",
                    "metadata": _tag(environment, host_label=room.display_name, fixture="hall_session"),
                },
            )
        db.session.flush()
        _metadata_row(session, environment, fixture="hall_session")

        pass_row = room.presence_passes[0] if room.presence_passes else None
        if not pass_row:
            pass_row = create_pass(
                room,
                owner_user,
                {
                    "pass_type": "qr",
                    "label": "Controlled launch smoke QR Pass",
                    "metadata": _tag(environment, fixture="presence_pass"),
                },
            )
        db.session.flush()
        _metadata_row(pass_row, environment, fixture="presence_pass")

        room_key = RoomKey.query.filter_by(room_id=room.id, campaign_label="Controlled launch smoke RoomKey").first()
        if not room_key:
            room_key = create_room_key(
                room,
                owner_user,
                {
                    "key_type": "qr",
                    "campaign_label": "Controlled launch smoke RoomKey",
                    "metadata": _tag(environment, fixture="room_key"),
                },
                presence_pass=pass_row,
            )
        room_key.status = "active"
        _metadata_row(room_key, environment, fixture="room_key")
        db.session.flush()

        db.session.commit()

        owner_token = _create_public_token(owner_user.username)
        observer_token = _create_public_token(observer_user.username)
        second_observer_token = _create_public_token(second_observer_user.username)
        admin_token = _create_control_token(admin_user)
        db.session.commit()

        return {
            "tenant_id": tenant.id,
            "owner_user_id": owner_user.id,
            "observer_user_id": observer_user.id,
            "admin_user_id": admin_user.id,
            "room_id": room.id,
            "room_slug": room.slug,
            "room_key_token": room_key.public_token,
            "mask_alias": observer.alias,
            "private_mask_alias": second_observer.alias,
            "garden_id": garden.id,
            "private_garden_id": private_garden.id,
            "source_observation_id": observation.id,
            "seed_id": seed.id,
            "mood_board_id": mood_board.id,
            "mood_board_item_id": mood_item.id,
            "hall_id": hall.id,
            "hall_slug": hall.slug,
            "owner_hall_id": hall.id,
            "foreign_room_id": foreign_room.id,
            "foreign_hall_id": foreign_hall.id,
            "private_hall_slug": foreign_hall.slug,
            "hall_portal_id": portal.id,
            "hall_stall_id": stall.id,
            "hall_session_id": session.id,
            "path_id": path.id,
            "observer_token": observer_token,
            "second_observer_token": second_observer_token,
            "owner_token": owner_token,
            "admin_token": admin_token,
            "counts": {
                "gardens": PresenceGarden.query.filter(PresenceGarden.id.in_([garden.id, private_garden.id])).count(),
                "halls": PresenceHall.query.filter(PresenceHall.id.in_([hall.id, foreign_hall.id])).count(),
                "seeds": GardenSeed.query.filter_by(garden_id=garden.id).count(),
                "observations": Observation.query.filter_by(author_observer_id=observer.id).count(),
            },
        }


def _archive(app) -> dict[str, int]:
    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import PresenceGarden, PresenceHall, PresenceNode, RoomKey

        halls = PresenceHall.query.filter(PresenceHall.slug.like("presence-controlled-launch-smoke%")).all()
        rooms = PresenceNode.query.filter(PresenceNode.slug.like("presence-controlled-launch-smoke%")).all()
        room_ids = [row.id for row in rooms]
        keys = RoomKey.query.filter(RoomKey.room_id.in_(room_ids)).all() if room_ids else []
        gardens = PresenceGarden.query.filter(PresenceGarden.slug.like("presence-launch-smoke%")).all()
        for row in halls:
            row.status = "archived"
        for row in rooms:
            row.status = "archived"
            row.public_status = "archived"
        for row in keys:
            row.status = "revoked"
        for row in gardens:
            row.visibility = "private"
        db.session.commit()
        return {"halls_archived": len(halls), "rooms_archived": len(rooms), "room_keys_revoked": len(keys), "gardens_privatized": len(gardens)}


def _env_quote(value: str) -> str:
    return value if re.match(r"^[A-Za-z0-9_./:@,+\\=-]+$", value) else json.dumps(value)


def _write_env_file(path: Path, summary: dict[str, Any], *, backend_url: str, frontend_url: str) -> None:
    rows = {
        "PRESENCE_HOSTED_BACKEND_URL": backend_url,
        "PRESENCE_HOSTED_FRONTEND_URL": frontend_url,
        "PRESENCE_HOSTED_FRONTEND_ORIGIN": frontend_url,
        "PRESENCE_HOSTED_OBSERVER_TOKEN": summary["observer_token"],
        "PRESENCE_HOSTED_SECOND_OBSERVER_TOKEN": summary["second_observer_token"],
        "PRESENCE_HOSTED_OWNER_TOKEN": summary["owner_token"],
        "PRESENCE_HOSTED_ADMIN_TOKEN": summary["admin_token"],
        "PRESENCE_HOSTED_CONTROL_SECRET": os.environ.get("CONTROL_PLANE_SHARED_SECRET", ""),
        "PRESENCE_HOSTED_ROOMKEY_TOKEN": summary["room_key_token"],
        "PRESENCE_HOSTED_ROOM_KEY_TOKEN": summary["room_key_token"],
        "PRESENCE_HOSTED_MASK_ALIAS": summary["mask_alias"],
        "PRESENCE_HOSTED_PRIVATE_MASK_ALIAS": summary["private_mask_alias"],
        "PRESENCE_HOSTED_HALL_SLUG": summary["hall_slug"],
        "PRESENCE_HOSTED_HALL_ID": str(summary["hall_id"]),
        "PRESENCE_HOSTED_OWNER_HALL_ID": str(summary["owner_hall_id"]),
        "PRESENCE_HOSTED_OWNER_ROOM_ID": str(summary["room_id"]),
        "PRESENCE_HOSTED_PUBLIC_ROOM_SLUG": summary["room_slug"],
        "PRESENCE_HOSTED_MOOD_BOARD_ID": str(summary["mood_board_id"]),
        "PRESENCE_HOSTED_MOOD_BOARD_ITEM_ID": str(summary["mood_board_item_id"]),
        "PRESENCE_HOSTED_SEED_ID": str(summary["seed_id"]),
        "PRESENCE_HOSTED_HALL_PORTAL_ID": str(summary["hall_portal_id"]),
        "PRESENCE_HOSTED_HALL_STALL_ID": str(summary["hall_stall_id"]),
        "PRESENCE_HOSTED_FOREIGN_HALL_ID": str(summary["foreign_hall_id"]),
        "PRESENCE_HOSTED_FOREIGN_ROOM_ID": str(summary["foreign_room_id"]),
        "PRESENCE_HOSTED_PRIVATE_HALL_SLUG": summary["private_hall_slug"],
        "PRESENCE_CONTROLLED_LAUNCH_BACKEND_URL": backend_url,
        "PRESENCE_CONTROLLED_LAUNCH_FRONTEND_URL": frontend_url,
        "PRESENCE_CONTROLLED_LAUNCH_ROOM_KEY_TOKEN": summary["room_key_token"],
        "PRESENCE_CONTROLLED_LAUNCH_MASK_ALIAS": summary["mask_alias"],
        "PRESENCE_CONTROLLED_LAUNCH_HALL_SLUG": summary["hall_slug"],
        "PRESENCE_CONTROLLED_LAUNCH_HALL_ID": str(summary["hall_id"]),
        "PRESENCE_CONTROLLED_LAUNCH_OWNER_ROOM_ID": str(summary["room_id"]),
        "PRESENCE_CONTROLLED_LAUNCH_PUBLIC_ROOM_SLUG": summary["room_slug"],
    }
    if os.environ.get("VERCEL_PROTECTION_BYPASS"):
        rows["VERCEL_PROTECTION_BYPASS"] = os.environ["VERCEL_PROTECTION_BYPASS"]
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Generated by backend/scripts/provision_presence_controlled_launch_hosted.py",
        "# Hosted controlled-launch smoke fixtures only. Do not commit.",
    ]
    lines.extend(f"{key}={_env_quote(value)}" for key, value in rows.items() if value)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _public_summary(summary: dict[str, Any]) -> dict[str, Any]:
    secret_keys = {"room_key_token", "observer_token", "second_observer_token", "owner_token", "admin_token"}
    return {
        **{key: value for key, value in summary.items() if key not in secret_keys},
        "tokens_written": {key: bool(summary.get(key)) for key in sorted(secret_keys - {"room_key_token"})},
        "room_key_token_written": bool(summary.get("room_key_token")),
    }


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision tagged hosted Presence controlled-launch smoke fixtures.")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-env-file", type=Path, default=DEFAULT_OUTPUT_ENV)
    parser.add_argument("--backend-url", default=os.environ.get("PRESENCE_HOSTED_BACKEND_URL") or "https://anu-back-end.vercel.app")
    parser.add_argument("--frontend-url", default=os.environ.get("PRESENCE_HOSTED_FRONTEND_URL") or "https://your-presence.vercel.app")
    parser.add_argument(
        "--environment",
        choices=("hosted_preview", "production_controlled_launch"),
        default="production_controlled_launch",
    )
    parser.add_argument("--archive", action="store_true", help="Archive/revoke deterministic smoke fixture surfaces instead of provisioning.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    _load_env_file(args.backend_env_file)
    app = _build_app(_pooled_database_url())
    schema = _assert_schema(app)
    if args.archive:
        print(json.dumps({"mode": "archive", "schema": schema, "archive": _archive(app)}, indent=2, sort_keys=True))
        return 0
    summary = _seed(app, environment=args.environment)
    _write_env_file(args.output_env_file, summary, backend_url=args.backend_url, frontend_url=args.frontend_url)
    print(
        json.dumps(
            {
                "mode": "provision",
                "schema": schema,
                "output_env_file": str(args.output_env_file),
                "fixtures": _public_summary(summary),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
