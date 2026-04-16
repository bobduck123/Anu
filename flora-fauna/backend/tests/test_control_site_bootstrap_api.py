import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-site-bootstrap-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-site-bootstrap-1234"

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
        existing_node = Node(name="Existing Node", slug="existing-node", status="active")
        db.session.add(existing_node)
        db.session.flush()

        db.session.add(
            NodeConfig(
                node_id=existing_node.id,
                config_json={
                    "public_site_manifest": _manifest_stub("Existing Site", "existing-node-public"),
                },
            )
        )
        db.session.add(NodeDomain(node_id=existing_node.id, domain="existing.example.com", status="active", tls_ready=True))

        platform_admin = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        tenant_operator = User(
            username="tenant-operator",
            pseudonym="Tenant Operator",
            email="tenant-operator@example.com",
            password="hash",
            role="node_admin",
        )
        db.session.add_all([platform_admin, tenant_operator])
        db.session.commit()
        return existing_node.id


def _issue_control_headers(
    app,
    username: str,
    role: str = "platform_admin",
    *,
    scopes: list[str] | None = None,
):
    if scopes is None:
        scopes = [
            "sites:bootstrap:write",
            "sites:manifest:read",
            "sites:domains:read",
            "sites:operator-assignments:read",
            "sites:publish-readiness:read",
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


def _bootstrap_payload(**overrides):
    payload = {
        "node_name": "Mudyin North",
        "node_slug": "mudyin-north",
        "site_name": "Mudyin North Public",
        "site_key": "mudyin-north-public",
    }
    payload.update(overrides)
    return payload


def test_platform_admin_can_create_node_with_minimal_valid_payload():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(),
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 201
    payload = response.get_json()["data"]
    assert payload["node"]["slug"] == "mudyin-north"
    assert payload["site_manifest"]["site_key"] == "mudyin-north-public"
    assert payload["site_manifest"]["site_name"] == "Mudyin North Public"
    assert payload["operator_assignments"]["count"] == 0


def test_duplicate_or_conflicting_node_identity_is_rejected():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(node_slug="existing-node"),
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 409
    payload = response.get_json()
    assert payload["error"]["code"] == "identifier_conflict"
    assert payload["error"]["details"]["field"] == "node_slug"


def test_duplicate_or_conflicting_site_key_is_rejected():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(site_key="existing-node-public"),
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 409
    payload = response.get_json()
    assert payload["error"]["code"] == "identifier_conflict"
    assert payload["error"]["details"]["field"] == "site_key"


def test_duplicate_or_conflicting_canonical_domain_is_rejected():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(canonical_domains=["existing.example.com"]),
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 409
    payload = response.get_json()
    assert payload["error"]["code"] == "domain_binding_conflict"
    assert payload["error"]["details"]["conflicting_domains"] == ["existing.example.com"]


def test_optional_initial_operator_assignments_persist_correctly():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(operator_usernames=["TENANT-OPERATOR"]),
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 201
    payload = response.get_json()["data"]
    assert payload["operator_assignments"]["usernames"] == ["tenant-operator"]
    assert payload["operator_assignments"]["count"] == 1


def test_new_node_is_compatible_with_manifest_domain_assignment_and_readiness_flows():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "platform-admin")

    bootstrap_response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(
            canonical_domains=["launch.mudyin-north.example.com"],
            operator_usernames=["tenant-operator"],
        ),
        headers=headers,
        base_url="http://control.test",
    )
    assert bootstrap_response.status_code == 201
    node_id = bootstrap_response.get_json()["data"]["node"]["id"]

    manifest_response = app.test_client().get(
        f"/api/control/sites/{node_id}/manifest-authoring",
        headers=headers,
        base_url="http://control.test",
    )
    assert manifest_response.status_code == 200

    domain_response = app.test_client().get(
        f"/api/control/sites/{node_id}/domain-bindings",
        headers=headers,
        base_url="http://control.test",
    )
    assert domain_response.status_code == 200
    assert domain_response.get_json()["data"]["canonical_domains"] == ["launch.mudyin-north.example.com"]

    assignment_response = app.test_client().get(
        f"/api/control/sites/{node_id}/operator-assignments",
        headers=headers,
        base_url="http://control.test",
    )
    assert assignment_response.status_code == 200
    assert assignment_response.get_json()["data"]["assignments"]["usernames"] == ["tenant-operator"]

    readiness_response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=headers,
        base_url="http://control.test",
    )
    assert readiness_response.status_code == 200
    readiness_payload = readiness_response.get_json()["data"]
    assert readiness_payload["ready"] is True
    assert readiness_payload["blocking_issues"] == []

    public_resolution_response = app.test_client().get(
        "/api/public/sites/resolve?host=launch.mudyin-north.example.com",
    )
    assert public_resolution_response.status_code == 200
    resolution_payload = public_resolution_response.get_json()["data"]
    assert resolution_payload["resolved"] is True
    assert resolution_payload["node_id"] == node_id
    assert "launch.mudyin-north.example.com" in (resolution_payload.get("site_manifest") or {}).get(
        "canonical_domains",
        [],
    )


def test_non_platform_operators_cannot_access_bootstrap_flow():
    app = _build_app()
    _seed_fixture(app)
    headers = _issue_control_headers(app, "tenant-operator", role="node_admin")

    response = app.test_client().post(
        "/api/control/sites/bootstrap",
        json=_bootstrap_payload(),
        headers=headers,
        base_url="http://control.test",
    )

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "platform_admin_required"
