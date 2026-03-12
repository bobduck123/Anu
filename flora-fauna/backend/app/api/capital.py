from flask import Blueprint, request

from ..services import capital_intelligence_service
from ..services import feature_flag_service
from ..models import AuditRecord, TreasurySimulation, TreasurySimulationRun, db
from ..security.policy import require_permission, get_current_user
from .utils import ok, error

capital_bp = Blueprint("capital", __name__, url_prefix="/capital")


def _require_flag(flag):
    if not feature_flag_service.is_enabled(flag):
        raise ValueError(f"Feature '{flag}' disabled")


@capital_bp.route("/heatmap", methods=["GET"])
@require_permission("capital:read")
def heatmap():
    try:
        _require_flag("capital_heatmap")
    except ValueError as exc:
        return error("feature_disabled", str(exc), status=403)
    node_id = int(request.args.get("node_id", 1))
    snapshots = capital_intelligence_service.compute_heatmap(node_id)
    flags = capital_intelligence_service.compute_stress_flags(node_id)
    payload = [{
        "pool_id": s.pool_id,
        "bucket": s.bucket,
        "period_start": s.period_start.isoformat(),
        "period_end": s.period_end.isoformat(),
        "inflow_cents": s.inflow_cents,
        "outflow_cents": s.outflow_cents,
        "net_flow_cents": s.net_flow_cents,
        "balance_cents": s.balance_cents,
        "allocation_ratio": s.allocation_ratio,
    } for s in snapshots]
    flags_payload = [{
        "flag_type": f.flag_type,
        "severity": f.severity,
        "message": f.message,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    } for f in flags]
    user = get_current_user()
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="capital_heatmap_viewed",
        entity_type="capital_heatmap",
        entity_id=str(node_id),
    ))
    db.session.commit()
    return ok({"snapshots": payload, "flags": flags_payload})


@capital_bp.route("/export", methods=["GET"])
@require_permission("capital:export")
def export_heatmap():
    try:
        _require_flag("capital_heatmap")
    except ValueError as exc:
        return error("feature_disabled", str(exc), status=403)
    node_id = int(request.args.get("node_id", 1))
    snapshots = capital_intelligence_service.compute_heatmap(node_id)
    payload = [{
        "pool_id": s.pool_id,
        "bucket": s.bucket,
        "period_start": s.period_start.isoformat(),
        "period_end": s.period_end.isoformat(),
        "inflow_cents": s.inflow_cents,
        "outflow_cents": s.outflow_cents,
        "net_flow_cents": s.net_flow_cents,
        "balance_cents": s.balance_cents,
        "allocation_ratio": s.allocation_ratio,
    } for s in snapshots]
    user = get_current_user()
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="capital_heatmap_exported",
        entity_type="capital_heatmap",
        entity_id=str(node_id),
    ))
    db.session.commit()
    return ok({"snapshots": payload})


@capital_bp.route("/simulate", methods=["POST"])
@require_permission("capital:simulate")
def simulate():
    try:
        _require_flag("treasury_simulator")
    except ValueError as exc:
        return error("feature_disabled", str(exc), status=403)
    payload = request.get_json() or {}
    node_id = int(payload.get("node_id", 1))
    result = capital_intelligence_service.simulate_treasury(
        node_id=node_id,
        revenue_drop_pct=float(payload.get("revenue_drop_pct", 0)),
        relief_surge_pct=float(payload.get("relief_surge_pct", 0)),
        ops_cost_increase_pct=float(payload.get("ops_cost_increase_pct", 0)),
    )
    user = get_current_user()
    simulation = TreasurySimulation(
        user_id=user.id if user else 0,
        node_id=node_id,
        revenue_drop_pct=float(payload.get("revenue_drop_pct", 0)),
        relief_surge_pct=float(payload.get("relief_surge_pct", 0)),
        ops_cost_increase_pct=float(payload.get("ops_cost_increase_pct", 0)),
    )
    db.session.add(simulation)
    db.session.flush()
    db.session.add(TreasurySimulationRun(
        simulation_id=simulation.id,
        results_json=result,
    ))
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="treasury_simulation_run",
        entity_type="treasury_simulation",
        entity_id=str(node_id),
        payload=payload,
    ))
    db.session.commit()
    return ok(result)


@capital_bp.route("/resilience", methods=["GET"])
@require_permission("capital:read")
def resilience():
    try:
        _require_flag("resilience_index")
    except ValueError as exc:
        return error("feature_disabled", str(exc), status=403)
    node_id = int(request.args.get("node_id", 1))
    record = capital_intelligence_service.compute_resilience_index(node_id)
    return ok({
        "index_value": record.index_value,
        "formula_version": record.formula_version,
        "components": record.components_json,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    })
