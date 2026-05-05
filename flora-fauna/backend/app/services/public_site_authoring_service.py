from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
import hashlib
import json
from typing import Any

from ..models import Node, NodeConfig
from ..time_utils import now_utc
from .public_site_service import build_public_site_manifest_for_node

_ALLOWED_THEME_TOKEN_KEYS = {"primary_color", "secondary_color", "accent_color"}
_ALLOWED_MODULE_KEYS = {"community", "impact", "education", "trust", "transparency", "archive"}
_ALLOWED_NAV_HREFS = {
    "/about",
    "/community",
    "/impact",
    "/education",
    "/trust",
    "/transparency",
    "/archive",
}
_ALLOWED_LEGAL_LINK_KEYS = {"privacy", "terms", "code_of_conduct"}
_ALLOWED_TRUST_LINK_KEYS = {"trust_center", "transparency", "archive"}

_TEXT_MAX = {
    "site_name": 120,
    "tagline": 240,
    "asset_ref": 300,
    "nav_label": 80,
    "footer_label": 80,
    "link_href": 300,
    "contact_email": 160,
    "location_label": 120,
}


@dataclass
class PublicSiteManifestAuthoringValidationError(Exception):
    message: str
    details: dict[str, Any]


@dataclass
class PublicSiteManifestAuthoringNotFoundError(Exception):
    message: str


@dataclass
class PublicSiteManifestAuthoringConflictError(Exception):
    message: str
    latest_payload: dict[str, Any]
    latest_revision_token: str


def _coerce_object(raw: Any) -> dict[str, Any]:
    return raw if isinstance(raw, dict) else {}


def _normalize_text(value: Any, *, field: str, max_length: int, allow_none: bool = False) -> str | None:
    if value is None:
        if allow_none:
            return None
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} is required",
            details={field: ["This field is required."]},
        )

    normalized = " ".join(str(value).strip().split())
    if not normalized:
        if allow_none:
            return None
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} cannot be empty",
            details={field: ["This field cannot be blank."]},
        )

    if len(normalized) > max_length:
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} exceeds maximum length",
            details={field: [f"Maximum length is {max_length} characters."]},
        )
    return normalized


def _normalize_nullable_text(value: Any, *, field: str, max_length: int) -> str | None:
    if value is None:
        return None
    normalized = " ".join(str(value).strip().split())
    if not normalized:
        return None
    if len(normalized) > max_length:
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} exceeds maximum length",
            details={field: [f"Maximum length is {max_length} characters."]},
        )
    return normalized


def _is_public_safe_path(path: str) -> bool:
    if not path.startswith("/"):
        return False
    if path.startswith("/control") or path.startswith("/api"):
        return False
    return True


def _normalize_public_link(value: Any, *, field: str, nav_only: bool = False) -> str:
    normalized = _normalize_text(value, field=field, max_length=_TEXT_MAX["link_href"]) or ""
    if not _is_public_safe_path(normalized):
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} must be a public-safe route path",
            details={field: ["Only public route paths are allowed. Internal/control routes are blocked."]},
        )

    if nav_only and normalized not in _ALLOWED_NAV_HREFS:
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} is not an allowlisted navigation target",
            details={field: ["Navigation target is not in the WL-002 public route allowlist."]},
        )

    return normalized


def _normalize_theme_tokens(raw: Any, *, field: str) -> dict[str, str | None]:
    source = _coerce_object(raw)
    unknown = sorted(set(source.keys()) - _ALLOWED_THEME_TOKEN_KEYS)
    if unknown:
        raise PublicSiteManifestAuthoringValidationError(
            message="theme_tokens contains unknown keys",
            details={field: [f"Unknown theme token keys: {', '.join(unknown)}"]},
        )

    return {
        key: _normalize_nullable_text(source.get(key), field=f"theme_tokens.{key}", max_length=20)
        for key in sorted(_ALLOWED_THEME_TOKEN_KEYS)
    }


def _normalize_nav_items(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        raise PublicSiteManifestAuthoringValidationError(
            message="nav_items must be a list",
            details={"nav_items": ["Must be a list of navigation items."]},
        )

    normalized: list[dict[str, Any]] = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            raise PublicSiteManifestAuthoringValidationError(
                message="nav_items entries must be objects",
                details={f"nav_items.{idx}": ["Each nav item must be an object."]},
            )

        label = _normalize_text(item.get("label"), field=f"nav_items.{idx}.label", max_length=_TEXT_MAX["nav_label"])
        href = _normalize_public_link(item.get("href"), field=f"nav_items.{idx}.href", nav_only=True)
        module = _normalize_nullable_text(item.get("module"), field=f"nav_items.{idx}.module", max_length=40)
        if module and module not in _ALLOWED_MODULE_KEYS:
            raise PublicSiteManifestAuthoringValidationError(
                message="nav_items module is not allowlisted",
                details={f"nav_items.{idx}.module": ["Module key is not allowed in WL-002."]},
            )

        normalized.append({"label": label, "href": href, "module": module})

    return normalized


def _normalize_link_list(raw: Any, *, field: str) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} must be a list",
            details={field: ["Must be a list of links."]},
        )

    normalized: list[dict[str, str]] = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            raise PublicSiteManifestAuthoringValidationError(
                message=f"{field} entries must be objects",
                details={f"{field}.{idx}": ["Each link item must be an object."]},
            )

        label = _normalize_text(item.get("label"), field=f"{field}.{idx}.label", max_length=_TEXT_MAX["footer_label"])
        href = _normalize_public_link(item.get("href"), field=f"{field}.{idx}.href")
        normalized.append({"label": label, "href": href})

    return normalized


def _normalize_fixed_link_map(raw: Any, *, field: str, allowed_keys: set[str]) -> dict[str, str]:
    source = _coerce_object(raw)
    unknown = sorted(set(source.keys()) - allowed_keys)
    if unknown:
        raise PublicSiteManifestAuthoringValidationError(
            message=f"{field} contains unknown keys",
            details={field: [f"Unknown keys: {', '.join(unknown)}"]},
        )

    normalized: dict[str, str] = {}
    for key in sorted(allowed_keys):
        if key not in source:
            continue
        normalized[key] = _normalize_public_link(source.get(key), field=f"{field}.{key}")

    return normalized


def _normalize_enabled_modules(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        raise PublicSiteManifestAuthoringValidationError(
            message="enabled_modules must be a list",
            details={"enabled_modules": ["Must be a list of allowlisted module keys."]},
        )

    normalized = sorted({str(item).strip() for item in raw if str(item).strip()})
    disallowed = [item for item in normalized if item not in _ALLOWED_MODULE_KEYS]
    if disallowed:
        raise PublicSiteManifestAuthoringValidationError(
            message="enabled_modules contains disallowed keys",
            details={"enabled_modules": [f"Disallowed module keys: {', '.join(disallowed)}"]},
        )

    return normalized


def _normalize_contact(raw: Any) -> dict[str, Any]:
    source = _coerce_object(raw)
    unknown = sorted(set(source.keys()) - {"email", "public_contact_url", "location_label"})
    if unknown:
        raise PublicSiteManifestAuthoringValidationError(
            message="contact contains unknown keys",
            details={"contact": [f"Unknown keys: {', '.join(unknown)}"]},
        )

    normalized: dict[str, Any] = {}
    if "email" in source:
        email = _normalize_nullable_text(source.get("email"), field="contact.email", max_length=_TEXT_MAX["contact_email"])
        if email and "@" not in email:
            raise PublicSiteManifestAuthoringValidationError(
                message="contact.email is invalid",
                details={"contact.email": ["Email must contain '@'."]},
            )
        normalized["email"] = email

    if "public_contact_url" in source:
        normalized["public_contact_url"] = _normalize_public_link(
            source.get("public_contact_url"),
            field="contact.public_contact_url",
        )

    if "location_label" in source:
        normalized["location_label"] = _normalize_nullable_text(
            source.get("location_label"),
            field="contact.location_label",
            max_length=_TEXT_MAX["location_label"],
        )

    return normalized


def _coerce_authoring_state_from_site(site: dict[str, Any]) -> dict[str, Any]:
    theme_tokens = _coerce_object(site.get("theme_tokens"))
    contact = _coerce_object(site.get("contact"))
    return {
        "site_name": site.get("site_name"),
        "tagline": site.get("tagline"),
        "logo_asset_ref": site.get("logo_asset_ref") or _coerce_object(site.get("brand_assets")).get("logo_url"),
        "favicon_asset_ref": site.get("favicon_asset_ref") or _coerce_object(site.get("brand_assets")).get("favicon_url"),
        "theme_tokens": {
            "primary_color": theme_tokens.get("primary_color"),
            "secondary_color": theme_tokens.get("secondary_color"),
            "accent_color": theme_tokens.get("accent_color"),
        },
        "nav_items": site.get("nav_items") if isinstance(site.get("nav_items"), list) else [],
        "enabled_modules": site.get("enabled_public_modules") if isinstance(site.get("enabled_public_modules"), list) else [],
        "footer_links": site.get("footer_links") if isinstance(site.get("footer_links"), list) else [],
        "legal_links": _coerce_object(site.get("legal_links")),
        "trust_links": _coerce_object(site.get("trust_links")),
        "contact": {
            "email": contact.get("email"),
            "public_contact_url": contact.get("public_contact_url"),
            "location_label": contact.get("location_label"),
        },
    }


def _coerce_existing_draft_authoring_state(config_json: dict[str, Any]) -> dict[str, Any]:
    draft_site = _coerce_object(config_json.get("public_site_manifest_draft"))
    if draft_site:
        return _coerce_authoring_state_from_site(draft_site)
    published_site = _coerce_object(config_json.get("public_site_manifest"))
    return _coerce_authoring_state_from_site(published_site)


def _coerce_existing_published_authoring_state(config_json: dict[str, Any]) -> dict[str, Any]:
    published_site = _coerce_object(config_json.get("public_site_manifest"))
    return _coerce_authoring_state_from_site(published_site)


def _normalize_authoring_state(raw: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}

    if "site_name" in raw:
        normalized["site_name"] = _normalize_text(raw.get("site_name"), field="site_name", max_length=_TEXT_MAX["site_name"])

    if "tagline" in raw:
        normalized["tagline"] = _normalize_text(raw.get("tagline"), field="tagline", max_length=_TEXT_MAX["tagline"])

    if "logo_asset_ref" in raw:
        normalized["logo_asset_ref"] = _normalize_nullable_text(raw.get("logo_asset_ref"), field="logo_asset_ref", max_length=_TEXT_MAX["asset_ref"])

    if "favicon_asset_ref" in raw:
        normalized["favicon_asset_ref"] = _normalize_nullable_text(raw.get("favicon_asset_ref"), field="favicon_asset_ref", max_length=_TEXT_MAX["asset_ref"])

    if "theme_tokens" in raw:
        normalized["theme_tokens"] = _normalize_theme_tokens(raw.get("theme_tokens"), field="theme_tokens")

    if "nav_items" in raw:
        normalized["nav_items"] = _normalize_nav_items(raw.get("nav_items"))

    if "enabled_modules" in raw:
        normalized["enabled_modules"] = _normalize_enabled_modules(raw.get("enabled_modules"))

    if "footer_links" in raw:
        normalized["footer_links"] = _normalize_link_list(raw.get("footer_links"), field="footer_links")

    if "legal_links" in raw:
        normalized["legal_links"] = _normalize_fixed_link_map(raw.get("legal_links"), field="legal_links", allowed_keys=_ALLOWED_LEGAL_LINK_KEYS)

    if "trust_links" in raw:
        normalized["trust_links"] = _normalize_fixed_link_map(raw.get("trust_links"), field="trust_links", allowed_keys=_ALLOWED_TRUST_LINK_KEYS)

    if "contact" in raw:
        normalized["contact"] = _normalize_contact(raw.get("contact"))

    return normalized


def _merge_authoring_state(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(base)
    for key, value in patch.items():
        if key in {"theme_tokens", "legal_links", "trust_links", "contact"}:
            merged[key] = {**_coerce_object(merged.get(key)), **_coerce_object(value)}
        else:
            merged[key] = value
    return merged


def _build_change_summary(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    changed_fields = [key for key in sorted(after.keys()) if before.get(key) != after.get(key)]
    return {
        "changed_fields": changed_fields,
        "change_count": len(changed_fields),
        "before_counts": {
            "nav_items": len(before.get("nav_items") or []),
            "footer_links": len(before.get("footer_links") or []),
            "enabled_modules": len(before.get("enabled_modules") or []),
        },
        "after_counts": {
            "nav_items": len(after.get("nav_items") or []),
            "footer_links": len(after.get("footer_links") or []),
            "enabled_modules": len(after.get("enabled_modules") or []),
        },
    }


def _apply_authoring_state_to_site_manifest(existing_site: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    return {
        **existing_site,
        "site_name": state.get("site_name"),
        "tagline": state.get("tagline"),
        "logo_asset_ref": state.get("logo_asset_ref"),
        "favicon_asset_ref": state.get("favicon_asset_ref"),
        "theme_tokens": _coerce_object(state.get("theme_tokens")),
        "nav_items": state.get("nav_items") or [],
        "enabled_public_modules": state.get("enabled_modules") or [],
        "footer_links": state.get("footer_links") or [],
        "legal_links": _coerce_object(state.get("legal_links")),
        "trust_links": _coerce_object(state.get("trust_links")),
        "contact": _coerce_object(state.get("contact")),
    }


def _write_draft_authoring_state_to_config(config_json: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    next_config = deepcopy(config_json)
    existing_draft = _coerce_object(next_config.get("public_site_manifest_draft"))
    existing_published = _coerce_object(next_config.get("public_site_manifest"))
    base_site = existing_draft or existing_published
    next_config["public_site_manifest_draft"] = _apply_authoring_state_to_site_manifest(base_site, state)
    return next_config


def _authoring_revision_token(authoring_state: dict[str, Any]) -> str:
    canonical = json.dumps(authoring_state, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return f"psmrev:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"


def _build_preview_manifest(node: Node, config_json: dict[str, Any], draft_state: dict[str, Any]) -> dict[str, Any]:
    preview_config = deepcopy(config_json)
    preview_config["public_site_manifest"] = _apply_authoring_state_to_site_manifest(
        _coerce_object(preview_config.get("public_site_manifest")),
        draft_state,
    )
    return build_public_site_manifest_for_node(node=node, config_json=preview_config)


def _build_published_manifest(node: Node, config_json: dict[str, Any]) -> dict[str, Any]:
    return build_public_site_manifest_for_node(node=node, config_json=config_json)


def _build_authoring_response_payload(*, node: Node, config_json: dict[str, Any], draft_state: dict[str, Any]) -> dict[str, Any]:
    published_state = _normalize_authoring_state(_coerce_existing_published_authoring_state(config_json))
    published_manifest = _build_published_manifest(node, config_json)
    preview_manifest = _build_preview_manifest(node, config_json, draft_state)

    publish_meta = _coerce_object(config_json.get("public_site_manifest_publish_meta"))
    published_revision_token = str(publish_meta.get("published_revision_token") or "").strip() or _authoring_revision_token(published_state)
    published_at = str(publish_meta.get("published_at") or "").strip() or None
    published_by = str(publish_meta.get("published_by") or "").strip() or None

    return {
        "node_id": node.id,
        "node_slug": node.slug,
        "authoring": draft_state,
        "revision_token": _authoring_revision_token(draft_state),
        "published_revision_token": published_revision_token,
        "published_at": published_at,
        "published_by": published_by,
        "read_only": {
            "site_key": published_manifest.get("site_key"),
            "canonical_domains": published_manifest.get("canonical_domains") or [],
            "preview_host": published_manifest.get("preview_host"),
        },
        "site_manifest": preview_manifest,
        "published_site_manifest": published_manifest,
    }


def get_public_site_manifest_authoring_payload(*, node_id: int) -> dict[str, Any]:
    node = Node.query.get(node_id)
    if not node:
        raise PublicSiteManifestAuthoringNotFoundError("Tenant node not found")

    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    config_json = _coerce_object(cfg.config_json if cfg else {})
    draft_state = _normalize_authoring_state(_coerce_existing_draft_authoring_state(config_json))
    return _build_authoring_response_payload(node=node, config_json=config_json, draft_state=draft_state)


def update_public_site_manifest_authoring(*, node_id: int, patch_payload: dict[str, Any], expected_revision_token: str) -> dict[str, Any]:
    node = Node.query.get(node_id)
    if not node:
        raise PublicSiteManifestAuthoringNotFoundError("Tenant node not found")

    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    existing_config = _coerce_object(cfg.config_json if cfg else {})

    before_draft_state = _normalize_authoring_state(_coerce_existing_draft_authoring_state(existing_config))
    current_revision_token = _authoring_revision_token(before_draft_state)
    if current_revision_token != expected_revision_token:
        latest_payload = _build_authoring_response_payload(node=node, config_json=existing_config, draft_state=before_draft_state)
        raise PublicSiteManifestAuthoringConflictError(
            message="Manifest authoring payload is stale. Reload latest saved values and retry.",
            latest_payload=latest_payload,
            latest_revision_token=current_revision_token,
        )

    normalized_patch = _normalize_authoring_state(patch_payload)
    if not normalized_patch:
        raise PublicSiteManifestAuthoringValidationError(
            message="At least one allowlisted field is required",
            details={"payload": ["No allowlisted update fields were provided."]},
        )

    after_draft_state = _merge_authoring_state(before_draft_state, normalized_patch)
    next_config = _write_draft_authoring_state_to_config(existing_config, after_draft_state)

    if cfg:
        cfg.config_json = next_config
    else:
        from ..extensions import db

        cfg = NodeConfig(node_id=node_id, config_json=next_config)
        db.session.add(cfg)

    response_payload = _build_authoring_response_payload(node=node, config_json=next_config, draft_state=after_draft_state)
    response_payload["audit"] = {
        "kind": "public_site_manifest_authoring_update",
        **_build_change_summary(before_draft_state, after_draft_state),
    }
    return response_payload


def publish_public_site_manifest_authoring_draft(
    *,
    node_id: int,
    expected_revision_token: str,
    actor_id: int | None = None,
    actor_username: str | None = None,
) -> dict[str, Any]:
    node = Node.query.get(node_id)
    if not node:
        raise PublicSiteManifestAuthoringNotFoundError("Tenant node not found")

    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    existing_config = _coerce_object(cfg.config_json if cfg else {})

    draft_state = _normalize_authoring_state(_coerce_existing_draft_authoring_state(existing_config))
    current_revision_token = _authoring_revision_token(draft_state)
    if current_revision_token != expected_revision_token:
        latest_payload = _build_authoring_response_payload(node=node, config_json=existing_config, draft_state=draft_state)
        raise PublicSiteManifestAuthoringConflictError(
            message="Draft revision is stale. Reload latest draft before publishing.",
            latest_payload=latest_payload,
            latest_revision_token=current_revision_token,
        )

    published_before = _normalize_authoring_state(_coerce_existing_published_authoring_state(existing_config))

    next_config = deepcopy(existing_config)
    next_config["public_site_manifest"] = _apply_authoring_state_to_site_manifest(
        _coerce_object(next_config.get("public_site_manifest")),
        draft_state,
    )
    next_config["public_site_manifest_publish_meta"] = {
        "published_at": now_utc().isoformat(),
        "published_by": (
            str(actor_username).strip()
            if actor_username and str(actor_username).strip()
            else (f"user:{actor_id}" if actor_id is not None else "control-operator")
        ),
        "published_revision_token": current_revision_token,
    }

    if cfg:
        cfg.config_json = next_config
    else:
        from ..extensions import db

        cfg = NodeConfig(node_id=node_id, config_json=next_config)
        db.session.add(cfg)

    response_payload = _build_authoring_response_payload(node=node, config_json=next_config, draft_state=draft_state)
    response_payload["audit"] = {
        "kind": "public_site_manifest_published",
        **_build_change_summary(published_before, draft_state),
    }
    return response_payload
