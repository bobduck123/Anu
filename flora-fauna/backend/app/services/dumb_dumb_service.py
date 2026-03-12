from __future__ import annotations

import ipaddress
import json
import re
import socket
from datetime import timedelta
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
import stripe
from flask import current_app
from sqlalchemy import func
from werkzeug.security import generate_password_hash

from ..extensions import db
from ..models import (
    DumbDumbItem,
    DumbDumbList,
    DumbDumbPurchase,
    ImpactLedgerEntry,
    ImpactPool,
    User,
)
from ..security.audit import audit
from ..services.ledger_service import append_entry, ensure_pool, pool_balance
from ..services.node_service import get_default_node, resolve_node
from ..services.telemetry_service import emit_telemetry_event
from ..time_utils import now_utc


TRANSPARENT_SATIRE_DISCLAIMER = (
    "Dumb Dumb Mode is transparent satire. You are not buying a real product. "
    "Your contribution funds the real mutual-aid outcome shown on each item."
)

_ADMIN_ROLES = {"platform_admin", "node_admin", "board_member", "treasury_guardian"}
_ANALYTICS_EVENT_MAP = {
    "dumb_dumb_frontpage_view": "DUMB_DUMB_FRONTPAGE_VIEW",
    "dumb_dumb_list_view": "DUMB_DUMB_LIST_VIEW",
    "dumb_dumb_item_click": "DUMB_DUMB_ITEM_CLICK",
    "dumb_dumb_checkout_started": "DUMB_DUMB_CHECKOUT_STARTED",
    "dumb_dumb_purchase_completed": "DUMB_DUMB_PURCHASE_COMPLETED",
    "dumb_dumb_creator_item_created": "DUMB_DUMB_CREATOR_ITEM_CREATED",
}
_SOURCE_PREVIEW_TIMEOUT_SECONDS = 5
_SOURCE_PREVIEW_MAX_BYTES = 250_000
_SOURCE_PREVIEW_HEADERS = {
    "User-Agent": "ManaraWishlistFetcher/1.0 (+https://manara.local)",
    "Accept": "text/html,application/xhtml+xml",
}
_DEMO_CREATORS = [
    {
        "username": "dd_sol",
        "pseudonym": "Sol Threadline",
        "email": "dd_sol@manara.local",
        "title": "Sol's deluxe non-essentials",
        "slug": "sol-deluxe-non-essentials",
        "intro": "Excessive nonsense on the surface, direct mutual aid underneath.",
    },
    {
        "username": "dd_marlow",
        "pseudonym": "Marlow Fern",
        "email": "dd_marlow@manara.local",
        "title": "Marlow's emergency glamour basket",
        "slug": "marlow-emergency-glamour-basket",
        "intro": "A parody shelf for funding transport, care, and community restocks.",
    },
    {
        "username": "dd_nia",
        "pseudonym": "Nia Vale",
        "email": "dd_nia@manara.local",
        "title": "Nia's prestige nonsense registry",
        "slug": "nia-prestige-nonsense-registry",
        "intro": "Ridiculous wrappers around concrete help people can use this week.",
    },
]
_DEMO_ITEMS = [
    {
        "list_slug": "sol-deluxe-non-essentials",
        "title": "Gold-Plated Emotional Support Spoon",
        "parody_description": "For dramatically stirring exactly one feeling at a time.",
        "icon_key": "SPOON",
        "price_cents": 1800,
        "pool_slug": "meals",
        "impact_title": "20 meals",
        "impact_description": "Stocks staple pantry packs for households riding out the week.",
    },
    {
        "list_slug": "sol-deluxe-non-essentials",
        "title": "Tactical Nightclub Sunglasses",
        "parody_description": "Sharp enough for vibes, soft enough for daylight logistics.",
        "icon_key": "SHADES",
        "price_cents": 2400,
        "pool_slug": "transport",
        "impact_title": "1 week transport",
        "impact_description": "Covers local transport for appointments, school runs, or shift access.",
    },
    {
        "list_slug": "sol-deluxe-non-essentials",
        "title": "Crypto-Blessed Incense Sticks",
        "parody_description": "Smells like optimism and a terrible podcast pitch.",
        "icon_key": "INCENSE",
        "price_cents": 2200,
        "pool_slug": "gp-visit",
        "impact_title": "GP visit support",
        "impact_description": "Offsets out-of-pocket care for a same-week clinic visit.",
    },
    {
        "list_slug": "sol-deluxe-non-essentials",
        "title": "Influencer Hydration Aura Bottle",
        "parody_description": "Now with extra electrolytes for posting through adversity.",
        "icon_key": "BOTTLE",
        "price_cents": 2600,
        "pool_slug": "community-fridge",
        "impact_title": "Community fridge restock",
        "impact_description": "Refills cold storage with fresh produce, milk, and quick meals.",
    },
    {
        "list_slug": "marlow-emergency-glamour-basket",
        "title": "CEO Mindfulness Pebble",
        "parody_description": "Fits in your palm and absolutely cannot solve structural precarity.",
        "icon_key": "PEBBLE",
        "price_cents": 3200,
        "pool_slug": "shelter-night",
        "impact_title": "Shelter night",
        "impact_description": "Funds one safe overnight stay plus basic toiletries.",
    },
    {
        "list_slug": "marlow-emergency-glamour-basket",
        "title": "Limited Edition Vibe Stabilizer",
        "parody_description": "Guaranteed to do less than a rent top-up and cost the same.",
        "icon_key": "SPARK",
        "price_cents": 4000,
        "pool_slug": "womens-emergency",
        "impact_title": "Women's emergency fund",
        "impact_description": "Supports emergency cash grants for urgent safety planning.",
    },
    {
        "list_slug": "marlow-emergency-glamour-basket",
        "title": "Ceremonial Startup Cape",
        "parody_description": "A fluttering reminder that founders also need boundaries.",
        "icon_key": "CAPE",
        "price_cents": 3000,
        "pool_slug": "school-supplies",
        "impact_title": "School supplies pack",
        "impact_description": "Covers notebooks, pens, and classroom basics for one child.",
    },
    {
        "list_slug": "marlow-emergency-glamour-basket",
        "title": "Velvet Apocalypse Tote",
        "parody_description": "For carrying tiny luxuries through large-scale collapse.",
        "icon_key": "TOTE",
        "price_cents": 2800,
        "pool_slug": "meals",
        "impact_title": "Meal pantry bundle",
        "impact_description": "Provides shelf-stable groceries and easy-cook dinner kits.",
    },
    {
        "list_slug": "nia-prestige-nonsense-registry",
        "title": "Executive Moonbeam Subscription",
        "parody_description": "Twelve premium rays a month, none of them tax deductible.",
        "icon_key": "MOON",
        "price_cents": 3500,
        "pool_slug": "transport",
        "impact_title": "Transport pass top-up",
        "impact_description": "Keeps someone moving between work, care, and community support.",
    },
    {
        "list_slug": "nia-prestige-nonsense-registry",
        "title": "Hyperlocal Prestige Fog",
        "parody_description": "Artisanal atmosphere for the person who already owns too many rings.",
        "icon_key": "FOG",
        "price_cents": 2100,
        "pool_slug": "community-fridge",
        "impact_title": "Fresh food restock",
        "impact_description": "Replenishes a community fridge with fruit, greens, and proteins.",
    },
    {
        "list_slug": "nia-prestige-nonsense-registry",
        "title": "Algorithmic Feelings Starter Pack",
        "parody_description": "A boxed set of trends for anyone outsourcing their inner life.",
        "icon_key": "BOX",
        "price_cents": 2700,
        "pool_slug": "gp-visit",
        "impact_title": "Clinic access support",
        "impact_description": "Helps cover a consultation and prescription pickup trip.",
    },
    {
        "list_slug": "nia-prestige-nonsense-registry",
        "title": "Diamond-Certified Side Quest Hat",
        "parody_description": "Ideal for avoiding your inbox while funding something useful.",
        "icon_key": "HAT",
        "price_cents": 3300,
        "pool_slug": "shelter-night",
        "impact_title": "Safe night indoors",
        "impact_description": "Supports one emergency accommodation placement.",
    },
]
_DEMO_PURCHASES = [
    {
        "buyer_username": "dd_supporter_alex",
        "buyer_pseudonym": "Alex",
        "buyer_email": "dd_supporter_alex@manara.local",
        "item_title": "Tactical Nightclub Sunglasses",
    },
    {
        "buyer_username": "dd_supporter_sam",
        "buyer_pseudonym": "Sam",
        "buyer_email": "dd_supporter_sam@manara.local",
        "item_title": "Gold-Plated Emotional Support Spoon",
    },
    {
        "buyer_username": "dd_supporter_lee",
        "buyer_pseudonym": "Lee",
        "buyer_email": "dd_supporter_lee@manara.local",
        "item_title": "Limited Edition Vibe Stabilizer",
    },
]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return slug[:140] or "dumb-dumb-list"


class _SourceMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.meta: dict[str, str] = {}
        self.links: dict[str, str] = {}
        self.title_parts: list[str] = []
        self.json_ld_blobs: list[str] = []
        self._in_title = False
        self._capture_json_ld = False
        self._json_ld_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {str(key).lower(): value for key, value in attrs if key}
        if tag == "meta":
            key = (attr_map.get("property") or attr_map.get("name") or attr_map.get("itemprop") or "").strip().lower()
            content = (attr_map.get("content") or "").strip()
            if key and content and key not in self.meta:
                self.meta[key] = content
        elif tag == "link":
            rel = (attr_map.get("rel") or "").strip().lower()
            href = (attr_map.get("href") or "").strip()
            if rel and href and rel not in self.links:
                self.links[rel] = href
        elif tag == "title":
            self._in_title = True
        elif tag == "script":
            script_type = (attr_map.get("type") or "").strip().lower()
            if "ld+json" in script_type:
                self._capture_json_ld = True
                self._json_ld_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._capture_json_ld:
            blob = "".join(self._json_ld_parts).strip()
            if blob:
                self.json_ld_blobs.append(blob)
            self._capture_json_ld = False
            self._json_ld_parts = []

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data)
        elif self._capture_json_ld:
            self._json_ld_parts.append(data)


def _collapse_whitespace(value: str | None) -> str | None:
    if value is None:
        return None
    collapsed = re.sub(r"\s+", " ", value).strip()
    return collapsed or None


def _display_site_name(hostname: str | None) -> str | None:
    if not hostname:
        return None
    stem = hostname.lower().split(":")[0]
    if stem.startswith("www."):
        stem = stem[4:]
    parts = [part for part in stem.split(".") if part and part not in {"com", "co", "net", "org", "shop", "store"}]
    if not parts:
        return stem.title()
    return " ".join(part.capitalize() for part in parts[:2])


def _is_public_hostname(hostname: str | None) -> bool:
    if not hostname:
        return False
    lowered = hostname.lower()
    if lowered in {"localhost"} or lowered.endswith(".local"):
        return False
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for entry in addr_info:
        try:
            candidate = ipaddress.ip_address(entry[4][0])
        except ValueError:
            continue
        if (
            candidate.is_private
            or candidate.is_loopback
            or candidate.is_link_local
            or candidate.is_multicast
            or candidate.is_reserved
            or candidate.is_unspecified
        ):
            return False
    return True


def _ensure_public_source_url(source_url: str) -> str:
    parsed = urlparse(source_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Source URL must be a valid public http(s) URL.")
    if not _is_public_hostname(parsed.hostname):
        raise ValueError("Source URL must resolve to a public hostname.")
    return source_url


def _extract_json_ld_product(blobs: list[str]) -> dict[str, Any]:
    def _walk(node: Any) -> dict[str, Any] | None:
        if isinstance(node, list):
            for item in node:
                found = _walk(item)
                if found:
                    return found
            return None
        if isinstance(node, dict):
            node_type = node.get("@type")
            if isinstance(node_type, list):
                type_names = {str(entry).lower() for entry in node_type}
            else:
                type_names = {str(node_type).lower()} if node_type else set()
            if "product" in type_names:
                return node
            for value in node.values():
                found = _walk(value)
                if found:
                    return found
        return None

    for blob in blobs:
        try:
            parsed = json.loads(blob)
        except json.JSONDecodeError:
            continue
        found = _walk(parsed)
        if found:
            return found
    return {}


def _resolve_source_preview_metadata(source_url: str) -> dict[str, Any]:
    safe_url = _ensure_public_source_url(source_url)
    try:
        response = requests.get(
            safe_url,
            timeout=_SOURCE_PREVIEW_TIMEOUT_SECONDS,
            allow_redirects=True,
            headers=_SOURCE_PREVIEW_HEADERS,
        )
    except requests.RequestException as exc:
        raise ValueError("Unable to fetch source URL right now.") from exc
    if response.status_code >= 400:
        raise ValueError("Source URL did not return a usable page.")
    final_url = _ensure_public_source_url(response.url)
    content_type = (response.headers.get("content-type") or "").lower()
    if "html" not in content_type:
        raise ValueError("Source URL must point to an HTML product page.")

    html = response.text[:_SOURCE_PREVIEW_MAX_BYTES]
    parser = _SourceMetadataParser()
    parser.feed(html)
    json_ld_product = _extract_json_ld_product(parser.json_ld_blobs)
    meta = parser.meta
    title = _collapse_whitespace(
        meta.get("og:title")
        or meta.get("twitter:title")
        or meta.get("title")
        or json_ld_product.get("name")
        or "".join(parser.title_parts)
    )
    description = _collapse_whitespace(
        meta.get("og:description")
        or meta.get("twitter:description")
        or meta.get("description")
        or json_ld_product.get("description")
    )
    image_url = (
        meta.get("og:image")
        or meta.get("twitter:image")
        or parser.links.get("image_src")
        or parser.links.get("apple-touch-icon")
        or json_ld_product.get("image")
    )
    if isinstance(image_url, list):
        image_url = image_url[0] if image_url else None
    image_url = urljoin(final_url, image_url) if image_url else None
    brand = json_ld_product.get("brand")
    if isinstance(brand, dict):
        brand_name = brand.get("name")
    else:
        brand_name = None
    site_name = _collapse_whitespace(
        meta.get("og:site_name")
        or meta.get("application-name")
        or brand_name
    ) or _display_site_name(urlparse(final_url).hostname)
    canonical_url = parser.links.get("canonical")
    canonical_url = urljoin(final_url, canonical_url) if canonical_url else final_url
    if not _is_public_hostname(urlparse(canonical_url).hostname):
        canonical_url = final_url

    if not title:
        raise ValueError("Could not derive a title from that source URL.")

    return {
        "source_url": final_url,
        "canonical_url": canonical_url,
        "source_site_name": site_name,
        "title": title[:120],
        "parody_description": (description or "")[:600],
        "image_url": image_url,
    }


def preview_source_listing(source_url: str, actor_id: int | None = None, node_id: int | None = None) -> dict[str, Any]:
    preview = _resolve_source_preview_metadata(source_url)
    audit(
        "dumb_dumb_source_preview_requested",
        actor_id=actor_id,
        entity_type="dumb_dumb_source_preview",
        entity_id=preview["source_url"],
        metadata={"source_site_name": preview.get("source_site_name")},
        node_id=node_id,
    )
    return preview


def is_admin_user(user: User | None) -> bool:
    return bool(user and user.role in _ADMIN_ROLES)


def can_manage_list(user: User | None, list_row: DumbDumbList) -> bool:
    if not user:
        return False
    return user.id == list_row.owner_user_id or is_admin_user(user)


def _unique_list_slug(node_id: int, title: str, exclude_id: int | None = None) -> str:
    base_slug = slugify(title)
    candidate = base_slug
    idx = 2
    while True:
        query = DumbDumbList.query.filter_by(node_id=node_id, slug=candidate)
        if exclude_id:
            query = query.filter(DumbDumbList.id != exclude_id)
        if not query.first():
            return candidate
        candidate = f"{base_slug}-{idx}"
        idx += 1


def _init_stripe() -> None:
    stripe.api_key = current_app.config.get("STRIPE_SECRET_KEY")


def _now():
    return now_utc()


def _snapshot_for_purchase(item: DumbDumbItem, purchase: DumbDumbPurchase, buyer: User | None) -> dict[str, Any]:
    pool = item.pool
    owner = item.list.owner
    return {
        "purchase_id": purchase.id,
        "list_id": item.list_id,
        "list_slug": item.list.slug,
        "list_title": item.list.title,
        "item_id": item.id,
        "parody_title": item.title,
        "parody_description": item.parody_description,
        "amount_cents": purchase.amount_cents,
        "currency": purchase.currency,
        "actual_cause": item.impact_title,
        "impact_description": item.impact_description,
        "destination_pool": {
            "id": pool.id,
            "slug": pool.slug,
            "name": pool.name,
            "category": pool.category,
        },
        "owner": {
            "id": owner.id,
            "pseudonym": owner.pseudonym,
            "username": owner.username,
        },
        "buyer": {
            "id": buyer.id if buyer else None,
            "pseudonym": buyer.pseudonym if buyer else "Guest supporter",
        },
        "parody_disclaimer": item.list.parody_disclaimer or TRANSPARENT_SATIRE_DISCLAIMER,
    }


def _serialize_owner(owner: User | None) -> dict[str, Any] | None:
    if not owner:
        return None
    return {
        "id": owner.id,
        "username": owner.username,
        "pseudonym": owner.pseudonym,
        "role": owner.role,
        "avatar_url": owner.avatar_url,
    }


def serialize_item(item: DumbDumbItem, include_private: bool = False) -> dict[str, Any]:
    pool = item.pool
    remaining = None
    if item.quantity_limit is not None:
        remaining = max(item.quantity_limit - (item.quantity_sold or 0), 0)
    payload = {
        "id": item.id,
        "list_id": item.list_id,
        "title": item.title,
        "parody_description": item.parody_description,
        "image_url": item.image_url,
        "source_url": item.source_url,
        "source_site_name": item.source_site_name,
        "icon_key": item.icon_key,
        "price_cents": item.price_cents,
        "currency": item.currency,
        "actual_funds_label": "Actually funds",
        "impact_title": item.impact_title,
        "impact_description": item.impact_description,
        "quantity_limit": item.quantity_limit,
        "quantity_sold": item.quantity_sold,
        "quantity_remaining": remaining,
        "is_active": item.is_active,
        "is_sold_out": remaining == 0 if remaining is not None else False,
        "destination_pool": {
            "id": pool.id,
            "slug": pool.slug,
            "name": pool.name,
            "category": pool.category,
            "current_balance_cents": pool_balance(pool.node_id, pool.id),
        },
        "list": {
            "id": item.list.id,
            "slug": item.list.slug,
            "title": item.list.title,
        },
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }
    return payload


def serialize_list(list_row: DumbDumbList, include_items: bool = True, include_private: bool = False) -> dict[str, Any]:
    items_source = list_row.items if include_private else [item for item in list_row.items if item.is_active]
    payload = {
        "id": list_row.id,
        "node_id": list_row.node_id,
        "owner_user_id": list_row.owner_user_id,
        "title": list_row.title,
        "slug": list_row.slug,
        "intro_text": list_row.intro_text,
        "parody_disclaimer": list_row.parody_disclaimer,
        "is_public": list_row.is_public,
        "is_active": list_row.is_active,
        "owner": _serialize_owner(list_row.owner),
        "item_count": len(items_source),
        "created_at": list_row.created_at.isoformat() if list_row.created_at else None,
        "updated_at": list_row.updated_at.isoformat() if list_row.updated_at else None,
    }
    if include_items:
        payload["items"] = [serialize_item(item) for item in items_source if include_private or item.is_active]
    return payload


def serialize_purchase(purchase: DumbDumbPurchase) -> dict[str, Any]:
    snapshot = purchase.receipt_snapshot_json or {}
    item = purchase.item
    list_row = purchase.list
    return {
        "id": purchase.id,
        "item_id": purchase.item_id,
        "list_id": purchase.list_id,
        "amount_cents": purchase.amount_cents,
        "currency": purchase.currency,
        "payment_intent_id": purchase.payment_intent_id,
        "external_payment_id": purchase.external_payment_id,
        "checkout_session_id": purchase.checkout_session_id,
        "status": purchase.status,
        "destination_pool_id": purchase.destination_pool_id,
        "receipt_snapshot_json": snapshot,
        "buyer": _serialize_owner(purchase.buyer),
        "owner": _serialize_owner(list_row.owner if list_row else None),
        "item": serialize_item(item, include_private=True) if item else None,
        "list": {
            "id": list_row.id,
            "slug": list_row.slug,
            "title": list_row.title,
            "parody_disclaimer": list_row.parody_disclaimer,
        } if list_row else None,
        "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
        "updated_at": purchase.updated_at.isoformat() if purchase.updated_at else None,
    }


def _purge_expired_reservations(item: DumbDumbItem) -> None:
    expired_rows = DumbDumbPurchase.query.filter(
        DumbDumbPurchase.item_id == item.id,
        DumbDumbPurchase.inventory_reserved.is_(True),
        DumbDumbPurchase.status == "checkout_pending",
        DumbDumbPurchase.reservation_expires_at.isnot(None),
        DumbDumbPurchase.reservation_expires_at < _now(),
    ).all()
    for purchase in expired_rows:
        release_purchase_inventory(purchase, "expired")


def release_purchase_inventory(purchase: DumbDumbPurchase, status: str) -> DumbDumbPurchase:
    if purchase.inventory_reserved and purchase.inventory_released_at is None and purchase.item and purchase.item.quantity_limit is not None:
        purchase.item.quantity_sold = max((purchase.item.quantity_sold or 0) - 1, 0)
        purchase.inventory_reserved = False
        purchase.inventory_released_at = _now()
    purchase.reservation_expires_at = None
    if purchase.status != "paid":
        purchase.status = status
    return purchase


def _append_ledger_for_purchase(purchase: DumbDumbPurchase) -> ImpactLedgerEntry:
    existing = ImpactLedgerEntry.query.filter_by(
        reference_type="dumb_dumb_purchase",
        reference_id=str(purchase.id),
    ).first()
    if existing:
        return existing
    item = purchase.item
    pool = purchase.destination_pool
    return append_entry(
        node_id=purchase.node_id,
        pool_id=purchase.destination_pool_id,
        entry_type="credit",
        amount_cents=purchase.amount_cents,
        description=(
            f"Dumb Dumb Mode purchase: {item.title} actually funds "
            f"{item.impact_title} via {pool.name}"
        ),
        reference_id=str(purchase.id),
        reference_type="dumb_dumb_purchase",
        created_by=purchase.buyer_user_id,
    )


def _emit_purchase_completed(purchase: DumbDumbPurchase) -> None:
    emit_telemetry_event(
        actor_id=purchase.buyer_user_id,
        entity_type="dumb_dumb_purchase",
        entity_id=str(purchase.id),
        event_type="DUMB_DUMB_PURCHASE_COMPLETED",
        props_json={
            "purchase_id": purchase.id,
            "item_id": purchase.item_id,
            "destination_pool_id": purchase.destination_pool_id,
            "amount_cents": purchase.amount_cents,
        },
        node_id=purchase.node_id,
        strict=True,
    )


def create_or_update_list(user: User, payload: dict[str, Any], list_row: DumbDumbList | None = None) -> DumbDumbList:
    node_id = user.node_id or get_default_node().id
    if list_row and not can_manage_list(user, list_row):
        raise PermissionError("Only list owners or admins can edit this list.")
    exclude_id = list_row.id if list_row else None
    slug = payload.get("slug") or _unique_list_slug(node_id, payload["title"], exclude_id=exclude_id)
    if not list_row:
        list_row = DumbDumbList(
            node_id=node_id,
            owner_user_id=user.id,
        )
        db.session.add(list_row)
    list_row.title = payload["title"]
    list_row.slug = slug
    list_row.intro_text = payload.get("intro_text") or ""
    list_row.parody_disclaimer = payload.get("parody_disclaimer") or TRANSPARENT_SATIRE_DISCLAIMER
    list_row.is_public = bool(payload.get("is_public", True))
    list_row.is_active = bool(payload.get("is_active", True))
    db.session.commit()
    audit(
        "dumb_dumb_list_saved",
        actor_id=user.id,
        entity_type="dumb_dumb_list",
        entity_id=list_row.id,
        metadata={"slug": list_row.slug, "is_public": list_row.is_public},
        node_id=list_row.node_id,
    )
    return list_row


def create_or_update_item(user: User, list_row: DumbDumbList, payload: dict[str, Any], item: DumbDumbItem | None = None) -> DumbDumbItem:
    if not can_manage_list(user, list_row):
        raise PermissionError("Only list owners or admins can edit items for this list.")
    pool = db.session.get(ImpactPool, payload["mutual_aid_pool_id"])
    if not pool or pool.node_id != list_row.node_id:
        raise ValueError("Selected impact pool is not available for this list.")
    created_now = item is None
    if not item:
        item = DumbDumbItem(list_id=list_row.id)
        db.session.add(item)
    source_url = payload.get("source_url")
    if source_url:
        source_url = _ensure_public_source_url(source_url)
    source_site_name = payload.get("source_site_name")
    if source_url and not source_site_name:
        source_site_name = _display_site_name(urlparse(source_url).hostname)
    item.title = payload["title"]
    item.parody_description = payload.get("parody_description") or ""
    item.image_url = payload.get("image_url")
    item.source_url = source_url
    item.source_site_name = source_site_name
    item.icon_key = payload.get("icon_key")
    item.price_cents = payload["price_cents"]
    item.currency = (payload.get("currency") or "usd").lower()
    item.mutual_aid_pool_id = pool.id
    item.impact_title = payload["impact_title"]
    item.impact_description = payload["impact_description"]
    item.quantity_limit = payload.get("quantity_limit")
    item.is_active = bool(payload.get("is_active", True))
    db.session.commit()
    audit(
        "dumb_dumb_item_saved",
        actor_id=user.id,
        entity_type="dumb_dumb_item",
        entity_id=item.id,
        metadata={"list_id": list_row.id, "pool_id": pool.id},
        node_id=list_row.node_id,
    )
    if created_now:
        emit_telemetry_event(
            actor_id=user.id,
            entity_type="dumb_dumb_item",
            entity_id=str(item.id),
            event_type="DUMB_DUMB_CREATOR_ITEM_CREATED",
            props_json={"item_id": item.id, "list_id": list_row.id},
            node_id=list_row.node_id,
            strict=True,
        )
        db.session.commit()
    return item


def _default_success_url(purchase_id: int) -> str:
    frontend_base = current_app.config.get("FRONTEND_BASE_URL") or "http://localhost:3000"
    return f"{frontend_base.rstrip('/')}/dumb-dumb/success/{purchase_id}"


def _default_cancel_url(list_slug: str, item_id: int) -> str:
    frontend_base = current_app.config.get("FRONTEND_BASE_URL") or "http://localhost:3000"
    return f"{frontend_base.rstrip('/')}/dumb-dumb/{list_slug}/{item_id}"


def start_checkout(item: DumbDumbItem, buyer: User | None, success_url: str | None = None, cancel_url: str | None = None, mode: str = "live") -> dict[str, Any]:
    list_row = item.list
    if not list_row or not list_row.is_active or not list_row.is_public:
        raise ValueError("This Dumb Dumb list is not available.")
    if not item.is_active:
        raise ValueError("This item is not available.")

    _purge_expired_reservations(item)
    if item.quantity_limit is not None and (item.quantity_sold or 0) >= item.quantity_limit:
        raise ValueError("This item is sold out.")

    purchase = DumbDumbPurchase(
        node_id=list_row.node_id,
        list_id=list_row.id,
        item_id=item.id,
        buyer_user_id=buyer.id if buyer else None,
        amount_cents=item.price_cents,
        currency=item.currency,
        status="checkout_pending",
        destination_pool_id=item.mutual_aid_pool_id,
    )
    if item.quantity_limit is not None:
        purchase.inventory_reserved = True
        purchase.reservation_expires_at = _now() + timedelta(minutes=30)
        item.quantity_sold = (item.quantity_sold or 0) + 1

    db.session.add(purchase)
    db.session.flush()
    purchase.receipt_snapshot_json = _snapshot_for_purchase(item, purchase, buyer)

    metadata = {
        "feature": "dumb_dumb_mode",
        "purchase_id": str(purchase.id),
        "list_id": str(list_row.id),
        "item_id": str(item.id),
        "destination_pool_id": str(item.mutual_aid_pool_id),
        "parody_title": item.title,
        "impact_title": item.impact_title,
        "list_slug": list_row.slug,
    }
    success_url = (success_url or _default_success_url(purchase.id)).replace("__PURCHASE_ID__", str(purchase.id))
    cancel_url = cancel_url or _default_cancel_url(list_row.slug, item.id)

    if mode == "demo" or not current_app.config.get("STRIPE_SECRET_KEY"):
        purchase.status = "paid"
        purchase.external_payment_id = f"demo_purchase_{purchase.id}"
        purchase.payment_intent_id = f"demo_pi_{purchase.id}"
        purchase.checkout_session_id = f"demo_cs_{purchase.id}"
        purchase.reservation_expires_at = None
        _append_ledger_for_purchase(purchase)
        _emit_purchase_completed(purchase)
        db.session.commit()
        audit(
            "dumb_dumb_checkout_started",
            actor_id=buyer.id if buyer else None,
            entity_type="dumb_dumb_purchase",
            entity_id=purchase.id,
            metadata={"item_id": item.id, "pool_id": item.mutual_aid_pool_id, "mode": mode},
            node_id=list_row.node_id,
        )
        return {
            "purchase_id": purchase.id,
            "checkout_url": success_url,
            "mode": "demo",
            "message": "Demo purchase completed without Stripe.",
        }

    _init_stripe()
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": item.currency.lower(),
                        "unit_amount": item.price_cents,
                        "product_data": {
                            "name": item.title,
                            "description": f"Parody item. Actually funds {item.impact_title}.",
                        },
                    },
                }
            ],
            payment_intent_data={"metadata": metadata},
            metadata=metadata,
            submit_type="donate",
            billing_address_collection="auto",
            customer_email=buyer.email if buyer else None,
            custom_text={
                "submit": {
                    "message": (
                        f"This is a parody item. Your payment funds {item.impact_title} "
                        f"through {item.pool.name}."
                    )
                }
            },
        )
    except Exception:
        db.session.rollback()
        raise

    purchase.checkout_session_id = session.id
    purchase.external_payment_id = session.id
    db.session.commit()
    audit(
        "dumb_dumb_checkout_started",
        actor_id=buyer.id if buyer else None,
        entity_type="dumb_dumb_purchase",
        entity_id=purchase.id,
        metadata={"item_id": item.id, "pool_id": item.mutual_aid_pool_id, "mode": mode},
        node_id=list_row.node_id,
    )
    return {
        "purchase_id": purchase.id,
        "checkout_url": session.url,
        "mode": "live",
    }


def finalize_checkout_session(session_obj: dict[str, Any]) -> DumbDumbPurchase | None:
    metadata = session_obj.get("metadata") or {}
    if metadata.get("feature") != "dumb_dumb_mode":
        return None
    purchase_id = metadata.get("purchase_id")
    if not purchase_id:
        return None
    purchase = db.session.get(DumbDumbPurchase, int(purchase_id))
    if not purchase:
        return None
    if purchase.status == "paid":
        return purchase

    purchase.status = "paid"
    purchase.payment_intent_id = session_obj.get("payment_intent") or purchase.payment_intent_id
    purchase.external_payment_id = session_obj.get("payment_intent") or session_obj.get("id") or purchase.external_payment_id
    purchase.checkout_session_id = session_obj.get("id") or purchase.checkout_session_id
    purchase.reservation_expires_at = None
    snapshot = dict(purchase.receipt_snapshot_json or {})
    snapshot["payment_status"] = session_obj.get("payment_status")
    snapshot["paid_at"] = _now().isoformat()
    snapshot["checkout_session_id"] = purchase.checkout_session_id
    snapshot["payment_intent_id"] = purchase.payment_intent_id
    purchase.receipt_snapshot_json = snapshot
    _append_ledger_for_purchase(purchase)
    audit(
        "dumb_dumb_purchase_completed",
        actor_id=purchase.buyer_user_id,
        entity_type="dumb_dumb_purchase",
        entity_id=purchase.id,
        metadata={"item_id": purchase.item_id, "pool_id": purchase.destination_pool_id},
        node_id=purchase.node_id,
    )
    _emit_purchase_completed(purchase)
    db.session.commit()
    return purchase


def expire_checkout_session(session_obj: dict[str, Any]) -> DumbDumbPurchase | None:
    metadata = session_obj.get("metadata") or {}
    if metadata.get("feature") != "dumb_dumb_mode":
        return None
    purchase_id = metadata.get("purchase_id")
    if not purchase_id:
        return None
    purchase = db.session.get(DumbDumbPurchase, int(purchase_id))
    if not purchase or purchase.status == "paid":
        return purchase
    release_purchase_inventory(purchase, "expired")
    db.session.commit()
    return purchase


def fail_payment_intent(intent_obj: dict[str, Any]) -> DumbDumbPurchase | None:
    metadata = intent_obj.get("metadata") or {}
    if metadata.get("feature") != "dumb_dumb_mode":
        return None
    purchase_id = metadata.get("purchase_id")
    if not purchase_id:
        return None
    purchase = db.session.get(DumbDumbPurchase, int(purchase_id))
    if not purchase or purchase.status == "paid":
        return purchase
    purchase.payment_intent_id = intent_obj.get("id") or purchase.payment_intent_id
    release_purchase_inventory(purchase, "payment_failed")
    db.session.commit()
    return purchase


def serialize_activity_entry(purchase: DumbDumbPurchase) -> dict[str, Any]:
    buyer_name = purchase.buyer.pseudonym if purchase.buyer else "Guest supporter"
    return {
        "id": purchase.id,
        "buyer_name": buyer_name,
        "parody_title": purchase.item.title,
        "impact_title": purchase.item.impact_title,
        "amount_cents": purchase.amount_cents,
        "pool_name": purchase.destination_pool.name if purchase.destination_pool else None,
        "created_at": purchase.created_at.isoformat() if purchase.created_at else None,
        "message": f"{buyer_name} bought {purchase.item.title} and funded {purchase.item.impact_title}",
    }


def get_public_hub_payload(node_id_or_slug: int | str | None = None, ensure_demo: bool = True) -> dict[str, Any]:
    node = resolve_node(node_id_or_slug) or get_default_node()
    if ensure_demo:
        ensure_demo_data(node.id)
    lists = (
        DumbDumbList.query.filter_by(node_id=node.id, is_public=True, is_active=True)
        .order_by(DumbDumbList.updated_at.desc(), DumbDumbList.created_at.desc())
        .all()
    )
    items = (
        DumbDumbItem.query.join(DumbDumbList, DumbDumbItem.list_id == DumbDumbList.id)
        .filter(
            DumbDumbList.node_id == node.id,
            DumbDumbList.is_public.is_(True),
            DumbDumbList.is_active.is_(True),
            DumbDumbItem.is_active.is_(True),
        )
        .order_by(DumbDumbItem.created_at.asc())
        .limit(12)
        .all()
    )
    purchases = (
        DumbDumbPurchase.query.join(DumbDumbItem, DumbDumbPurchase.item_id == DumbDumbItem.id)
        .filter(DumbDumbPurchase.node_id == node.id, DumbDumbPurchase.status == "paid")
        .order_by(DumbDumbPurchase.created_at.desc())
        .limit(12)
        .all()
    )
    total_raised = (
        db.session.query(func.sum(DumbDumbPurchase.amount_cents))
        .filter_by(node_id=node.id, status="paid")
        .scalar()
        or 0
    )
    return {
        "hero": {
            "title": "Dumb Dumb Mode",
            "subtitle": (
                "Transparent satire for mutual aid. Pick a parody item, see the real impact, "
                "and fund the pool named on the card."
            ),
            "disclaimer": TRANSPARENT_SATIRE_DISCLAIMER,
        },
        "stats": {
            "lists": len(lists),
            "items": len(items),
            "total_raised_cents": total_raised,
            "recent_purchases": len(purchases),
        },
        "featured_lists": [serialize_list(row, include_items=False) for row in lists[:3]],
        "featured_items": [serialize_item(row) for row in items[:6]],
        "activity_feed": [serialize_activity_entry(row) for row in purchases[:8]],
        "transparency": {
            "headline": "Parody wrapper, real mutual aid destination.",
            "body": TRANSPARENT_SATIRE_DISCLAIMER,
            "points": [
                "Every card names the real pool and impact before checkout.",
                "Checkout repeats that you are funding the cause, not buying a product.",
                "Receipts, ledger entries, and admin reporting keep the real destination explicit.",
            ],
        },
    }


def get_public_list_by_slug(list_slug: str, node_id_or_slug: int | str | None = None) -> DumbDumbList | None:
    node = resolve_node(node_id_or_slug) or get_default_node()
    return DumbDumbList.query.filter_by(
        node_id=node.id,
        slug=list_slug,
        is_public=True,
        is_active=True,
    ).first()


def get_public_item(list_slug: str, item_id: int, node_id_or_slug: int | str | None = None) -> DumbDumbItem | None:
    list_row = get_public_list_by_slug(list_slug, node_id_or_slug=node_id_or_slug)
    if not list_row:
        return None
    return DumbDumbItem.query.filter_by(id=item_id, list_id=list_row.id).first()


def list_lists_for_user(user: User) -> list[DumbDumbList]:
    return (
        DumbDumbList.query.filter_by(owner_user_id=user.id)
        .order_by(DumbDumbList.updated_at.desc(), DumbDumbList.created_at.desc())
        .all()
    )


def list_admin_purchases(user: User, status: str | None = None) -> list[dict[str, Any]]:
    node_id = user.node_id or get_default_node().id
    query = DumbDumbPurchase.query.filter_by(node_id=node_id)
    if status:
        query = query.filter_by(status=status)
    rows = query.order_by(DumbDumbPurchase.created_at.desc()).all()
    return [serialize_purchase(row) for row in rows]


def record_analytics_event(
    *,
    event_name: str,
    props: dict[str, Any] | None,
    entity_type: str | None,
    entity_id: str | None,
    user: User | None,
    node_id: int | None,
) -> None:
    event_type = _ANALYTICS_EVENT_MAP.get(event_name)
    if not event_type:
        raise ValueError("Unsupported analytics event.")
    emit_telemetry_event(
        actor_id=user.id if user else None,
        entity_type=entity_type or "dumb_dumb",
        entity_id=str(entity_id or node_id or "hub"),
        event_type=event_type,
        props_json=props or {},
        node_id=node_id,
        strict=True,
    )
    db.session.commit()


def ensure_demo_data(node_id_or_slug: int | str | None = None) -> dict[str, Any]:
    node = resolve_node(node_id_or_slug) or get_default_node()
    pools = {
        "meals": ensure_pool(node.id, "meals", "Meals Pool", "Groceries and meal support", "food"),
        "community-fridge": ensure_pool(node.id, "community-fridge", "Community Fridge", "Cold storage restocks", "food"),
        "transport": ensure_pool(node.id, "transport", "Transport Pool", "Mobility and appointments", "mobility"),
        "gp-visit": ensure_pool(node.id, "gp-visit", "GP Visit Pool", "Primary care access", "health"),
        "womens-emergency": ensure_pool(node.id, "womens-emergency", "Women's Emergency Fund", "Emergency safety grants", "safety"),
        "school-supplies": ensure_pool(node.id, "school-supplies", "School Supplies Pool", "Classroom essentials", "education"),
        "shelter-night": ensure_pool(node.id, "shelter-night", "Shelter Night Pool", "Emergency accommodation", "housing"),
    }
    for pool_slug, target_amount in {
        "meals": 125000,
        "community-fridge": 90000,
        "transport": 110000,
        "gp-visit": 140000,
        "womens-emergency": 180000,
        "school-supplies": 95000,
        "shelter-night": 150000,
    }.items():
        pool = pools[pool_slug]
        if not pool.target_amount_cents:
            pool.target_amount_cents = target_amount

    for creator_payload in _DEMO_CREATORS:
        user = User.query.filter_by(username=creator_payload["username"]).first()
        if not user:
            user = User(
                node_id=node.id,
                username=creator_payload["username"],
                pseudonym=creator_payload["pseudonym"],
                email=creator_payload["email"],
                password=generate_password_hash("dumb_dumb_demo", method="pbkdf2:sha256"),
                role="organizer",
                bio="Demo Dumb Dumb Mode creator.",
            )
            db.session.add(user)
            db.session.flush()
        list_row = DumbDumbList.query.filter_by(node_id=node.id, slug=creator_payload["slug"]).first()
        if not list_row:
            list_row = DumbDumbList(
                node_id=node.id,
                owner_user_id=user.id,
                title=creator_payload["title"],
                slug=creator_payload["slug"],
                intro_text=creator_payload["intro"],
                parody_disclaimer=TRANSPARENT_SATIRE_DISCLAIMER,
                is_public=True,
                is_active=True,
            )
            db.session.add(list_row)

    db.session.flush()

    for item_payload in _DEMO_ITEMS:
        list_row = DumbDumbList.query.filter_by(node_id=node.id, slug=item_payload["list_slug"]).first()
        existing = DumbDumbItem.query.filter_by(list_id=list_row.id, title=item_payload["title"]).first()
        if existing:
            continue
        db.session.add(
            DumbDumbItem(
                list_id=list_row.id,
                title=item_payload["title"],
                parody_description=item_payload["parody_description"],
                icon_key=item_payload["icon_key"],
                price_cents=item_payload["price_cents"],
                currency="usd",
                mutual_aid_pool_id=pools[item_payload["pool_slug"]].id,
                impact_title=item_payload["impact_title"],
                impact_description=item_payload["impact_description"],
                quantity_limit=12,
                quantity_sold=0,
                is_active=True,
            )
        )

    db.session.flush()

    for purchase_payload in _DEMO_PURCHASES:
        buyer = User.query.filter_by(username=purchase_payload["buyer_username"]).first()
        if not buyer:
            buyer = User(
                node_id=node.id,
                username=purchase_payload["buyer_username"],
                pseudonym=purchase_payload["buyer_pseudonym"],
                email=purchase_payload["buyer_email"],
                password=generate_password_hash("dumb_dumb_demo", method="pbkdf2:sha256"),
                role="participant",
            )
            db.session.add(buyer)
            db.session.flush()
        item = DumbDumbItem.query.join(DumbDumbList, DumbDumbItem.list_id == DumbDumbList.id).filter(
            DumbDumbList.node_id == node.id,
            DumbDumbItem.title == purchase_payload["item_title"],
        ).first()
        existing = DumbDumbPurchase.query.filter_by(
            buyer_user_id=buyer.id,
            item_id=item.id,
            status="paid",
        ).first()
        if existing:
            continue
        if item.quantity_limit is not None:
            item.quantity_sold = (item.quantity_sold or 0) + 1
        purchase = DumbDumbPurchase(
            node_id=node.id,
            list_id=item.list_id,
            item_id=item.id,
            buyer_user_id=buyer.id,
            amount_cents=item.price_cents,
            currency=item.currency,
            payment_intent_id=f"demo_pi_seed_{item.id}_{buyer.id}",
            external_payment_id=f"demo_seed_{item.id}_{buyer.id}",
            checkout_session_id=f"demo_cs_seed_{item.id}_{buyer.id}",
            status="paid",
            destination_pool_id=item.mutual_aid_pool_id,
            inventory_reserved=item.quantity_limit is not None,
        )
        db.session.add(purchase)
        db.session.flush()
        purchase.receipt_snapshot_json = _snapshot_for_purchase(item, purchase, buyer)
        _append_ledger_for_purchase(purchase)

    db.session.commit()
    return {
        "lists": DumbDumbList.query.filter_by(node_id=node.id).count(),
        "items": DumbDumbItem.query.count(),
        "purchases": DumbDumbPurchase.query.filter_by(node_id=node.id).count(),
    }
