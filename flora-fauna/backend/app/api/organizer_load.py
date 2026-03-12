from flask import Blueprint, request

from ..security.policy import get_current_user, require_permission
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..services.organizer_load_service import compute_load_for_user
from ..models import OrganizerLoadSnapshot
from .utils import ok, error


organizer_load_bp = Blueprint("organizer_load", __name__, url_prefix="/organizer-load")


@organizer_load_bp.route("/me", methods=["GET"])
@alpha_jwt_required()
def load_for_me():
    if not is_enabled("organiser_load_index"):
        return error("disabled", "Organiser load index disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    snapshot = compute_load_for_user(user.id)
    return ok({
        "snapshot": {
            "event_count_30d": snapshot.event_count_30d,
            "governance_votes_30d": snapshot.governance_votes_30d,
            "volunteer_hours": snapshot.volunteer_hours,
            "load_score": snapshot.load_score,
            "alert_level": snapshot.alert_level,
            "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
        }
    })


@organizer_load_bp.route("/latest", methods=["GET"])
@require_permission("organizer_load:read")
def load_latest():
    if not is_enabled("organiser_load_index"):
        return error("disabled", "Organiser load index disabled", status=403)
    user_id = request.args.get("user_id")
    if not user_id:
        return error("validation_error", "user_id is required", status=400)
    snapshot = OrganizerLoadSnapshot.query.filter_by(user_id=int(user_id)).order_by(
        OrganizerLoadSnapshot.created_at.desc()
    ).first()
    if not snapshot:
        return ok({"snapshot": None})
    return ok({
        "snapshot": {
            "event_count_30d": snapshot.event_count_30d,
            "governance_votes_30d": snapshot.governance_votes_30d,
            "volunteer_hours": snapshot.volunteer_hours,
            "load_score": snapshot.load_score,
            "alert_level": snapshot.alert_level,
            "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
        }
    })
