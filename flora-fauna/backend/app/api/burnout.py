from flask import Blueprint, request

from ..models import OrganiserBurnoutSnapshot
from ..security.policy import get_current_user, require_permission, PERMISSIONS
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..services.burnout_index_service import compute_burnout
from .utils import ok, error


burnout_bp = Blueprint("burnout", __name__, url_prefix="/burnout-index")


@burnout_bp.route("/me", methods=["GET"])
@alpha_jwt_required()
def my_burnout():
    if not is_enabled("OIL_BURNOUT_INDEX"):
        return error("disabled", "Burnout index disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    snap = OrganiserBurnoutSnapshot.query.filter_by(user_id=user.id).order_by(
        OrganiserBurnoutSnapshot.created_at.desc()
    ).first()
    if not snap:
        return ok({"snapshot": None})
    return ok({"snapshot": {
        "load_score": snap.load_score,
        "burnout_risk": snap.burnout_risk,
        "formula_version": snap.formula_version,
        "created_at": snap.created_at.isoformat() if snap.created_at else None,
    }})


@burnout_bp.route("/recalculate", methods=["POST"])
@alpha_jwt_required()
def recalc_burnout():
    if not is_enabled("OIL_BURNOUT_INDEX"):
        return error("disabled", "Burnout index disabled", status=403)
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
    snap = compute_burnout(user_id, node_id, actor_id=user.id)
    return ok({"snapshot_id": snap.id}, status=201)
