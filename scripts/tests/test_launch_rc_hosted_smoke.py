from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest


def _load_module():
    module_path = Path(__file__).resolve().parents[1] / "launch_rc_hosted_smoke.py"
    spec = importlib.util.spec_from_file_location("launch_rc_hosted_smoke", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = _load_module()


def _response(status_code: int | None, body: str = "", error: str | None = None):
    return MODULE.HttpResponse(status_code=status_code, body_text=body, error=error)


def _fake_request_runner_factory(*, mode: str):
    def _runner(method: str, url: str, _headers: dict[str, str], _json_payload, _timeout: int):
        if mode == "success":
            if "/api/public/sites/resolve?" in url:
                return _response(200, '{"ok":true,"data":{"resolved":true,"node_slug":"partner"}}')
            if method == "POST" and url.endswith("/api/control/sites/bootstrap"):
                return _response(422, '{"ok":false,"error":{"message":"validation error"}}')
            return _response(200, '{"ok":true}')
        if mode == "failure":
            if "/api/control/" in url:
                return _response(403, '{"ok":false,"error":{"message":"forbidden"}}')
            return _response(200, '{"ok":true,"data":{"resolved":false}}')
        return _response(None, "", "network down")

    return _runner


class LaunchRcHostedSmokeTests(unittest.TestCase):
    def test_hosted_smoke_output_shape_is_deterministic(self):
        summary = MODULE.run_hosted_launch_smoke(
            generated_at="2026-04-16T10:30:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            control_base_url="https://control.example.com",
            control_site_id="7",
            control_auth_header="Bearer token",
            include_control_checks=False,
            include_bootstrap_mutation=False,
            request_runner=_fake_request_runner_factory(mode="success"),
        )

        self.assertEqual(summary["contract_version"], "anu-launch-smoke-hosted.v1")
        self.assertEqual(summary["generated_at"], "2026-04-16T10:30:00+00:00")
        self.assertIn("environment", summary)
        self.assertIn("checks", summary)
        self.assertIn("summary", summary)
        self.assertEqual(summary["launch_readiness_claim"], None)
        self.assertEqual(summary["conclusion"], "not-set-by-smoke")

        self.assertEqual(len(summary["checks"]), 9)
        first = summary["checks"][0]
        for key in ("check_id", "label", "method", "path", "status", "duration_ms", "http_status", "message", "details"):
            self.assertIn(key, first)

    def test_hosted_smoke_success_failure_and_skipped_states_are_honest(self):
        success = MODULE.run_hosted_launch_smoke(
            generated_at="2026-04-16T10:31:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            control_base_url="https://control.example.com",
            control_site_id="7",
            control_auth_header="Bearer token",
            include_control_checks=True,
            include_bootstrap_mutation=False,
            request_runner=_fake_request_runner_factory(mode="success"),
        )
        self.assertEqual(success["summary"]["failed"], 0)
        self.assertGreater(success["summary"]["passed"], 0)

        skipped = MODULE.run_hosted_launch_smoke(
            generated_at="2026-04-16T10:32:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution=None,
            archive_record_slug=None,
            control_base_url=None,
            control_site_id=None,
            control_auth_header=None,
            include_control_checks=True,
            include_bootstrap_mutation=False,
            request_runner=_fake_request_runner_factory(mode="success"),
        )
        self.assertGreater(skipped["summary"]["skipped"], 0)
        self.assertIn("skipped", {check["status"] for check in skipped["checks"]})

        failure = MODULE.run_hosted_launch_smoke(
            generated_at="2026-04-16T10:33:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            control_base_url="https://control.example.com",
            control_site_id="7",
            control_auth_header="Bearer token",
            include_control_checks=True,
            include_bootstrap_mutation=True,
            request_runner=_fake_request_runner_factory(mode="failure"),
        )
        self.assertGreater(failure["summary"]["failed"], 0)
        self.assertIn("failed", {check["status"] for check in failure["checks"]})

    def test_hosted_markdown_renders_contract_honestly(self):
        summary = MODULE.run_hosted_launch_smoke(
            generated_at="2026-04-16T10:34:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution=None,
            archive_record_slug=None,
            control_base_url=None,
            control_site_id=None,
            control_auth_header=None,
            include_control_checks=True,
            include_bootstrap_mutation=False,
            request_runner=_fake_request_runner_factory(mode="success"),
        )
        markdown = MODULE.render_hosted_launch_smoke_markdown(summary)
        self.assertIn("Hosted Launch RC Smoke Summary", markdown)
        self.assertIn("launch_readiness_claim", markdown)
        self.assertIn("release-candidate evidence layer only", markdown)

    def test_control_headers_include_auth_and_control_plane_secret_when_configured(self):
        observed_control_headers: list[dict[str, str]] = []

        def _runner(method: str, url: str, headers: dict[str, str], _json_payload, _timeout: int):
            if "/api/control/" in url:
                observed_control_headers.append(dict(headers))
            if "/api/public/sites/resolve?" in url:
                return _response(200, '{"ok":true,"data":{"resolved":true,"node_slug":"partner"}}')
            if method == "POST" and url.endswith("/api/control/sites/bootstrap"):
                return _response(422, '{"ok":false,"error":{"message":"validation error"}}')
            return _response(200, '{"ok":true}')

        summary = MODULE.run_hosted_launch_smoke(
            generated_at="2026-04-16T10:35:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            control_base_url="https://control.example.com",
            control_site_id="7",
            control_auth_header="Bearer token",
            control_plane_secret_header="shared-secret",
            include_control_checks=True,
            include_bootstrap_mutation=False,
            request_runner=_runner,
        )

        self.assertEqual(summary["summary"]["failed"], 0)
        self.assertGreater(len(observed_control_headers), 0)
        for headers in observed_control_headers:
            self.assertEqual(headers.get("Authorization"), "Bearer token")
            self.assertEqual(headers.get("X-Control-Plane-Secret"), "shared-secret")


if __name__ == "__main__":
    unittest.main()
