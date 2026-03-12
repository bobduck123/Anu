from __future__ import annotations

from datetime import datetime, timedelta
from statistics import median
from typing import Any

from flask import Blueprint, current_app, g, request
from flask_jwt_extended import verify_jwt_in_request
from sqlalchemy import func

from ..extensions import db, limiter
from ..hell_models import (
    ContributionFootprintRead,
    CoverageProjectionRead,
    MicrocosmLifecycleState,
    MicrocosmProjectionRead,
    NeedProjectionRead,
    OfferProjectionRead,
    OperationalNeed,
    OperationalOffer,
    TelemetryEvent,
    TrustProjectionRead,
)
from ..models import Article, CrisisMode, ImpactLedgerEntry, ImpactPool, Microcosm, User
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.hell_domain_service import (
    TRUSTED_ROLES,
    accept_offer,
    confirm_offer,
    create_need,
    create_offer,
    list_needs,
    submit_need,
    verify_need,
)
from ..services.hell_projector_service import rebuild_projectors
from ..services.telemetry_service import emit_telemetry_event
from ..services.universe_projector_service import build_universe_packet, derive_redaction_level
from .utils import error, ok


hell_bp = Blueprint("hell", __name__)


ACTIVE_NEED_STATUSES = ["VERIFIED", "ROUTING_ACTIVE", "PARTIALLY_FULFILLED", "FULFILLED_PENDING_PROOF"]
STEWARD_ROLES = {"board_member", "node_admin", "platform_admin", "treasury_guardian"}


def _resolve_node_id(user: User | None, payload: dict[str, Any] | None = None) -> int:
    payload = payload or {}
    from_payload = payload.get("node_id")
    if from_payload is not None:
        try:
            return int(from_payload)
        except (TypeError, ValueError):
            pass
    from_query = request.args.get("node")
    if from_query:
        try:
            return int(from_query)
        except ValueError:
            pass
    if user and user.node_id:
        return int(user.node_id)
    if getattr(g, "node_id", None):
        return int(g.node_id)
    return 1


def _parse_bbox(raw: Any) -> list[float] | None:
    if raw is None:
        return None
    if isinstance(raw, list) and len(raw) == 4:
        try:
            return [float(raw[0]), float(raw[1]), float(raw[2]), float(raw[3])]
        except (TypeError, ValueError):
            return None
    if isinstance(raw, str) and raw.strip():
        parts = [p.strip() for p in raw.split(",")]
        if len(parts) != 4:
            return None
        try:
            return [float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])]
        except ValueError:
            return None
    return None


def _can_view_sensitive_needs(user: User | None) -> bool:
    if not user:
        return False
    return user.role in TRUSTED_ROLES or user.role in STEWARD_ROLES


def _serialize_need_for_scope(item: dict[str, Any], can_view_sensitive: bool) -> dict[str, Any]:
    if not item.get("is_sensitive"):
        return item
    if can_view_sensitive:
        return item
    redacted = dict(item)
    redacted["title"] = "Protected support request"
    redacted["description"] = "Details are visible to trusted responders only."
    redacted["lat"] = None
    redacted["lng"] = None
    return redacted


def _needs_for_earth(node_id: int, can_view_sensitive: bool, limit: int = 12) -> list[dict[str, Any]]:
    payload = list_needs(node_id=node_id)
    filtered = [n for n in payload if n.get("status") in ACTIVE_NEED_STATUSES]
    return [_serialize_need_for_scope(n, can_view_sensitive) for n in filtered[:limit]]


def _recently_fulfilled_for_earth(node_id: int, can_view_sensitive: bool, limit: int = 8) -> list[dict[str, Any]]:
    payload = list_needs(node_id=node_id, status="CLOSED_FULFILLED")
    result: list[dict[str, Any]] = []
    for row in payload:
        result.append(_serialize_need_for_scope(row, can_view_sensitive))
        if len(result) >= limit:
            break
    return result


def _hero_metrics(node_id: int) -> dict[str, Any]:
    now = datetime.utcnow()
    cutoff_30d = now - timedelta(days=30)
    closed_30d = OperationalNeed.query.filter(
        OperationalNeed.node_id == node_id,
        OperationalNeed.status == "CLOSED_FULFILLED",
        OperationalNeed.closed_at.isnot(None),
        OperationalNeed.closed_at >= cutoff_30d,
    ).count()
    started_30d = OperationalNeed.query.filter(
        OperationalNeed.node_id == node_id,
        OperationalNeed.created_at >= cutoff_30d,
    ).count()
    fulfillment_rate = round((closed_30d / started_30d) * 100.0, 2) if started_30d > 0 else 0.0

    event_rows = (
        TelemetryEvent.query.filter_by(node_id=node_id, entity_type="need")
        .filter(TelemetryEvent.event_type.in_(["NEED_CREATED_DRAFT", "NEED_MATCHED"]))
        .order_by(TelemetryEvent.id.asc())
        .all()
    )
    first_created: dict[str, datetime] = {}
    response_hours: list[float] = []
    for ev in event_rows:
        if ev.event_type == "NEED_CREATED_DRAFT":
            first_created.setdefault(ev.entity_id, ev.t or now)
            continue
        if ev.event_type == "NEED_MATCHED" and ev.entity_id in first_created:
            delta = (ev.t or now) - first_created[ev.entity_id]
            response_hours.append(max(0.0, round(delta.total_seconds() / 3600.0, 3)))
    median_response_hours = round(float(median(response_hours)), 2) if response_hours else 0.0

    active_offers = OperationalOffer.query.filter(
        OperationalOffer.node_id == node_id,
        OperationalOffer.status.in_(["MATCHED_TO_NEED", "ACCEPTED", "IN_PROGRESS", "DELIVERED_PENDING_CONFIRMATION"]),
    ).all()
    active_responders = len({int(o.created_by) for o in active_offers})
    return {
        "fulfillmentRate30d": fulfillment_rate,
        "medianResponseHours": median_response_hours,
        "activeRespondersNearby": active_responders,
    }


def _network_metrics(node_id: int) -> dict[str, Any]:
    credit_total = db.session.query(func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)).filter(
        ImpactLedgerEntry.node_id == node_id,
        ImpactLedgerEntry.amount_cents > 0,
    ).scalar() or 0
    debit_30d = db.session.query(func.coalesce(func.sum(func.abs(ImpactLedgerEntry.amount_cents)), 0)).filter(
        ImpactLedgerEntry.node_id == node_id,
        ImpactLedgerEntry.amount_cents < 0,
        ImpactLedgerEntry.created_at >= datetime.utcnow() - timedelta(days=30),
    ).scalar() or 0
    monthly_burn = max(int(debit_30d), 1)
    runway_months = round(float(credit_total) / float(monthly_burn), 2) if monthly_burn > 0 else 0.0

    coverage_rows = CoverageProjectionRead.query.filter_by(node_id=node_id).all()
    gap_index = round(
        sum(float(r.gap_index or 0.0) for r in coverage_rows) / len(coverage_rows),
        4,
    ) if coverage_rows else 0.0

    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    crisis_payload = {
        "active": bool(crisis and crisis.is_active),
        "eventSubmissionFrozen": bool(crisis and crisis.is_active and crisis.event_submission_frozen),
        "escrowFrozen": bool(crisis and crisis.is_active and crisis.escrow_frozen),
    }
    return {
        "reliefReserveRunwayMonths": runway_months,
        "coverageGapIndex": gap_index,
        "crisisMode": crisis_payload,
    }


@hell_bp.route("/needs", methods=["POST"])
@limiter.limit("30 per minute")
@require_permission("needs:create")
def create_need_route():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    node_id = _resolve_node_id(user, payload)
    try:
        need = create_need(
            actor=user,
            node_id=node_id,
            title=(payload.get("title") or "Support request").strip(),
            description=(payload.get("description") or "").strip(),
            category=(payload.get("category") or "general").strip().lower(),
            severity=(payload.get("severity") or "medium").strip().lower(),
            requested_units=int(payload.get("requested_units") or 1),
            is_sensitive=bool(payload.get("is_sensitive", True)),
            lat=payload.get("lat"),
            lng=payload.get("lng"),
            microcosm_id=payload.get("microcosm_id"),
            availability_json=payload.get("availability"),
            submit_immediately=bool(payload.get("submit", True)),
            consent_flags=payload.get("consent_flags"),
        )
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), status=400)
    return ok(
        {
            "id": need.id,
            "status": need.status,
            "node_id": need.node_id,
            "is_sensitive": bool(need.is_sensitive),
        },
        status=201,
    )


@hell_bp.route("/needs/<int:need_id>/submit", methods=["POST"])
@limiter.limit("40 per minute")
@require_permission("needs:create")
def submit_need_route(need_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    need = OperationalNeed.query.get(need_id)
    if not need:
        return error("not_found", "Need not found", status=404)
    if user.role != "platform_admin" and user.node_id != need.node_id:
        return error("forbidden", "Node access denied", status=403)
    try:
        need = submit_need(need=need, actor=user, consent_flags=(request.get_json(silent=True) or {}).get("consent_flags"))
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), status=400)
    return ok({"id": need.id, "status": need.status})


@hell_bp.route("/needs/<int:need_id>/verify", methods=["POST"])
@limiter.limit("80 per minute")
@require_permission("needs:verify")
def verify_need_route(need_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    need = OperationalNeed.query.get(need_id)
    if not need:
        return error("not_found", "Need not found", status=404)
    if user.role != "platform_admin" and user.node_id != need.node_id:
        return error("forbidden", "Node access denied", status=403)
    payload = request.get_json() or {}
    try:
        result = verify_need(
            need=need,
            actor=user,
            vote=payload.get("vote", "vouch"),
            reason=payload.get("reason"),
            consent_flags=payload.get("consent_flags"),
        )
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), status=400)
    return ok({"id": need.id, **result})


@hell_bp.route("/needs", methods=["GET"])
@limiter.limit("120 per minute")
def list_needs_route():
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    bbox = _parse_bbox(request.args.get("bbox"))
    node_id = _resolve_node_id(user)
    payload = list_needs(
        node_id=node_id,
        status=request.args.get("status"),
        category=request.args.get("category"),
        bbox=bbox,
        severity=request.args.get("severity"),
    )
    can_view_sensitive = _can_view_sensitive_needs(user)
    masked = [_serialize_need_for_scope(item, can_view_sensitive) for item in payload]
    return ok({"needs": masked, "count": len(masked)})


@hell_bp.route("/offers", methods=["POST"])
@limiter.limit("40 per minute")
@require_permission("offers:create")
def create_offer_route():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    node_id = _resolve_node_id(user, payload)
    try:
        offer = create_offer(
            actor=user,
            node_id=node_id,
            category=(payload.get("category") or "general").strip().lower(),
            contribution_type=(payload.get("contribution_type") or "time").strip().lower(),
            description=(payload.get("description") or "").strip(),
            capacity_units=int(payload.get("capacity_units") or 1),
            lat=payload.get("lat"),
            lng=payload.get("lng"),
            microcosm_id=payload.get("microcosm_id"),
            availability_json=payload.get("availability"),
            consent_flags=payload.get("consent_flags"),
        )
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), status=400)
    return ok({"id": offer.id, "status": offer.status, "need_id": offer.need_id}, status=201)


@hell_bp.route("/offers/<int:offer_id>/accept", methods=["POST"])
@limiter.limit("60 per minute")
@require_permission("offers:accept")
def accept_offer_route(offer_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    offer = OperationalOffer.query.get(offer_id)
    if not offer:
        return error("not_found", "Offer not found", status=404)
    if user.role != "platform_admin" and user.node_id != offer.node_id:
        return error("forbidden", "Node access denied", status=403)
    try:
        offer = accept_offer(offer=offer, actor=user, consent_flags=(request.get_json(silent=True) or {}).get("consent_flags"))
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), status=400)
    return ok({"id": offer.id, "status": offer.status, "need_id": offer.need_id})


@hell_bp.route("/offers/<int:offer_id>/confirm", methods=["POST"])
@limiter.limit("60 per minute")
@require_permission("offers:confirm")
def confirm_offer_route(offer_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    offer = OperationalOffer.query.get(offer_id)
    if not offer:
        return error("not_found", "Offer not found", status=404)
    if user.role != "platform_admin" and user.node_id != offer.node_id:
        return error("forbidden", "Node access denied", status=403)
    payload = request.get_json() or {}
    proof_ref = (payload.get("proof_ref") or "").strip()
    if not proof_ref:
        return error("validation_error", "proof_ref required", status=400)
    try:
        offer = confirm_offer(
            offer=offer,
            actor=user,
            proof_ref=proof_ref,
            units=float(payload.get("units") or offer.capacity_units or 1),
            emergency_override=bool(payload.get("emergency_override", False)),
            consent_flags=payload.get("consent_flags"),
        )
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), status=400)
    return ok({"id": offer.id, "status": offer.status, "need_id": offer.need_id})


@hell_bp.route("/microcosms", methods=["GET"])
@limiter.limit("120 per minute")
def list_microcosms_route():
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    node_id = _resolve_node_id(user)
    rows = db.session.query(MicrocosmProjectionRead, Microcosm).join(
        Microcosm, Microcosm.id == MicrocosmProjectionRead.microcosm_id
    ).filter(MicrocosmProjectionRead.node_id == node_id).order_by(MicrocosmProjectionRead.updated_at.desc()).all()
    payload = [{
        "id": micro.id,
        "name": micro.name,
        "description": micro.description,
        "status": proj.status,
        "active_needs": int(proj.active_needs or 0),
        "active_offers": int(proj.active_offers or 0),
        "fulfilled_30d": int(proj.fulfilled_30d or 0),
        "updated_at": proj.updated_at.isoformat() if proj.updated_at else None,
    } for proj, micro in rows]
    return ok({"microcosms": payload, "count": len(payload)})


@hell_bp.route("/microcosms", methods=["POST"])
@limiter.limit("20 per minute")
@require_permission("microcosms:create")
def create_microcosm_route():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return error("validation_error", "name required", status=400)
    node_id = _resolve_node_id(user, payload)
    microcosm = Microcosm(name=name, description=payload.get("description"), creator_id=user.id, node_id=node_id)
    db.session.add(microcosm)
    db.session.flush()
    lifecycle = MicrocosmLifecycleState(microcosm_id=microcosm.id, node_id=node_id, status="PROPOSED")
    db.session.add(lifecycle)
    emit_telemetry_event(
        actor_id=user.id,
        entity_type="microcosm",
        entity_id=str(microcosm.id),
        event_type="MICROCOSM_STATE_CHANGED",
        props_json={"from_state": "PROPOSED", "to_state": "PROPOSED", "microcosm_id": microcosm.id},
        node_id=node_id,
    )
    if bool(payload.get("activate", True)):
        lifecycle.status = "ACTIVE"
        emit_telemetry_event(
            actor_id=user.id,
            entity_type="microcosm",
            entity_id=str(microcosm.id),
            event_type="MICROCOSM_STATE_CHANGED",
            props_json={"from_state": "PROPOSED", "to_state": "ACTIVE", "microcosm_id": microcosm.id},
            node_id=node_id,
        )
    db.session.commit()
    rebuild_projectors(node_id=node_id)
    return ok({"id": microcosm.id, "status": lifecycle.status}, status=201)


@hell_bp.route("/microcosms/<int:microcosm_id>", methods=["GET"])
@limiter.limit("120 per minute")
def get_microcosm_detail(microcosm_id):
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    micro = Microcosm.query.get(microcosm_id)
    if not micro:
        return error("not_found", "Microcosm not found", status=404)
    member_count = len(micro.members) if micro.members else 0
    is_member = user and user in micro.members if micro.members else False
    story_count = db.session.query(db.func.count()).select_from(Article).filter(Article.microcosm_id == microcosm_id).scalar() or 0
    team_count = len(micro.teams) if micro.teams else 0
    return ok({
        "id": micro.id,
        "name": micro.name,
        "description": micro.description,
        "member_count": member_count,
        "is_member": is_member,
        "story_count": story_count,
        "team_count": team_count,
    })


@hell_bp.route("/microcosms/<int:microcosm_id>/join", methods=["POST"])
@limiter.limit("30 per minute")
def join_microcosm(microcosm_id):
    verify_jwt_in_request()
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    micro = Microcosm.query.get(microcosm_id)
    if not micro:
        return error("not_found", "Microcosm not found", status=404)
    if user in micro.members:
        return error("already_member", "Already a member", status=400)
    micro.members.append(user)
    db.session.commit()
    return ok({"message": "Joined microcosm", "microcosm_id": microcosm_id})


@hell_bp.route("/microcosms/<int:microcosm_id>/leave", methods=["POST"])
@limiter.limit("30 per minute")
def leave_microcosm(microcosm_id):
    verify_jwt_in_request()
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    micro = Microcosm.query.get(microcosm_id)
    if not micro:
        return error("not_found", "Microcosm not found", status=404)
    if user not in micro.members:
        return error("not_member", "Not a member", status=400)
    micro.members.remove(user)
    db.session.commit()
    return ok({"message": "Left microcosm", "microcosm_id": microcosm_id})


@hell_bp.route("/microcosms/<int:microcosm_id>/activity", methods=["GET"])
@limiter.limit("120 per minute")
def microcosm_activity(microcosm_id):
    verify_jwt_in_request(optional=True)
    micro = Microcosm.query.get(microcosm_id)
    if not micro:
        return error("not_found", "Microcosm not found", status=404)
    articles = Article.query.filter_by(microcosm_id=microcosm_id).order_by(Article.created_at.desc()).limit(20).all()
    activity = [{
        "type": "article",
        "id": a.id,
        "title": a.title,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in articles]
    return ok({"activity": activity, "count": len(activity)})


@hell_bp.route("/reliability/summary", methods=["GET"])
@limiter.limit("120 per minute")
def reliability_summary_route():
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    node_id = _resolve_node_id(user)
    rows = TrustProjectionRead.query.filter_by(node_id=node_id).all()
    global_payload = {
        "participants": len(rows),
        "avg_reliability": round(sum(float(r.reliability or 0.0) for r in rows) / len(rows), 3) if rows else 0.0,
        "confirmed_contributions": int(sum(int(r.confirmed_contributions or 0) for r in rows)),
        "failed_contributions": int(sum(int(r.failed_contributions or 0) for r in rows)),
        "verification_votes": int(sum(int(r.verification_votes or 0) for r in rows)),
    }
    local_payload = None
    if user:
        local = TrustProjectionRead.query.filter_by(node_id=node_id, user_id=user.id).first()
        if local:
            local_payload = {
                "user_id": user.id,
                "reliability": float(local.reliability or 0.0),
                "confirmed_contributions": int(local.confirmed_contributions or 0),
                "failed_contributions": int(local.failed_contributions or 0),
                "verification_votes": int(local.verification_votes or 0),
            }
    return ok({"global": global_payload, "local": local_payload})


@hell_bp.route("/coverage/gaps", methods=["GET"])
@limiter.limit("120 per minute")
def coverage_gaps_route():
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    node_id = _resolve_node_id(user)
    default_k = int(current_app.config.get("HELL_K_ANON_MIN", 3))
    k_min = int(request.args.get("k_min") or 0) or int((request.args.get("kMin") or 0) or 0) or default_k

    rows = CoverageProjectionRead.query.filter_by(node_id=node_id).order_by(CoverageProjectionRead.gap_index.desc()).all()
    can_see_microcosm = bool(user and (user.role in TRUSTED_ROLES or user.role in STEWARD_ROLES))

    aggregate_by_category: dict[str, dict[str, Any]] = {}
    suppressed_buckets = 0
    for row in rows:
        bucket_size = int(row.k_anon_bucket_size or 0)
        if bucket_size < k_min:
            suppressed_buckets += 1
            continue
        category = row.category or "general"
        if category not in aggregate_by_category:
            aggregate_by_category[category] = {
                "category": category,
                "active_needs": 0,
                "active_offers": 0,
                "routing_capacity": 0,
                "gap_index_weighted": 0.0,
                "bucket_count": 0,
                "microcosm_buckets": [],
            }
        agg = aggregate_by_category[category]
        agg["active_needs"] += int(row.active_needs or 0)
        agg["active_offers"] += int(row.active_offers or 0)
        agg["routing_capacity"] += int(row.routing_capacity or 0)
        agg["gap_index_weighted"] += float(row.gap_index or 0.0)
        agg["bucket_count"] += 1
        if can_see_microcosm and row.microcosm_id is not None:
            agg["microcosm_buckets"].append(
                {
                    "microcosm_id": int(row.microcosm_id),
                    "active_needs": int(row.active_needs or 0),
                    "active_offers": int(row.active_offers or 0),
                    "routing_capacity": int(row.routing_capacity or 0),
                    "gap_index": round(float(row.gap_index or 0.0), 4),
                    "k_anon_bucket_size": bucket_size,
                }
            )

    payload = []
    for category, agg in sorted(aggregate_by_category.items(), key=lambda item: item[1]["gap_index_weighted"], reverse=True):
        bucket_count = max(int(agg["bucket_count"]), 1)
        payload.append(
            {
                "category": category,
                "active_needs": int(agg["active_needs"]),
                "active_offers": int(agg["active_offers"]),
                "routing_capacity": int(agg["routing_capacity"]),
                "gap_index": round(float(agg["gap_index_weighted"]) / float(bucket_count), 4),
                "microcosm_buckets": agg["microcosm_buckets"] if can_see_microcosm else [],
            }
        )
    return ok({"gaps": payload, "k_min": k_min, "suppressed_buckets": suppressed_buckets})


@hell_bp.route("/impact/footprint", methods=["GET"])
@limiter.limit("120 per minute")
@require_permission("impact:footprint:read")
def impact_footprint_route():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    node_id = _resolve_node_id(user)
    row = ContributionFootprintRead.query.filter_by(node_id=node_id, user_id=user.id).first()
    if not row:
        return ok(
            {
                "user_id": user.id,
                "node_id": node_id,
                "time_units": 0.0,
                "goods_units": 0.0,
                "skills_units": 0.0,
                "logistics_units": 0.0,
                "verification_units": 0.0,
                "money_cents": 0,
                "impact_credits": 0.0,
                "microcosm_ids": [],
            }
        )
    return ok(
        {
            "user_id": row.user_id,
            "node_id": row.node_id,
            "time_units": float(row.time_units or 0.0),
            "goods_units": float(row.goods_units or 0.0),
            "skills_units": float(row.skills_units or 0.0),
            "logistics_units": float(row.logistics_units or 0.0),
            "verification_units": float(row.verification_units or 0.0),
            "money_cents": int(row.money_cents or 0),
            "impact_credits": float(row.impact_credits or 0.0),
            "microcosm_ids": row.microcosm_ids_json or [],
        }
    )


@hell_bp.route("/universe/packet", methods=["GET", "POST"])
@limiter.limit("80 per minute")
def universe_packet_route():
    if not is_enabled("HEAVEN_UNIVERSE_ENABLED"):
        return error("disabled", "Heaven universe projection is disabled", status=503)
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    payload = request.get_json(silent=True) if request.method == "POST" else {}
    payload = payload or {}

    universe_mode = payload.get("universeMode") or request.args.get("universeMode") or "mutual_aid"
    zoom_level = payload.get("zoomLevel") or request.args.get("zoomLevel") or 7
    bbox = _parse_bbox(payload.get("bbox") if payload else None) or _parse_bbox(request.args.get("bbox"))
    time_window = payload.get("timeWindow") or request.args.get("timeWindow") or "30d"
    requested_redaction = payload.get("redactionLevel") or request.args.get("redactionLevel")
    node_id = _resolve_node_id(user, payload)
    redaction_level = derive_redaction_level(user.role if user else None, requested=requested_redaction)
    default_k = int(current_app.config.get("HELL_K_ANON_MIN", 3))
    k_min = int(request.args.get("k_min") or payload.get("kMin") or 0) or default_k

    try:
        packet = build_universe_packet(
            node_id=node_id,
            universe_mode=str(universe_mode),
            zoom_level=int(zoom_level),
            redaction_level=redaction_level,
            time_window=str(time_window),
            bbox=bbox,
            k_min=int(k_min),
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok(packet)


@hell_bp.route("/earth/summary", methods=["GET"])
@limiter.limit("120 per minute")
def earth_summary_route():
    verify_jwt_in_request(optional=True)
    user = get_current_user()
    node_id = _resolve_node_id(user)
    earth_enabled = is_enabled("EARTH_ENTRY_ENABLED", user.role if user else None)
    feature_flags = {
        "earthEntryEnabled": earth_enabled,
        "earthSkyEnabled": is_enabled("EARTH_SKY_OVERLAY_ENABLED", user.role if user else None),
        "heavenUniverseEnabled": is_enabled("HEAVEN_UNIVERSE_ENABLED", user.role if user else None),
    }
    if not earth_enabled:
        return ok(
            {
                "featureFlags": feature_flags,
                "hero": {"fulfillmentRate30d": 0.0, "medianResponseHours": 0.0, "activeRespondersNearby": 0},
                "network": {
                    "reliefReserveRunwayMonths": 0.0,
                    "coverageGapIndex": 0.0,
                    "crisisMode": {"active": False, "eventSubmissionFrozen": False, "escrowFrozen": False},
                },
                "liveNeeds": [],
                "recentlyFulfilled": [],
                "microcosms": [],
                "footprint": None,
                "permissions": {
                    "authenticated": bool(user),
                    "role": user.role if user else "anonymous",
                    "canViewSensitiveNeeds": False,
                    "canEnterUniverse": False,
                },
                "educationLinks": [
                    {"title": "Verification Safety", "href": "/education?topic=verification-safety"},
                    {"title": "How To Respond", "href": "/education?topic=response-basics"},
                ],
            }
        )
    can_view_sensitive = _can_view_sensitive_needs(user)
    hero = _hero_metrics(node_id)
    network = _network_metrics(node_id)
    microcosms = db.session.query(MicrocosmProjectionRead, Microcosm).join(
        Microcosm, Microcosm.id == MicrocosmProjectionRead.microcosm_id
    ).filter(MicrocosmProjectionRead.node_id == node_id).order_by(MicrocosmProjectionRead.updated_at.desc()).limit(10).all()

    footprint = None
    if user:
        fp = ContributionFootprintRead.query.filter_by(user_id=user.id, node_id=node_id).first()
        if fp:
            footprint = {
                "time_units": float(fp.time_units or 0.0),
                "goods_units": float(fp.goods_units or 0.0),
                "skills_units": float(fp.skills_units or 0.0),
                "logistics_units": float(fp.logistics_units or 0.0),
                "verification_units": float(fp.verification_units or 0.0),
                "money_cents": int(fp.money_cents or 0),
                "impact_credits": float(fp.impact_credits or 0.0),
                "microcosm_ids": fp.microcosm_ids_json or [],
            }
    needs_live = _needs_for_earth(node_id, can_view_sensitive)
    fulfilled = _recently_fulfilled_for_earth(node_id, can_view_sensitive)
    return ok(
        {
            "featureFlags": {
                **feature_flags,
            },
            "hero": hero,
            "network": network,
            "liveNeeds": needs_live,
            "recentlyFulfilled": fulfilled,
            "microcosms": [
                {
                    "id": micro.id,
                    "name": micro.name,
                    "description": micro.description,
                    "status": proj.status,
                    "active_needs": int(proj.active_needs or 0),
                    "active_offers": int(proj.active_offers or 0),
                    "fulfilled_30d": int(proj.fulfilled_30d or 0),
                }
                for proj, micro in microcosms
            ],
            "footprint": footprint,
            "permissions": {
                "authenticated": bool(user),
                "role": user.role if user else "anonymous",
                "canViewSensitiveNeeds": can_view_sensitive,
                "canEnterUniverse": bool(is_enabled("HEAVEN_UNIVERSE_ENABLED", user.role if user else None)),
            },
            "educationLinks": [
                {"title": "Verification Safety", "href": "/education?topic=verification-safety"},
                {"title": "How To Respond", "href": "/education?topic=response-basics"},
            ],
        }
    )


@hell_bp.route("/hell/rebuild-projectors", methods=["POST"])
@limiter.limit("10 per minute")
@require_permission("needs:verify")
def rebuild_projectors_route():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    node_id = _resolve_node_id(user, payload)
    summary = rebuild_projectors(node_id=node_id)
    return ok({"node_id": node_id, "summary": summary})
