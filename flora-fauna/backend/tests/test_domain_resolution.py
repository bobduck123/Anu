import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-domain-resolution-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-domain-resolution-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def test_domain_resolution_returns_node_scoped_payload_for_each_custom_domain():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node_a = Node(name="Tenant A", slug="anu-tenant-a", status="active", is_default=True)
        node_b = Node(name="Tenant B", slug="anu-tenant-b", status="active")
        db.session.add_all([node_a, node_b])
        db.session.flush()

        db.session.add(NodeDomain(node_id=node_a.id, domain="a.domain.example", status="active", tls_ready=True))
        db.session.add(NodeDomain(node_id=node_b.id, domain="b.domain.example", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node_a.id,
                config_json={"public_site_manifest": {"site_key": "tenant-a-site", "site_name": "Tenant A Site"}},
            )
        )
        db.session.add(
            NodeConfig(
                node_id=node_b.id,
                config_json={"public_site_manifest": {"site_key": "tenant-b-site", "site_name": "Tenant B Site"}},
            )
        )
        db.session.commit()

    client = app.test_client()
    payload_a = client.get("/api/domains/resolve?domain=a.domain.example").get_json()
    payload_b = client.get("/api/domains/resolve?domain=b.domain.example").get_json()

    assert payload_a["node_slug"] == "anu-tenant-a"
    assert payload_b["node_slug"] == "anu-tenant-b"
    assert payload_a["site_manifest"]["site_key"] == "tenant-a-site"
    assert payload_b["site_manifest"]["site_key"] == "tenant-b-site"
    assert payload_a["site_manifest"]["tenant_id"] != payload_b["site_manifest"]["tenant_id"]


def test_domain_resolution_supports_wildcard_subdomain_without_cross_tenant_leakage():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node = Node(name="Wildcard Tenant", slug="anu-wildcard", status="active", is_default=True)
        db.session.add(node)
        db.session.flush()

        db.session.add(NodeDomain(node_id=node.id, domain="*.tenant.example", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={"public_site_manifest": {"site_key": "wildcard-site"}},
            )
        )
        db.session.commit()

    client = app.test_client()
    payload = client.get("/api/domains/resolve?domain=sub.tenant.example").get_json()
    assert payload["node_slug"] == "anu-wildcard"
    assert payload["site_manifest"]["site_key"] == "wildcard-site"
    assert payload["site_resolution"]["host"] == "sub.tenant.example"


def test_domain_resolution_returns_not_found_for_unknown_or_inactive_nodes():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeDomain

    with app.app_context():
        node = Node(name="Inactive Tenant", slug="anu-inactive", status="inactive", is_default=True)
        db.session.add(node)
        db.session.flush()
        db.session.add(NodeDomain(node_id=node.id, domain="inactive.domain.example", status="active", tls_ready=True))
        db.session.commit()

    client = app.test_client()

    missing = client.get("/api/domains/resolve?domain=missing.domain.example")
    assert missing.status_code == 404

    inactive = client.get("/api/domains/resolve?domain=inactive.domain.example")
    assert inactive.status_code == 404


def test_domain_resolution_supports_registered_mudyin_vercel_alias_without_custom_domain_row():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    with app.app_context():
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add(node)
        db.session.commit()

    response = app.test_client().get("/api/domains/resolve?domain=mudyin-live.vercel.app")
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["node_slug"] == "mudyin"
    assert payload["white_label"] is True
    assert payload["site_resolution"]["resolution_status"] == "resolved_deployment_alias"
    assert payload["tls_ready"] is True
    assert payload["site_manifest"]["site_key"] == "mudyin-public"


def test_domain_resolution_returns_registry_only_payload_for_known_site_before_node_bootstrap():
    app = _build_app()

    response = app.test_client().get("/api/domains/resolve?domain=www.mudyin.com")
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["node_id"] == 0
    assert payload["node_slug"] == "mudyin"
    assert payload["site_resolution"]["resolution_status"] == "resolved_registered_domain"
    assert payload["site_manifest"]["site_key"] == "mudyin-public"


def test_domain_resolution_supports_current_mudyin_vercel_alias():
    app = _build_app()

    response = app.test_client().get("/api/domains/resolve?domain=mudyin.vercel.app")
    assert response.status_code == 200
    assert response.get_json()["node_slug"] == "mudyin"
