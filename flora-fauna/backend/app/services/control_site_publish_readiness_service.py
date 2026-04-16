from __future__ import annotations

from typing import Any

from ..models import Node, NodeConfig, NodeDomain


class ControlSitePublishReadinessNotFoundError(Exception):
    pass


def _coerce_object(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    return {}


def _safe_text(value: Any) -> str:
    return str(value or "").strip()


def evaluate_control_site_publish_readiness(*, node_id: int) -> dict[str, Any]:
    node = Node.query.get(node_id)
    if not node:
        raise ControlSitePublishReadinessNotFoundError()

    active_domain_rows = (
        NodeDomain.query.filter(
            NodeDomain.node_id == node_id,
            NodeDomain.status == "active",
        )
        .order_by(NodeDomain.id.asc())
        .all()
    )
    canonical_domains = [str(row.domain or "").strip().lower() for row in active_domain_rows if str(row.domain or "").strip()]

    node_config = NodeConfig.query.filter_by(node_id=node_id).first()
    config_json = _coerce_object(node_config.config_json if node_config else {})
    published_manifest = _coerce_object(config_json.get("public_site_manifest"))

    blocking_issues: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []

    if not canonical_domains:
        blocking_issues.append(
            {
                "code": "missing_domain_binding",
                "message": "At least one canonical domain binding is required before public launch.",
            }
        )

    if not published_manifest:
        blocking_issues.append(
            {
                "code": "missing_published_manifest",
                "message": "Published public site manifest is missing.",
            }
        )
    else:
        legal_links = _coerce_object(published_manifest.get("legal_links"))
        trust_links = _coerce_object(published_manifest.get("trust_links"))

        missing_legal = [key for key in ("privacy", "terms", "code_of_conduct") if not _safe_text(legal_links.get(key))]
        missing_trust = [key for key in ("trust_center", "transparency", "archive") if not _safe_text(trust_links.get(key))]

        if missing_legal:
            blocking_issues.append(
                {
                    "code": "missing_legal_links",
                    "message": "Published manifest is missing required legal links.",
                    "details": {"missing_keys": missing_legal},
                }
            )

        if missing_trust:
            blocking_issues.append(
                {
                    "code": "missing_trust_links",
                    "message": "Published manifest is missing required trust links.",
                    "details": {"missing_keys": missing_trust},
                }
            )

    if any(not bool(row.tls_ready) for row in active_domain_rows):
        warnings.append(
            {
                "code": "domain_tls_not_ready",
                "message": "One or more canonical domains report tls_ready=false.",
            }
        )

    return {
        "node_id": node.id,
        "node_slug": node.slug,
        "ready": len(blocking_issues) == 0,
        "blocking_issues": blocking_issues,
        "warnings": warnings,
        "checks": {
            "canonical_domain_binding_present": bool(canonical_domains),
            "published_manifest_present": bool(published_manifest),
            "required_legal_links_present": not any(issue["code"] == "missing_legal_links" for issue in blocking_issues),
            "required_trust_links_present": not any(issue["code"] == "missing_trust_links" for issue in blocking_issues),
        },
    }
