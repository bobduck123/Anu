from __future__ import annotations

import json
import os
from typing import Any

from ..extensions import db
from ..models import Node, NodeConfig, NodeDomain
from .node_service import get_default_node
from .white_label_site_registry import (
    WhiteLabelSiteRegistryEntry,
    find_white_label_site_by_allowed_domain,
    find_white_label_site_by_deployment_alias,
    find_white_label_site_by_public_hint,
    get_white_label_site_by_slug,
    normalize_hostname as normalize_registry_hostname,
)

PUBLIC_SITE_MANIFEST_CONTRACT_VERSION = "2026-04-14"
PUBLIC_SITE_RESOLUTION_CONTRACT_VERSION = "2026-04-14"

_DEFAULT_TAGLINE = "Public civic routes hosted on ANU platform rails."
_DEFAULT_PREVIEW_SUFFIX = "preview.anu.eco"
_DEFAULT_PLATFORM_HOSTS = {
    "localhost",
    "127.0.0.1",
    "anu.eco",
    "www.anu.eco",
    "app.anu.eco",
    "staging.anu.eco",
    "maanara.vercel.app",
    "anu-back-end.vercel.app",
}

_DEFAULT_NAV_ITEMS = [
    {"label": "About", "href": "/about", "module": None},
    {"label": "Community", "href": "/community", "module": "community"},
    {"label": "Impact", "href": "/impact", "module": "impact"},
    {"label": "Education", "href": "/education", "module": "education"},
    {"label": "Trust Center", "href": "/trust", "module": "trust"},
    {"label": "Transparency", "href": "/transparency", "module": "transparency"},
    {"label": "Archive", "href": "/archive", "module": "archive"},
]

_DEFAULT_FOOTER_LINKS = [
    {"label": "About", "href": "/about"},
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
    "/about",
    "/mission",
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
    "/programs",
    "/resources",
    "/education",
    "/actions",
    "/events",
    "/universe",
    "/governance/model-registry",
)


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
    return normalize_registry_hostname(hostname)


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


def _configured_platform_hosts() -> set[str]:
    configured = {
        normalize_hostname(host)
        for host in os.environ.get("PUBLIC_PLATFORM_HOSTS", "").split(",")
        if normalize_hostname(host)
    }
    return _DEFAULT_PLATFORM_HOSTS | configured


def _is_platform_host(host: str) -> bool:
    if not host:
        return False
    return host in _configured_platform_hosts() or host.endswith(".localhost")


def _registered_node_for_deployment_alias(host: str) -> Node | None:
    registry_site = find_white_label_site_by_deployment_alias(host)
    if not registry_site:
        return None
    return _registered_node_for_site(registry_site)


def _registered_node_for_site(registry_site: WhiteLabelSiteRegistryEntry) -> Node | None:
    return (
        Node.query.filter(
            Node.slug == registry_site.slug,
            Node.status == "active",
        )
        .order_by(Node.id.asc())
        .first()
    )


def _registry_site_for_host(host: str) -> WhiteLabelSiteRegistryEntry | None:
    return find_white_label_site_by_deployment_alias(host) or find_white_label_site_by_allowed_domain(host)


def build_registry_only_public_site_manifest(
    *,
    site: WhiteLabelSiteRegistryEntry,
    resolved_host: str | None = None,
) -> dict[str, Any]:
    merged_site = dict(site.manifest_defaults)
    theme_tokens_raw = _coerce_object(merged_site.get("theme_tokens"))
    brand_assets_raw = _coerce_object(merged_site.get("brand_assets"))
    contact_raw = _coerce_object(merged_site.get("contact"))

    canonical_domains: list[str] = []
    for domain in [*site.allowed_domains, *site.deployment_aliases, *(merged_site.get("canonical_domains") or [])]:
        normalized = normalize_hostname(str(domain))
        if normalized and normalized not in canonical_domains:
            canonical_domains.append(normalized)
    resolved = normalize_hostname(resolved_host)
    if resolved and resolved not in canonical_domains:
        canonical_domains.append(resolved)

    contact_url = _normalize_text(contact_raw.get("public_contact_url"), fallback="/contact")
    if not _is_public_safe_href(contact_url):
        contact_url = "/contact"

    enabled_modules = merged_site.get("enabled_public_modules")
    if not isinstance(enabled_modules, list) or not enabled_modules:
        enabled_modules = list(site.enabled_features)
    enabled_public_modules = [str(item).strip() for item in enabled_modules if str(item).strip()]

    return {
        "tenant_id": 0,
        "site_key": _normalize_text(merged_site.get("site_key"), fallback=site.site_id),
        "site_name": _normalize_text(merged_site.get("site_name"), fallback=site.canonical_name),
        "tagline": _normalize_text(merged_site.get("tagline"), fallback=_DEFAULT_TAGLINE),
        "brand_assets": {
            "logo_url": _normalize_nullable_text(brand_assets_raw.get("logo_url"))
            or _normalize_nullable_text(merged_site.get("logo_asset_ref")),
            "favicon_url": _normalize_nullable_text(brand_assets_raw.get("favicon_url"))
            or _normalize_nullable_text(merged_site.get("favicon_asset_ref")),
            "wordmark_url": _normalize_nullable_text(brand_assets_raw.get("wordmark_url")),
        },
        "theme_tokens": {
            "primary_color": _normalize_nullable_text(theme_tokens_raw.get("primary_color")),
            "secondary_color": _normalize_nullable_text(theme_tokens_raw.get("secondary_color")),
            "accent_color": _normalize_nullable_text(theme_tokens_raw.get("accent_color")),
            "custom_css": _normalize_nullable_text(theme_tokens_raw.get("custom_css")),
        },
        "nav_items": _sanitize_nav_items(merged_site.get("nav_items")),
        "enabled_public_modules": enabled_public_modules,
        "feature_flags": _build_public_feature_flags(merged_site, enabled_public_modules),
        "footer_links": _sanitize_link_items(merged_site.get("footer_links"), _DEFAULT_FOOTER_LINKS),
        "legal_links": _sanitize_path_lookup(merged_site.get("legal_links"), _DEFAULT_LEGAL_LINKS),
        "trust_links": _sanitize_path_lookup(merged_site.get("trust_links"), _DEFAULT_TRUST_LINKS),
        "contact": {
            "email": _normalize_nullable_text(contact_raw.get("email")),
            "public_contact_url": contact_url,
            "location_label": _normalize_nullable_text(contact_raw.get("location_label")),
        },
        "canonical_domains": canonical_domains,
        "preview_host": _normalize_nullable_text(merged_site.get("preview_host")) or site.deployment_aliases[0],
    }


def _build_registry_only_resolution(
    *,
    site: WhiteLabelSiteRegistryEntry,
    host: str | None,
    resolution_status: str,
    fallback_note: str | None,
) -> dict[str, Any]:
    return {
        "contract_version": PUBLIC_SITE_RESOLUTION_CONTRACT_VERSION,
        "host": normalize_hostname(host) or None,
        "resolved": True,
        "resolution_status": resolution_status,
        "fallback_note": fallback_note,
        "node_id": 0,
        "node_slug": site.slug,
        "node_name": site.canonical_name,
        "site_manifest": build_registry_only_public_site_manifest(site=site, resolved_host=host),
    }


def _resolve_registered_site(
    *,
    site: WhiteLabelSiteRegistryEntry,
    host: str | None,
    resolution_status: str,
) -> dict[str, Any]:
    try:
        node = _registered_node_for_site(site)
        if not node:
            return _build_registry_only_resolution(
                site=site,
                host=host,
                resolution_status="resolved_registry_only",
                fallback_note=(
                    "The site is present in the white-label registry but no active tenant node "
                    "is provisioned yet. Tenant data APIs remain disabled until bootstrap."
                ),
            )

        node_config = NodeConfig.query.filter_by(node_id=node.id).first()
        config_json = _coerce_object(node_config.config_json if node_config else {})
        return {
            "contract_version": PUBLIC_SITE_RESOLUTION_CONTRACT_VERSION,
            "host": normalize_hostname(host) or None,
            "resolved": True,
            "resolution_status": resolution_status,
            "fallback_note": None,
            "node_id": node.id,
            "node_slug": node.slug,
            "node_name": node.name,
            "site_manifest": build_public_site_manifest_for_node(
                node=node,
                config_json=config_json,
                resolved_host=host or None,
            ),
        }
    except Exception:
        db.session.rollback()
        return _build_registry_only_resolution(
            site=site,
            host=host,
            resolution_status="resolved_registry_only_db_unavailable",
            fallback_note=(
                "The site is present in the white-label registry, but tenant storage was "
                "unavailable. Public registry metadata is returned without private data."
            ),
        )


def resolve_public_site_for_site_hint(site_hint: str | None, *, host: str | None = None) -> dict[str, Any] | None:
    site = find_white_label_site_by_public_hint(site_hint)
    if not site:
        return None
    return _resolve_registered_site(site=site, host=host, resolution_status="resolved_site_hint")


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


def _build_public_feature_flags(site_manifest: dict[str, Any], enabled_modules: list[str]) -> dict[str, bool]:
    defaults = {
        "enquiries": "enquiries" in enabled_modules,
        "booking_requests": "booking_requests" in enabled_modules,
        "live_bookings": False,
        "donations": False,
        "events": "events" in enabled_modules,
        "practitioners": False,
    }
    configured = _coerce_object(site_manifest.get("feature_flags"))
    for key in list(defaults.keys()):
        if key in configured:
            defaults[key] = bool(configured.get(key))
    return defaults


def build_public_site_manifest_for_node(
    *,
    node: Node,
    config_json: dict[str, Any] | None = None,
    resolved_host: str | None = None,
) -> dict[str, Any]:
    config_json = config_json or {}
    branding = _coerce_object(config_json.get("branding"))
    site_from_config = _coerce_object(config_json.get("public_site_manifest") or config_json.get("public_site"))

    registry_site = get_white_label_site_by_slug(str(getattr(node, "slug", "")))
    site_from_registry = registry_site.manifest_defaults if registry_site else {}
    merged_site = {**site_from_registry, **site_from_config}

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

    enabled_public_modules = _build_enabled_public_modules(config_json, merged_site)

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
        "enabled_public_modules": enabled_public_modules,
        "feature_flags": _build_public_feature_flags(merged_site, enabled_public_modules),
        "footer_links": _sanitize_link_items(merged_site.get("footer_links"), _DEFAULT_FOOTER_LINKS),
        "legal_links": _sanitize_path_lookup(merged_site.get("legal_links"), _DEFAULT_LEGAL_LINKS),
        "trust_links": _sanitize_path_lookup(merged_site.get("trust_links"), _DEFAULT_TRUST_LINKS),
        "contact": contact,
        "canonical_domains": canonical_domains,
        "preview_host": preview_host,
    }


def build_unassigned_public_site_manifest(*, node: Node, host: str | None = None) -> dict[str, Any]:
    normalized_host = normalize_hostname(host)
    return {
        "tenant_id": node.id,
        "site_key": "unassigned-public-host",
        "site_name": "Site not configured",
        "tagline": "This host is not mapped to a published ANU white-label site.",
        "brand_assets": {
            "logo_url": None,
            "favicon_url": None,
            "wordmark_url": None,
        },
        "theme_tokens": {
            "primary_color": "#28323a",
            "secondary_color": "#3f4c56",
            "accent_color": "#b58932",
            "custom_css": None,
        },
        "nav_items": [
            {"label": "Transparency", "href": "/transparency", "module": "transparency"},
            {"label": "Contact", "href": "/contact", "module": None},
        ],
        "enabled_public_modules": ["transparency"],
        "footer_links": [
            {"label": "Transparency", "href": "/transparency"},
            {"label": "Contact", "href": "/contact"},
            {"label": "Privacy", "href": "/privacy"},
            {"label": "Terms", "href": "/terms"},
        ],
        "legal_links": dict(_DEFAULT_LEGAL_LINKS),
        "trust_links": dict(_DEFAULT_TRUST_LINKS),
        "contact": {
            "email": None,
            "public_contact_url": "/contact",
            "location_label": None,
        },
        "canonical_domains": [],
        "preview_host": normalized_host or None,
    }


def resolve_public_site_for_host(hostname: str | None) -> dict[str, Any]:
    host = normalize_hostname(hostname)
    registry_site = _registry_site_for_host(host) if host else None
    try:
        domain_record = _find_domain_record_for_host(host) if host else None
    except Exception:
        if registry_site:
            db.session.rollback()
            return _build_registry_only_resolution(
                site=registry_site,
                host=host,
                resolution_status="resolved_registry_only_db_unavailable",
                fallback_note=(
                    "The host is registered for a white-label site, but tenant storage was "
                    "unavailable. Public registry metadata is returned without private data."
                ),
            )
        raise
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
        if registry_site:
            return _resolve_registered_site(
                site=registry_site,
                host=host,
                resolution_status=(
                    "resolved_deployment_alias"
                    if find_white_label_site_by_deployment_alias(host)
                    else "resolved_registered_domain"
                ),
            )

        alias_node = _registered_node_for_deployment_alias(host) if host else None
        if alias_node:
            node = alias_node
            resolved = True
            resolution_status = "resolved_deployment_alias"

    use_unassigned_manifest = False
    if node is None:
        node = _default_public_node()
        if host and _is_platform_host(host):
            resolved = True
            resolution_status = "resolved_platform_host"
            fallback_note = None
        else:
            use_unassigned_manifest = True
        if host and use_unassigned_manifest:
            resolution_status = "fallback_unknown_host"
            fallback_note = (
                f"Host '{host}' is not mapped to a tenant site. No tenant content is shown."
            )
        elif not host:
            resolution_status = "fallback_missing_host"
            fallback_note = "No host was provided. No tenant content is shown."

    node_config = NodeConfig.query.filter_by(node_id=node.id).first()
    config_json = _coerce_object(node_config.config_json if node_config else {})
    site_manifest = (
        build_unassigned_public_site_manifest(node=node, host=host)
        if use_unassigned_manifest
        else build_public_site_manifest_for_node(
            node=node,
            config_json=config_json,
            resolved_host=host or None,
        )
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
