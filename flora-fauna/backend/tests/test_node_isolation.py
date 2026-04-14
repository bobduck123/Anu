import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-node-isolation-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-node-isolation-1234"

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


def test_public_site_resolution_isolated_by_host_binding():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node_a = Node(name="Node A", slug="anu-node-a", status="active", is_default=True)
        node_b = Node(name="Node B", slug="anu-node-b", status="active")
        db.session.add_all([node_a, node_b])
        db.session.flush()

        db.session.add(NodeDomain(node_id=node_a.id, domain="a.public.example", status="active", tls_ready=True))
        db.session.add(NodeDomain(node_id=node_b.id, domain="b.public.example", status="active", tls_ready=True))
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
    payload_a = client.get("/api/public/sites/resolve?host=a.public.example").get_json()["data"]
    payload_b = client.get("/api/public/sites/resolve?host=b.public.example").get_json()["data"]

    assert payload_a["resolved"] is True
    assert payload_b["resolved"] is True
    assert payload_a["node_slug"] == "anu-node-a"
    assert payload_b["node_slug"] == "anu-node-b"
    assert payload_a["site_manifest"]["site_key"] == "site-a"
    assert payload_b["site_manifest"]["site_key"] == "site-b"
    assert "b.public.example" not in payload_a["site_manifest"]["canonical_domains"]
    assert "a.public.example" not in payload_b["site_manifest"]["canonical_domains"]


def test_public_connectors_payload_is_node_scoped_for_multiple_nodes():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    with app.app_context():
        default_node = Node(name="Default Node", slug="anu-default", status="active", is_default=True)
        proving_node = Node(name="Proving Node", slug="anu-proving-ground", status="active")
        db.session.add_all([default_node, proving_node])
        db.session.commit()

    client = app.test_client()
    payload_default = client.get("/public/connectors?node=anu-default").get_json()["data"]
    payload_proving = client.get("/public/connectors?node=anu-proving-ground").get_json()["data"]

    assert payload_default["node_scope"]["slug"] == "anu-default"
    assert payload_proving["node_scope"]["slug"] == "anu-proving-ground"
    assert payload_default["archive_handoff"]["slug"].startswith("anu-default--")
    assert payload_proving["archive_handoff"]["slug"].startswith("anu-proving-ground--")
    assert payload_default["archive_handoff"]["slug"] != payload_proving["archive_handoff"]["slug"]
    assert payload_default["archive_handoff"]["report_slug"] != payload_proving["archive_handoff"]["report_slug"]


def test_public_connectors_unknown_node_is_rejected_without_cross_tenant_fallback():
    app = _build_app()
    client = app.test_client()

    response = client.get("/public/connectors?node=missing-node")
    assert response.status_code == 404
    payload = response.get_json()
    assert payload["error"]["code"] == "not_found"
