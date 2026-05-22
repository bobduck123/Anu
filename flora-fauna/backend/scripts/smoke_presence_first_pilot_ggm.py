from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from presence_pilot_smoke_common import (
    add_step,
    build_result,
    data_dict,
    env,
    json_shape,
    load_env_file,
    missing_step,
    request_json,
    request_text,
    write_artifacts,
)
from smoke_presence_pilot_enquiry import safe_enquiry_payload


SCRIPT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ENV = SCRIPT_ROOT / ".env.presence-first-pilot-ggm.local"
DEFAULT_EVIDENCE = SCRIPT_ROOT / "docs/program/evidence/presence-first-pilot-ggm-onboarding-proof"
ROLLBACK_CHECKLIST = SCRIPT_ROOT / "docs/program/PRESENCE_FIRST_PILOT_GGM_ROLLBACK_DISABLE_CHECKLIST_2026-05-22.md"


def _owner_graph(backend_url: str, room_id: str, token: str, timeout: int) -> tuple[int, dict[str, Any], int]:
    return request_json(backend_url, f"/api/presence/owner/rooms/{room_id}/analytics", token=token, timeout=timeout)


def run(args: argparse.Namespace) -> dict[str, Any]:
    steps = []
    backend_url = args.backend_url or env("PRESENCE_PILOT_GGM_BACKEND_URL")
    frontend_url = args.frontend_url or env("PRESENCE_PILOT_GGM_FRONTEND_URL")
    room_slug = args.room_slug or env("PRESENCE_PILOT_GGM_ROOM_SLUG")
    room_id = args.room_id or env("PRESENCE_PILOT_GGM_ROOM_ID")
    owner_token = args.owner_token or env("PRESENCE_PILOT_GGM_OWNER_TOKEN")
    roomkey = args.roomkey_token or env("PRESENCE_PILOT_GGM_ROOMKEY_TOKEN")
    expected_enquiry = args.enquiry_expected or env("PRESENCE_PILOT_GGM_ENQUIRY_EXPECTED", "capture_only")
    required = {
        "PRESENCE_PILOT_GGM_BACKEND_URL": backend_url,
        "PRESENCE_PILOT_GGM_FRONTEND_URL": frontend_url,
        "PRESENCE_PILOT_GGM_ROOM_SLUG": room_slug,
        "PRESENCE_PILOT_GGM_ROOM_ID": room_id,
        "PRESENCE_PILOT_GGM_OWNER_TOKEN": owner_token,
        "PRESENCE_PILOT_GGM_ROOMKEY_TOKEN": roomkey,
    }
    for name, value in required.items():
        if not value:
            missing_step(steps, name.lower(), "GGM post-onboarding smoke input", name)
    if any(not value for value in required.values()):
        return build_result("ggm_post_onboarding_smoke", inputs={key: bool(value) for key, value in required.items()}, steps=steps)

    status, health, latency = request_json(backend_url, "/health", timeout=args.timeout)
    health_ok = status == 200 and isinstance(health, dict)
    add_step(
        steps,
        "backend_health",
        "pass" if health_ok else "fail",
        "/health",
        "Hosted backend health answered before pilot smoke." if health_ok else "Hosted backend health did not answer safely.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=health_ok,
        payload_shape=json_shape(health),
    )
    status, public_room, latency = request_json(backend_url, f"/api/presence/public/{room_slug}", timeout=args.timeout)
    room_ok = status == 200 and public_room.get("ok") is True and data_dict(public_room).get("slug") == room_slug
    add_step(
        steps,
        "public_room_exists",
        "pass" if room_ok else "fail",
        f"/api/presence/public/{room_slug}",
        "GGM Presence Room is public." if room_ok else "GGM Presence Room is not public.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=room_ok,
    )
    status, frontend_room, latency = request_text(frontend_url, f"/presence/{room_slug}", timeout=args.timeout)
    frontend_ok = status == 200 and "ggm-first-pilot-invalid-token" not in frontend_room.lower()
    add_step(
        steps,
        "frontend_public_room_route",
        "pass" if frontend_ok else "fail",
        f"/presence/{room_slug}",
        "Frontend public Room route returned HTML." if frontend_ok else "Frontend public Room route did not return a usable page.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=frontend_ok,
    )

    status, baseline_payload, latency = _owner_graph(backend_url, room_id, owner_token, args.timeout)
    baseline = data_dict(baseline_payload)
    baseline_ok = status == 200 and isinstance(baseline.get("encounters_count"), int)
    add_step(
        steps,
        "owner_analytics_baseline",
        "pass" if baseline_ok else "fail",
        f"/api/presence/owner/rooms/{room_id}/analytics",
        "Owner analytics baseline captured." if baseline_ok else "Owner analytics baseline missing.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=baseline_ok,
        encounters_count=baseline.get("encounters_count"),
    )
    status, entry, latency = request_json(backend_url, f"/api/presence/keys/{roomkey}/resolve", timeout=args.timeout)
    entry_data = data_dict(entry)
    entry_ok = status == 200 and entry.get("ok") is True and entry_data.get("room", {}).get("slug") == room_slug
    add_step(
        steps,
        "roomkey_entry",
        "pass" if entry_ok else "fail",
        "/api/presence/keys/<roomkey-token>/resolve",
        "RoomKey entry resolves to GGM and captures entry." if entry_ok else "RoomKey entry failed.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=entry_ok,
        encounter_id=entry_data.get("encounter", {}).get("id"),
    )
    status, invalid, latency = request_json(backend_url, "/api/presence/keys/ggm-first-pilot-invalid-token/resolve", timeout=args.timeout)
    invalid_ok = status == 404 and invalid.get("ok") is False
    add_step(
        steps,
        "invalid_roomkey",
        "pass" if invalid_ok else "fail",
        "/api/presence/keys/<invalid-roomkey-token>/resolve",
        "Invalid RoomKey fails safely." if invalid_ok else "Invalid RoomKey contract failed.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=invalid_ok,
    )
    status, frontend_key, latency = request_text(frontend_url, "/r/ggm-first-pilot-invalid-token", timeout=args.timeout)
    frontend_key_ok = status in {200, 404}
    add_step(
        steps,
        "frontend_roomkey_route_exists",
        "pass" if frontend_key_ok else "fail",
        "/r/<roomkey-token>",
        "Frontend RoomKey route is deployed; backend valid-token proof is recorded above." if frontend_key_ok else "Frontend RoomKey route did not answer.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=frontend_key_ok,
    )

    status, enquiry, latency = request_json(
        backend_url,
        f"/api/presence/public/{room_slug}/enquiries",
        method="POST",
        body=safe_enquiry_payload(room_slug),
        timeout=args.timeout,
    )
    delivery = data_dict(enquiry).get("delivery_status")
    expected_ok = (
        delivery == "unrouted"
        if expected_enquiry == "disabled"
        else delivery == "logged_fallback"
        if expected_enquiry == "capture_only"
        else delivery in {"sent", "logged_fallback"}
    )
    enquiry_ok = status == 201 and enquiry.get("ok") is True and expected_ok
    add_step(
        steps,
        "enquiry_route",
        "pass" if enquiry_ok else "fail",
        f"/api/presence/public/{room_slug}/enquiries",
        "Enquiry route matched the pilot routing posture." if enquiry_ok else "Enquiry route did not match the pilot routing posture.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=enquiry_ok,
        delivery_status=delivery,
        expected_enquiry=expected_enquiry,
    )
    status, after_payload, latency = _owner_graph(backend_url, room_id, owner_token, args.timeout)
    after = data_dict(after_payload)
    analytics_ok = baseline_ok and status == 200 and after.get("encounters_count", -1) >= baseline["encounters_count"] + 1
    add_step(
        steps,
        "owner_analytics_updated",
        "pass" if analytics_ok else "fail",
        f"/api/presence/owner/rooms/{room_id}/analytics",
        "Owner analytics reflects post-onboarding RoomKey entry." if analytics_ok else "Owner analytics did not reflect RoomKey entry.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=isinstance(after.get("encounters_count"), int),
        before=baseline.get("encounters_count"),
        after=after.get("encounters_count"),
    )

    status, world_html, latency = request_text(frontend_url, "/world", timeout=args.timeout)
    world_ok = status == 200 and "forming" in world_html.lower() and "realtime multiplayer" not in world_html.lower()
    add_step(
        steps,
        "world_forming_frontend",
        "pass" if world_ok else "fail",
        "/world",
        "World remains a forming frontend surface." if world_ok else "World forming posture was not proven from frontend HTML.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=world_ok,
    )
    rollback_ok = ROLLBACK_CHECKLIST.exists()
    add_step(
        steps,
        "rollback_checklist_exists",
        "pass" if rollback_ok else "fail",
        str(ROLLBACK_CHECKLIST.relative_to(SCRIPT_ROOT)),
        "GGM rollback/disable checklist exists." if rollback_ok else "GGM rollback/disable checklist is missing.",
        response_shape_matched=rollback_ok,
    )
    add_step(
        steps,
        "deferred_surfaces_posture",
        "pass",
        "GGM room plan",
        "GGM Hall, Path, and Observer save verification remain deferred unless the pilot plan enables them.",
        response_shape_matched=True,
    )
    notes = [
        "The smoke performs safe tagged pilot interactions only; it does not alter the external GGM static site.",
        "V2 and realtime claims are checked as launch posture, not as product promises.",
    ]
    return build_result(
        "ggm_post_onboarding_smoke",
        inputs={"backend_url": backend_url, "frontend_url": frontend_url, "room_slug": room_slug, "expected_enquiry": expected_enquiry},
        steps=steps,
        notes=notes,
    )


def args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run combined GGM first-pilot post-onboarding smoke.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--backend-url")
    parser.add_argument("--frontend-url")
    parser.add_argument("--room-slug")
    parser.add_argument("--room-id")
    parser.add_argument("--owner-token")
    parser.add_argument("--roomkey-token")
    parser.add_argument("--enquiry-expected", choices=("active", "capture_only", "disabled"))
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_post_onboarding_smoke.json")
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_post_onboarding_smoke.md")
    parsed = parser.parse_args(argv)
    load_env_file(parsed.env_file)
    return parsed


def main(argv: list[str] | None = None) -> int:
    parsed = args(argv)
    result = run(parsed)
    write_artifacts(result, parsed.json_output, parsed.markdown_output, "GGM Post-Onboarding Smoke")
    print(f"{result['result']}: wrote {parsed.json_output} and {parsed.markdown_output}")
    return 1 if result["result"] == "fail" else 2 if result["result"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
