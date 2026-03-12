from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..security.alpha import alpha_jwt_required
from ..models import Vendor, db
from .utils import ok, error

vendors_bp = Blueprint("vendors", __name__, url_prefix="/vendors")


@vendors_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_vendors():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    vendors = Vendor.query.filter_by(node_id=user.node_id).all()
    return ok({"vendors": [{
        "id": v.id,
        "name": v.name,
        "maturity_score": v.maturity_score,
        "certification_complete": v.certification_complete,
        "grant_eligible": v.grant_eligible,
        "equipment_access": v.equipment_access,
        "total_revenue_cents": v.total_revenue_cents,
        "status": v.status,
    } for v in vendors]})


@vendors_bp.route("", methods=["POST"])
@require_permission("vendors:manage")
def create_vendor():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    vendor = Vendor(
        node_id=user.node_id,
        user_id=payload.get("user_id"),
        name=payload.get("name", ""),
        status="active",
    )
    db.session.add(vendor)
    db.session.commit()
    return ok({"id": vendor.id}, status=201)
