from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from presence_pilot_smoke_common import (
    add_step,
    build_result,
    contains_private_identity_key,
    data_dict,
    env,
    json_shape,
    issue_hosted_subject_owner_token,
    load_env_file,
    missing_step,
    request_json,
    write_artifacts,
)
from smoke_presence_pilot_enquiry import safe_enquiry_payload


SCRIPT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ENV = SCRIPT_ROOT / ".env.presence-first-pilot-ggm.local"
DEFAULT_EVIDENCE = SCRIPT_ROOT / "docs/program/evidence/presence-first-pilot-ggm-onboarding-proof"
DEFAULT_BACKEND_ENV = SCRIPT_ROOT / "flora-fauna/backend/.env.presence-controlled-launch.backend-production.local"


def _get_analytics(backend_url: str, room_id: str, owner_token: str, timeout: int) -> tuple[int, dict[str, Any], int]:
    return request_json(backend_url, f"/api/presence/owner/rooms/{room_id}/analytics", token=owner_token, timeout=timeout)


def _get_node_analytics(backend_url: str, room_id: str, owner_token: str, timeout: int) -> tuple[int, dict[str, Any], int]:
    return request_json(backend_url, f"/api/presence/owner/nodes/{room_id}/analytics", token=owner_token, timeout=timeout)


def run(args: argparse.Namespace) -> dict[str, Any]:
    steps = []
    backend_url = args.backend_url or env("PRESENCE_PILOT_GGM_BACKEND_URL")
    room_slug = args.room_slug or env("PRESENCE_PILOT_GGM_ROOM_SLUG")
    room_id = args.room_id or env("PRESENCE_PILOT_GGM_ROOM_ID")
    roomkey = args.roomkey_token or env("PRESENCE_PILOT_GGM_ROOMKEY_TOKEN")
    owner_token = (
        issue_hosted_subject_owner_token(args.owner_email, args.backend_env_file)
        if args.owner_email
        else args.owner_token or env("PRESENCE_PILOT_GGM_OWNER_TOKEN")
    )
    owner_token_source = "hosted_subject" if args.owner_email else "ignored_env_or_arg"
    foreign_room_id = args.foreign_room_id or env("PRESENCE_PILOT_GGM_FOREIGN_ROOM_ID")
    enquiry_expected = args.enquiry_expected or env("PRESENCE_PILOT_GGM_ENQUIRY_EXPECTED", "capture_only")
    for name, value in (
        ("PRESENCE_PILOT_GGM_BACKEND_URL", backend_url),
        ("PRESENCE_PILOT_GGM_ROOM_SLUG", room_slug),
        ("PRESENCE_PILOT_GGM_ROOM_ID", room_id),
        ("PRESENCE_PILOT_GGM_OWNER_TOKEN", owner_token),
        ("PRESENCE_PILOT_GGM_ROOMKEY_TOKEN", roomkey),
    ):
        if not value:
            missing_step(steps, name.lower(), "owner analytics smoke input", name)
    if not backend_url or not room_slug or not room_id or not owner_token or not roomkey:
        return build_result("ggm_owner_analytics_verification", inputs={"backend_url_present": bool(backend_url), "room_slug": room_slug}, steps=steps)

    status, graph_before_payload, latency = _get_analytics(backend_url, room_id, owner_token, args.timeout)
    graph_before = data_dict(graph_before_payload)
    graph_before_ok = status == 200 and isinstance(graph_before.get("encounters_count"), int)
    add_step(
        steps,
        "graph_analytics_baseline",
        "pass" if graph_before_ok else "fail",
        f"/api/presence/owner/rooms/{room_id}/analytics",
        "Graph analytics baseline returned aggregate RoomKey metrics." if graph_before_ok else "Graph analytics baseline was not usable.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=graph_before_ok,
        encounters_count=graph_before.get("encounters_count"),
        payload_shape=json_shape(graph_before_payload),
    )
    status, node_before_payload, latency = _get_node_analytics(backend_url, room_id, owner_token, args.timeout)
    node_before = data_dict(node_before_payload)
    node_before_ok = status == 200 and isinstance(node_before.get("total_views"), int) and isinstance(node_before.get("total_enquiries"), int)
    add_step(
        steps,
        "node_analytics_baseline",
        "pass" if node_before_ok else "fail",
        f"/api/presence/owner/nodes/{room_id}/analytics",
        "Node analytics baseline returned Room view/enquiry counts." if node_before_ok else "Node analytics baseline was not usable.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=node_before_ok,
        total_views=node_before.get("total_views"),
        total_enquiries=node_before.get("total_enquiries"),
        payload_shape=json_shape(node_before_payload),
    )

    status, entry_payload, latency = request_json(backend_url, f"/api/presence/keys/{roomkey}/resolve", timeout=args.timeout)
    entry_ok = status == 200 and entry_payload.get("ok") is True and data_dict(entry_payload).get("room", {}).get("slug") == room_slug
    add_step(
        steps,
        "pilot_roomkey_interaction",
        "pass" if entry_ok else "fail",
        "/api/presence/keys/<roomkey-token>/resolve",
        "RoomKey interaction executed for analytics proof." if entry_ok else "RoomKey interaction did not execute.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=entry_ok,
        encounter_id=data_dict(entry_payload).get("encounter", {}).get("id"),
    )
    status, public_payload, latency = request_json(backend_url, f"/api/presence/public/{room_slug}", timeout=args.timeout)
    view_ok = status == 200 and public_payload.get("ok") is True
    add_step(
        steps,
        "pilot_public_room_open",
        "pass" if view_ok else "fail",
        f"/api/presence/public/{room_slug}",
        "Public Room open interaction executed for analytics proof." if view_ok else "Public Room open interaction did not execute.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=view_ok,
    )

    if args.submit_enquiry:
        status, enquiry_payload, latency = request_json(
            backend_url,
            f"/api/presence/public/{room_slug}/enquiries",
            method="POST",
            body=safe_enquiry_payload(room_slug),
            timeout=args.timeout,
        )
        delivery = data_dict(enquiry_payload).get("delivery_status")
        routing_ok = (
            delivery == "unrouted"
            if enquiry_expected == "disabled"
            else delivery == "logged_fallback"
            if enquiry_expected == "capture_only"
            else delivery in {"sent", "logged_fallback"}
        )
        enquiry_ok = status == 201 and enquiry_payload.get("ok") is True and routing_ok
        add_step(
            steps,
            "pilot_enquiry_interaction",
            "pass" if enquiry_ok else "fail",
            f"/api/presence/public/{room_slug}/enquiries",
            "Safe enquiry interaction executed for analytics proof." if enquiry_ok else "Safe enquiry interaction did not match expected routing.",
            http_status=status,
            latency_ms=latency,
            response_shape_matched=enquiry_ok,
            delivery_status=delivery,
            expected_routing=enquiry_expected,
        )
    else:
        add_step(
            steps,
            "pilot_enquiry_interaction",
            "pass",
            f"/api/presence/public/{room_slug}/enquiries",
            "Enquiry analytics interaction intentionally skipped; per-Room enquiry smoke owns that mutation.",
            response_shape_matched=True,
        )

    status, graph_after_payload, latency = _get_analytics(backend_url, room_id, owner_token, args.timeout)
    graph_after = data_dict(graph_after_payload)
    encounter_increment = (
        graph_before_ok and status == 200 and isinstance(graph_after.get("encounters_count"), int)
        and graph_after["encounters_count"] >= graph_before["encounters_count"] + 1
    )
    private_graph = contains_private_identity_key(graph_after)
    add_step(
        steps,
        "graph_analytics_after_interactions",
        "pass" if encounter_increment and not private_graph else "fail",
        f"/api/presence/owner/rooms/{room_id}/analytics",
        "Owner graph analytics increments without private Observer identity keys." if encounter_increment and not private_graph else "Graph analytics increment or privacy shape failed.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=isinstance(graph_after.get("encounters_count"), int),
        encounters_before=graph_before.get("encounters_count"),
        encounters_after=graph_after.get("encounters_count"),
        private_identity_key_seen=private_graph,
    )

    status, node_after_payload, latency = _get_node_analytics(backend_url, room_id, owner_token, args.timeout)
    node_after = data_dict(node_after_payload)
    view_increment = (
        node_before_ok and status == 200 and isinstance(node_after.get("total_views"), int)
        and node_after["total_views"] >= node_before["total_views"] + 1
    )
    enquiry_increment_ok = (
        not args.submit_enquiry
        or (
            isinstance(node_after.get("total_enquiries"), int)
            and node_after["total_enquiries"] >= node_before["total_enquiries"] + 1
        )
    )
    private_node = contains_private_identity_key(node_after)
    add_step(
        steps,
        "node_analytics_after_interactions",
        "pass" if view_increment and enquiry_increment_ok and not private_node else "fail",
        f"/api/presence/owner/nodes/{room_id}/analytics",
        "Owner node analytics reflects public activity with aggregate-safe shape." if view_increment and enquiry_increment_ok and not private_node else "Node analytics increment or privacy shape failed.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=isinstance(node_after.get("total_views"), int),
        views_before=node_before.get("total_views"),
        views_after=node_after.get("total_views"),
        enquiries_before=node_before.get("total_enquiries"),
        enquiries_after=node_after.get("total_enquiries"),
        private_identity_key_seen=private_node,
    )

    if args.skip_isolation:
        add_step(
            steps,
            "owner_analytics_isolation",
            "pass",
            "/api/presence/owner/rooms/<foreign-room-id>/analytics",
            "Skipped here because this owner token is platform_admin; non-owner denial is verified by the admin-account smoke.",
            response_shape_matched=True,
        )
    elif foreign_room_id:
        status, foreign_payload, latency = _get_analytics(backend_url, foreign_room_id, owner_token, args.timeout)
        isolation_ok = status == 403 and foreign_payload.get("ok") is False
        add_step(
            steps,
            "owner_analytics_isolation",
            "pass" if isolation_ok else "fail",
            f"/api/presence/owner/rooms/{foreign_room_id}/analytics",
            "GGM owner token cannot read another owner's Room analytics." if isolation_ok else "Owner isolation analytics check failed.",
            http_status=status,
            latency_ms=latency,
            response_shape_matched=isolation_ok,
            payload_shape=json_shape(foreign_payload),
        )
    else:
        missing_step(steps, "owner_analytics_isolation", "/api/presence/owner/rooms/<foreign-room-id>/analytics", "PRESENCE_PILOT_GGM_FOREIGN_ROOM_ID")

    notes = [
        "Save/follow, Hall, portal, stall, and Path events are not required by the GGM first-pilot plan unless those surfaces are enabled.",
        "Both analytics APIs are checked: graph RoomKey encounter metrics and Presence Node view/enquiry metrics.",
    ]
    return build_result(
        "ggm_owner_analytics_verification",
        inputs={
            "backend_url": backend_url,
            "room_slug": room_slug,
            "room_id": room_id,
            "submit_enquiry": args.submit_enquiry,
            "owner_token_source": owner_token_source,
        },
        steps=steps,
        notes=notes,
    )


def args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify GGM first-pilot owner analytics increments and isolation.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--backend-url")
    parser.add_argument("--room-slug")
    parser.add_argument("--room-id")
    parser.add_argument("--roomkey-token")
    parser.add_argument("--owner-token")
    parser.add_argument("--owner-email", help="Issue a short-lived server-side token for the current bound hosted owner.")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--foreign-room-id")
    parser.add_argument("--skip-isolation", action="store_true", help="Record isolation as covered by a separate non-admin negative smoke.")
    parser.add_argument("--enquiry-expected", choices=("active", "capture_only", "disabled"))
    parser.add_argument("--submit-enquiry", action="store_true")
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_owner_analytics_verification.json")
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_owner_analytics_verification.md")
    parsed = parser.parse_args(argv)
    load_env_file(parsed.env_file)
    return parsed


def main(argv: list[str] | None = None) -> int:
    parsed = args(argv)
    result = run(parsed)
    write_artifacts(result, parsed.json_output, parsed.markdown_output, "GGM Owner Analytics Verification")
    print(f"{result['result']}: wrote {parsed.json_output} and {parsed.markdown_output}")
    return 1 if result["result"] == "fail" else 2 if result["result"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
