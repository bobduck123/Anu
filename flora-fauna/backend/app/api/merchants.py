from datetime import datetime

from flask import Blueprint, request, g
from sqlalchemy import func

from ..extensions import db
from ..models import Merchant, MerchantTransaction
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from ..services.feature_flag_service import is_enabled
from .utils import ok, error


merchants_bp = Blueprint("merchants", __name__, url_prefix="/merchants")


def _merchant_metrics(merchant_id, node_id=None):
    q = MerchantTransaction.query.filter_by(merchant_id=merchant_id)
    if node_id:
        q = q.filter_by(node_id=node_id)
    txns = q.all()
    txn_count = len(txns)
    disputes = sum(1 for t in txns if t.dispute_flag)
    dispute_rate = (disputes / txn_count) if txn_count else 0
    reliability_score = max(0.0, (1 - dispute_rate) * 100)
    return {
        "txn_count": txn_count,
        "dispute_rate": round(dispute_rate, 4),
        "reliability_score": round(reliability_score, 2),
    }


@merchants_bp.route("", methods=["GET"])
def list_merchants():
    if not is_enabled("MERCHANTS_ENABLED"):
        return error("disabled", "Merchants disabled", status=403)
    q = Merchant.query
    if g.get("node_id"):
        q = q.filter_by(node_id=g.node_id)
    items = q.order_by(Merchant.created_at.desc()).all()
    return ok({"merchants": [{
        "id": m.id,
        "name": m.name,
        "domain": m.domain,
        "website": m.website,
        "location_text": m.location_text,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "metrics": _merchant_metrics(m.id, g.get("node_id")),
    } for m in items]})


@merchants_bp.route("/<int:merchant_id>", methods=["GET"])
def get_merchant(merchant_id):
    if not is_enabled("MERCHANTS_ENABLED"):
        return error("disabled", "Merchants disabled", status=403)
    merchant = Merchant.query.get(merchant_id)
    if not merchant or (g.get("node_id") and merchant.node_id != g.node_id):
        return error("not_found", "Merchant not found", status=404)
    q = MerchantTransaction.query.filter_by(merchant_id=merchant_id)
    if g.get("node_id"):
        q = q.filter_by(node_id=g.node_id)
    txns = q.order_by(MerchantTransaction.occurred_at.desc()).limit(50).all()
    return ok({
        "merchant": {
            "id": merchant.id,
            "name": merchant.name,
            "domain": merchant.domain,
            "website": merchant.website,
            "location_text": merchant.location_text,
            "created_at": merchant.created_at.isoformat() if merchant.created_at else None,
        },
        "metrics": _merchant_metrics(merchant.id, g.get("node_id")),
        "transactions": [{
            "id": t.id,
            "microcosm_id": t.microcosm_id,
            "amount": t.amount,
            "occurred_at": t.occurred_at.isoformat() if t.occurred_at else None,
            "receipt_ref": t.receipt_ref,
            "dispute_flag": t.dispute_flag,
        } for t in txns],
    })


@merchants_bp.route("/<int:merchant_id>/transactions", methods=["POST"])
@alpha_jwt_required()
def add_transaction(merchant_id):
    if not is_enabled("MERCHANTS_ENABLED"):
        return error("disabled", "Merchants disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    merchant = Merchant.query.get(merchant_id)
    if not merchant or (g.get("node_id") and merchant.node_id != g.node_id):
        return error("not_found", "Merchant not found", status=404)
    payload = request.get_json() or {}
    try:
        amount = float(payload.get("amount", 0))
    except (TypeError, ValueError):
        return error("validation_error", "amount must be numeric", status=400)
    if amount <= 0:
        return error("validation_error", "amount must be > 0", status=400)
    occurred_at_raw = payload.get("occurred_at")
    try:
        occurred_at = datetime.fromisoformat(occurred_at_raw) if occurred_at_raw else datetime.utcnow()
    except ValueError:
        return error("validation_error", "occurred_at must be ISO format", status=400)
    tx = MerchantTransaction(
        node_id=user.node_id,
        merchant_id=merchant_id,
        microcosm_id=payload.get("microcosm_id"),
        amount=amount,
        occurred_at=occurred_at,
        receipt_ref=payload.get("receipt_ref"),
        dispute_flag=bool(payload.get("dispute_flag", False)),
    )
    db.session.add(tx)
    db.session.commit()
    return ok({"id": tx.id}, status=201)
