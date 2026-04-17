#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


ARTIFACT_VERSION = "anu-evidence.v1"


@dataclass
class CommandResult:
    command: str
    started_at: str
    finished_at: str
    duration_ms: int
    exit_code: int
    status: str
    stdout: str
    stderr: str
    category: str


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_generated_at(value: str | None) -> str:
    if value and value.strip():
        raw = value.strip()
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    return _utc_now_iso()


def _timestamp_segment(generated_at_iso: str, build_id: str | None) -> str:
    if build_id and build_id.strip():
        return re.sub(r"[^A-Za-z0-9._-]+", "-", build_id.strip())
    parsed = datetime.fromisoformat(generated_at_iso.replace("Z", "+00:00"))
    return parsed.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _slugify(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip().lower()).strip("-")
    return slug or "unnamed-slice"


def _command_category(command: str) -> str:
    text = command.lower()
    if (
        "pytest" in text
        or "vitest" in text
        or "jest" in text
        or "unittest" in text
        or " test" in text
    ):
        return "test"
    if "typecheck" in text or "tsc" in text:
        return "typecheck"
    if " build" in text:
        return "build"
    return "verification"


def _run_command(command: str, cwd: Path) -> CommandResult:
    started = datetime.now(timezone.utc)
    completed = subprocess.run(
        command,
        shell=True,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        check=False,
    )
    finished = datetime.now(timezone.utc)
    duration_ms = int((finished - started).total_seconds() * 1000)
    exit_code = int(completed.returncode)
    return CommandResult(
        command=command,
        started_at=started.isoformat(),
        finished_at=finished.isoformat(),
        duration_ms=duration_ms,
        exit_code=exit_code,
        status="passed" if exit_code == 0 else "failed",
        stdout=completed.stdout or "",
        stderr=completed.stderr or "",
        category=_command_category(command),
    )


def _safe_git_output(repo_root: Path, args: list[str]) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception:
        return None
    if result.returncode != 0:
        return None
    text = (result.stdout or "").strip()
    return text or None


def _git_revision(repo_root: Path) -> dict[str, Any]:
    return {
        "commit_sha": _safe_git_output(repo_root, ["rev-parse", "HEAD"]),
        "short_sha": _safe_git_output(repo_root, ["rev-parse", "--short", "HEAD"]),
        "branch": _safe_git_output(repo_root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    }


def _git_changed_files(repo_root: Path) -> list[str]:
    unstaged = _safe_git_output(repo_root, ["diff", "--name-only"]) or ""
    staged = _safe_git_output(repo_root, ["diff", "--name-only", "--cached"]) or ""
    paths = [line.strip() for line in (unstaged + "\n" + staged).splitlines() if line.strip()]
    return sorted(set(paths))


def _summarize_targets(results: list[CommandResult]) -> dict[str, Any]:
    targeted = [result for result in results if result.category in {"test", "typecheck", "build"}]
    counts = {"test": 0, "typecheck": 0, "build": 0}
    for item in targeted:
        counts[item.category] += 1
    return {
        "command_count": len(targeted),
        "category_counts": counts,
        "passed_count": sum(1 for item in targeted if item.exit_code == 0),
        "failed_count": sum(1 for item in targeted if item.exit_code != 0),
    }


def _build_markdown(
    *,
    milestone_or_slice: str,
    generated_at: str,
    bundle_relative_path: str,
    environment_note: str | None,
    commands: list[CommandResult],
    changed_files: list[str],
    source_docs: list[str],
    open_risks: list[str],
    human_notes: list[str],
    inferred: dict[str, Any],
    launch_smoke_summary: dict[str, Any] | None,
    hosted_preflight_summary: dict[str, Any] | None,
    hosted_launch_smoke_summary: dict[str, Any] | None,
    hosted_route_diagnosis_summary: dict[str, Any] | None,
    attachments_manifest: dict[str, Any] | None,
    attachment_validation_summary: dict[str, Any] | None,
    operator_runbook_artifact: str | None,
) -> str:
    lines: list[str] = []
    lines.append(f"# Evidence Bundle: {milestone_or_slice}")
    lines.append("")
    lines.append(f"- Artifact version: `{ARTIFACT_VERSION}`")
    lines.append(f"- Generated at (UTC): `{generated_at}`")
    lines.append(f"- Bundle path: `{bundle_relative_path}`")
    if environment_note:
        lines.append(f"- Environment note: {environment_note}")
    lines.append("")
    lines.append("## Observed Command Results (Machine-Captured)")
    lines.append("")
    lines.append("| command | category | exit_code | status | duration_ms |")
    lines.append("|---|---|---:|---|---:|")
    if commands:
        for result in commands:
            safe_command = result.command.replace("|", "\\|")
            lines.append(
                f"| `{safe_command}` | {result.category} | {result.exit_code} | {result.status} | {result.duration_ms} |"
            )
    else:
        lines.append("| _none_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |")
    lines.append("")
    lines.append("## Inferred Status (Automation-Inferred, Not Approval)")
    lines.append("")
    lines.append(f"- all_commands_succeeded: `{str(inferred['all_commands_succeeded']).lower()}`")
    lines.append(f"- failed_command_count: `{inferred['failed_command_count']}`")
    lines.append(f"- targeted_tests_summary: `{json.dumps(inferred['targeted_tests_summary'], sort_keys=True)}`")
    lines.append("")
    if launch_smoke_summary:
        smoke_counts = _coerce_object(launch_smoke_summary.get("summary"))
        lines.append("## Launch Smoke (Release-Candidate Layer)")
        lines.append("")
        lines.append(f"- checks_total: `{smoke_counts.get('total', 0)}`")
        lines.append(f"- passed: `{smoke_counts.get('passed', 0)}`")
        lines.append(f"- failed: `{smoke_counts.get('failed', 0)}`")
        lines.append(f"- skipped: `{smoke_counts.get('skipped', 0)}`")
        lines.append("- artifact: `launch_smoke.json`")
        lines.append("- artifact: `launch_smoke.md`")
        lines.append("- launch_readiness_claim: `not-set-by-automation`")
        lines.append("")
    if hosted_preflight_summary:
        preflight_counts = _coerce_object(hosted_preflight_summary.get("summary"))
        lines.append("## Hosted Preflight")
        lines.append("")
        lines.append(f"- valid_for_execution: `{preflight_counts.get('valid_for_execution')}`")
        lines.append(f"- valid: `{preflight_counts.get('valid', 0)}`")
        lines.append(f"- invalid: `{preflight_counts.get('invalid', 0)}`")
        lines.append(f"- missing: `{preflight_counts.get('missing', 0)}`")
        lines.append(f"- skipped_by_mode: `{preflight_counts.get('skipped_by_mode', 0)}`")
        lines.append("- artifact: `hosted_preflight.json`")
        lines.append("- artifact: `hosted_preflight.md`")
        lines.append("")
    if hosted_launch_smoke_summary:
        hosted_counts = _coerce_object(hosted_launch_smoke_summary.get("summary"))
        lines.append("## Hosted Launch Smoke (Release-Candidate Layer)")
        lines.append("")
        lines.append(f"- checks_total: `{hosted_counts.get('total', 0)}`")
        lines.append(f"- passed: `{hosted_counts.get('passed', 0)}`")
        lines.append(f"- failed: `{hosted_counts.get('failed', 0)}`")
        lines.append(f"- skipped: `{hosted_counts.get('skipped', 0)}`")
        lines.append("- artifact: `hosted_launch_smoke.json`")
        lines.append("- artifact: `hosted_launch_smoke.md`")
        lines.append("- launch_readiness_claim: `not-set-by-automation`")
        lines.append("")
    if hosted_route_diagnosis_summary:
        diagnosis_counts = _coerce_object(hosted_route_diagnosis_summary.get("summary"))
        public_surface_state = _coerce_object(diagnosis_counts.get("public_surface_state"))
        lines.append("## Hosted Public Route Diagnosis")
        lines.append("")
        lines.append(f"- checks_total: `{diagnosis_counts.get('total', 0)}`")
        lines.append(f"- passed: `{diagnosis_counts.get('passed', 0)}`")
        lines.append(f"- failed: `{diagnosis_counts.get('failed', 0)}`")
        lines.append(f"- skipped: `{diagnosis_counts.get('skipped', 0)}`")
        lines.append(f"- public_surface_state: `{public_surface_state.get('status')}`")
        lines.append(
            f"- degraded_reason_categories: `{json.dumps(public_surface_state.get('degraded_reason_categories') or [])}`"
        )
        lines.append("- artifact: `hosted_route_diagnosis.json`")
        lines.append("- artifact: `hosted_route_diagnosis.md`")
        lines.append("- launch_readiness_claim: `not-set-by-automation`")
        lines.append("")
    if attachments_manifest:
        summary = _coerce_object(attachments_manifest.get("summary"))
        lines.append("## Hosted Attachments")
        lines.append("")
        lines.append("- manifest: `attachments.json`")
        lines.append("- convention_dir: `attachments/`")
        lines.append(f"- screenshots: `{summary.get('screenshots_count', 0)}`")
        lines.append(f"- recordings: `{summary.get('recordings_count', 0)}`")
        lines.append("")
    if attachment_validation_summary:
        validation_counts = _coerce_object(attachment_validation_summary.get("summary"))
        operator_notes = _coerce_object(attachment_validation_summary.get("operator_notes"))
        lines.append("## Attachment Validation")
        lines.append("")
        lines.append(f"- valid: `{validation_counts.get('valid', 0)}`")
        lines.append(f"- invalid: `{validation_counts.get('invalid', 0)}`")
        lines.append(f"- missing: `{validation_counts.get('missing', 0)}`")
        lines.append(f"- operator_notes_status: `{operator_notes.get('status')}`")
        lines.append(f"- operator_notes_count: `{operator_notes.get('notes_count', 0)}`")
        lines.append("- artifact: `attachment_validation.json`")
        lines.append("- artifact: `attachment_validation.md`")
        lines.append("")
    if operator_runbook_artifact:
        lines.append("## Operator Runbook")
        lines.append("")
        lines.append(f"- artifact: `{operator_runbook_artifact}`")
        lines.append("")
    lines.append("## Changed Files (Observed/Provided)")
    lines.append("")
    if changed_files:
        for path in changed_files:
            lines.append(f"- `{path}`")
    else:
        lines.append("- none provided/observed")
    lines.append("")
    lines.append("## Source Docs Referenced")
    lines.append("")
    if source_docs:
        for path in source_docs:
            lines.append(f"- `{path}`")
    else:
        lines.append("- none")
    lines.append("")
    lines.append("## Human Notes (Author-Supplied)")
    lines.append("")
    lines.append("- completion_claim: `not-set-by-automation`")
    if human_notes:
        for note in human_notes:
            lines.append(f"- note: {note}")
    else:
        lines.append("- note: none")
    if open_risks:
        for risk in open_risks:
            lines.append(f"- open_risk: {risk}")
    else:
        lines.append("- open_risk: none")
    lines.append("")
    lines.append("> Automation captures evidence only. Milestone completion conclusions remain human-owned.")
    lines.append("")
    return "\n".join(lines)


def _coerce_object(raw: Any) -> dict[str, Any]:
    return raw if isinstance(raw, dict) else {}


def _default_launch_smoke_runner(
    *,
    generated_at: str,
    control_host: str,
    include_control_checks: bool,
    include_bootstrap_mutation: bool,
) -> tuple[dict[str, Any], str]:
    from launch_rc_smoke import render_launch_smoke_markdown, run_launch_smoke

    summary = run_launch_smoke(
        generated_at=generated_at,
        control_host=control_host,
        include_control_checks=include_control_checks,
        include_bootstrap_mutation=include_bootstrap_mutation,
    )
    return summary, render_launch_smoke_markdown(summary)


def _default_hosted_launch_smoke_runner(
    *,
    generated_at: str,
    public_base_url: str,
    public_host_for_resolution: str | None,
    archive_record_slug: str | None,
    control_base_url: str | None,
    control_site_id: str | int | None,
    control_auth_header: str | None,
    control_plane_secret_header: str | None,
    include_control_checks: bool,
    include_bootstrap_mutation: bool,
    timeout_seconds: int,
) -> tuple[dict[str, Any], str]:
    from launch_rc_hosted_smoke import render_hosted_launch_smoke_markdown, run_hosted_launch_smoke

    summary = run_hosted_launch_smoke(
        generated_at=generated_at,
        public_base_url=public_base_url,
        public_host_for_resolution=public_host_for_resolution,
        archive_record_slug=archive_record_slug,
        control_base_url=control_base_url,
        control_site_id=control_site_id,
        control_auth_header=control_auth_header,
        control_plane_secret_header=control_plane_secret_header,
        include_control_checks=include_control_checks,
        include_bootstrap_mutation=include_bootstrap_mutation,
        timeout_seconds=timeout_seconds,
    )
    return summary, render_hosted_launch_smoke_markdown(summary)


def _default_hosted_preflight_runner(
    *,
    generated_at: str,
    include_control_checks: bool,
    public_base_url: str | None,
    public_host_for_resolution: str | None,
    archive_record_slug: str | None,
    control_base_url: str | None,
    control_site_id: str | int | None,
    control_auth_header: str | None,
    control_auth_source: str | None,
) -> tuple[dict[str, Any], str]:
    from launch_rc_hosted_preflight import render_hosted_preflight_markdown, run_hosted_preflight

    summary = run_hosted_preflight(
        generated_at=generated_at,
        include_control_checks=include_control_checks,
        public_base_url=public_base_url,
        public_host_for_resolution=public_host_for_resolution,
        archive_record_slug=archive_record_slug,
        control_base_url=control_base_url,
        control_site_id=control_site_id,
        control_auth_header=control_auth_header,
        control_auth_source=control_auth_source,
    )
    return summary, render_hosted_preflight_markdown(summary)


def _default_hosted_route_diagnosis_runner(
    *,
    generated_at: str,
    public_base_url: str,
    public_host_for_resolution: str | None,
    archive_record_slug: str | None,
    timeout_seconds: int,
) -> tuple[dict[str, Any], str]:
    from launch_rc_hosted_route_diagnosis import (
        render_hosted_route_diagnosis_markdown,
        run_hosted_route_diagnosis,
    )

    summary = run_hosted_route_diagnosis(
        generated_at=generated_at,
        public_base_url=public_base_url,
        public_host_for_resolution=public_host_for_resolution,
        archive_record_slug=archive_record_slug,
        timeout_seconds=timeout_seconds,
    )
    return summary, render_hosted_route_diagnosis_markdown(summary)


def _default_attachment_validation_runner(
    *,
    generated_at: str,
    bundle_dir: Path,
    attachments_manifest: dict[str, Any],
) -> tuple[dict[str, Any], str]:
    from launch_rc_hosted_preflight import render_attachment_validation_markdown, validate_attachment_references

    summary = validate_attachment_references(
        generated_at=generated_at,
        bundle_dir=bundle_dir,
        attachments_manifest=attachments_manifest,
    )
    return summary, render_attachment_validation_markdown(summary)


def _normalize_attachment_ref(raw: str) -> str:
    text = str(raw or "").strip().replace("\\", "/")
    if not text:
        return ""
    if text.startswith("./"):
        text = text[2:]
    return text


def _build_attachments_manifest(
    *,
    generated_at: str,
    screenshot_refs: list[str],
    recording_refs: list[str],
    operator_notes: list[str],
) -> dict[str, Any]:
    screenshots: list[dict[str, Any]] = []
    recordings: list[dict[str, Any]] = []
    for index, ref in enumerate(screenshot_refs, start=1):
        normalized = _normalize_attachment_ref(ref)
        if not normalized:
            continue
        screenshots.append(
            {
                "id": f"screenshot-{index}",
                "kind": "screenshot",
                "path": normalized,
                "filename": Path(normalized).name,
            }
        )
    for index, ref in enumerate(recording_refs, start=1):
        normalized = _normalize_attachment_ref(ref)
        if not normalized:
            continue
        recordings.append(
            {
                "id": f"recording-{index}",
                "kind": "recording",
                "path": normalized,
                "filename": Path(normalized).name,
            }
        )
    return {
        "contract_version": "anu-launch-attachments.v1",
        "generated_at": generated_at,
        "attachments_dir": "attachments",
        "screenshots": screenshots,
        "recordings": recordings,
        "operator_notes": [str(note).strip() for note in operator_notes if str(note).strip()],
        "summary": {
            "screenshots_count": len(screenshots),
            "recordings_count": len(recordings),
            "operator_notes_count": len([note for note in operator_notes if str(note).strip()]),
        },
    }


def _build_operator_runbook_markdown(
    *,
    generated_at: str,
    hosted_preflight_summary: dict[str, Any],
    hosted_launch_smoke_summary: dict[str, Any] | None,
    attachments_manifest: dict[str, Any] | None,
    attachment_validation_summary: dict[str, Any] | None,
) -> str:
    preflight_counts = _coerce_object(hosted_preflight_summary.get("summary"))
    smoke_counts = _coerce_object((hosted_launch_smoke_summary or {}).get("summary"))
    attachment_counts = _coerce_object((attachments_manifest or {}).get("summary"))
    validation_counts = _coerce_object((attachment_validation_summary or {}).get("summary"))
    operator_notes = _coerce_object((attachment_validation_summary or {}).get("operator_notes"))

    lines: list[str] = []
    lines.append("# ANU Hosted Smoke Operator Runbook")
    lines.append("")
    lines.append(f"- Generated at (UTC): `{generated_at}`")
    lines.append("- Scope: hosted RC smoke evidence capture only; no launch auto-approval.")
    lines.append("")
    lines.append("## Preflight Checklist")
    lines.append("")
    lines.append(f"- [ ] `public_base_url` configured and valid (preflight valid: `{preflight_counts.get('valid')}`)")
    lines.append(
        f"- [ ] `public_host_for_resolution` and `archive_record_slug` configured (preflight missing: `{preflight_counts.get('missing')}`)"
    )
    lines.append(
        f"- [ ] control inputs configured when control checks enabled (preflight skipped_by_mode: `{preflight_counts.get('skipped_by_mode')}`)"
    )
    lines.append(f"- [ ] preflight `valid_for_execution` is true (`{preflight_counts.get('valid_for_execution')}`)")
    lines.append("")
    lines.append("## Hosted Smoke Checklist")
    lines.append("")
    lines.append(f"- [ ] run hosted smoke checks (total: `{smoke_counts.get('total', 0)}`)")
    lines.append(f"- [ ] verify failures are explicit (failed: `{smoke_counts.get('failed', 0)}`)")
    lines.append(f"- [ ] verify skipped checks are intentional (skipped: `{smoke_counts.get('skipped', 0)}`)")
    lines.append("")
    lines.append("## Attachment Checklist")
    lines.append("")
    lines.append(f"- [ ] screenshot refs listed (count: `{attachment_counts.get('screenshots_count', 0)}`)")
    lines.append(f"- [ ] recording refs listed if available (count: `{attachment_counts.get('recordings_count', 0)}`)")
    lines.append(
        f"- [ ] attachment validation reviewed (valid: `{validation_counts.get('valid', 0)}`, missing: `{validation_counts.get('missing', 0)}`, invalid: `{validation_counts.get('invalid', 0)}`)"
    )
    lines.append(
        f"- [ ] operator notes included (status: `{operator_notes.get('status')}`, count: `{operator_notes.get('notes_count', 0)}`)"
    )
    lines.append("")
    lines.append("## Contract Reminder")
    lines.append("")
    lines.append("- `launch_readiness_claim` must remain `null` in automation artifacts.")
    lines.append("- Milestone launch decisions remain human-owned.")
    lines.append("")
    return "\n".join(lines)


def generate_evidence_bundle(
    *,
    milestone_or_slice: str,
    commands: list[str],
    changed_files: list[str],
    include_git_changed_files: bool,
    source_docs_referenced: list[str],
    open_risks: list[str],
    human_notes: list[str],
    environment_note: str | None,
    output_root: Path,
    repo_root: Path,
    generated_at: str | None,
    build_id: str | None,
    allow_existing_bundle_dir: bool = False,
    command_runner: Callable[[str, Path], CommandResult] = _run_command,
    run_launch_smoke_layer: bool = False,
    launch_smoke_control_host: str = "control.test",
    launch_smoke_skip_control_checks: bool = False,
    launch_smoke_skip_bootstrap_mutation: bool = False,
    launch_smoke_runner: Callable[..., tuple[dict[str, Any], str]] = _default_launch_smoke_runner,
    run_hosted_launch_smoke_layer: bool = False,
    run_hosted_route_diagnosis_layer: bool = False,
    hosted_public_base_url: str | None = None,
    hosted_public_host_for_resolution: str | None = None,
    hosted_archive_record_slug: str | None = None,
    hosted_control_base_url: str | None = None,
    hosted_control_site_id: str | int | None = None,
    hosted_control_auth_header: str | None = None,
    hosted_control_plane_secret_header: str | None = None,
    hosted_control_auth_source: str | None = None,
    hosted_launch_smoke_skip_control_checks: bool = False,
    hosted_launch_smoke_enable_bootstrap_mutation: bool = False,
    hosted_launch_smoke_timeout_seconds: int = 12,
    hosted_route_diagnosis_timeout_seconds: int = 12,
    hosted_screenshot_refs: list[str] | None = None,
    hosted_recording_refs: list[str] | None = None,
    hosted_operator_notes: list[str] | None = None,
    hosted_preflight_runner: Callable[..., tuple[dict[str, Any], str]] = _default_hosted_preflight_runner,
    hosted_launch_smoke_runner: Callable[..., tuple[dict[str, Any], str]] = _default_hosted_launch_smoke_runner,
    hosted_route_diagnosis_runner: Callable[..., tuple[dict[str, Any], str]] = _default_hosted_route_diagnosis_runner,
    attachment_validation_runner: Callable[..., tuple[dict[str, Any], str]] = _default_attachment_validation_runner,
) -> tuple[Path, dict[str, Any], str]:
    generated_at_iso = _parse_generated_at(generated_at)
    timestamp_segment = _timestamp_segment(generated_at_iso, build_id)
    milestone_slug = _slugify(milestone_or_slice)

    combined_changed_files = list(changed_files)
    if include_git_changed_files:
        combined_changed_files.extend(_git_changed_files(repo_root))
    combined_changed_files = sorted(set(path for path in combined_changed_files if path.strip()))

    observed_results: list[CommandResult] = [command_runner(command, repo_root) for command in commands]
    failed_count = sum(1 for result in observed_results if result.exit_code != 0)
    inferred = {
        "all_commands_succeeded": failed_count == 0,
        "failed_command_count": failed_count,
        "targeted_tests_summary": _summarize_targets(observed_results),
    }

    bundle_dir = output_root / milestone_slug / timestamp_segment
    if bundle_dir.exists():
        if not allow_existing_bundle_dir:
            raise FileExistsError(f"Evidence bundle directory already exists: {bundle_dir}")
    else:
        bundle_dir.mkdir(parents=True, exist_ok=False)
    evidence_json_path = bundle_dir / "evidence.json"
    evidence_md_path = bundle_dir / "evidence.md"
    launch_smoke_json_path = bundle_dir / "launch_smoke.json"
    launch_smoke_md_path = bundle_dir / "launch_smoke.md"
    hosted_preflight_json_path = bundle_dir / "hosted_preflight.json"
    hosted_preflight_md_path = bundle_dir / "hosted_preflight.md"
    hosted_launch_smoke_json_path = bundle_dir / "hosted_launch_smoke.json"
    hosted_launch_smoke_md_path = bundle_dir / "hosted_launch_smoke.md"
    hosted_route_diagnosis_json_path = bundle_dir / "hosted_route_diagnosis.json"
    hosted_route_diagnosis_md_path = bundle_dir / "hosted_route_diagnosis.md"
    attachments_json_path = bundle_dir / "attachments.json"
    attachment_validation_json_path = bundle_dir / "attachment_validation.json"
    attachment_validation_md_path = bundle_dir / "attachment_validation.md"
    operator_runbook_path = bundle_dir / "operator_runbook.md"
    attachments_dir_path = bundle_dir / "attachments"

    launch_smoke_summary: dict[str, Any] | None = None
    launch_smoke_markdown: str | None = None
    if run_launch_smoke_layer:
        launch_smoke_summary, launch_smoke_markdown = launch_smoke_runner(
            generated_at=generated_at_iso,
            control_host=launch_smoke_control_host,
            include_control_checks=not launch_smoke_skip_control_checks,
            include_bootstrap_mutation=not launch_smoke_skip_bootstrap_mutation,
        )
        launch_smoke_json_path.write_text(
            json.dumps(launch_smoke_summary, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        launch_smoke_md_path.write_text(launch_smoke_markdown, encoding="utf-8")

    hosted_screenshots = hosted_screenshot_refs or []
    hosted_recordings = hosted_recording_refs or []
    hosted_notes = hosted_operator_notes or []
    hosted_preflight_summary: dict[str, Any] | None = None
    hosted_preflight_markdown: str | None = None
    hosted_launch_smoke_summary: dict[str, Any] | None = None
    hosted_launch_smoke_markdown: str | None = None
    hosted_route_diagnosis_summary: dict[str, Any] | None = None
    hosted_route_diagnosis_markdown: str | None = None
    attachments_manifest: dict[str, Any] | None = None
    attachment_validation_summary: dict[str, Any] | None = None
    attachment_validation_markdown: str | None = None
    operator_runbook_markdown: str | None = None
    if run_hosted_launch_smoke_layer:
        hosted_preflight_summary, hosted_preflight_markdown = hosted_preflight_runner(
            generated_at=generated_at_iso,
            include_control_checks=not hosted_launch_smoke_skip_control_checks,
            public_base_url=hosted_public_base_url,
            public_host_for_resolution=hosted_public_host_for_resolution,
            archive_record_slug=hosted_archive_record_slug,
            control_base_url=hosted_control_base_url,
            control_site_id=hosted_control_site_id,
            control_auth_header=hosted_control_auth_header,
            control_auth_source=hosted_control_auth_source,
        )
        hosted_preflight_json_path.write_text(
            json.dumps(hosted_preflight_summary, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        hosted_preflight_md_path.write_text(hosted_preflight_markdown, encoding="utf-8")
        preflight_valid = bool((_coerce_object(hosted_preflight_summary.get("summary"))).get("valid_for_execution"))
        if not preflight_valid:
            blocking_fields = hosted_preflight_summary.get("blocking_fields") or []
            raise ValueError(
                "Hosted preflight validation failed for required inputs: "
                + ", ".join(str(field) for field in blocking_fields)
            )

        hosted_launch_smoke_summary, hosted_launch_smoke_markdown = hosted_launch_smoke_runner(
            generated_at=generated_at_iso,
            public_base_url=str(hosted_public_base_url or "").strip(),
            public_host_for_resolution=hosted_public_host_for_resolution,
            archive_record_slug=hosted_archive_record_slug,
            control_base_url=hosted_control_base_url,
            control_site_id=hosted_control_site_id,
            control_auth_header=hosted_control_auth_header,
            control_plane_secret_header=hosted_control_plane_secret_header,
            include_control_checks=not hosted_launch_smoke_skip_control_checks,
            include_bootstrap_mutation=hosted_launch_smoke_enable_bootstrap_mutation,
            timeout_seconds=int(hosted_launch_smoke_timeout_seconds),
        )
        hosted_launch_smoke_json_path.write_text(
            json.dumps(hosted_launch_smoke_summary, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        hosted_launch_smoke_md_path.write_text(hosted_launch_smoke_markdown, encoding="utf-8")
        attachments_dir_path.mkdir(parents=True, exist_ok=True)
        attachments_manifest = _build_attachments_manifest(
            generated_at=generated_at_iso,
            screenshot_refs=hosted_screenshots,
            recording_refs=hosted_recordings,
            operator_notes=hosted_notes,
        )
        attachments_json_path.write_text(
            json.dumps(attachments_manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        attachment_validation_summary, attachment_validation_markdown = attachment_validation_runner(
            generated_at=generated_at_iso,
            bundle_dir=bundle_dir,
            attachments_manifest=attachments_manifest,
        )
        attachment_validation_json_path.write_text(
            json.dumps(attachment_validation_summary, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        attachment_validation_md_path.write_text(attachment_validation_markdown, encoding="utf-8")
        operator_runbook_markdown = _build_operator_runbook_markdown(
            generated_at=generated_at_iso,
            hosted_preflight_summary=hosted_preflight_summary,
            hosted_launch_smoke_summary=hosted_launch_smoke_summary,
            attachments_manifest=attachments_manifest,
            attachment_validation_summary=attachment_validation_summary,
        )
        operator_runbook_path.write_text(operator_runbook_markdown, encoding="utf-8")
    if run_hosted_route_diagnosis_layer:
        hosted_route_diagnosis_summary, hosted_route_diagnosis_markdown = hosted_route_diagnosis_runner(
            generated_at=generated_at_iso,
            public_base_url=str(hosted_public_base_url or "").strip(),
            public_host_for_resolution=hosted_public_host_for_resolution,
            archive_record_slug=hosted_archive_record_slug,
            timeout_seconds=int(hosted_route_diagnosis_timeout_seconds),
        )
        hosted_route_diagnosis_json_path.write_text(
            json.dumps(hosted_route_diagnosis_summary, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        hosted_route_diagnosis_md_path.write_text(hosted_route_diagnosis_markdown, encoding="utf-8")

    payload = {
        "artifact_version": ARTIFACT_VERSION,
        "milestone_or_slice": milestone_or_slice,
        "generated_at": generated_at_iso,
        "environment_note": environment_note,
        "git_revision": _git_revision(repo_root),
        "commands_run": [result.command for result in observed_results],
        "results": [
            {
                "command": result.command,
                "category": result.category,
                "started_at": result.started_at,
                "finished_at": result.finished_at,
                "duration_ms": result.duration_ms,
                "exit_code": result.exit_code,
                "status": result.status,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }
            for result in observed_results
        ],
        "changed_files": combined_changed_files,
        "targeted_tests_summary": inferred["targeted_tests_summary"],
        "typecheck_build_summary": {
            "typecheck_commands": [
                result.command for result in observed_results if result.category == "typecheck"
            ],
            "build_commands": [
                result.command for result in observed_results if result.category == "build"
            ],
        },
        "open_risks": open_risks,
        "source_docs_referenced": source_docs_referenced,
        "observed": {
            "commands_run": [result.command for result in observed_results],
            "command_results_count": len(observed_results),
            "changed_files_count": len(combined_changed_files),
        },
        "inferred": inferred,
        "human_narrative": {
            "notes": human_notes,
            "completion_claim": None,
            "conclusion": "not-set-by-automation",
        },
    }
    if launch_smoke_summary is not None:
        payload["launch_smoke"] = {
            "json_artifact": "launch_smoke.json",
            "markdown_artifact": "launch_smoke.md",
            "summary": _coerce_object(launch_smoke_summary.get("summary")),
        }
    if hosted_preflight_summary is not None:
        payload["hosted_preflight"] = {
            "json_artifact": "hosted_preflight.json",
            "markdown_artifact": "hosted_preflight.md",
            "summary": _coerce_object(hosted_preflight_summary.get("summary")),
            "blocking_fields": hosted_preflight_summary.get("blocking_fields") or [],
            "launch_readiness_claim": hosted_preflight_summary.get("launch_readiness_claim"),
        }
    if hosted_launch_smoke_summary is not None:
        payload["hosted_launch_smoke"] = {
            "json_artifact": "hosted_launch_smoke.json",
            "markdown_artifact": "hosted_launch_smoke.md",
            "summary": _coerce_object(hosted_launch_smoke_summary.get("summary")),
            "target_metadata": _coerce_object(hosted_launch_smoke_summary.get("environment")),
            "launch_readiness_claim": hosted_launch_smoke_summary.get("launch_readiness_claim"),
        }
    if hosted_route_diagnosis_summary is not None:
        payload["hosted_route_diagnosis"] = {
            "json_artifact": "hosted_route_diagnosis.json",
            "markdown_artifact": "hosted_route_diagnosis.md",
            "summary": _coerce_object(hosted_route_diagnosis_summary.get("summary")),
            "target_metadata": _coerce_object(hosted_route_diagnosis_summary.get("environment")),
            "launch_readiness_claim": hosted_route_diagnosis_summary.get("launch_readiness_claim"),
        }
    if attachments_manifest is not None:
        payload["attachments"] = {
            "manifest_artifact": "attachments.json",
            "attachments_dir": "attachments",
            "summary": _coerce_object(attachments_manifest.get("summary")),
        }
    if attachment_validation_summary is not None:
        payload["attachment_validation"] = {
            "json_artifact": "attachment_validation.json",
            "markdown_artifact": "attachment_validation.md",
            "summary": _coerce_object(attachment_validation_summary.get("summary")),
            "operator_notes": _coerce_object(attachment_validation_summary.get("operator_notes")),
            "launch_readiness_claim": attachment_validation_summary.get("launch_readiness_claim"),
        }
    if operator_runbook_markdown is not None:
        payload["operator_runbook"] = {"markdown_artifact": "operator_runbook.md"}

    evidence_json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    markdown = _build_markdown(
        milestone_or_slice=milestone_or_slice,
        generated_at=generated_at_iso,
        bundle_relative_path=str(bundle_dir.as_posix()),
        environment_note=environment_note,
        commands=observed_results,
        changed_files=combined_changed_files,
        source_docs=source_docs_referenced,
        open_risks=open_risks,
        human_notes=human_notes,
        inferred=inferred,
        launch_smoke_summary=launch_smoke_summary,
        hosted_preflight_summary=hosted_preflight_summary,
        hosted_launch_smoke_summary=hosted_launch_smoke_summary,
        hosted_route_diagnosis_summary=hosted_route_diagnosis_summary,
        attachments_manifest=attachments_manifest,
        attachment_validation_summary=attachment_validation_summary,
        operator_runbook_artifact=("operator_runbook.md" if operator_runbook_markdown is not None else None),
    )
    evidence_md_path.write_text(markdown, encoding="utf-8")
    return bundle_dir, payload, markdown


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Capture milestone/slice evidence into structured JSON + markdown artifacts."
    )
    parser.add_argument("--milestone-or-slice", required=True, help="Milestone or slice identifier, e.g. ANU-024")
    parser.add_argument("--command", action="append", default=[], help="Command to execute and capture")
    parser.add_argument("--changed-file", action="append", default=[], help="Changed file path to include")
    parser.add_argument(
        "--include-git-changed-files",
        action="store_true",
        help="Include changed file list from git diff (unstaged + staged)",
    )
    parser.add_argument("--source-doc", action="append", default=[], help="Referenced docs path")
    parser.add_argument("--open-risk", action="append", default=[], help="Human-supplied open risk entry")
    parser.add_argument("--human-note", action="append", default=[], help="Human-supplied narrative note")
    parser.add_argument("--environment-note", default=None, help="Optional environment annotation")
    parser.add_argument("--output-root", default="docs/program/evidence", help="Evidence root output directory")
    parser.add_argument("--repo-root", default=".", help="Repo root for command execution and git metadata")
    parser.add_argument("--generated-at", default=None, help="ISO timestamp override for deterministic generation")
    parser.add_argument("--build-id", default=None, help="Optional deterministic bundle id override")
    parser.add_argument(
        "--allow-existing-bundle-dir",
        action="store_true",
        help="Allow regenerating evidence into an existing deterministic bundle directory",
    )
    parser.add_argument(
        "--run-launch-smoke",
        action="store_true",
        help="Run ANU-LAUNCH-001 release-candidate smoke checks and attach artifacts to the bundle",
    )
    parser.add_argument(
        "--launch-smoke-control-host",
        default="control.test",
        help="Control host used for control-plane smoke checks",
    )
    parser.add_argument(
        "--launch-smoke-skip-control-checks",
        action="store_true",
        help="Mark control-plane smoke checks as skipped/not-configured",
    )
    parser.add_argument(
        "--launch-smoke-skip-bootstrap-mutation",
        action="store_true",
        help="Mark bootstrap API smoke mutation as skipped/not-configured",
    )
    parser.add_argument(
        "--run-hosted-launch-smoke",
        action="store_true",
        help="Run ANU-LAUNCH-002 hosted release-candidate smoke checks and attach hosted artifacts",
    )
    parser.add_argument(
        "--run-hosted-route-diagnosis",
        action="store_true",
        help="Run ANU-LAUNCH-005 hosted public-route diagnosis and attach diagnosis artifacts",
    )
    parser.add_argument(
        "--hosted-public-base-url",
        default=None,
        help="Hosted public base URL used by ANU-LAUNCH-002 smoke checks",
    )
    parser.add_argument(
        "--hosted-public-host-for-resolution",
        default=None,
        help="Host value used for hosted /api/public/sites/resolve check",
    )
    parser.add_argument(
        "--hosted-archive-record-slug",
        default=None,
        help="Archive slug used by hosted public archive record detail check",
    )
    parser.add_argument(
        "--hosted-control-base-url",
        default=None,
        help="Hosted control base URL used by ANU-LAUNCH-002 control checks",
    )
    parser.add_argument(
        "--hosted-control-site-id",
        default=None,
        help="Hosted control site/node id used for control read checks",
    )
    parser.add_argument(
        "--hosted-control-auth-header",
        default=None,
        help="Authorization header value for hosted control checks, e.g. Bearer <token>",
    )
    parser.add_argument(
        "--hosted-control-auth-header-env",
        default=None,
        help="Environment variable name containing hosted control auth header value",
    )
    parser.add_argument(
        "--hosted-control-plane-secret-header",
        default=None,
        help="X-Control-Plane-Secret header value for hosted control checks",
    )
    parser.add_argument(
        "--hosted-control-plane-secret-header-env",
        default=None,
        help="Environment variable name containing hosted control-plane shared secret header value",
    )
    parser.add_argument(
        "--hosted-launch-smoke-skip-control-checks",
        action="store_true",
        help="Mark hosted control-plane smoke checks as skipped/not-configured",
    )
    parser.add_argument(
        "--hosted-launch-smoke-enable-bootstrap-mutation",
        action="store_true",
        help="Enable hosted bootstrap mutation check (default uses validation-only probe payload)",
    )
    parser.add_argument(
        "--hosted-launch-smoke-timeout-seconds",
        type=int,
        default=12,
        help="Timeout in seconds for hosted launch smoke HTTP requests",
    )
    parser.add_argument(
        "--hosted-route-diagnosis-timeout-seconds",
        type=int,
        default=12,
        help="Timeout in seconds for hosted route diagnosis HTTP requests",
    )
    parser.add_argument(
        "--hosted-screenshot-ref",
        action="append",
        default=[],
        help="Attachment reference for hosted screenshot evidence (recommend attachments/<file>)",
    )
    parser.add_argument(
        "--hosted-recording-ref",
        action="append",
        default=[],
        help="Attachment reference for hosted recording evidence (recommend attachments/<file>)",
    )
    parser.add_argument(
        "--hosted-operator-note",
        action="append",
        default=[],
        help="Operator-authored note for hosted smoke evidence bundle",
    )
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    repo_root = Path(args.repo_root).resolve()
    output_root = Path(args.output_root).resolve()
    hosted_control_auth_header = str(args.hosted_control_auth_header or "").strip()
    hosted_control_auth_env_name = str(args.hosted_control_auth_header_env or "").strip()
    hosted_control_plane_secret_header = str(args.hosted_control_plane_secret_header or "").strip()
    hosted_control_plane_secret_env_name = str(args.hosted_control_plane_secret_header_env or "").strip()
    hosted_control_auth_source = None
    if not hosted_control_auth_header and hosted_control_auth_env_name:
        import os

        hosted_control_auth_header = str(os.environ.get(hosted_control_auth_env_name, "")).strip()
        hosted_control_auth_source = f"env:{hosted_control_auth_env_name}"
    elif hosted_control_auth_header:
        hosted_control_auth_source = "direct_header"
    if not hosted_control_plane_secret_header and hosted_control_plane_secret_env_name:
        import os

        hosted_control_plane_secret_header = str(os.environ.get(hosted_control_plane_secret_env_name, "")).strip()

    bundle_dir, payload, _ = generate_evidence_bundle(
        milestone_or_slice=args.milestone_or_slice,
        commands=args.command or [],
        changed_files=args.changed_file or [],
        include_git_changed_files=bool(args.include_git_changed_files),
        source_docs_referenced=args.source_doc or [],
        open_risks=args.open_risk or [],
        human_notes=args.human_note or [],
        environment_note=args.environment_note,
        output_root=output_root,
        repo_root=repo_root,
        generated_at=args.generated_at,
        build_id=args.build_id,
        allow_existing_bundle_dir=bool(args.allow_existing_bundle_dir),
        run_launch_smoke_layer=bool(args.run_launch_smoke),
        launch_smoke_control_host=str(args.launch_smoke_control_host or "control.test"),
        launch_smoke_skip_control_checks=bool(args.launch_smoke_skip_control_checks),
        launch_smoke_skip_bootstrap_mutation=bool(args.launch_smoke_skip_bootstrap_mutation),
        run_hosted_launch_smoke_layer=bool(args.run_hosted_launch_smoke),
        run_hosted_route_diagnosis_layer=bool(args.run_hosted_route_diagnosis),
        hosted_public_base_url=args.hosted_public_base_url,
        hosted_public_host_for_resolution=args.hosted_public_host_for_resolution,
        hosted_archive_record_slug=args.hosted_archive_record_slug,
        hosted_control_base_url=args.hosted_control_base_url,
        hosted_control_site_id=args.hosted_control_site_id,
        hosted_control_auth_header=hosted_control_auth_header or None,
        hosted_control_plane_secret_header=hosted_control_plane_secret_header or None,
        hosted_control_auth_source=hosted_control_auth_source,
        hosted_launch_smoke_skip_control_checks=bool(args.hosted_launch_smoke_skip_control_checks),
        hosted_launch_smoke_enable_bootstrap_mutation=bool(args.hosted_launch_smoke_enable_bootstrap_mutation),
        hosted_launch_smoke_timeout_seconds=int(args.hosted_launch_smoke_timeout_seconds),
        hosted_route_diagnosis_timeout_seconds=int(args.hosted_route_diagnosis_timeout_seconds),
        hosted_screenshot_refs=args.hosted_screenshot_ref or [],
        hosted_recording_refs=args.hosted_recording_ref or [],
        hosted_operator_notes=args.hosted_operator_note or [],
    )

    print(
        json.dumps(
            {
                "bundle_dir": str(bundle_dir),
                "evidence_json": str(bundle_dir / "evidence.json"),
                "evidence_md": str(bundle_dir / "evidence.md"),
                "all_commands_succeeded": payload["inferred"]["all_commands_succeeded"],
                "failed_command_count": payload["inferred"]["failed_command_count"],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
