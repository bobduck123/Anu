#!/usr/bin/env python3
"""Presence v1.1 launch smoke.

Safe defaults:
- Runs public/backend/app checks without secrets.
- Runs owner draft checks only when PRESENCE_SMOKE_AUTH_TOKEN is provided.
- Does not log tokens.
- Does not delete production data. PRESENCE_SMOKE_CLEANUP is accepted for
  runbook consistency, but cleanup is intentionally skipped unless a future
  safe owner-delete endpoint exists.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, asdict
from typing import Any


API_BASE = (
    os.environ.get("PRESENCE_API_BASE_URL")
    or os.environ.get("PRESENCE_SMOKE_CORE_BASE")
    or "http://localhost:5000"
).rstrip("/")
APP_BASE = (os.environ.get("PRESENCE_APP_BASE_URL") or "").rstrip("/")
TOKEN = (os.environ.get("PRESENCE_SMOKE_AUTH_TOKEN") or "").strip()
DESIRED_SLUG = (
    os.environ.get("PRESENCE_SMOKE_DESIRED_SLUG")
    or f"presence-v11-smoke-{int(time.time())}"
).strip()
SMOKE_EMAIL = (os.environ.get("PRESENCE_SMOKE_EMAIL") or "").strip()
CLEANUP_REQUESTED = (os.environ.get("PRESENCE_SMOKE_CLEANUP") or "false").lower() == "true"
# Origin used for CORS preflight checks. Defaults to the deployed Presence
# frontend so a fresh `python presence_v1_1_smoke.py` against a hosted backend
# proves the production allowlist contains it.
SMOKE_ORIGIN = (
    os.environ.get("PRESENCE_SMOKE_ORIGIN")
    or APP_BASE
    or "https://presence-gilt.vercel.app"
).rstrip("/")

FORBIDDEN_PUBLIC_FIELDS = {
    "owner_user_id",
    "owner_email",
    "email",
    "tenant_id",
    "organisation_id",
    "connections",
    "nfc_tags",
    "quotes",
    "variations",
    "invoice_support_records",
    "handovers",
    "procurement_contact_email",
    "compliance_notes",
    "abn_acn_or_registration",
}


@dataclass
class Check:
    name: str
    status: str
    detail: str = ""


checks: list[Check] = []


def record(name: str, status: str, detail: str = "") -> None:
    checks.append(Check(name=name, status=status, detail=detail))


def request_json(
    method: str,
    base: str,
    path: str,
    payload: dict[str, Any] | None = None,
    *,
    token: str | None = None,
    timeout: int = 20,
) -> tuple[int, dict[str, Any], str]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(f"{base}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            try:
                parsed = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw}
            return response.status, parsed, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        return exc.code, parsed, raw
    except Exception as exc:
        return 0, {"error": str(exc)}, ""


def payload_data(payload: dict[str, Any]) -> Any:
    if isinstance(payload, dict) and "data" in payload:
        return payload.get("data")
    return payload


def error_code(payload: dict[str, Any]) -> str:
    err = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(err, dict):
        return str(err.get("code") or "")
    return ""


def public_items_have_safe_shape(items: list[Any]) -> tuple[bool, str]:
    for item in items:
        if not isinstance(item, dict):
            return False, "public list item is not an object"
        leaked = sorted(FORBIDDEN_PUBLIC_FIELDS.intersection(item.keys()))
        if leaked:
            return False, "public list leaked fields: " + ", ".join(leaked)
    return True, "checked %d public items" % len(items)


def check_backend_health() -> None:
    status, payload, _ = request_json("GET", API_BASE, "/healthz")
    if status == 200 and payload.get("status") == "ok":
        record("backend_healthz", "passed", "/healthz ok")
    else:
        record("backend_healthz", "failed", f"status={status} payload={payload}")


def check_public_list() -> list[Any]:
    status, payload, _ = request_json("GET", API_BASE, "/api/presence/public/nodes?limit=5")
    data = payload_data(payload)
    if status != 200 or not isinstance(data, dict) or not isinstance(data.get("items"), list):
        record("public_nodes_list", "failed", f"status={status} payload={payload}")
        return []
    ok, detail = public_items_have_safe_shape(data["items"])
    record("public_nodes_payload_safe", "passed" if ok else "failed", detail)
    limit = data.get("limit")
    if isinstance(limit, int) and 1 <= limit <= 50:
        record("public_nodes_limit", "passed", f"limit={limit}")
    else:
        record("public_nodes_limit", "failed", f"unsafe limit in response: {limit}")
    return data["items"]


def _request_with_response_headers(
    method: str,
    base: str,
    path: str,
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    *,
    timeout: int = 20,
) -> tuple[int, dict[str, str], str]:
    """Like request_json but returns the response headers (lowercased keys).

    Required for CORS preflight diagnostics: the contract is in headers,
    not the body. Never logs Authorization values.
    """
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = {"Accept": "application/json"}
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    if headers:
        for key, value in headers.items():
            if value:
                request_headers[key] = value
    request = urllib.request.Request(f"{base}{path}", data=body, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace") if method != "OPTIONS" else ""
            return response.status, {k.lower(): v for k, v in response.headers.items()}, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return exc.code, {k.lower(): v for k, v in exc.headers.items()}, raw
    except Exception as exc:
        return 0, {}, str(exc)


def check_cors_preflight_and_diagnostics() -> None:
    """No-token CORS smoke for the Presence frontend → ANU backend pair.

    These are the most actionable checks: if any fail, the live error in the
    browser console is "No 'Access-Control-Allow-Origin' header is present on
    the requested resource." for one of the routes Studio actually calls.
    """
    if not SMOKE_ORIGIN:
        record("cors_preflight", "skipped", "PRESENCE_SMOKE_ORIGIN not set")
        return

    # 1. OPTIONS /api/presence/owner/nodes from the Presence frontend.
    status, headers, _ = _request_with_response_headers(
        "OPTIONS",
        API_BASE,
        "/api/presence/owner/nodes",
        headers={
            "Origin": SMOKE_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    acao = headers.get("access-control-allow-origin")
    if status in (200, 204) and acao == SMOKE_ORIGIN:
        record("cors_preflight_owner_nodes", "passed",
               f"OPTIONS -> {status} ACAO={acao}")
    else:
        allow_headers = headers.get("access-control-allow-headers", "")
        record(
            "cors_preflight_owner_nodes",
            "failed",
            f"OPTIONS -> status={status} ACAO={acao!r} allow-headers={allow_headers!r} "
            f"-- check CORS_ORIGINS env on backend Vercel project",
        )

    # 2. GET /api/presence/owner/nodes WITHOUT auth from the Presence origin.
    #    Must be 401/403, never 500, with CORS attached so the browser shows
    #    the auth failure instead of a CORS error.
    status, headers, _ = _request_with_response_headers(
        "GET",
        API_BASE,
        "/api/presence/owner/nodes",
        headers={"Origin": SMOKE_ORIGIN},
    )
    acao = headers.get("access-control-allow-origin")
    if status in (401, 403) and acao == SMOKE_ORIGIN:
        record("cors_owner_nodes_401_with_cors", "passed",
               f"protected route -> {status}, ACAO={acao}")
    else:
        record(
            "cors_owner_nodes_401_with_cors",
            "failed",
            f"protected route -> status={status} ACAO={acao!r} "
            f"-- if status is 200 the auth gate is broken; "
            f"if ACAO is missing, CORS_ORIGINS doesn't include {SMOKE_ORIGIN}",
        )

    # 3. GET /api/presence/public/nodes from the Presence origin — should
    #    return 200 and include the CORS header.
    status, headers, _ = _request_with_response_headers(
        "GET",
        API_BASE,
        "/api/presence/public/nodes?limit=1",
        headers={"Origin": SMOKE_ORIGIN},
    )
    acao = headers.get("access-control-allow-origin")
    if status == 200 and acao == SMOKE_ORIGIN:
        record("cors_public_list_with_cors", "passed",
               f"public list -> 200 ACAO={acao}")
    else:
        record(
            "cors_public_list_with_cors",
            "failed",
            f"public list -> status={status} ACAO={acao!r}",
        )


def check_authless_rejections() -> None:
    beta_payload = {
        "display_name": "Presence Smoke",
        "desired_slug": DESIRED_SLUG,
        "presence_type": "artist",
    }
    for name, path in (
        ("beta_application_without_token", "/api/presence/beta/applications"),
        ("beta_start_without_token", "/api/presence/owner/beta/start"),
    ):
        status, payload, _ = request_json("POST", API_BASE, path, beta_payload)
        if status == 401:
            record(name, "passed", "401 without bearer token")
        else:
            record(name, "failed", f"expected 401, got {status} payload={payload}")


def check_app_health() -> None:
    if not APP_BASE:
        record("presence_app_healthz", "skipped", "PRESENCE_APP_BASE_URL not provided")
        return
    status, payload, _ = request_json("GET", APP_BASE, "/healthz")
    if status == 200 and payload.get("ok") is True:
        record("presence_app_healthz", "passed", "/healthz ok")
    else:
        record("presence_app_healthz", "failed", f"status={status} payload={payload}")


def check_optional_owner_flow(public_items_before: list[Any]) -> None:
    if not TOKEN:
        record("owner_draft_flow", "skipped", "PRESENCE_SMOKE_AUTH_TOKEN not provided")
        return

    status_nodes_before, owner_nodes_before, _ = request_json(
        "GET",
        API_BASE,
        "/api/presence/owner/nodes",
        token=TOKEN,
    )
    nodes_before_data = payload_data(owner_nodes_before)
    if status_nodes_before == 200 and isinstance(nodes_before_data, list):
        detail = "empty owner state" if not nodes_before_data else f"owner node count={len(nodes_before_data)}"
        record("owner_nodes_with_token_before_draft", "passed", detail)
    else:
        record(
            "owner_nodes_with_token_before_draft",
            "failed",
            f"status={status_nodes_before} payload={owner_nodes_before}",
        )
        return

    draft_payload = {
        "display_name": "Presence v1.1 Smoke Draft",
        "desired_slug": DESIRED_SLUG,
        "presence_type": "artist",
        "primary_purpose": "portfolio",
        "primary_cta": "contact",
        "template_direction": "studio_practice",
        "visual_mood": "warm_studio",
        "headline": "Smoke draft created by an authenticated beta user.",
        "description": "This draft is private and unpublished until explicitly published.",
        "location_label": "Smoke environment",
        "beta_mode": "draft_self_build",
    }
    if SMOKE_EMAIL:
        draft_payload["description"] += f" Contact email for operator reference: {SMOKE_EMAIL}."

    status, payload, _ = request_json(
        "POST",
        API_BASE,
        "/api/presence/owner/beta/start",
        draft_payload,
        token=TOKEN,
    )
    data = payload_data(payload)

    if status == 409:
        code = error_code(payload)
        if code in {"duplicate_slug", "duplicate_starter"}:
            record("owner_beta_start_duplicate_safe", "passed", code)
            status_nodes, owner_nodes, _ = request_json("GET", API_BASE, "/api/presence/owner/nodes", token=TOKEN)
            nodes_data = payload_data(owner_nodes)
            if status_nodes == 200 and isinstance(nodes_data, list):
                record("owner_nodes_after_duplicate", "passed", f"owner node count={len(nodes_data)}")
            else:
                record("owner_nodes_after_duplicate", "failed", f"status={status_nodes} payload={owner_nodes}")
            return
        record("owner_beta_start", "failed", f"409 with unexpected code={code}")
        return

    if status != 201 or not isinstance(data, dict):
        record("owner_beta_start", "failed", f"status={status} payload={payload}")
        return

    draft_id = data.get("id")
    slug = str(data.get("slug") or DESIRED_SLUG)
    if data.get("status") == "draft" and data.get("visibility") == "private":
        record("owner_beta_start_draft_private", "passed", f"id={draft_id} slug={slug}")
    else:
        record("owner_beta_start_draft_private", "failed", f"payload={data}")

    leaked = sorted(FORBIDDEN_PUBLIC_FIELDS.intersection(data.keys()))
    record(
        "owner_beta_start_response_safe",
        "passed" if not leaked else "failed",
        "no private response fields" if not leaked else "leaked: " + ", ".join(leaked),
    )

    status_public, public_payload, _ = request_json("GET", API_BASE, f"/api/presence/public/{slug}")
    record(
        "draft_hidden_from_public_slug",
        "passed" if status_public == 404 else "failed",
        f"status={status_public} payload={public_payload if status_public != 404 else {}}",
    )

    status_list, list_payload, _ = request_json("GET", API_BASE, "/api/presence/public/nodes?limit=50")
    list_data = payload_data(list_payload)
    if status_list == 200 and isinstance(list_data, dict) and isinstance(list_data.get("items"), list):
        slugs = {str(item.get("slug")) for item in list_data["items"] if isinstance(item, dict)}
        before_slugs = {str(item.get("slug")) for item in public_items_before if isinstance(item, dict)}
        hidden = slug not in slugs
        record(
            "draft_hidden_from_public_list",
            "passed" if hidden else "failed",
            "draft slug absent from list" if hidden else "draft slug appeared in public list",
        )
        record("public_list_stable_after_draft", "passed", f"before={len(before_slugs)} after={len(slugs)}")
    else:
        record("draft_hidden_from_public_list", "failed", f"status={status_list} payload={list_payload}")

    status_nodes, owner_nodes, _ = request_json("GET", API_BASE, "/api/presence/owner/nodes", token=TOKEN)
    nodes_data = payload_data(owner_nodes)
    if status_nodes == 200 and isinstance(nodes_data, list):
        found = any(isinstance(item, dict) and item.get("id") == draft_id for item in nodes_data)
        record(
            "owner_nodes_include_draft",
            "passed" if found else "failed",
            f"owner node count={len(nodes_data)}",
        )
    else:
        record("owner_nodes_include_draft", "failed", f"status={status_nodes} payload={owner_nodes}")

    status_dup, dup_payload, _ = request_json(
        "POST",
        API_BASE,
        "/api/presence/owner/beta/start",
        draft_payload,
        token=TOKEN,
    )
    dup_code = error_code(dup_payload)
    record(
        "owner_beta_duplicate_handled",
        "passed" if status_dup == 409 and dup_code in {"duplicate_slug", "duplicate_starter"} else "failed",
        f"status={status_dup} code={dup_code}",
    )


def main() -> int:
    public_items = []
    check_backend_health()
    check_cors_preflight_and_diagnostics()
    public_items = check_public_list()
    check_authless_rejections()
    check_app_health()
    check_optional_owner_flow(public_items)

    if CLEANUP_REQUESTED:
        record("cleanup", "skipped", "no safe owner-delete cleanup endpoint; no data deleted")

    failed = [check for check in checks if check.status == "failed"]
    summary = {
        "ok": not failed,
        "api_base_url": API_BASE,
        "app_base_url": APP_BASE or None,
        "smoke_origin": SMOKE_ORIGIN or None,
        "auth_checks": bool(TOKEN),
        "desired_slug": DESIRED_SLUG,
        "checks": [asdict(check) for check in checks],
    }
    print(json.dumps(summary, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
