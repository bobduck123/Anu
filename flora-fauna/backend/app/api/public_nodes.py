"""
Public node configuration endpoints.

These routes expose a canonical, public-safe node config contract for frontend
tenant branding and module gating.
"""

import json

from flask import Blueprint, current_app, g, jsonify, request

from ..extensions import db
from ..models import Node, NodeConfig, NodeDomain
from ..schemas import PublicNodeConfigResponseSchema
from ..services.node_service import resolve_node_from_request
from ..services.public_site_service import build_public_site_manifest_for_node, resolve_public_site_for_host, resolve_public_site_for_site_hint
from ..services.white_label_site_registry import get_white_label_site_by_slug, normalize_hostname
from .utils import error

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


def _build_public_node_config(
    node,
    config_json: dict,
    domain_record=None,
    site_resolution=None,
    site_manifest_override=None,
):
    payload = {
        "contract_version": PUBLIC_NODE_CONFIG_CONTRACT_VERSION,
        "node_id": node.id,
        "node_slug": node.slug,
        "node_name": node.name,
        "semantic_key": _normalized_semantic_key(config_json),
        "white_label": bool((config_json.get("white_label") or {}).get("enabled", False))
        or bool(get_white_label_site_by_slug(node.slug)),
        "brand": _normalized_brand(config_json),
        "modules": _normalized_modules(config_json),
        "status": node.status,
        "is_default": bool(getattr(node, "is_default", False)),
        "domain": domain_record.domain if domain_record else None,
        "tls_ready": bool(domain_record.tls_ready) if domain_record else None,
        "site_manifest": site_manifest_override
        or build_public_site_manifest_for_node(
            node=node,
            config_json=config_json,
            resolved_host=domain_record.domain if domain_record else None,
        ),
        "site_resolution": site_resolution,
    }
    return public_node_config_schema.dump(payload)


def _build_registry_only_public_node_config(site_resolution: dict):
    manifest = site_resolution.get("site_manifest") if isinstance(site_resolution, dict) else {}
    enabled_modules = manifest.get("enabled_public_modules") if isinstance(manifest, dict) else []
    modules = {str(module): True for module in enabled_modules if str(module).strip()}
    theme_tokens = manifest.get("theme_tokens") if isinstance(manifest, dict) else {}
    brand_assets = manifest.get("brand_assets") if isinstance(manifest, dict) else {}
    return public_node_config_schema.dump(
        {
            "contract_version": PUBLIC_NODE_CONFIG_CONTRACT_VERSION,
            "node_id": 0,
            "node_slug": site_resolution.get("node_slug"),
            "node_name": site_resolution.get("node_name"),
            "semantic_key": None,
            "white_label": True,
            "brand": {
                "primary_color": theme_tokens.get("primary_color") if isinstance(theme_tokens, dict) else None,
                "secondary_color": theme_tokens.get("secondary_color") if isinstance(theme_tokens, dict) else None,
                "accent_color": theme_tokens.get("accent_color") if isinstance(theme_tokens, dict) else None,
                "logo_url": brand_assets.get("logo_url") if isinstance(brand_assets, dict) else None,
                "favicon_url": brand_assets.get("favicon_url") if isinstance(brand_assets, dict) else None,
                "custom_css": theme_tokens.get("custom_css") if isinstance(theme_tokens, dict) else None,
            },
            "modules": modules,
            "status": "registry_only",
            "is_default": False,
            "domain": site_resolution.get("host"),
            "tls_ready": None,
            "site_manifest": manifest,
            "site_resolution": {
                "resolved": bool(site_resolution.get("resolved")),
                "resolution_status": site_resolution.get("resolution_status"),
                "fallback_note": site_resolution.get("fallback_note"),
                "host": site_resolution.get("host"),
            },
        }
    )


def _resolve_current_node():
    node = getattr(g, "node", None)
    if node is not None:
        return node
    return resolve_node_from_request(request)


def _site_hint_from_request() -> str | None:
    for key in ("site", "site_slug", "slug", "site_id", "app_id"):
        value = request.args.get(key)
        if value and str(value).strip():
            return str(value)
    for key in ("X-ANU-Site", "X-ANU-Site-Slug", "X-ANU-App-ID"):
        value = request.headers.get(key)
        if value and str(value).strip():
            return str(value)
    return None


def _active_node_or_404(node):
    if not node or str(getattr(node, "status", "")).lower() != "active":
        return None, (jsonify({"error": "Node not found"}), 404)
    return node, None


@public_nodes_bp.route("/current/config", methods=["GET"])
def get_current_node_config():
    try:
        host = normalize_hostname(request.args.get("host") or request.headers.get("Origin") or request.headers.get("X-Forwarded-Host") or request.host or "")
        site_hint = _site_hint_from_request()
        resolved_public_site = (
            resolve_public_site_for_site_hint(site_hint, host=host)
            if site_hint
            else resolve_public_site_for_host(host)
        )
        if resolved_public_site is None:
            return error("not_found", "White-label site hint is not configured", 404)
        if int(resolved_public_site.get("node_id") or 0) <= 0:
            return jsonify(_build_registry_only_public_node_config(resolved_public_site))

        node = Node.query.get(resolved_public_site["node_id"]) if resolved_public_site else _resolve_current_node()
        node, not_found = _active_node_or_404(node)
        if not_found:
            return not_found

        cfg = NodeConfig.query.filter_by(node_id=node.id).first()
        config_json = _coerce_node_config_json(cfg.config_json if cfg else {})

        host_record = _find_active_domain_record(host) if host else None
        if host_record and host_record.node_id != node.id:
            host_record = None

        domain_record = host_record or _primary_active_domain_for_node(node.id)
        site_resolution = {
            "resolved": bool(resolved_public_site["resolved"]),
            "resolution_status": resolved_public_site["resolution_status"],
            "fallback_note": resolved_public_site["fallback_note"],
            "host": host or None,
        }
        return jsonify(
            _build_public_node_config(
                node,
                config_json,
                domain_record,
                site_resolution,
                site_manifest_override=resolved_public_site["site_manifest"],
            )
        )
    except Exception:
        current_app.logger.exception("Public current node config failed")
        db.session.rollback()
        return error("service_unavailable", "Public node config temporarily unavailable", 503)


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
