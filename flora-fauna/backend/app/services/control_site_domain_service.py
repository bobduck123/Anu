from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from ..extensions import db
from ..models import Node, NodeConfig, NodeDomain


_DOMAIN_PATTERN = re.compile(
    r"^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$"
)


class ControlSiteDomainNotFoundError(Exception):
    pass


class ControlSiteDomainValidationError(Exception):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ControlSiteDomainConflictError(Exception):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


def _coerce_object(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    return {}


def _serialize_domain_rows(rows: list[NodeDomain]) -> list[dict[str, Any]]:
    return [
        {
            "domain": str(row.domain or "").strip().lower(),
            "status": str(row.status or "").strip().lower() or "active",
            "tls_ready": bool(row.tls_ready),
            "created_at": row.created_at.isoformat() if isinstance(row.created_at, datetime) else None,
        }
        for row in rows
    ]


def _normalize_domain(raw_domain: Any) -> str:
    value = str(raw_domain or "").strip().lower().rstrip(".")
    if not value:
        raise ControlSiteDomainValidationError(
            "Domain value is required.",
            details={"canonical_domains": ["Domain values cannot be empty."]},
        )
    if len(value) > 200:
        raise ControlSiteDomainValidationError(
            "Domain value is too long.",
            details={"canonical_domains": ["Domain values must be 200 characters or fewer."]},
        )
    if "://" in value or "/" in value or " " in value:
        raise ControlSiteDomainValidationError(
            "Domain value is invalid.",
            details={"canonical_domains": [f"'{value}' is not a valid domain hostname."]},
        )
    if not _DOMAIN_PATTERN.match(value):
        raise ControlSiteDomainValidationError(
            "Domain value is invalid.",
            details={"canonical_domains": [f"'{value}' is not a valid domain hostname."]},
        )
    return value


def _normalize_domains(raw_domains: Any) -> list[str]:
    if not isinstance(raw_domains, list):
        raise ControlSiteDomainValidationError(
            "canonical_domains must be a list.",
            details={"canonical_domains": ["Provide canonical_domains as a list of domain strings."]},
        )

    normalized: list[str] = []
    seen: set[str] = set()
    for raw_domain in raw_domains:
        normalized_domain = _normalize_domain(raw_domain)
        if normalized_domain in seen:
            continue
        seen.add(normalized_domain)
        normalized.append(normalized_domain)

    return normalized


def _get_or_create_node_config(node_id: int) -> NodeConfig:
    existing = NodeConfig.query.filter_by(node_id=node_id).first()
    if existing:
        return existing
    created = NodeConfig(node_id=node_id, config_json={})
    return created


def get_control_site_domain_bindings(*, node_id: int) -> dict[str, Any]:
    node = Node.query.get(node_id)
    if not node:
        raise ControlSiteDomainNotFoundError()

    rows = (
        NodeDomain.query.filter(
            NodeDomain.node_id == node_id,
            NodeDomain.status == "active",
        )
        .order_by(NodeDomain.id.asc())
        .all()
    )
    canonical_domains = [str(row.domain or "").strip().lower() for row in rows if str(row.domain or "").strip()]

    return {
        "node_id": node.id,
        "node_slug": node.slug,
        "canonical_domains": canonical_domains,
        "domain_bindings": _serialize_domain_rows(rows),
    }


def update_control_site_domain_bindings(*, node_id: int, canonical_domains: Any) -> dict[str, Any]:
    node = Node.query.get(node_id)
    if not node:
        raise ControlSiteDomainNotFoundError()

    normalized_domains = _normalize_domains(canonical_domains)

    if normalized_domains:
        conflicting_rows = (
            NodeDomain.query.filter(
                NodeDomain.domain.in_(normalized_domains),
                NodeDomain.node_id != node_id,
            )
            .order_by(NodeDomain.id.asc())
            .all()
        )
        if conflicting_rows:
            conflicting_domains = sorted({str(row.domain or "").strip().lower() for row in conflicting_rows if row.domain})
            raise ControlSiteDomainConflictError(
                "One or more domains are already assigned to another tenant node.",
                details={
                    "conflicting_domains": conflicting_domains,
                    "conflicting_node_ids": sorted({int(row.node_id) for row in conflicting_rows}),
                },
            )

    existing_rows = (
        NodeDomain.query.filter(NodeDomain.node_id == node_id)
        .order_by(NodeDomain.id.asc())
        .all()
    )
    existing_by_domain = {str(row.domain or "").strip().lower(): row for row in existing_rows if str(row.domain or "").strip()}
    previous_domains = [domain for domain in existing_by_domain.keys()]

    desired_set = set(normalized_domains)
    current_set = set(previous_domains)
    added_domains = [domain for domain in normalized_domains if domain not in current_set]
    removed_domains = [domain for domain in previous_domains if domain not in desired_set]

    for row in existing_rows:
        if str(row.domain or "").strip().lower() not in desired_set:
            db.session.delete(row)

    for domain in normalized_domains:
        existing_row = existing_by_domain.get(domain)
        if existing_row:
            existing_row.status = "active"
            continue
        db.session.add(
            NodeDomain(
                node_id=node_id,
                domain=domain,
                status="active",
                tls_ready=False,
            )
        )

    node_config = _get_or_create_node_config(node_id)
    next_config = _coerce_object(node_config.config_json)
    published_manifest = _coerce_object(next_config.get("public_site_manifest"))
    draft_manifest = _coerce_object(next_config.get("public_site_manifest_draft"))
    published_manifest["canonical_domains"] = list(normalized_domains)
    if draft_manifest:
        draft_manifest["canonical_domains"] = list(normalized_domains)

    next_config["public_site_manifest"] = published_manifest
    if draft_manifest:
        next_config["public_site_manifest_draft"] = draft_manifest
    node_config.config_json = next_config
    db.session.add(node_config)

    refreshed_rows = (
        NodeDomain.query.filter(
            NodeDomain.node_id == node_id,
            NodeDomain.status == "active",
        )
        .order_by(NodeDomain.id.asc())
        .all()
    )
    refreshed_domains = [str(row.domain or "").strip().lower() for row in refreshed_rows if str(row.domain or "").strip()]

    return {
        "node_id": node.id,
        "node_slug": node.slug,
        "canonical_domains": refreshed_domains,
        "domain_bindings": _serialize_domain_rows(refreshed_rows),
        "mutation": {
            "applied": bool(added_domains or removed_domains),
            "added_domains": added_domains,
            "removed_domains": removed_domains,
            "normalized_domains": normalized_domains,
            "idempotent_noop": not (added_domains or removed_domains),
        },
    }
