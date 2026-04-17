from __future__ import annotations

import importlib.util
from pathlib import Path
import shutil
import sys
import unittest
from contextlib import contextmanager
from uuid import uuid4


def _load_module():
    module_path = Path(__file__).resolve().parents[1] / "launch_rc_hosted_preflight.py"
    spec = importlib.util.spec_from_file_location("launch_rc_hosted_preflight", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = _load_module()


@contextmanager
def _workspace_temp_dir():
    roots = [
        Path.home() / ".codex" / "memories" / "anu-launch-tests",
        Path.cwd() / ".tmp_launch_tests",
    ]

    path: Path | None = None
    last_error: Exception | None = None
    for root in roots:
        try:
            root.mkdir(parents=True, exist_ok=True)
            candidate = root / f"launch003-{uuid4().hex}"
            candidate.mkdir(parents=False, exist_ok=False)
            probe = candidate / ".write_probe"
            probe.mkdir(parents=True, exist_ok=False)
            probe.rmdir()
            path = candidate
            break
        except Exception as exc:  # pragma: no cover - environment dependent
            last_error = exc

    if path is None:
        raise RuntimeError(f"No writable temp root for tests: {last_error}") from last_error

    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)


class LaunchRcHostedPreflightTests(unittest.TestCase):
    def test_required_hosted_inputs_validate_correctly(self):
        summary = MODULE.run_hosted_preflight(
            generated_at="2026-04-16T11:20:00Z",
            include_control_checks=True,
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="launch-smoke-record",
            control_base_url="https://control.example.com",
            control_site_id="42",
            control_auth_header="Bearer token",
            control_auth_source="direct_header",
        )
        self.assertEqual(summary["summary"]["invalid"], 0)
        self.assertEqual(summary["summary"]["missing"], 0)
        self.assertTrue(summary["summary"]["valid_for_execution"])
        self.assertEqual({item["status"] for item in summary["checks"]}, {"valid"})

    def test_skipped_by_mode_inputs_are_represented_honestly(self):
        summary = MODULE.run_hosted_preflight(
            generated_at="2026-04-16T11:21:00Z",
            include_control_checks=False,
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="launch-smoke-record",
            control_base_url=None,
            control_site_id=None,
            control_auth_header=None,
            control_auth_source=None,
        )
        self.assertTrue(summary["summary"]["valid_for_execution"])
        self.assertGreater(summary["summary"]["skipped_by_mode"], 0)
        statuses = {item["status"] for item in summary["checks"]}
        self.assertIn("skipped-by-mode", statuses)
        self.assertIn("valid", statuses)

    def test_invalid_and_missing_inputs_fail_preflight(self):
        summary = MODULE.run_hosted_preflight(
            generated_at="2026-04-16T11:22:00Z",
            include_control_checks=True,
            public_base_url="notaurl",
            public_host_for_resolution="bad host",
            archive_record_slug="",
            control_base_url="http:/broken",
            control_site_id="zero",
            control_auth_header="",
            control_auth_source="env:CONTROL_AUTH",
        )
        self.assertFalse(summary["summary"]["valid_for_execution"])
        self.assertGreater(summary["summary"]["invalid"], 0)
        self.assertGreater(summary["summary"]["missing"], 0)
        self.assertGreater(len(summary["blocking_fields"]), 0)

    def test_attachment_validator_detects_missing_files(self):
        with _workspace_temp_dir() as tmp_dir:
            attachments_dir = tmp_dir / "attachments"
            attachments_dir.mkdir(parents=True, exist_ok=True)
            existing = attachments_dir / "public-archive-list.png"
            existing.write_text("image-bytes", encoding="utf-8")

            manifest = {
                "screenshots": [
                    {"id": "s1", "path": "attachments/public-archive-list.png"},
                    {"id": "s2", "path": "attachments/missing-shot.png"},
                ],
                "recordings": [
                    {"id": "r1", "path": "attachments/missing-walkthrough.mp4"},
                ],
                "operator_notes": [],
            }
            summary = MODULE.validate_attachment_references(
                generated_at="2026-04-16T11:23:00Z",
                bundle_dir=tmp_dir,
                attachments_manifest=manifest,
            )
            self.assertEqual(summary["summary"]["total"], 3)
            self.assertEqual(summary["summary"]["valid"], 1)
            self.assertEqual(summary["summary"]["missing"], 2)
            self.assertEqual(summary["operator_notes"]["status"], "missing")
            markdown = MODULE.render_attachment_validation_markdown(summary)
            self.assertIn("Hosted Attachment Validation", markdown)

    def test_preflight_markdown_includes_statuses(self):
        summary = MODULE.run_hosted_preflight(
            generated_at="2026-04-16T11:24:00Z",
            include_control_checks=False,
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="launch-smoke-record",
            control_base_url=None,
            control_site_id=None,
            control_auth_header=None,
            control_auth_source=None,
        )
        markdown = MODULE.render_hosted_preflight_markdown(summary)
        self.assertIn("Hosted Smoke Preflight", markdown)
        self.assertIn("skipped_by_mode", markdown)
        self.assertIn("valid_for_execution", markdown)


if __name__ == "__main__":
    unittest.main()
