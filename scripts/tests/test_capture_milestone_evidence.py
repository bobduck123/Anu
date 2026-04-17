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


def _fake_hosted_launch_smoke_runner(**_kwargs):
    summary = {
        "contract_version": "anu-launch-smoke-hosted.v1",
        "generated_at": "2026-04-16T10:20:00+00:00",
        "environment": {
            "runtime": "hosted-http",
            "public_base_url": "https://public.example.com",
            "public_host_for_resolution": "partner.example.com",
            "archive_record_slug": "hosted-record",
            "control_base_url": "https://control.example.com",
            "control_site_id": 42,
            "control_auth_header_configured": True,
            "include_control_checks": True,
            "include_bootstrap_mutation": False,
            "timeout_seconds": 10,
        },
        "checks": [
            {
                "check_id": "public_archive_list_route",
                "label": "Public archive list route",
                "method": "GET",
                "path": "/public/archive/records?page=1&page_size=5",
                "status": "passed",
                "duration_ms": 31,
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
                "message": "bootstrap disabled in hosted run",
                "details": {"skip_reason": "bootstrap disabled in hosted run"},
            },
        ],
        "summary": {"total": 2, "passed": 1, "failed": 0, "skipped": 1, "all_passed": True},
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-smoke",
    }
    markdown = "# Hosted Launch RC Smoke Summary\n\n- Total checks: `2`\n"
    return summary, markdown


def _fake_hosted_preflight_runner(**_kwargs):
    summary = {
        "contract_version": "anu-launch-preflight.v1",
        "generated_at": "2026-04-16T10:19:00+00:00",
        "mode": {"include_control_checks": True},
        "checks": [
            {
                "field": "public_base_url",
                "required": True,
                "status": "valid",
                "message": "configured",
                "value_preview": "https://public.example.com",
            }
        ],
        "summary": {
            "total": 1,
            "valid": 1,
            "invalid": 0,
            "missing": 0,
            "skipped_by_mode": 0,
            "valid_for_execution": True,
        },
        "blocking_fields": [],
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-preflight",
    }
    markdown = "# Hosted Smoke Preflight\n\n- valid_for_execution: `True`\n"
    return summary, markdown


def _fake_invalid_hosted_preflight_runner(**_kwargs):
    summary = {
        "contract_version": "anu-launch-preflight.v1",
        "generated_at": "2026-04-16T10:19:00+00:00",
        "mode": {"include_control_checks": True},
        "checks": [
            {
                "field": "public_base_url",
                "required": True,
                "status": "missing",
                "message": "public base URL is required",
                "value_preview": None,
            }
        ],
        "summary": {
            "total": 1,
            "valid": 0,
            "invalid": 0,
            "missing": 1,
            "skipped_by_mode": 0,
            "valid_for_execution": False,
        },
        "blocking_fields": ["public_base_url"],
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-preflight",
    }
    markdown = "# Hosted Smoke Preflight\n\n- valid_for_execution: `False`\n"
    return summary, markdown


def _fake_attachment_validation_runner(**_kwargs):
    summary = {
        "contract_version": "anu-launch-attachment-validation.v1",
        "generated_at": "2026-04-16T10:22:00+00:00",
        "checks": [
            {
                "id": "screenshot-1",
                "kind": "screenshot",
                "path": "attachments/public-archive-list.png",
                "status": "valid",
                "message": "attachment file exists",
            },
            {
                "id": "recording-1",
                "kind": "recording",
                "path": "attachments/walkthrough.mp4",
                "status": "missing",
                "message": "attachment file missing",
            },
        ],
        "operator_notes": {"status": "valid", "notes_count": 1, "message": "operator notes present"},
        "summary": {
            "total": 2,
            "valid": 1,
            "invalid": 0,
            "missing": 1,
            "screenshots_total": 1,
            "recordings_total": 1,
        },
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-attachment-validation",
    }
    markdown = "# Hosted Attachment Validation\n\n- valid: `1`\n"
    return summary, markdown


def _fake_hosted_route_diagnosis_runner(**_kwargs):
    summary = {
        "contract_version": "anu-launch-hosted-route-diagnosis.v1",
        "generated_at": "2026-04-17T00:12:00+00:00",
        "environment": {
            "runtime": "hosted-http",
            "public_base_url": "https://public.example.com",
            "public_host_for_resolution": "partner.example.com",
            "archive_record_slug": "hosted-record",
            "timeout_seconds": 10,
        },
        "checks": [
            {
                "check_id": "public_archive_list_route",
                "label": "Public archive list route",
                "method": "GET",
                "path": "/public/archive/records?page=1&page_size=5",
                "status": "failed",
                "outcome_category": "http_5xx",
                "duration_ms": 31,
                "http_status": 503,
                "message": "Archive summary list temporarily unavailable",
                "details": {"request_id": "req-archive-list"},
            },
            {
                "check_id": "public_archive_record_detail_route",
                "label": "Public archive record detail route",
                "method": "GET",
                "path": "/public/archive-handoffs/hosted-record",
                "status": "passed",
                "outcome_category": "success",
                "duration_ms": 24,
                "http_status": 200,
                "message": "ok",
                "details": {"request_id": "req-archive-detail"},
            },
        ],
        "summary": {
            "total": 2,
            "passed": 1,
            "failed": 1,
            "skipped": 0,
            "categories": {
                "success": 1,
                "skipped_not_configured": 0,
                "dns": 0,
                "transport": 0,
                "timeout": 0,
                "http_4xx": 0,
                "http_5xx": 1,
                "invalid_payload": 0,
                "http_other": 0,
            },
            "public_surface_state": {
                "status": "degraded",
                "degraded_reason_categories": ["http_5xx"],
                "annotation": "Public route failures are reported as observed with no coercion.",
            },
        },
        "launch_readiness_claim": None,
        "conclusion": "not-set-by-route-diagnosis",
    }
    markdown = "# Hosted Public Route Diagnosis\n\n- Total checks: `2`\n"
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

    def test_bundle_generation_can_reuse_existing_target_when_explicitly_enabled(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            kwargs = dict(
                milestone_or_slice="ANU-LAUNCH-004",
                commands=["pass-command"],
                changed_files=[],
                include_git_changed_files=False,
                source_docs_referenced=[],
                open_risks=[],
                human_notes=[],
                environment_note=None,
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-16T10:00:00Z",
                build_id="anu-launch-004-proof",
                command_runner=_fake_runner_factory(),
            )

            first_dir, _, _ = MODULE.generate_evidence_bundle(**kwargs)
            second_dir, second_payload, _ = MODULE.generate_evidence_bundle(
                **kwargs,
                allow_existing_bundle_dir=True,
            )

            self.assertEqual(first_dir, second_dir)
            self.assertEqual(second_payload["milestone_or_slice"], "ANU-LAUNCH-004")

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

    def test_hosted_launch_smoke_and_attachment_manifest_integrate_honestly(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            bundle_dir, payload, markdown = MODULE.generate_evidence_bundle(
                milestone_or_slice="ANU-LAUNCH-002",
                commands=["python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v"],
                changed_files=["scripts/launch_rc_hosted_smoke.py"],
                include_git_changed_files=False,
                source_docs_referenced=["docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md"],
                open_risks=["hosted checks depend on environment availability"],
                human_notes=["hosted smoke is evidence, not approval"],
                environment_note="hosted-proof",
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-16T10:21:00Z",
                build_id="anu-launch-002-proof",
                command_runner=_fake_runner_factory(),
                run_hosted_launch_smoke_layer=True,
                hosted_public_base_url="https://public.example.com",
                hosted_public_host_for_resolution="partner.example.com",
                hosted_archive_record_slug="hosted-record",
                hosted_control_base_url="https://control.example.com",
                hosted_control_site_id="42",
                hosted_control_auth_header="Bearer hosted-token",
                hosted_control_auth_source="direct_header",
                hosted_launch_smoke_timeout_seconds=10,
                hosted_screenshot_refs=[
                    "attachments/public-archive-list.png",
                    "attachments/control-publish-readiness.png",
                ],
                hosted_recording_refs=["attachments/hosted-smoke-walkthrough.mp4"],
                hosted_operator_notes=["Control token issued from hosted operator vault."],
                hosted_preflight_runner=_fake_hosted_preflight_runner,
                hosted_launch_smoke_runner=_fake_hosted_launch_smoke_runner,
                attachment_validation_runner=_fake_attachment_validation_runner,
            )

            self.assertTrue((bundle_dir / "hosted_preflight.json").exists())
            self.assertTrue((bundle_dir / "hosted_preflight.md").exists())
            self.assertTrue((bundle_dir / "hosted_launch_smoke.json").exists())
            self.assertTrue((bundle_dir / "hosted_launch_smoke.md").exists())
            self.assertTrue((bundle_dir / "attachments.json").exists())
            self.assertTrue((bundle_dir / "attachment_validation.json").exists())
            self.assertTrue((bundle_dir / "attachment_validation.md").exists())
            self.assertTrue((bundle_dir / "operator_runbook.md").exists())
            self.assertTrue((bundle_dir / "attachments").is_dir())

            from_disk = json.loads((bundle_dir / "evidence.json").read_text(encoding="utf-8"))
            self.assertIn("hosted_preflight", from_disk)
            self.assertIn("hosted_launch_smoke", from_disk)
            self.assertIn("attachments", from_disk)
            self.assertIn("attachment_validation", from_disk)
            self.assertIn("operator_runbook", from_disk)
            self.assertEqual(from_disk["hosted_preflight"]["json_artifact"], "hosted_preflight.json")
            self.assertTrue(from_disk["hosted_preflight"]["summary"]["valid_for_execution"])
            self.assertEqual(from_disk["hosted_launch_smoke"]["json_artifact"], "hosted_launch_smoke.json")
            self.assertEqual(from_disk["hosted_launch_smoke"]["summary"]["skipped"], 1)
            self.assertEqual(from_disk["hosted_launch_smoke"]["launch_readiness_claim"], None)
            self.assertEqual(from_disk["attachments"]["manifest_artifact"], "attachments.json")
            self.assertEqual(from_disk["attachments"]["summary"]["screenshots_count"], 2)
            self.assertEqual(from_disk["attachments"]["summary"]["recordings_count"], 1)
            self.assertEqual(from_disk["attachment_validation"]["summary"]["missing"], 1)
            self.assertEqual(from_disk["operator_runbook"]["markdown_artifact"], "operator_runbook.md")

            attachments = json.loads((bundle_dir / "attachments.json").read_text(encoding="utf-8"))
            self.assertEqual(attachments["contract_version"], "anu-launch-attachments.v1")
            self.assertEqual(attachments["summary"]["screenshots_count"], 2)
            self.assertEqual(attachments["summary"]["recordings_count"], 1)
            self.assertTrue(all(item["path"].startswith("attachments/") for item in attachments["screenshots"]))
            self.assertTrue(all(item["path"].startswith("attachments/") for item in attachments["recordings"]))
            preflight = json.loads((bundle_dir / "hosted_preflight.json").read_text(encoding="utf-8"))
            self.assertEqual(preflight["contract_version"], "anu-launch-preflight.v1")
            attachment_validation = json.loads((bundle_dir / "attachment_validation.json").read_text(encoding="utf-8"))
            self.assertEqual(attachment_validation["contract_version"], "anu-launch-attachment-validation.v1")
            runbook = (bundle_dir / "operator_runbook.md").read_text(encoding="utf-8")
            self.assertIn("Hosted Smoke Operator Runbook", runbook)
            self.assertIn("Hosted Preflight", markdown)
            self.assertIn("Attachment Validation", markdown)
            self.assertIn("Hosted Launch Smoke (Release-Candidate Layer)", markdown)
            self.assertIn("Hosted Attachments", markdown)
            self.assertIsNone(payload["human_narrative"]["completion_claim"])

    def test_invalid_hosted_preflight_fails_fast_before_hosted_smoke(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            with self.assertRaises(ValueError):
                MODULE.generate_evidence_bundle(
                    milestone_or_slice="ANU-LAUNCH-002",
                    commands=[],
                    changed_files=[],
                    include_git_changed_files=False,
                    source_docs_referenced=[],
                    open_risks=[],
                    human_notes=[],
                    environment_note=None,
                    output_root=output_root,
                    repo_root=repo_root,
                    generated_at="2026-04-16T10:25:00Z",
                    build_id="anu-launch-002-invalid-preflight",
                    command_runner=_fake_runner_factory(),
                    run_hosted_launch_smoke_layer=True,
                    hosted_public_base_url=None,
                    hosted_public_host_for_resolution=None,
                    hosted_archive_record_slug=None,
                    hosted_control_base_url=None,
                    hosted_control_site_id=None,
                    hosted_control_auth_header=None,
                    hosted_preflight_runner=_fake_invalid_hosted_preflight_runner,
                    hosted_launch_smoke_runner=_fake_hosted_launch_smoke_runner,
                )

    def test_hosted_route_diagnosis_artifacts_integrate_additively(self):
        with _workspace_temp_dir() as temp_root:
            output_root = temp_root / "docs" / "program" / "evidence"
            repo_root = temp_root / "repo"
            repo_root.mkdir(parents=True)

            bundle_dir, payload, markdown = MODULE.generate_evidence_bundle(
                milestone_or_slice="ANU-LAUNCH-005",
                commands=["python -m unittest scripts.tests.test_launch_rc_hosted_route_diagnosis -v"],
                changed_files=["scripts/launch_rc_hosted_route_diagnosis.py"],
                include_git_changed_files=False,
                source_docs_referenced=["docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md"],
                open_risks=["public hosted routes remain environment dependent"],
                human_notes=["diagnosis captures observed hosted route outcomes only"],
                environment_note="hosted-diagnosis",
                output_root=output_root,
                repo_root=repo_root,
                generated_at="2026-04-17T00:13:00Z",
                build_id="anu-launch-005-proof",
                command_runner=_fake_runner_factory(),
                run_hosted_route_diagnosis_layer=True,
                hosted_public_base_url="https://public.example.com",
                hosted_public_host_for_resolution="partner.example.com",
                hosted_archive_record_slug="hosted-record",
                hosted_route_diagnosis_timeout_seconds=10,
                hosted_route_diagnosis_runner=_fake_hosted_route_diagnosis_runner,
            )

            self.assertTrue((bundle_dir / "hosted_route_diagnosis.json").exists())
            self.assertTrue((bundle_dir / "hosted_route_diagnosis.md").exists())

            from_disk = json.loads((bundle_dir / "evidence.json").read_text(encoding="utf-8"))
            self.assertIn("hosted_route_diagnosis", from_disk)
            self.assertEqual(from_disk["hosted_route_diagnosis"]["json_artifact"], "hosted_route_diagnosis.json")
            self.assertEqual(from_disk["hosted_route_diagnosis"]["markdown_artifact"], "hosted_route_diagnosis.md")
            self.assertEqual(from_disk["hosted_route_diagnosis"]["summary"]["failed"], 1)
            self.assertEqual(from_disk["hosted_route_diagnosis"]["summary"]["public_surface_state"]["status"], "degraded")
            self.assertIsNone(from_disk["hosted_route_diagnosis"]["launch_readiness_claim"])
            self.assertIn("Hosted Public Route Diagnosis", markdown)
            self.assertIn("degraded_reason_categories", markdown)
            self.assertIsNone(payload["human_narrative"]["completion_claim"])


if __name__ == "__main__":
    unittest.main()
