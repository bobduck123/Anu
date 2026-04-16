from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest


def _load_module():
    module_path = Path(__file__).resolve().parents[1] / "launch_rc_smoke.py"
    spec = importlib.util.spec_from_file_location("launch_rc_smoke", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = _load_module()


class LaunchRcSmokeTests(unittest.TestCase):
    def test_smoke_output_shape_is_deterministic(self):
        summary = MODULE.run_launch_smoke(
            generated_at="2026-04-16T08:00:00Z",
            include_control_checks=False,
            include_bootstrap_mutation=False,
        )

        self.assertEqual(summary["contract_version"], "anu-launch-smoke.v1")
        self.assertEqual(summary["generated_at"], "2026-04-16T08:00:00+00:00")
        self.assertIn("environment", summary)
        self.assertIn("checks", summary)
        self.assertIn("summary", summary)
        self.assertEqual(summary["launch_readiness_claim"], None)
        self.assertEqual(summary["conclusion"], "not-set-by-smoke")

        self.assertGreaterEqual(len(summary["checks"]), 7)
        first = summary["checks"][0]
        for key in ("check_id", "label", "method", "path", "status", "duration_ms", "http_status", "message", "details"):
            self.assertIn(key, first)

    def test_success_failure_and_skipped_states_are_honest(self):
        success = MODULE.run_launch_smoke(
            generated_at="2026-04-16T08:01:00Z",
            control_host="control.test",
            include_control_checks=True,
            include_bootstrap_mutation=True,
        )
        self.assertEqual(success["summary"]["failed"], 0)
        self.assertGreater(success["summary"]["passed"], 0)

        skipped = MODULE.run_launch_smoke(
            generated_at="2026-04-16T08:02:00Z",
            include_control_checks=False,
            include_bootstrap_mutation=False,
        )
        self.assertGreater(skipped["summary"]["skipped"], 0)
        self.assertIn("skipped", {check["status"] for check in skipped["checks"]})

        failure = MODULE.run_launch_smoke(
            generated_at="2026-04-16T08:03:00Z",
            control_host="public.test",
            include_control_checks=True,
            include_bootstrap_mutation=True,
        )
        self.assertGreater(failure["summary"]["failed"], 0)
        self.assertIn("failed", {check["status"] for check in failure["checks"]})

    def test_markdown_summary_renders_contract_honestly(self):
        summary = MODULE.run_launch_smoke(
            generated_at="2026-04-16T08:04:00Z",
            include_control_checks=False,
            include_bootstrap_mutation=False,
        )
        markdown = MODULE.render_launch_smoke_markdown(summary)
        self.assertIn("Launch RC Smoke Summary", markdown)
        self.assertIn("launch_readiness_claim", markdown)
        self.assertIn("release-candidate smoke layer only", markdown)


if __name__ == "__main__":
    unittest.main()
