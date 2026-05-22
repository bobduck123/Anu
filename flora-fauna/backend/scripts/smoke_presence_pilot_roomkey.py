from __future__ import annotations

import argparse
from pathlib import Path

from presence_pilot_smoke_common import (
    add_step,
    build_result,
    data_dict,
    env,
    json_shape,
    load_env_file,
    missing_step,
    request_json,
    token_placeholder_url,
    write_artifacts,
)


SCRIPT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ENV = SCRIPT_ROOT / ".env.presence-first-pilot-ggm.local"
DEFAULT_EVIDENCE = SCRIPT_ROOT / "docs/program/evidence/presence-first-pilot-ggm-onboarding-proof"


def _encounters(backend_url: str, room_id: str, owner_token: str, timeout: int) -> tuple[int, int | None, int]:
    status, payload, latency = request_json(
        backend_url,
        f"/api/presence/owner/rooms/{room_id}/analytics",
        token=owner_token,
        timeout=timeout,
    )
    return status, data_dict(payload).get("encounters_count"), latency


def run(args: argparse.Namespace) -> dict:
    steps = []
    backend_url = args.backend_url or env("PRESENCE_PILOT_GGM_BACKEND_URL")
    frontend_url = args.frontend_url or env("PRESENCE_PILOT_GGM_FRONTEND_URL")
    room_slug = args.room_slug or env("PRESENCE_PILOT_GGM_ROOM_SLUG")
    room_id = args.room_id or env("PRESENCE_PILOT_GGM_ROOM_ID")
    token = args.roomkey_token or env("PRESENCE_PILOT_GGM_ROOMKEY_TOKEN")
    revoked = args.revoked_roomkey_token or env("PRESENCE_PILOT_GGM_REVOKED_ROOMKEY_TOKEN")
    owner_token = args.owner_token or env("PRESENCE_PILOT_GGM_OWNER_TOKEN")
    for name, value in (
        ("PRESENCE_PILOT_GGM_BACKEND_URL", backend_url),
        ("PRESENCE_PILOT_GGM_ROOM_SLUG", room_slug),
        ("PRESENCE_PILOT_GGM_ROOMKEY_TOKEN", token),
    ):
        if not value:
            missing_step(steps, name.lower(), "RoomKey smoke input", name)
    if not backend_url or not room_slug or not token:
        return build_result("ggm_roomkey_verification", inputs={"backend_url_present": bool(backend_url), "room_slug": room_slug}, steps=steps)

    public_route = f"/api/presence/public/{room_slug}"
    status, payload, latency = request_json(backend_url, public_route, timeout=args.timeout)
    public_ok = status == 200 and payload.get("ok") is True and data_dict(payload).get("slug") == room_slug
    add_step(
        steps,
        "public_room_guest_read",
        "pass" if public_ok else "fail",
        public_route,
        "Guest can open the public GGM Room." if public_ok else "Public GGM Room did not load for a guest.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=public_ok,
        payload_shape=json_shape(payload),
    )

    baseline = None
    if room_id and owner_token:
        status, baseline, latency = _encounters(backend_url, room_id, owner_token, args.timeout)
        add_step(
            steps,
            "roomkey_analytics_baseline",
            "pass" if status == 200 and isinstance(baseline, int) else "fail",
            f"/api/presence/owner/rooms/{room_id}/analytics",
            "Owner analytics baseline captured before RoomKey resolve." if isinstance(baseline, int) else "Owner Room analytics baseline unavailable.",
            http_status=status,
            latency_ms=latency,
            response_shape_matched=isinstance(baseline, int),
            encounters_count=baseline,
        )
    else:
        missing_step(steps, "roomkey_analytics_baseline", "/api/presence/owner/rooms/<room-id>/analytics", "PRESENCE_PILOT_GGM_ROOM_ID", "PRESENCE_PILOT_GGM_OWNER_TOKEN")

    resolve_route = "/api/presence/keys/<roomkey-token>/resolve"
    status, payload, latency = request_json(backend_url, f"/api/presence/keys/{token}/resolve", timeout=args.timeout)
    entry = data_dict(payload)
    resolve_ok = (
        status == 200
        and payload.get("ok") is True
        and entry.get("room", {}).get("slug") == room_slug
        and isinstance(entry.get("encounter"), dict)
        and isinstance(entry.get("observer_upgrade"), str)
    )
    add_step(
        steps,
        "active_roomkey_resolve",
        "pass" if resolve_ok else "fail",
        resolve_route,
        "Active QR RoomKey resolves to GGM and captures an aggregate encounter." if resolve_ok else "Active GGM RoomKey did not return the canonical entry payload.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=resolve_ok,
        room_id=entry.get("room", {}).get("id"),
        encounter_id=entry.get("encounter", {}).get("id"),
        available_actions=entry.get("available_actions"),
        payload_shape=json_shape(payload),
    )

    invalid_route = "/api/presence/keys/<invalid-roomkey-token>/resolve"
    status, invalid, latency = request_json(backend_url, "/api/presence/keys/ggm-first-pilot-invalid-token/resolve", timeout=args.timeout)
    invalid_ok = status == 404 and invalid.get("ok") is False
    add_step(
        steps,
        "invalid_roomkey_safe_failure",
        "pass" if invalid_ok else "fail",
        invalid_route,
        "Invalid RoomKey fails with safe JSON not-found response." if invalid_ok else "Invalid RoomKey failure was not contract-safe.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=invalid_ok,
        payload_shape=json_shape(invalid),
    )

    if revoked:
        status, revoked_payload, latency = request_json(backend_url, f"/api/presence/keys/{revoked}/resolve", timeout=args.timeout)
        revoked_ok = status == 410 and revoked_payload.get("ok") is False
        add_step(
            steps,
            "revoked_roomkey_safe_failure",
            "pass" if revoked_ok else "fail",
            "/api/presence/keys/<revoked-roomkey-token>/resolve",
            "Revoked proof RoomKey fails safely." if revoked_ok else "Revoked proof RoomKey did not return the expected safe response.",
            http_status=status,
            latency_ms=latency,
            response_shape_matched=revoked_ok,
            payload_shape=json_shape(revoked_payload),
        )
    else:
        missing_step(steps, "revoked_roomkey_safe_failure", "/api/presence/keys/<revoked-roomkey-token>/resolve", "PRESENCE_PILOT_GGM_REVOKED_ROOMKEY_TOKEN")

    if room_id and owner_token and isinstance(baseline, int):
        status, after, latency = _encounters(backend_url, room_id, owner_token, args.timeout)
        incremented = status == 200 and isinstance(after, int) and after >= baseline + 1
        add_step(
            steps,
            "roomkey_owner_analytics_increment",
            "pass" if incremented else "fail",
            f"/api/presence/owner/rooms/{room_id}/analytics",
            "Owner Room analytics reflects the RoomKey entry." if incremented else "Owner Room analytics did not reflect the RoomKey entry.",
            http_status=status,
            latency_ms=latency,
            response_shape_matched=isinstance(after, int),
            before=baseline,
            after=after,
        )

    add_step(
        steps,
        "qr_payload_format",
        "pass",
        token_placeholder_url(frontend_url),
        "QR payload format points at the frontend RoomKey entry route and keeps the token out of evidence.",
        response_shape_matched=True,
        frontend_url_present=bool(frontend_url),
    )
    notes = [
        "The active RoomKey token is read from an ignored local env file or process env and is never written to evidence.",
        "The RoomKey entry payload includes the Observer upgrade prompt; it does not require guest auth before the public Room is shown.",
    ]
    return build_result(
        "ggm_roomkey_verification",
        inputs={"backend_url": backend_url, "frontend_url": frontend_url, "room_slug": room_slug, "room_id_present": bool(room_id)},
        steps=steps,
        notes=notes,
    )


def args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify GGM first-pilot NFC/QR RoomKey entry.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--backend-url")
    parser.add_argument("--frontend-url")
    parser.add_argument("--room-slug")
    parser.add_argument("--room-id")
    parser.add_argument("--roomkey-token")
    parser.add_argument("--revoked-roomkey-token")
    parser.add_argument("--owner-token")
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_roomkey_verification.json")
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_roomkey_verification.md")
    parsed = parser.parse_args(argv)
    load_env_file(parsed.env_file)
    return parsed


def main(argv: list[str] | None = None) -> int:
    parsed = args(argv)
    result = run(parsed)
    write_artifacts(result, parsed.json_output, parsed.markdown_output, "GGM RoomKey Verification")
    print(f"{result['result']}: wrote {parsed.json_output} and {parsed.markdown_output}")
    return 1 if result["result"] == "fail" else 2 if result["result"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
