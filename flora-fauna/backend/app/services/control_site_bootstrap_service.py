from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func

from ..extensions import db
from ..models import Node, NodeConfig
from ..services.control_operator_assignment_service import (
    ControlOperatorAssignmentValidationError,
    assign_control_operator_username,
    get_control_operator_assignments,
)
from ..services.control_site_domain_service import (
    ControlSiteDomainConflictError,
    ControlSiteDomainValidationError,
    update_control_site_domain_bindings,
)
from ..services.public_site_service import build_public_site_manifest_for_node

_SLUG_PATTERN = re.compile(r"[^a-z0-9]+")
_IDENTIFIER_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,159}$")


@dataclass
class ControlSiteBootstrapValidationError(Exception):
    message: str
    details: dict[str, Any] | None = None


@dataclass
class ControlSiteBootstrapConflictError(Exception):
    message: str
    details: dict[str, Any] | None = None


def _normalize_text(value: Any, *, field: str, max_length: int, allow_empty: bool = False) -> str:
    text = " ".join(str(value or "").strip().split())
    if not text and not allow_empty:
        raise ControlSiteBootstrapValidationError(
            f"{field} is required",
            details={field: ["This field is required."]},
        )
    if len(text) > max_length:
        raise ControlSiteBootstrapValidationError(
            f"{field} exceeds maximum length",
            details={field: [f"Maximum length is {max_length} characters."]},
        )
    return text


def _slugify(value: str) -> str:
    normalized = _SLUG_PATTERN.sub("-", str(value or "").strip().lower()).strip("-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized


def _normalize_identifier(value: Any, *, field: str, fallback: str | None = None) -> str:
    raw = str(value or "").strip().lower()
    candidate = raw or str(fallback or "")
    normalized = _slugify(candidate)
    if not normalized or not _IDENTIFIER_PATTERN.match(normalized):
        raise ControlSiteBootstrapValidationError(
            f"{field} is invalid",
            details={field: ["Use lowercase letters, numbers, and hyphens only."]},
        )
    return normalized


def _normalize_username_list(raw: Any) -> list[str]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ControlSiteBootstrapValidationError(
            "operator_usernames must be a list",
            details={"operator_usernames": ["Provide operator_usernames as a list of usernames."]},
        )
    normalized: list[str] = []
    seen: set[str] = set()
    for value in raw:
        username = str(value or "").strip().lower()
        if not username:
            continue
        if len(username) > 150:
            raise ControlSiteBootstrapValidationError(
                "operator_usernames contains an invalid username",
                details={"operator_usernames": ["Usernames must be 150 characters or fewer."]},
            )
        if username in seen:
            continue
        seen.add(username)
        normalized.append(username)
    return normalized


def _normalize_domain_list(raw: Any) -> list[str]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise ControlSiteBootstrapValidationError(
            "canonical_domains must be a list",
            details={"canonical_domains": ["Provide canonical_domains as a list of domain strings."]},
        )
    normalized: list[str] = []
    seen: set[str] = set()
    for value in raw:
        domain = str(value or "").strip()
        if not domain:
            continue
        lowered = domain.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(domain)
    return normalized


def _coerce_object(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    return {}


def _existing_site_key_conflict(site_key: str) -> bool:
    configs = NodeConfig.query.order_by(NodeConfig.id.asc()).all()
    for cfg in configs:
        config_json = _coerce_object(cfg.config_json)
        published = _coerce_object(config_json.get("public_site_manifest"))
        draft = _coerce_object(config_json.get("public_site_manifest_draft"))
        published_key = str(published.get("site_key") or "").strip().lower()
        draft_key = str(draft.get("site_key") or "").strip().lower()
        if published_key == site_key or draft_key == site_key:
            return True
    return False


def _bootstrap_manifest(
    *,
    node: Node,
    site_name: str,
    site_key: str,
    tagline: str,
    canonical_domains: list[str],
) -> dict[str, Any]:
    seed = {
        "site_name": site_name,
        "site_key": site_key,
        "tagline": tagline,
        "canonical_domains": [str(domain).strip().lower() for domain in canonical_domains if str(domain or "").strip()],
    }
    return build_public_site_manifest_for_node(node=node, config_json={"public_site_manifest": seed})


def create_control_site_bootstrap(
    *,
    node_name: Any,
    node_slug: Any = None,
    site_name: Any,
    site_key: Any = None,
    tagline: Any = None,
    canonical_domains: Any = None,
    operator_usernames: Any = None,
) -> dict[str, Any]:
    normalized_node_name = _normalize_text(node_name, field="node_name", max_length=120)
    normalized_slug = _normalize_identifier(node_slug, field="node_slug", fallback=normalized_node_name)
    normalized_site_name = _normalize_text(site_name, field="site_name", max_length=120)
    normalized_tagline = _normalize_text(
        tagline,
        field="tagline",
        max_length=240,
        allow_empty=True,
    ) or "Public civic routes hosted on ANU platform rails."
    normalized_site_key = _normalize_identifier(site_key, field="site_key", fallback=f"{normalized_slug}-public")
    normalized_operator_usernames = _normalize_username_list(operator_usernames)
    normalized_domains = _normalize_domain_list(canonical_domains)

    existing_slug = Node.query.filter(func.lower(Node.slug) == normalized_slug).first()
    if existing_slug:
        raise ControlSiteBootstrapConflictError(
            "A tenant node with this slug already exists.",
            details={"field": "node_slug", "node_slug": normalized_slug},
        )

    if _existing_site_key_conflict(normalized_site_key):
        raise ControlSiteBootstrapConflictError(
            "A public site with this site_key already exists.",
            details={"field": "site_key", "site_key": normalized_site_key},
        )

    node = Node(name=normalized_node_name, slug=normalized_slug, status="active")
    db.session.add(node)
    db.session.flush()

    bootstrap_manifest = _bootstrap_manifest(
        node=node,
        site_name=normalized_site_name,
        site_key=normalized_site_key,
        tagline=normalized_tagline,
        canonical_domains=normalized_domains,
    )

    config = NodeConfig(
        node_id=node.id,
        config_json={
            "public_site_manifest": bootstrap_manifest,
            "public_site_manifest_draft": bootstrap_manifest,
        },
    )
    db.session.add(config)

    assignment_payload = {
        "node_id": node.id,
        "assignments": {"usernames": [], "user_ids": [], "count": 0},
    }
    try:
        for username in normalized_operator_usernames:
            assignment_payload = assign_control_operator_username(node_id=node.id, requested_username=username)
    except ControlOperatorAssignmentValidationError as exc:
        raise ControlSiteBootstrapValidationError(exc.message, details=exc.details)

    domain_payload = {
        "node_id": node.id,
        "node_slug": normalized_slug,
        "canonical_domains": [],
        "domain_bindings": [],
        "mutation": {"applied": False, "added_domains": [], "removed_domains": [], "normalized_domains": []},
    }
    try:
        if normalized_domains:
            domain_payload = update_control_site_domain_bindings(
                node_id=node.id,
                canonical_domains=normalized_domains,
            )
    except ControlSiteDomainValidationError as exc:
        raise ControlSiteBootstrapValidationError(exc.message, details=exc.details)
    except ControlSiteDomainConflictError as exc:
        raise ControlSiteBootstrapConflictError(exc.message, details=exc.details)

    if normalized_operator_usernames:
        assignment_payload = get_control_operator_assignments(node_id=node.id)

    updated_config = NodeConfig.query.filter_by(node_id=node.id).first()
    updated_manifest = _coerce_object(_coerce_object(updated_config.config_json if updated_config else {}).get("public_site_manifest"))

    return {
        "node": {
            "id": int(node.id),
            "name": node.name,
            "slug": node.slug,
            "status": node.status,
        },
        "site_manifest": {
            "site_key": updated_manifest.get("site_key"),
            "site_name": updated_manifest.get("site_name"),
            "tagline": updated_manifest.get("tagline"),
            "canonical_domains": updated_manifest.get("canonical_domains") or [],
            "preview_host": updated_manifest.get("preview_host"),
        },
        "domain_bindings": {
            "canonical_domains": domain_payload.get("canonical_domains") or [],
            "count": len(domain_payload.get("canonical_domains") or []),
        },
        "operator_assignments": assignment_payload.get("assignments") or {"usernames": [], "user_ids": [], "count": 0},
        "audit": {
            "kind": "control_site_bootstrap_created",
            "identifier": {
                "node_slug": normalized_slug,
                "site_key": normalized_site_key,
            },
            "counts": {
                "canonical_domains": len(domain_payload.get("canonical_domains") or []),
                "operator_assignments": len((assignment_payload.get("assignments") or {}).get("usernames") or []),
            },
        },
    }
