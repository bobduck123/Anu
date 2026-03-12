from flask import Blueprint, request

from ..services.feature_flag_service import is_enabled
from ..services.metrics_registry_service import list_metrics
from ..security.policy import require_permission
from .utils import ok, error


metrics_bp = Blueprint("metrics_registry", __name__, url_prefix="/metrics-registry")


@metrics_bp.route("/", methods=["GET"])
@require_permission("formulas:read")
def list_metric_definitions():
    if not is_enabled("OIL_FORMULA_REGISTRY"):
        return error("disabled", "Registry disabled", status=403)
    metrics = list_metrics()
    payload = [{
        "key": m.key,
        "version": m.version,
        "description": m.description,
        "required_event_types": m.required_event_types,
        "param_schema": m.param_schema,
        "output_units": m.output_units,
        "confidence_method": m.confidence_method,
        "audit_behavior": m.audit_behavior,
    } for m in metrics]
    return ok({"metrics": payload})
