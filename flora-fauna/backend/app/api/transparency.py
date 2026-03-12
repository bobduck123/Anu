from flask import Blueprint, request

from ..models import TransparencyVisibilityConfig, ImpactPool, ImpactLedgerEntry, Certification, Incident, db, AuditRecord
from ..services.node_service import resolve_node
from ..services.feature_flag_service import is_enabled
from ..security.policy import require_permission, get_current_user
from .utils import ok, error


transparency_bp = Blueprint("transparency", __name__, url_prefix="/transparency")


@transparency_bp.route("/config", methods=["GET"])
@require_permission("transparency:manage")
def get_config():
    node_id = int(request.args.get("node_id", 1))
    config = TransparencyVisibilityConfig.query.filter_by(node_id=node_id).first()
    if not config:
        config = TransparencyVisibilityConfig(node_id=node_id)
        db.session.add(config)
        db.session.commit()
    return ok({
        "node_id": node_id,
        "show_balances": config.show_balances,
        "show_allocation_breakdown": config.show_allocation_breakdown,
        "show_vote_summary": config.show_vote_summary,
        "show_cert_counts": config.show_cert_counts,
        "show_incident_summary": config.show_incident_summary,
    })


@transparency_bp.route("/config", methods=["POST"])
@require_permission("transparency:manage")
def update_config():
    if not is_enabled("transparency_portal"):
        return error("feature_disabled", "Feature 'transparency_portal' disabled", status=403)
    payload = request.get_json() or {}
    node_id = int(payload.get("node_id", 1))
    config = TransparencyVisibilityConfig.query.filter_by(node_id=node_id).first()
    if not config:
        config = TransparencyVisibilityConfig(node_id=node_id)
        db.session.add(config)
    for key in ["show_balances", "show_allocation_breakdown", "show_vote_summary", "show_cert_counts", "show_incident_summary"]:
        if key in payload:
            setattr(config, key, bool(payload.get(key)))
    user = get_current_user()
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="transparency_visibility_updated",
        entity_type="transparency_config",
        entity_id=str(node_id),
        payload=payload,
    ))
    db.session.commit()
    return ok({"updated": True})


@transparency_bp.route("/public", methods=["GET"])
def public_transparency():
    if not is_enabled("transparency_portal"):
        return error("feature_disabled", "Feature 'transparency_portal' disabled", status=403)
    node_param = request.args.get("node")
    node = resolve_node(node_param)
    if not node:
        return error("not_found", "Node not found", status=404)

    config = TransparencyVisibilityConfig.query.filter_by(node_id=node.id).first()
    if not config:
        config = TransparencyVisibilityConfig(node_id=node.id)
        db.session.add(config)
        db.session.commit()

    pools = ImpactPool.query.filter_by(node_id=node.id).all()
    pool_data = []
    for pool in pools:
        balance = db.session.query(db.func.sum(ImpactLedgerEntry.amount_cents)).filter_by(pool_id=pool.id).scalar() or 0
        pool_data.append({
            "slug": pool.slug,
            "name": pool.name,
            "category": pool.category,
            "target_amount_cents": pool.target_amount_cents,
            "balance": balance if config.show_balances else None,
        })

    total_balance = sum([p["balance"] or 0 for p in pool_data]) or 1
    allocation_breakdown = [
        {"slug": p["slug"], "ratio": ((p["balance"] or 0) / total_balance) * 100}
        for p in pool_data
    ] if config.show_allocation_breakdown else []

    cert_count = Certification.query.filter(Certification.status == "active").count() if config.show_cert_counts else None
    incident_count = Incident.query.count() if config.show_incident_summary else None

    # Ledger receipts (privacy-safe, last 25)
    receipts = (
        ImpactLedgerEntry.query
        .filter_by(node_id=node.id)
        .order_by(ImpactLedgerEntry.created_at.desc())
        .limit(25)
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
        "reference_id": entry.reference_id,
        "reference_type": entry.reference_type,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    } for entry in receipts]

    return ok({
        "node": {"slug": node.slug, "name": node.name},
        "pools": pool_data,
        "allocation_breakdown": allocation_breakdown,
        "certification_count": cert_count,
        "incident_summary": incident_count,
        "receipts": receipts_payload,
    })
