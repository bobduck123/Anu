from flask import Blueprint, request, g

from ..security.alpha import alpha_jwt_required
from ..security.policy import require_permission, get_current_user
from ..models import SystemSimulationRun, SystemParameterBounds
from ..services.systemic_mode_service import evaluate_mode, activate_mode, get_system_state, get_latest_digest
from ..services.systemic_resilience_service import compute_resilience_score
from ..services.systemic_simulation_service import run_systemic_simulation
from ..services.emergency_allocation_service import compute_emergency_allocation
from ..services.feature_flag_service import is_enabled
from .utils import ok, error

systemic_bp = Blueprint("systemic", __name__, url_prefix="/systemic")


@systemic_bp.route("/mode", methods=["GET"])
@alpha_jwt_required()
def get_mode():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    recalc = request.args.get("recalc") == "1"
    if recalc:
        state, snapshot, evidence = evaluate_mode(user.node_id, actor_id=user.id, allow_auto=True)
    else:
        state = get_system_state(user.node_id)
        snapshot = compute_resilience_score(user.node_id)
        evidence = {}
    return ok({
        "mode": state.current_mode,
        "activated_at": state.activated_at.isoformat() if state.activated_at else None,
        "expiry_at": state.expiry_at.isoformat() if state.expiry_at else None,
        "resilience_score": snapshot.resilience_score,
        "recommended_mode": snapshot.recommended_mode,
        "evidence": evidence,
    })


@systemic_bp.route("/mode/activate", methods=["POST"])
@require_permission("system_modes:manage")
def set_mode():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    payload = request.get_json() or {}
    new_mode = payload.get("mode")
    reason = payload.get("reason")
    evidence_vote_id = payload.get("evidence_vote_id")
    if not new_mode:
        return error("validation_error", "mode required", status=400)
    state = activate_mode(
        user.node_id,
        new_mode,
        actor_id=user.id,
        reason=reason,
        evidence={"evidence_vote_id": evidence_vote_id} if evidence_vote_id else None,
    )
    return ok({
        "mode": state.current_mode,
        "activated_at": state.activated_at.isoformat() if state.activated_at else None,
        "expiry_at": state.expiry_at.isoformat() if state.expiry_at else None,
    })


@systemic_bp.route("/resilience", methods=["GET"])
@alpha_jwt_required()
def resilience_snapshot():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    snapshot = compute_resilience_score(user.node_id)
    return ok({
        "resilience_score": snapshot.resilience_score,
        "submetrics": snapshot.submetrics_json,
        "formula_version": snapshot.formula_version,
        "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
    })


@systemic_bp.route("/digest", methods=["GET"])
@alpha_jwt_required()
def crisis_digest():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    digest = get_latest_digest(user.node_id)
    if not digest:
        return ok({"digest": None})
    return ok({"digest": {
        "mode": digest.mode,
        "summary": digest.summary_json,
        "created_at": digest.created_at.isoformat() if digest.created_at else None,
    }})


@systemic_bp.route("/simulations/run", methods=["POST"])
@require_permission("systemic_sim:run")
def run_sim():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    payload = request.get_json() or {}
    run = run_systemic_simulation(user.node_id, payload, actor_id=user.id)
    return ok({
        "id": run.id,
        "outputs": run.outputs_json,
        "resilience_score": run.resilience_score,
    })


@systemic_bp.route("/simulations", methods=["GET"])
@require_permission("systemic_sim:run")
def list_sims():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    runs = (
        SystemSimulationRun.query
        .filter_by(node_id=user.node_id)
        .order_by(SystemSimulationRun.started_at.desc())
        .limit(20)
        .all()
    )
    return ok({"runs": [{
        "id": r.id,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "resilience_score": r.resilience_score,
        "outputs": r.outputs_json,
    } for r in runs]})


@systemic_bp.route("/allocation/emergency", methods=["GET"])
@require_permission("pools:manage")
def emergency_allocation():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    user = get_current_user()
    allocation = compute_emergency_allocation(user.node_id, actor_id=user.id)
    return ok({"allocation": allocation})


@systemic_bp.route("/params", methods=["GET"])
@require_permission("system_modes:manage")
def list_params():
    if not is_enabled("SYSTEMIC_SHOCK_PREPAREDNESS"):
        return error("disabled", "Systemic shock preparedness disabled", status=403)
    bounds = SystemParameterBounds.query.filter_by(active=True).all()
    return ok({"bounds": [{
        "key": b.key,
        "version": b.version,
        "lower_bound": b.lower_bound,
        "upper_bound": b.upper_bound,
        "default_value": b.default_value,
        "description": b.description,
    } for b in bounds]})
