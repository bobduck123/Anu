from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import unittest


def _load_module():
    module_path = Path(__file__).resolve().parents[1] / "launch_rc_hosted_route_diagnosis.py"
    spec = importlib.util.spec_from_file_location("launch_rc_hosted_route_diagnosis", module_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


MODULE = _load_module()


def _response(
    status_code: int | None,
    body: str = "",
    error: str | None = None,
    headers: dict[str, str] | None = None,
):
    return MODULE.HttpResponse(status_code=status_code, body_text=body, error=error, headers=headers or {})


def _fake_request_runner_factory(*, mode: str):
    def _runner(_method: str, url: str, _headers: dict[str, str], _timeout: int):
        if mode == "success":
            if "/api/public/sites/resolve?" in url:
                return _response(
                    200,
                    '{"ok":true,"data":{"resolved":true,"node_slug":"partner"},"request_id":"req-resolve"}',
                    headers={"x-request-id": "hdr-resolve"},
                )
            return _response(
                200,
                '{"ok":true,"data":{"items":[]},"request_id":"req-public"}',
                headers={"x-request-id": "hdr-public"},
            )

        if "/public/archive/records" in url:
            return _response(
                503,
                '{"ok":false,"error":{"code":"service_unavailable","message":"Archive summary list temporarily unavailable"},"request_id":"req-archive-list"}',
                headers={"x-request-id": "hdr-archive-list", "content-type": "application/json"},
            )
        if "/public/archive-handoffs/" in url:
            return _response(
                404,
                '{"ok":false,"error":{"code":"not_found","message":"Archive record missing"},"request_id":"req-archive-detail"}',
                headers={"x-request-id": "hdr-archive-detail", "content-type": "application/json"},
            )
        if "/public/trust/decisions" in url:
            return _response(
                200,
                '{"ok":false,"error":{"code":"degraded","message":"Trust feed degraded"},"request_id":"req-trust"}',
                headers={"x-request-id": "hdr-trust", "content-type": "application/json"},
            )
        return _response(None, "", "timed out while connecting", headers={})

    return _runner


class LaunchRcHostedRouteDiagnosisTests(unittest.TestCase):
    def test_diagnosis_output_shape_is_deterministic(self):
        summary = MODULE.run_hosted_route_diagnosis(
            generated_at="2026-04-17T00:10:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            timeout_seconds=10,
            request_runner=_fake_request_runner_factory(mode="success"),
        )
        self.assertEqual(summary["contract_version"], "anu-launch-hosted-route-diagnosis.v1")
        self.assertEqual(summary["generated_at"], "2026-04-17T00:10:00+00:00")
        self.assertIn("environment", summary)
        self.assertIn("checks", summary)
        self.assertIn("summary", summary)
        self.assertEqual(summary["launch_readiness_claim"], None)
        self.assertEqual(summary["conclusion"], "not-set-by-route-diagnosis")
        self.assertEqual(len(summary["checks"]), 4)
        first = summary["checks"][0]
        for key in (
            "check_id",
            "label",
            "method",
            "path",
            "status",
            "outcome_category",
            "duration_ms",
            "http_status",
            "message",
            "details",
        ):
            self.assertIn(key, first)

    def test_response_classification_is_honest_and_stable(self):
        summary = MODULE.run_hosted_route_diagnosis(
            generated_at="2026-04-17T00:11:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            timeout_seconds=10,
            request_runner=_fake_request_runner_factory(mode="mixed"),
        )
        by_id = {item["check_id"]: item for item in summary["checks"]}
        self.assertEqual(by_id["public_archive_list_route"]["outcome_category"], "http_5xx")
        self.assertEqual(by_id["public_archive_record_detail_route"]["outcome_category"], "http_4xx")
        self.assertEqual(by_id["public_trust_decisions_route"]["outcome_category"], "invalid_payload")
        self.assertEqual(by_id["white_label_public_host_resolution"]["outcome_category"], "timeout")
        self.assertEqual(by_id["public_archive_list_route"]["details"]["request_id"], "hdr-archive-list")

    def test_degraded_state_annotation_remains_honest(self):
        summary = MODULE.run_hosted_route_diagnosis(
            generated_at="2026-04-17T00:12:00Z",
            public_base_url="https://public.example.com",
            public_host_for_resolution="partner.example.com",
            archive_record_slug="record-1",
            timeout_seconds=10,
            request_runner=_fake_request_runner_factory(mode="mixed"),
        )
        public_surface_state = summary["summary"]["public_surface_state"]
        self.assertEqual(public_surface_state["status"], "degraded")
        self.assertIn("http_5xx", public_surface_state["degraded_reason_categories"])
        self.assertIn("invalid_payload", public_surface_state["degraded_reason_categories"])
        markdown = MODULE.render_hosted_route_diagnosis_markdown(summary)
        self.assertIn("Hosted Public Route Diagnosis", markdown)
        self.assertIn("degraded_reason_categories", markdown)
        self.assertIn("hdr-archive-list", markdown)


if __name__ == "__main__":
    unittest.main()

