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
    command_runner: Callable[[str, Path], CommandResult] = _run_command,
    run_launch_smoke_layer: bool = False,
    launch_smoke_control_host: str = "control.test",
    launch_smoke_skip_control_checks: bool = False,
    launch_smoke_skip_bootstrap_mutation: bool = False,
    launch_smoke_runner: Callable[..., tuple[dict[str, Any], str]] = _default_launch_smoke_runner,
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
        raise FileExistsError(f"Evidence bundle directory already exists: {bundle_dir}")

    bundle_dir.mkdir(parents=True, exist_ok=False)
    evidence_json_path = bundle_dir / "evidence.json"
    evidence_md_path = bundle_dir / "evidence.md"
    launch_smoke_json_path = bundle_dir / "launch_smoke.json"
    launch_smoke_md_path = bundle_dir / "launch_smoke.md"

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
    return parser


def main() -> int:
    args = _build_parser().parse_args()
    repo_root = Path(args.repo_root).resolve()
    output_root = Path(args.output_root).resolve()

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
        run_launch_smoke_layer=bool(args.run_launch_smoke),
        launch_smoke_control_host=str(args.launch_smoke_control_host or "control.test"),
        launch_smoke_skip_control_checks=bool(args.launch_smoke_skip_control_checks),
        launch_smoke_skip_bootstrap_mutation=bool(args.launch_smoke_skip_bootstrap_mutation),
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
