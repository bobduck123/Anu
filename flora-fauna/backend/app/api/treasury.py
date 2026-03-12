from datetime import datetime

from flask import Blueprint, request

from ..extensions import db
from ..models import ImpactPool, ImpactLedgerEntry, PoolPolicy, AuditRecord
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.ledger_service import pool_balance
from .utils import ok, error


treasury_bp = Blueprint("treasury", __name__, url_prefix="/treasury")


@treasury_bp.route("/pools", methods=["GET"])
@alpha_jwt_required()
def list_treasury_pools():
    if not is_enabled("RISK_POOLS_ENABLED"):
        return error("disabled", "Risk pools disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    pools = ImpactPool.query.filter_by(node_id=user.node_id).order_by(ImpactPool.created_at.desc()).all()
    policies = {p.pool_id: p for p in PoolPolicy.query.filter(PoolPolicy.pool_id.in_([p.id for p in pools])).all()}
    payload = []
    for pool in pools:
        policy = policies.get(pool.id)
        payload.append({
            "id": pool.id,
            "slug": pool.slug,
            "name": pool.name,
            "category": pool.category,
            "target_amount_cents": pool.target_amount_cents,
            "balance_cents": pool_balance(pool.node_id, pool.id),
            "policy": {
                "max_draw_per_event": policy.max_draw_per_event,
                "min_floor": policy.min_floor,
                "allowed_event_types": policy.allowed_event_types,
            } if policy else None,
        })
    return ok({"pools": payload})


@treasury_bp.route("/pools/<int:pool_id>/draw", methods=["POST"])
@alpha_jwt_required()
def draw_from_pool(pool_id):
    if not is_enabled("RISK_POOLS_ENABLED"):
        return error("disabled", "Risk pools disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    if user.role not in ["board_member", "node_admin", "platform_admin", "treasury_guardian"]:
        return error("forbidden", "Insufficient permission", status=403)
    pool = ImpactPool.query.get(pool_id)
    if not pool or pool.node_id != user.node_id:
        return error("not_found", "Pool not found", status=404)
    payload = request.get_json() or {}
    try:
        amount_cents = int(payload.get("amount_cents", 0))
    except (TypeError, ValueError):
        return error("validation_error", "amount_cents must be numeric", status=400)
    if amount_cents <= 0:
        return error("validation_error", "amount_cents must be > 0", status=400)
    event_type = payload.get("event_type")
    policy = PoolPolicy.query.filter_by(pool_id=pool.id).first()
    if policy:
        if amount_cents > policy.max_draw_per_event:
            return error("forbidden", "amount exceeds max_draw_per_event", status=403)
        if policy.allowed_event_types and event_type not in policy.allowed_event_types:
            return error("forbidden", "event_type not allowed", status=403)
        current_balance = pool_balance(pool.node_id, pool.id)
        if current_balance - amount_cents < policy.min_floor:
            return error("forbidden", "draw would breach min_floor", status=403)
    entry = ImpactLedgerEntry(
        node_id=pool.node_id,
        pool_id=pool.id,
        entry_type="debit",
        amount_cents=-amount_cents,
        description=payload.get("description") or "Risk pool draw",
        reference_id=payload.get("reference_id"),
        reference_type=payload.get("reference_type") or "risk_draw",
        created_by=user.id,
    )
    db.session.add(entry)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="risk_pool_draw",
        entity_type="impact_pool",
        entity_id=str(pool.id),
        payload={"amount_cents": amount_cents, "event_type": event_type},
    ))
    db.session.commit()
    return ok({"entry_id": entry.id})
