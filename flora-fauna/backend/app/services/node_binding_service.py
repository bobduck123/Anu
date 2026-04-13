from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from ..extensions import db
from ..models import Node, NodeServiceBinding


class NodeServiceBindingError(ValueError):
    def __init__(self, message: str, *, code: str):
        super().__init__(message)
        self.code = code


class NodeServiceBindingNotFoundError(NodeServiceBindingError):
    pass


class NodeServiceBindingMismatchError(NodeServiceBindingError):
    pass


@dataclass(frozen=True)
class NodeBindingResolution:
    node: Node
    binding: NodeServiceBinding


def _resolve_node(node_id_or_slug) -> Node:
    if isinstance(node_id_or_slug, int):
        node = db.session.get(Node, node_id_or_slug)
    elif isinstance(node_id_or_slug, str) and node_id_or_slug.isdigit():
        node = db.session.get(Node, int(node_id_or_slug))
    else:
        node = Node.query.filter_by(slug=node_id_or_slug).first()

    if not node:
        raise NodeServiceBindingNotFoundError(
            "Node not found for binding operation.",
            code="NODE_NOT_FOUND",
        )
    return node


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def bind_node_to_service(
    node_id_or_slug,
    *,
    service_name: str,
    service_tenant_id: str,
    service_tenant_slug: Optional[str] = None,
    status: str = "active",
) -> NodeServiceBinding:
    node = _resolve_node(node_id_or_slug)
    canonical_node_slug = str(node.slug or "").strip()
    normalized_service_name = str(service_name or "").strip().lower()
    normalized_tenant_id = str(service_tenant_id or "").strip()
    normalized_tenant_slug = str(service_tenant_slug or "").strip() or None

    if not canonical_node_slug:
        raise NodeServiceBindingMismatchError(
            "Node slug is required for cross-service binding.",
            code="NODE_SLUG_REQUIRED",
        )
    if not normalized_service_name:
        raise NodeServiceBindingMismatchError(
            "Service name is required for cross-service binding.",
            code="SERVICE_NAME_REQUIRED",
        )
    if not normalized_tenant_id:
        raise NodeServiceBindingMismatchError(
            "Service tenant id is required for cross-service binding.",
            code="SERVICE_TENANT_ID_REQUIRED",
        )

    existing_for_service_tenant = NodeServiceBinding.query.filter_by(
        service_name=normalized_service_name,
        service_tenant_id=normalized_tenant_id,
    ).first()
    if existing_for_service_tenant and existing_for_service_tenant.node_id != node.id:
        raise NodeServiceBindingMismatchError(
            "Service tenant is already bound to another backend node.",
            code="SERVICE_TENANT_ALREADY_BOUND",
        )

    existing_for_node = NodeServiceBinding.query.filter_by(
        node_id=node.id,
        service_name=normalized_service_name,
    ).first()
    if existing_for_node and existing_for_node.service_tenant_id != normalized_tenant_id:
        raise NodeServiceBindingMismatchError(
            "Backend node is already bound to a different service tenant.",
            code="NODE_ALREADY_BOUND_TO_DIFFERENT_TENANT",
        )

    if existing_for_node:
        existing_for_node.node_slug = canonical_node_slug
        existing_for_node.service_tenant_slug = normalized_tenant_slug
        existing_for_node.status = status
        existing_for_node.last_verified_at = _utcnow_naive()
        db.session.add(existing_for_node)
        db.session.commit()
        return existing_for_node

    binding = NodeServiceBinding(
        node_id=node.id,
        node_slug=canonical_node_slug,
        service_name=normalized_service_name,
        service_tenant_id=normalized_tenant_id,
        service_tenant_slug=normalized_tenant_slug,
        status=status,
        last_verified_at=_utcnow_naive(),
    )
    db.session.add(binding)
    db.session.commit()
    return binding


def resolve_binding_for_node(
    node_id_or_slug,
    *,
    service_name: str,
    require_active: bool = True,
) -> NodeServiceBinding:
    node = _resolve_node(node_id_or_slug)
    canonical_node_slug = str(node.slug or "").strip()
    normalized_service_name = str(service_name or "").strip().lower()

    binding = NodeServiceBinding.query.filter_by(
        node_slug=canonical_node_slug,
        service_name=normalized_service_name,
    ).first()
    if not binding:
        raise NodeServiceBindingNotFoundError(
            "Node service binding was not found.",
            code="BINDING_NOT_FOUND",
        )

    if require_active and binding.status != "active":
        raise NodeServiceBindingMismatchError(
            "Node service binding is not active.",
            code="BINDING_INACTIVE",
        )

    return binding


def resolve_node_for_service_tenant(
    *,
    service_name: str,
    service_tenant_id: Optional[str] = None,
    service_tenant_slug: Optional[str] = None,
    require_active: bool = True,
) -> NodeBindingResolution:
    normalized_service_name = str(service_name or "").strip().lower()
    normalized_tenant_id = str(service_tenant_id or "").strip() or None
    normalized_tenant_slug = str(service_tenant_slug or "").strip() or None

    if not normalized_tenant_id and not normalized_tenant_slug:
        raise NodeServiceBindingMismatchError(
            "Either service_tenant_id or service_tenant_slug is required.",
            code="SERVICE_TENANT_REFERENCE_REQUIRED",
        )

    query = NodeServiceBinding.query.filter_by(service_name=normalized_service_name)
    if normalized_tenant_id:
        query = query.filter_by(service_tenant_id=normalized_tenant_id)
    else:
        query = query.filter_by(service_tenant_slug=normalized_tenant_slug)
    binding = query.first()

    if not binding:
        raise NodeServiceBindingNotFoundError(
            "Service tenant binding was not found.",
            code="SERVICE_TENANT_BINDING_NOT_FOUND",
        )

    if require_active and binding.status != "active":
        raise NodeServiceBindingMismatchError(
            "Service tenant binding is not active.",
            code="BINDING_INACTIVE",
        )

    node = db.session.get(Node, binding.node_id)
    if not node:
        raise NodeServiceBindingNotFoundError(
            "Bound backend node is missing.",
            code="BOUND_NODE_NOT_FOUND",
        )
    if node.slug != binding.node_slug:
        raise NodeServiceBindingMismatchError(
            "Bound backend node slug does not match canonical binding.",
            code="BOUND_NODE_SLUG_MISMATCH",
        )

    return NodeBindingResolution(node=node, binding=binding)


def verify_node_service_binding(
    *,
    node_slug: str,
    service_name: str,
    service_tenant_id: str,
    service_tenant_slug: Optional[str] = None,
) -> NodeServiceBinding:
    binding = resolve_binding_for_node(node_slug, service_name=service_name, require_active=True)
    expected_tenant_id = str(service_tenant_id or "").strip()
    expected_tenant_slug = str(service_tenant_slug or "").strip() or None

    if binding.service_tenant_id != expected_tenant_id:
        raise NodeServiceBindingMismatchError(
            "Service tenant id does not match the canonical backend node binding.",
            code="BINDING_TENANT_ID_MISMATCH",
        )

    if expected_tenant_slug and binding.service_tenant_slug != expected_tenant_slug:
        raise NodeServiceBindingMismatchError(
            "Service tenant slug does not match the canonical backend node binding.",
            code="BINDING_TENANT_SLUG_MISMATCH",
        )

    binding.last_verified_at = _utcnow_naive()
    db.session.add(binding)
    db.session.commit()
    return binding
