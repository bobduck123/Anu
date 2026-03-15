from datetime import datetime, timedelta
from flask import Blueprint, request

from ..models import ImpactPool, ImpactLedgerEntry, ReliefRequest, db
from ..services.node_service import resolve_node
from .utils import ok, error
from ..extensions import limiter


public_bp = Blueprint("public", __name__, url_prefix="/public")


@public_bp.route("/transparency/node-summary", methods=["GET"])
@limiter.limit("100 per hour")
def node_summary():
    node_param = request.args.get("node")
    node = resolve_node(node_param)
    if not node:
        return error("not_found", "Node not found", status=404)
    now = datetime.utcnow()
    since = now - timedelta(days=30)
    entries = ImpactLedgerEntry.query.filter(
        ImpactLedgerEntry.node_id == node.id,
        ImpactLedgerEntry.created_at >= since
    ).all()
    inflows_30d = sum([e.amount_cents for e in entries if e.amount_cents > 0])
    outflows_30d = sum([-e.amount_cents for e in entries if e.amount_cents < 0])
    pools = ImpactPool.query.filter_by(node_id=node.id).all()
    pools_payload = []
    for pool in pools:
        pool_entries = [e for e in entries if e.pool_id == pool.id]
        outflows_pool = sum([-e.amount_cents for e in pool_entries if e.amount_cents < 0])
        balance = db.session.query(db.func.sum(ImpactLedgerEntry.amount_cents)).filter_by(pool_id=pool.id).scalar() or 0
        pools_payload.append({
            "slug": pool.slug,
            "name": pool.name,
            "category": pool.category,
            "target_amount_cents": pool.target_amount_cents,
            "balance": balance,
            "outflows_30d": outflows_pool,
        })
    relief_count = ReliefRequest.query.filter_by(node_id=node.id).count()
    approved = ReliefRequest.query.filter(ReliefRequest.node_id == node.id, ReliefRequest.status.in_(["approved", "approved_under_cap", "disbursed"])).count()
    approval_ratio = (approved / relief_count) if relief_count else 0
    response_windows = ReliefRequest.query.filter(
        ReliefRequest.node_id == node.id,
        ReliefRequest.submitted_at.isnot(None),
        ReliefRequest.updated_at.isnot(None),
    ).with_entities(ReliefRequest.submitted_at, ReliefRequest.updated_at).all()
    response_vals = sorted([
        max(0.0, (updated_at - submitted_at).total_seconds() / 86400.0)
        for submitted_at, updated_at in response_windows
        if submitted_at is not None and updated_at is not None
    ])
    median_response_days = response_vals[len(response_vals)//2] if response_vals else 0
    recent_receipts = (
        ImpactLedgerEntry.query
        .filter(ImpactLedgerEntry.node_id == node.id)
        .order_by(ImpactLedgerEntry.created_at.desc())
        .limit(20)
        .all()
    )
    pool_lookup = {p.id: p for p in pools}
    receipts_payload = [{
        "id": entry.id,
        "pool_slug": pool_lookup.get(entry.pool_id).slug if pool_lookup.get(entry.pool_id) else None,
        "pool_name": pool_lookup.get(entry.pool_id).name if pool_lookup.get(entry.pool_id) else None,
        "entry_type": entry.entry_type,
        "amount_cents": entry.amount_cents,
        "description": entry.description,
        "reference_type": entry.reference_type,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    } for entry in recent_receipts]

    return ok({
        "node": {"slug": node.slug, "name": node.name},
        "totals": {
            "inflows_30d": inflows_30d,
            "outflows_30d": outflows_30d,
            "admin_ratio_30d": 0.0,
        },
        "pools": pools_payload,
        "receipts": receipts_payload,
        "relief_capacity": {
            "monthly_grants_remaining": max(0, 100 - relief_count),
            "avg_processing_days": 3.0,
        },
        "relief_metrics": {
            "approval_ratio": approval_ratio,
            "median_response_days": float(median_response_days),
        },
    })
