from flask import Blueprint, request

from ..models import FormulaDefinition, FormulaConfig
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.formula_registry_service import activate_formula, resolve_params
from .utils import ok, error


formulas_bp = Blueprint("formulas", __name__, url_prefix="/formulas")


@formulas_bp.route("/", methods=["GET"])
@require_permission("formulas:read")
def list_formulas():
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Formula registry disabled", status=403)
    defs = FormulaDefinition.query.order_by(FormulaDefinition.key.asc(), FormulaDefinition.version.desc()).all()
    payload = [{
        "key": d.key,
        "version": d.version,
        "description": d.description,
        "json_schema": d.json_schema,
        "default_params": d.default_params_json,
        "active": d.active,
    } for d in defs]
    return ok({"definitions": payload})


@formulas_bp.route("/configs", methods=["GET"])
@require_permission("formulas:read")
def list_configs():
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Formula registry disabled", status=403)
    configs = FormulaConfig.query.order_by(FormulaConfig.activated_at.desc()).all()
    payload = [{
        "key": c.key,
        "version": c.version,
        "params": c.params_json,
        "node_id": c.node_id,
        "activated_at": c.activated_at.isoformat() if c.activated_at else None,
    } for c in configs]
    return ok({"configs": payload})


@formulas_bp.route("/activate", methods=["POST"])
@require_permission("formulas:manage")
def activate():
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Formula registry disabled", status=403)
    payload = request.get_json() or {}
    key = payload.get("key")
    version = payload.get("version")
    params = payload.get("params") or {}
    node_id = payload.get("node_id")
    if not key or not version:
        return error("validation_error", "key and version required", status=400)
    user = get_current_user()
    try:
        config = activate_formula(key, int(version), params, actor_id=user.id if user else None, node_id=node_id, notes=payload.get("notes"))
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({
        "key": config.key,
        "version": config.version,
        "node_id": config.node_id,
        "params": config.params_json,
    }, status=201)


@formulas_bp.route("/resolve/<key>", methods=["GET"])
@require_permission("formulas:read")
def resolve(key):
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Formula registry disabled", status=403)
    node_id = request.args.get("node_id")
    params, version = resolve_params(key, node_id=int(node_id) if node_id else None)
    return ok({"key": key, "version": version, "params": params})
