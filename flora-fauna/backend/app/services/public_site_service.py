from __future__ import annotations

import json
from typing import Any

from ..models import Node, NodeConfig, NodeDomain
from .node_service import get_default_node

PUBLIC_SITE_MANIFEST_CONTRACT_VERSION = "2026-04-14"
PUBLIC_SITE_RESOLUTION_CONTRACT_VERSION = "2026-04-14"

_DEFAULT_TAGLINE = "Public civic routes hosted on ANU platform rails."
_DEFAULT_PREVIEW_SUFFIX = "preview.anu.eco"

_DEFAULT_NAV_ITEMS = [
    {"label": "Community", "href": "/community", "module": "community"},
    {"label": "Impact", "href": "/impact", "module": "impact"},
    {"label": "Education", "href": "/education", "module": "education"},
    {"label": "Trust Center", "href": "/trust", "module": "trust"},
    {"label": "Transparency", "href": "/transparency", "module": "transparency"},
    {"label": "Archive", "href": "/archive", "module": "archive"},
]

_DEFAULT_FOOTER_LINKS = [
    {"label": "Trust Center", "href": "/trust"},
    {"label": "Transparency", "href": "/transparency"},
    {"label": "Archive", "href": "/archive"},
    {"label": "Privacy", "href": "/privacy"},
    {"label": "Terms", "href": "/terms"},
    {"label": "Code of Conduct", "href": "/code-of-conduct"},
    {"label": "Contact", "href": "/contact"},
]

_DEFAULT_LEGAL_LINKS = {
    "privacy": "/privacy",
    "terms": "/terms",
    "code_of_conduct": "/code-of-conduct",
}

_DEFAULT_TRUST_LINKS = {
    "trust_center": "/trust",
    "transparency": "/transparency",
    "archive": "/archive",
}

_PUBLIC_ROUTE_PREFIXES = (
    "/",
    "/archive",
    "/trust",
    "/transparency",
    "/docs",
    "/contact",
    "/privacy",
    "/terms",
    "/code-of-conduct",
    "/community",
    "/impact",
    "/education",
    "/actions",
    "/events",
    "/universe",
    "/governance/model-registry",
)

MUDYIN_EXEMPLAR_MANIFEST = {
    "site_key": "mudyin-public",
    "site_name": "Mudyin Public Commons",
    "tagline": "Mudyin stories, trust records, and civic pathways hosted on ANU platform rails.",
    "theme_tokens": {
        "primary_color": "#0f4a43",
        "secondary_color": "#1e6f63",
        "accent_color": "#d4a24d",
    },
    "nav_items": [
        {"label": "Community", "href": "/community", "module": "community"},
        {"label": "Education", "href": "/education", "module": "education"},
        {"label": "Trust Center", "href": "/trust", "module": "trust"},
        {"label": "Archive", "href": "/archive", "module": "archive"},
    ],
    "enabled_public_modules": [
        "community",
        "education",
        "trust",
        "archive",
        "transparency",
    ],
    "contact": {
        "email": "hello@mudyin.anu.eco",
        "public_contact_url": "/contact",
        "location_label": "Sydney, NSW",
    },
}


def _coerce_object(raw: Any) -> dict[str, Any]:
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


def _normalize_text(raw: Any, *, fallback: str = "") -> str:
    if raw is None:
        return fallback
    value = str(raw).strip()
    return value or fallback


def _normalize_nullable_text(raw: Any) -> str | None:
    if raw is None:
        return None
    value = str(raw).strip()
    return value or None


def normalize_hostname(hostname: str | None) -> str:
    if not hostname:
        return ""
    return hostname.split(":")[0].strip().lower()


def _is_public_safe_href(href: str) -> bool:
    if not href.startswith("/"):
        return False
    if href.startswith("/api") or href.startswith("/control"):
        return False
    return any(href == prefix or href.startswith(f"{prefix}/") for prefix in _PUBLIC_ROUTE_PREFIXES)


def _sanitize_nav_items(raw_items: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_items, list):
        raw_items = _DEFAULT_NAV_ITEMS

    projected: list[dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue

        href = _normalize_text(item.get("href"))
        if not href or not _is_public_safe_href(href):
            continue

        label = _normalize_text(item.get("label"))
        if not label:
            continue

        module = _normalize_nullable_text(item.get("module"))
        projected.append(
            {
                "label": label,
                "href": href,
                "module": module,
            }
        )

    if projected:
        return projected

    return [
        {"label": item["label"], "href": item["href"], "module": item.get("module")}
        for item in _DEFAULT_NAV_ITEMS
    ]


def _sanitize_link_items(raw_links: Any, fallback_links: list[dict[str, str]]) -> list[dict[str, str]]:
    if not isinstance(raw_links, list):
        raw_links = fallback_links

    projected: list[dict[str, str]] = []
    for item in raw_links:
        if not isinstance(item, dict):
            continue
        label = _normalize_text(item.get("label"))
        href = _normalize_text(item.get("href"))
        if not label or not href or not _is_public_safe_href(href):
            continue
        projected.append({"label": label, "href": href})

    return projected if projected else list(fallback_links)


def _sanitize_path_lookup(raw: Any, defaults: dict[str, str]) -> dict[str, str]:
    source = raw if isinstance(raw, dict) else {}
    projected: dict[str, str] = {}
    for key, default_href in defaults.items():
        candidate = _normalize_text(source.get(key), fallback=default_href)
        projected[key] = candidate if _is_public_safe_href(candidate) else default_href
    return projected


def _active_domains_for_node(node_id: int) -> list[str]:
    rows = (
        NodeDomain.query.filter(
            NodeDomain.node_id == node_id,
            NodeDomain.status == "active",
        )
        .order_by(NodeDomain.id.asc())
        .all()
    )
    return [str(row.domain).strip().lower() for row in rows if isinstance(row.domain, str) and row.domain.strip()]


def _find_domain_record_for_host(host: str) -> NodeDomain | None:
    if not host:
        return None

    exact = (
        NodeDomain.query.filter(
            NodeDomain.domain == host,
            NodeDomain.status == "active",
        )
        .order_by(NodeDomain.id.asc())
        .first()
    )
    if exact:
        return exact

    parts = host.split(".")
    if len(parts) > 2:
        parent_domain = ".".join(parts[-2:])
        wildcard = (
            NodeDomain.query.filter(
                NodeDomain.domain == f"*.{parent_domain}",
                NodeDomain.status == "active",
            )
            .order_by(NodeDomain.id.asc())
            .first()
        )
        if wildcard:
            return wildcard

    return None


def _default_public_node() -> Node:
    node = (
        Node.query.filter(Node.is_default.is_(True), Node.status == "active")
        .order_by(Node.id.asc())
        .first()
    )
    if node:
        return node

    node = Node.query.filter(Node.status == "active").order_by(Node.id.asc()).first()
    if node:
        return node

    return get_default_node()


def _build_enabled_public_modules(config_json: dict[str, Any], site_manifest: dict[str, Any]) -> list[str]:
    configured = site_manifest.get("enabled_public_modules")
    if isinstance(configured, list):
        modules = [str(item).strip() for item in configured if str(item).strip()]
        if modules:
            return modules

    modules_config = config_json.get("modules")
    if isinstance(modules_config, dict):
        modules = [key for key, enabled in modules_config.items() if enabled is True]
        if modules:
            return sorted(set(modules))

    return sorted({item.get("module") for item in _DEFAULT_NAV_ITEMS if item.get("module")})


def build_public_site_manifest_for_node(
    *,
    node: Node,
    config_json: dict[str, Any] | None = None,
    resolved_host: str | None = None,
) -> dict[str, Any]:
    config_json = config_json or {}
    branding = _coerce_object(config_json.get("branding"))
    site_from_config = _coerce_object(config_json.get("public_site_manifest") or config_json.get("public_site"))

    site_from_exemplar = (
        MUDYIN_EXEMPLAR_MANIFEST
        if str(getattr(node, "slug", "")).strip().lower() == "mudyin"
        else {}
    )
    merged_site = {**site_from_exemplar, **site_from_config}

    site_key = _normalize_text(
        merged_site.get("site_key"),
        fallback=_normalize_text(getattr(node, "slug", ""), fallback=f"tenant-{node.id}"),
    )
    site_name = _normalize_text(
        merged_site.get("site_name"),
        fallback=_normalize_text(getattr(node, "name", ""), fallback=f"Tenant {node.id}"),
    )
    tagline = _normalize_text(merged_site.get("tagline"), fallback=_DEFAULT_TAGLINE)

    brand_assets_raw = _coerce_object(merged_site.get("brand_assets"))
    logo_asset_ref = _normalize_nullable_text(merged_site.get("logo_asset_ref"))
    favicon_asset_ref = _normalize_nullable_text(merged_site.get("favicon_asset_ref"))
    logo_url = _normalize_nullable_text(brand_assets_raw.get("logo_url")) or logo_asset_ref or _normalize_nullable_text(
        branding.get("logo_url")
    )
    favicon_url = _normalize_nullable_text(brand_assets_raw.get("favicon_url")) or favicon_asset_ref or _normalize_nullable_text(
        branding.get("favicon_url")
    )
    wordmark_url = _normalize_nullable_text(brand_assets_raw.get("wordmark_url"))

    theme_tokens_raw = _coerce_object(merged_site.get("theme_tokens"))
    theme_tokens = {
        "primary_color": _normalize_nullable_text(theme_tokens_raw.get("primary_color"))
        or _normalize_nullable_text(branding.get("primary_color")),
        "secondary_color": _normalize_nullable_text(theme_tokens_raw.get("secondary_color"))
        or _normalize_nullable_text(branding.get("secondary_color")),
        "accent_color": _normalize_nullable_text(theme_tokens_raw.get("accent_color"))
        or _normalize_nullable_text(branding.get("accent_color")),
        "custom_css": _normalize_nullable_text(theme_tokens_raw.get("custom_css"))
        or _normalize_nullable_text(branding.get("custom_css")),
    }

    canonical_domains = _active_domains_for_node(node.id)
    configured_domains = merged_site.get("canonical_domains")
    if isinstance(configured_domains, list):
        for domain in configured_domains:
            normalized = normalize_hostname(str(domain))
            if normalized and normalized not in canonical_domains:
                canonical_domains.append(normalized)

    resolved = normalize_hostname(resolved_host)
    if resolved and resolved not in canonical_domains:
        canonical_domains.append(resolved)

    preview_host = _normalize_nullable_text(merged_site.get("preview_host"))
    if not preview_host:
        preview_host = f"{site_key}.{_DEFAULT_PREVIEW_SUFFIX}"

    contact_raw = _coerce_object(merged_site.get("contact"))
    contact = {
        "email": _normalize_nullable_text(contact_raw.get("email")),
        "public_contact_url": _normalize_text(contact_raw.get("public_contact_url"), fallback="/contact"),
        "location_label": _normalize_nullable_text(contact_raw.get("location_label")),
    }
    if not _is_public_safe_href(contact["public_contact_url"]):
        contact["public_contact_url"] = "/contact"

    return {
        "tenant_id": node.id,
        "site_key": site_key,
        "site_name": site_name,
        "tagline": tagline,
        "brand_assets": {
            "logo_url": logo_url,
            "favicon_url": favicon_url,
            "wordmark_url": wordmark_url,
        },
        "theme_tokens": theme_tokens,
        "nav_items": _sanitize_nav_items(merged_site.get("nav_items")),
        "enabled_public_modules": _build_enabled_public_modules(config_json, merged_site),
        "footer_links": _sanitize_link_items(merged_site.get("footer_links"), _DEFAULT_FOOTER_LINKS),
        "legal_links": _sanitize_path_lookup(merged_site.get("legal_links"), _DEFAULT_LEGAL_LINKS),
        "trust_links": _sanitize_path_lookup(merged_site.get("trust_links"), _DEFAULT_TRUST_LINKS),
        "contact": contact,
        "canonical_domains": canonical_domains,
        "preview_host": preview_host,
    }


def resolve_public_site_for_host(hostname: str | None) -> dict[str, Any]:
    host = normalize_hostname(hostname)
    domain_record = _find_domain_record_for_host(host) if host else None
    node = None
    resolved = False
    resolution_status = "fallback_default"
    fallback_note: str | None = None

    if domain_record:
        candidate_node = Node.query.get(domain_record.node_id)
        if candidate_node and str(getattr(candidate_node, "status", "")).lower() == "active":
            node = candidate_node
            resolved = True
            resolution_status = "resolved"

    if node is None:
        node = _default_public_node()
        if host:
            resolution_status = "fallback_unknown_host"
            fallback_note = (
                f"Host '{host}' is not mapped to a tenant site yet. Showing default platform public site manifest."
            )
        else:
            resolution_status = "fallback_missing_host"
            fallback_note = "No host was provided; showing default platform public site manifest."

    node_config = NodeConfig.query.filter_by(node_id=node.id).first()
    config_json = _coerce_object(node_config.config_json if node_config else {})
    site_manifest = build_public_site_manifest_for_node(
        node=node,
        config_json=config_json,
        resolved_host=host or None,
    )

    return {
        "contract_version": PUBLIC_SITE_RESOLUTION_CONTRACT_VERSION,
        "host": host or None,
        "resolved": resolved,
        "resolution_status": resolution_status,
        "fallback_note": fallback_note,
        "node_id": node.id,
        "node_slug": node.slug,
        "node_name": node.name,
        "site_manifest": site_manifest,
    }

