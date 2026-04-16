import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-site-domain-bindings-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-site-domain-bindings-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_PLANE_HOSTS": ["control.test"],
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
        }
    )


def _manifest_stub(site_name: str, site_key: str):
    return {
        "site_key": site_key,
        "site_name": site_name,
        "tagline": site_name,
        "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
        "enabled_public_modules": ["trust"],
        "footer_links": [{"label": "Privacy", "href": "/privacy"}],
        "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
        "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
        "contact": {"email": "operator@example.com", "public_contact_url": "/contact", "location_label": "Sydney"},
    }


def _seed_fixture(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain, User

    with app.app_context():
        node_a = Node(name="Tenant A", slug="tenant-a", status="active", is_default=True)
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        db.session.add_all([node_a, node_b])
        db.session.flush()

        platform_admin = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        delegated_operator = User(
            username="tenant-operator",
            pseudonym="Tenant Operator",
            email="tenant-operator@example.com",
            password="hash",
            role="node_admin",
            node_id=node_a.id,
        )
        db.session.add_all([platform_admin, delegated_operator])
        db.session.flush()

        db.session.add_all(
            [
                NodeDomain(node_id=node_a.id, domain="tenant-a.example.com", status="active", tls_ready=True),
                NodeDomain(node_id=node_b.id, domain="tenant-b.example.com", status="active", tls_ready=True),
                NodeConfig(
                    node_id=node_a.id,
                    config_json={"public_site_manifest": _manifest_stub("Tenant A", "tenant-a-site")},
                ),
                NodeConfig(
                    node_id=node_b.id,
                    config_json={"public_site_manifest": _manifest_stub("Tenant B", "tenant-b-site")},
                ),
            ]
        )
        db.session.commit()

        return {
            "tenant_a": node_a.id,
            "tenant_b": node_b.id,
        }


def _issue_control_headers(
    app,
    username: str,
    role: str = "platform_admin",
    *,
    scopes: list[str] | None = None,
):
    if scopes is None:
        scopes = [
            "sites:domains:read",
            "sites:domains:write",
            "sites:manifest:read",
            "sites:manifest:write",
        ]
    with app.app_context():
        token = create_access_token(
            identity=f"control::{username}",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": role,
                "scp": scopes,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def test_platform_admin_can_read_domain_bindings():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["node_id"] == ids["tenant_a"]
    assert payload["canonical_domains"] == ["tenant-a.example.com"]


def test_platform_admin_can_update_domain_bindings():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    update_response = app.test_client().put(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        json={"canonical_domains": [" Launch.Tenant-A.Example.com ", "www.tenant-a.example.com"]},
        headers=headers,
        base_url="http://control.test",
    )

    assert update_response.status_code == 200
    payload = update_response.get_json()["data"]
    assert payload["canonical_domains"] == ["launch.tenant-a.example.com", "www.tenant-a.example.com"]
    assert payload["mutation"]["applied"] is True
    assert payload["mutation"]["idempotent_noop"] is False

    with app.app_context():
        from manara_backend_app.models import NodeConfig, NodeDomain

        rows = (
            NodeDomain.query.filter_by(node_id=ids["tenant_a"], status="active")
            .order_by(NodeDomain.id.asc())
            .all()
        )
        assert [row.domain for row in rows] == ["launch.tenant-a.example.com", "www.tenant-a.example.com"]

        config = NodeConfig.query.filter_by(node_id=ids["tenant_a"]).first()
        assert config is not None
        assert config.config_json["public_site_manifest"]["canonical_domains"] == [
            "launch.tenant-a.example.com",
            "www.tenant-a.example.com",
        ]


def test_invalid_domain_input_is_rejected_honestly():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().put(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        json={"canonical_domains": ["http://invalid.example.com"]},
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "validation_error"
    assert "valid domain hostname" in payload["error"]["details"]["canonical_domains"][0]


def test_duplicate_domain_assignment_is_rejected():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().put(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        json={"canonical_domains": ["tenant-b.example.com"]},
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 409
    payload = response.get_json()
    assert payload["error"]["code"] == "domain_binding_conflict"
    assert payload["error"]["details"]["conflicting_domains"] == ["tenant-b.example.com"]
    assert payload["error"]["details"]["conflicting_node_ids"] == [ids["tenant_b"]]


def test_host_resolution_reflects_updated_binding_state():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    update_response = app.test_client().put(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        json={"canonical_domains": ["launch.tenant-a.example.com"]},
        headers=headers,
        base_url="http://control.test",
    )
    assert update_response.status_code == 200

    new_host = app.test_client().get("/api/public/sites/resolve?host=launch.tenant-a.example.com")
    assert new_host.status_code == 200
    new_payload = new_host.get_json()["data"]
    assert new_payload["resolved"] is True
    assert new_payload["node_id"] == ids["tenant_a"]
    assert "launch.tenant-a.example.com" in new_payload["site_manifest"]["canonical_domains"]

    old_host = app.test_client().get("/api/public/sites/resolve?host=tenant-a.example.com")
    assert old_host.status_code == 200
    old_payload = old_host.get_json()["data"]
    assert old_payload["resolution_status"] == "fallback_unknown_host"
    assert old_payload["resolved"] is False


def test_non_platform_operator_cannot_use_domain_management_path():
    app = _build_app()
    ids = _seed_fixture(app)
    headers = _issue_control_headers(app, "tenant-operator", role="node_admin")

    read_response = app.test_client().get(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        headers=headers,
        base_url="http://control.test",
    )
    assert read_response.status_code == 403
    assert read_response.get_json()["error"]["code"] == "platform_admin_required"

    update_response = app.test_client().put(
        f"/api/control/sites/{ids['tenant_a']}/domain-bindings",
        json={"canonical_domains": ["another.tenant-a.example.com"]},
        headers=headers,
        base_url="http://control.test",
    )
    assert update_response.status_code == 403
    assert update_response.get_json()["error"]["code"] == "platform_admin_required"
