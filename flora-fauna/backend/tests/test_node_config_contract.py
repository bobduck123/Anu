import os
from types import SimpleNamespace

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-node-config-contract-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-node-config-contract-1234"

from backend_factory import load_create_app  # noqa: E402


# Registers the dynamic package alias used by backend modules in tests.
load_create_app()

from manara_backend_app.api import admin_tenants as admin_tenants_module  # noqa: E402
from manara_backend_app.api import domain_resolution as domain_resolution_module  # noqa: E402
from manara_backend_app.api import public_nodes as public_nodes_module  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def test_admin_tenants_coerce_config_json_accepts_dict():
    payload = {"branding": {"primary_color": "#000"}}
    assert admin_tenants_module._coerce_node_config_json(payload) == payload


def test_admin_tenants_coerce_config_json_parses_legacy_string():
    payload = '{"modules":{"impact":true},"branding":{"primary_color":"#123"}}'
    assert admin_tenants_module._coerce_node_config_json(payload) == {
        "modules": {"impact": True},
        "branding": {"primary_color": "#123"},
    }


def test_admin_tenants_get_payload_defaults_to_empty_dict_for_invalid_values():
    cfg = SimpleNamespace(config_json="not-json")
    assert admin_tenants_module._get_node_config_payload(cfg) == {}
    assert admin_tenants_module._get_node_config_payload(None) == {}


def test_domain_resolution_coerce_config_json_handles_legacy_string_and_non_object():
    assert domain_resolution_module._coerce_node_config_json('{"white_label":{"enabled":true}}') == {
        "white_label": {"enabled": True}
    }
    assert domain_resolution_module._coerce_node_config_json('["unexpected-list"]') == {}


def test_public_nodes_coerce_config_json_handles_legacy_string_and_invalid_data():
    assert public_nodes_module._coerce_node_config_json('{"modules":{"impact":true}}') == {
        "modules": {"impact": True}
    }
    assert public_nodes_module._coerce_node_config_json('["unexpected-list"]') == {}
    assert public_nodes_module._coerce_node_config_json(None) == {}


def test_public_node_config_current_resolves_from_request_context():
    app = _build_app()
    client = app.test_client()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain

    with app.app_context():
        node = Node(name="Sydney Public Node", slug="sydney-public", status="active")
        db.session.add(node)
        db.session.flush()
        db.session.add(NodeDomain(node_id=node.id, domain="config.current.example", status="active", tls_ready=True))
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={
                    "semantic_key": "sydney-alpha",
                    "white_label": {"enabled": True},
                    "branding": {
                        "primary_color": "#112233",
                        "secondary_color": "#222222",
                        "accent_color": "#445566",
                        "logo_url": "https://cdn.example/logo.svg",
                    },
                    "modules": {"impact": True, "community": True},
                    "public_site_manifest": {
                        "site_key": "sydney-public",
                        "site_name": "Sydney Public Commons",
                        "tagline": "Sydney public surfaces on ANU rails.",
                        "nav_items": [
                            {"label": "Community", "href": "/community"},
                            {"label": "Control Leak Attempt", "href": "/control/tenants"},
                        ],
                    },
                    "admin_secret": {"token": "must-not-leak"},
                },
            )
        )
        db.session.commit()

    response = client.get(
        "/api/public/nodes/current/config",
        headers={"X-Forwarded-Host": "config.current.example"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["contract_version"] == "2026-04-10"
    assert payload["node_slug"] == "sydney-public"
    assert payload["semantic_key"] == "sydney-alpha"
    assert payload["white_label"] is True
    assert payload["brand"]["primary_color"] == "#112233"
    assert payload["modules"]["impact"] is True
    assert payload["domain"] == "config.current.example"
    assert payload["tls_ready"] is True
    assert payload["site_manifest"]["site_key"] == "sydney-public"
    assert payload["site_manifest"]["site_name"] == "Sydney Public Commons"
    assert all(item["href"] != "/control/tenants" for item in payload["site_manifest"]["nav_items"])
    assert isinstance(payload["modules"], dict)
    assert "admin_secret" not in payload
    assert "brand_config" not in payload
    assert "is_white_label" not in payload


def test_public_node_config_slug_resolution_filters_private_fields_and_preserves_object_shape():
    app = _build_app()
    client = app.test_client()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig

    with app.app_context():
        node = Node(name="Melbourne Public Node", slug="melbourne-public", status="active")
        db.session.add(node)
        db.session.flush()
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={
                    "semantic_key": "melbourne-beta",
                    "white_label": {"enabled": False, "internal_mode": True},
                    "branding": {"primary_color": "#101010"},
                    "modules": {"impact": True},
                    "private_keys": {"danger": "nope"},
                    "data_policy": 123,
                },
            )
        )
        db.session.commit()

    response = client.get("/api/public/nodes/melbourne-public/config")
    assert response.status_code == 200
    payload = response.get_json()

    assert payload["node_name"] == "Melbourne Public Node"
    assert payload["white_label"] is False
    assert payload["brand"]["primary_color"] == "#101010"
    assert payload["modules"] == {"impact": True}
    assert isinstance(payload["modules"], dict)
    assert "private_keys" not in payload
    assert "data_policy" not in payload


def test_public_node_config_slug_resolution_coerces_legacy_string_config():
    app = _build_app()
    client = app.test_client()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig

    with app.app_context():
        node = Node(name="Legacy Config Node", slug="legacy-config-node", status="active")
        db.session.add(node)
        db.session.flush()
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json='{"semantic_key":"legacy-alpha","white_label":{"enabled":true},"branding":{"primary_color":"#0A0B0C"},"modules":{"education":true}}',
            )
        )
        db.session.commit()

    response = client.get("/api/public/nodes/legacy-config-node/config")
    assert response.status_code == 200
    payload = response.get_json()

    assert payload["semantic_key"] == "legacy-alpha"
    assert payload["white_label"] is True
    assert payload["brand"]["primary_color"] == "#0A0B0C"
    assert payload["modules"]["education"] is True
    assert payload["site_manifest"]["tenant_id"] == payload["node_id"]
    assert payload["site_manifest"]["site_key"] == "legacy-config-node"


def test_public_node_config_slug_resolution_not_found_for_unknown_slug():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/public/nodes/unknown-node/config")
    assert response.status_code == 404


def test_public_node_current_config_supports_explicit_site_hint_for_external_frontends():
    app = _build_app()
    client = app.test_client()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    with app.app_context():
        node = Node(name="Mudyin", slug="mudyin", status="active")
        db.session.add(node)
        db.session.commit()

    response = client.get(
        "/api/public/nodes/current/config?site=mudyin",
        headers={"Origin": "https://mudyin.vercel.app"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["node_slug"] == "mudyin"
    assert payload["site_resolution"]["resolution_status"] == "resolved_site_hint"
    assert payload["site_manifest"]["site_key"] == "mudyin-public"


def test_public_node_current_config_registry_only_hint_is_stable_before_bootstrap():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/public/nodes/current/config?site=mudyin")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["node_id"] == 0
    assert payload["node_slug"] == "mudyin"
    assert payload["status"] == "registry_only"
    assert payload["site_manifest"]["site_key"] == "mudyin-public"


def test_public_node_current_config_unknown_site_hint_returns_structured_404():
    app = _build_app()
    client = app.test_client()

    response = client.get("/api/public/nodes/current/config?site=unknown-site")

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
