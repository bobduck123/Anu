from flask import Blueprint, request

from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.sovereignty_index_service import compute_index, get_visibility_config, set_visibility
from ..models import SovereigntyIndex, AuditRecord
from ..extensions import db
from .utils import ok, error


sovereignty_bp = Blueprint("sovereignty_index", __name__, url_prefix="/sovereignty-index")


@sovereignty_bp.route("/compute", methods=["POST"])
@require_permission("sovereignty_index:manage")
def compute_sovereignty_index():
    if not is_enabled("sovereignty_index"):
        return error("disabled", "Sovereignty index disabled", status=403)
    user = get_current_user()
    node_id = (request.get_json() or {}).get("node_id") or (user.node_id if user else None) or 1
    record = compute_index(node_id=node_id)
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="sovereignty_index_computed",
        entity_type="sovereignty_index",
        entity_id=str(record.id),
    ))
    db.session.commit()
    return ok({
        "id": record.id,
        "node_id": record.node_id,
        "index_value": record.index_value,
        "formula_version": record.formula_version,
        "components": record.components_json or {},
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }, status=201)


@sovereignty_bp.route("/latest", methods=["GET"])
@require_permission("sovereignty_index:read")
def latest_index():
    if not is_enabled("sovereignty_index"):
        return error("disabled", "Sovereignty index disabled", status=403)
    node_id = request.args.get("node_id")
    query = SovereigntyIndex.query
    if node_id:
        query = query.filter_by(node_id=int(node_id))
    record = query.order_by(SovereigntyIndex.created_at.desc()).first()
    if not record:
        return ok({"index": None})
    return ok({
        "index": {
            "id": record.id,
            "node_id": record.node_id,
            "index_value": record.index_value,
            "formula_version": record.formula_version,
            "components": record.components_json or {},
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }
    })


@sovereignty_bp.route("/visibility", methods=["GET", "POST"])
@require_permission("sovereignty_index:manage")
def visibility():
    if not is_enabled("sovereignty_index"):
        return error("disabled", "Sovereignty index disabled", status=403)
    user = get_current_user()
    if request.method == "GET":
        config = get_visibility_config(user.node_id if user else 1)
        return ok({"public_visible": config.public_visible})
    payload = request.get_json() or {}
    config = set_visibility(user.node_id if user else 1, payload.get("public_visible"))
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="sovereignty_index_visibility_updated",
        entity_type="sovereignty_index_config",
        entity_id=str(config.id),
        payload={"public_visible": config.public_visible},
    ))
    db.session.commit()
    return ok({"public_visible": config.public_visible})


@sovereignty_bp.route("/public", methods=["GET"])
def public_index():
    if not is_enabled("sovereignty_index"):
        return error("disabled", "Sovereignty index disabled", status=403)
    node_id = request.args.get("node_id")
    query = SovereigntyIndex.query
    if node_id:
        query = query.filter_by(node_id=int(node_id))
    record = query.order_by(SovereigntyIndex.created_at.desc()).first()
    if not record:
        return ok({"index": None})
    config = get_visibility_config(record.node_id)
    if not config.public_visible:
        return error("private", "Index is private", status=403)
    return ok({
        "index": {
            "node_id": record.node_id,
            "index_value": record.index_value,
            "formula_version": record.formula_version,
            "components": record.components_json or {},
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }
    })
