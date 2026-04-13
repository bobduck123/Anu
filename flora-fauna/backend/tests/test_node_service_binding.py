import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-node-service-binding-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-node-service-binding-1234"

from backend_factory import load_create_app  # noqa: E402


load_create_app()

from manara_backend_app.extensions import db  # noqa: E402
from manara_backend_app.models import Node  # noqa: E402
from manara_backend_app.services.node_binding_service import (  # noqa: E402
    NodeServiceBindingMismatchError,
    NodeServiceBindingNotFoundError,
    bind_node_to_service,
    resolve_binding_for_node,
    resolve_node_for_service_tenant,
    verify_node_service_binding,
)


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def _create_node(slug: str, name: str) -> Node:
    node = Node(slug=slug, name=name, status="active")
    db.session.add(node)
    db.session.commit()
    return node


def test_node_service_binding_creation_and_roundtrip_resolution():
    app = _build_app()
    with app.app_context():
        node = _create_node("anu-svc-sydney", "Sydney Node")
        binding = bind_node_to_service(
            node.id,
            service_name="impact",
            service_tenant_id="11111111-1111-4111-8111-111111111111",
            service_tenant_slug="falak-sydney",
        )

        resolved_binding = resolve_binding_for_node("anu-svc-sydney", service_name="impact")
        resolved = resolve_node_for_service_tenant(
            service_name="impact",
            service_tenant_id="11111111-1111-4111-8111-111111111111",
        )

        assert binding.node_slug == "anu-svc-sydney"
        assert resolved_binding.service_tenant_slug == "falak-sydney"
        assert resolved.node.id == node.id
        assert resolved.binding.service_tenant_id == "11111111-1111-4111-8111-111111111111"


def test_node_service_binding_rejects_mismatch_and_missing_bindings():
    app = _build_app()
    with app.app_context():
        first_node = _create_node("anu-svc-sydney", "Sydney Node")
        second_node = _create_node("anu-svc-melbourne", "Melbourne Node")
        bind_node_to_service(
            first_node.id,
            service_name="impact",
            service_tenant_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            service_tenant_slug="falak-sydney",
        )

        try:
            bind_node_to_service(
                second_node.id,
                service_name="impact",
                service_tenant_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                service_tenant_slug="falak-melbourne",
            )
            raise AssertionError("Expected service tenant mismatch to be rejected.")
        except NodeServiceBindingMismatchError as exc:
            assert exc.code == "SERVICE_TENANT_ALREADY_BOUND"

        try:
            verify_node_service_binding(
                node_slug="anu-svc-sydney",
                service_name="impact",
                service_tenant_id="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            )
            raise AssertionError("Expected tenant id mismatch to be rejected.")
        except NodeServiceBindingMismatchError as exc:
            assert exc.code == "BINDING_TENANT_ID_MISMATCH"

        try:
            resolve_binding_for_node("missing-node", service_name="impact")
            raise AssertionError("Expected missing node lookup to fail.")
        except NodeServiceBindingNotFoundError as exc:
            assert exc.code == "NODE_NOT_FOUND"


def test_node_scoped_binding_resolution_is_service_specific():
    app = _build_app()
    with app.app_context():
        _create_node("anu-svc-sydney", "Sydney Node")
        bind_node_to_service(
            "anu-svc-sydney",
            service_name="impact",
            service_tenant_id="11111111-1111-4111-8111-111111111111",
            service_tenant_slug="falak-sydney",
        )
        bind_node_to_service(
            "anu-svc-sydney",
            service_name="search",
            service_tenant_id="search-tenant-sydney",
            service_tenant_slug="search-sydney",
        )

        impact_binding = resolve_binding_for_node("anu-svc-sydney", service_name="impact")
        search_binding = resolve_binding_for_node("anu-svc-sydney", service_name="search")

        assert impact_binding.service_tenant_id == "11111111-1111-4111-8111-111111111111"
        assert search_binding.service_tenant_id == "search-tenant-sydney"


def test_cross_tenant_binding_resolution_does_not_leak_between_nodes():
    app = _build_app()
    with app.app_context():
        sydney = _create_node("anu-svc-sydney", "Sydney Node")
        melbourne = _create_node("anu-svc-melbourne", "Melbourne Node")
        bind_node_to_service(
            sydney.id,
            service_name="impact",
            service_tenant_id="11111111-1111-4111-8111-111111111111",
            service_tenant_slug="falak-sydney",
        )
        bind_node_to_service(
            melbourne.id,
            service_name="impact",
            service_tenant_id="22222222-2222-4222-8222-222222222222",
            service_tenant_slug="falak-melbourne",
        )

        sydney_resolution = resolve_node_for_service_tenant(
            service_name="impact",
            service_tenant_id="11111111-1111-4111-8111-111111111111",
        )
        melbourne_resolution = resolve_node_for_service_tenant(
            service_name="impact",
            service_tenant_id="22222222-2222-4222-8222-222222222222",
        )

        assert sydney_resolution.node.slug == "anu-svc-sydney"
        assert melbourne_resolution.node.slug == "anu-svc-melbourne"
