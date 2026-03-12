from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..services import crisis_service
from .utils import ok, error

crisis_bp = Blueprint("crisis", __name__, url_prefix="/crisis")


@crisis_bp.route("/status", methods=["GET"])
@require_permission("crisis:read")
def crisis_status():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    crisis = crisis_service.get_crisis_state(user.node_id)
    return ok({
        "is_active": crisis.is_active,
        "read_only": crisis.read_only,
        "event_submission_frozen": crisis.event_submission_frozen,
        "escrow_frozen": crisis.escrow_frozen,
        "high_risk_blocked": crisis.high_risk_blocked,
        "activated_at": crisis.activated_at.isoformat() if crisis.activated_at else None,
        "reason": crisis.reason,
    })


@crisis_bp.route("/activate", methods=["POST"])
@require_permission("crisis:manage")
def activate_crisis():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    crisis = crisis_service.activate_crisis(
        node_id=user.node_id,
        activated_by=user.id,
        reason=payload.get("reason"),
        read_only=payload.get("read_only", True),
        event_freeze=payload.get("event_freeze", True),
        escrow_freeze=payload.get("escrow_freeze", True),
        high_risk_block=payload.get("high_risk_block", True),
    )
    return ok({
        "is_active": crisis.is_active,
        "activated_at": crisis.activated_at.isoformat() if crisis.activated_at else None,
    })


@crisis_bp.route("/deactivate", methods=["POST"])
@require_permission("crisis:manage")
def deactivate_crisis():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    crisis = crisis_service.deactivate_crisis(
        node_id=user.node_id,
        deactivated_by=user.id,
        reason=payload.get("reason"),
    )
    return ok({"is_active": crisis.is_active})
