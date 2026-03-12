from flask import Blueprint, request

from ..services.feature_flag_service import is_enabled
from ..services.model_registry_service import list_models, activate_model, promote_model_stability
from ..services.backtesting_service import backtest_predictions
from ..services.calibration_report_service import calibration_report
from ..security.policy import require_permission, get_current_user
from .utils import ok, error


models_bp = Blueprint("model_registry", __name__, url_prefix="/model-registry")


@models_bp.route("/", methods=["GET"])
@require_permission("formulas:read")
def list_model_definitions():
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Registry disabled", status=403)
    models = list_models()
    payload = [{
        "key": m.key,
        "version": m.version,
        "description": m.description,
        "param_schema": m.param_schema,
        "required_inputs": m.required_inputs,
        "min_sample_size": m.min_sample_size,
        "output_units": m.output_units,
        "confidence_method": m.confidence_method,
        "uncertainty_format": m.uncertainty_format,
        "convexity_property": m.convexity_property,
        "fallback_mode": m.fallback_mode,
        "complexity_bound": m.complexity_bound,
        "update_policy": m.update_policy,
        "requires_backtest": m.requires_backtest,
        "requires_calibration": m.requires_calibration,
        "cooling_period_days": m.cooling_period_days,
    } for m in models]
    return ok({"models": payload})


@models_bp.route("/activate", methods=["POST"])
@require_permission("formulas:manage")
def activate():
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Registry disabled", status=403)
    payload = request.get_json() or {}
    key = payload.get("key")
    version = payload.get("version")
    params = payload.get("params") or {}
    node_id = payload.get("node_id")
    preds = payload.get("backtest_preds") or []
    labels = payload.get("backtest_labels") or []
    backtest_report = backtest_predictions(preds, labels) if preds and labels else None
    calibration = calibration_report(preds, labels) if preds and labels else None
    user = get_current_user()
    try:
        config = activate_model(
            key=key,
            version=int(version),
            params=params,
            actor_id=user.id if user else None,
            node_id=node_id,
            notes=payload.get("notes"),
            backtest_report=backtest_report,
            calibration_report=calibration,
        )
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({
        "key": config.key,
        "version": config.version,
        "cooling_until": config.cooling_until.isoformat() if config.cooling_until else None,
    }, status=201)


@models_bp.route("/promote-stable/<int:config_id>", methods=["POST"])
@require_permission("formulas:manage")
def promote_stable(config_id):
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Registry disabled", status=403)
    user = get_current_user()
    try:
        config = promote_model_stability(config_id, actor_id=user.id if user else None)
    except ValueError as exc:
        return error("validation_error", str(exc), status=400)
    return ok({"id": config.id, "is_stable": config.is_stable})
