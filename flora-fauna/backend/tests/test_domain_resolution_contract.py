import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-domain-contract-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-domain-contract-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )
    return app


def test_domain_resolution_returns_stable_public_contract_from_legacy_string_config():
    app = _build_app()
    client = app.test_client()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeDomain, NodeConfig

    with app.app_context():
        node = Node(name="Sydney Node", slug="tenant-contract-sydney", status="active")
        db.session.add(node)
        db.session.flush()
        db.session.add(NodeDomain(node_id=node.id, domain="impact.example.com", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json='{"semantic_key":"sydney-alpha","white_label":{"enabled":true},"branding":{"primary_color":"#112233","accent_color":"#445566","logo_url":"https://cdn.example/logo.svg"}}',
            )
        )
        db.session.commit()

    response = client.get("/api/domains/resolve?domain=impact.example.com")

    assert response.status_code == 200
    payload = response.get_json()

    assert payload["contract_version"] == "2026-04-10"
    assert payload["node_id"] > 0
    assert payload["node_slug"] == "tenant-contract-sydney"
    assert payload["node_name"] == "Sydney Node"
    assert payload["semantic_key"] == "sydney-alpha"
    assert payload["white_label"] is True
    assert payload["brand"]["primary_color"] == "#112233"
    assert payload["brand"]["accent_color"] == "#445566"
    assert payload["brand"]["logo_url"] == "https://cdn.example/logo.svg"

    # Backward-compatible aliases remain for existing clients.
    assert payload["is_white_label"] is True
    assert payload["brand_config"]["primary_color"] == "#112233"


def test_domain_resolution_not_found_behavior_is_preserved():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/domains/resolve?domain=missing.example.com")
    assert response.status_code == 404
