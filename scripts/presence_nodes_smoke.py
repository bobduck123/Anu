#!/usr/bin/env python3
"""
Presence Nodes hosted/local smoke.

Required env:
  PRESENCE_SMOKE_CORE_BASE=http://localhost:5000
  PRESENCE_SMOKE_CONTROL_TOKEN=<control audience JWT>
  PRESENCE_SMOKE_CONTROL_SECRET=<optional X-Control-Plane-Secret>
  PRESENCE_SMOKE_TENANT_ID=<tenant Node id>

Flow:
  create artist node -> publish -> public read -> enquiry -> admin enquiry read/update
  -> create collection/work -> public artist read -> create tradie node -> NFC hit
  -> quote request -> relationship ledger -> quote/variation/handover foundations
  -> unpublish -> public hidden.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request


CORE_BASE = os.environ.get("PRESENCE_SMOKE_CORE_BASE", "http://localhost:5000").rstrip("/")
TOKEN = os.environ.get("PRESENCE_SMOKE_CONTROL_TOKEN", "").strip()
CONTROL_SECRET = os.environ.get("PRESENCE_SMOKE_CONTROL_SECRET", "").strip()
TENANT_ID = os.environ.get("PRESENCE_SMOKE_TENANT_ID", "").strip()


def request_json(method: str, path: str, payload: dict | None = None, *, auth: bool = False) -> tuple[int, dict]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if auth:
        headers["Authorization"] = f"Bearer {TOKEN}"
        if CONTROL_SECRET:
            headers["X-Control-Plane-Secret"] = CONTROL_SECRET
    request = urllib.request.Request(f"{CORE_BASE}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw}
        return exc.code, payload


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    if not TOKEN:
        print("PRESENCE_SMOKE_CONTROL_TOKEN is required", file=sys.stderr)
        return 2
    if not TENANT_ID:
        print("PRESENCE_SMOKE_TENANT_ID is required", file=sys.stderr)
        return 2

    slug = f"presence-smoke-{int(time.time())}"
    node_payload = {
        "tenant_id": int(TENANT_ID),
        "organisation_id": int(TENANT_ID),
        "slug": slug,
        "display_name": "Presence Smoke Node",
        "headline": "Hosted smoke verification",
        "bio": "Temporary smoke node.",
        "node_type": "artist",
        "display_mode": "artist_gallery",
        "plan_type": "artist_presence",
        "visibility": "public",
        "landing_enabled": True,
        "landing_title": "Presence Smoke Gallery",
        "landing_subtitle": "Temporary artist gallery smoke.",
        "practice_statement": "Smoke practice statement.",
        "curatorial_statement": "Smoke curatorial statement.",
        "archive_ready": True,
        "links": [{"label": "Website", "url": "https://example.org", "link_type": "website"}],
        "services": [{"title": "Smoke service", "description": "Smoke test service."}],
        "availability_chips": [{"label": "Smoke available", "chip_type": "availability"}],
    }

    status, created = request_json("POST", "/api/control/presence/nodes", node_payload, auth=True)
    require(status == 201, f"create failed: {status} {created}")
    node = created["data"]
    node_id = node["id"]

    status, published = request_json("POST", f"/api/control/presence/nodes/{node_id}/publish", auth=True)
    require(status == 200 and published["data"]["status"] == "published", f"publish failed: {status} {published}")

    status, collection = request_json(
        "POST",
        f"/api/control/presence/nodes/{node_id}/collections",
        {"title": "Smoke Collection", "description": "Smoke collection.", "is_visible": True},
        auth=True,
    )
    require(status == 201, f"collection failed: {status} {collection}")
    collection_id = collection["data"]["id"]

    status, work = request_json(
        "POST",
        f"/api/control/presence/nodes/{node_id}/works",
        {
            "collection_id": collection_id,
            "title": "Smoke Work",
            "year": "2026",
            "medium": "Smoke medium",
            "description": "Smoke selected work.",
            "image_url": "https://example.org/smoke-work.jpg",
            "is_visible": True,
        },
        auth=True,
    )
    require(status == 201, f"work failed: {status} {work}")

    status, public_node = request_json("GET", f"/api/presence/public/{slug}")
    require(status == 200 and public_node["data"]["slug"] == slug, f"public read failed: {status} {public_node}")
    require(public_node["data"]["display_mode"] == "artist_gallery", "display_mode did not persist publicly")
    require(public_node["data"]["collections"][0]["title"] == "Smoke Collection", "collection missing publicly")
    require(public_node["data"]["works"][0]["title"] == "Smoke Work", "work missing publicly")

    status, enquiry = request_json(
        "POST",
        f"/api/presence/public/{slug}/enquiries",
        {
            "name": "Smoke Visitor",
            "email": "smoke@example.org",
            "message": "Smoke enquiry",
            "preferred_contact_method": "email",
            "consent": True,
            "source_url": f"/p/{slug}",
        },
    )
    require(status == 201, f"enquiry failed: {status} {enquiry}")

    status, inbox = request_json("GET", f"/api/control/presence/nodes/{node_id}/enquiries", auth=True)
    require(status == 200 and len(inbox["data"]) >= 1, f"inbox failed: {status} {inbox}")
    enquiry_id = inbox["data"][0]["id"]

    status, updated = request_json("PATCH", f"/api/control/presence/enquiries/{enquiry_id}", {"status": "read"}, auth=True)
    require(status == 200 and updated["data"]["status"] == "read", f"enquiry update failed: {status} {updated}")

    status, _ = request_json("GET", f"/api/presence/public/{slug}/vcard")
    require(status == 200, "vCard route failed")
    status, _ = request_json("GET", f"/api/presence/public/{slug}/qr")
    require(status == 200, "QR route failed")

    tradie_slug = f"{slug}-tradie"
    status, tradie_created = request_json(
        "POST",
        "/api/control/presence/nodes",
        {
            "tenant_id": int(TENANT_ID),
            "organisation_id": int(TENANT_ID),
            "slug": tradie_slug,
            "display_name": "Presence Smoke Electrical",
            "headline": "Smoke tradie quote and ledger verification",
            "bio": "Temporary tradie smoke node.",
            "node_type": "tradie",
            "display_mode": "tradie_profile",
            "plan_type": "tradie_field_service",
            "visibility": "public",
            "services": [{"title": "Smoke repair", "description": "Smoke quote-ready service.", "enquiry_type": "quote_request"}],
            "credentials": [{"title": "Smoke licence", "issuer": "Smoke issuer", "credential_type": "licence"}],
            "business_functions": [{"function_type": "proof_of_work_handover", "is_enabled": True}],
        },
        auth=True,
    )
    require(status == 201, f"tradie create failed: {status} {tradie_created}")
    tradie_id = tradie_created["data"]["id"]
    status, tradie_published = request_json("POST", f"/api/control/presence/nodes/{tradie_id}/publish", auth=True)
    require(status == 200 and tradie_published["data"]["status"] == "published", f"tradie publish failed: {status} {tradie_published}")

    status, tag = request_json(
        "POST",
        f"/api/control/presence/nodes/{tradie_id}/nfc-tags",
        {"label": "Smoke NFC card", "tag_type": "business_card", "source_code": "nfc-card", "destination_url": f"/p/{tradie_slug}?nfc=nfc-card"},
        auth=True,
    )
    require(status == 201, f"NFC tag failed: {status} {tag}")

    status, nfc = request_json(
        "POST",
        f"/api/presence/public/{tradie_slug}/nfc-hit",
        {"source_code": "nfc-card", "source_url": f"/p/{tradie_slug}?nfc=nfc-card", "anonymous_session_id": "smoke-nfc"},
    )
    require(status == 201 and nfc["data"]["captured"], f"NFC hit failed: {status} {nfc}")

    status, quote_request = request_json(
        "POST",
        f"/api/presence/public/{tradie_slug}/quote-request",
        {
            "name": "Smoke Customer",
            "email": "smoke-customer@example.org",
            "job_type": "Smoke repair",
            "address_suburb": "Marrickville",
            "urgency": "soon",
            "description": "Smoke quote request.",
            "consent": True,
            "source_code": "nfc-card",
            "source_url": f"/p/{tradie_slug}?nfc=nfc-card",
        },
    )
    require(status == 201, f"quote request failed: {status} {quote_request}")
    connection_id = quote_request["data"]["connection_id"]
    quote_id = quote_request["data"]["quote_id"]

    status, ledger = request_json("GET", f"/api/control/presence/nodes/{tradie_id}/connections", auth=True)
    require(status == 200 and any(row["id"] == connection_id for row in ledger["data"]), f"relationship ledger failed: {status} {ledger}")

    status, quote = request_json("PATCH", f"/api/control/presence/quotes/{quote_id}", {"status": "sent", "line_items": [{"label": "Smoke labour", "quantity": 1, "unit_price": 120}]}, auth=True)
    require(status == 200 and quote["data"]["status"] == "sent", f"quote update failed: {status} {quote}")

    status, variation = request_json(
        "POST",
        f"/api/control/presence/quotes/{quote_id}/variations",
        {"connection_id": connection_id, "title": "Smoke variation", "description": "Smoke variation foundation.", "price_delta": 20},
        auth=True,
    )
    require(status == 201, f"variation create failed: {status} {variation}")

    status, handover = request_json(
        "POST",
        f"/api/control/presence/nodes/{tradie_id}/handovers",
        {"connection_id": connection_id, "quote_id": quote_id, "summary": "Smoke handover foundation."},
        auth=True,
    )
    require(status == 201, f"handover create failed: {status} {handover}")

    status, unpublished = request_json("POST", f"/api/control/presence/nodes/{node_id}/unpublish", auth=True)
    require(status == 200 and unpublished["data"]["status"] == "unpublished", f"unpublish failed: {status} {unpublished}")

    status, hidden = request_json("GET", f"/api/presence/public/{slug}")
    require(status == 404, f"unpublished node remained public: {status} {hidden}")

    status, tradie_unpublished = request_json("POST", f"/api/control/presence/nodes/{tradie_id}/unpublish", auth=True)
    require(status == 200 and tradie_unpublished["data"]["status"] == "unpublished", f"tradie unpublish failed: {status} {tradie_unpublished}")

    print(json.dumps({"ok": True, "slug": slug, "node_id": node_id, "tradie_slug": tradie_slug, "tradie_id": tradie_id, "enquiry_id": enquiry_id, "connection_id": connection_id, "quote_id": quote_id}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"Presence smoke failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
