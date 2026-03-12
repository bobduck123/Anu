"""Internal adversarial simulation engine (deterministic)."""
from __future__ import annotations

from datetime import datetime
import random
import hashlib
import json

from ..extensions import db
from ..models import SystemSimulationRun, AuditRecord
from ..services.model_registry_service import resolve_model_params, log_model_run
from ..services.systemic_resilience_service import compute_resilience_metrics, compute_resilience_score


DEFAULT_PARAMS = {
    "seed": 1337,
    "runs": 5,
    "shock_floor": 0.05,
    "shock_cap": 0.8,
}


def _hash(config: dict) -> str:
    return hashlib.sha256(json.dumps(config, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _apply_shocks(base: dict, shocks: list[dict], rng: random.Random) -> dict:
    metrics = dict(base)
    for shock in shocks:
        stype = shock.get("type")
        val = float(shock.get("value", 0))
        if stype == "DonationShock":
            metrics["runway_months"] *= max(0.1, 1 - val)
        elif stype == "ReliefSpike":
            metrics["relief_backlog"] *= max(1.0, val)
        elif stype == "OnboardingSurge":
            metrics["relief_backlog"] += int(val / 10)
        elif stype == "BurnoutShock":
            metrics["burnout_avg"] = min(100.0, metrics.get("burnout_avg", 0) * max(1.0, val))
        elif stype == "SybilMicrocosmInjection":
            metrics["warning_alerts"] = metrics.get("warning_alerts", 0) + int(val / 2)
        elif stype == "EngagementBrigade":
            metrics["critical_alerts"] = metrics.get("critical_alerts", 0) + int(val / 5)
        elif stype == "VolatilityShock":
            metrics["runway_months"] *= max(0.1, 1 - (val * 0.5))
        else:
            metrics["relief_backlog"] += rng.randint(0, 5)
    return metrics


def _apply_agents(metrics: dict, agents: list[dict], rng: random.Random) -> dict:
    out = dict(metrics)
    for agent in agents:
        atype = agent.get("type")
        strength = float(agent.get("strength", 1))
        if atype == "ReliabilityFarmer":
            out["warning_alerts"] = out.get("warning_alerts", 0) + int(2 * strength)
        elif atype == "EndorsementRing":
            out["critical_alerts"] = out.get("critical_alerts", 0) + int(3 * strength)
        elif atype == "SybilCluster":
            out["warning_alerts"] = out.get("warning_alerts", 0) + int(4 * strength)
        elif atype == "CartelCoordinator":
            out["critical_alerts"] = out.get("critical_alerts", 0) + int(2 * strength)
        else:
            out["warning_alerts"] = out.get("warning_alerts", 0) + rng.randint(0, 2)
    return out


def run_systemic_simulation(node_id: int, config: dict, actor_id: int | None = None):
    params, version = resolve_model_params("systemic_simulation_v1", node_id=node_id)
    params = {**DEFAULT_PARAMS, **(params or {})}
    rng = random.Random(int(params["seed"]))

    base_metrics = compute_resilience_metrics(node_id)
    runs = int(config.get("runs") or params["runs"])
    shocks = config.get("shocks") or []
    agents = config.get("agents") or []

    results = []
    worst_runway = None
    capture_prob = 0.0
    overload_prob = 0.0

    for _ in range(max(1, runs)):
        metrics = _apply_shocks(base_metrics, shocks, rng)
        metrics = _apply_agents(metrics, agents, rng)

        runway = max(0.0, float(metrics.get("runway_months", 0)))
        worst_runway = runway if worst_runway is None else min(worst_runway, runway)
        capture_prob = max(capture_prob, min(1.0, (metrics.get("critical_alerts", 0) * 0.25) + (metrics.get("warning_alerts", 0) * 0.1)))
        overload_prob = max(overload_prob, min(1.0, metrics.get("relief_backlog", 0) / max(1.0, float(base_metrics.get("relief_backlog", 1)))))

        results.append({
            "runway_months": runway,
            "critical_alerts": metrics.get("critical_alerts", 0),
            "warning_alerts": metrics.get("warning_alerts", 0),
            "relief_backlog": metrics.get("relief_backlog", 0),
            "burnout_avg": metrics.get("burnout_avg", 0),
        })

    snapshot = compute_resilience_score(node_id)
    resilience_score = snapshot.resilience_score

    outputs = {
        "runs": results,
        "worst_case_runway": worst_runway,
        "capture_prob": capture_prob,
        "overload_prob": overload_prob,
        "resilience_score": resilience_score,
    }
    input_hash = _hash({"config": config, "params": params, "base": base_metrics})
    log_model_run("systemic_simulation_v1", version, input_hash=input_hash, context=config, output_value=resilience_score, actor_id=actor_id)

    run = SystemSimulationRun(
        node_id=node_id,
        config_json=config,
        outputs_json=outputs,
        resilience_score=resilience_score,
        worst_case_runway=worst_runway,
        capture_prob=capture_prob,
        overload_prob=overload_prob,
    )
    db.session.add(run)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="SYSTEM_SIMULATION_RUN",
        entity_type="system_simulation",
        entity_id="pending",
        payload={"input_hash": input_hash},
        node_id=node_id,
    ))
    db.session.commit()
    return run

