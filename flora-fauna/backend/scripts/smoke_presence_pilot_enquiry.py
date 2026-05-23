from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from presence_pilot_smoke_common import (
    add_step,
    build_result,
    data_dict,
    data_value,
    env,
    issue_hosted_subject_owner_token,
    json_shape,
    load_env_file,
    missing_step,
    request_json,
    write_artifacts,
)


SCRIPT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ENV = SCRIPT_ROOT / ".env.presence-first-pilot-ggm.local"
DEFAULT_EVIDENCE = SCRIPT_ROOT / "docs/program/evidence/presence-first-pilot-ggm-onboarding-proof"
DEFAULT_BACKEND_ENV = SCRIPT_ROOT / "flora-fauna/backend/.env.presence-controlled-launch.backend-production.local"


def safe_enquiry_payload(slug: str) -> dict[str, Any]:
    return {
        "name": "Presence GGM Pilot Smoke",
        "email": "presence-ggm-pilot-smoke@example.test",
        "message": "Safe first-pilot enquiry verification. No reply is required.",
        "preferred_contact_method": "email",
        "consent": True,
        "source_type": "first_pilot_smoke",
        "source_url": f"/presence/{slug}?source=first-pilot-smoke",
        "form_started_at": 1,
        "enquiry_type": "pilot_verification",
    }


def run(args: argparse.Namespace) -> dict[str, Any]:
    steps = []
    backend_url = args.backend_url or env("PRESENCE_PILOT_GGM_BACKEND_URL")
    room_slug = args.room_slug or env("PRESENCE_PILOT_GGM_ROOM_SLUG")
    room_id = args.room_id or env("PRESENCE_PILOT_GGM_ROOM_ID")
    owner_token = (
        issue_hosted_subject_owner_token(args.owner_email, args.backend_env_file)
        if args.owner_email
        else args.owner_token or env("PRESENCE_PILOT_GGM_OWNER_TOKEN")
    )
    owner_token_source = "hosted_subject" if args.owner_email else "ignored_env_or_arg"
    expected = args.expected_routing or env("PRESENCE_PILOT_GGM_ENQUIRY_EXPECTED", "capture_only")
    if not backend_url:
        missing_step(steps, "backend_url", "backend", "PRESENCE_PILOT_GGM_BACKEND_URL")
    if not room_slug:
        missing_step(steps, "room_slug", "/api/presence/public/<slug>/enquiries", "PRESENCE_PILOT_GGM_ROOM_SLUG")
    if not backend_url or not room_slug:
        return build_result("ggm_enquiry_verification", inputs={"backend_url": bool(backend_url), "room_slug": room_slug}, steps=steps)

    public_route = f"/api/presence/public/{room_slug}"
    status, payload, latency = request_json(backend_url, public_route, timeout=args.timeout)
    public_ok = status == 200 and payload.get("ok") is True and data_dict(payload).get("slug") == room_slug
    add_step(
        steps,
        "public_room_for_enquiry",
        "pass" if public_ok else "fail",
        public_route,
        "Public GGM Room exists before enquiry verification." if public_ok else "Public GGM Room was not readable.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=public_ok,
        payload_shape=json_shape(payload),
    )

    enquiry_route = f"/api/presence/public/{room_slug}/enquiries"
    status, payload, latency = request_json(
        backend_url,
        enquiry_route,
        method="POST",
        body=safe_enquiry_payload(room_slug),
        timeout=args.timeout,
    )
    submitted = data_dict(payload)
    delivery = submitted.get("delivery_status")
    expected_ok = (
        delivery == "unrouted"
        if expected == "disabled"
        else delivery == "logged_fallback"
        if expected == "capture_only"
        else delivery in {"sent", "logged_fallback"}
    )
    submission_ok = status == 201 and payload.get("ok") is True and expected_ok
    add_step(
        steps,
        "safe_enquiry_submit",
        "pass" if submission_ok else "fail",
        enquiry_route,
        (
            "Enquiry accepted and disabled-state routing was explicit."
            if expected == "disabled" and submission_ok
            else "Enquiry accepted into capture-only fallback handling."
            if expected == "capture_only" and submission_ok
            else "Enquiry accepted with configured delivery handling."
            if submission_ok
            else "Safe enquiry did not match expected delivery handling."
        ),
        http_status=status,
        latency_ms=latency,
        response_shape_matched=submission_ok,
        enquiry_id=submitted.get("id"),
        delivery_status=delivery,
        expected_routing=expected,
        payload_shape=json_shape(payload),
    )

    spam_payload = {**safe_enquiry_payload(room_slug), "website": "https://spam.invalid"}
    status, spam, latency = request_json(backend_url, enquiry_route, method="POST", body=spam_payload, timeout=args.timeout)
    spam_ok = status in {400, 422} and spam.get("ok") is False
    add_step(
        steps,
        "honeypot_validation",
        "pass" if spam_ok else "fail",
        enquiry_route,
        "Honeypot payload was rejected safely." if spam_ok else "Honeypot payload was not rejected by the public enquiry contract.",
        http_status=status,
        latency_ms=latency,
        response_shape_matched=spam_ok,
        payload_shape=json_shape(spam),
    )

    if not room_id or not owner_token:
        missing_step(steps, "owner_enquiry_storage", "/api/presence/owner/nodes/<room-id>/enquiries", "PRESENCE_PILOT_GGM_ROOM_ID", "PRESENCE_PILOT_GGM_OWNER_TOKEN")
    elif submitted.get("id"):
        owner_route = f"/api/presence/owner/nodes/{room_id}/enquiries"
        status, inbox, latency = request_json(backend_url, owner_route, token=owner_token, timeout=args.timeout)
        rows = data_value(inbox)
        stored = isinstance(rows, list) and any(row.get("id") == submitted.get("id") for row in rows if isinstance(row, dict))
        add_step(
            steps,
            "owner_enquiry_storage",
            "pass" if status == 200 and stored else "fail",
            owner_route,
            "Owner inbox includes the durable safe enquiry row." if stored else "Owner inbox did not prove the submitted safe enquiry row.",
            http_status=status,
            latency_ms=latency,
            response_shape_matched=status == 200 and isinstance(rows, list),
            enquiry_id=submitted.get("id"),
            payload_shape=json_shape(inbox),
        )

    notes = [
        "Forwarding is proven only when the API reports `sent`; `logged_fallback` proves durable capture with fallback handling.",
        "This smoke stores a clearly labelled safe enquiry row and avoids visitor PII beyond an example.test smoke address.",
    ]
    return build_result(
        "ggm_enquiry_verification",
        inputs={
            "backend_url": backend_url,
            "room_slug": room_slug,
            "room_id_present": bool(room_id),
            "expected_routing": expected,
            "owner_token_source": owner_token_source,
        },
        steps=steps,
        notes=notes,
    )


def args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify per-Room GGM pilot enquiry handling without printing secrets.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV)
    parser.add_argument("--backend-url")
    parser.add_argument("--room-slug")
    parser.add_argument("--room-id")
    parser.add_argument("--owner-token")
    parser.add_argument("--owner-email", help="Issue a short-lived server-side token for the current bound hosted owner.")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--expected-routing", choices=("active", "capture_only", "disabled"))
    parser.add_argument("--timeout", type=int, default=25)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_enquiry_verification.json")
    parser.add_argument("--markdown-output", type=Path, default=DEFAULT_EVIDENCE / "ggm_enquiry_verification.md")
    parsed = parser.parse_args(argv)
    load_env_file(parsed.env_file)
    return parsed


def main(argv: list[str] | None = None) -> int:
    parsed = args(argv)
    result = run(parsed)
    write_artifacts(result, parsed.json_output, parsed.markdown_output, "GGM Enquiry Verification")
    print(f"{result['result']}: wrote {parsed.json_output} and {parsed.markdown_output}")
    return 1 if result["result"] == "fail" else 2 if result["result"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
