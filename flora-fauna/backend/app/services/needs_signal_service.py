from datetime import datetime, timedelta
import math

from ..models import (
    NeedsSignal,
    NeedsSignalInputSnapshot,
    OrganiserPerformanceSnapshot,
    Certification,
    RiskTier,
    ReliefRequest,
    GovernanceRoleAssignment,
    EquipmentAsset,
    InfrastructureAsset,
    AuditRecord,
    db,
)
from ..services.formula_registry_service import resolve_params, log_run


def _default_params():
    return {
        "low_cert_penetration_threshold": 0.3,
        "relief_surge_threshold": 15,
        "governance_quorum_threshold": 2,
        "asset_underutilization_threshold": 0.2,
        "severity_weights": {
            "cert_penetration": 30,
            "relief_surge": 25,
            "governance_quorum": 20,
            "asset_underutilization": 15,
        },
        "expiry_days": 14,
        "severity_k": 1.2,
    }


def _severity_from_probability(p, k=1.0, epsilon=1e-3):
    eps = max(epsilon, 1e-3)
    k = min(max(k, 1e-6), 2.0)
    p = min(max(p, eps), 1 - eps)
    logit = math.log(p / (1 - p))
    return int(100 * (1 / (1 + math.exp(-k * logit))))


def generate_signals(node_id, actor_id=None):
    params, version = resolve_params("needs_signal_v1", node_id=node_id)
    cfg = {**_default_params(), **(params or {})}

    snapshot = {
        "cert_penetration": 0.0,
        "relief_requests_30d": 0,
        "governance_active_roles": 0,
        "asset_utilization": 1.0,
    }

    total_certs = Certification.query.filter_by(status="active").count()
    total_required = RiskTier.query.count() or 1
    snapshot["cert_penetration"] = min(total_certs / max(total_required, 1), 1.0)

    since = datetime.utcnow() - timedelta(days=30)
    snapshot["relief_requests_30d"] = ReliefRequest.query.filter(
        ReliefRequest.node_id == node_id,
        ReliefRequest.submitted_at >= since,
    ).count()

    snapshot["governance_active_roles"] = GovernanceRoleAssignment.query.filter_by(is_active=True).count()

    asset_count = EquipmentAsset.query.filter_by(node_id=node_id).count() + InfrastructureAsset.query.filter_by(node_id=node_id).count()
    snapshot["asset_utilization"] = 1.0 if asset_count == 0 else min(1.0, asset_count / 10.0)

    db.session.add(NeedsSignalInputSnapshot(node_id=node_id, snapshot_json=snapshot))

    signals = []
    expiry = datetime.utcnow() + timedelta(days=cfg["expiry_days"])

    if snapshot["cert_penetration"] < cfg["low_cert_penetration_threshold"]:
        p = snapshot["cert_penetration"] / max(cfg["low_cert_penetration_threshold"], 1e-6)
        severity = _severity_from_probability(p, k=cfg["severity_k"], epsilon=1e-3)
        signals.append(NeedsSignal(
            node_id=node_id,
            severity_0_100=severity,
            reason_codes_json=["low_certification_penetration"],
            expires_at=expiry,
            created_by_system=True,
            visible_level="organizer",
        ))
    if snapshot["relief_requests_30d"] > cfg["relief_surge_threshold"]:
        p = min(snapshot["relief_requests_30d"] / max(cfg["relief_surge_threshold"], 1), 1.0)
        severity = _severity_from_probability(p, k=cfg["severity_k"], epsilon=1e-3)
        signals.append(NeedsSignal(
            node_id=node_id,
            severity_0_100=severity,
            reason_codes_json=["relief_surge"],
            expires_at=expiry,
            created_by_system=True,
            visible_level="governance",
        ))
    if snapshot["governance_active_roles"] < cfg["governance_quorum_threshold"]:
        p = snapshot["governance_active_roles"] / max(cfg["governance_quorum_threshold"], 1)
        severity = _severity_from_probability(p, k=cfg["severity_k"], epsilon=1e-3)
        signals.append(NeedsSignal(
            node_id=node_id,
            severity_0_100=severity,
            reason_codes_json=["governance_quorum_stress"],
            expires_at=expiry,
            created_by_system=True,
            visible_level="governance",
        ))
    if snapshot["asset_utilization"] < cfg["asset_underutilization_threshold"]:
        p = snapshot["asset_utilization"] / max(cfg["asset_underutilization_threshold"], 1e-6)
        severity = _severity_from_probability(p, k=cfg["severity_k"], epsilon=1e-3)
        signals.append(NeedsSignal(
            node_id=node_id,
            severity_0_100=severity,
            reason_codes_json=["asset_underutilization"],
            expires_at=expiry,
            created_by_system=True,
            visible_level="organizer",
        ))

    db.session.add_all(signals)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="needs_signals_generated",
        entity_type="needs_signal",
        entity_id=str(node_id),
        payload={"count": len(signals)},
    ))
    db.session.commit()
    log_run("needs_signal_v1", version, {"node_id": node_id, "count": len(signals)}, actor_id)
    return signals
