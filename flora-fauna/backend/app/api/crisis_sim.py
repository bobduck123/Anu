from datetime import datetime

from flask import Blueprint, request

from ..extensions import db
from ..models import CrisisScenario, CrisisRun, ImpactPool, ImpactLedgerEntry
from ..security.policy import require_permission, get_current_user
from ..services.feature_flag_service import is_enabled
from .utils import ok, error


crisis_sim_bp = Blueprint("crisis_sim", __name__, url_prefix="/crisis")


@crisis_sim_bp.route("/run", methods=["POST"])
@require_permission("crisis_sim:run")
def run_simulation():
    if not is_enabled("CRISIS_SIM_ENABLED"):
        return error("disabled", "Crisis simulation disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    scenario_type = payload.get("type") or "supply_shock"
    params = payload.get("params") or {}
    scenario = CrisisScenario(
        node_id=user.node_id,
        scenario_type=scenario_type,
        params_json=params,
        created_by=user.id,
    )
    db.session.add(scenario)
    db.session.commit()

    # Deterministic simulation: reduce balances by a factor
    factor = float(params.get("shock_factor", 0.15))
    pools = ImpactPool.query.filter_by(node_id=user.node_id).all()
    results = []
    for pool in pools:
        balance = db.session.query(db.func.sum(ImpactLedgerEntry.amount_cents)).filter_by(pool_id=pool.id).scalar() or 0
        projected = int(balance * (1 - factor))
        results.append({
            "pool_id": pool.id,
            "slug": pool.slug,
            "balance_cents": balance,
            "projected_balance_cents": projected,
        })
    run = CrisisRun(
        scenario_id=scenario.id,
        node_id=user.node_id,
        results_json={
            "shock_factor": factor,
            "pools": results,
        },
    )
    db.session.add(run)
    db.session.commit()
    return ok({"scenario_id": scenario.id, "run_id": run.id, "results": run.results_json})


@crisis_sim_bp.route("/runs", methods=["GET"])
@require_permission("crisis_sim:run")
def list_runs():
    if not is_enabled("CRISIS_SIM_ENABLED"):
        return error("disabled", "Crisis simulation disabled", status=403)
    runs = CrisisRun.query.filter_by(node_id=user.node_id).order_by(CrisisRun.computed_at.desc()).limit(20).all()
    payload = [{
        "id": r.id,
        "scenario_id": r.scenario_id,
        "results": r.results_json,
        "computed_at": r.computed_at.isoformat() if r.computed_at else None,
    } for r in runs]
    return ok({"runs": payload})
