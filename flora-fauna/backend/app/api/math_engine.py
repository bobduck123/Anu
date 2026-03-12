from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..services.trust_model_service import compute_trust_posterior
from ..services.hazard_risk_service import compute_event_hazard
from ..services.math.treasury_monte_carlo import simulate_balances, cvar
from ..services.math.allocation_optimizer import optimize_allocations
from ..services.math.change_point_detector import bayesian_change_point
from ..services.math.assignment_optimizer import assignment_optimizer
from ..services.math.anti_capture_metrics import hhi, gini
from ..services.math.dp_aggregator import dp_sum
from ..services.dp_service import consume_epsilon
from ..services.math.volatility_model import phased_volatility
from ..services.model_registry_service import resolve_model_params, log_model_run
from .utils import ok, error


math_bp = Blueprint("math_engine", __name__, url_prefix="/math")


@math_bp.route("/trust-posterior", methods=["GET"])
@require_permission("formulas:read")
def trust_posterior():
    user_id = request.args.get("user_id")
    if not user_id:
        return error("validation_error", "user_id required", status=400)
    result = compute_trust_posterior(int(user_id))
    return ok(result)


@math_bp.route("/hazard-risk", methods=["GET"])
@require_permission("formulas:read")
def hazard_risk():
    event_id = request.args.get("event_id")
    if not event_id:
        return error("validation_error", "event_id required", status=400)
    prob = compute_event_hazard(int(event_id))
    return ok({"probability": prob})


@math_bp.route("/treasury-simulate", methods=["POST"])
@require_permission("formulas:read")
def treasury_sim():
    payload = request.get_json() or {}
    sims = simulate_balances(
        initial=float(payload.get("initial", 0)),
        monthly_net=float(payload.get("monthly_net", 0)),
        months=int(payload.get("months", 12)),
        trials=int(payload.get("trials", 500)),
        seed=int(payload.get("seed", 42)),
    )
    tail = [path[-1] for path in sims if path]
    return ok({"cvar_95": cvar(tail, 0.95)})


@math_bp.route("/allocation-optimize", methods=["POST"])
@require_permission("formulas:read")
def allocation_optimize():
    payload = request.get_json() or {}
    targets = payload.get("targets") or {}
    constraints = payload.get("constraints") or {}
    result = optimize_allocations(targets, constraints)
    return ok({"allocation": result})


@math_bp.route("/change-point", methods=["POST"])
@require_permission("formulas:read")
def change_point():
    payload = request.get_json() or {}
    series = payload.get("series") or []
    result = bayesian_change_point(series, hazard=float(payload.get("hazard", 0.05)))
    return ok(result)


@math_bp.route("/assignment-optimize", methods=["POST"])
@require_permission("formulas:read")
def assignment_optimize():
    payload = request.get_json() or {}
    scores = payload.get("scores") or []
    capacity = payload.get("capacity") or {}
    result = assignment_optimizer(scores, capacity)
    return ok({"assignments": result})


@math_bp.route("/anti-capture", methods=["POST"])
@require_permission("formulas:read")
def anti_capture():
    payload = request.get_json() or {}
    shares = payload.get("shares") or []
    values = payload.get("values") or []
    return ok({"hhi": hhi(shares), "gini": gini(values)})


@math_bp.route("/dp-sum", methods=["POST"])
@require_permission("formulas:read")
def dp_sum_endpoint():
    payload = request.get_json() or {}
    value = float(payload.get("value", 0))
    epsilon = float(payload.get("epsilon", 1.0))
    sensitivity = float(payload.get("sensitivity", 1.0))
    if payload.get("consume_budget", True):
        user = get_current_user()
        node_id = user.node_id if user else None
        try:
            consume_epsilon(
                node_id=node_id,
                epsilon=epsilon,
                sensitivity=sensitivity,
                query_key="dp_sum",
                clipping_rule=payload.get("clipping_rule"),
                purpose="dp_sum",
                scope=payload.get("scope", "annual"),
                actor_id=user.id if user else None,
            )
        except ValueError as exc:
            return error("budget_exceeded", str(exc), status=400)
    return ok({"noisy_value": dp_sum(value, epsilon, sensitivity)})


@math_bp.route("/volatility", methods=["POST"])
@require_permission("formulas:read")
def volatility():
    payload = request.get_json() or {}
    returns = payload.get("returns") or []
    params, version = resolve_model_params("volatility_model")
    result = phased_volatility(returns, params)
    log_model_run("volatility_model", version, input_hash=f"returns:{len(returns)}", context={"method": result["method"]}, output_value=result["volatility"])
    return ok(result)
