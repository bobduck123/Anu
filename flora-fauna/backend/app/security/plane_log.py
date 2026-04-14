from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping

from flask import current_app, g


ALLOWED_LOG_PLANES = {"public", "control", "impact"}
SENSITIVE_KEYWORDS = (
    "authorization",
    "token",
    "secret",
    "session",
    "cookie",
    "password",
    "api_key",
    "apikey",
    "jwt",
)


def normalize_log_plane(value: str | None) -> str:
    plane = str(value or "").strip().lower()
    if plane not in ALLOWED_LOG_PLANES:
        raise ValueError(f"Unsupported log plane: {value!r}")
    return plane


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _looks_sensitive_key(key: str) -> bool:
    normalized = str(key or "").strip().lower()
    return any(keyword in normalized for keyword in SENSITIVE_KEYWORDS)


def _looks_sensitive_string(value: str) -> bool:
    normalized = str(value or "").strip().lower()
    return normalized.startswith("bearer ") or normalized.startswith("eyj")


def sanitize_log_context(value: Any) -> Any:
    if isinstance(value, Mapping):
        output: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            if _looks_sensitive_key(key_text):
                output[key_text] = "[redacted]"
                continue
            output[key_text] = sanitize_log_context(item)
        return output

    if isinstance(value, list):
        return [sanitize_log_context(item) for item in value]

    if isinstance(value, tuple):
        return [sanitize_log_context(item) for item in value]

    if isinstance(value, str) and _looks_sensitive_string(value):
        return "[redacted]"

    return value


def build_plane_log_envelope(
    *,
    plane: str,
    event_name: str,
    level: str = "info",
    service_name: str = "flora-fauna-backend",
    request_id: str | None = None,
    correlation_id: str | None = None,
    context: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_plane = normalize_log_plane(plane)
    envelope = {
        "plane": normalized_plane,
        "service_name": str(service_name or "flora-fauna-backend"),
        "event_name": str(event_name or "").strip() or "unspecified_event",
        "level": str(level or "info").strip().lower() or "info",
        "timestamp": _now_iso(),
        "request_id": request_id if request_id is not None else getattr(g, "request_id", None),
        "correlation_id": correlation_id,
    }
    if context:
        envelope["context"] = sanitize_log_context(dict(context))
    return envelope


def emit_plane_log(
    *,
    plane: str,
    event_name: str,
    level: str = "info",
    service_name: str = "flora-fauna-backend",
    request_id: str | None = None,
    correlation_id: str | None = None,
    context: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    envelope = build_plane_log_envelope(
        plane=plane,
        event_name=event_name,
        level=level,
        service_name=service_name,
        request_id=request_id,
        correlation_id=correlation_id,
        context=context,
    )

    logger = current_app.logger
    level_method = getattr(logger, envelope["level"], logger.info)
    level_method("plane_log_event", extra={"plane_log": envelope})
    return envelope
