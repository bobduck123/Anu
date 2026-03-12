"""
Constellations API
==================
Endpoints for constellation management, scoring, briefs, drift alerts, and admin.
"""

from datetime import date, datetime

from flask import Blueprint, request

from ..extensions import db
from ..models import (
    Constellation,
    ConstellationMembership,
    ConstellationMetricsWeekly,
    ConstellationBrief,
    ConstellationSuggestion,
    ConstellationDriftAlert,
    ConstellationRanking,
    ConstellationParameterBounds,
    Microcosm,
    AuditRecord,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.constellation_scoring_service import (
    score_constellation_week,
    compute_synergy_matrix,
    ensure_parameter_bounds,
)
from ..services.constellation_drift_service import run_drift_monitor
from .utils import ok, error

constellations_bp = Blueprint("constellations", __name__, url_prefix="/constellations")


def _parse_week(raw):
    """Parse a week_start string (YYYY-MM-DD) into a date object."""
    if isinstance(raw, date):
        return raw
    try:
        return date.fromisoformat(raw)
    except (ValueError, TypeError):
        return None


def _ensure_enabled():
    if not is_enabled("OIL_CONSTELLATIONS"):
        return error("disabled", "Constellations disabled", status=403)
    return None


# -- Constellation CRUD --

@constellations_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_constellations():
    """List all active constellations, optionally filtered by domain."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    domain = request.args.get("domain")
    q = Constellation.query.filter_by(active=True)
    if domain:
        q = q.filter_by(domain=domain)
    q = q.order_by(Constellation.created_at.desc())
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return ok({
        "constellations": [c.to_dict() for c in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
        "pages": paginated.pages,
    })


@constellations_bp.route("/<int:constellation_id>", methods=["GET"])
@alpha_jwt_required()
def get_constellation(constellation_id):
    """Get a single constellation with its memberships."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    memberships = ConstellationMembership.query.filter_by(constellation_id=c.id).all()
    microcosm_ids = [m.microcosm_id for m in memberships]
    microcosms = Microcosm.query.filter(Microcosm.id.in_(microcosm_ids)).all() if microcosm_ids else []
    return ok({
        "constellation": c.to_dict(),
        "microcosms": [{
            "id": m.id,
            "name": m.name,
            "joinedAt": next(
                (mem.joined_at.isoformat() for mem in memberships if mem.microcosm_id == m.id),
                None,
            ),
        } for m in microcosms],
    })


@constellations_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_constellation():
    """Create a new constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    name = data.get("name")
    if not name:
        return error("validation_error", "name is required", status=400)
    node_id = data.get("nodeId")
    if not node_id:
        return error("validation_error", "nodeId is required", status=400)

    if user.role not in {"organizer", "node_admin", "platform_admin", "board_member"}:
        return error("forbidden", "Insufficient permission", status=403)
    c = Constellation(
        node_id=int(node_id),
        name=name,
        description=data.get("description"),
        domain=data.get("domain"),
        geo_label=data.get("geoLabel"),
        created_by=user.id,
    )
    db.session.add(c)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="CONSTELLATION_CREATED",
        entity_type="constellation",
        entity_id="pending",
        payload={"name": name, "domain": data.get("domain")},
    ))
    db.session.commit()
    return ok({"constellation": c.to_dict()}, status=201)


@constellations_bp.route("/<int:constellation_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_constellation(constellation_id):
    """Update constellation metadata."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    if user.role not in {"organizer", "node_admin", "platform_admin", "board_member"}:
        return error("forbidden", "Insufficient permission", status=403)
    data = request.get_json() or {}
    for key, col in {"name": "name", "description": "description", "domain": "domain", "geoLabel": "geo_label"}.items():
        if key in data:
            setattr(c, col, data[key])
    if "active" in data:
        c.active = bool(data["active"])
    db.session.commit()
    return ok({"constellation": c.to_dict()})


# ── Membership Management ────────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/members", methods=["POST"])
@alpha_jwt_required()
def add_member(constellation_id):
    """Add a microcosm to a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    if user.role not in {"organizer", "node_admin", "platform_admin", "board_member"}:
        return error("forbidden", "Insufficient permission", status=403)
    data = request.get_json() or {}
    microcosm_id = data.get("microcosmId")
    if not microcosm_id:
        return error("validation_error", "microcosmId is required", status=400)
    existing = ConstellationMembership.query.filter_by(
        constellation_id=constellation_id, microcosm_id=int(microcosm_id),
    ).first()
    if existing:
        return error("conflict", "Microcosm already in constellation", status=409)
    mem = ConstellationMembership(
        constellation_id=constellation_id,
        microcosm_id=int(microcosm_id),
    )
    db.session.add(mem)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="CONSTELLATION_MEMBER_ADDED",
        entity_type="constellation",
        entity_id=str(constellation_id),
        payload={"microcosm_id": microcosm_id},
    ))
    db.session.commit()
    return ok({"membership": {"constellationId": constellation_id, "microcosmId": microcosm_id}}, status=201)


@constellations_bp.route("/<int:constellation_id>/members/<int:microcosm_id>", methods=["DELETE"])
@alpha_jwt_required()
def remove_member(constellation_id, microcosm_id):
    """Remove a microcosm from a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    if user.role not in {"organizer", "node_admin", "platform_admin", "board_member"}:
        return error("forbidden", "Insufficient permission", status=403)
    mem = ConstellationMembership.query.filter_by(
        constellation_id=constellation_id, microcosm_id=microcosm_id,
    ).first()
    if not mem:
        return error("not_found", "Membership not found", status=404)
    db.session.delete(mem)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="CONSTELLATION_MEMBER_REMOVED",
        entity_type="constellation",
        entity_id=str(constellation_id),
        payload={"microcosm_id": microcosm_id},
    ))
    db.session.commit()
    return ok({"removed": True})


# ── Weekly Metrics ───────────────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/metrics", methods=["GET"])
@alpha_jwt_required()
def list_metrics(constellation_id):
    """List weekly metrics for a constellation, optionally filtered by week."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    week = request.args.get("week")
    q = ConstellationMetricsWeekly.query.filter_by(constellation_id=constellation_id)
    if week:
        w = _parse_week(week)
        if w:
            q = q.filter_by(week_start=w)
    q = q.order_by(ConstellationMetricsWeekly.week_start.desc())
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return ok({
        "metrics": [{
            "id": m.id,
            "microcosmId": m.microcosm_id,
            "weekStart": m.week_start.isoformat() if m.week_start else None,
            "volumeMoved": m.volume_moved,
            "savingsPerUnit": m.savings_per_unit,
            "logisticsCost": m.logistics_cost,
            "qualityMedian": m.quality_median,
            "deliveryReliability": m.delivery_reliability,
            "disputesRate": m.disputes_rate,
            "participation": m.participation,
            "accessibility": m.accessibility,
            "equityFairness": m.equity_fairness,
            "burnoutIndex": m.burnout_index,
            "reliabilityLcb": m.reliability_lcb,
            "proofIntegrityLcb": m.proof_integrity_lcb,
            "perfScore": m.perf_score,
            "evidenceHash": m.evidence_hash,
            "formulaVersion": m.formula_version,
        } for m in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
    })


@constellations_bp.route("/<int:constellation_id>/metrics", methods=["POST"])
@alpha_jwt_required()
def submit_metrics(constellation_id):
    """Submit or update weekly metrics for a microcosm in a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    data = request.get_json() or {}
    microcosm_id = data.get("microcosmId")
    week_raw = data.get("weekStart")
    if not microcosm_id or not week_raw:
        return error("validation_error", "microcosmId and weekStart required", status=400)
    week_start = _parse_week(week_raw)
    if not week_start:
        return error("validation_error", "Invalid weekStart format (YYYY-MM-DD)", status=400)

    # Upsert
    existing = ConstellationMetricsWeekly.query.filter_by(
        constellation_id=constellation_id,
        microcosm_id=int(microcosm_id),
        week_start=week_start,
    ).first()
    if existing:
        m = existing
    else:
        m = ConstellationMetricsWeekly(
            constellation_id=constellation_id,
            microcosm_id=int(microcosm_id),
            week_start=week_start,
        )

    # Update canonical variables
    field_map = {
        "volumeMoved": "volume_moved",
        "savingsPerUnit": "savings_per_unit",
        "logisticsCost": "logistics_cost",
        "qualityMedian": "quality_median",
        "deliveryReliability": "delivery_reliability",
        "disputesRate": "disputes_rate",
        "participation": "participation",
        "accessibility": "accessibility",
        "equityFairness": "equity_fairness",
        "burnoutIndex": "burnout_index",
        "reliabilityLcb": "reliability_lcb",
        "proofIntegrityLcb": "proof_integrity_lcb",
    }
    for key, col in field_map.items():
        if key in data:
            setattr(m, col, float(data[key]))

    if not existing:
        db.session.add(m)
    db.session.commit()
    return ok({"metricId": m.id, "weekStart": week_start.isoformat()}, status=201 if not existing else 200)


# ── Scoring & Rankings ───────────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/score", methods=["POST"])
@alpha_jwt_required()
def trigger_scoring(constellation_id):
    """Run the scoring engine for a constellation week."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    data = request.get_json() or {}
    week_start = _parse_week(data.get("weekStart"))
    if not week_start:
        return error("validation_error", "weekStart required (YYYY-MM-DD)", status=400)

    rankings = score_constellation_week(constellation_id, week_start, actor_id=user.id)
    return ok({
        "rankings": [{
            "microcosmId": r.microcosm_id,
            "rank": r.rank,
            "rawPerf": r.raw_perf,
            "antiCaptureWeight": r.anti_capture_weight,
            "featuredScore": r.featured_score,
            "isFeatured": r.is_featured,
            "isBestPractice": r.is_best_practice,
            "gateFailures": r.gate_failures,
            "evidenceHash": r.evidence_hash,
        } for r in rankings],
        "count": len(rankings),
    })


@constellations_bp.route("/<int:constellation_id>/rankings", methods=["GET"])
@alpha_jwt_required()
def get_rankings(constellation_id):
    """Get rankings for a constellation, optionally by week."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    week = request.args.get("week")
    q = ConstellationRanking.query.filter_by(constellation_id=constellation_id)
    if week:
        w = _parse_week(week)
        if w:
            q = q.filter_by(week_start=w)
    q = q.order_by(ConstellationRanking.week_start.desc(), ConstellationRanking.rank.asc())
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return ok({
        "rankings": [{
            "id": r.id,
            "microcosmId": r.microcosm_id,
            "weekStart": r.week_start.isoformat() if r.week_start else None,
            "rank": r.rank,
            "rawPerf": r.raw_perf,
            "antiCaptureWeight": r.anti_capture_weight,
            "featuredScore": r.featured_score,
            "isFeatured": r.is_featured,
            "isBestPractice": r.is_best_practice,
            "gateFailures": r.gate_failures,
            "componentContributions": r.component_contributions,
            "evidenceHash": r.evidence_hash,
            "formulaVersion": r.formula_version,
        } for r in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
    })


@constellations_bp.route("/<int:constellation_id>/rankings/<int:microcosm_id>/explain", methods=["GET"])
@alpha_jwt_required()
def explain_ranking(constellation_id, microcosm_id):
    """Get full explainability breakdown for a microcosm ranking."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    week = request.args.get("week")
    q = ConstellationRanking.query.filter_by(
        constellation_id=constellation_id, microcosm_id=microcosm_id,
    )
    if week:
        w = _parse_week(week)
        if w:
            q = q.filter_by(week_start=w)
    ranking = q.order_by(ConstellationRanking.week_start.desc()).first()
    if not ranking:
        return error("not_found", "Ranking not found", status=404)

    # Get corresponding metrics
    metrics = ConstellationMetricsWeekly.query.filter_by(
        constellation_id=constellation_id,
        microcosm_id=microcosm_id,
        week_start=ranking.week_start,
    ).first()

    return ok({
        "ranking": {
            "rank": ranking.rank,
            "rawPerf": ranking.raw_perf,
            "antiCaptureWeight": ranking.anti_capture_weight,
            "featuredScore": ranking.featured_score,
            "isFeatured": ranking.is_featured,
            "isBestPractice": ranking.is_best_practice,
            "gateFailures": ranking.gate_failures,
            "evidenceHash": ranking.evidence_hash,
            "formulaVersion": ranking.formula_version,
        },
        "decomposition": ranking.component_contributions,
        "rawMetrics": {
            "volumeMoved": metrics.volume_moved if metrics else None,
            "savingsPerUnit": metrics.savings_per_unit if metrics else None,
            "logisticsCost": metrics.logistics_cost if metrics else None,
            "qualityMedian": metrics.quality_median if metrics else None,
            "deliveryReliability": metrics.delivery_reliability if metrics else None,
            "disputesRate": metrics.disputes_rate if metrics else None,
            "participation": metrics.participation if metrics else None,
            "accessibility": metrics.accessibility if metrics else None,
            "equityFairness": metrics.equity_fairness if metrics else None,
            "burnoutIndex": metrics.burnout_index if metrics else None,
            "reliabilityLcb": metrics.reliability_lcb if metrics else None,
            "proofIntegrityLcb": metrics.proof_integrity_lcb if metrics else None,
        } if metrics else None,
    })


@constellations_bp.route("/<int:constellation_id>/synergies", methods=["GET"])
@alpha_jwt_required()
def get_synergies(constellation_id):
    """Get pairwise synergy scores for a constellation week."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    week = request.args.get("week")
    if not week:
        return error("validation_error", "week query param required (YYYY-MM-DD)", status=400)
    week_start = _parse_week(week)
    if not week_start:
        return error("validation_error", "Invalid week format", status=400)
    synergies = compute_synergy_matrix(constellation_id, week_start)
    return ok({"synergies": synergies, "count": len(synergies)})


# ── Briefs ───────────────────────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/briefs", methods=["GET"])
@alpha_jwt_required()
def list_briefs(constellation_id):
    """List weekly briefs for a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    briefs = (
        ConstellationBrief.query
        .filter_by(constellation_id=constellation_id)
        .order_by(ConstellationBrief.week_start.desc())
        .limit(12)
        .all()
    )
    return ok({
        "briefs": [{
            "id": b.id,
            "weekStart": b.week_start.isoformat() if b.week_start else None,
            "summary": b.summary_json,
            "topPerformers": b.top_performers,
            "riskFlags": b.risk_flags,
            "synergyPairs": b.synergy_pairs,
            "evidenceHash": b.evidence_hash,
            "createdAt": b.created_at.isoformat() if b.created_at else None,
        } for b in briefs],
    })


@constellations_bp.route("/<int:constellation_id>/briefs", methods=["POST"])
@alpha_jwt_required()
def generate_brief(constellation_id):
    """Generate a weekly brief for a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    data = request.get_json() or {}
    week_start = _parse_week(data.get("weekStart"))
    if not week_start:
        return error("validation_error", "weekStart required (YYYY-MM-DD)", status=400)

    # Gather rankings for the week
    rankings = (
        ConstellationRanking.query
        .filter_by(constellation_id=constellation_id, week_start=week_start)
        .order_by(ConstellationRanking.rank.asc())
        .all()
    )
    if not rankings:
        return error("no_data", "No rankings found for this week. Run scoring first.", status=404)

    # Top performers
    top_performers = [{
        "microcosmId": r.microcosm_id,
        "rank": r.rank,
        "featuredScore": r.featured_score,
        "isFeatured": r.is_featured,
        "isBestPractice": r.is_best_practice,
    } for r in rankings[:5]]

    # Risk flags from drift alerts
    alerts = (
        ConstellationDriftAlert.query
        .filter_by(constellation_id=constellation_id, week_start=week_start, resolved=False)
        .all()
    )
    risk_flags = [{
        "alertType": a.alert_type,
        "severity": a.severity,
        "metricValue": a.metric_value,
        "threshold": a.threshold,
    } for a in alerts]

    # Synergy pairs
    synergies = compute_synergy_matrix(constellation_id, week_start)

    # Build summary
    featured_count = sum(1 for r in rankings if r.is_featured)
    gate_blocked = sum(1 for r in rankings if r.gate_failures)
    avg_perf = sum(r.raw_perf for r in rankings) / len(rankings) if rankings else 0

    summary = {
        "totalMicrocosms": len(rankings),
        "featuredCount": featured_count,
        "gateBlockedCount": gate_blocked,
        "averagePerf": round(avg_perf, 4),
        "alertCount": len(alerts),
        "criticalAlerts": sum(1 for a in alerts if a.severity == "critical"),
        "synergyPairCount": len(synergies),
    }

    import hashlib, json
    ev_hash = hashlib.sha256(json.dumps({
        "constellation_id": constellation_id,
        "week": str(week_start),
        "summary": summary,
    }, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    brief = ConstellationBrief(
        constellation_id=constellation_id,
        week_start=week_start,
        summary_json=summary,
        top_performers=top_performers,
        risk_flags=risk_flags,
        synergy_pairs=synergies[:10],
        evidence_hash=ev_hash,
    )
    db.session.add(brief)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="CONSTELLATION_BRIEF_GENERATED",
        entity_type="constellation",
        entity_id=str(constellation_id),
        payload={
            "week_start": str(week_start),
            "summary": summary,
            "evidence_hash": ev_hash,
        },
    ))
    db.session.commit()

    return ok({
        "brief": {
            "id": brief.id,
            "weekStart": week_start.isoformat(),
            "summary": summary,
            "topPerformers": top_performers,
            "riskFlags": risk_flags,
            "synergyPairs": synergies[:10],
            "evidenceHash": ev_hash,
        },
    }, status=201)


# ── Coordination Suggestions ────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/suggestions", methods=["GET"])
@alpha_jwt_required()
def list_suggestions(constellation_id):
    """List coordination suggestions for a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    status_filter = request.args.get("status", "pending")
    q = ConstellationSuggestion.query.filter_by(constellation_id=constellation_id)
    if status_filter != "all":
        q = q.filter_by(status=status_filter)
    suggestions = q.order_by(ConstellationSuggestion.created_at.desc()).limit(50).all()
    return ok({"suggestions": [s.to_dict() for s in suggestions]})


@constellations_bp.route("/<int:constellation_id>/suggestions", methods=["POST"])
@alpha_jwt_required()
def create_suggestion(constellation_id):
    """Create a coordination suggestion."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    data = request.get_json() or {}
    required = ["targetMicrocosmId", "suggestionType", "title"]
    for field in required:
        if not data.get(field):
            return error("validation_error", f"{field} is required", status=400)

    valid_types = {"coordinate", "merge", "learn_from", "split_load"}
    if data["suggestionType"] not in valid_types:
        return error("validation_error", f"suggestionType must be one of {valid_types}", status=400)

    import hashlib, json
    ev_hash = hashlib.sha256(json.dumps({
        "constellation_id": constellation_id,
        "target": data["targetMicrocosmId"],
        "type": data["suggestionType"],
        "title": data["title"],
    }, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    suggestion = ConstellationSuggestion(
        constellation_id=constellation_id,
        target_microcosm_id=int(data["targetMicrocosmId"]),
        suggestion_type=data["suggestionType"],
        title=data["title"],
        rationale=data.get("rationale"),
        related_microcosm_id=int(data["relatedMicrocosmId"]) if data.get("relatedMicrocosmId") else None,
        score_impact=float(data["scoreImpact"]) if data.get("scoreImpact") else None,
        evidence_hash=ev_hash,
    )
    db.session.add(suggestion)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="CONSTELLATION_COORDINATION_SUGGESTION",
        entity_type="constellation",
        entity_id=str(constellation_id),
        payload={
            "suggestion_type": data["suggestionType"],
            "target_microcosm_id": data["targetMicrocosmId"],
            "evidence_hash": ev_hash,
        },
    ))
    db.session.commit()
    return ok({"suggestion": suggestion.to_dict()}, status=201)


@constellations_bp.route("/<int:constellation_id>/suggestions/<int:suggestion_id>", methods=["PATCH"])
@alpha_jwt_required()
def update_suggestion(constellation_id, suggestion_id):
    """Accept or dismiss a coordination suggestion."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    suggestion = ConstellationSuggestion.query.filter_by(
        id=suggestion_id, constellation_id=constellation_id,
    ).first()
    if not suggestion:
        return error("not_found", "Suggestion not found", status=404)
    data = request.get_json() or {}
    new_status = data.get("status")
    if new_status not in {"accepted", "dismissed"}:
        return error("validation_error", "status must be 'accepted' or 'dismissed'", status=400)
    suggestion.status = new_status
    db.session.commit()
    return ok({"suggestion": suggestion.to_dict()})


# ── Drift Alerts ─────────────────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/drift", methods=["POST"])
@alpha_jwt_required()
def trigger_drift_monitor(constellation_id):
    """Run the drift / anti-capture monitor for a constellation week."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)
    data = request.get_json() or {}
    week_start = _parse_week(data.get("weekStart"))
    if not week_start:
        return error("validation_error", "weekStart required (YYYY-MM-DD)", status=400)

    alerts = run_drift_monitor(constellation_id, week_start, actor_id=user.id)
    return ok({
        "alerts": [a.to_dict() for a in alerts],
        "count": len(alerts),
    })


@constellations_bp.route("/<int:constellation_id>/drift/alerts", methods=["GET"])
@alpha_jwt_required()
def list_drift_alerts(constellation_id):
    """List drift alerts for a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    severity = request.args.get("severity")
    resolved = request.args.get("resolved")
    q = ConstellationDriftAlert.query.filter_by(constellation_id=constellation_id)
    if severity:
        q = q.filter_by(severity=severity)
    if resolved is not None:
        q = q.filter_by(resolved=resolved.lower() == "true")
    q = q.order_by(ConstellationDriftAlert.created_at.desc())
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)
    return ok({
        "alerts": [a.to_dict() for a in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
    })


@constellations_bp.route("/<int:constellation_id>/drift/alerts/<int:alert_id>/resolve", methods=["POST"])
@alpha_jwt_required()
@require_permission("governance:manage")
def resolve_drift_alert(constellation_id, alert_id):
    """Resolve a drift alert (manual governance action)."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    alert = ConstellationDriftAlert.query.filter_by(
        id=alert_id, constellation_id=constellation_id,
    ).first()
    if not alert:
        return error("not_found", "Alert not found", status=404)
    if alert.resolved:
        return error("conflict", "Alert already resolved", status=409)
    alert.resolved = True
    alert.resolved_by = user.id
    alert.resolved_at = datetime.utcnow()
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="CONSTELLATION_DRIFT_ALERT_RESOLVED",
        entity_type="constellation",
        entity_id=str(constellation_id),
        payload={
            "alert_id": alert_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
        },
    ))
    db.session.commit()
    return ok({"alert": alert.to_dict()})


# ── Parameter Bounds (Admin) ─────────────────────────────────

@constellations_bp.route("/params/bounds", methods=["GET"])
@alpha_jwt_required()
def get_parameter_bounds():
    """Get all registered parameter bounds."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    bounds = ConstellationParameterBounds.query.filter_by(active=True).all()
    return ok({
        "bounds": [{
            "id": b.id,
            "paramKey": b.param_key,
            "version": b.version,
            "lowerBound": b.lower_bound,
            "upperBound": b.upper_bound,
            "defaultValue": b.default_value,
            "description": b.description,
        } for b in bounds],
    })


@constellations_bp.route("/params/bounds/ensure", methods=["POST"])
@alpha_jwt_required()
@require_permission("formulas:manage")
def ensure_bounds():
    """Ensure all parameter bounds are registered in the database."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    ensure_parameter_bounds()
    return ok({"status": "ensured"})


# ── Dashboard Summary ────────────────────────────────────────

@constellations_bp.route("/<int:constellation_id>/dashboard", methods=["GET"])
@alpha_jwt_required()
def dashboard(constellation_id):
    """Get dashboard summary for a constellation."""
    disabled = _ensure_enabled()
    if disabled:
        return disabled
    c = Constellation.query.get(constellation_id)
    if not c:
        return error("not_found", "Constellation not found", status=404)

    # Member count
    member_count = ConstellationMembership.query.filter_by(constellation_id=constellation_id).count()

    # Latest rankings
    latest_week = (
        db.session.query(db.func.max(ConstellationRanking.week_start))
        .filter_by(constellation_id=constellation_id)
        .scalar()
    )
    rankings = []
    featured = []
    if latest_week:
        rankings_q = (
            ConstellationRanking.query
            .filter_by(constellation_id=constellation_id, week_start=latest_week)
            .order_by(ConstellationRanking.rank.asc())
            .all()
        )
        rankings = [{
            "microcosmId": r.microcosm_id,
            "rank": r.rank,
            "rawPerf": r.raw_perf,
            "featuredScore": r.featured_score,
            "isFeatured": r.is_featured,
        } for r in rankings_q]
        featured = [r for r in rankings if r["isFeatured"]]

    # Active alerts
    active_alerts = (
        ConstellationDriftAlert.query
        .filter_by(constellation_id=constellation_id, resolved=False)
        .count()
    )
    critical_alerts = (
        ConstellationDriftAlert.query
        .filter_by(constellation_id=constellation_id, resolved=False, severity="critical")
        .count()
    )

    # Latest brief
    latest_brief = (
        ConstellationBrief.query
        .filter_by(constellation_id=constellation_id)
        .order_by(ConstellationBrief.week_start.desc())
        .first()
    )

    return ok({
        "constellation": c.to_dict(),
        "memberCount": member_count,
        "latestWeek": latest_week.isoformat() if latest_week else None,
        "rankings": rankings,
        "featured": featured,
        "activeAlerts": active_alerts,
        "criticalAlerts": critical_alerts,
        "latestBrief": {
            "weekStart": latest_brief.week_start.isoformat() if latest_brief else None,
            "summary": latest_brief.summary_json if latest_brief else None,
        } if latest_brief else None,
    })
