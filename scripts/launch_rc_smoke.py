#!/usr/bin/env python3
"""ANU-LAUNCH-001: release-candidate smoke checks for critical ANU paths."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from time import perf_counter
from typing import Any

os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "launch-smoke-secret-key-1234567890")
os.environ.setdefault("JWT_SECRET_KEY", "launch-smoke-jwt-secret-key-1234567890")

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent / "flora-fauna" / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from flask_jwt_extended import create_access_token  # noqa: E402
from backend_factory import load_create_app  # noqa: E402


LAUNCH_SMOKE_CONTRACT_VERSION = "anu-launch-smoke.v1"
PASSED = "passed"
FAILED = "failed"
SKIPPED = "skipped"


@dataclass
class SmokeCheck:
    check_id: str
    label: str
    method: str
    path: str
    status: str
    duration_ms: int
    http_status: int | None
    message: str
    details: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "check_id": self.check_id,
            "label": self.label,
            "method": self.method,
            "path": self.path,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "http_status": self.http_status,
            "message": self.message,
            "details": self.details,
        }


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_generated_at(value: str | None) -> str:
    if value and value.strip():
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    return _utc_now_iso()


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CONTROL_PLANE_HOSTS": ["control.test"],
            "CONTROL_PLANE_ALLOWED_ROLES": ["platform_admin", "node_admin"],
            "CONTROL_REQUIRE_TOKEN_GRANT": False,
            "CONTROL_PLANE_JWT_AUDIENCE": "control",
        }
    )


def _manifest_stub(site_name: str, site_key: str, canonical_domain: str) -> dict[str, Any]:
    return {
        "site_key": site_key,
        "site_name": site_name,
        "tagline": site_name,
        "nav_items": [{"label": "Trust", "href": "/trust", "module": "trust"}],
        "enabled_public_modules": ["trust"],
        "footer_links": [{"label": "Privacy", "href": "/privacy"}],
        "legal_links": {"privacy": "/privacy", "terms": "/terms", "code_of_conduct": "/code-of-conduct"},
        "trust_links": {"trust_center": "/trust", "transparency": "/transparency", "archive": "/archive"},
        "contact": {"email": "operator@example.com", "public_contact_url": "/contact", "location_label": "Sydney"},
        "canonical_domains": [canonical_domain],
    }


def _seed_fixture(app) -> dict[str, Any]:
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, NodeConfig, NodeDomain, PublicArchiveRecord, PublicTrustReport, User

    with app.app_context():
        node = Node(name="Launch Smoke Node", slug="launch-smoke-node", status="active")
        db.session.add(node)
        db.session.flush()

        canonical_domain = "launch-smoke.example.com"
        db.session.add(
            NodeConfig(
                node_id=node.id,
                config_json={
                    "public_site_manifest": _manifest_stub(
                        "Launch Smoke Public Site",
                        "launch-smoke-site",
                        canonical_domain,
                    ),
                    "public_site_manifest_draft": _manifest_stub(
                        "Launch Smoke Public Site",
                        "launch-smoke-site",
                        canonical_domain,
                    ),
                    "control_operator_assignments": {"usernames": ["platform-admin"], "user_ids": []},
                },
            )
        )
        db.session.add(NodeDomain(node_id=node.id, domain=canonical_domain, status="active", tls_ready=True))

        archive_record = PublicArchiveRecord(
            slug="launch-smoke-archive-record",
            record_type="public-trust-report",
            title="Launch Smoke Archive Record",
            summary="Smoke summary record",
            node_slug=node.slug,
            visibility_class="public",
            verification_status="verified-summary",
            source_route="/transparency",
            provenance_summary="Smoke provenance",
            updated_at=datetime(2026, 4, 16, 8, 0, 0),
        )
        db.session.add(archive_record)
        db.session.flush()

        db.session.add(
            PublicTrustReport(
                slug="launch-smoke-trust-report",
                title="Launch Smoke Trust Report",
                summary="Smoke trust report",
                report_kind="integrity-brief",
                node_slug=node.slug,
                verification_status="verified-summary",
                provenance_summary="Smoke report provenance",
                archive_record_id=archive_record.id,
                metadata_json={"public_visibility": True},
            )
        )

        db.session.add(
            PublicArchiveRecord(
                slug="launch-smoke-decision-record",
                record_type="governance-decision-summary",
                title="Launch Smoke Decision Record",
                summary="Smoke decision summary record",
                node_slug=node.slug,
                visibility_class="public",
                verification_status="verified-summary",
                source_route="/governance/model-registry",
                provenance_summary="Smoke decision provenance",
                metadata_json={"decision_id": "D001"},
                updated_at=datetime(2026, 4, 16, 8, 5, 0),
            )
        )

        db.session.add(
            User(
                username="platform-admin",
                pseudonym="Platform Admin",
                email="platform-admin@example.com",
                password="hash",
                role="platform_admin",
            )
        )
        db.session.commit()

        return {
            "node_id": int(node.id),
            "canonical_domain": canonical_domain,
            "archive_slug": archive_record.slug,
        }


def _issue_control_headers(app) -> dict[str, str]:
    with app.app_context():
        token = create_access_token(
            identity="control::platform-admin",
            additional_claims={
                "aud": "control",
                "token_use": "control",
                "requires_mfa": True,
                "role": "platform_admin",
                "scp": [
                    "sites:manifest:read",
                    "sites:publish-readiness:read",
                    "sites:operator-assignments:read",
                    "sites:domains:read",
                    "sites:bootstrap:write",
                ],
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _response_message(response) -> str:
    payload = response.get_json(silent=True) if hasattr(response, "get_json") else None
    if isinstance(payload, dict):
        if payload.get("ok") is False and isinstance(payload.get("error"), dict):
            return str(payload["error"].get("message") or "request failed")
        if payload.get("ok") is True:
            return "ok"
    return f"http_{response.status_code}"


def _run_check(
    *,
    check_id: str,
    label: str,
    method: str,
    path: str,
    client,
    expected_statuses: set[int],
    headers: dict[str, str] | None = None,
    base_url: str | None = None,
    json_payload: dict[str, Any] | None = None,
    enabled: bool = True,
    skip_reason: str = "check not configured",
    validator=None,
) -> SmokeCheck:
    if not enabled:
        return SmokeCheck(
            check_id=check_id,
            label=label,
            method=method,
            path=path,
            status=SKIPPED,
            duration_ms=0,
            http_status=None,
            message=skip_reason,
            details={"skip_reason": skip_reason},
        )

    started = perf_counter()
    response = client.open(
        path=path,
        method=method,
        headers=headers,
        base_url=base_url,
        json=json_payload,
    )
    duration_ms = int((perf_counter() - started) * 1000)
    http_status = int(response.status_code)
    passed = http_status in expected_statuses
    message = _response_message(response)
    details: dict[str, Any] = {"expected_statuses": sorted(expected_statuses)}

    if passed and callable(validator):
        passed, validator_message, validator_details = validator(response)
        if validator_message:
            message = validator_message
        if isinstance(validator_details, dict):
            details.update(validator_details)

    if not passed:
        details["response_preview"] = (response.get_data(as_text=True) or "")[:300]

    return SmokeCheck(
        check_id=check_id,
        label=label,
        method=method,
        path=path,
        status=PASSED if passed else FAILED,
        duration_ms=duration_ms,
        http_status=http_status,
        message=message,
        details=details,
    )


def _summarize(checks: list[SmokeCheck]) -> dict[str, Any]:
    passed_count = sum(1 for check in checks if check.status == PASSED)
    failed_count = sum(1 for check in checks if check.status == FAILED)
    skipped_count = sum(1 for check in checks if check.status == SKIPPED)
    return {
        "total": len(checks),
        "passed": passed_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "all_passed": failed_count == 0 and passed_count > 0,
    }


def run_launch_smoke(
    *,
    generated_at: str | None = None,
    control_host: str = "control.test",
    include_control_checks: bool = True,
    include_bootstrap_mutation: bool = True,
) -> dict[str, Any]:
    app = _build_app()
    fixture = _seed_fixture(app)
    control_headers = _issue_control_headers(app)
    node_id = int(fixture["node_id"])
    canonical_domain = str(fixture["canonical_domain"])
    archive_slug = str(fixture["archive_slug"])

    def _white_label_validator(response):
        payload = response.get_json(silent=True) or {}
        data = payload.get("data") if isinstance(payload, dict) else {}
        resolved = bool(data.get("resolved"))
        return (
            resolved,
            "resolved" if resolved else "host did not resolve",
            {"resolved": resolved, "node_slug": data.get("node_slug")},
        )

    checks: list[SmokeCheck] = []
    with app.test_client() as client:
        checks.append(
            _run_check(
                check_id="public_archive_list_route",
                label="Public archive list route",
                method="GET",
                path="/public/archive/records?page=1&page_size=5",
                client=client,
                expected_statuses={200},
            )
        )
        checks.append(
            _run_check(
                check_id="public_archive_record_detail_route",
                label="Public archive record detail route",
                method="GET",
                path=f"/public/archive-handoffs/{archive_slug}",
                client=client,
                expected_statuses={200},
            )
        )
        checks.append(
            _run_check(
                check_id="public_trust_decisions_route",
                label="Public trust decisions route",
                method="GET",
                path="/public/trust/decisions?limit=5",
                client=client,
                expected_statuses={200},
            )
        )
        checks.append(
            _run_check(
                check_id="white_label_public_host_resolution",
                label="White-label public host resolution",
                method="GET",
                path=f"/api/public/sites/resolve?host={canonical_domain}",
                client=client,
                expected_statuses={200},
                validator=_white_label_validator,
            )
        )
        checks.append(
            _run_check(
                check_id="control_manifest_authoring_read_path",
                label="Control manifest authoring read path",
                method="GET",
                path=f"/api/control/sites/{node_id}/manifest-authoring",
                client=client,
                expected_statuses={200},
                headers=control_headers,
                base_url=f"http://{control_host}",
                enabled=include_control_checks,
                skip_reason="control checks disabled/not-configured for this run",
            )
        )
        checks.append(
            _run_check(
                check_id="control_publish_readiness_path",
                label="Control publish-readiness path",
                method="GET",
                path=f"/api/control/sites/{node_id}/publish-readiness",
                client=client,
                expected_statuses={200},
                headers=control_headers,
                base_url=f"http://{control_host}",
                enabled=include_control_checks,
                skip_reason="control checks disabled/not-configured for this run",
            )
        )
        checks.append(
            _run_check(
                check_id="control_operator_assignments_api_availability",
                label="Control operator assignment API availability",
                method="GET",
                path=f"/api/control/sites/{node_id}/operator-assignments",
                client=client,
                expected_statuses={200},
                headers=control_headers,
                base_url=f"http://{control_host}",
                enabled=include_control_checks,
                skip_reason="control checks disabled/not-configured for this run",
            )
        )
        checks.append(
            _run_check(
                check_id="control_domain_bindings_api_availability",
                label="Control domain bindings API availability",
                method="GET",
                path=f"/api/control/sites/{node_id}/domain-bindings",
                client=client,
                expected_statuses={200},
                headers=control_headers,
                base_url=f"http://{control_host}",
                enabled=include_control_checks,
                skip_reason="control checks disabled/not-configured for this run",
            )
        )
        checks.append(
            _run_check(
                check_id="control_bootstrap_api_availability",
                label="Control bootstrap API availability",
                method="POST",
                path="/api/control/sites/bootstrap",
                client=client,
                expected_statuses={201},
                headers=control_headers,
                base_url=f"http://{control_host}",
                json_payload={
                    "node_name": "Launch Smoke Bootstrap Node",
                    "node_slug": "launch-smoke-bootstrap",
                    "site_name": "Launch Smoke Bootstrap Site",
                    "site_key": "launch-smoke-bootstrap-site",
                },
                enabled=include_control_checks and include_bootstrap_mutation,
                skip_reason=(
                    "bootstrap mutation disabled/not-configured for this run"
                    if include_control_checks
                    else "control checks disabled/not-configured for this run"
                ),
            )
        )

    summary = _summarize(checks)
    return {
        "contract_version": LAUNCH_SMOKE_CONTRACT_VERSION,
        "generated_at": _parse_generated_at(generated_at),
        "environment": {
            "runtime": "in-memory-flask",
            "control_host": control_host,
            "include_control_checks": include_control_checks,
            "include_bootstrap_mutation": include_bootstrap_mutation,
        },
        "checks": [check.to_dict() for check in checks],
        "summary": summary,
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-smoke",
    }


def render_launch_smoke_markdown(summary: dict[str, Any]) -> str:
    counts = summary.get("summary") if isinstance(summary.get("summary"), dict) else {}
    lines: list[str] = []
    lines.append("# Launch RC Smoke Summary")
    lines.append("")
    lines.append(f"- Contract version: `{summary.get('contract_version')}`")
    lines.append(f"- Generated at (UTC): `{summary.get('generated_at')}`")
    lines.append(f"- Total checks: `{counts.get('total', 0)}`")
    lines.append(f"- Passed: `{counts.get('passed', 0)}`")
    lines.append(f"- Failed: `{counts.get('failed', 0)}`")
    lines.append(f"- Skipped: `{counts.get('skipped', 0)}`")
    lines.append(f"- launch_readiness_claim: `{summary.get('launch_readiness_claim')}`")
    lines.append("")
    lines.append("| check_id | status | method | path | http_status | message |")
    lines.append("|---|---|---|---|---:|---|")
    for check in summary.get("checks") or []:
        check_obj = check if isinstance(check, dict) else {}
        lines.append(
            "| `{}` | {} | {} | `{}` | {} | {} |".format(
                check_obj.get("check_id"),
                check_obj.get("status"),
                check_obj.get("method"),
                check_obj.get("path"),
                check_obj.get("http_status") if check_obj.get("http_status") is not None else "_n/a_",
                str(check_obj.get("message") or "").replace("|", "\\|"),
            )
        )
    lines.append("")
    lines.append(
        "> This is a release-candidate smoke layer only; it does not auto-claim launch readiness and does not replace full QA."
    )
    lines.append("")
    return "\n".join(lines)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run ANU release-candidate launch smoke checks.")
    parser.add_argument("--generated-at", default=None, help="ISO timestamp override for deterministic generation")
    parser.add_argument("--control-host", default="control.test", help="Control host for control-plane checks")
    parser.add_argument(
        "--skip-control-checks",
        action="store_true",
        help="Mark all control-plane checks as skipped/not-configured",
    )
    parser.add_argument(
        "--skip-bootstrap-mutation",
        action="store_true",
        help="Mark bootstrap API mutation check as skipped/not-configured",
    )
    parser.add_argument("--output-json", default=None, help="Optional path to write machine-readable summary JSON")
    parser.add_argument("--output-md", default=None, help="Optional path to write markdown summary")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    summary = run_launch_smoke(
        generated_at=args.generated_at,
        control_host=str(args.control_host or "control.test"),
        include_control_checks=not bool(args.skip_control_checks),
        include_bootstrap_mutation=not bool(args.skip_bootstrap_mutation),
    )
    markdown = render_launch_smoke_markdown(summary)

    if args.output_json:
        output_json_path = Path(args.output_json).resolve()
        output_json_path.parent.mkdir(parents=True, exist_ok=True)
        output_json_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.output_md:
        output_md_path = Path(args.output_md).resolve()
        output_md_path.parent.mkdir(parents=True, exist_ok=True)
        output_md_path.write_text(markdown, encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False))
    failed_count = int((summary.get("summary") or {}).get("failed", 0))
    return 0 if failed_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
