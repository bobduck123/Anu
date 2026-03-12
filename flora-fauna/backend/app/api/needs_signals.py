from flask import Blueprint, request

from ..models import NeedsSignal
from ..security.policy import get_current_user, require_permission
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..services.needs_signal_service import generate_signals
from .utils import ok, error


needs_bp = Blueprint("needs_signals", __name__, url_prefix="/needs-signals")


@needs_bp.route("/", methods=["GET"])
@alpha_jwt_required()
def list_signals():
    if not is_enabled("OIL_NEEDS_SIGNALS"):
        return error("disabled", "Needs signals disabled", status=403)
    user = get_current_user()
    node_id = user.node_id if user else 1
    signals = NeedsSignal.query.filter_by(node_id=node_id).order_by(NeedsSignal.created_at.desc()).limit(50).all()
    payload = [{
        "id": s.id,
        "severity_0_100": s.severity_0_100,
        "reason_codes": s.reason_codes_json or [],
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "visible_level": s.visible_level,
    } for s in signals]
    return ok({"signals": payload})


@needs_bp.route("/generate", methods=["POST"])
@require_permission("needs:manage")
def generate():
    if not is_enabled("OIL_NEEDS_SIGNALS"):
        return error("disabled", "Needs signals disabled", status=403)
    user = get_current_user()
    node_id = (request.get_json() or {}).get("node_id") or (user.node_id if user else None) or 1
    signals = generate_signals(node_id, actor_id=user.id if user else None)
    return ok({"count": len(signals)}, status=201)
