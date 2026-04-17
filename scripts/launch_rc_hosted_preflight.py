#!/usr/bin/env python3
"""ANU-LAUNCH-003: hosted smoke preflight and attachment-reference validation."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


PREFLIGHT_CONTRACT_VERSION = "anu-launch-preflight.v1"
ATTACHMENT_VALIDATION_CONTRACT_VERSION = "anu-launch-attachment-validation.v1"

VALID = "valid"
INVALID = "invalid"
MISSING = "missing"
SKIPPED_BY_MODE = "skipped-by-mode"


@dataclass
class PreflightCheck:
    field: str
    required: bool
    status: str
    message: str
    value_preview: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "field": self.field,
            "required": self.required,
            "status": self.status,
            "message": self.message,
            "value_preview": self.value_preview,
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


def _preview(value: str | int | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text[:100]


def _is_valid_http_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_valid_host(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9.-]+", value)) and "." in value


def _is_valid_slug(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", value))


def _is_valid_site_id(value: str) -> bool:
    return value.isdigit() and int(value) > 0


def run_hosted_preflight(
    *,
    generated_at: str | None = None,
    include_control_checks: bool,
    public_base_url: str | None,
    public_host_for_resolution: str | None,
    archive_record_slug: str | None,
    control_base_url: str | None,
    control_site_id: str | int | None,
    control_auth_header: str | None,
    control_auth_source: str | None = None,
) -> dict[str, Any]:
    checks: list[PreflightCheck] = []

    public_url = str(public_base_url or "").strip()
    if not public_url:
        checks.append(PreflightCheck("public_base_url", True, MISSING, "public base URL is required", None))
    elif not _is_valid_http_url(public_url):
        checks.append(PreflightCheck("public_base_url", True, INVALID, "public base URL must be http(s)", _preview(public_url)))
    else:
        checks.append(PreflightCheck("public_base_url", True, VALID, "configured", _preview(public_url)))

    resolve_host = str(public_host_for_resolution or "").strip()
    if not resolve_host:
        checks.append(PreflightCheck("public_host_for_resolution", True, MISSING, "resolve host is required", None))
    elif not _is_valid_host(resolve_host):
        checks.append(
            PreflightCheck(
                "public_host_for_resolution",
                True,
                INVALID,
                "resolve host format is invalid",
                _preview(resolve_host),
            )
        )
    else:
        checks.append(PreflightCheck("public_host_for_resolution", True, VALID, "configured", _preview(resolve_host)))

    archive_slug = str(archive_record_slug or "").strip()
    if not archive_slug:
        checks.append(PreflightCheck("archive_record_slug", True, MISSING, "archive slug is required", None))
    elif not _is_valid_slug(archive_slug):
        checks.append(PreflightCheck("archive_record_slug", True, INVALID, "archive slug format is invalid", _preview(archive_slug)))
    else:
        checks.append(PreflightCheck("archive_record_slug", True, VALID, "configured", _preview(archive_slug)))

    control_required = bool(include_control_checks)

    def _append_control_check(field: str, value: str | int | None, validator, missing_message: str, invalid_message: str):
        if not control_required:
            checks.append(PreflightCheck(field, False, SKIPPED_BY_MODE, "control checks disabled by mode", _preview(value)))
            return
        text = str(value).strip() if value is not None else ""
        if not text:
            checks.append(PreflightCheck(field, True, MISSING, missing_message, None))
            return
        if not validator(text):
            checks.append(PreflightCheck(field, True, INVALID, invalid_message, _preview(text)))
            return
        checks.append(PreflightCheck(field, True, VALID, "configured", _preview(text)))

    _append_control_check(
        "control_base_url",
        control_base_url,
        _is_valid_http_url,
        "control base URL is required when control checks are enabled",
        "control base URL must be http(s)",
    )
    _append_control_check(
        "control_site_id",
        control_site_id,
        _is_valid_site_id,
        "control site id is required when control checks are enabled",
        "control site id must be a positive integer",
    )

    auth_source = str(control_auth_source or "").strip()
    auth_header = str(control_auth_header or "").strip()
    if not control_required:
        checks.append(
            PreflightCheck(
                "control_auth_source",
                False,
                SKIPPED_BY_MODE,
                "control checks disabled by mode",
                _preview(auth_source or ("direct_header" if auth_header else "")),
            )
        )
    elif not auth_header:
        checks.append(
            PreflightCheck(
                "control_auth_source",
                True,
                MISSING,
                "auth header or auth env source is required when control checks are enabled",
                _preview(auth_source),
            )
        )
    else:
        checks.append(
            PreflightCheck(
                "control_auth_source",
                True,
                VALID,
                "configured",
                _preview(auth_source or "direct_header"),
            )
        )

    summary_counts = {
        VALID: sum(1 for item in checks if item.status == VALID),
        INVALID: sum(1 for item in checks if item.status == INVALID),
        MISSING: sum(1 for item in checks if item.status == MISSING),
        SKIPPED_BY_MODE: sum(1 for item in checks if item.status == SKIPPED_BY_MODE),
    }
    blocking = [item for item in checks if item.required and item.status in {INVALID, MISSING}]
    valid_for_execution = len(blocking) == 0

    return {
        "contract_version": PREFLIGHT_CONTRACT_VERSION,
        "generated_at": _parse_generated_at(generated_at),
        "mode": {"include_control_checks": control_required},
        "checks": [item.to_dict() for item in checks],
        "summary": {
            "total": len(checks),
            "valid": summary_counts[VALID],
            "invalid": summary_counts[INVALID],
            "missing": summary_counts[MISSING],
            "skipped_by_mode": summary_counts[SKIPPED_BY_MODE],
            "valid_for_execution": valid_for_execution,
        },
        "blocking_fields": [item.field for item in blocking],
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-preflight",
    }


def render_hosted_preflight_markdown(summary: dict[str, Any]) -> str:
    counts = summary.get("summary") if isinstance(summary.get("summary"), dict) else {}
    lines: list[str] = []
    lines.append("# Hosted Smoke Preflight")
    lines.append("")
    lines.append(f"- Contract version: `{summary.get('contract_version')}`")
    lines.append(f"- Generated at (UTC): `{summary.get('generated_at')}`")
    lines.append(f"- valid_for_execution: `{counts.get('valid_for_execution')}`")
    lines.append(f"- valid: `{counts.get('valid', 0)}`")
    lines.append(f"- invalid: `{counts.get('invalid', 0)}`")
    lines.append(f"- missing: `{counts.get('missing', 0)}`")
    lines.append(f"- skipped_by_mode: `{counts.get('skipped_by_mode', 0)}`")
    lines.append("")
    lines.append("| field | required | status | message | value_preview |")
    lines.append("|---|---|---|---|---|")
    for item in summary.get("checks") or []:
        check = item if isinstance(item, dict) else {}
        lines.append(
            "| `{}` | {} | {} | {} | `{}` |".format(
                check.get("field"),
                check.get("required"),
                check.get("status"),
                str(check.get("message") or "").replace("|", "\\|"),
                check.get("value_preview") or "",
            )
        )
    lines.append("")
    lines.append("> Preflight validates hosted proof inputs only; it does not approve launch readiness.")
    lines.append("")
    return "\n".join(lines)


def validate_attachment_references(
    *,
    generated_at: str | None = None,
    bundle_dir: Path,
    attachments_manifest: dict[str, Any],
) -> dict[str, Any]:
    screenshots = attachments_manifest.get("screenshots") if isinstance(attachments_manifest, dict) else []
    recordings = attachments_manifest.get("recordings") if isinstance(attachments_manifest, dict) else []
    operator_notes = attachments_manifest.get("operator_notes") if isinstance(attachments_manifest, dict) else []

    checks: list[dict[str, Any]] = []

    def _validate_items(items: list[Any], kind: str):
        for item in items:
            obj = item if isinstance(item, dict) else {}
            path_text = str(obj.get("path") or "").strip().replace("\\", "/")
            check_id = str(obj.get("id") or f"{kind}-unknown")
            if not path_text:
                checks.append(
                    {
                        "id": check_id,
                        "kind": kind,
                        "path": path_text,
                        "status": INVALID,
                        "message": "attachment path missing",
                    }
                )
                continue
            attachment_path = (bundle_dir / path_text).resolve()
            try:
                in_bundle = attachment_path.is_relative_to(bundle_dir.resolve())
            except Exception:
                in_bundle = str(attachment_path).startswith(str(bundle_dir.resolve()))
            if not in_bundle:
                checks.append(
                    {
                        "id": check_id,
                        "kind": kind,
                        "path": path_text,
                        "status": INVALID,
                        "message": "attachment path escapes bundle directory",
                    }
                )
                continue
            if attachment_path.exists() and attachment_path.is_file():
                checks.append(
                    {
                        "id": check_id,
                        "kind": kind,
                        "path": path_text,
                        "status": VALID,
                        "message": "attachment file exists",
                    }
                )
            else:
                checks.append(
                    {
                        "id": check_id,
                        "kind": kind,
                        "path": path_text,
                        "status": MISSING,
                        "message": "attachment file missing",
                    }
                )

    _validate_items(screenshots if isinstance(screenshots, list) else [], "screenshot")
    _validate_items(recordings if isinstance(recordings, list) else [], "recording")

    notes_count = len([note for note in operator_notes if str(note).strip()]) if isinstance(operator_notes, list) else 0
    operator_notes_status = VALID if notes_count > 0 else MISSING

    counts = {
        VALID: sum(1 for item in checks if item.get("status") == VALID),
        INVALID: sum(1 for item in checks if item.get("status") == INVALID),
        MISSING: sum(1 for item in checks if item.get("status") == MISSING),
    }
    return {
        "contract_version": ATTACHMENT_VALIDATION_CONTRACT_VERSION,
        "generated_at": _parse_generated_at(generated_at),
        "checks": checks,
        "operator_notes": {
            "status": operator_notes_status,
            "notes_count": notes_count,
            "message": "operator notes present" if notes_count > 0 else "operator notes missing",
        },
        "summary": {
            "total": len(checks),
            "valid": counts[VALID],
            "invalid": counts[INVALID],
            "missing": counts[MISSING],
            "screenshots_total": len(screenshots if isinstance(screenshots, list) else []),
            "recordings_total": len(recordings if isinstance(recordings, list) else []),
        },
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-attachment-validation",
    }


def render_attachment_validation_markdown(summary: dict[str, Any]) -> str:
    counts = summary.get("summary") if isinstance(summary.get("summary"), dict) else {}
    notes = summary.get("operator_notes") if isinstance(summary.get("operator_notes"), dict) else {}
    lines: list[str] = []
    lines.append("# Hosted Attachment Validation")
    lines.append("")
    lines.append(f"- Contract version: `{summary.get('contract_version')}`")
    lines.append(f"- Generated at (UTC): `{summary.get('generated_at')}`")
    lines.append(f"- valid: `{counts.get('valid', 0)}`")
    lines.append(f"- invalid: `{counts.get('invalid', 0)}`")
    lines.append(f"- missing: `{counts.get('missing', 0)}`")
    lines.append(f"- operator_notes_status: `{notes.get('status')}`")
    lines.append(f"- operator_notes_count: `{notes.get('notes_count', 0)}`")
    lines.append("")
    lines.append("| id | kind | status | path | message |")
    lines.append("|---|---|---|---|---|")
    for item in summary.get("checks") or []:
        check = item if isinstance(item, dict) else {}
        lines.append(
            "| `{}` | {} | {} | `{}` | {} |".format(
                check.get("id"),
                check.get("kind"),
                check.get("status"),
                check.get("path") or "",
                str(check.get("message") or "").replace("|", "\\|"),
            )
        )
    lines.append("")
    lines.append("> Attachment validation reports evidence-file presence only; it does not approve launch readiness.")
    lines.append("")
    return "\n".join(lines)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run ANU hosted preflight validation.")
    parser.add_argument("--generated-at", default=None)
    parser.add_argument("--public-base-url", default=None)
    parser.add_argument("--public-host-for-resolution", default=None)
    parser.add_argument("--archive-record-slug", default=None)
    parser.add_argument("--control-base-url", default=None)
    parser.add_argument("--control-site-id", default=None)
    parser.add_argument("--control-auth-header", default=None)
    parser.add_argument("--control-auth-source", default=None)
    parser.add_argument("--skip-control-checks", action="store_true")
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    summary = run_hosted_preflight(
        generated_at=args.generated_at,
        include_control_checks=not bool(args.skip_control_checks),
        public_base_url=args.public_base_url,
        public_host_for_resolution=args.public_host_for_resolution,
        archive_record_slug=args.archive_record_slug,
        control_base_url=args.control_base_url,
        control_site_id=args.control_site_id,
        control_auth_header=args.control_auth_header,
        control_auth_source=args.control_auth_source,
    )
    print(json.dumps(summary, ensure_ascii=False))
    valid_for_execution = bool((summary.get("summary") or {}).get("valid_for_execution"))
    return 0 if valid_for_execution else 2


if __name__ == "__main__":
    raise SystemExit(main())
