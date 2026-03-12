"""System mode engine for systemic shock preparedness."""
from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import json

from ..extensions import db
from ..models import SystemState, CrisisDigest, AuditRecord, SystemSimulationRun, InstitutionalModeConfig
from ..services.model_registry_service import resolve_model_params, log_model_run
from ..services.systemic_resilience_service import compute_resilience_metrics, compute_resilience_score


MODE_NORMAL = "NORMAL"
MODE_ELEVATED = "ELEVATED_STRESS"
MODE_CRISIS = "CRISIS_STABILIZATION"
MODE_BLACK_SWAN = "BLACK_SWAN"

DEFAULT_PARAMS = {
    "resilience_warn_threshold": 0.45,
    "auto_escalate_threshold": 0.25,
    "donation_shock_threshold": -0.30,
    "relief_backlog_threshold": 50,
    "burnout_threshold": 70.0,
    "drift_alert_threshold": 3,
    "black_swan_expiry_days": 30,
    "allow_auto_escalate": True,
}


def _evidence_hash(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def get_system_state(node_id: int) -> SystemState:
    state = SystemState.query.filter_by(node_id=node_id).first()
    if not state:
        state = SystemState(node_id=node_id, current_mode=MODE_NORMAL)
        db.session.add(state)
        db.session.commit()
    return state


def _expire_black_swan_if_needed(state: SystemState):
    if state.current_mode != MODE_BLACK_SWAN or not state.expiry_at:
        return state
    if state.expiry_at and state.expiry_at < datetime.utcnow():
        prev_mode = state.current_mode
        state.current_mode = MODE_CRISIS
        state.activated_at = datetime.utcnow()
        state.evidence_hash = _evidence_hash({"reason": "auto_expiry", "prev_mode": prev_mode})
        db.session.add(AuditRecord(
            actor_id=None,
            action="BLACK_SWAN_EXPIRED",
            entity_type="system_state",
            entity_id=str(state.id),
            payload={"prev_mode": prev_mode},
            node_id=state.node_id,
        ))
        db.session.commit()
    return state


def _build_crisis_digest(node_id: int, mode: str, metrics: dict, resilience_score: float | None):
    summary = {
        "mode": mode,
        "runway_months": metrics.get("runway_months"),
        "relief_backlog": metrics.get("relief_backlog"),
        "critical_alerts": metrics.get("critical_alerts"),
        "warning_alerts": metrics.get("warning_alerts"),
        "burnout_avg": metrics.get("burnout_avg"),
        "resilience_score": resilience_score,
        "simulation": {
            "capture_prob": metrics.get("sim_capture_prob"),
            "overload_prob": metrics.get("sim_overload_prob"),
        },
    }
    digest = CrisisDigest(
        node_id=node_id,
        mode=mode,
        summary_json=summary,
        evidence_hash=_evidence_hash(summary),
    )
    db.session.add(digest)
    db.session.commit()
    return digest


def evaluate_mode(node_id: int, actor_id: int | None = None, allow_auto: bool = True):
    params, version = resolve_model_params("system_mode_engine_v1", node_id=node_id)
    params = {**DEFAULT_PARAMS, **(params or {})}

    metrics = compute_resilience_metrics(node_id)
    snapshot = compute_resilience_score(node_id)
    resilience_score = snapshot.resilience_score

    # Determine trigger severity
    trigger_count = 0
    if metrics["donation_shock"] <= float(params["donation_shock_threshold"]):
        trigger_count += 1
    if metrics["relief_backlog"] >= int(params["relief_backlog_threshold"]):
        trigger_count += 1
    if metrics["burnout_avg"] >= float(params["burnout_threshold"]):
        trigger_count += 1
    if (metrics["critical_alerts"] + metrics["warning_alerts"]) >= int(params["drift_alert_threshold"]):
        trigger_count += 1
    if (metrics.get("sim_capture_prob") or 0) >= 0.6:
        trigger_count += 1
    if (metrics.get("sim_overload_prob") or 0) >= 0.6:
        trigger_count += 1

    recommended = MODE_NORMAL
    if trigger_count >= 4 or resilience_score <= float(params["auto_escalate_threshold"]):
        recommended = MODE_BLACK_SWAN
    elif trigger_count >= 3 or resilience_score <= float(params["resilience_warn_threshold"]):
        recommended = MODE_CRISIS
    elif trigger_count >= 2:
        recommended = MODE_ELEVATED

    evidence = {
        "metrics": metrics,
        "resilience_score": resilience_score,
        "trigger_count": trigger_count,
        "recommended": recommended,
    }
    evidence_hash = _evidence_hash(evidence)
    log_model_run("system_mode_engine_v1", version, input_hash=evidence_hash, context=evidence, output_value=recommended)

    state = get_system_state(node_id)
    state.formula_version = version
    state.evidence_hash = evidence_hash
    state = _expire_black_swan_if_needed(state)

    if allow_auto and params.get("allow_auto_escalate", True) and recommended != state.current_mode:
        activate_mode(
            node_id=node_id,
            new_mode=recommended,
            actor_id=actor_id,
            reason="auto_trigger",
            evidence=evidence,
        )
    else:
        db.session.commit()

    if recommended != MODE_NORMAL and resilience_score <= float(params["resilience_warn_threshold"]):
        db.session.add(AuditRecord(
            actor_id=actor_id,
            action="RESILIENCE_WARNING",
            entity_type="system_state",
            entity_id=str(state.id),
            payload={"score": resilience_score, "recommended": recommended},
            node_id=node_id,
        ))
        db.session.commit()

    if state.current_mode == MODE_BLACK_SWAN:
        _build_crisis_digest(node_id, state.current_mode, metrics, resilience_score)

    snapshot.recommended_mode = recommended
    db.session.commit()
    return state, snapshot, evidence


def activate_mode(node_id: int, new_mode: str, actor_id: int | None, reason: str | None = None, evidence: dict | None = None):
    if new_mode not in {MODE_NORMAL, MODE_ELEVATED, MODE_CRISIS, MODE_BLACK_SWAN}:
        raise ValueError("Invalid mode")
    state = get_system_state(node_id)
    prev = state.current_mode
    state.current_mode = new_mode
    state.activated_at = datetime.utcnow()
    state.activated_by = actor_id
    if new_mode == MODE_BLACK_SWAN:
        params, _ = resolve_model_params("system_mode_engine_v1", node_id=node_id)
        expiry_days = int((params or {}).get("black_swan_expiry_days", DEFAULT_PARAMS["black_swan_expiry_days"]))
        state.expiry_at = datetime.utcnow() + timedelta(days=expiry_days)
        # Increase audit verbosity
        inst = InstitutionalModeConfig.query.filter_by(node_id=node_id).first()
        if not inst:
            inst = InstitutionalModeConfig(node_id=node_id)
            db.session.add(inst)
        inst.extended_audit_logging = True
    else:
        state.expiry_at = None
    evidence_hash = _evidence_hash(evidence or {"reason": reason})
    state.evidence_hash = evidence_hash
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="SYSTEM_MODE_CHANGED",
        entity_type="system_state",
        entity_id=str(state.id),
        payload={"from": prev, "to": new_mode, "reason": reason},
        node_id=node_id,
    ))
    if new_mode == MODE_BLACK_SWAN:
        db.session.add(AuditRecord(
            actor_id=actor_id,
            action="BLACK_SWAN_ACTIVATED",
            entity_type="system_state",
            entity_id=str(state.id),
            payload={"reason": reason},
            node_id=node_id,
        ))
    if prev == MODE_BLACK_SWAN and new_mode != MODE_BLACK_SWAN:
        db.session.add(AuditRecord(
            actor_id=actor_id,
            action="BLACK_SWAN_DEACTIVATED",
            entity_type="system_state",
            entity_id=str(state.id),
            payload={"reason": reason},
            node_id=node_id,
        ))
    db.session.commit()
    return state


def get_latest_digest(node_id: int):
    return CrisisDigest.query.filter_by(node_id=node_id).order_by(CrisisDigest.created_at.desc()).first()
