from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import shutil
import sys
import unittest
from contextlib import contextmanager
from uuid import uuid4


def _load_module():
    module_path = Path(__file__).resolve().parents[1] / "capture_milestone_evidence.py"
    spec = importlib.util.spec_from_file_location("capture_milestone_evidence", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = _load_module()


def _fake_runner_factory(*, failing_commands: set[str] | None = None):
    failing = failing_commands or set()

    def _runner(command: str, _cwd: Path):
        exit_code = 1 if command in failing else 0
        return MODULE.CommandResult(
            command=command,
            started_at="2026-04-14T00:00:00+00:00",
            finished_at="2026-04-14T00:00:00+00:00",
            duration_ms=0,
            exit_code=exit_code,
            status="failed" if exit_code else "passed",
            stdout="ok" if exit_code == 0 else "",
            stderr="boom" if exit_code else "",
            category="test",
        )

    return _runner


def _fake_launch_smoke_runner(**_kwargs):
    summary = {
        "contract_version": "anu-launch-smoke.v1",
        "generated_at": "2026-04-16T08:10:00+00:00",
        "environment": {
            "runtime": "in-memory-flask",
            "control_host": "control.test",
            "include_control_checks": True,
            "include_bootstrap_mutation": True,
        },
        "checks": [
            {
                "check_id": "public_archive_list_route",
                "label": "Public archive list route",
                "method": "GET",
                "path": "/public/archive/records?page=1&page_size=5",
                "status": "passed",
                "duration_ms": 7,
                "http_status": 200,
                "message": "ok",
                "details": {},
            },
            {
                "check_id": "control_bootstrap_api_availability",
                "label": "Control bootstrap API availability",
                "method": "POST",
                "path": "/api/control/sites/bootstrap",
                "status": "skipped",
                "duration_ms": 0,
                "http_status": None,
                "message": "bootstrap mutation disabled/not-configured for this run",
                "details": {"skip_reason": "bootstrap mutation disabled/not-configured for this run"},
            },
        ],
        "summary": {"total": 2, "passed": 1, "failed": 0, "skipped": 1, "all_passed": True},
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-smoke",
    }
    markdown = "# Launch RC Smoke Summary\n\n- Total checks: `2`\n"
    return summary, markdown


@contextmanager
def _workspace_temp_dir():
    roots = [
        Path.home() / ".codex" / "memories" / "anu-evidence-tests",
        Path.cwd() / ".tmp_evidence_tests",
    ]

    path: Path | None = None
    last_error: Exception | None = None
    for root in roots:
        try:
            root.mkdir(parents=True, exist_ok=True)
            candidate = root / f"anu024-{uuid4().hex}"
            candidate.mkdir(parents=False, exist_ok=False)
            probe = candidate / ".write_probe"
            probe.mkdir(parents=True, exist_ok=False)
            probe.rmdir()
            path = candidate
            break
        except Exception as exc:  # pragma: no cover - environment-dependent fallback
            last_error = exc

    if path is None:
        raise RuntimeError(f"No writable temp root for tests: {last_error}") from last_error

    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)


class EvidenceCaptureTests(unittest.TestCase):
    def test_unittest_commands_are_classified_as_test_category(self):
        self.assertEqual(
            MODULE._command_category("python -m unittest scripts.tests.test_capture_milestone_evidence -v"),
            "test",
        )

    def test_generates_deterministic_json_and_markdown_outputs(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            bundle_dir, payload, markdown = MODULE.generate_evidence_bundle(
                milestone_or_slice="ANU-024",
                commands=["python -m pytest -q scripts/tests/test_capture_milestone_evidence.py"],
                changed_files=["scripts/capture_milestone_evidence.py"],
                include_git_changed_files=False,
                source_docs_referenced=["docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md"],
                open_risks=["none"],
                human_notes=["automation captures evidence only"],
                environment_note="local-dev",
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-14T02:00:00Z",
                build_id="anu024-proof",
                command_runner=_fake_runner_factory(),
            )

            self.assertEqual(bundle_dir, output_root / "anu-024" / "anu024-proof")
            evidence_json = bundle_dir / "evidence.json"
            evidence_md = bundle_dir / "evidence.md"
            self.assertTrue(evidence_json.exists())
            self.assertTrue(evidence_md.exists())

            from_disk = json.loads(evidence_json.read_text(encoding="utf-8"))
            self.assertEqual(from_disk["milestone_or_slice"], "ANU-024")
            self.assertEqual(from_disk["generated_at"], "2026-04-14T02:00:00+00:00")
            self.assertTrue(from_disk["inferred"]["all_commands_succeeded"])
            self.assertEqual(from_disk["inferred"]["failed_command_count"], 0)
            self.assertEqual(from_disk["changed_files"], ["scripts/capture_milestone_evidence.py"])
            self.assertIn("Automation captures evidence only", markdown)
            self.assertIsNone(payload["human_narrative"]["completion_claim"])

    def test_failed_commands_are_captured_honestly(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            _, payload, markdown = MODULE.generate_evidence_bundle(
                milestone_or_slice="ANU-024",
                commands=["pass-command", "fail-command"],
                changed_files=[],
                include_git_changed_files=False,
                source_docs_referenced=[],
                open_risks=[],
                human_notes=[],
                environment_note=None,
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-14T03:00:00Z",
                build_id="anu024-failure-proof",
                command_runner=_fake_runner_factory(failing_commands={"fail-command"}),
            )

            self.assertFalse(payload["inferred"]["all_commands_succeeded"])
            self.assertEqual(payload["inferred"]["failed_command_count"], 1)
            self.assertEqual([result["status"] for result in payload["results"]], ["passed", "failed"])
            self.assertIn("| `fail-command` | test | 1 | failed | 0 |", markdown)

    def test_bundle_generation_is_append_only_by_target_path(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            kwargs = dict(
                milestone_or_slice="ANU-024",
                commands=["pass-command"],
                changed_files=[],
                include_git_changed_files=False,
                source_docs_referenced=[],
                open_risks=[],
                human_notes=[],
                environment_note=None,
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-14T04:00:00Z",
                build_id="same-bundle-id",
                command_runner=_fake_runner_factory(),
            )

            MODULE.generate_evidence_bundle(**kwargs)
            with self.assertRaises(FileExistsError):
                MODULE.generate_evidence_bundle(**kwargs)

    def test_generation_does_not_overwrite_milestone_conclusion_docs(self):
        with _workspace_temp_dir() as temp_root:
            repo_root = temp_root / "repo"
            conclusion_doc = repo_root / "docs" / "program" / "M5_COMPLETION_REPORT.md"
            conclusion_doc.parent.mkdir(parents=True, exist_ok=True)
            original = "# Human-owned completion conclusions\n- unchanged"
            conclusion_doc.write_text(original, encoding="utf-8")

            output_root = repo_root / "docs" / "program" / "evidence"
            MODULE.generate_evidence_bundle(
                milestone_or_slice="ANU-024",
                commands=["pass-command"],
                changed_files=[],
                include_git_changed_files=False,
                source_docs_referenced=[],
                open_risks=[],
                human_notes=[],
                environment_note=None,
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-14T05:00:00Z",
                build_id="no-overwrite-proof",
                command_runner=_fake_runner_factory(),
            )

            self.assertEqual(conclusion_doc.read_text(encoding="utf-8"), original)
            self.assertTrue((output_root / "anu-024" / "no-overwrite-proof" / "evidence.json").exists())

    def test_launch_smoke_artifacts_integrate_without_breaking_contract(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            bundle_dir, payload, markdown = MODULE.generate_evidence_bundle(
                milestone_or_slice="ANU-LAUNCH-001",
                commands=["python -m unittest scripts.tests.test_launch_rc_smoke -v"],
                changed_files=["scripts/launch_rc_smoke.py"],
                include_git_changed_files=False,
                source_docs_referenced=["docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md"],
                open_risks=["hosted-release smoke remains operator-owned"],
                human_notes=["smoke is RC-layer only"],
                environment_note="local-dev",
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-16T08:11:00Z",
                build_id="anu-launch-001-proof",
                command_runner=_fake_runner_factory(),
                run_launch_smoke_layer=True,
                launch_smoke_runner=_fake_launch_smoke_runner,
            )

            self.assertTrue((bundle_dir / "evidence.json").exists())
            self.assertTrue((bundle_dir / "evidence.md").exists())
            self.assertTrue((bundle_dir / "launch_smoke.json").exists())
            self.assertTrue((bundle_dir / "launch_smoke.md").exists())

            from_disk = json.loads((bundle_dir / "evidence.json").read_text(encoding="utf-8"))
            for required_key in (
                "artifact_version",
                "milestone_or_slice",
                "generated_at",
                "commands_run",
                "results",
                "changed_files",
                "targeted_tests_summary",
                "typecheck_build_summary",
                "open_risks",
                "source_docs_referenced",
                "observed",
                "inferred",
                "human_narrative",
            ):
                self.assertIn(required_key, from_disk)

            self.assertIn("launch_smoke", from_disk)
            self.assertEqual(from_disk["launch_smoke"]["json_artifact"], "launch_smoke.json")
            self.assertEqual(from_disk["launch_smoke"]["markdown_artifact"], "launch_smoke.md")
            self.assertEqual(from_disk["launch_smoke"]["summary"]["skipped"], 1)
            self.assertIn("Launch Smoke (Release-Candidate Layer)", markdown)
            self.assertIsNone(payload["human_narrative"]["completion_claim"])


if __name__ == "__main__":
    unittest.main()
