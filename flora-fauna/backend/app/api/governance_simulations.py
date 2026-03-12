from flask import Blueprint, request

from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.governance_simulation_service import list_scenarios, get_scenario_steps, run_scenario
from .utils import ok, error


governance_sim_bp = Blueprint("governance_simulations", __name__, url_prefix="/governance-simulations")


@governance_sim_bp.route("/", methods=["GET"])
def list_governance_scenarios():
    if not is_enabled("governance_simulations"):
        return error("disabled", "Governance simulations disabled", status=403)
    scenarios = list_scenarios()
    payload = [{
        "id": scenario.id,
        "title": scenario.title,
        "description": scenario.description,
        "risk_tier": scenario.risk_tier,
        "learning_track_id": scenario.learning_track_id,
    } for scenario in scenarios]
    return ok({"scenarios": payload})


@governance_sim_bp.route("/<int:scenario_id>", methods=["GET"])
def scenario_detail(scenario_id):
    if not is_enabled("governance_simulations"):
        return error("disabled", "Governance simulations disabled", status=403)
    steps = get_scenario_steps(scenario_id)
    payload = [{
        "id": step.id,
        "prompt": step.prompt,
        "options": step.options_json or [],
        "sequence": step.sequence,
    } for step in steps]
    return ok({"steps": payload})


@governance_sim_bp.route("/<int:scenario_id>/run", methods=["POST"])
@require_permission("governance_simulations:run")
def run_governance_scenario(scenario_id):
    if not is_enabled("governance_simulations"):
        return error("disabled", "Governance simulations disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    decisions = payload.get("decisions") or []
    run, impact = run_scenario(user.id, scenario_id, decisions)
    return ok({
        "run_id": run.id,
        "impact": impact,
    }, status=201)
