from flask import Blueprint, request
from sqlalchemy import func
from .utils import ok, error
from ..models import ImpactCreditTx, User, AuditRecord, db
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services import credit_engine_service
from ..services.feature_flag_service import is_enabled


credits_bp = Blueprint("credits", __name__, url_prefix="/credits")


@credits_bp.route("/balance", methods=["GET"])
@alpha_jwt_required()
def credits_balance():
    user = get_current_user()
    if not user:
        return ok({"balance": 0, "earned": 0, "spent": 0})
    earned = ImpactCreditTx.query.filter_by(user_id=user.id, tx_type="earn").with_entities(
        func.coalesce(func.sum(ImpactCreditTx.amount), 0)
    ).scalar() or 0
    spent = ImpactCreditTx.query.filter_by(user_id=user.id, tx_type="spend").with_entities(
        func.coalesce(func.sum(ImpactCreditTx.amount), 0)
    ).scalar() or 0
    return ok({
        "balance": int(earned - spent),
        "earned": int(earned),
        "spent": int(spent),
    })


@credits_bp.route("/history", methods=["GET"])
@alpha_jwt_required()
def credits_history():
    user = get_current_user()
    if not user:
        return ok({"transactions": []})
    limit = int(request.args.get("limit", 50))
    if limit > 100:
        limit = 100
    txs = ImpactCreditTx.query.filter_by(user_id=user.id).order_by(ImpactCreditTx.created_at.desc()).limit(limit).all()
    payload = [{
        "id": tx.id,
        "tx_type": tx.tx_type,
        "amount": tx.amount,
        "description": tx.description,
        "reference_id": tx.reference_id,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    } for tx in txs]
    return ok({"transactions": payload})


@credits_bp.route("/summary", methods=["GET"])
@alpha_jwt_required()
def credits_summary():
    if not is_enabled("civic_credit_engine"):
        return error("feature_disabled", "Feature 'civic_credit_engine' disabled", status=403)
    user = get_current_user()
    if not user:
        return ok({"summary": {}})
    summary = credit_engine_service.compute_summary(user.id)
    return ok({"summary": summary})


@credits_bp.route("/recalculate", methods=["POST"])
@alpha_jwt_required()
def credits_recalculate():
    if not is_enabled("influence_decay"):
        return error("feature_disabled", "Feature 'influence_decay' disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    tx = credit_engine_service.apply_decay(user.id, user.node_id or 1)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="credit_decay_recalculated",
        entity_type="credit_decay",
        entity_id=str(user.id),
    ))
    db.session.commit()
    return ok({"decay_applied": bool(tx), "tx_id": tx.id if tx else None})
