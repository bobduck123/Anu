"""Systemic resilience scoring service (deterministic, auditable)."""
from __future__ import annotations

from datetime import datetime, timedelta, date
import hashlib
import json

from sqlalchemy import func

from ..extensions import db
from ..models import (
    ImpactLedgerEntry,
    ImpactPool,
    ReliefRequest,
    ConstellationDriftAlert,
    Constellation,
    BurnoutScore,
    SystemSimulationRun,
    ResilienceSnapshot,
)
from ..services.model_registry_service import resolve_model_params, log_model_run


DEFAULT_PARAMS = {
    "runway_months_target": 6.0,
    "relief_backlog_threshold": 50.0,
    "burnout_threshold": 70.0,
    "drift_latency_days_target": 14.0,
    "weight_liquidity": 0.30,
    "weight_capture": 0.20,
    "weight_overload": 0.20,
    "weight_drift": 0.15,
    "weight_relief": 0.15,
}


def _clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def _days_ago(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=days)


def _compute_liquidity_runway_months(node_id: int) -> float:
    pools = ImpactPool.query.filter_by(node_id=node_id).all()
    if not pools:
        return 0.0
    pool_ids = [p.id for p in pools]
    total_balance = db.session.query(
        func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)
    ).filter(
        ImpactLedgerEntry.pool_id.in_(pool_ids)
    ).scalar() or 0

    # Approximate monthly outflow from debits over 90 days
    debits = db.session.query(
        func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)
    ).filter(
        ImpactLedgerEntry.pool_id.in_(pool_ids),
        ImpactLedgerEntry.entry_type == "debit",
        ImpactLedgerEntry.created_at >= _days_ago(90),
    ).scalar() or 0
    monthly_outflow = max(1.0, abs(debits) / 3.0)
    runway_months = float(total_balance) / monthly_outflow
    return max(0.0, runway_months)


def _compute_donation_shock(node_id: int) -> float:
    pools = ImpactPool.query.filter_by(node_id=node_id).all()
    if not pools:
        return 0.0
    pool_ids = [p.id for p in pools]
    recent = db.session.query(
        func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)
    ).filter(
        ImpactLedgerEntry.pool_id.in_(pool_ids),
        ImpactLedgerEntry.entry_type == "credit",
        ImpactLedgerEntry.created_at >= _days_ago(30),
    ).scalar() or 0
    previous = db.session.query(
        func.coalesce(func.sum(ImpactLedgerEntry.amount_cents), 0)
    ).filter(
        ImpactLedgerEntry.pool_id.in_(pool_ids),
        ImpactLedgerEntry.entry_type == "credit",
        ImpactLedgerEntry.created_at >= _days_ago(60),
        ImpactLedgerEntry.created_at < _days_ago(30),
    ).scalar() or 0
    baseline = max(1.0, float(previous))
    return float(recent - previous) / baseline


def _compute_relief_backlog(node_id: int) -> int:
    return ReliefRequest.query.filter_by(node_id=node_id, status="pending").count()


def _compute_drift_alerts(node_id: int) -> tuple[int, int]:
    critical = (
        ConstellationDriftAlert.query
        .join(Constellation)
        .filter(Constellation.node_id == node_id, ConstellationDriftAlert.severity == "critical", ConstellationDriftAlert.resolved == False)
        .count()
    )
    warning = (
        ConstellationDriftAlert.query
        .join(Constellation)
        .filter(Constellation.node_id == node_id, ConstellationDriftAlert.severity == "warning", ConstellationDriftAlert.resolved == False)
        .count()
    )
    return critical, warning


def _compute_burnout_avg(node_id: int) -> float:
    scores = BurnoutScore.query.filter(
        BurnoutScore.computed_at >= _days_ago(30)
    ).all()
    if not scores:
        return 0.0
    return sum(s.score for s in scores) / max(1, len(scores))


def _compute_drift_latency_days(node_id: int) -> float:
    alerts = (
        ConstellationDriftAlert.query
        .join(Constellation)
        .filter(Constellation.node_id == node_id)
        .order_by(ConstellationDriftAlert.created_at.desc())
        .limit(10)
        .all()
    )
    if not alerts:
        return 0.0
    ages = [(datetime.utcnow() - a.created_at).days for a in alerts if a.created_at]
    return float(sum(ages) / max(1, len(ages)))


def compute_resilience_metrics(node_id: int):
    runway_months = _compute_liquidity_runway_months(node_id)
    donation_shock = _compute_donation_shock(node_id)
    relief_backlog = _compute_relief_backlog(node_id)
    critical_alerts, warning_alerts = _compute_drift_alerts(node_id)
    burnout_avg = _compute_burnout_avg(node_id)
    drift_latency_days = _compute_drift_latency_days(node_id)

    latest_sim = (
        SystemSimulationRun.query
        .filter_by(node_id=node_id)
        .order_by(SystemSimulationRun.started_at.desc())
        .first()
    )
    sim_capture_prob = latest_sim.capture_prob if latest_sim else 0.0
    sim_overload_prob = latest_sim.overload_prob if latest_sim else 0.0

    return {
        "runway_months": runway_months,
        "donation_shock": donation_shock,
        "relief_backlog": relief_backlog,
        "critical_alerts": critical_alerts,
        "warning_alerts": warning_alerts,
        "burnout_avg": burnout_avg,
        "drift_latency_days": drift_latency_days,
        "sim_capture_prob": sim_capture_prob or 0.0,
        "sim_overload_prob": sim_overload_prob or 0.0,
    }


def compute_resilience_score(node_id: int, week_start: date | None = None):
    params, version = resolve_model_params("resilience_score_v1", node_id=node_id)
    params = {**DEFAULT_PARAMS, **(params or {})}
    metrics = compute_resilience_metrics(node_id)

    runway_target = max(1.0, float(params["runway_months_target"]))
    backlog_threshold = max(1.0, float(params["relief_backlog_threshold"]))
    latency_target = max(1.0, float(params["drift_latency_days_target"]))

    s_liquidity = _clamp(metrics["runway_months"] / runway_target)
    capture_prob = _clamp((metrics["critical_alerts"] * 0.25) + (metrics["warning_alerts"] * 0.10) + (metrics["sim_capture_prob"] or 0.0))
    s_capture = _clamp(1.0 - capture_prob)
    overload_prob = _clamp((metrics["relief_backlog"] / backlog_threshold) + (metrics["sim_overload_prob"] or 0.0))
    s_overload = _clamp(1.0 - overload_prob)
    drift_penalty = _clamp(metrics["drift_latency_days"] / latency_target)
    s_drift = _clamp(1.0 - drift_penalty)
    s_relief = _clamp(1.0 - (metrics["relief_backlog"] / backlog_threshold))

    weights = {
        "liquidity": float(params["weight_liquidity"]),
        "capture": float(params["weight_capture"]),
        "overload": float(params["weight_overload"]),
        "drift": float(params["weight_drift"]),
        "relief": float(params["weight_relief"]),
    }
    total_w = max(0.01, sum(weights.values()))
    score = (
        s_liquidity * weights["liquidity"]
        + s_capture * weights["capture"]
        + s_overload * weights["overload"]
        + s_drift * weights["drift"]
        + s_relief * weights["relief"]
    ) / total_w
    score = _clamp(score)

    evidence = {
        "metrics": metrics,
        "weights": weights,
        "week_start": str(week_start) if week_start else None,
    }
    evidence_hash = hashlib.sha256(json.dumps(evidence, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    log_model_run("resilience_score_v1", version, input_hash=evidence_hash, context=metrics, output_value=score, actor_id=None)

    snapshot = ResilienceSnapshot(
        node_id=node_id,
        week_start=week_start,
        resilience_score=score,
        submetrics_json={
            "liquidity_score": s_liquidity,
            "capture_score": s_capture,
            "overload_score": s_overload,
            "drift_score": s_drift,
            "relief_score": s_relief,
            "capture_prob": capture_prob,
            "overload_prob": overload_prob,
            **metrics,
        },
        formula_version=version,
        evidence_hash=evidence_hash,
    )
    db.session.add(snapshot)
    db.session.commit()
    return snapshot
