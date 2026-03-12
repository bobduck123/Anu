from datetime import datetime

from flask import Blueprint, request

from ..extensions import db
from ..models import TimeEntry, User
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from .utils import ok, error


time_entries_bp = Blueprint("time_entries", __name__, url_prefix="/time_entries")


@time_entries_bp.route("", methods=["POST"])
@alpha_jwt_required()
def create_time_entry():
    if not is_enabled("TIMEBANK_ENABLED"):
        return error("disabled", "Timebank disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    hours = float(payload.get("hours", 0))
    if hours <= 0:
        return error("validation_error", "hours must be > 0", status=400)
    activity_type = (payload.get("activity_type") or "").strip()
    if not activity_type:
        return error("validation_error", "activity_type is required", status=400)
    occurred_at_raw = payload.get("occurred_at")
    try:
        occurred_at = datetime.fromisoformat(occurred_at_raw) if occurred_at_raw else datetime.utcnow()
    except ValueError:
        return error("validation_error", "occurred_at must be ISO format", status=400)
    entry = TimeEntry(
        user_id=user.id,
        microcosm_id=payload.get("microcosm_id"),
        guild_id=payload.get("guild_id"),
        activity_type=activity_type[:120],
        hours=hours,
        occurred_at=occurred_at,
        verification_status="pending",
        proof_ref=payload.get("proof_ref"),
    )
    db.session.add(entry)
    db.session.commit()
    return ok({"id": entry.id, "status": entry.verification_status}, status=201)


@time_entries_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_time_entries():
    if not is_enabled("TIMEBANK_ENABLED"):
        return error("disabled", "Timebank disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    user_id_param = request.args.get("user_id", "me")
    if user_id_param == "me" or user_id_param is None:
        user_id = user.id
    else:
        try:
            user_id = int(user_id_param)
        except (TypeError, ValueError):
            return error("validation_error", "user_id must be numeric", status=400)
        if user_id != user.id:
            allowed = ["participant", "organizer", "validator", "case_worker", "relief_moderator", "auditor", "board_member", "partner_admin", "node_admin", "indigenous_council", "platform_admin", "treasury_guardian", "governance_observer", "node_curator"]
            if user.role not in allowed:
                return error("forbidden", "Insufficient permission", status=403)
    entries = TimeEntry.query.filter_by(user_id=user_id).order_by(TimeEntry.occurred_at.desc()).all()
    payload = [{
        "id": e.id,
        "user_id": e.user_id,
        "microcosm_id": e.microcosm_id,
        "guild_id": e.guild_id,
        "activity_type": e.activity_type,
        "hours": e.hours,
        "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
        "verification_status": e.verification_status,
        "proof_ref": e.proof_ref,
    } for e in entries]
    return ok({"entries": payload})


@time_entries_bp.route("/microcosm/<int:microcosm_id>", methods=["GET"])
@alpha_jwt_required()
def microcosm_time_entries(microcosm_id):
    if not is_enabled("TIMEBANK_ENABLED"):
        return error("disabled", "Timebank disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    entries = TimeEntry.query.filter_by(microcosm_id=microcosm_id, verification_status="verified").all()
    totals = {}
    for e in entries:
        totals[e.user_id] = totals.get(e.user_id, 0) + e.hours
    top_users = sorted(totals.items(), key=lambda x: x[1], reverse=True)[:10]
    leaderboard = []
    for uid, hours in top_users:
        u = User.query.get(uid)
        leaderboard.append({"user_id": uid, "pseudonym": u.pseudonym if u else "Member", "hours": hours})
    return ok({"leaderboard": leaderboard, "entry_count": len(entries)})


@time_entries_bp.route("/<int:entry_id>/verify", methods=["POST"])
@require_permission("timebank:verify")
def verify_time_entry(entry_id):
    if not is_enabled("TIMEBANK_ENABLED"):
        return error("disabled", "Timebank disabled", status=403)
    entry = TimeEntry.query.get(entry_id)
    if not entry:
        return error("not_found", "Entry not found", status=404)
    payload = request.get_json() or {}
    status = payload.get("verification_status", "verified")
    if status not in {"verified", "rejected"}:
        return error("validation_error", "verification_status must be verified or rejected", status=400)
    entry.verification_status = status
    db.session.commit()
    return ok({"id": entry.id, "verification_status": entry.verification_status})
