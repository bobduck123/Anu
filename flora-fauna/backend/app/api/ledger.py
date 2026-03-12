from flask import Blueprint, request

from ..models import ImpactLedgerEntry
from ..security.policy import require_permission
from .utils import ok, error


ledger_bp = Blueprint("ledger", __name__, url_prefix="/ledger")


@ledger_bp.route("", methods=["GET"])
@require_permission("ledger:read")
def list_ledger():
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    query = ImpactLedgerEntry.query.order_by(ImpactLedgerEntry.created_at.desc())
    total = query.count()
    entries = query.offset((page - 1) * limit).limit(limit).all()
    data = [{
        "id": e.id,
        "node_id": e.node_id,
        "pool_id": e.pool_id,
        "entry_type": e.entry_type,
        "amount_cents": e.amount_cents,
        "description": e.description,
        "reference_id": e.reference_id,
        "reference_type": e.reference_type,
        "reversal_of": e.reversal_of,
        "created_at": e.created_at.isoformat(),
    } for e in entries]
    return ok({
        "entries": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    })


@ledger_bp.route("/reconciliation", methods=["GET"])
@require_permission("ledger:read")
def reconciliation():
    return ok({"status": "scheduled"})
