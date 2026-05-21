#!/usr/bin/env python3
"""Hosted Presence Graph contract smoke.

This script is intentionally environment-driven. It proves public transport and
auth boundaries by default, then exercises protected branches only when the
operator supplies real test tokens. It never prints token values.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any


DEFAULT_API_BASE = "https://anu-back-end.vercel.app"


@dataclass
class CheckResult:
    name: str
    status: str
    detail: str
    http_status: int | None = None
    data: dict[str, Any] = field(default_factory=dict)


def _env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _json_request(
    base: str,
    path: str,
    *,
    method: str = "GET",
    token: str | None = None,
    control_secret: str | None = None,
    control_host: str | None = None,
    body: dict[str, Any] | None = None,
    timeout: int = 20,
) -> tuple[int, dict[str, Any]]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if control_secret:
        headers["X-Control-Plane-Secret"] = control_secret
    if control_host:
        headers["Host"] = control_host
    request = urllib.request.Request(f"{base.rstrip('/')}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read().decode("utf-8", errors="replace")
            return response.status, _decode_json(payload)
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        return exc.code, _decode_json(payload)


def _decode_json(payload: str) -> dict[str, Any]:
    if not payload:
        return {}
    try:
        decoded = json.loads(payload)
    except json.JSONDecodeError:
        return {"_non_json": payload[:500]}
    return decoded if isinstance(decoded, dict) else {"_json": decoded}


def _payload_data(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data")
    return data if isinstance(data, dict) else {}


def _is_json_error(payload: dict[str, Any]) -> bool:
    return bool(payload) and (
        payload.get("ok") is False
        or isinstance(payload.get("error"), dict)
        or isinstance(payload.get("msg"), str)
        or isinstance(payload.get("message"), str)
    )


def _pass(name: str, detail: str, http_status: int | None = None, **data: Any) -> CheckResult:
    return CheckResult(name=name, status="pass", detail=detail, http_status=http_status, data=data)


def _fail(name: str, detail: str, http_status: int | None = None, **data: Any) -> CheckResult:
    return CheckResult(name=name, status="fail", detail=detail, http_status=http_status, data=data)


def _blocked(name: str, detail: str, **data: Any) -> CheckResult:
    return CheckResult(name=name, status="blocked", detail=detail, data=data)


def _safe_room_key_summary(data: dict[str, Any]) -> dict[str, Any]:
    room = data.get("room") if isinstance(data.get("room"), dict) else {}
    encounter = data.get("encounter") if isinstance(data.get("encounter"), dict) else {}
    return {
        "room_id": room.get("id"),
        "room_slug": room.get("slug"),
        "room_key_status": (data.get("room_key") or {}).get("status") if isinstance(data.get("room_key"), dict) else None,
        "encounter_id": encounter.get("id"),
        "encounter_source": encounter.get("source"),
        "campaign_context": encounter.get("context_label"),
    }


def run() -> dict[str, Any]:
    base = _env("PRESENCE_GRAPH_HOSTED_API_BASE") or DEFAULT_API_BASE
    timeout = int(_env("PRESENCE_GRAPH_HOSTED_TIMEOUT") or "20")
    token = _env("PRESENCE_GRAPH_HOSTED_ROOM_KEY_TOKEN")
    room_id = _env("PRESENCE_GRAPH_HOSTED_ROOM_ID")
    mood_board_id = _env("PRESENCE_GRAPH_HOSTED_MOOD_BOARD_ID")
    observer_token = _env("PRESENCE_GRAPH_HOSTED_OBSERVER_TOKEN")
    owner_token = _env("PRESENCE_GRAPH_HOSTED_OWNER_TOKEN")
    control_token = _env("PRESENCE_GRAPH_HOSTED_CONTROL_TOKEN")
    control_secret = _env("PRESENCE_GRAPH_HOSTED_CONTROL_SECRET")
    control_host = _env("PRESENCE_GRAPH_HOSTED_CONTROL_HOST")

    checks: list[CheckResult] = []

    try:
        status, payload = _json_request(base, "/health", timeout=timeout)
        checks.append(_pass("health", "Backend health endpoint returned JSON.", status, ready=payload.get("ready")) if status == 200 else _fail("health", "Backend health did not return 200.", status))
    except Exception as exc:  # noqa: BLE001 - smoke should report any network/runtime failure.
        checks.append(_fail("health", f"Backend health request failed: {type(exc).__name__}"))

    if token:
        try:
            status, payload = _json_request(base, f"/api/presence/keys/{token}/resolve", timeout=timeout)
            data = _payload_data(payload)
            if status == 200 and payload.get("ok") is True and data.get("encounter"):
                checks.append(_pass("room_key_resolve", "RoomKey resolved and returned a single captured encounter; no follow-up capture was sent by this smoke.", status, **_safe_room_key_summary(data)))
            else:
                checks.append(_fail("room_key_resolve", "RoomKey resolve did not return the expected public entry payload.", status, payload_shape=sorted(payload.keys())))
        except Exception as exc:  # noqa: BLE001
            checks.append(_fail("room_key_resolve", f"RoomKey resolve request failed: {type(exc).__name__}"))
    else:
        checks.append(_blocked("room_key_resolve", "Set PRESENCE_GRAPH_HOSTED_ROOM_KEY_TOKEN to exercise hosted public RoomKey resolve.", missing_env=["PRESENCE_GRAPH_HOSTED_ROOM_KEY_TOKEN"]))

    try:
        status, payload = _json_request(base, "/api/observer/passport", timeout=timeout)
        checks.append(_pass("observer_passport_without_auth", "Observer passport is protected and returns structured JSON without auth.", status) if status in {401, 403} and _is_json_error(payload) else _fail("observer_passport_without_auth", "Observer passport did not fail cleanly without auth.", status, payload_shape=sorted(payload.keys())))
    except Exception as exc:  # noqa: BLE001
        checks.append(_fail("observer_passport_without_auth", f"Unauthenticated observer request failed at transport: {type(exc).__name__}"))

    if observer_token:
        for name, path in [
            ("observer_passport_with_auth", "/api/observer/passport"),
            ("observer_mood_boards_with_auth", "/api/observer/mood-boards"),
        ]:
            try:
                status, payload = _json_request(base, path, token=observer_token, timeout=timeout)
                checks.append(_pass(name, "Authenticated observer route returned JSON.", status, payload_shape=sorted(payload.keys())) if status == 200 and payload.get("ok") is True else _fail(name, "Authenticated observer route did not return 200 ok.", status, payload_shape=sorted(payload.keys())))
            except Exception as exc:  # noqa: BLE001
                checks.append(_fail(name, f"Authenticated observer route failed at transport: {type(exc).__name__}"))
    else:
        checks.append(_blocked("observer_authenticated_routes", "Set PRESENCE_GRAPH_HOSTED_OBSERVER_TOKEN to prove hosted observer passport and mood boards.", missing_env=["PRESENCE_GRAPH_HOSTED_OBSERVER_TOKEN"]))

    if room_id:
        try:
            status, payload = _json_request(base, f"/api/paths/from-room/{room_id}", timeout=timeout)
            data = _payload_data(payload)
            path_ok = status == 200 and payload.get("ok") is True and isinstance(data.get("waypoints"), list) and isinstance(data.get("choices"), list)
            checks.append(_pass("path_from_room", "Public path-from-room returned waypoints and choices.", status, waypoint_count=len(data.get("waypoints") or []), choice_count=len(data.get("choices") or [])) if path_ok else _fail("path_from_room", "Path-from-room did not return graph path data.", status, payload_shape=sorted(payload.keys())))
        except Exception as exc:  # noqa: BLE001
            checks.append(_fail("path_from_room", f"Path-from-room request failed: {type(exc).__name__}"))

        try:
            status, payload = _json_request(base, f"/api/presence/owner/rooms/{room_id}/analytics", timeout=timeout)
            checks.append(_pass("owner_analytics_without_auth", "Owner analytics is protected without auth.", status) if status in {401, 403} and _is_json_error(payload) else _fail("owner_analytics_without_auth", "Owner analytics did not fail cleanly without auth.", status, payload_shape=sorted(payload.keys())))
        except Exception as exc:  # noqa: BLE001
            checks.append(_fail("owner_analytics_without_auth", f"Unauthenticated analytics request failed at transport: {type(exc).__name__}"))

        if owner_token:
            for name, path in [
                ("owner_passes_with_auth", f"/api/presence/owner/rooms/{room_id}/passes"),
                ("owner_keys_with_auth", f"/api/presence/owner/rooms/{room_id}/keys"),
                ("owner_analytics_with_auth", f"/api/presence/owner/rooms/{room_id}/analytics"),
            ]:
                try:
                    status, payload = _json_request(base, path, token=owner_token, timeout=timeout)
                    checks.append(_pass(name, "Authenticated owner route returned JSON.", status, payload_shape=sorted(payload.keys())) if status == 200 and payload.get("ok") is True else _fail(name, "Authenticated owner route did not return 200 ok.", status, payload_shape=sorted(payload.keys())))
                except Exception as exc:  # noqa: BLE001
                    checks.append(_fail(name, f"Authenticated owner route failed at transport: {type(exc).__name__}"))
        else:
            checks.append(_blocked("owner_authenticated_routes", "Set PRESENCE_GRAPH_HOSTED_OWNER_TOKEN and PRESENCE_GRAPH_HOSTED_ROOM_ID to prove hosted owner pass/key/analytics routes.", missing_env=["PRESENCE_GRAPH_HOSTED_OWNER_TOKEN"]))
    else:
        checks.append(_blocked("path_and_owner_room_routes", "Set PRESENCE_GRAPH_HOSTED_ROOM_ID to exercise path-from-room and owner auth boundaries.", missing_env=["PRESENCE_GRAPH_HOSTED_ROOM_ID"]))

    if mood_board_id:
        try:
            status, payload = _json_request(base, f"/api/paths/from-mood-board/{mood_board_id}", timeout=timeout)
            data = _payload_data(payload)
            path_ok = status == 200 and payload.get("ok") is True and isinstance(data.get("waypoints"), list) and isinstance(data.get("choices"), list)
            checks.append(_pass("path_from_mood_board", "Public path-from-mood-board returned waypoints and choices.", status, waypoint_count=len(data.get("waypoints") or []), choice_count=len(data.get("choices") or [])) if path_ok else _fail("path_from_mood_board", "Path-from-mood-board did not return graph path data.", status, payload_shape=sorted(payload.keys())))
        except Exception as exc:  # noqa: BLE001
            checks.append(_fail("path_from_mood_board", f"Path-from-mood-board request failed: {type(exc).__name__}"))
    else:
        checks.append(_blocked("path_from_mood_board", "Set PRESENCE_GRAPH_HOSTED_MOOD_BOARD_ID to prove hosted mood-board path derivation.", missing_env=["PRESENCE_GRAPH_HOSTED_MOOD_BOARD_ID"]))

    try:
        status, payload = _json_request(base, "/api/admin/presence/world-readiness", timeout=timeout)
        checks.append(_pass("world_readiness_without_control_auth", "World readiness admin route is protected without control auth.", status) if status in {401, 403} and _is_json_error(payload) else _fail("world_readiness_without_control_auth", "World readiness route did not fail cleanly without control auth.", status, payload_shape=sorted(payload.keys())))
    except Exception as exc:  # noqa: BLE001
        checks.append(_fail("world_readiness_without_control_auth", f"Unauthenticated world-readiness request failed at transport: {type(exc).__name__}"))

    if control_token and control_secret:
        try:
            status, payload = _json_request(
                base,
                "/api/admin/presence/world-readiness",
                token=control_token,
                control_secret=control_secret,
                control_host=control_host,
                timeout=timeout,
            )
            data = _payload_data(payload)
            checks.append(_pass("world_readiness_with_control_auth", "Control-auth world readiness returned hidden/forming-safe data.", status, status_value=data.get("status"), message=data.get("message")) if status == 200 and payload.get("ok") is True else _fail("world_readiness_with_control_auth", "Control-auth world readiness did not return 200 ok.", status, payload_shape=sorted(payload.keys())))
        except Exception as exc:  # noqa: BLE001
            checks.append(_fail("world_readiness_with_control_auth", f"Control-auth world-readiness request failed at transport: {type(exc).__name__}"))
    else:
        checks.append(_blocked("world_readiness_control_auth", "Set PRESENCE_GRAPH_HOSTED_CONTROL_TOKEN and PRESENCE_GRAPH_HOSTED_CONTROL_SECRET to prove hosted admin readiness.", missing_env=["PRESENCE_GRAPH_HOSTED_CONTROL_TOKEN", "PRESENCE_GRAPH_HOSTED_CONTROL_SECRET"]))

    status_counts: dict[str, int] = {}
    for check in checks:
        status_counts[check.status] = status_counts.get(check.status, 0) + 1

    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "api_base": base,
        "checks": [check.__dict__ for check in checks],
        "summary": status_counts,
        "result": "fail" if status_counts.get("fail") else "blocked" if status_counts.get("blocked") else "pass",
        "secret_values_printed": False,
    }


def main() -> int:
    result = run()
    print(json.dumps(result, indent=2, sort_keys=True))
    if result["summary"].get("fail"):
        return 1
    if result["summary"].get("blocked"):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
