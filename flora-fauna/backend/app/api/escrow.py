from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..security.alpha import alpha_jwt_required
from ..services import escrow_service
from ..models import EscrowRecord, db
from .utils import ok, error

escrow_bp = Blueprint("escrow", __name__, url_prefix="/escrow")


@escrow_bp.route("", methods=["GET"])
@require_permission("escrow:read")
def list_escrows():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    escrows = EscrowRecord.query.filter_by(node_id=user.node_id).order_by(
        EscrowRecord.created_at.desc()
    ).limit(50).all()
    return ok({"escrows": [{
        "id": e.id,
        "event_id": e.event_id,
        "organizer_id": e.organizer_id,
        "total_amount_cents": e.total_amount_cents,
        "status": e.status,
        "incident_flag": e.incident_flag,
        "timeout_at": e.timeout_at.isoformat() if e.timeout_at else None,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    } for e in escrows]})


@escrow_bp.route("", methods=["POST"])
@require_permission("escrow:create")
def create_escrow():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    try:
        escrow = escrow_service.create_escrow(
            node_id=user.node_id,
            event_id=int(payload.get("event_id", 0)),
            organizer_id=user.id,
            amount_cents=int(payload.get("amount_cents", 0)),
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": escrow.id, "status": escrow.status}, status=201)


@escrow_bp.route("/<int:escrow_id>/release", methods=["POST"])
@require_permission("escrow:release")
def release_escrow(escrow_id):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    try:
        escrow, settlements = escrow_service.release_escrow(escrow_id, approved_by=user.id)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({
        "id": escrow.id,
        "status": escrow.status,
        "settlements": [{"pool_id": s.pool_id, "amount_cents": s.amount_cents} for s in settlements],
    })


@escrow_bp.route("/<int:escrow_id>/freeze", methods=["POST"])
@require_permission("escrow:freeze")
def freeze_escrow(escrow_id):
    payload = request.get_json() or {}
    incident_id = payload.get("incident_id")
    try:
        escrow = escrow_service.freeze_escrow_for_incident(escrow_id, incident_id)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": escrow.id, "status": escrow.status, "incident_flag": escrow.incident_flag})
