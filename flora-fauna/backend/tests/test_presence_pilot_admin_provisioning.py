import json
import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-presence-pilot-admin-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-presence-pilot-admin-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "presence-pilot-admin-control-secret"
PRESENCE_SCOPES = [
    "presence.analytics.read",
    "presence.node.read",
    "presence.nfc.manage",
]


def _build_app():
    return load_create_app()(
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
            "RATELIMIT_ENABLED": False,
        }
    )


def _public_headers(app, username, role="participant"):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "role": role,
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _control_headers(app, username, role):
    with app.app_context():
        token = create_access_token(
            identity=f"control::{username}",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": role,
                "scp": PRESENCE_SCOPES,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": CONTROL_SECRET}


def _seed(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PresenceNode, User

    with app.app_context():
        tenant = Node(name="GGM Pilot Tenant", slug="ggm-pilot-tenant", status="active")
        pilot_admin = User(
            username="ggm-pilot-admin",
            pseudonym="GGM Pilot Admin",
            email="ggm-pilot-admin@example.test",
            password="hash",
            role="platform_admin",
        )
        normal = User(
            username="ggm-normal-user",
            pseudonym="GGM Normal User",
            email="ggm-normal-user@example.test",
            password="hash",
            role="participant",
        )
        db.session.add_all([tenant, pilot_admin, normal])
        db.session.flush()
        room = PresenceNode(
            tenant_id=tenant.id,
            owner_user_id=pilot_admin.id,
            slug="ggm-pilot-admin-room",
            display_name="GGM Pilot Admin Room",
            node_type="artist",
            display_mode="room",
            room_type="artist_studio",
            theme_preset="gallery_white",
            status="published",
            visibility="public",
            public_status="public",
            node_metadata={"controlled_launch_pilot": True, "pilot_code": "ggm"},
        )
        db.session.add(room)
        db.session.commit()
        return {"room_id": room.id, "admin_id": pilot_admin.id, "normal_id": normal.id}


def test_platform_admin_owner_contract_covers_studio_analytics_passes_and_control_plane():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    owner_headers = _public_headers(app, "ggm-pilot-admin", role="platform_admin")

    studio = client.get(
        f"/api/presence/owner/nodes/{ids['room_id']}",
        headers=owner_headers,
        base_url="http://public.test",
    )
    analytics = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/analytics",
        headers=owner_headers,
        base_url="http://public.test",
    )
    passes = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/passes",
        headers=owner_headers,
        base_url="http://public.test",
    )
    room_keys = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/keys",
        headers=owner_headers,
        base_url="http://public.test",
    )
    admin_readiness = client.get(
        "/api/admin/presence/world-readiness",
        headers=_control_headers(app, "ggm-pilot-admin", "platform_admin"),
        base_url="http://control.test",
    )

    assert studio.status_code == 200, studio.get_json()
    assert analytics.status_code == 200, analytics.get_json()
    assert passes.status_code == 200, passes.get_json()
    assert room_keys.status_code == 200, room_keys.get_json()
    assert admin_readiness.status_code == 200, admin_readiness.get_json()


def test_normal_user_is_denied_ggm_owner_analytics_and_control_plane():
    app = _build_app()
    ids = _seed(app)
    client = app.test_client()
    normal_headers = _public_headers(app, "ggm-normal-user")

    analytics = client.get(
        f"/api/presence/owner/rooms/{ids['room_id']}/analytics",
        headers=normal_headers,
        base_url="http://public.test",
    )
    studio = client.get(
        f"/api/presence/owner/nodes/{ids['room_id']}",
        headers=normal_headers,
        base_url="http://public.test",
    )
    admin_readiness = client.get(
        "/api/admin/presence/world-readiness",
        headers=_control_headers(app, "ggm-normal-user", "participant"),
        base_url="http://control.test",
    )

    assert analytics.status_code == 403, analytics.get_json()
    assert studio.status_code == 403, studio.get_json()
    assert admin_readiness.status_code == 403, admin_readiness.get_json()


def test_public_room_does_not_publish_admin_identity_fields():
    app = _build_app()
    _seed(app)
    response = app.test_client().get(
        "/api/presence/public/ggm-pilot-admin-room",
        base_url="http://public.test",
    )

    assert response.status_code == 200, response.get_json()
    body = json.dumps(response.get_json(), sort_keys=True)
    assert "ggm-pilot-admin@example.test" not in body
    assert "platform_admin" not in body


def test_internal_lifetime_free_entitlement_is_explicit_idempotent_and_not_a_role_grant():
    app = _build_app()
    ids = _seed(app)

    with app.app_context():
        from manara_backend_app.extensions import db
        from manara_backend_app.models import PresencePlanEntitlement, User
        from manara_backend_app.services.presence_entitlement_service import (
            ensure_internal_lifetime_free_entitlement,
            is_active_internal_lifetime_free_entitlement,
        )

        admin = User.query.get(ids["admin_id"])
        normal = User.query.get(ids["normal_id"])
        assert PresencePlanEntitlement.query.filter_by(user_id=admin.id).count() == 0

        first, created = ensure_internal_lifetime_free_entitlement(
            normal,
            reason="first_pilot_owner_admin",
            metadata={"controlled_launch_pilot": True, "pilot_code": "ggm"},
        )
        second, created_again = ensure_internal_lifetime_free_entitlement(
            normal,
            reason="first_pilot_owner_admin",
            metadata={"created_by": "test"},
        )
        db.session.commit()

        assert created is True
        assert created_again is False
        assert first.id == second.id
        assert PresencePlanEntitlement.query.filter_by(user_id=normal.id).count() == 1
        assert normal.role == "participant"
        assert is_active_internal_lifetime_free_entitlement(second) is True
        assert second.price_cents == 0
        assert second.billing_mode == "internal_comp"
        assert second.ends_at is None
        assert second.lifetime is True

    denied = app.test_client().get(
        "/api/admin/presence/world-readiness",
        headers=_control_headers(app, "ggm-normal-user", "participant"),
        base_url="http://control.test",
    )
    assert denied.status_code == 403, denied.get_json()
