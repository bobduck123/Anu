from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from scripts.dev_presence_contract_bootstrap import (  # noqa: E402
    build_app,
    configure_local_env,
    default_database_url,
)


ROOM_ID = 29
ROOM_SLUG = "bbbvision"
ROOM_DISPLAY_NAME = "bbb.vision"
SEED_MARKER = "gate2_bbbvision_local_seed"
SEED_VERSION = 1
LOCAL_ALLOWED_HOSTS = {"127.0.0.1", "localhost", "::1"}

OWNER_USERNAME = "presence-contract-owner"
TENANT_SLUG = "presence-contract-tenant"

COLLECTIONS = [
    {
        "id": 291,
        "title": "Threshold Sequence",
        "description": "Canonical BBB opening-image sequence.",
        "cover_image_url": "/bbb-pilot/threshold-signal.png",
        "sort_order": 0,
        "is_visible": True,
    },
    {
        "id": 292,
        "title": "Gallery Field",
        "description": "Canonical BBB gallery-image grouping.",
        "cover_image_url": "/bbb-pilot/archive-rhythm.png",
        "sort_order": 1,
        "is_visible": True,
    },
]

WORKS = [
    {
        "id": 2901,
        "collection_id": 291,
        "slug": "bbb-opening-image",
        "title": "Opening image",
        "year": "2026",
        "medium": "Digital image",
        "description": "Canonical Library source for the BBB threshold sequence.",
        "image_url": "/bbb-pilot/threshold-signal.png",
        "thumbnail_url": "/bbb-pilot/threshold-signal.png",
        "sort_order": 0,
        "is_visible": True,
    },
    {
        "id": 2902,
        "collection_id": 291,
        "slug": "bbb-portrait-field",
        "title": "Portrait field",
        "year": "2026",
        "medium": "Digital image",
        "description": "Canonical Library source for the portrait field.",
        "image_url": "/bbb-pilot/archive-rhythm.png",
        "thumbnail_url": "/bbb-pilot/archive-rhythm.png",
        "sort_order": 1,
        "is_visible": True,
    },
    {
        "id": 2903,
        "collection_id": 292,
        "slug": "bbb-stage-image",
        "title": "Stage image",
        "year": "2026",
        "medium": "Digital image",
        "description": "Canonical Library source for the gallery field.",
        "image_url": "/bbb-pilot/threshold-signal.png",
        "thumbnail_url": "/bbb-pilot/threshold-signal.png",
        "sort_order": 2,
        "is_visible": True,
    },
    {
        "id": 2904,
        "collection_id": 292,
        "slug": "bbb-shadow-image",
        "title": "Shadow image",
        "year": "2026",
        "medium": "Digital image",
        "description": "Canonical Library source for the shadow image.",
        "image_url": "/bbb-pilot/archive-rhythm.png",
        "thumbnail_url": "/bbb-pilot/archive-rhythm.png",
        "sort_order": 3,
        "is_visible": True,
    },
]


def require_local_contract_database(database_url: str) -> None:
    url = make_url(database_url)
    if not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("Gate 2 M1.5 seed requires a PostgreSQL DATABASE_URL.")
    if (url.database or "").strip().startswith("presence_contract_") is False:
        raise RuntimeError(f"Refusing non-contract database {(url.database or '')!r}.")
    if (url.host or "").strip().lower() not in LOCAL_ALLOWED_HOSTS:
        raise RuntimeError(f"Refusing non-local database host {(url.host or '')!r}.")


def bbbvision_editor_sections() -> dict[str, Any]:
    objects = [
        {
            "id": "bbb-sparkle",
            "type": "signal",
            "title": "Threshold signal",
            "workId": 2901,
            "image": "/bbb-pilot/threshold-signal.png",
            "visibility": {"public": True, "mobile": True},
        },
        {
            "id": "bbb-portrait",
            "type": "portrait",
            "title": "Portrait field",
            "workId": 2902,
            "image": "/bbb-pilot/archive-rhythm.png",
            "visibility": {"public": True, "mobile": True},
        },
        {
            "id": "bbb-stage",
            "type": "stage",
            "title": "Stage image",
            "workId": 2903,
            "image": "/bbb-pilot/threshold-signal.png",
            "visibility": {"public": True, "mobile": True},
        },
        {
            "id": "bbb-shadow",
            "type": "shadow",
            "title": "Shadow image",
            "workId": 2904,
            "image": "/bbb-pilot/archive-rhythm.png",
            "visibility": {"public": True, "mobile": True},
        },
        {
            "id": "bbb-note",
            "type": "note",
            "title": "Room note",
            "text": "Local BBBVision draft seed for owner capability work.",
            "visibility": {"public": True, "mobile": True},
        },
    ]
    placements = [
        {"objectId": "bbb-sparkle", "chamberId": "threshold", "layoutId": "threshold-grid", "zoneId": "hero", "order": 0},
        {"objectId": "bbb-portrait", "chamberId": "threshold", "layoutId": "threshold-grid", "zoneId": "portrait", "order": 1},
        {"objectId": "bbb-stage", "chamberId": "gallery", "layoutId": "gallery-wall", "zoneId": "stage", "order": 2},
        {"objectId": "bbb-shadow", "chamberId": "gallery", "layoutId": "gallery-wall", "zoneId": "shadow", "order": 3},
        {"objectId": "bbb-note", "chamberId": "gallery", "layoutId": "gallery-wall", "zoneId": "note", "order": 4},
    ]
    studio_v2 = {
        "schemaVersion": "presence-studio-v2-v1",
        "worldId": "bbbvision",
        "publicStylePreset": "bbbvision-threshold-gallery",
        "objectIds": [item["id"] for item in objects],
        "chambers": [
            {"id": "threshold", "title": "Threshold", "composition": {"layoutId": "threshold-grid", "placements": placements[:2]}},
            {"id": "gallery", "title": "Gallery", "composition": {"layoutId": "gallery-wall", "placements": placements[2:]}},
        ],
    }
    return {
        "renderer_key": "presence-studio-v2-room",
        "scene_config_json": {"studio_v2": studio_v2},
        "style_dna_json": {
            "studio_v2": {
                "schemaVersion": "presence-studio-v2-v1",
                "publicStylePreset": "bbbvision-threshold-gallery",
                "skin": "threshold-gallery",
                "palette": {"background": "#10100f", "surface": "#f3efe5", "accent": "#b9d9c5"},
            }
        },
        "motion_config_json": {"studio_v2": {"intensity": "gentle", "cameraMode": "threshold-gallery"}},
        "asset_config_json": {
            "studio_v2": {
                "assets": [
                    {"objectId": item["id"], "src": item.get("image"), "alt": item["title"]}
                    for item in objects
                    if item.get("image")
                ]
            }
        },
        "content_config_json": {"studio_v2": {"objects": objects}},
        "roomkey_config_json": {"studio_v2": {"portals": []}},
        "enquiry_config_json": {"studio_v2": {"primaryCta": {"visible": False}}},
        "locked_fields_json": {
            "seed": SEED_MARKER,
            "local_only": True,
            "public_launch_proof": False,
        },
    }


def _seed_metadata() -> dict[str, Any]:
    return {
        SEED_MARKER: True,
        "gate": "Gate 2 M1.5",
        "local_only": True,
        "public_launch_proof": False,
        "seed_version": SEED_VERSION,
    }


def _marked_as_seeded(room) -> bool:
    metadata = room.node_metadata if isinstance(room.node_metadata, dict) else {}
    return metadata.get(SEED_MARKER) is True


def _get_or_create_owner_and_tenant(db):
    from manara_backend_app.models import Node, User

    tenant = Node.query.filter_by(slug=TENANT_SLUG).first()
    if tenant is None:
        tenant = Node(slug=TENANT_SLUG, name="Presence Contract Tenant", status="active")
        db.session.add(tenant)
        db.session.flush()
    owner = User.query.filter_by(username=OWNER_USERNAME).first()
    if owner is None:
        owner = User(
            username=OWNER_USERNAME,
            pseudonym="Presence Contract Owner",
            email="presence-contract-owner@local.invalid",
            password="local-only",
            role="participant",
            node_id=tenant.id,
        )
        db.session.add(owner)
        db.session.flush()
    elif getattr(owner, "node_id", None) is None:
        owner.node_id = tenant.id
    return owner, tenant


def _sync_postgres_sequences(db) -> None:
    if db.engine.dialect.name != "postgresql":
        return
    for table_name in (
        "node",
        '"user"',
        "presence_node",
        "presence_collection",
        "presence_work",
        "presence_editable_config",
    ):
        db.session.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                f"GREATEST((SELECT COALESCE(MAX(id), 1) FROM {table_name}), 1), true)"
            )
        )


def seed_bbbvision_local(app) -> dict[str, Any]:
    from manara_backend_app.extensions import db
    from manara_backend_app.models import (
        PresenceCollection,
        PresenceEditableConfig,
        PresenceNode,
        PresenceWork,
    )

    with app.app_context():
        owner, tenant = _get_or_create_owner_and_tenant(db)

        existing_by_id = db.session.get(PresenceNode, ROOM_ID)
        existing_by_slug = PresenceNode.query.filter_by(slug=ROOM_SLUG).first()
        if existing_by_id is not None and existing_by_id.slug != ROOM_SLUG and not _marked_as_seeded(existing_by_id):
            raise RuntimeError(f"Presence node id {ROOM_ID} already belongs to slug {existing_by_id.slug!r}.")
        if existing_by_slug is not None and existing_by_slug.id != ROOM_ID:
            raise RuntimeError(f"Presence slug {ROOM_SLUG!r} already belongs to id {existing_by_slug.id}.")

        room_created = existing_by_id is None
        room = existing_by_id or PresenceNode(id=ROOM_ID)
        room.owner_user_id = owner.id
        room.tenant_id = tenant.id
        room.slug = ROOM_SLUG
        room.display_name = ROOM_DISPLAY_NAME
        room.headline = "Local BBBVision owner capability pilot."
        room.bio = "A private local Presence seed used to prove owner content shaping before publish."
        room.node_type = "artist"
        room.display_mode = "gallery"
        room.room_type = "studio"
        room.theme_preset = "bbbvision-threshold-gallery"
        room.plan_type = "pilot"
        room.status = "draft"
        room.visibility = "private"
        room.public_status = "draft"
        room.published_at = None
        room.archived_at = None
        room.cover_image_url = "/bbb-pilot/threshold-signal.png"
        room.hero_image_url = "/bbb-pilot/threshold-signal.png"
        room.landing_enabled = True
        room.landing_title = "bbb.vision"
        room.landing_subtitle = "Private local BBBVision draft."
        room.landing_background_url = "/bbb-pilot/threshold-signal.png"
        room.node_metadata = _seed_metadata()
        if room_created:
            db.session.add(room)
        db.session.flush()

        collections_created = 0
        for raw in COLLECTIONS:
            collection = db.session.get(PresenceCollection, raw["id"])
            if collection is not None and collection.node_id != ROOM_ID:
                raise RuntimeError(f"Collection id {raw['id']} belongs to another Presence.")
            if collection is None:
                collection = PresenceCollection(id=raw["id"], node_id=ROOM_ID)
                db.session.add(collection)
                collections_created += 1
            for key, value in raw.items():
                if key != "id":
                    setattr(collection, key, value)
        db.session.flush()

        works_created = 0
        for raw in WORKS:
            work = db.session.get(PresenceWork, raw["id"])
            if work is not None and work.node_id != ROOM_ID:
                raise RuntimeError(f"Work id {raw['id']} belongs to another Presence.")
            slug_conflict = (
                PresenceWork.query.filter_by(node_id=ROOM_ID, slug=raw["slug"])
                .filter(PresenceWork.id != raw["id"])
                .first()
            )
            if slug_conflict is not None:
                raise RuntimeError(f"Work slug {raw['slug']!r} already belongs to work id {slug_conflict.id}.")
            if work is None:
                work = PresenceWork(id=raw["id"], node_id=ROOM_ID)
                db.session.add(work)
                works_created += 1
            for key, value in raw.items():
                if key != "id":
                    setattr(work, key, value)
        db.session.flush()

        draft = PresenceEditableConfig.query.filter_by(room_id=ROOM_ID, status="draft").first()
        draft_created = draft is None
        if draft is None:
            draft = PresenceEditableConfig(room_id=ROOM_ID, version=1, revision=1, status="draft")
            db.session.add(draft)
        elif draft.version != 1:
            draft.version = 1
        draft.revision = max(int(draft.revision or 1), 1)
        for key, value in bbbvision_editor_sections().items():
            setattr(draft, key, value)
        draft.created_by_user_id = draft.created_by_user_id or owner.id
        draft.updated_by_user_id = owner.id
        draft.published_by_user_id = None
        draft.published_at = None
        draft.archived_at = None

        _sync_postgres_sequences(db)
        db.session.commit()
        return inspect_bbbvision_local(app) | {
            "room_created": room_created,
            "collections_created": collections_created,
            "works_created": works_created,
            "draft_created": draft_created,
            "seeded": True,
        }


def reset_bbbvision_local(app) -> dict[str, Any]:
    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceNode

    with app.app_context():
        room = db.session.get(PresenceNode, ROOM_ID)
        if room is None:
            return {"seeded": False, "removed": False, "room_id": ROOM_ID, "slug": ROOM_SLUG}
        if room.slug != ROOM_SLUG or not _marked_as_seeded(room):
            raise RuntimeError("Refusing to reset BBBVision because the local seed marker is absent.")
        db.session.delete(room)
        _sync_postgres_sequences(db)
        db.session.commit()
        return {"seeded": False, "removed": True, "room_id": ROOM_ID, "slug": ROOM_SLUG}


def inspect_bbbvision_local(app) -> dict[str, Any]:
    from manara_backend_app.models import PresenceCollection, PresenceEditableConfig, PresenceNode, PresenceWork

    with app.app_context():
        room = PresenceNode.query.filter_by(id=ROOM_ID, slug=ROOM_SLUG).first()
        if room is None:
            return {"seeded": False, "room_id": ROOM_ID, "slug": ROOM_SLUG}
        return {
            "seeded": _marked_as_seeded(room),
            "room_id": room.id,
            "slug": room.slug,
            "status": room.status,
            "visibility": room.visibility,
            "public_status": room.public_status,
            "owner_user_id": room.owner_user_id,
            "collections": PresenceCollection.query.filter_by(node_id=room.id).count(),
            "works": PresenceWork.query.filter_by(node_id=room.id).count(),
            "draft_configs": PresenceEditableConfig.query.filter_by(room_id=room.id, status="draft").count(),
            "published_configs": PresenceEditableConfig.query.filter_by(room_id=room.id, status="published").count(),
        }


def build_local_app():
    database_url = default_database_url()
    require_local_contract_database(database_url)
    configure_local_env(database_url, "http://localhost:5000")
    os.environ.setdefault("APP_ENV", "development")
    os.environ.setdefault("PRESENCE_STUDIO_V3_BACKEND_ENABLED", "1")
    os.environ.setdefault("PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS", str(ROOM_ID))
    os.environ.setdefault("PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS", ROOM_SLUG)
    return build_app(database_url)


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed/reset local BBBVision Gate 2 owner-capability data.")
    parser.add_argument("command", nargs="?", choices=["seed", "status", "reset"], default="seed")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    args = parser.parse_args()
    app = build_local_app()
    if args.command == "seed":
        result = seed_bbbvision_local(app)
    elif args.command == "reset":
        result = reset_bbbvision_local(app)
    else:
        result = inspect_bbbvision_local(app)
    if args.json:
        print(json.dumps(result, sort_keys=True))
    else:
        print(f"Gate 2 M1.5 BBBVision local seed: {json.dumps(result, sort_keys=True)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
