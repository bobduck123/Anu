from flask import Blueprint, request

from ..models import AllocationRequest, ImpactPool, db
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services.systemic_mode_service import get_system_state, MODE_BLACK_SWAN
from ..services.emergency_allocation_service import compute_emergency_allocation
from .utils import ok, error


allocations_bp = Blueprint("allocations", __name__, url_prefix="/allocations")


@allocations_bp.route("/requests", methods=["POST"])
@alpha_jwt_required()
def create_allocation():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json(silent=True) or {}
    pool_id = payload.get("pool_id")
    amount_cents = payload.get("amount_cents")
    if not pool_id or amount_cents is None:
        return error("validation_error", "pool_id and amount_cents required", status=400)
    try:
        amount_cents = int(amount_cents)
    except (TypeError, ValueError):
        return error("validation_error", "amount_cents must be numeric", status=400)
    if amount_cents <= 0:
        return error("validation_error", "amount_cents must be positive", status=400)
    pool = ImpactPool.query.get(pool_id)
    if not pool:
        return error("not_found", "Pool not found", status=404)
    allocation = AllocationRequest(
        node_id=pool.node_id,
        pool_id=pool.id,
        amount_cents=amount_cents,
        status="pending",
    )
    db.session.add(allocation)
    db.session.commit()
    return ok({"request_id": allocation.id, "status": allocation.status}, status=201)


@allocations_bp.route("/approvals", methods=["POST"])
@require_permission("pools:manage")
def approve_allocation():
    payload = request.get_json(silent=True) or {}
    request_id = payload.get("request_id")
    decision = (payload.get("decision") or "approved").lower()
    if not request_id:
        return error("validation_error", "request_id required", status=400)
    allocation = AllocationRequest.query.get(request_id)
    if not allocation:
        return error("not_found", "Allocation request not found", status=404)
    # Black Swan: enforce deterministic allocation rule
    try:
        state = get_system_state(allocation.node_id)
        if state.current_mode == MODE_BLACK_SWAN:
            plan = compute_emergency_allocation(allocation.node_id)
            return error("restricted", "Allocations restricted in Black Swan mode", status=403, details={"emergency_allocation": plan})
    except Exception:
        pass
    if decision not in ("approved", "rejected"):
        return error("validation_error", "decision must be approved or rejected", status=400)
    allocation.status = decision
    db.session.commit()
    return ok({"request_id": allocation.id, "status": allocation.status})
