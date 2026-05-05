import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-admin-tenant-control-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-admin-tenant-control-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


CONTROL_SECRET = "expected-control-secret"


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


def _seed_fixture(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain, User

    with app.app_context():
        node_a = Node(name="Tenant A", slug="tenant-a", status="active")
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        platform_admin = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        node_admin = User(
            username="node-admin",
            pseudonym="Node Admin",
            email="node-admin@example.com",
            password="hash",
            role="node_admin",
        )
        db.session.add_all([node_a, node_b, platform_admin, node_admin])
        db.session.flush()
        node_admin.node_id = node_a.id
        db.session.add_all(
            [
                NodeDomain(node_id=node_a.id, domain="tenant-a.example", status="active", tls_ready=True),
                NodeDomain(node_id=node_b.id, domain="tenant-b.example", status="active", tls_ready=True),
                NodeConfig(node_id=node_a.id, config_json={"control_operator_usernames": ["node-admin"]}),
                NodeConfig(node_id=node_b.id, config_json={}),
            ]
        )
        db.session.commit()
        return node_a.id, node_b.id


def _headers(app, username, role="platform_admin", *, scopes=None, node_id=None, secret=CONTROL_SECRET):
    scopes = scopes or ["sites:tenants:read", "sites:tenants:write", "sites:domains:read", "sites:domains:write"]
    with app.app_context():
        claims = {
            "aud": "control",
            "token_use": "control",
            "requires_mfa": True,
            "role": role,
            "scp": scopes,
        }
        if node_id is not None:
            claims["node_id"] = node_id
        token = create_access_token(
            identity=f"control::{username}",
            additional_claims=claims,
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}", "X-Control-Plane-Secret": secret}


def test_admin_tenants_control_plane_auth_matrix():
    app = _build_app()
    _seed_fixture(app)
    client = app.test_client()

    missing = client.get("/api/admin/tenants", base_url="http://control.test")
    assert missing.status_code == 401

    invalid = client.get(
        "/api/admin/tenants",
        headers={"Authorization": "Bearer invalid", "X-Control-Plane-Secret": CONTROL_SECRET},
        base_url="http://control.test",
    )
    assert invalid.status_code == 422

    wrong_secret = client.get(
        "/api/admin/tenants",
        headers=_headers(app, "platform-admin", secret="wrong-secret"),
        base_url="http://control.test",
    )
    assert wrong_secret.status_code == 403
    assert wrong_secret.get_json()["error"]["code"] == "control_plane_forbidden"

    wrong_host = client.get(
        "/api/admin/tenants",
        headers=_headers(app, "platform-admin"),
        base_url="http://public.test",
    )
    assert wrong_host.status_code == 403

    insufficient_scope = client.get(
        "/api/admin/tenants",
        headers=_headers(app, "platform-admin", scopes=["sites:manifest:read"]),
        base_url="http://control.test",
    )
    assert insufficient_scope.status_code == 403

    valid = client.get(
        "/api/admin/tenants",
        headers=_headers(app, "platform-admin"),
        base_url="http://control.test",
    )
    assert valid.status_code == 200
    assert len(valid.get_json()["data"]) >= 2


def test_admin_tenants_node_admin_cannot_read_or_mutate_wrong_tenant():
    app = _build_app()
    node_a_id, node_b_id = _seed_fixture(app)
    client = app.test_client()
    node_headers = _headers(
        app,
        "node-admin",
        role="node_admin",
        scopes=["sites:tenants:read", "sites:tenants:write"],
        node_id=node_a_id,
    )

    allowed = client.get(
        f"/api/admin/tenants/{node_a_id}",
        headers=node_headers,
        base_url="http://control.test",
    )
    assert allowed.status_code == 200

    blocked = client.get(
        f"/api/admin/tenants/{node_b_id}",
        headers=node_headers,
        base_url="http://control.test",
    )
    assert blocked.status_code == 403

    mutation = client.patch(
        f"/api/admin/tenants/{node_a_id}/branding",
        headers=node_headers,
        json={"branding": {"primary_color": "#000000"}},
        base_url="http://control.test",
    )
    assert mutation.status_code == 403


def test_domain_admin_routes_are_control_plane_guarded_and_tenant_scoped():
    app = _build_app()
    node_a_id, node_b_id = _seed_fixture(app)
    client = app.test_client()

    missing = client.get("/api/domains", base_url="http://control.test")
    assert missing.status_code == 401

    platform = client.get(
        "/api/domains",
        headers=_headers(app, "platform-admin", scopes=["sites:domains:read"]),
        base_url="http://control.test",
    )
    assert platform.status_code == 200
    assert {row["node_id"] for row in platform.get_json()["domains"]} >= {node_a_id, node_b_id}

    node_headers = _headers(
        app,
        "node-admin",
        role="node_admin",
        scopes=["sites:domains:read", "sites:domains:write"],
        node_id=node_a_id,
    )
    scoped = client.get("/api/domains", headers=node_headers, base_url="http://control.test")
    assert scoped.status_code == 200
    assert {row["node_id"] for row in scoped.get_json()["domains"]} == {node_a_id}

    blocked_write = client.post(
        "/api/domains",
        headers=node_headers,
        json={"node_id": node_b_id, "domain": "blocked.example", "provision_vercel": False},
        base_url="http://control.test",
    )
    assert blocked_write.status_code == 403
