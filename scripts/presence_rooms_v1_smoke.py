#!/usr/bin/env python3
"""
Presence Rooms v1 smoke test.

Environment:
  PRESENCE_ROOMS_SMOKE_API_BASE=http://localhost:5000
  PRESENCE_ROOMS_SMOKE_WEB_BASE=http://localhost:3001
  PRESENCE_SMOKE_CONTROL_TOKEN=<optional control audience JWT>
  PRESENCE_SMOKE_CONTROL_SECRET=<optional X-Control-Plane-Secret>
  PRESENCE_SMOKE_CONTROL_HOST=<optional Host header for control-plane calls>
  PRESENCE_SMOKE_TENANT_ID=<required only for creating draft/private fixtures>
  PRESENCE_ROOMS_SMOKE_SKIP_UNAVAILABLE=1  # explicit dependency skip mode

Default behavior:
  - missing frontend/backend is a non-zero dependency failure
  - missing control auth skips only the draft/private fixture checks
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request


API_BASE = os.environ.get("PRESENCE_ROOMS_SMOKE_API_BASE", "http://localhost:5000").rstrip("/")
WEB_BASE = os.environ.get("PRESENCE_ROOMS_SMOKE_WEB_BASE", "http://localhost:3001").rstrip("/")
TOKEN = os.environ.get("PRESENCE_SMOKE_CONTROL_TOKEN", "").strip()
CONTROL_SECRET = os.environ.get("PRESENCE_SMOKE_CONTROL_SECRET", "").strip()
CONTROL_HOST = os.environ.get("PRESENCE_SMOKE_CONTROL_HOST", "").strip()
TENANT_ID = os.environ.get("PRESENCE_SMOKE_TENANT_ID", "").strip()
SKIP_UNAVAILABLE = os.environ.get("PRESENCE_ROOMS_SMOKE_SKIP_UNAVAILABLE", "").lower() in {"1", "true", "yes"}

DEMO_ROOMS = [
    ("rooms-independent-artist", "Mara Vale Studio"),
    ("rooms-healing-practitioner", "River Kin Practice"),
    ("rooms-dj-performer", "DJ Sol Nadir"),
    ("rooms-consultant", "Sami Vale Advisory"),
    ("rooms-community-organisation", "Waratah Commons"),
]


class SmokeDependencyError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _dependency_error(exc: urllib.error.URLError, base: str) -> SmokeDependencyError:
    reason = getattr(exc, "reason", exc)
    return SmokeDependencyError(f"Dependency unavailable at {base}: {reason}")


def request_text(base: str, path: str) -> tuple[int, str]:
    req = urllib.request.Request(f"{base}{path}", headers={"Accept": "text/html"})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        raise _dependency_error(exc, base) from exc


def request_json(method: str, path: str, payload: dict | None = None, *, auth: bool = False) -> tuple[int, dict]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if auth:
        headers["Authorization"] = f"Bearer {TOKEN}"
        if CONTROL_SECRET:
            headers["X-Control-Plane-Secret"] = CONTROL_SECRET
        if CONTROL_HOST:
            headers["Host"] = CONTROL_HOST
    req = urllib.request.Request(f"{API_BASE}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8", errors="replace")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw}
        return exc.code, payload
    except urllib.error.URLError as exc:
        raise _dependency_error(exc, API_BASE) from exc


def assert_public_room(slug: str, display_name: str) -> None:
    status, api = request_json("GET", f"/api/presence/public/{slug}")
    require(status == 200, f"public API failed for {slug}: {status} {api}")
    data = api.get("data") or {}
    require(data.get("display_name") == display_name, f"API display name mismatch for {slug}: {data.get('display_name')}")
    require(data.get("room_type"), f"room_type missing for {slug}")
    require((data.get("seo") or {}).get("canonical_url", "").endswith(f"/presence/{slug}"), f"canonical URL not /presence for {slug}")

    status, html = request_text(WEB_BASE, f"/presence/{slug}")
    require(status == 200 and display_name in html, f"web /presence route failed for {slug}: {status}")


def assert_legacy_route(slug: str, display_name: str) -> None:
    status, html = request_text(WEB_BASE, f"/p/{slug}")
    require(status == 200 and display_name in html, f"legacy /p route failed for {slug}: {status}")


def assert_enquiry_flow() -> None:
    status, enquiry = request_json(
        "POST",
        "/api/presence/public/rooms-consultant/enquiries",
        {
            "name": "Smoke Visitor",
            "email": "smoke-visitor@example.org",
            "message": "Presence Rooms v1 smoke enquiry.",
            "preferred_contact_method": "email",
            "consent": True,
            "enquiry_type": "conversation",
            "source_url": "/presence/rooms-consultant",
            "source_type": "presence_rooms_v1_smoke",
        },
    )
    data = enquiry.get("data") or {}
    require(status == 201 and data.get("status") == "new", f"enquiry smoke failed: {status} {enquiry}")
    require(data.get("delivery_status") in {"sent", "logged_fallback", "failed", "unrouted"}, f"delivery_status missing: {enquiry}")
    require(isinstance(data.get("message"), str) and data["message"], f"delivery message missing: {enquiry}")

    status, invalid = request_json(
        "POST",
        "/api/presence/public/rooms-consultant/enquiries",
        {"name": "Missing Message", "email": "invalid-smoke@example.org", "consent": True, "preferred_contact_method": "email"},
    )
    require(status == 400, f"invalid enquiry payload was not rejected: {status} {invalid}")

    status, honeypot = request_json(
        "POST",
        "/api/presence/public/rooms-consultant/enquiries",
        {
            "name": "Smoke Honeypot",
            "email": "honeypot@example.org",
            "message": "This should be rejected by the honeypot.",
            "preferred_contact_method": "email",
            "consent": True,
            "website": "https://spam.example",
        },
    )
    require(status == 400, f"honeypot payload was not rejected: {status} {honeypot}")


def create_hidden_room(public_status: str) -> str:
    slug = f"presence-room-smoke-{public_status}-{int(time.time())}"
    status, payload = request_json(
        "POST",
        "/api/control/presence/nodes",
        {
            "tenant_id": int(TENANT_ID),
            "organisation_id": int(TENANT_ID),
            "slug": slug,
            "display_name": f"Hidden {public_status} Smoke Room",
            "headline": "This room must not be public.",
            "node_type": "custom",
            "display_mode": "profile_card",
            "plan_type": "basic",
            "visibility": "public",
            "room_type": "minimal_card",
            "theme_preset": "clean_light",
            "public_status": public_status,
        },
        auth=True,
    )
    require(status == 201, f"hidden room create failed: {status} {payload}")
    return slug


def assert_hidden_rooms() -> bool:
    if not TOKEN or not TENANT_ID:
        print("skip hidden-room checks: PRESENCE_SMOKE_CONTROL_TOKEN and PRESENCE_SMOKE_TENANT_ID are not set")
        return False
    for public_status in ("draft", "private"):
        hidden_slug = create_hidden_room(public_status)
        status, payload = request_json("GET", f"/api/presence/public/{hidden_slug}")
        require(status == 404, f"{public_status} room was publicly visible: {status} {payload}")
        print(f"ok hidden {public_status} room")
    return True


def main() -> int:
    print(f"Presence Rooms smoke using API={API_BASE} WEB={WEB_BASE}")
    for slug, display_name in DEMO_ROOMS:
        assert_public_room(slug, display_name)
        print(f"ok public room {slug}")

    assert_legacy_route(DEMO_ROOMS[0][0], DEMO_ROOMS[0][1])
    print("ok legacy /p route")

    assert_enquiry_flow()
    print("ok enquiry validation and delivery_status")

    hidden_checked = assert_hidden_rooms()
    print("Presence Rooms v1 smoke passed" + ("" if hidden_checked else " with auth-dependent hidden checks skipped"))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SmokeDependencyError as exc:
        print(f"Presence Rooms v1 smoke dependency unavailable: {exc}", file=sys.stderr)
        if SKIP_UNAVAILABLE:
            print("skip requested by PRESENCE_ROOMS_SMOKE_SKIP_UNAVAILABLE=1")
            raise SystemExit(0)
        raise SystemExit(2)
    except Exception as exc:
        print(f"Presence Rooms v1 smoke failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
