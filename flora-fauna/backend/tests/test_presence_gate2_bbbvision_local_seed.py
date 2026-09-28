import os
import sys
from datetime import timedelta
from pathlib import Path


os.environ["FLASK_ENV"] = "testing"
os.environ["APP_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-bbbvision-local-seed"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-bbbvision-local-seed"
os.environ["PRESENCE_STUDIO_V3_BACKEND_ENABLED"] = "1"
os.environ["PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS"] = "29"
os.environ["PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS"] = "bbbvision"

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402
from scripts.seed_presence_gate2_bbbvision_local import (  # noqa: E402
    ROOM_ID,
    ROOM_SLUG,
    SEED_MARKER,
    inspect_bbbvision_local,
    reset_bbbvision_local,
    seed_bbbvision_local,
)


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "testing",
            "APP_ENV": "testing",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "RATELIMIT_ENABLED": False,
            "PRESENCE_STUDIO_V3_BACKEND_ENABLED": "1",
            "PRESENCE_STUDIO_V3_BACKEND_PILOT_IDS": "29",
            "PRESENCE_STUDIO_V3_BACKEND_PILOT_SLUGS": "bbbvision",
        }
    )


def _headers(app, username="presence-contract-owner"):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "role": "participant",
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _seed_room_one_control(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PresenceNode, User

    with app.app_context():
        tenant = Node(slug="presence-contract-tenant", name="Presence Contract Tenant", status="active")
        owner = User(
            username="presence-contract-owner",
            pseudonym="Presence Contract Owner",
            email="presence-contract-owner@local.invalid",
            password="local-only",
            role="participant",
        )
        db.session.add_all([tenant, owner])
        db.session.flush()
        owner.node_id = tenant.id
        room_one = PresenceNode(
            id=1,
            tenant_id=tenant.id,
            owner_user_id=owner.id,
            slug="presence-contract-room",
            display_name="Presence Contract Room",
            status="published",
            visibility="public",
            public_status="public",
        )
        db.session.add(room_one)
        db.session.commit()


def test_bbbvision_seed_is_idempotent_and_keeps_room_one_unchanged():
    app = _build_app()
    _seed_room_one_control(app)

    first = seed_bbbvision_local(app)
    second = seed_bbbvision_local(app)
    status = inspect_bbbvision_local(app)

    assert first["room_created"] is True
    assert second["room_created"] is False
    assert status == {
        "seeded": True,
        "room_id": ROOM_ID,
        "slug": ROOM_SLUG,
        "status": "draft",
        "visibility": "private",
        "public_status": "draft",
        "owner_user_id": 1,
        "collections": 2,
        "works": 4,
        "draft_configs": 1,
        "published_configs": 0,
    }

    with app.app_context():
        from manara_backend_app.models import PresenceCollection, PresenceNode, PresenceWork

        assert PresenceNode.query.filter_by(slug=ROOM_SLUG).count() == 1
        assert PresenceCollection.query.filter_by(node_id=ROOM_ID).count() == 2
        assert PresenceWork.query.filter_by(node_id=ROOM_ID).count() == 4
        room_one = PresenceNode.query.get(1)
        assert room_one.slug == "presence-contract-room"
        assert room_one.status == "published"
        assert room_one.visibility == "public"
        assert PresenceCollection.query.filter_by(node_id=1).count() == 0
        assert PresenceWork.query.filter_by(node_id=1).count() == 0


def test_bbbvision_owner_reads_work_collections_editor_and_public_stays_dark():
    app = _build_app()
    _seed_room_one_control(app)
    seed_bbbvision_local(app)
    client = app.test_client()
    headers = _headers(app)

    node_response = client.get(f"/api/presence/owner/nodes/{ROOM_ID}", headers=headers)
    works_response = client.get(f"/api/presence/owner/nodes/{ROOM_ID}/works", headers=headers)
    collections_response = client.get(f"/api/presence/owner/nodes/{ROOM_ID}/collections", headers=headers)
    editor_response = client.get(f"/api/presence/owner/rooms/{ROOM_ID}/editor", headers=headers)
    v3_state_response = client.get(f"/api/presence/owner/rooms/{ROOM_ID}/editor/v3/state", headers=headers)
    public_response = client.get(f"/api/presence/public/{ROOM_SLUG}")

    assert node_response.status_code == 200
    assert works_response.status_code == 200
    assert collections_response.status_code == 200
    assert editor_response.status_code == 200
    assert v3_state_response.status_code == 200
    assert public_response.status_code == 404

    node = node_response.get_json()["data"]
    works = works_response.get_json()["data"]
    collections = collections_response.get_json()["data"]
    editor = editor_response.get_json()["data"]
    v3_state = v3_state_response.get_json()["data"]

    assert node["id"] == ROOM_ID
    assert node["slug"] == ROOM_SLUG
    assert node["status"] == "draft"
    assert node["visibility"] == "private"
    assert len(works) == 4
    assert len(collections) == 2
    assert {work["collection_id"] for work in works} == {291, 292}
    assert editor["draft"]["renderer_key"] == "presence-studio-v2-room"
    assert editor["published"] is None
    assert editor["published_public_config"] is None
    assert v3_state["state"] is None


def test_bbbvision_reset_is_marker_guarded_and_reversible():
    app = _build_app()
    _seed_room_one_control(app)
    seed_bbbvision_local(app)

    removed = reset_bbbvision_local(app)
    missing = inspect_bbbvision_local(app)
    reseeded = seed_bbbvision_local(app)

    assert removed == {"seeded": False, "removed": True, "room_id": ROOM_ID, "slug": ROOM_SLUG}
    assert missing == {"seeded": False, "room_id": ROOM_ID, "slug": ROOM_SLUG}
    assert reseeded["seeded"] is True
    assert reseeded["works"] == 4
    assert reseeded["collections"] == 2


def test_bbbvision_reset_refuses_unmarked_room():
    app = _build_app()
    _seed_room_one_control(app)

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceNode

    with app.app_context():
        room = PresenceNode(
            id=ROOM_ID,
            owner_user_id=1,
            tenant_id=1,
            slug=ROOM_SLUG,
            display_name="Human BBBVision",
            status="draft",
            visibility="private",
            public_status="draft",
            node_metadata={SEED_MARKER: False},
        )
        db.session.add(room)
        db.session.commit()

    try:
        reset_bbbvision_local(app)
    except RuntimeError as exc:
        assert "local seed marker is absent" in str(exc)
    else:
        raise AssertionError("reset should refuse unmarked BBBVision room")
