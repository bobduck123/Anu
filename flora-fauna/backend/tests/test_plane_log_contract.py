import os
from unittest.mock import patch

import pytest
from flask import g

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-plane-log-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-plane-log-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


class _CaptureLogger:
    def __init__(self):
        self.records = []

    def info(self, message, *args, **kwargs):
        self.records.append(("info", message, kwargs))

    def warning(self, message, *args, **kwargs):
        self.records.append(("warning", message, kwargs))

    def warn(self, message, *args, **kwargs):
        self.records.append(("warn", message, kwargs))

    def error(self, message, *args, **kwargs):
        self.records.append(("error", message, kwargs))

    def debug(self, message, *args, **kwargs):
        self.records.append(("debug", message, kwargs))


def test_plane_log_envelope_redacts_sensitive_fields_and_emits_required_fields():
    app = _build_app()
    from manara_backend_app.security.plane_log import emit_plane_log

    logger = _CaptureLogger()
    with app.app_context():
        with app.test_request_context("/public/archive/records?type=trust", method="GET"):
            g.request_id = "req-public-1"
            envelope = emit_plane_log(
                plane="public",
                event_name="public_archive_records_listed",
                level="info",
                context={
                    "record_type": "public-trust-report",
                    "access_token": "top-secret-token",
                    "nested": {"authorization": "Bearer abc123"},
                },
                request_id=None,
                correlation_id="corr-1",
            )

    assert envelope["plane"] == "public"
    assert envelope["service_name"] == "flora-fauna-backend"
    assert envelope["event_name"] == "public_archive_records_listed"
    assert envelope["level"] == "info"
    assert isinstance(envelope["timestamp"], str)
    assert envelope["request_id"] == "req-public-1"
    assert envelope["correlation_id"] == "corr-1"
    assert envelope["context"]["record_type"] == "public-trust-report"
    assert envelope["context"]["access_token"] == "[redacted]"
    assert envelope["context"]["nested"]["authorization"] == "[redacted]"


def test_plane_log_envelope_rejects_invalid_plane():
    app = _build_app()
    from manara_backend_app.security.plane_log import build_plane_log_envelope

    with app.app_context():
        with pytest.raises(ValueError):
            build_plane_log_envelope(plane="participant", event_name="invalid", context={})


def test_public_trust_route_emits_public_plane_log():
    app = _build_app()
    client = app.test_client()

    with patch("manara_backend_app.api.public_trust.emit_plane_log") as emit_log:
        response = client.get("/public/trust/reports")

    assert response.status_code == 200
    assert emit_log.called
    first_kwargs = emit_log.call_args_list[0].kwargs
    assert first_kwargs["plane"] == "public"
    assert first_kwargs["event_name"] == "public_trust_reports_listed"


def test_control_audit_logging_emits_control_plane_envelope():
    app = _build_app()
    from manara_backend_app.security.control_plane import log_control_event

    with app.app_context():
        with app.test_request_context("/control/sites/1/manifest-authoring", method="PATCH"):
            g.request_id = "req-control-1"
            with patch("manara_backend_app.security.control_plane.emit_plane_log") as emit_log:
                row = log_control_event(
                    action="manifest_authoring_updated",
                    actor_id=None,
                    target_type="public_site_manifest",
                    target_id="1",
                    payload={"access_token": "never-log", "site_name": "Mudyin"},
                )

            assert row.id is not None
            assert emit_log.called
            kwargs = emit_log.call_args.kwargs
            assert kwargs["plane"] == "control"
            assert kwargs["event_name"] == "control_audit_event_recorded"
            assert kwargs["context"]["payload_keys"] == ["access_token", "site_name"]
