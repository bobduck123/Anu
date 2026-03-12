from datetime import datetime, timedelta

from flask import Blueprint
from sqlalchemy import func

from ..extensions import db
from ..models import TimeEntry, BurnoutScore
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.feature_flag_service import is_enabled
from .utils import ok, error


burnout_monitor_bp = Blueprint("burnout_monitor", __name__, url_prefix="/burnout")


def _compute_score(hours):
    score = min(100.0, hours * 2.0)
    if score >= 80:
        risk = "high"
    elif score >= 50:
        risk = "elevated"
    else:
        risk = "low"
    return score, risk


@burnout_monitor_bp.route("/me", methods=["GET"])
@alpha_jwt_required()
def burnout_me():
    if not is_enabled("BURNOUT_ENABLED"):
        return error("disabled", "Burnout monitoring disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    window_days = 30
    since = datetime.utcnow() - timedelta(days=window_days)
    hours = db.session.query(func.coalesce(func.sum(TimeEntry.hours), 0)).filter(
        TimeEntry.user_id == user.id,
        TimeEntry.occurred_at >= since,
    ).scalar() or 0
    score, risk = _compute_score(hours)
    reasons = {"time_entries_hours": float(hours), "window_days": window_days}
    snap = BurnoutScore(
        user_id=user.id,
        microcosm_id=None,
        score=score,
        window_days=window_days,
        reasons_json=reasons,
    )
    db.session.add(snap)
    db.session.commit()
    return ok({"score": score, "risk": risk, "reasons": reasons})


@burnout_monitor_bp.route("/microcosm/<int:microcosm_id>", methods=["GET"])
@alpha_jwt_required()
def burnout_microcosm(microcosm_id):
    if not is_enabled("BURNOUT_ENABLED"):
        return error("disabled", "Burnout monitoring disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    window_days = 30
    since = datetime.utcnow() - timedelta(days=window_days)
    rows = db.session.query(
        TimeEntry.user_id,
        func.coalesce(func.sum(TimeEntry.hours), 0).label("hours"),
    ).filter(
        TimeEntry.microcosm_id == microcosm_id,
        TimeEntry.occurred_at >= since,
    ).group_by(TimeEntry.user_id).all()
    scores = []
    for row in rows:
        score, risk = _compute_score(row.hours)
        scores.append({"user_id": row.user_id, "score": score, "risk": risk})
    avg_score = sum(s["score"] for s in scores) / len(scores) if scores else 0
    high_risk = sum(1 for s in scores if s["risk"] == "high")
    return ok({
        "microcosm_id": microcosm_id,
        "avg_score": round(avg_score, 2),
        "high_risk_count": high_risk,
        "window_days": window_days,
    })
