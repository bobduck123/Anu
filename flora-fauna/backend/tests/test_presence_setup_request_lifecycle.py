import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-lifecycle-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-lifecycle-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "presence-control-secret"
PRESENCE_SCOPES = [
    "presence.node.create",
    "presence.node.read",
    "presence.node.update",
    "presence.node.delete",
    "presence.node.publish",
    "presence.node.suspend",
    "presence.node.archive",
    "presence.enquiry.read",
    "presence.enquiry.update",
    "presence.template.manage",
    "presence.analytics.read",
    "presence.organisation.manage",
    "presence.collection.manage",
    "presence.work.manage",
    "presence.service.manage",
    "presence.proof.manage",
    "presence.procurement.manage",
    "presence.nfc.manage",
    "presence.connection.read",
    "presence.connection.update",
    "presence.quote.manage",
    "presence.variation.manage",
    "presence.handover.manage",
]


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_PLANE_HOSTS": ["control.test"],
            "CONTROL_PLANE_SHARED_SECRET": CONTROL_SECRET,
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
        }
    )


def _seed_control_user(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import User

    with app.app_context():
        user = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        db.session.add(user)
        db.session.commit()


def _headers(app):
    with app.app_context():
        token = create_access_token(
            identity="control::platform-admin",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": "platform_admin",
                "scp": PRESENCE_SCOPES,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": CONTROL_SECRET}


def _submit_setup_request(client, **overrides):
    payload = {
        "display_name": "Preview Studio",
        "email": "preview@example.com",
        "desired_slug": "preview-studio",
        "archetype": "artist",
        "room_world": "rooms-gallery-painter",
        "engagement_dynamic": "chamber_walk",
        "motion_profile": "calm",
        "object_skin_pack": "gallery_frame_pack",
        "atmosphere_pack": "quiet_gallery",
        "short_bio": "A setup request ready for review.",
        "services": ["Commissions", {"title": "Studio visits", "description": "By appointment."}],
        "links": [{"label": "Portfolio", "url": "https://example.com"}],
        "source_origin": "https://your-presence.vercel.app",
    }
    payload.update(overrides)
    response = client.post("/api/presence/setup-requests", json=payload, base_url="http://public.test")
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]["id"]


def test_admin_setup_request_list_requires_control_auth_and_reads_details():
    app = _build_app()
    _seed_control_user(app)
    client = app.test_client()
    request_id = _submit_setup_request(client)

    unauth = client.get("/api/presence/admin/setup-requests", base_url="http://control.test")
    assert unauth.status_code == 401

    headers = _headers(app)
    listing = client.get("/api/presence/admin/setup-requests?status=submitted", headers=headers, base_url="http://control.test")
    assert listing.status_code == 200, listing.get_json()
    items = listing.get_json()["data"]["items"]
    assert [item["id"] for item in items] == [request_id]
    assert items[0]["customisation"]["resolved"]["room_world"] == "rooms-gallery-painter"

    control_alias = client.get("/api/control/presence/setup-requests", headers=headers, base_url="http://control.test")
    assert control_alias.status_code == 200
    assert control_alias.get_json()["data"]["items"][0]["id"] == request_id

    detail = client.get(f"/api/presence/admin/setup-requests/{request_id}", headers=headers, base_url="http://control.test")
    assert detail.status_code == 200
    body = detail.get_json()["data"]
    assert body["email"] == "preview@example.com"
    assert body["status"] == "submitted"
    assert body["lifecycle_audit"][0]["action"] == "submitted"


def test_admin_can_update_setup_request_status_and_audit_history():
    app = _build_app()
    _seed_control_user(app)
    client = app.test_client()
    request_id = _submit_setup_request(client)
    headers = _headers(app)

    response = client.patch(
        f"/api/presence/admin/setup-requests/{request_id}",
        json={"status": "reviewing", "internal_notes": "Assets requested.", "reason": "Initial review started."},
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["status"] == "reviewing"
    assert data["presence_status"] == "setup_request"
    assert data["internal_notes"] == "Assets requested."
    assert data["lifecycle_audit"][-1]["previous_status"] == "submitted"
    assert data["lifecycle_audit"][-1]["new_status"] == "reviewing"


def test_create_preview_uses_customisation_snapshot_and_does_not_publish():
    app = _build_app()
    _seed_control_user(app)
    client = app.test_client()
    request_id = _submit_setup_request(client, room_world="rooms-gallery-painter", desired_slug="snapshot-preview")
    headers = _headers(app)

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication, PresenceNode

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).get(request_id)
        row.room_world = "rooms-material-carpenter"
        db.session.commit()

    response = client.post(
        f"/api/presence/admin/setup-requests/{request_id}/create-preview",
        json={"note": "Generate first preview."},
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 201, response.get_json()
    data = response.get_json()["data"]
    preview = data["preview"]
    assert data["setup_request"]["status"] == "preview_ready"
    assert preview["room_world"] == "rooms-gallery-painter"
    assert preview["room_graph"]["roomWorld"] == "rooms-gallery-painter"
    assert preview["status"] == "draft"
    assert preview["visibility"] == "private"
    assert preview["public_status"] == "private"
    assert preview["preview_token"]

    public = client.get("/api/presence/public/snapshot-preview", base_url="http://public.test")
    assert public.status_code == 404

    preview_read = client.get(f"/api/presence/preview/{preview['preview_token']}", base_url="http://public.test")
    assert preview_read.status_code == 200
    preview_payload = preview_read.get_json()["data"]
    assert preview_payload["display_name"] == "Preview Studio"
    assert preview_payload["room_graph"]["schemaVersion"] == "presence-roomgraph-v1"

    with app.app_context():
        node = db.session.query(PresenceNode).filter_by(slug="snapshot-preview").one()
        assert node.status == "draft"
        assert node.visibility == "private"
        assert node.public_status == "private"
        assert node.node_metadata["room_graph"]["roomWorld"] == "rooms-gallery-painter"


def test_publish_requires_preview_then_makes_public_presence_qr_and_vcard_work():
    app = _build_app()
    _seed_control_user(app)
    client = app.test_client()
    request_id = _submit_setup_request(client, desired_slug="publishable-preview")
    headers = _headers(app)

    blocked = client.post(
        f"/api/presence/admin/setup-requests/{request_id}/publish",
        headers=headers,
        base_url="http://control.test",
    )
    assert blocked.status_code == 422

    preview = client.post(
        f"/api/presence/admin/setup-requests/{request_id}/create-preview",
        headers=headers,
        base_url="http://control.test",
    )
    assert preview.status_code == 201

    published = client.post(
        f"/api/presence/admin/setup-requests/{request_id}/publish",
        json={"note": "Approved for public launch."},
        headers=headers,
        base_url="http://control.test",
    )

    assert published.status_code == 200, published.get_json()
    data = published.get_json()["data"]
    assert data["setup_request"]["status"] == "published"
    assert data["setup_request"]["presence_status"] == "published"
    assert data["public"]["slug"] == "publishable-preview"
    assert "/presence/publishable-preview" in data["public"]["public_url"]
    assert data["setup_request"]["lifecycle_audit"][-1]["action"] == "published"

    public = client.get("/api/presence/public/publishable-preview", base_url="http://public.test")
    assert public.status_code == 200, public.get_json()
    public_data = public.get_json()["data"]
    assert public_data["public_status"] == "public"
    assert public_data["metadata"]["room_graph"]["roomWorld"] == "rooms-gallery-painter"

    vcard = client.get("/api/presence/public/publishable-preview/vcard", base_url="http://public.test")
    assert vcard.status_code == 200
    assert b"/presence/publishable-preview" in vcard.data

    qr = client.get("/api/presence/public/publishable-preview/qr", base_url="http://public.test")
    assert qr.status_code == 200
    assert b"/presence/publishable-preview" in qr.data


def test_archive_preserves_setup_request_and_unpublishes_associated_presence():
    app = _build_app()
    _seed_control_user(app)
    client = app.test_client()
    request_id = _submit_setup_request(client, desired_slug="archive-preview")
    headers = _headers(app)

    client.post(f"/api/presence/admin/setup-requests/{request_id}/create-preview", headers=headers, base_url="http://control.test")
    client.post(f"/api/presence/admin/setup-requests/{request_id}/publish", headers=headers, base_url="http://control.test")

    archived = client.post(
        f"/api/presence/admin/setup-requests/{request_id}/archive",
        json={"reason": "Pilot ended."},
        headers=headers,
        base_url="http://control.test",
    )

    assert archived.status_code == 200, archived.get_json()
    data = archived.get_json()["data"]
    assert data["status"] == "archived"
    assert data["presence_status"] == "archived"
    assert data["lifecycle_audit"][-1]["action"] == "archived"

    public = client.get("/api/presence/public/archive-preview", base_url="http://public.test")
    assert public.status_code == 404

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PresenceBetaApplication, PresenceNode

    with app.app_context():
        row = db.session.query(PresenceBetaApplication).get(request_id)
        assert row is not None
        node = db.session.query(PresenceNode).get(row.presence_node_id)
        assert node is not None
        assert node.status == "archived"


def test_public_setup_remains_unauthenticated_and_owner_beta_route_stays_protected():
    app = _build_app()
    _seed_control_user(app)
    client = app.test_client()

    request_id = _submit_setup_request(client, desired_slug="public-still-open")
    assert request_id

    owner = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Owner Draft"},
        base_url="http://public.test",
    )
    assert owner.status_code == 401
