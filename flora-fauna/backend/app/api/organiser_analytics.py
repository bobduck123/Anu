from flask import Blueprint, request

from ..models import OrganiserPerformanceSnapshot
from ..security.policy import get_current_user, require_permission, PERMISSIONS
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..services.organiser_analytics_service import compute_snapshot
from .utils import ok, error


analytics_bp = Blueprint("organiser_analytics", __name__, url_prefix="/organiser-analytics")


@analytics_bp.route("/me", methods=["GET"])
@alpha_jwt_required()
def my_snapshot():
    if not is_enabled("OIL_ORGANISER_ANALYTICS"):
        return error("disabled", "Organiser analytics disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    snapshot = OrganiserPerformanceSnapshot.query.filter_by(user_id=user.id).order_by(
        OrganiserPerformanceSnapshot.created_at.desc()
    ).first()
    if snapshot:
        from ..models import AuditRecord
        from ..extensions import db
        db.session.add(AuditRecord(
            actor_id=user.id,
            action="organiser_analytics_view",
            entity_type="organiser_performance_snapshot",
            entity_id=str(snapshot.id),
        ))
        db.session.commit()
    if not snapshot:
        return ok({"snapshot": None})
    return ok({"snapshot": {
        "period_start": snapshot.period_start.isoformat(),
        "period_end": snapshot.period_end.isoformat(),
        "events_created": snapshot.events_created,
        "events_completed": snapshot.events_completed,
        "completion_rate": snapshot.completion_rate,
        "attendance_avg": snapshot.attendance_avg,
        "incident_count": snapshot.incident_count,
        "compliance_checklist_pass_rate": snapshot.compliance_checklist_pass_rate,
        "formula_version": snapshot.formula_version,
    }})


@analytics_bp.route("/recalculate", methods=["POST"])
@alpha_jwt_required()
def recalc():
    if not is_enabled("OIL_ORGANISER_ANALYTICS"):
        return error("disabled", "Organiser analytics disabled", status=403)
    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    node_id = payload.get("node_id")
    if not user_id or not node_id:
        return error("validation_error", "user_id and node_id required", status=400)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    allowed_roles = PERMISSIONS.get("organiser_analytics:manage", [])
    if user.role not in allowed_roles and int(user_id) != user.id:
        return error("forbidden", "Insufficient permission", status=403)
    snapshot = compute_snapshot(user_id=user_id, node_id=node_id, actor_id=user.id)
    return ok({"snapshot_id": snapshot.id}, status=201)
