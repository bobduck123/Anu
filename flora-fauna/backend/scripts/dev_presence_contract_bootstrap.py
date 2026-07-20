from __future__ import annotations

import argparse
import json
import os
import re
import socket
import sys
from datetime import timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
MIGRATION_PATH = BACKEND_ROOT / "migrations" / "versions" / "20260521_presence_gardens_halls_backend.sql"
DEFAULT_ENV_FILE = BACKEND_ROOT / ".env.presence-contract.local"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


LOCAL_SECRETS = {
    "SECRET_KEY": "presence-contract-local-secret-key-0001",
    "JWT_SECRET_KEY": "presence-contract-local-jwt-secret-key-0001",
    "PUBLIC_JWT_SECRET_KEY": "presence-contract-local-public-jwt-secret-0001",
    "CONTROL_JWT_SECRET_KEY": "presence-contract-local-control-jwt-secret-0001",
    "CONTROL_PLANE_SHARED_SECRET": "presence-contract-local-control-secret",
}

LOCAL_CORS_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "http://127.0.0.1:3100",
    "http://localhost:3100",
]

PRESENCE_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.analytics.read",
    "presence.nfc.manage",
]

EXPECTED_TABLES = {
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
    "hall_moderation_action",
    "hall_activity_event",
}

EXPECTED_INDEXES = {
    "presence_garden": {"ix_presence_garden_observer", "ix_presence_garden_slug"},
    "observation": {"ix_observation_garden_created", "ix_observation_hall_created"},
    "garden_seed": {"ix_garden_seed_garden", "ix_garden_seed_type_id"},
    "presence_hall": {"ix_presence_hall_slug", "ix_presence_hall_host_room"},
    "hall_activity_event": {"ix_hall_activity_event_hall", "ix_hall_activity_event_type"},
}

EXPECTED_UNIQUE_CONSTRAINTS = {
    "presence_garden": {"uq_presence_garden_default_observer", "uq_presence_garden_slug"},
    "garden_seed": {"uq_garden_seed_target"},
    "presence_hall": {"uq_presence_hall_slug"},
    "hall_stall": {"uq_hall_stall_room"},
}


def default_database_url() -> str:
    explicit = os.environ.get("PRESENCE_CONTRACT_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if explicit and explicit.startswith(("postgresql://", "postgres://")):
        return explicit
    if _tcp_open("127.0.0.1", 55432):
        return "postgresql://postgres:postgres@127.0.0.1:55432/presence_contract_local"
    if _tcp_open("127.0.0.1", 5433):
        return "postgresql://postgres:postgres@127.0.0.1:5433/presence_contract_local"
    return "postgresql://postgres:postgres@127.0.0.1:55432/presence_contract_local"


def _tcp_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.4):
            return True
    except OSError:
        return False


def configure_local_env(database_url: str, backend_url: str) -> None:
    os.environ["FLASK_ENV"] = "development"
    os.environ["APP_ENV"] = "development"
    os.environ["DATABASE_URL"] = database_url
    os.environ["AUTO_CREATE_ALL"] = "true"
    os.environ["CORS_ORIGINS"] = ",".join(LOCAL_CORS_ORIGINS)
    os.environ["CONTROL_PLANE_HOSTS"] = "127.0.0.1,localhost,control.test"
    os.environ["CONTROL_PLANE_ALLOWED_ROLES"] = "platform_admin,node_admin"
    os.environ["CONTROL_PLANE_JWT_AUDIENCE"] = "control"
    os.environ["CONTROL_REQUIRE_TOKEN_GRANT"] = "false"
    os.environ["RATELIMIT_STORAGE_URI"] = "memory://"
    os.environ["PRESENCE_CONTRACT_BACKEND_URL"] = backend_url
    for key, value in LOCAL_SECRETS.items():
        os.environ[key] = value


def app_config(database_url: str) -> dict[str, Any]:
    return {
        "TESTING": False,
        "FLASK_ENV": "development",
        "SQLALCHEMY_DATABASE_URI": database_url,
        "SECRET_KEY": LOCAL_SECRETS["SECRET_KEY"],
        "JWT_SECRET_KEY": LOCAL_SECRETS["JWT_SECRET_KEY"],
        "PUBLIC_JWT_SECRET_KEY": LOCAL_SECRETS["PUBLIC_JWT_SECRET_KEY"],
        "CONTROL_JWT_SECRET_KEY": LOCAL_SECRETS["CONTROL_JWT_SECRET_KEY"],
        "AUTO_CREATE_ALL": True,
        "CORS_ORIGINS": LOCAL_CORS_ORIGINS,
        "CONTROL_PLANE_HOSTS": ["127.0.0.1", "localhost", "control.test"],
        "CONTROL_PLANE_SHARED_SECRET": LOCAL_SECRETS["CONTROL_PLANE_SHARED_SECRET"],
        "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
        "CONTROL_PLANE_JWT_AUDIENCE": "control",
        "CONTROL_REQUIRE_TOKEN_GRANT": False,
        "RATELIMIT_STORAGE_URI": "memory://",
        "RATELIMIT_ENABLED": False,
    }


def reset_contract_database(database_url: str) -> None:
    url = make_url(database_url)
    if not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Presence contract bootstrap requires a PostgreSQL DATABASE_URL.")
    database_name = url.database or ""
    if not database_name.startswith("presence_contract_"):
        raise RuntimeError(
            f"Refusing to reset non-contract database {database_name!r}. "
            "Use a database name starting with presence_contract_."
        )
    identifier = quote_identifier(database_name)
    admin_url = url.set(database="postgres")
    engine = create_engine(admin_url, future=True, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as conn:
            conn.execute(
                text(
                    "SELECT pg_terminate_backend(pid) "
                    "FROM pg_stat_activity "
                    "WHERE datname = :database_name AND pid <> pg_backend_pid()"
                ),
                {"database_name": database_name},
            )
            conn.execute(text(f"DROP DATABASE IF EXISTS {identifier}"))
            conn.execute(text(f"CREATE DATABASE {identifier}"))
    finally:
        engine.dispose()


def quote_identifier(value: str) -> str:
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", value):
        raise RuntimeError(f"Unsafe PostgreSQL identifier: {value!r}")
    return f'"{value}"'


def build_app(database_url: str):
    from backend_factory import load_create_app

    create_app = load_create_app()
    return create_app(app_config(database_url))


def apply_schema(app) -> dict[str, Any]:
    if not MIGRATION_PATH.exists():
        raise RuntimeError(f"Missing Gardens/Halls migration: {MIGRATION_PATH}")
    with app.app_context():
        from manara_backend_app.extensions import db

        db.create_all()
        migration_sql = MIGRATION_PATH.read_text(encoding="utf-8")
        with db.engine.begin() as conn:
            conn.exec_driver_sql(migration_sql)
        db.create_all()
        return check_schema(db.engine)


def check_schema(engine) -> dict[str, Any]:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    missing_tables = sorted(EXPECTED_TABLES - tables)
    if missing_tables:
        raise RuntimeError(f"Missing Presence contract tables: {missing_tables}")

    missing_indexes: dict[str, list[str]] = {}
    missing_constraints: dict[str, list[str]] = {}
    for table_name, expected in EXPECTED_INDEXES.items():
        actual = {row.get("name") for row in inspector.get_indexes(table_name)}
        absent = sorted(expected - actual)
        if absent:
            missing_indexes[table_name] = absent
    for table_name, expected in EXPECTED_UNIQUE_CONSTRAINTS.items():
        actual = {row.get("name") for row in inspector.get_unique_constraints(table_name)}
        absent = sorted(expected - actual)
        if absent:
            missing_constraints[table_name] = absent
    if missing_indexes or missing_constraints:
        raise RuntimeError(
            "Presence contract schema check failed: "
            + json.dumps({"missing_indexes": missing_indexes, "missing_constraints": missing_constraints}, sort_keys=True)
        )
    return {
        "tables": sorted(EXPECTED_TABLES),
        "indexes_checked": {key: sorted(value) for key, value in EXPECTED_INDEXES.items()},
        "unique_constraints_checked": {key: sorted(value) for key, value in EXPECTED_UNIQUE_CONSTRAINTS.items()},
    }


def seed_contract_data(app) -> dict[str, Any]:
    with app.app_context():
        from flask_jwt_extended import create_access_token
        from manara_backend_app.extensions import db
        from manara_backend_app.models import (
            GardenSeed,
            HallActivityEvent,
            HallParticipant,
            MoodBoard,
            MoodBoardItem,
            Node,
            Observation,
            Path as PresencePath,
            PresenceGarden,
            PresenceHall,
            PresenceNode,
            SharedSpace,
            User,
        )
        from manara_backend_app.services.presence_garden_service import get_or_create_default_garden, update_garden
        from manara_backend_app.services.presence_hall_activity_service import record_hall_activity_event
        from manara_backend_app.services.presence_hall_service import add_portal, add_stall, add_zone, create_hall, create_session, join_hall
        from manara_backend_app.services.presence_observation_service import create_observation, echo_observation
        from manara_backend_app.services.presence_path_service import generate_path_from_hall
        from manara_backend_app.services.presence_seed_service import (
            compost_inactive_seeds,
            create_or_update_seed,
            nurture_seed,
            prune_seed,
            recompute_garden_weights,
        )
        from manara_backend_app.services.presence_shared_space_service import record_shared_space
        from manara_backend_app.services.presence_social_service import add_mood_board_item, create_mood_board, get_or_create_observer_for_user
        from manara_backend_app.time_utils import now_utc

        tenant = _get_or_create(
            Node,
            {"slug": "presence-contract-tenant"},
            name="Presence Contract Tenant",
            status="active",
            is_default=True,
        )

        owner_user = _get_or_create_user(
            User,
            username="presence-contract-owner",
            pseudonym="Presence Contract Owner",
            email="presence-contract-owner@example.test",
            role="participant",
        )
        observer_user = _get_or_create_user(
            User,
            username="presence-contract-observer",
            pseudonym="Presence Contract Observer",
            email="presence-contract-observer@example.test",
            role="participant",
        )
        second_observer_user = _get_or_create_user(
            User,
            username="presence-contract-observer-two",
            pseudonym="Presence Contract Observer Two",
            email="presence-contract-observer-two@example.test",
            role="participant",
        )
        admin_user = _get_or_create_user(
            User,
            username="presence-contract-admin",
            pseudonym="Presence Contract Admin",
            email="presence-contract-admin@example.test",
            role="platform_admin",
        )
        db.session.flush()

        room = _get_or_create(
            PresenceNode,
            {"slug": "presence-contract-room"},
            tenant_id=tenant.id,
            owner_user_id=owner_user.id,
            display_name="Presence Contract Room",
            headline="A local contract Room for Gardens and Halls.",
            bio="Seeded local Room for real-backend contract verification.",
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
            location_label="Local Contract",
        )
        companion_room = _get_or_create(
            PresenceNode,
            {"slug": "presence-contract-stall-room"},
            tenant_id=tenant.id,
            owner_user_id=owner_user.id,
            display_name="Presence Contract Stall Room",
            headline="A second Room for stall placement.",
            bio="Companion local Room for stall and path verification.",
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
        )
        db.session.flush()

        observer = get_or_create_observer_for_user(
            observer_user,
            {"alias": "presence-contract-mask", "mask_name": "Contract Mask", "bio_fragment": "Rooms, traces, halls."},
        )
        second_observer = get_or_create_observer_for_user(
            second_observer_user,
            {"alias": "presence-contract-echo", "mask_name": "Contract Echo", "bio_fragment": "Keeps shared context close."},
        )
        owner_observer = get_or_create_observer_for_user(
            owner_user,
            {"alias": "presence-contract-owner-mask", "mask_name": "Contract Host"},
        )
        db.session.flush()

        garden = get_or_create_default_garden(
            observer,
            {"title": "Presence Contract Garden", "slug": "presence-contract-mask", "visibility": "public"},
        )
        update_garden(
            garden,
            {
                "title": "Presence Contract Garden",
                "description": "Local contract Garden with explainable Seeds.",
                "visibility": "public",
                "slug": "presence-contract-mask",
                "theme_key": "contract",
            },
        )
        echo_garden = get_or_create_default_garden(
            second_observer,
            {"title": "Presence Contract Echo Garden", "slug": "presence-contract-echo", "visibility": "public"},
        )
        update_garden(echo_garden, {"visibility": "public", "slug": "presence-contract-echo"})
        db.session.flush()

        mood_board = MoodBoard.query.filter_by(observer_id=observer.id, title="Presence Contract Mood Board").first()
        if not mood_board:
            mood_board = create_mood_board(
                "observer",
                {
                    "title": "Presence Contract Mood Board",
                    "description": "Room references for Garden Seed verification.",
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
                    "description": "Seedable Room reference.",
                    "tags": ["contract", "garden", "room"],
                    "position_index": 1,
                    "source_context": "presence-contract-fixture",
                },
                observer=observer,
            )
            db.session.flush()

        if not Observation.query.filter_by(author_observer_id=observer.id, body="A contract Observation rooted in a Room.").first():
            source_observation = create_observation(
                observer,
                {
                    "observation_type": "room",
                    "body": "A contract Observation rooted in a Room.",
                    "visibility": "public",
                    "room_id": room.id,
                    "metadata": {"contract_fixture": True},
                },
                garden=garden,
            )
        else:
            source_observation = Observation.query.filter_by(author_observer_id=observer.id, body="A contract Observation rooted in a Room.").first()
        if not Observation.query.filter_by(author_observer_id=observer.id, body="A mood board Observation for Garden home.").first():
            create_observation(
                observer,
                {
                    "observation_type": "mood",
                    "body": "A mood board Observation for Garden home.",
                    "visibility": "public",
                    "mood_board_id": mood_board.id,
                    "metadata": {"contract_fixture": True},
                },
                garden=garden,
            )
        db.session.flush()

        if not source_observation.echoes:
            echo_observation(second_observer, source_observation, {"commentary": "Echo with commentary from the real backend fixture."})

        active_seed = create_or_update_seed(
            garden,
            seed_type="room",
            seed_id=room.id,
            source_type="same_room",
            source_ref_id="contract-room",
            reason_label="You entered this local contract Room.",
            metadata={"source_label": room.display_name, "source_slug": room.slug, "contract_fixture": True},
        )
        nurture_seed(garden, active_seed, observer, nurture_type="manual_keep_close", metadata={"contract_fixture": True})
        create_or_update_seed(
            garden,
            seed_type="mood_board",
            seed_id=mood_board.id,
            source_type="mood_board_overlap",
            source_ref_id=mood_board.id,
            reason_label="Your Mood Board contains this seeded Room.",
            metadata={"source_label": mood_board.title, "contract_fixture": True},
        )
        wilting_seed = create_or_update_seed(
            garden,
            seed_type="room",
            seed_id=companion_room.id,
            source_type="same_room",
            source_ref_id="contract-wilting",
            base_strength=20,
            half_life_days=5,
            reason_label="This Room is wilting unless nurtured.",
            metadata={"source_label": companion_room.display_name, "source_slug": companion_room.slug, "contract_fixture": True},
            occurred_at=now_utc() - timedelta(days=3),
        )
        compost_seed = create_or_update_seed(
            garden,
            seed_type="tag",
            seed_id=999001,
            source_type="manual",
            source_ref_id="contract-compost",
            base_strength=12,
            half_life_days=1,
            reason_label="Old local test Seed for compost.",
            metadata={"source_label": "Old contract Seed", "contract_fixture": True},
            occurred_at=now_utc() - timedelta(days=20),
        )
        pruned_seed = create_or_update_seed(
            garden,
            seed_type="tag",
            seed_id=999002,
            source_type="manual",
            source_ref_id="contract-pruned",
            reason_label="Local test Seed that has been pruned.",
            metadata={"source_label": "Pruned contract Seed", "contract_fixture": True},
        )
        prune_seed(garden, pruned_seed, prune_type="prune", reason="Contract fixture pruned Seed.", reporter_observer=observer)
        recompute_garden_weights(garden)
        compost_inactive_seeds(garden)
        wilting_seed.status = "wilting"
        compost_seed.status = "composted"
        compost_seed.current_weight = 0

        hall = PresenceHall.query.filter_by(slug="presence-contract-hall").first()
        if not hall:
            hall = create_hall(
                {
                    "host_type": "room",
                    "title": "Presence Contract Hall",
                    "slug": "presence-contract-hall",
                    "description": "Local public Hall for real-backend frontend contract tests.",
                    "hall_type": "market_hall",
                    "visibility": "public",
                    "status": "live",
                    "capacity": 80,
                    "rules_text": "Publicly masked, privately accountable.",
                    "metadata": {"contract_fixture": True, "cover_image_url": "https://example.test/presence-contract-hall.jpg"},
                },
                host_type="room",
                host_room=room,
                actor_user=owner_user,
            )
            db.session.flush()
        hall.status = "live"
        hall.visibility = "public"
        hall.host_room_id = room.id
        hall.attached_room_id = room.id
        db.session.flush()

        zones = {}
        for zone_type, title, order_index in [
            ("lobby", "Lobby", 1),
            ("stage", "Stage", 2),
            ("table", "Table", 3),
            ("stall", "Stall Row", 4),
            ("noticeboard", "Noticeboard", 5),
            ("portal", "Portal Garden", 6),
        ]:
            zone = _hall_zone_by_title(hall.id, title)
            if not zone:
                zone = add_zone(
                    hall,
                    {
                        "zone_type": zone_type,
                        "title": title,
                        "description": f"Contract {title} zone.",
                        "metadata": {"order_index": order_index, "contract_fixture": True},
                    },
                )
            zones[zone_type] = zone
        db.session.flush()

        stall = _hall_stall_by_room(hall.id, room.id)
        if not stall:
            stall = add_stall(
                hall,
                {
                    "zone_id": zones["stall"].id,
                    "room_id": room.id,
                    "placement_type": "host",
                    "metadata": {"short_pitch": "Host Room for the contract Hall.", "contract_fixture": True},
                },
                room=room,
            )
        db.session.flush()

        path = PresencePath.query.filter_by(trailhead_type="hall", trailhead_id=hall.id, status="active").first()
        if not path:
            path = generate_path_from_hall(hall)
            db.session.flush()
        hall.attached_path_id = path.id

        portal = _hall_portal_by_label(hall.id, "Contract Trailhead")
        if not portal:
            portal = add_portal(
                hall,
                {
                    "zone_id": zones["portal"].id,
                    "target_type": "path",
                    "target_id": path.id,
                    "label": "Contract Trailhead",
                    "description": "Path trailhead from the contract Hall.",
                    "metadata": {"destination_slug": f"path-{path.id}", "contract_fixture": True},
                },
            )
        db.session.flush()

        session = _hall_session_by_title(hall.id, "Contract Opening")
        if not session:
            session = create_session(
                hall,
                {
                    "title": "Contract Opening",
                    "description": "Polling-ready local Hall session.",
                    "session_type": "talk",
                    "status": "live",
                    "metadata": {"host_label": "Presence Contract Room", "contract_fixture": True},
                },
            )
        db.session.flush()

        if not HallParticipant.query.filter_by(hall_id=hall.id, session_id=session.id, observer_id=observer.id).first():
            join_hall(hall, observer=observer, data={"role": "participant", "session_id": session.id})
        if not HallParticipant.query.filter_by(hall_id=hall.id, session_id=session.id, guest_token="presence-contract-guest").first():
            join_hall(hall, guest_token="presence-contract-guest", data={"session_id": session.id})
        if not Observation.query.filter_by(hall_id=hall.id, body="A contract Hall Observation.").first():
            create_observation(
                observer,
                {
                    "body": "A contract Hall Observation.",
                    "visibility": "hall",
                    "observation_type": "hall",
                    "metadata": {"contract_fixture": True},
                },
                hall=hall,
            )
        _record_fixture_hall_event(record_hall_activity_event, HallActivityEvent, hall, "join", observer=observer, session_id=session.id)
        _record_fixture_hall_event(record_hall_activity_event, HallActivityEvent, hall, "portal_click", observer=observer, portal_id=portal.id)
        _record_fixture_hall_event(record_hall_activity_event, HallActivityEvent, hall, "stall_visit", observer=observer, room_id=room.id, stall_id=stall.id)

        mood_shared_space = SharedSpace.query.filter_by(space_type="mood_board", space_id=mood_board.id, observer_id=observer.id).first()
        if not mood_shared_space:
            record_shared_space(
                space_type="mood_board",
                space_id=mood_board.id,
                observer=observer,
                strength=45,
                metadata={"mood_board_id": mood_board.id, "contract_fixture": True},
            )
        db.session.flush()

        db.session.commit()

        observer_token = create_public_token(observer_user.username)
        second_observer_token = create_public_token(second_observer_user.username)
        owner_token = create_public_token(owner_user.username)
        admin_token = create_control_token(admin_user.username)

        summary = {
            "tenant_id": tenant.id,
            "observer_user_id": observer_user.id,
            "owner_user_id": owner_user.id,
            "admin_user_id": admin_user.id,
            "observer_id": observer.id,
            "mask_alias": observer.alias,
            "garden_id": garden.id,
            "echo_garden_id": echo_garden.id,
            "room_id": room.id,
            "room_slug": room.slug,
            "stall_room_id": companion_room.id,
            "mood_board_id": mood_board.id,
            "mood_board_item_id": mood_item.id,
            "source_observation_id": source_observation.id,
            "hall_id": hall.id,
            "hall_slug": hall.slug,
            "session_id": session.id,
            "portal_id": portal.id,
            "stall_id": stall.id,
            "path_id": path.id,
            "tokens": {
                "observer": observer_token,
                "second_observer": second_observer_token,
                "owner": owner_token,
                "admin": admin_token,
            },
            "counts": {
                "gardens": PresenceGarden.query.count(),
                "observations": Observation.query.count(),
                "seeds": GardenSeed.query.count(),
                "shared_spaces": SharedSpace.query.count(),
                "halls": PresenceHall.query.count(),
                "hall_activity_events": HallActivityEvent.query.count(),
            },
        }
        return summary


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


def _get_or_create_user(User, *, username: str, pseudonym: str, email: str, role: str):
    user = User.query.filter_by(username=username).first()
    if user:
        user.pseudonym = pseudonym
        user.email = email
        user.role = role
        return user
    user = User(username=username, pseudonym=pseudonym, email=email, password="presence-contract-local-hash", role=role)
    from manara_backend_app.extensions import db

    db.session.add(user)
    return user


def _hall_zone_by_title(hall_id: int, title: str):
    from manara_backend_app.models import HallZone

    return HallZone.query.filter_by(hall_id=hall_id, title=title).first()


def _hall_portal_by_label(hall_id: int, label: str):
    from manara_backend_app.models import HallPortal

    return HallPortal.query.filter_by(hall_id=hall_id, label=label).first()


def _hall_stall_by_room(hall_id: int, room_id: int):
    from manara_backend_app.models import HallStall

    return HallStall.query.filter_by(hall_id=hall_id, room_id=room_id).first()


def _hall_session_by_title(hall_id: int, title: str):
    from manara_backend_app.models import HallSession

    return HallSession.query.filter_by(hall_id=hall_id, title=title).first()


def _record_fixture_hall_event(record_event, HallActivityEvent, hall, event_type: str, **kwargs):
    criteria = {
        "hall_id": hall.id,
        "event_type": event_type,
        "source": "fixture",
    }
    for key in ("portal_id", "stall_id", "session_id"):
        if kwargs.get(key) is not None:
            criteria[key] = kwargs[key]
    if HallActivityEvent.query.filter_by(**criteria).first():
        return None
    return record_event(hall, event_type, source="fixture", metadata={"contract_fixture": True}, **kwargs)


def create_public_token(username: str) -> str:
    from flask_jwt_extended import create_access_token

    return create_access_token(
        identity=username,
        additional_claims={"aud": "public", "token_use": "public", "role": "participant", "username": username},
        expires_delta=timedelta(days=7),
    )


def create_control_token(username: str) -> str:
    from flask_jwt_extended import create_access_token

    return create_access_token(
        identity=f"control::{username}",
        additional_claims={
            "aud": "control",
            "token_use": "control",
            "requires_mfa": True,
            "role": "platform_admin",
            "scp": PRESENCE_SCOPES,
        },
        expires_delta=timedelta(days=7),
    )


def env_payload(summary: dict[str, Any], *, database_url: str, backend_url: str) -> dict[str, str]:
    tokens = summary["tokens"]
    return {
        "DATABASE_URL": database_url,
        "FLASK_ENV": "development",
        "APP_ENV": "development",
        "AUTO_CREATE_ALL": "true",
        "SECRET_KEY": LOCAL_SECRETS["SECRET_KEY"],
        "JWT_SECRET_KEY": LOCAL_SECRETS["JWT_SECRET_KEY"],
        "PUBLIC_JWT_SECRET_KEY": LOCAL_SECRETS["PUBLIC_JWT_SECRET_KEY"],
        "CONTROL_JWT_SECRET_KEY": LOCAL_SECRETS["CONTROL_JWT_SECRET_KEY"],
        "CORS_ORIGINS": ",".join(LOCAL_CORS_ORIGINS),
        "CONTROL_PLANE_HOSTS": "127.0.0.1,localhost,control.test",
        "CONTROL_PLANE_SHARED_SECRET": LOCAL_SECRETS["CONTROL_PLANE_SHARED_SECRET"],
        "CONTROL_PLANE_ALLOWED_ROLES": "platform_admin,node_admin",
        "CONTROL_PLANE_JWT_AUDIENCE": "control",
        "CONTROL_REQUIRE_TOKEN_GRANT": "false",
        "RATELIMIT_STORAGE_URI": "memory://",
        "PRESENCE_REAL_BACKEND_URL": backend_url,
        "PRESENCE_REAL_OBSERVER_TOKEN": tokens["observer"],
        "PRESENCE_REAL_SECOND_OBSERVER_TOKEN": tokens["second_observer"],
        "PRESENCE_REAL_OWNER_TOKEN": tokens["owner"],
        "PRESENCE_REAL_ADMIN_TOKEN": tokens["admin"],
        "PRESENCE_REAL_HALL_SLUG": str(summary["hall_slug"]),
        "PRESENCE_REAL_HALL_ID": str(summary["hall_id"]),
        "PRESENCE_REAL_OWNER_ROOM_ID": str(summary["room_id"]),
        "PRESENCE_REAL_OWNER_ROOM_SLUG": str(summary["room_slug"]),
        "PRESENCE_REAL_MASK_ALIAS": str(summary["mask_alias"]),
        "PRESENCE_REAL_GARDEN_ID": str(summary["garden_id"]),
        "PRESENCE_REAL_SOURCE_OBSERVATION_ID": str(summary["source_observation_id"]),
        "PRESENCE_REAL_MOOD_BOARD_ID": str(summary["mood_board_id"]),
        "PRESENCE_REAL_MOOD_BOARD_ITEM_ID": str(summary["mood_board_item_id"]),
        "PRESENCE_REAL_HALL_PORTAL_ID": str(summary["portal_id"]),
        "PRESENCE_REAL_HALL_STALL_ID": str(summary["stall_id"]),
        "PRESENCE_REAL_HALL_PATH_ID": str(summary["path_id"]),
    }


def write_env_file(path: Path, values: dict[str, str]) -> None:
    lines = [
        "# Generated by backend/scripts/dev_presence_contract_bootstrap.py",
        "# Local Presence Gardens + Halls contract verification only. Do not commit.",
    ]
    for key, value in values.items():
        lines.append(f"{key}={_env_quote(value)}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _env_quote(value: str) -> str:
    if re.match(r"^[A-Za-z0-9_./:@,+\\=-]+$", value):
        return value
    return json.dumps(value)


def print_export_blocks(values: dict[str, str]) -> None:
    keys = [key for key in values if key.startswith("PRESENCE_REAL_")]
    print("\nPowerShell frontend contract exports:")
    for key in keys:
        print(f"$env:{key} = {json.dumps(values[key])}")
    print("\nBash frontend contract exports:")
    for key in keys:
        print(f"export {key}={json.dumps(values[key])}")


def run(args: argparse.Namespace) -> dict[str, Any]:
    backend_url = f"http://{args.host}:{args.port}"
    database_url = args.database_url or default_database_url()
    configure_local_env(database_url, backend_url)
    if args.reset_db:
        reset_contract_database(database_url)
    app = build_app(database_url)
    schema = apply_schema(app)
    seed = seed_contract_data(app)
    values = env_payload(seed, database_url=database_url, backend_url=backend_url)
    write_env_file(args.env_file, values)
    result = {"database_url": database_url, "backend_url": backend_url, "env_file": str(args.env_file), "schema": schema, "seed": {k: v for k, v in seed.items() if k != "tokens"}}
    print(json.dumps(result, indent=2, sort_keys=True))
    if args.print_playwright_env:
        print_export_blocks(values)
    if args.serve:
        print(f"\nServing Presence contract backend on {backend_url}")
        app.run(host=args.host, port=args.port, debug=False, use_reloader=False)
    return result


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Provision and serve a local Presence Gardens/Halls contract backend.")
    parser.add_argument("--database-url", default=None, help="PostgreSQL URL. Defaults to PRESENCE_CONTRACT_DATABASE_URL, DATABASE_URL, localhost:55432, or localhost:5433.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE, help="Generated env handoff file for frontend Playwright.")
    parser.add_argument("--host", default="127.0.0.1", help="Backend host used for --serve and exported PRESENCE_REAL_BACKEND_URL.")
    parser.add_argument("--port", type=int, default=5106, help="Backend port used for --serve and exported PRESENCE_REAL_BACKEND_URL.")
    parser.add_argument("--reset-db", dest="reset_db", action="store_true", default=True, help="Drop and recreate the contract database before seeding.")
    parser.add_argument("--no-reset-db", dest="reset_db", action="store_false", help="Reuse the existing contract database.")
    parser.add_argument("--print-playwright-env", action="store_true", help="Print frontend Playwright env exports.")
    parser.add_argument("--serve", action="store_true", help="Run the Flask development server after provisioning.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    run(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
