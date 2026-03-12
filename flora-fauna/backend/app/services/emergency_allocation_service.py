"""Deterministic emergency allocation rules for Black Swan mode."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime

from ..extensions import db
from ..models import ImpactPool, AuditRecord
from ..services.model_registry_service import resolve_model_params, log_model_run


DEFAULT_PARAMS = {
    "relief_floor_pct": 0.50,
    "ops_cap_pct": 0.25,
    "liquidity_weight_pct": 0.20,
}


def _hash(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def compute_emergency_allocation(node_id: int, actor_id: int | None = None):
    params, version = resolve_model_params("emergency_allocation_v1", node_id=node_id)
    params = {**DEFAULT_PARAMS, **(params or {})}

    pools = ImpactPool.query.filter_by(node_id=node_id, is_active=True).all()
    allocation = {p.slug: 0.0 for p in pools}

    relief_floor = float(params["relief_floor_pct"])
    ops_cap = float(params["ops_cap_pct"])
    liquidity_weight = float(params["liquidity_weight_pct"])

    if "relief" in allocation:
        allocation["relief"] = relief_floor
    if "operations" in allocation:
        allocation["operations"] = min(ops_cap, max(0.0, 1.0 - relief_floor))
    if "infrastructure" in allocation:
        allocation["infrastructure"] = 0.0
    if "savings" in allocation:
        allocation["savings"] = liquidity_weight

    remainder = max(0.0, 1.0 - sum(allocation.values()))
    if remainder > 0 and "resilience" in allocation:
        allocation["resilience"] = remainder
    elif remainder > 0:
        # spread remainder across pools not yet allocated
        targets = [k for k, v in allocation.items() if v == 0.0]
        if targets:
            share = remainder / len(targets)
            for k in targets:
                allocation[k] = share

    input_hash = _hash({"node_id": node_id, "params": params})
    log_model_run("emergency_allocation_v1", version, input_hash=input_hash, context=allocation, output_value=allocation.get("relief", 0.0), actor_id=actor_id)

    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="EMERGENCY_ALLOCATION_COMPUTED",
        entity_type="impact_pool",
        entity_id=str(node_id),
        payload={"allocation": allocation},
        node_id=node_id,
    ))
    db.session.commit()
    return allocation

