from datetime import datetime, timedelta
from flask import Blueprint

from ..models import ImpactPool, ImpactLedgerEntry, db
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.node_service import resolve_node
from ..services.ledger_service import pool_balance
from .utils import ok, error


pools_bp = Blueprint("pools", __name__, url_prefix="/pools")


@pools_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_pools():
    user = get_current_user()
    node = resolve_node(user.node_id) if user else resolve_node(None)
    if not node:
        return ok([])
    pools = ImpactPool.query.filter_by(node_id=node.id).all()
    data = []
    for pool in pools:
        balance = pool_balance(node.id, pool.id)
        data.append({
            "id": pool.id,
            "slug": pool.slug,
            "name": pool.name,
            "description": pool.description,
            "category": pool.category,
            "target_amount_cents": pool.target_amount_cents,
            "current_balance_cents": balance,
            "is_active": pool.is_active,
        })
    return ok(data)


@pools_bp.route("/<int:pool_id>/dashboard", methods=["GET"])
@alpha_jwt_required()
def pool_dashboard(pool_id):
    user = get_current_user()
    node = resolve_node(user.node_id) if user else resolve_node(None)
    if not node:
        return error("not_found", "Pool not found", status=404)
    pool = ImpactPool.query.get(pool_id)
    if not pool or pool.node_id != node.id:
        return error("not_found", "Pool not found", status=404)
    now = datetime.utcnow()
    since = now - timedelta(days=30)
    entries = ImpactLedgerEntry.query.filter(
        ImpactLedgerEntry.pool_id == pool.id,
        ImpactLedgerEntry.created_at >= since
    ).all()
    inflows = sum([e.amount_cents for e in entries if e.amount_cents > 0])
    outflows = sum([-e.amount_cents for e in entries if e.amount_cents < 0])
    return ok({
        "pool": {
            "id": pool.id,
            "slug": pool.slug,
            "name": pool.name,
            "description": pool.description,
            "category": pool.category,
            "target_amount_cents": pool.target_amount_cents,
            "current_balance_cents": pool_balance(node.id, pool.id),
        },
        "last_30d": {
            "inflows": inflows,
            "outflows": outflows,
        }
    })
