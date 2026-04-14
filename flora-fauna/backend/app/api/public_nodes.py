"""
Public node configuration endpoints.

These routes expose a canonical, public-safe node config contract for frontend
tenant branding and module gating.
"""

import json

from flask import Blueprint, g, jsonify, request

from ..models import Node, NodeConfig, NodeDomain
from ..schemas import PublicNodeConfigResponseSchema
from ..services.node_service import resolve_node_from_request
from ..services.public_site_service import build_public_site_manifest_for_node

public_nodes_bp = Blueprint("public_nodes", __name__, url_prefix="/api/public/nodes")

PUBLIC_NODE_CONFIG_CONTRACT_VERSION = "2026-04-10"
public_node_config_schema = PublicNodeConfigResponseSchema()


def _coerce_node_config_json(raw):
    """
    ANU-001 compatibility: normalize legacy string-backed config_json rows.
    """
    if isinstance(raw, dict):
        return raw
    if raw is None:
        return {}
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except (TypeError, ValueError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _find_active_domain_record(domain: str):
    if not domain:
        return None

    node_domain = NodeDomain.query.filter(
        NodeDomain.domain == domain,
        NodeDomain.status == "active",
    ).first()
    if node_domain:
        return node_domain

    parts = domain.split(".")
    if len(parts) > 2:
        parent_domain = ".".join(parts[-2:])
        return NodeDomain.query.filter(
            NodeDomain.domain == f"*.{parent_domain}",
            NodeDomain.status == "active",
        ).first()
    return None


def _primary_active_domain_for_node(node_id: int):
    return (
        NodeDomain.query.filter(
            NodeDomain.node_id == node_id,
            NodeDomain.status == "active",
        )
        .order_by(NodeDomain.id.asc())
        .first()
    )


def _normalized_semantic_key(config_json: dict):
    semantic_key = config_json.get("semantic_key")
    if semantic_key is None:
        return None
    return str(semantic_key).strip() or None


def _normalized_brand(config_json: dict):
    branding = config_json.get("branding", {}) or {}
    if not isinstance(branding, dict):
        branding = {}

    return {
        "primary_color": branding.get("primary_color"),
        "secondary_color": branding.get("secondary_color"),
        "accent_color": branding.get("accent_color"),
        "logo_url": branding.get("logo_url"),
        "favicon_url": branding.get("favicon_url"),
        "custom_css": branding.get("custom_css"),
    }


def _normalized_modules(config_json: dict):
    modules = config_json.get("modules", {})
    return modules if isinstance(modules, dict) else {}


def _build_public_node_config(node, config_json: dict, domain_record=None, site_resolution=None):
    payload = {
        "contract_version": PUBLIC_NODE_CONFIG_CONTRACT_VERSION,
        "node_id": node.id,
        "node_slug": node.slug,
        "node_name": node.name,
        "semantic_key": _normalized_semantic_key(config_json),
        "white_label": bool((config_json.get("white_label") or {}).get("enabled", False)),
        "brand": _normalized_brand(config_json),
        "modules": _normalized_modules(config_json),
        "status": node.status,
        "is_default": bool(getattr(node, "is_default", False)),
        "domain": domain_record.domain if domain_record else None,
        "tls_ready": bool(domain_record.tls_ready) if domain_record else None,
        "site_manifest": build_public_site_manifest_for_node(
            node=node,
            config_json=config_json,
            resolved_host=domain_record.domain if domain_record else None,
        ),
        "site_resolution": site_resolution,
    }
    return public_node_config_schema.dump(payload)


def _resolve_current_node():
    node = getattr(g, "node", None)
    if node is not None:
        return node
    return resolve_node_from_request(request)


def _active_node_or_404(node):
    if not node or str(getattr(node, "status", "")).lower() != "active":
        return None, (jsonify({"error": "Node not found"}), 404)
    return node, None


@public_nodes_bp.route("/current/config", methods=["GET"])
def get_current_node_config():
    node, not_found = _active_node_or_404(_resolve_current_node())
    if not_found:
        return not_found

    cfg = NodeConfig.query.filter_by(node_id=node.id).first()
    config_json = _coerce_node_config_json(cfg.config_json if cfg else {})

    host = (request.headers.get("X-Forwarded-Host") or request.host or "").split(":")[0].lower().strip()
    host_record = _find_active_domain_record(host) if host else None
    if host_record and host_record.node_id != node.id:
        host_record = None

    domain_record = host_record or _primary_active_domain_for_node(node.id)
    if host_record:
        resolution_status = "resolved"
        resolved = True
        fallback_note = None
    elif not host:
        resolution_status = "fallback_missing_host"
        resolved = False
        fallback_note = "Host header not available; default tenant manifest is shown."
    elif bool(getattr(node, "is_default", False)):
        resolution_status = "resolved_platform_host"
        resolved = True
        fallback_note = None
    else:
        resolution_status = "fallback_unknown_host"
        resolved = False
        fallback_note = f"Host '{host}' is not mapped to this tenant; default tenant manifest is shown."

    site_resolution = {
        "resolved": resolved,
        "resolution_status": resolution_status,
        "fallback_note": fallback_note,
        "host": host or None,
    }
    return jsonify(_build_public_node_config(node, config_json, domain_record, site_resolution))


@public_nodes_bp.route("/<string:slug>/config", methods=["GET"])
def get_node_config_by_slug(slug):
    node = Node.query.filter_by(slug=slug).first()
    node, not_found = _active_node_or_404(node)
    if not_found:
        return not_found

    cfg = NodeConfig.query.filter_by(node_id=node.id).first()
    config_json = _coerce_node_config_json(cfg.config_json if cfg else {})
    domain_record = _primary_active_domain_for_node(node.id)

    site_resolution = {
        "resolved": False,
        "resolution_status": "slug_lookup",
        "fallback_note": "Node config was resolved by slug lookup, not host binding.",
        "host": None,
    }
    return jsonify(_build_public_node_config(node, config_json, domain_record, site_resolution))
