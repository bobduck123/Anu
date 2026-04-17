#!/usr/bin/env python3
"""ANU-LAUNCH-002: hosted release-candidate smoke checks for critical ANU paths."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Callable
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request


LAUNCH_HOSTED_SMOKE_CONTRACT_VERSION = "anu-launch-smoke-hosted.v1"
PASSED = "passed"
FAILED = "failed"
SKIPPED = "skipped"


@dataclass
class HttpResponse:
    status_code: int | None
    body_text: str
    error: str | None = None


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


RequestRunner = Callable[[str, str, dict[str, str], dict[str, Any] | None, int], HttpResponse]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_generated_at(value: str | None) -> str:
    if value and value.strip():
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    return _utc_now_iso()


def _clean_base_url(value: str | None) -> str:
    text = str(value or "").strip()
    return text.rstrip("/")


def _parse_site_id(value: str | int | None) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if not text.isdigit():
        return None
    return int(text)


def _default_request_runner(
    method: str,
    url: str,
    headers: dict[str, str],
    json_payload: dict[str, Any] | None,
    timeout_seconds: int,
) -> HttpResponse:
    body: bytes | None = None
    merged_headers = {"Accept": "application/json", **headers}
    if json_payload is not None:
        body = json.dumps(json_payload).encode("utf-8")
        merged_headers["Content-Type"] = "application/json"
    request = urllib_request.Request(url=url, data=body, method=method, headers=merged_headers)
    try:
        with urllib_request.urlopen(request, timeout=max(1, int(timeout_seconds))) as response:
            status_code = int(getattr(response, "status", 0) or response.getcode())
            payload = response.read().decode("utf-8", errors="replace")
            return HttpResponse(status_code=status_code, body_text=payload, error=None)
    except urllib_error.HTTPError as exc:
        payload = ""
        try:
            payload = exc.read().decode("utf-8", errors="replace")
        except Exception:
            payload = ""
        return HttpResponse(status_code=int(exc.code), body_text=payload, error=None)
    except Exception as exc:  # pragma: no cover - network/ssl/env dependent
        return HttpResponse(status_code=None, body_text="", error=str(exc))


def _parse_body_json(text: str) -> dict[str, Any]:
    if not text.strip():
        return {}
    try:
        payload = json.loads(text)
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def _response_message(response: HttpResponse) -> str:
    if response.error:
        return f"request_failed: {response.error}"
    payload = _parse_body_json(response.body_text)
    if payload.get("ok") is False and isinstance(payload.get("error"), dict):
        return str(payload["error"].get("message") or "request failed")
    if payload.get("ok") is True:
        return "ok"
    if response.status_code is not None:
        return f"http_{response.status_code}"
    return "request_failed"


def _run_check(
    *,
    check_id: str,
    label: str,
    method: str,
    path: str,
    target_base_url: str,
    expected_statuses: set[int],
    headers: dict[str, str] | None = None,
    json_payload: dict[str, Any] | None = None,
    enabled: bool = True,
    skip_reason: str = "check not configured",
    timeout_seconds: int = 12,
    request_runner: RequestRunner = _default_request_runner,
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
    if not target_base_url:
        return SmokeCheck(
            check_id=check_id,
            label=label,
            method=method,
            path=path,
            status=SKIPPED,
            duration_ms=0,
            http_status=None,
            message="target base URL not configured",
            details={"skip_reason": "target base URL not configured"},
        )

    full_url = f"{target_base_url}{path}"
    started = perf_counter()
    response = request_runner(
        method,
        full_url,
        headers or {},
        json_payload,
        timeout_seconds,
    )
    duration_ms = int((perf_counter() - started) * 1000)
    http_status = response.status_code
    passed = http_status in expected_statuses
    message = _response_message(response)
    details: dict[str, Any] = {
        "expected_statuses": sorted(expected_statuses),
        "target_url": full_url,
    }

    if passed and callable(validator):
        passed, validator_message, validator_details = validator(response)
        if validator_message:
            message = validator_message
        if isinstance(validator_details, dict):
            details.update(validator_details)

    if not passed:
        details["response_preview"] = response.body_text[:300]
        if response.error:
            details["request_error"] = response.error

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


def run_hosted_launch_smoke(
    *,
    generated_at: str | None = None,
    public_base_url: str,
    public_host_for_resolution: str | None = None,
    archive_record_slug: str | None = None,
    control_base_url: str | None = None,
    control_site_id: str | int | None = None,
    control_auth_header: str | None = None,
    control_plane_secret_header: str | None = None,
    include_control_checks: bool = True,
    include_bootstrap_mutation: bool = False,
    timeout_seconds: int = 12,
    request_runner: RequestRunner = _default_request_runner,
) -> dict[str, Any]:
    public_url = _clean_base_url(public_base_url)
    control_url = _clean_base_url(control_base_url)
    site_id = _parse_site_id(control_site_id)
    auth_header = str(control_auth_header or "").strip()
    control_plane_secret = str(control_plane_secret_header or "").strip()

    checks: list[SmokeCheck] = []

    def _white_label_validator(response: HttpResponse):
        payload = _parse_body_json(response.body_text)
        data = payload.get("data") if isinstance(payload, dict) else {}
        resolved = bool(data.get("resolved")) if isinstance(data, dict) else False
        return (
            resolved,
            "resolved" if resolved else "host did not resolve",
            {"resolved": resolved, "node_slug": data.get("node_slug") if isinstance(data, dict) else None},
        )

    resolve_host = str(public_host_for_resolution or "").strip()
    archive_slug = str(archive_record_slug or "").strip()

    checks.append(
        _run_check(
            check_id="public_archive_list_route",
            label="Public archive list route",
            method="GET",
            path="/public/archive/records?page=1&page_size=5",
            target_base_url=public_url,
            expected_statuses={200},
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )
    checks.append(
        _run_check(
            check_id="public_archive_record_detail_route",
            label="Public archive record detail route",
            method="GET",
            path=f"/public/archive-handoffs/{archive_slug}" if archive_slug else "/public/archive-handoffs/<missing-slug>",
            target_base_url=public_url,
            expected_statuses={200},
            enabled=bool(archive_slug),
            skip_reason="archive_record_slug not configured",
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )
    checks.append(
        _run_check(
            check_id="public_trust_decisions_route",
            label="Public trust decisions route",
            method="GET",
            path="/public/trust/decisions?limit=5",
            target_base_url=public_url,
            expected_statuses={200},
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )
    checks.append(
        _run_check(
            check_id="white_label_public_host_resolution",
            label="White-label public host resolution",
            method="GET",
            path=f"/api/public/sites/resolve?host={urllib_parse.quote_plus(resolve_host)}"
            if resolve_host
            else "/api/public/sites/resolve?host=<missing-host>",
            target_base_url=public_url,
            expected_statuses={200},
            enabled=bool(resolve_host),
            skip_reason="public_host_for_resolution not configured",
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
            validator=_white_label_validator,
        )
    )

    control_enabled = bool(include_control_checks)
    control_skip_reason = "control checks disabled/not-configured for this run"
    if control_enabled and not control_url:
        control_enabled = False
        control_skip_reason = "control_base_url not configured"
    if control_enabled and site_id is None:
        control_enabled = False
        control_skip_reason = "control_site_id not configured"
    if control_enabled and not auth_header:
        control_enabled = False
        control_skip_reason = "control_auth_header not configured"

    control_headers: dict[str, str] = {}
    if auth_header:
        control_headers["Authorization"] = auth_header
    if control_plane_secret:
        control_headers["X-Control-Plane-Secret"] = control_plane_secret
    site_id_fragment = str(site_id) if site_id is not None else "<missing-site-id>"

    checks.append(
        _run_check(
            check_id="control_manifest_authoring_read_path",
            label="Control manifest authoring read path",
            method="GET",
            path=f"/api/control/sites/{site_id_fragment}/manifest-authoring",
            target_base_url=control_url,
            expected_statuses={200},
            headers=control_headers,
            enabled=control_enabled,
            skip_reason=control_skip_reason,
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )
    checks.append(
        _run_check(
            check_id="control_publish_readiness_path",
            label="Control publish-readiness path",
            method="GET",
            path=f"/api/control/sites/{site_id_fragment}/publish-readiness",
            target_base_url=control_url,
            expected_statuses={200},
            headers=control_headers,
            enabled=control_enabled,
            skip_reason=control_skip_reason,
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )
    checks.append(
        _run_check(
            check_id="control_operator_assignments_api_availability",
            label="Control operator assignment API availability",
            method="GET",
            path=f"/api/control/sites/{site_id_fragment}/operator-assignments",
            target_base_url=control_url,
            expected_statuses={200},
            headers=control_headers,
            enabled=control_enabled,
            skip_reason=control_skip_reason,
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )
    checks.append(
        _run_check(
            check_id="control_domain_bindings_api_availability",
            label="Control domain bindings API availability",
            method="GET",
            path=f"/api/control/sites/{site_id_fragment}/domain-bindings",
            target_base_url=control_url,
            expected_statuses={200},
            headers=control_headers,
            enabled=control_enabled,
            skip_reason=control_skip_reason,
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )

    bootstrap_payload = (
        {
            "node_name": "Hosted Launch Smoke Bootstrap Node",
            "node_slug": "hosted-launch-smoke-bootstrap",
            "site_name": "Hosted Launch Smoke Bootstrap Site",
            "site_key": "hosted-launch-smoke-bootstrap-site",
        }
        if include_bootstrap_mutation
        else {}
    )
    bootstrap_expected_statuses = {201, 409} if include_bootstrap_mutation else {400, 422}
    bootstrap_skip_reason = control_skip_reason
    if control_enabled and not include_bootstrap_mutation:
        bootstrap_skip_reason = "bootstrap mutation disabled; running validation-only availability probe"

    checks.append(
        _run_check(
            check_id="control_bootstrap_api_availability",
            label="Control bootstrap API availability",
            method="POST",
            path="/api/control/sites/bootstrap",
            target_base_url=control_url,
            expected_statuses=bootstrap_expected_statuses,
            headers=control_headers,
            json_payload=bootstrap_payload,
            enabled=control_enabled,
            skip_reason=bootstrap_skip_reason,
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
        )
    )

    summary = _summarize(checks)
    return {
        "contract_version": LAUNCH_HOSTED_SMOKE_CONTRACT_VERSION,
        "generated_at": _parse_generated_at(generated_at),
        "environment": {
            "runtime": "hosted-http",
            "public_base_url": public_url,
            "public_host_for_resolution": resolve_host or None,
            "archive_record_slug": archive_slug or None,
            "control_base_url": control_url or None,
            "control_site_id": site_id,
            "control_auth_header_configured": bool(auth_header),
            "include_control_checks": include_control_checks,
            "include_bootstrap_mutation": include_bootstrap_mutation,
            "timeout_seconds": int(timeout_seconds),
        },
        "checks": [check.to_dict() for check in checks],
        "summary": summary,
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-smoke",
    }


def render_hosted_launch_smoke_markdown(summary: dict[str, Any]) -> str:
    counts = summary.get("summary") if isinstance(summary.get("summary"), dict) else {}
    environment = summary.get("environment") if isinstance(summary.get("environment"), dict) else {}
    lines: list[str] = []
    lines.append("# Hosted Launch RC Smoke Summary")
    lines.append("")
    lines.append(f"- Contract version: `{summary.get('contract_version')}`")
    lines.append(f"- Generated at (UTC): `{summary.get('generated_at')}`")
    lines.append(f"- public_base_url: `{environment.get('public_base_url')}`")
    lines.append(f"- control_base_url: `{environment.get('control_base_url')}`")
    lines.append(f"- control_site_id: `{environment.get('control_site_id')}`")
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
        "> Hosted smoke is a release-candidate evidence layer only; it does not auto-claim launch readiness and does not replace full QA."
    )
    lines.append("")
    return "\n".join(lines)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run ANU hosted release-candidate launch smoke checks.")
    parser.add_argument("--generated-at", default=None, help="ISO timestamp override for deterministic generation")
    parser.add_argument("--public-base-url", required=True, help="Hosted public base URL, e.g. https://anu.example")
    parser.add_argument(
        "--public-host-for-resolution",
        default=None,
        help="Host value passed to /api/public/sites/resolve?host=...",
    )
    parser.add_argument("--archive-record-slug", default=None, help="Archive slug used by public detail route check")
    parser.add_argument("--control-base-url", default=None, help="Hosted control base URL")
    parser.add_argument("--control-site-id", default=None, help="Control site/node id for control checks")
    parser.add_argument(
        "--control-auth-header",
        default=None,
        help="Authorization header value for hosted control checks, e.g. Bearer <token>",
    )
    parser.add_argument(
        "--control-auth-header-env",
        default=None,
        help="Environment variable containing control auth header value",
    )
    parser.add_argument(
        "--control-plane-secret-header",
        default=None,
        help="X-Control-Plane-Secret header value for hosted control checks",
    )
    parser.add_argument(
        "--control-plane-secret-header-env",
        default=None,
        help="Environment variable containing control-plane shared secret header value",
    )
    parser.add_argument(
        "--skip-control-checks",
        action="store_true",
        help="Mark control-plane checks as skipped/not-configured",
    )
    parser.add_argument(
        "--enable-bootstrap-mutation",
        action="store_true",
        help="Enable real bootstrap mutation check (default is validation-only probe)",
    )
    parser.add_argument("--timeout-seconds", type=int, default=12, help="HTTP timeout in seconds")
    parser.add_argument("--output-json", default=None, help="Optional output path for summary JSON")
    parser.add_argument("--output-md", default=None, help="Optional output path for summary markdown")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    control_auth_header = str(args.control_auth_header or "").strip()
    auth_env_name = str(args.control_auth_header_env or "").strip()
    control_plane_secret_header = str(args.control_plane_secret_header or "").strip()
    control_plane_secret_env_name = str(args.control_plane_secret_header_env or "").strip()
    if not control_auth_header and auth_env_name:
        import os

        control_auth_header = str(os.environ.get(auth_env_name, "")).strip()
    if not control_plane_secret_header and control_plane_secret_env_name:
        import os

        control_plane_secret_header = str(os.environ.get(control_plane_secret_env_name, "")).strip()

    summary = run_hosted_launch_smoke(
        generated_at=args.generated_at,
        public_base_url=str(args.public_base_url),
        public_host_for_resolution=args.public_host_for_resolution,
        archive_record_slug=args.archive_record_slug,
        control_base_url=args.control_base_url,
        control_site_id=args.control_site_id,
        control_auth_header=control_auth_header or None,
        control_plane_secret_header=control_plane_secret_header or None,
        include_control_checks=not bool(args.skip_control_checks),
        include_bootstrap_mutation=bool(args.enable_bootstrap_mutation),
        timeout_seconds=int(args.timeout_seconds),
    )
    markdown = render_hosted_launch_smoke_markdown(summary)

    if args.output_json:
        from pathlib import Path

        json_path = Path(args.output_json).resolve()
        json_path.parent.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.output_md:
        from pathlib import Path

        md_path = Path(args.output_md).resolve()
        md_path.parent.mkdir(parents=True, exist_ok=True)
        md_path.write_text(markdown, encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False))
    failed_count = int((summary.get("summary") or {}).get("failed", 0))
    return 0 if failed_count == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
