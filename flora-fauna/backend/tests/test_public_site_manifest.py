import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-site-manifest-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-site-manifest-1234"

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


def test_public_site_resolution_returns_mapped_site_manifest_for_host():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add(node)
        db.session.flush()

        db.session.add(NodeDomain(node_id=node.id, domain="mudyin.example.com", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={
                    "public_site_manifest": {
                        "site_key": "mudyin-public",
                        "site_name": "Mudyin Public Commons",
                        "tagline": "Mudyin hosted on ANU rails.",
                        "nav_items": [
                            {"label": "Trust", "href": "/trust"},
                            {"label": "Control Leak Attempt", "href": "/control/tenants"},
                        ],
                    }
                },
            )
        )
        db.session.commit()

    response = app.test_client().get("/api/public/sites/resolve?host=mudyin.example.com")
    assert response.status_code == 200

    payload = response.get_json()["data"]
    assert payload["resolved"] is True
    assert payload["resolution_status"] == "resolved"
    assert payload["node_slug"] == "mudyin"
    assert payload["site_manifest"]["site_key"] == "mudyin-public"
    assert payload["site_manifest"]["site_name"] == "Mudyin Public Commons"
    assert "mudyin.example.com" in payload["site_manifest"]["canonical_domains"]
    assert all(item["href"] != "/control/tenants" for item in payload["site_manifest"]["nav_items"])


def test_public_site_resolution_unknown_host_falls_back_honestly():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig

    with app.app_context():
        Node.query.update({Node.is_default: False})
        default_node = Node(name="ANU Platform", slug="anu-platform", status="active", is_default=True)
        db.session.add(default_node)
        db.session.flush()
        db.session.add(
            NodeConfig(
                node_id=default_node.id,
                config_json={
                    "public_site_manifest": {
                        "site_key": "anu-public",
                        "site_name": "ANU Public Platform",
                    }
                },
            )
        )
        db.session.commit()

    response = app.test_client().get("/api/public/sites/resolve?host=unknown.partner.example")
    assert response.status_code == 200

    payload = response.get_json()["data"]
    assert payload["resolved"] is False
    assert payload["resolution_status"] == "fallback_unknown_host"
    assert payload["fallback_note"] is not None
    assert payload["node_slug"] == "anu-platform"
    assert payload["site_manifest"]["site_key"] == "unassigned-public-host"
    assert payload["site_manifest"]["site_name"] == "Site not configured"


def test_public_site_resolution_uses_registered_mudyin_deployment_alias_when_node_exists():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    with app.app_context():
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add(node)
        db.session.commit()

    response = app.test_client().get("/api/public/sites/resolve?host=mudyin-live.vercel.app")
    assert response.status_code == 200

    payload = response.get_json()["data"]
    assert payload["resolved"] is True
    assert payload["resolution_status"] == "resolved_deployment_alias"
    assert payload["node_slug"] == "mudyin"
    assert payload["site_manifest"]["site_key"] == "mudyin-public"
    assert payload["site_manifest"]["site_name"] == "Mudyin"
    assert "mudyin-live.vercel.app" in payload["site_manifest"]["canonical_domains"]


def test_public_site_resolution_supports_explicit_site_hint_without_domain_hosting():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    with app.app_context():
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add(node)
        db.session.commit()

    response = app.test_client().get(
        "/api/public/sites/resolve?site=mudyin&host=external-mudyin.example"
    )
    assert response.status_code == 200

    payload = response.get_json()["data"]
    assert payload["resolved"] is True
    assert payload["resolution_status"] == "resolved_site_hint"
    assert payload["node_slug"] == "mudyin"
    assert payload["site_manifest"]["site_key"] == "mudyin-public"
    assert "external-mudyin.example" in payload["site_manifest"]["canonical_domains"]


def test_public_site_resolution_unknown_explicit_site_hint_returns_404():
    app = _build_app()

    response = app.test_client().get("/api/public/sites/resolve?site=unknown-tenant")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"


def test_public_site_resolution_can_return_registry_only_mudyin_config_before_node_bootstrap():
    app = _build_app()

    response = app.test_client().get("/api/public/sites/resolve?site=mudyin")
    assert response.status_code == 200

    payload = response.get_json()["data"]
    assert payload["resolved"] is True
    assert payload["resolution_status"] == "resolved_registry_only"
    assert payload["node_id"] == 0
    assert payload["node_slug"] == "mudyin"
    assert payload["fallback_note"]
    assert payload["site_manifest"]["site_key"] == "mudyin-public"
    assert payload["site_manifest"]["feature_flags"]["enquiries"] is True
    assert payload["site_manifest"]["feature_flags"]["booking_requests"] is True
    assert payload["site_manifest"]["feature_flags"]["live_bookings"] is False
    assert payload["site_manifest"]["feature_flags"]["donations"] is False


def test_public_site_resolution_supports_real_mudyin_domains_without_domain_hosting():
    app = _build_app()
    client = app.test_client()

    for host in ("mudyin.com", "www.mudyin.com"):
        response = client.get(f"/api/public/sites/resolve?host={host}")
        assert response.status_code == 200
        payload = response.get_json()["data"]
        assert payload["resolved"] is True
        assert payload["resolution_status"] == "resolved_registry_only"
        assert payload["node_slug"] == "mudyin"
        assert host in payload["site_manifest"]["canonical_domains"]
        assert payload["site_manifest"]["contact"]["public_contact_url"] == "/contact"
        assert all(not item["href"].startswith("/control") for item in payload["site_manifest"]["nav_items"])


def test_public_site_resolution_is_tenant_isolated_by_host_binding():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node_a = Node(name="Tenant A", slug="tenant-a", status="active")
        node_b = Node(name="Tenant B", slug="tenant-b", status="active")
        db.session.add_all([node_a, node_b])
        db.session.flush()

        db.session.add(NodeDomain(node_id=node_a.id, domain="a.example.com", status="active", tls_ready=True))
        db.session.add(NodeDomain(node_id=node_b.id, domain="b.example.com", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node_a.id,
                config_json={"public_site_manifest": {"site_key": "site-a", "site_name": "Site A"}},
            )
        )
        db.session.add(
            NodeConfig(
                node_id=node_b.id,
                config_json={"public_site_manifest": {"site_key": "site-b", "site_name": "Site B"}},
            )
        )
        db.session.commit()

    client = app.test_client()
    payload_a = client.get("/api/public/sites/resolve?host=a.example.com").get_json()["data"]
    payload_b = client.get("/api/public/sites/resolve?host=b.example.com").get_json()["data"]

    assert payload_a["resolved"] is True
    assert payload_b["resolved"] is True
    assert payload_a["node_slug"] == "tenant-a"
    assert payload_b["node_slug"] == "tenant-b"
    assert payload_a["site_manifest"]["site_key"] == "site-a"
    assert payload_b["site_manifest"]["site_key"] == "site-b"


def test_public_site_current_manifest_route_uses_forwarded_host():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add(node)
        db.session.flush()
        db.session.add(NodeDomain(node_id=node.id, domain="mudyin.current.example", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={"public_site_manifest": {"site_key": "mudyin-current", "site_name": "Mudyin Current"}},
            )
        )
        db.session.commit()

    response = app.test_client().get(
        "/api/public/sites/current/manifest",
        headers={"X-Forwarded-Host": "mudyin.current.example"},
    )
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["resolved"] is True
    assert payload["site_manifest"]["site_key"] == "mudyin-current"
