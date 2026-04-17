#!/usr/bin/env python3
"""ANU-LAUNCH-005: hosted public-route diagnosis and degraded-state annotations."""

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


HOSTED_ROUTE_DIAGNOSIS_CONTRACT_VERSION = "anu-launch-hosted-route-diagnosis.v1"
PASSED = "passed"
FAILED = "failed"
SKIPPED = "skipped"

CATEGORY_SUCCESS = "success"
CATEGORY_SKIPPED = "skipped_not_configured"
CATEGORY_DNS = "dns"
CATEGORY_TRANSPORT = "transport"
CATEGORY_TIMEOUT = "timeout"
CATEGORY_HTTP_4XX = "http_4xx"
CATEGORY_HTTP_5XX = "http_5xx"
CATEGORY_INVALID_PAYLOAD = "invalid_payload"
CATEGORY_HTTP_OTHER = "http_other"


@dataclass
class HttpResponse:
    status_code: int | None
    body_text: str
    error: str | None = None
    headers: dict[str, str] | None = None


@dataclass
class RouteDiagnosisCheck:
    check_id: str
    label: str
    method: str
    path: str
    status: str
    outcome_category: str
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
            "outcome_category": self.outcome_category,
            "duration_ms": self.duration_ms,
            "http_status": self.http_status,
            "message": self.message,
            "details": self.details,
        }


RequestRunner = Callable[[str, str, dict[str, str], int], HttpResponse]


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
    return str(value or "").strip().rstrip("/")


def _normalize_headers(raw_headers: Any) -> dict[str, str]:
    headers: dict[str, str] = {}
    if hasattr(raw_headers, "items"):
        for key, value in raw_headers.items():
            key_text = str(key or "").strip().lower()
            value_text = str(value or "").strip()
            if key_text:
                headers[key_text] = value_text
    return headers


def _default_request_runner(
    method: str,
    url: str,
    headers: dict[str, str],
    timeout_seconds: int,
) -> HttpResponse:
    request = urllib_request.Request(url=url, method=method, headers={"Accept": "application/json", **headers})
    try:
        with urllib_request.urlopen(request, timeout=max(1, int(timeout_seconds))) as response:
            status_code = int(getattr(response, "status", 0) or response.getcode())
            payload = response.read().decode("utf-8", errors="replace")
            return HttpResponse(
                status_code=status_code,
                body_text=payload,
                error=None,
                headers=_normalize_headers(getattr(response, "headers", None)),
            )
    except urllib_error.HTTPError as exc:
        payload = ""
        try:
            payload = exc.read().decode("utf-8", errors="replace")
        except Exception:
            payload = ""
        return HttpResponse(
            status_code=int(exc.code),
            body_text=payload,
            error=None,
            headers=_normalize_headers(getattr(exc, "headers", None)),
        )
    except Exception as exc:  # pragma: no cover - network/ssl/env dependent
        return HttpResponse(status_code=None, body_text="", error=str(exc), headers={})


def _parse_body_json(text: str) -> dict[str, Any]:
    if not text.strip():
        return {}
    try:
        payload = json.loads(text)
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def _extract_request_id(response: HttpResponse, payload: dict[str, Any]) -> str | None:
    headers = response.headers or {}
    header_request_id = str(headers.get("x-request-id") or "").strip()
    if header_request_id:
        return header_request_id
    payload_request_id = str(payload.get("request_id") or "").strip()
    if payload_request_id:
        return payload_request_id
    return None


def _extract_error_metadata(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    if payload.get("ok") is False and isinstance(payload.get("error"), dict):
        err = payload["error"]
        code = str(err.get("code") or "").strip() or None
        message = str(err.get("message") or "").strip() or None
        return code, message
    msg = str(payload.get("msg") or "").strip() or None
    return None, msg


def _classify_transport_error(error_text: str) -> str:
    lowered = error_text.lower()
    if "timed out" in lowered or "timeout" in lowered:
        return CATEGORY_TIMEOUT
    dns_markers = (
        "name or service not known",
        "temporary failure in name resolution",
        "nodename nor servname provided",
        "getaddrinfo failed",
        "no such host is known",
    )
    if any(marker in lowered for marker in dns_markers):
        return CATEGORY_DNS
    return CATEGORY_TRANSPORT


def _classify_outcome(
    *,
    response: HttpResponse,
    status: str,
    payload_valid: bool,
) -> str:
    if status == SKIPPED:
        return CATEGORY_SKIPPED
    if response.error:
        return _classify_transport_error(response.error)
    if response.status_code is None:
        return CATEGORY_TRANSPORT
    if 500 <= response.status_code <= 599:
        return CATEGORY_HTTP_5XX
    if 400 <= response.status_code <= 499:
        return CATEGORY_HTTP_4XX
    if 200 <= response.status_code <= 299:
        return CATEGORY_SUCCESS if payload_valid else CATEGORY_INVALID_PAYLOAD
    return CATEGORY_HTTP_OTHER


def _payload_ok_validator(response: HttpResponse) -> tuple[bool, str, dict[str, Any]]:
    payload = _parse_body_json(response.body_text)
    if payload.get("ok") is True:
        return True, "ok", {"payload_ok": True}
    if response.status_code == 200:
        return False, "payload missing ok=true", {"payload_ok": payload.get("ok")}
    return True, "ok", {"payload_ok": payload.get("ok")}


def _resolve_validator(response: HttpResponse) -> tuple[bool, str, dict[str, Any]]:
    payload = _parse_body_json(response.body_text)
    data = payload.get("data") if isinstance(payload, dict) else {}
    resolved = bool(data.get("resolved")) if isinstance(data, dict) else False
    if payload.get("ok") is True and resolved:
        return True, "resolved", {"payload_ok": True, "resolved": True}
    if response.status_code == 200:
        return False, "payload missing resolved=true", {"payload_ok": payload.get("ok"), "resolved": resolved}
    return True, "resolved", {"payload_ok": payload.get("ok"), "resolved": resolved}


def _run_probe(
    *,
    check_id: str,
    label: str,
    method: str,
    path: str,
    target_base_url: str,
    expected_statuses: set[int],
    enabled: bool,
    skip_reason: str,
    timeout_seconds: int,
    request_runner: RequestRunner,
    validator: Callable[[HttpResponse], tuple[bool, str, dict[str, Any]]] | None,
) -> RouteDiagnosisCheck:
    if not enabled:
        return RouteDiagnosisCheck(
            check_id=check_id,
            label=label,
            method=method,
            path=path,
            status=SKIPPED,
            outcome_category=CATEGORY_SKIPPED,
            duration_ms=0,
            http_status=None,
            message=skip_reason,
            details={"skip_reason": skip_reason},
        )
    if not target_base_url:
        return RouteDiagnosisCheck(
            check_id=check_id,
            label=label,
            method=method,
            path=path,
            status=SKIPPED,
            outcome_category=CATEGORY_SKIPPED,
            duration_ms=0,
            http_status=None,
            message="public_base_url not configured",
            details={"skip_reason": "public_base_url not configured"},
        )

    full_url = f"{target_base_url}{path}"
    started = perf_counter()
    response = request_runner(method, full_url, {}, timeout_seconds)
    duration_ms = int((perf_counter() - started) * 1000)
    payload = _parse_body_json(response.body_text)
    status_ok = response.status_code in expected_statuses
    payload_valid = True
    message = "ok" if status_ok else f"http_{response.status_code}" if response.status_code is not None else "request_failed"
    validator_details: dict[str, Any] = {}

    if status_ok and validator is not None:
        payload_valid, validator_message, validator_details = validator(response)
        message = validator_message
    elif response.error:
        message = f"request_failed: {response.error}"
    else:
        _, extracted_message = _extract_error_metadata(payload)
        if extracted_message:
            message = extracted_message

    status = PASSED if status_ok and payload_valid else FAILED
    outcome_category = _classify_outcome(response=response, status=status, payload_valid=payload_valid)
    error_code, error_message = _extract_error_metadata(payload)
    request_id = _extract_request_id(response, payload)
    headers = response.headers or {}
    details: dict[str, Any] = {
        "expected_statuses": sorted(expected_statuses),
        "target_url": full_url,
        "content_type": headers.get("content-type"),
        "content_length": headers.get("content-length"),
        "request_id": request_id,
        "error_code": error_code,
        "error_message": error_message,
        "payload_ok": payload.get("ok"),
    }
    details.update(validator_details)
    if status == FAILED:
        details["response_preview"] = response.body_text[:300]
        if response.error:
            details["request_error"] = response.error
    return RouteDiagnosisCheck(
        check_id=check_id,
        label=label,
        method=method,
        path=path,
        status=status,
        outcome_category=outcome_category,
        duration_ms=duration_ms,
        http_status=response.status_code,
        message=message,
        details=details,
    )


def _build_summary(checks: list[RouteDiagnosisCheck]) -> dict[str, Any]:
    passed_count = sum(1 for check in checks if check.status == PASSED)
    failed_count = sum(1 for check in checks if check.status == FAILED)
    skipped_count = sum(1 for check in checks if check.status == SKIPPED)
    categories = {
        CATEGORY_SUCCESS: sum(1 for check in checks if check.outcome_category == CATEGORY_SUCCESS),
        CATEGORY_SKIPPED: sum(1 for check in checks if check.outcome_category == CATEGORY_SKIPPED),
        CATEGORY_DNS: sum(1 for check in checks if check.outcome_category == CATEGORY_DNS),
        CATEGORY_TRANSPORT: sum(1 for check in checks if check.outcome_category == CATEGORY_TRANSPORT),
        CATEGORY_TIMEOUT: sum(1 for check in checks if check.outcome_category == CATEGORY_TIMEOUT),
        CATEGORY_HTTP_4XX: sum(1 for check in checks if check.outcome_category == CATEGORY_HTTP_4XX),
        CATEGORY_HTTP_5XX: sum(1 for check in checks if check.outcome_category == CATEGORY_HTTP_5XX),
        CATEGORY_INVALID_PAYLOAD: sum(1 for check in checks if check.outcome_category == CATEGORY_INVALID_PAYLOAD),
        CATEGORY_HTTP_OTHER: sum(1 for check in checks if check.outcome_category == CATEGORY_HTTP_OTHER),
    }
    degraded_reasons = sorted(
        category
        for category, count in categories.items()
        if count > 0 and category not in {CATEGORY_SUCCESS, CATEGORY_SKIPPED}
    )
    return {
        "total": len(checks),
        "passed": passed_count,
        "failed": failed_count,
        "skipped": skipped_count,
        "categories": categories,
        "public_surface_state": {
            "status": "degraded" if failed_count > 0 else "healthy",
            "degraded_reason_categories": degraded_reasons,
            "annotation": (
                "Public route failures are reported as observed with no coercion."
                if failed_count > 0
                else "Public routes responded within expected contract."
            ),
        },
    }


def run_hosted_route_diagnosis(
    *,
    generated_at: str | None = None,
    public_base_url: str,
    public_host_for_resolution: str | None = None,
    archive_record_slug: str | None = None,
    timeout_seconds: int = 12,
    request_runner: RequestRunner = _default_request_runner,
) -> dict[str, Any]:
    public_url = _clean_base_url(public_base_url)
    resolve_host = str(public_host_for_resolution or "").strip()
    archive_slug = str(archive_record_slug or "").strip()

    checks: list[RouteDiagnosisCheck] = []
    checks.append(
        _run_probe(
            check_id="public_archive_list_route",
            label="Public archive list route",
            method="GET",
            path="/public/archive/records?page=1&page_size=5",
            target_base_url=public_url,
            expected_statuses={200},
            enabled=True,
            skip_reason="",
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
            validator=_payload_ok_validator,
        )
    )
    checks.append(
        _run_probe(
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
            validator=_payload_ok_validator,
        )
    )
    checks.append(
        _run_probe(
            check_id="public_trust_decisions_route",
            label="Public trust decisions route",
            method="GET",
            path="/public/trust/decisions?limit=5",
            target_base_url=public_url,
            expected_statuses={200},
            enabled=True,
            skip_reason="",
            timeout_seconds=timeout_seconds,
            request_runner=request_runner,
            validator=_payload_ok_validator,
        )
    )
    checks.append(
        _run_probe(
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
            validator=_resolve_validator,
        )
    )
    summary = _build_summary(checks)
    return {
        "contract_version": HOSTED_ROUTE_DIAGNOSIS_CONTRACT_VERSION,
        "generated_at": _parse_generated_at(generated_at),
        "environment": {
            "runtime": "hosted-http",
            "public_base_url": public_url,
            "public_host_for_resolution": resolve_host or None,
            "archive_record_slug": archive_slug or None,
            "timeout_seconds": int(timeout_seconds),
        },
        "checks": [check.to_dict() for check in checks],
        "summary": summary,
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-route-diagnosis",
    }


def render_hosted_route_diagnosis_markdown(summary: dict[str, Any]) -> str:
    counts = summary.get("summary") if isinstance(summary.get("summary"), dict) else {}
    environment = summary.get("environment") if isinstance(summary.get("environment"), dict) else {}
    categories = counts.get("categories") if isinstance(counts.get("categories"), dict) else {}
    public_surface_state = counts.get("public_surface_state") if isinstance(counts.get("public_surface_state"), dict) else {}
    lines: list[str] = []
    lines.append("# Hosted Public Route Diagnosis")
    lines.append("")
    lines.append(f"- Contract version: `{summary.get('contract_version')}`")
    lines.append(f"- Generated at (UTC): `{summary.get('generated_at')}`")
    lines.append(f"- public_base_url: `{environment.get('public_base_url')}`")
    lines.append(f"- public_host_for_resolution: `{environment.get('public_host_for_resolution')}`")
    lines.append(f"- archive_record_slug: `{environment.get('archive_record_slug')}`")
    lines.append(f"- Total checks: `{counts.get('total', 0)}`")
    lines.append(f"- Passed: `{counts.get('passed', 0)}`")
    lines.append(f"- Failed: `{counts.get('failed', 0)}`")
    lines.append(f"- Skipped: `{counts.get('skipped', 0)}`")
    lines.append("")
    lines.append("## Outcome Categories")
    lines.append("")
    for category in (
        CATEGORY_DNS,
        CATEGORY_TRANSPORT,
        CATEGORY_TIMEOUT,
        CATEGORY_HTTP_4XX,
        CATEGORY_HTTP_5XX,
        CATEGORY_INVALID_PAYLOAD,
        CATEGORY_HTTP_OTHER,
        CATEGORY_SUCCESS,
        CATEGORY_SKIPPED,
    ):
        lines.append(f"- {category}: `{categories.get(category, 0)}`")
    lines.append("")
    lines.append("## Public Surface State")
    lines.append("")
    lines.append(f"- status: `{public_surface_state.get('status')}`")
    lines.append(f"- degraded_reason_categories: `{json.dumps(public_surface_state.get('degraded_reason_categories') or [])}`")
    lines.append(f"- annotation: {public_surface_state.get('annotation')}")
    lines.append("")
    lines.append("| check_id | status | outcome_category | http_status | request_id | message |")
    lines.append("|---|---|---|---:|---|---|")
    for check in summary.get("checks") or []:
        check_obj = check if isinstance(check, dict) else {}
        details = check_obj.get("details") if isinstance(check_obj.get("details"), dict) else {}
        lines.append(
            "| `{}` | {} | {} | {} | `{}` | {} |".format(
                check_obj.get("check_id"),
                check_obj.get("status"),
                check_obj.get("outcome_category"),
                check_obj.get("http_status") if check_obj.get("http_status") is not None else "_n/a_",
                details.get("request_id") or "",
                str(check_obj.get("message") or "").replace("|", "\\|"),
            )
        )
    lines.append("")
    lines.append(
        "> Diagnosis captures hosted route behavior as observed. It does not auto-approve launch readiness."
    )
    lines.append("")
    return "\n".join(lines)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run ANU hosted public-route diagnosis.")
    parser.add_argument("--generated-at", default=None, help="ISO timestamp override for deterministic generation")
    parser.add_argument("--public-base-url", required=True, help="Hosted public base URL")
    parser.add_argument("--public-host-for-resolution", default=None, help="Host for public resolve probe")
    parser.add_argument("--archive-record-slug", default=None, help="Archive record slug for detail probe")
    parser.add_argument("--timeout-seconds", type=int, default=12, help="HTTP timeout in seconds")
    parser.add_argument("--output-json", default=None, help="Optional output path for diagnosis JSON")
    parser.add_argument("--output-md", default=None, help="Optional output path for diagnosis markdown")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    summary = run_hosted_route_diagnosis(
        generated_at=args.generated_at,
        public_base_url=str(args.public_base_url),
        public_host_for_resolution=args.public_host_for_resolution,
        archive_record_slug=args.archive_record_slug,
        timeout_seconds=int(args.timeout_seconds),
    )
    markdown = render_hosted_route_diagnosis_markdown(summary)
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
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

