import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-publish-readiness-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-publish-readiness-1234"

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


def _manifest_with_required_links():
    return {
        "site_key": "tenant-a-site",
        "site_name": "Tenant A Published",
        "tagline": "Tenant A",
        "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
        "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
    }


def _seed_node(
    app,
    *,
    with_domain: bool = True,
    tls_ready: bool = True,
    with_published_manifest: bool = True,
    missing_links: bool = False,
):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain, User

    with app.app_context():
        node = Node(name="Tenant A", slug="tenant-a", status="active")
        db.session.add(node)
        db.session.flush()

        admin = User(
            username="platform-admin",
            pseudonym="Platform Admin",
            email="platform-admin@example.com",
            password="hash",
            role="platform_admin",
        )
        operator = User(
            username="tenant-operator",
            pseudonym="Tenant Operator",
            email="tenant-operator@example.com",
            password="hash",
            role="node_admin",
            node_id=node.id,
        )
        db.session.add_all([admin, operator])
        db.session.flush()

        if with_domain:
            db.session.add(NodeDomain(node_id=node.id, domain="tenant-a.example.com", status="active", tls_ready=tls_ready))

        config_json = {}
        if with_published_manifest:
            manifest = _manifest_with_required_links()
            if missing_links:
                manifest["legal_links"] = {"privacy": "/privacy"}
                manifest["trust_links"] = {"trust_center": "/trust"}
            config_json["public_site_manifest"] = manifest

        db.session.add(NodeConfig(node_id=node.id, config_json=config_json))
        db.session.commit()
        return node.id


def _issue_control_headers(app, username: str, role: str = "platform_admin"):
    with app.app_context():
        token = create_access_token(
            identity=f"control::{username}",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": role,
                "scp": ["sites:publish-readiness:read"],
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def test_ready_true_when_required_published_state_is_present():
    app = _build_app()
    node_id = _seed_node(app)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["ready"] is True
    assert payload["blocking_issues"] == []
    assert payload["warnings"] == []


def test_missing_domain_binding_produces_blocking_issue():
    app = _build_app()
    node_id = _seed_node(app, with_domain=False)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["ready"] is False
    assert any(issue["code"] == "missing_domain_binding" for issue in payload["blocking_issues"])


def test_missing_published_manifest_produces_blocking_issue():
    app = _build_app()
    node_id = _seed_node(app, with_published_manifest=False)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["ready"] is False
    assert any(issue["code"] == "missing_published_manifest" for issue in payload["blocking_issues"])


def test_missing_required_trust_and_legal_links_produce_blocking_issues():
    app = _build_app()
    node_id = _seed_node(app, missing_links=True)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["ready"] is False
    issue_codes = [issue["code"] for issue in payload["blocking_issues"]]
    assert "missing_legal_links" in issue_codes
    assert "missing_trust_links" in issue_codes


def test_warnings_vs_blockers_are_represented_honestly():
    app = _build_app()
    node_id = _seed_node(app, tls_ready=False)
    headers = _issue_control_headers(app, "platform-admin")

    response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=headers,
        base_url="http://control.test",
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["ready"] is True
    assert payload["blocking_issues"] == []
    assert any(warning["code"] == "domain_tls_not_ready" for warning in payload["warnings"])


def test_control_host_and_platform_admin_enforcement_remains_intact():
    app = _build_app()
    node_id = _seed_node(app)

    platform_headers = _issue_control_headers(app, "platform-admin")
    public_host_response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=platform_headers,
        base_url="http://public.test",
    )
    assert public_host_response.status_code == 403
    assert public_host_response.get_json()["error"]["code"] == "control_plane_forbidden"

    operator_headers = _issue_control_headers(app, "tenant-operator", role="node_admin")
    operator_response = app.test_client().get(
        f"/api/control/sites/{node_id}/publish-readiness",
        headers=operator_headers,
        base_url="http://control.test",
    )
    assert operator_response.status_code == 403
    assert operator_response.get_json()["error"]["code"] == "platform_admin_required"
