import hashlib
import html
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import requests
from flask import Blueprint, current_app, request

from ..models import ImpactPool, ImpactLedgerEntry, ReliefRequest, db
from ..services.node_service import resolve_node
from .utils import ok, error
from ..extensions import limiter


public_bp = Blueprint("public", __name__, url_prefix="/public")

TRUSTED_COMMUNITY_NEWS_TTL_SECONDS = 15 * 60
TRUSTED_COMMUNITY_NEWS_TIMEOUT = (3.05, 6)
TRUSTED_COMMUNITY_NEWS_SOURCES = (
    {
        "key": "bbc-world",
        "source_name": "BBC News",
        "feed_label": "World",
        "feed_url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "homepage": "https://www.bbc.co.uk/news/10628494",
    },
    {
        "key": "bbc-environment",
        "source_name": "BBC News",
        "feed_label": "Science & Environment",
        "feed_url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        "homepage": "https://www.bbc.co.uk/news/10628494",
    },
    {
        "key": "guardian-world",
        "source_name": "The Guardian",
        "feed_label": "World",
        "feed_url": "https://www.theguardian.com/world/rss",
        "homepage": "https://www.theguardian.com/info/2015/11/26/open-platform-full-documentation",
    },
    {
        "key": "guardian-environment",
        "source_name": "The Guardian",
        "feed_label": "Environment",
        "feed_url": "https://www.theguardian.com/environment/rss",
        "homepage": "https://www.theguardian.com/info/2015/11/26/open-platform-full-documentation",
    },
)
_TRUSTED_COMMUNITY_NEWS_CACHE = {
    "items": [],
    "sources": [],
    "fetched_at": None,
    "expires_at": 0.0,
}
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def _community_news_sources_payload():
    return [
        {
            "key": source["key"],
            "source_name": source["source_name"],
            "feed_label": source["feed_label"],
            "feed_url": source["feed_url"],
            "homepage": source["homepage"],
        }
        for source in TRUSTED_COMMUNITY_NEWS_SOURCES
    ]


def _clean_excerpt(raw_value: str | None, max_length: int = 280) -> str:
    text = html.unescape(_HTML_TAG_RE.sub(" ", raw_value or ""))
    text = _WHITESPACE_RE.sub(" ", text).strip()
    if len(text) <= max_length:
        return text
    truncated = text[: max_length - 3].rstrip()
    if " " in truncated:
        truncated = truncated.rsplit(" ", 1)[0]
    return f"{truncated.rstrip('.,;:!?')}..."


def _parse_feed_datetime(*candidates: str | None) -> datetime | None:
    for candidate in candidates:
        raw_value = (candidate or "").strip()
        if not raw_value:
            continue
        parsed = None
        try:
            parsed = parsedate_to_datetime(raw_value)
        except (TypeError, ValueError, IndexError, OverflowError):
            parsed = None
        if parsed is None:
            try:
                parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
            except ValueError:
                parsed = None
        if parsed is None:
            continue
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
        return parsed
    return None


def _rss_child_text(item: ET.Element, *paths: str) -> str | None:
    for path in paths:
        value = item.findtext(path)
        if value and value.strip():
            return value.strip()
    return None


def _atom_link_href(item: ET.Element) -> str | None:
    for link in item.findall("{http://www.w3.org/2005/Atom}link"):
        href = (link.attrib.get("href") or "").strip()
        rel = (link.attrib.get("rel") or "alternate").strip().lower()
        if href and rel in {"alternate", "self"}:
            return href
    return None


def _item_image_url(item: ET.Element) -> str | None:
    enclosure = item.find("enclosure")
    if enclosure is not None:
        url = (enclosure.attrib.get("url") or "").strip()
        if url:
            return url
    for path in ("{*}thumbnail", "{*}content"):
        media = item.find(path)
        if media is not None:
            url = (media.attrib.get("url") or "").strip()
            if url:
                return url
    return None


def _serialize_feed_item(source: dict, item: ET.Element, is_atom: bool = False) -> dict | None:
    if is_atom:
        title = _rss_child_text(item, "{http://www.w3.org/2005/Atom}title")
        url = _atom_link_href(item)
        summary = _rss_child_text(
            item,
            "{http://www.w3.org/2005/Atom}summary",
            "{http://www.w3.org/2005/Atom}content",
        )
        published_at = _parse_feed_datetime(
            _rss_child_text(item, "{http://www.w3.org/2005/Atom}updated"),
            _rss_child_text(item, "{http://www.w3.org/2005/Atom}published"),
        )
        guid = _rss_child_text(item, "{http://www.w3.org/2005/Atom}id")
    else:
        title = _rss_child_text(item, "title")
        url = _rss_child_text(item, "link")
        summary = _rss_child_text(item, "description", "{*}encoded", "{*}summary")
        published_at = _parse_feed_datetime(
            _rss_child_text(item, "pubDate", "{*}published", "{*}updated", "{*}date"),
        )
        guid = _rss_child_text(item, "guid")

    if not title or not url:
        return None

    item_id = hashlib.sha1(f"{source['key']}::{guid or url}".encode("utf-8")).hexdigest()[:20]
    return {
        "id": item_id,
        "title": title,
        "summary": _clean_excerpt(summary),
        "url": url,
        "source_name": source["source_name"],
        "feed_label": source["feed_label"],
        "homepage": source["homepage"],
        "published_at": published_at.isoformat() if published_at else None,
        "image_url": _item_image_url(item),
    }


def _fetch_trusted_community_news_items(limit: int = 12) -> list[dict]:
    items: list[dict] = []
    for source in TRUSTED_COMMUNITY_NEWS_SOURCES:
        try:
            response = requests.get(
                source["feed_url"],
                timeout=TRUSTED_COMMUNITY_NEWS_TIMEOUT,
                headers={"User-Agent": "ManaraCommunityNews/1.0 (+https://maanara.vercel.app/community)"},
            )
            response.raise_for_status()
            root = ET.fromstring(response.content)
            feed_items = root.findall("./channel/item")
            is_atom = False
            if not feed_items:
                feed_items = root.findall("{http://www.w3.org/2005/Atom}entry")
                is_atom = True

            for item in feed_items[:6]:
                payload = _serialize_feed_item(source, item, is_atom=is_atom)
                if payload:
                    items.append(payload)
        except Exception as exc:
            current_app.logger.warning(
                "trusted_community_news_source_failed",
                extra={"source_key": source["key"], "error": str(exc)},
            )

    deduped: list[dict] = []
    seen_urls: set[str] = set()
    for item in sorted(
        items,
        key=lambda row: row["published_at"] or "",
        reverse=True,
    ):
        if item["url"] in seen_urls:
            continue
        seen_urls.add(item["url"])
        deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def _load_trusted_community_news():
    now = time.time()
    cached_items = _TRUSTED_COMMUNITY_NEWS_CACHE["items"]
    if cached_items and _TRUSTED_COMMUNITY_NEWS_CACHE["expires_at"] > now:
        return {
            "items": cached_items,
            "sources": _TRUSTED_COMMUNITY_NEWS_CACHE["sources"],
            "fetched_at": _TRUSTED_COMMUNITY_NEWS_CACHE["fetched_at"],
            "stale": False,
        }

    sources_payload = _community_news_sources_payload()
    items = _fetch_trusted_community_news_items(limit=12)
    fetched_at = datetime.now(timezone.utc).isoformat()

    if items:
        _TRUSTED_COMMUNITY_NEWS_CACHE.update(
            {
                "items": items,
                "sources": sources_payload,
                "fetched_at": fetched_at,
                "expires_at": now + TRUSTED_COMMUNITY_NEWS_TTL_SECONDS,
            }
        )
        return {
            "items": items,
            "sources": sources_payload,
            "fetched_at": fetched_at,
            "stale": False,
        }

    if cached_items:
        return {
            "items": cached_items,
            "sources": _TRUSTED_COMMUNITY_NEWS_CACHE["sources"],
            "fetched_at": _TRUSTED_COMMUNITY_NEWS_CACHE["fetched_at"],
            "stale": True,
        }

    return {"items": [], "sources": sources_payload, "fetched_at": None, "stale": True}


@public_bp.route("/transparency/node-summary", methods=["GET"])
@limiter.limit("100 per hour")
def node_summary():
    node_param = request.args.get("node")
    node = resolve_node(node_param)
    if not node:
        return error("not_found", "Node not found", status=404)
    now = datetime.utcnow()
    since = now - timedelta(days=30)
    entries = ImpactLedgerEntry.query.filter(
        ImpactLedgerEntry.node_id == node.id,
        ImpactLedgerEntry.created_at >= since
    ).all()
    inflows_30d = sum([e.amount_cents for e in entries if e.amount_cents > 0])
    outflows_30d = sum([-e.amount_cents for e in entries if e.amount_cents < 0])
    pools = ImpactPool.query.filter_by(node_id=node.id).all()
    pools_payload = []
    for pool in pools:
        pool_entries = [e for e in entries if e.pool_id == pool.id]
        outflows_pool = sum([-e.amount_cents for e in pool_entries if e.amount_cents < 0])
        balance = db.session.query(db.func.sum(ImpactLedgerEntry.amount_cents)).filter_by(pool_id=pool.id).scalar() or 0
        pools_payload.append({
            "slug": pool.slug,
            "name": pool.name,
            "category": pool.category,
            "target_amount_cents": pool.target_amount_cents,
            "balance": balance,
            "outflows_30d": outflows_pool,
        })
    relief_count = ReliefRequest.query.filter_by(node_id=node.id).count()
    approved = ReliefRequest.query.filter(ReliefRequest.node_id == node.id, ReliefRequest.status.in_(["approved", "approved_under_cap", "disbursed"])).count()
    approval_ratio = (approved / relief_count) if relief_count else 0
    response_windows = ReliefRequest.query.filter(
        ReliefRequest.node_id == node.id,
        ReliefRequest.submitted_at.isnot(None),
        ReliefRequest.updated_at.isnot(None),
    ).with_entities(ReliefRequest.submitted_at, ReliefRequest.updated_at).all()
    response_vals = sorted([
        max(0.0, (updated_at - submitted_at).total_seconds() / 86400.0)
        for submitted_at, updated_at in response_windows
        if submitted_at is not None and updated_at is not None
    ])
    median_response_days = response_vals[len(response_vals)//2] if response_vals else 0
    recent_receipts = (
        ImpactLedgerEntry.query
        .filter(ImpactLedgerEntry.node_id == node.id)
        .order_by(ImpactLedgerEntry.created_at.desc())
        .limit(20)
        .all()
    )
    pool_lookup = {p.id: p for p in pools}
    receipts_payload = [{
        "id": entry.id,
        "pool_slug": pool_lookup.get(entry.pool_id).slug if pool_lookup.get(entry.pool_id) else None,
        "pool_name": pool_lookup.get(entry.pool_id).name if pool_lookup.get(entry.pool_id) else None,
        "entry_type": entry.entry_type,
        "amount_cents": entry.amount_cents,
        "description": entry.description,
        "reference_type": entry.reference_type,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    } for entry in recent_receipts]

    return ok({
        "node": {"slug": node.slug, "name": node.name},
        "totals": {
            "inflows_30d": inflows_30d,
            "outflows_30d": outflows_30d,
            "admin_ratio_30d": 0.0,
        },
        "pools": pools_payload,
        "receipts": receipts_payload,
        "relief_capacity": {
            "monthly_grants_remaining": max(0, 100 - relief_count),
            "avg_processing_days": 3.0,
        },
        "relief_metrics": {
            "approval_ratio": approval_ratio,
            "median_response_days": float(median_response_days),
        },
    })


@public_bp.route("/community-news", methods=["GET"])
@limiter.limit("60 per hour")
def trusted_community_news():
    try:
        requested_limit = int(request.args.get("limit", 12))
    except (TypeError, ValueError):
        requested_limit = 12
    limit = max(1, min(20, requested_limit))
    payload = _load_trusted_community_news()
    return ok(
        {
            "items": payload["items"][:limit],
            "sources": payload["sources"],
            "fetched_at": payload["fetched_at"],
            "stale": bool(payload["stale"]),
        }
    )
