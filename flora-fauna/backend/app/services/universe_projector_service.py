from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from ..extensions import db
from ..hell_models import (
    CoverageProjectionRead,
    MicrocosmProjectionRead,
    NeedProjectionRead,
    OfferProjectionRead,
    OperationalNeed,
    OperationalOffer,
    TelemetryEvent,
    TrustProjectionRead,
)
from ..models import CrisisMode, Microcosm


UNIVERSE_MODES = {"mutual_aid", "events", "community", "coverage"}
REDACTION_LEVELS = ("public", "trusted", "steward")
STEWARD_ROLES = {"board_member", "node_admin", "platform_admin", "treasury_guardian"}
TRUSTED_ROLES = STEWARD_ROLES | {"validator", "case_worker", "organizer", "node_curator", "auditor", "relief_moderator"}
ACTIVE_NEED_STATUSES = {"VERIFIED", "ROUTING_ACTIVE", "PARTIALLY_FULFILLED", "FULFILLED_PENDING_PROOF"}
ACTIVE_OFFER_STATUSES = {"MATCHED_TO_NEED", "ACCEPTED", "IN_PROGRESS", "DELIVERED_PENDING_CONFIRMATION"}


@dataclass(frozen=True)
class UniverseProjectorMeta:
    name: str = "UniverseProjector"
    version: str = "1.0.0"


META = UniverseProjectorMeta()


def _canonical_hash(payload: dict[str, Any]) -> str:
    normalized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def derive_redaction_level(user_role: str | None, requested: str | None = None) -> str:
    allowed = "public"
    if user_role in STEWARD_ROLES:
        allowed = "steward"
    elif user_role in TRUSTED_ROLES:
        allowed = "trusted"
    if requested not in REDACTION_LEVELS:
        return allowed
    if REDACTION_LEVELS.index(requested) <= REDACTION_LEVELS.index(allowed):
        return requested
    return allowed


def _time_window_days(raw: str | None) -> int:
    normalized = (raw or "30d").strip().lower()
    return {"7d": 7, "30d": 30, "90d": 90}.get(normalized, 30)


def _resolution_floor_meters(mode: str, zoom_level: int, redaction_level: str, crisis_reduce_detail: bool) -> int:
    base = {
        "mutual_aid": 1200,
        "events": 800,
        "community": 1000,
        "coverage": 1500,
    }.get(mode, 1200)
    if zoom_level >= 12:
        base = int(base * 0.65)
    elif zoom_level <= 5:
        base = int(base * 1.25)
    if redaction_level == "public":
        base = max(base, 900)
    elif redaction_level == "trusted":
        base = max(base, 450)
    else:
        base = max(base, 250)
    if crisis_reduce_detail:
        base = max(base, 1800)
    return base


def _bbox_contains(lat: float | None, lng: float | None, bbox: list[float] | None) -> bool:
    if not bbox or len(bbox) != 4:
        return True
    if lat is None or lng is None:
        return False
    min_lng, min_lat, max_lng, max_lat = bbox
    return min_lng <= lng <= max_lng and min_lat <= lat <= max_lat


def _seed_to_position(seed: str, scale: float = 100.0, z_enabled: bool = False) -> tuple[float, float, float | None]:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    x = ((int(digest[0:8], 16) / 0xFFFFFFFF) * 2.0 - 1.0) * scale
    y = ((int(digest[8:16], 16) / 0xFFFFFFFF) * 2.0 - 1.0) * scale
    if not z_enabled:
        return round(x, 4), round(y, 4), None
    z = ((int(digest[16:24], 16) / 0xFFFFFFFF) * 2.0 - 1.0) * (scale * 0.6)
    return round(x, 4), round(y, 4), round(z, 4)


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _category_color(category: str) -> str:
    palette = [
        "amber",
        "sea",
        "teal",
        "slate",
        "fern",
        "coral",
        "sky",
        "sand",
    ]
    digest = hashlib.sha256(category.encode("utf-8")).hexdigest()
    return palette[int(digest[:2], 16) % len(palette)]


def _severity_mass(severity: str, requested_units: int) -> float:
    base = {"low": 0.45, "medium": 0.8, "high": 1.15, "critical": 1.6}.get((severity or "").lower(), 0.8)
    scaled = base + min(float(max(requested_units, 1)) * 0.03, 0.4)
    return round(_clamp(scaled, 0.2, 2.0), 4)


def _brightness_from_status(status: str) -> float:
    value = {
        "VERIFIED": 0.68,
        "ROUTING_ACTIVE": 0.86,
        "PARTIALLY_FULFILLED": 0.74,
        "FULFILLED_PENDING_PROOF": 0.8,
        "CLOSED_FULFILLED": 0.95,
        "MATCHED_TO_NEED": 0.72,
        "ACCEPTED": 0.8,
        "IN_PROGRESS": 0.84,
        "DELIVERED_PENDING_CONFIRMATION": 0.9,
        "CONFIRMED": 1.0,
    }.get(status, 0.62)
    return round(_clamp(value, 0.15, 1.0), 4)


def _max_event_time(node_id: int | None) -> datetime:
    query = TelemetryEvent.query
    if node_id is not None:
        query = query.filter_by(node_id=node_id)
    latest = query.order_by(TelemetryEvent.id.desc()).first()
    if latest and latest.t:
        return latest.t.replace(tzinfo=timezone.utc) if latest.t.tzinfo is None else latest.t.astimezone(timezone.utc)
    return datetime(1970, 1, 1, tzinfo=timezone.utc)


def _coverage_bucket_size(coverage_rows: list[CoverageProjectionRead], category: str, microcosm_id: int | None) -> int:
    strongest = 0
    for row in coverage_rows:
        if row.category != category:
            continue
        if row.microcosm_id == microcosm_id or row.microcosm_id is None:
            strongest = max(strongest, int(row.k_anon_bucket_size or 0))
    return strongest


def build_universe_packet(
    *,
    node_id: int | None,
    universe_mode: str,
    zoom_level: int,
    redaction_level: str,
    time_window: str | None,
    bbox: list[float] | None,
    k_min: int,
) -> dict[str, Any]:
    mode = universe_mode if universe_mode in UNIVERSE_MODES else "mutual_aid"
    days = _time_window_days(time_window)
    cutoff = datetime.utcnow() - timedelta(days=days)

    crisis = CrisisMode.query.filter_by(node_id=node_id).first() if node_id is not None else None
    crisis_reduce_detail = bool(crisis and crisis.is_active and (crisis.event_submission_frozen or crisis.escrow_frozen))
    resolution_floor = _resolution_floor_meters(mode, int(zoom_level), redaction_level, crisis_reduce_detail)

    need_query = db.session.query(NeedProjectionRead, OperationalNeed).join(
        OperationalNeed, OperationalNeed.id == NeedProjectionRead.need_id
    )
    offer_query = db.session.query(OfferProjectionRead, OperationalOffer).join(
        OperationalOffer, OperationalOffer.id == OfferProjectionRead.offer_id
    )
    coverage_query = CoverageProjectionRead.query
    microcosm_query = db.session.query(MicrocosmProjectionRead, Microcosm).join(
        Microcosm, Microcosm.id == MicrocosmProjectionRead.microcosm_id
    )
    trust_query = TrustProjectionRead.query
    if node_id is not None:
        need_query = need_query.filter(NeedProjectionRead.node_id == node_id)
        offer_query = offer_query.filter(OfferProjectionRead.node_id == node_id)
        coverage_query = coverage_query.filter(CoverageProjectionRead.node_id == node_id)
        microcosm_query = microcosm_query.filter(MicrocosmProjectionRead.node_id == node_id)
        trust_query = trust_query.filter(TrustProjectionRead.node_id == node_id)

    need_rows = []
    for proj, need in need_query.all():
        if not _bbox_contains(need.lat, need.lng, bbox):
            continue
        need_rows.append((proj, need))
    offer_rows = []
    for proj, offer in offer_query.all():
        if not _bbox_contains(offer.lat, offer.lng, bbox):
            continue
        offer_rows.append((proj, offer))
    coverage_rows = coverage_query.all()
    microcosm_rows = microcosm_query.all()
    trust_rows = trust_query.all()

    stars: list[dict[str, Any]] = []
    constellations: list[dict[str, Any]] = []
    galaxies: list[dict[str, Any]] = []
    nebulas: list[dict[str, Any]] = []
    flares: list[dict[str, Any]] = []
    star_to_entity: dict[str, dict[str, Any]] = {}
    constellation_to_query: dict[str, dict[str, Any]] = {}

    nebula_buckets: dict[tuple[str, int | None], int] = {}
    category_stats: dict[str, dict[str, Any]] = {}

    for proj, need in need_rows:
        category = proj.category or "general"
        bucket_size = _coverage_bucket_size(coverage_rows, category, proj.microcosm_id)
        sensitive = bool(proj.is_sensitive)
        allowed_individual = (not sensitive) and (redaction_level != "public" or bucket_size >= k_min)
        if crisis_reduce_detail and redaction_level != "steward":
            allowed_individual = False
        category_stats.setdefault(category, {"needs": 0, "offers": 0, "fulfilled": 0})
        if proj.status in ACTIVE_NEED_STATUSES:
            category_stats[category]["needs"] += 1
        if not allowed_individual:
            key = (category, proj.microcosm_id)
            nebula_buckets[key] = nebula_buckets.get(key, 0) + 1
            continue
        sid = f"need-{need.id}"
        x, y, z = _seed_to_position(sid, z_enabled=(mode != "coverage"))
        star = {
            "id": sid,
            "kind": "need",
            "x": x,
            "y": y,
            "z": z,
            "mass": _severity_mass(proj.severity, int(proj.requested_units or 1)),
            "brightness": _brightness_from_status(proj.status),
            "colorKey": _category_color(category),
            "ttlSeconds": max(days, 1) * 86400,
            "privacyClass": "public",
            "link": {"entityType": "need", "entityId": str(need.id), "allowed": redaction_level != "public"},
        }
        stars.append(star)
        star_to_entity[sid] = {"entityType": "need", "entityId": str(need.id), "allowed": redaction_level != "public"}

    for proj, offer in offer_rows:
        category = proj.category or "general"
        bucket_size = _coverage_bucket_size(coverage_rows, category, None)
        allowed_individual = redaction_level != "public" or bucket_size >= k_min
        if crisis_reduce_detail and redaction_level == "public":
            allowed_individual = False
        category_stats.setdefault(category, {"needs": 0, "offers": 0, "fulfilled": 0})
        if proj.status in ACTIVE_OFFER_STATUSES:
            category_stats[category]["offers"] += 1
        if not allowed_individual:
            key = (category, None)
            nebula_buckets[key] = nebula_buckets.get(key, 0) + 1
            continue
        sid = f"offer-{offer.id}"
        x, y, z = _seed_to_position(sid, z_enabled=(mode != "coverage"))
        star = {
            "id": sid,
            "kind": "offer",
            "x": x,
            "y": y,
            "z": z,
            "mass": round(_clamp(0.35 + float(max(proj.capacity_units, 1)) * 0.07, 0.2, 1.8), 4),
            "brightness": _brightness_from_status(proj.status),
            "colorKey": _category_color(category),
            "ttlSeconds": max(days, 1) * 86400,
            "privacyClass": "public",
            "link": {"entityType": "offer", "entityId": str(offer.id), "allowed": redaction_level != "public"},
        }
        stars.append(star)
        star_to_entity[sid] = {"entityType": "offer", "entityId": str(offer.id), "allowed": redaction_level != "public"}

    for proj, need in need_rows:
        if proj.status != "CLOSED_FULFILLED":
            continue
        if not need.closed_at or need.closed_at < cutoff:
            continue
        category = proj.category or "general"
        category_stats.setdefault(category, {"needs": 0, "offers": 0, "fulfilled": 0})
        category_stats[category]["fulfilled"] += 1
        bucket_size = _coverage_bucket_size(coverage_rows, category, proj.microcosm_id)
        allowed_individual = (not bool(proj.is_sensitive)) and (redaction_level != "public" or bucket_size >= k_min)
        if crisis_reduce_detail and redaction_level != "steward":
            allowed_individual = False
        if not allowed_individual:
            key = (category, proj.microcosm_id)
            nebula_buckets[key] = nebula_buckets.get(key, 0) + 1
            continue
        sid = f"fulfillment-{need.id}"
        x, y, z = _seed_to_position(sid, z_enabled=(mode != "coverage"))
        star = {
            "id": sid,
            "kind": "fulfillment",
            "x": x,
            "y": y,
            "z": z,
            "mass": 0.9,
            "brightness": 0.98,
            "colorKey": _category_color(category),
            "ttlSeconds": 14 * 86400,
            "privacyClass": "public",
            "link": {"entityType": "need", "entityId": str(need.id), "allowed": redaction_level != "public"},
        }
        stars.append(star)
        star_to_entity[sid] = {"entityType": "need", "entityId": str(need.id), "allowed": redaction_level != "public"}

    suppressed = 0
    for (category, microcosm_id), count in sorted(nebula_buckets.items(), key=lambda item: (item[0][0], item[0][1] or 0)):
        if count < k_min:
            suppressed += count
            continue
        nid = f"nebula-{category}-{microcosm_id or 'node'}"
        x, y, _ = _seed_to_position(nid, scale=90.0)
        nebulas.append(
            {
                "id": nid,
                "category": category,
                "x": x,
                "y": y,
                "density": int(count),
                "privacyClass": "aggregate",
                "kMin": k_min,
                "microcosmId": microcosm_id if redaction_level != "public" else None,
            }
        )
    if suppressed > 0:
        nebulas.append(
            {
                "id": "nebula-suppressed",
                "category": "suppressed",
                "x": 0.0,
                "y": 0.0,
                "density": int(suppressed),
                "privacyClass": "aggregate",
                "kMin": k_min,
                "microcosmId": None,
            }
        )

    for category, stats in sorted(category_stats.items(), key=lambda item: item[0]):
        cid = f"constellation-{category}"
        needs_count = int(stats.get("needs", 0))
        offers_count = int(stats.get("offers", 0))
        fulfilled_count = int(stats.get("fulfilled", 0))
        constellations.append(
            {
                "id": cid,
                "label": category,
                "activeNeeds": needs_count,
                "activeOffers": offers_count,
                "fulfilled": fulfilled_count,
                "colorKey": _category_color(category),
            }
        )
        constellation_to_query[cid] = {
            "query": f"/earth?category={category}",
            "allowed": True,
        }

    for proj, microcosm in sorted(microcosm_rows, key=lambda item: item[1].id):
        gid = f"galaxy-{microcosm.id}"
        x, y, _ = _seed_to_position(gid, scale=110.0)
        galaxies.append(
            {
                "id": gid,
                "name": microcosm.name,
                "status": proj.status,
                "x": x,
                "y": y,
                "activeNeeds": int(proj.active_needs or 0),
                "activeOffers": int(proj.active_offers or 0),
                "fulfilled30d": int(proj.fulfilled_30d or 0),
            }
        )

    for row in coverage_rows:
        if int(row.k_anon_bucket_size or 0) < k_min:
            continue
        if float(row.gap_index or 0.0) < 0.55:
            continue
        fid = f"flare-gap-{row.node_id}-{row.category}-{row.microcosm_id or 'node'}"
        flares.append(
            {
                "id": fid,
                "kind": "coverage_gap",
                "severity": round(float(row.gap_index or 0.0), 4),
                "category": row.category,
                "microcosmId": row.microcosm_id if redaction_level != "public" else None,
            }
        )

    if crisis and crisis.is_active:
        flares.append(
            {
                "id": f"flare-crisis-{crisis.node_id}",
                "kind": "crisis_freeze",
                "severity": 1.0,
                "eventSubmissionFrozen": bool(crisis.event_submission_frozen),
                "escrowFrozen": bool(crisis.escrow_frozen),
            }
        )

    stars.sort(key=lambda item: item["id"])
    constellations.sort(key=lambda item: item["id"])
    galaxies.sort(key=lambda item: item["id"])
    nebulas.sort(key=lambda item: item["id"])
    flares.sort(key=lambda item: item["id"])

    trust_reliability_avg = 0.0
    if trust_rows:
        trust_reliability_avg = round(sum(float(t.reliability or 0.0) for t in trust_rows) / len(trust_rows), 3)

    generated_at = _max_event_time(node_id).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    packet: dict[str, Any] = {
        "universeMode": mode,
        "generatedAt": generated_at,
        "bbox": bbox if bbox and len(bbox) == 4 else None,
        "zoomLevel": int(zoom_level),
        "privacy": {
            "kMin": int(k_min),
            "resolutionMetersMin": int(resolution_floor),
            "redactionLevel": redaction_level,
        },
        "objects": {
            "stars": stars,
            "constellations": constellations,
            "galaxies": galaxies,
            "nebulas": nebulas,
            "flares": flares,
        },
        "drilldown": {
            "starToEntity": star_to_entity,
            "constellationToQuery": constellation_to_query,
        },
        "configVersion": f"{META.version}|k{k_min}|res{resolution_floor}|trust{trust_reliability_avg}",
        "evidenceHash": "",
    }
    if packet.get("bbox") is None:
        packet.pop("bbox")

    to_hash = dict(packet)
    to_hash["evidenceHash"] = ""
    packet["evidenceHash"] = _canonical_hash(to_hash)
    return packet

