"""
Constellation Scoring Engine
=============================
Deterministic, explainable scoring for microcosm performance within constellations.

Scoring pipeline:
  1. Collect weekly canonical variables per microcosm
  2. Robust-normalize each variable (median + MAD)
  3. Squash via bounded sigmoid: f(z) = 1 / (1 + exp(-k*z)), clamped to [0, 1]
  4. Weighted sum → Perf_m,t (bounded [0, 1])
  5. Pairwise synergy Syn_ij
  6. FeaturedScore = anti_capture_weight * Perf, with hard gates

All parameters resolved from FormulaRegistry and bounded by ConstellationParameterBounds.
"""

import hashlib
import json
import math
from datetime import datetime, date

from ..extensions import db
from ..models import (
    ConstellationMetricsWeekly,
    ConstellationRanking,
    ConstellationParameterBounds,
    AuditRecord,
)
from .formula_registry_service import resolve_params, log_run
from .systemic_mode_service import get_system_state, MODE_BLACK_SWAN, MODE_CRISIS


# ── Parameter Defaults ────────────────────────────────────────

FORMULA_KEY = "constellation_scoring_v1"

_DEFAULT_PARAMS = {
    # Weights for each canonical variable (must sum to ~1.0)
    "w_volume": 0.10,
    "w_savings": 0.10,
    "w_logistics": 0.08,
    "w_quality": 0.12,
    "w_delivery": 0.12,
    "w_disputes": 0.10,
    "w_participation": 0.10,
    "w_accessibility": 0.08,
    "w_equity": 0.10,
    "w_burnout": 0.10,
    # Squashing steepness
    "squash_k": 1.5,
    # Anti-capture penalty multiplier range
    "lambda_c_min": 0.3,
    "lambda_c_max": 1.0,
    "lambda_c_default": 1.0,
    # Hard gate thresholds
    "rel_lcb_featured_threshold": 0.3,
    "audit_failure_best_practice_threshold": 0.15,
    "disputes_spike_threshold": 0.25,
    # Synergy parameters
    "synergy_geo_radius_km": 50.0,
    "synergy_schedule_overlap_min": 0.2,
    "synergy_volume_threshold": 100.0,
    "synergy_coord_cost_weight": 0.3,
    # Featured slots
    "max_featured_slots": 3,
    "max_best_practice_slots": 1,
    # Crisis thresholds
    "crisis_reliability_lcb": 0.5,
    "crisis_proof_integrity_lcb": 0.4,
}

# Bounds for every tunable parameter
_PARAM_BOUNDS = {
    "w_volume": (0.0, 0.3),
    "w_savings": (0.0, 0.3),
    "w_logistics": (0.0, 0.3),
    "w_quality": (0.0, 0.3),
    "w_delivery": (0.0, 0.3),
    "w_disputes": (0.0, 0.3),
    "w_participation": (0.0, 0.3),
    "w_accessibility": (0.0, 0.3),
    "w_equity": (0.0, 0.3),
    "w_burnout": (0.0, 0.3),
    "squash_k": (0.5, 5.0),
    "lambda_c_min": (0.1, 1.0),
    "lambda_c_max": (0.5, 1.0),
    "lambda_c_default": (0.3, 1.0),
    "rel_lcb_featured_threshold": (0.1, 0.8),
    "audit_failure_best_practice_threshold": (0.05, 0.5),
    "disputes_spike_threshold": (0.1, 0.5),
    "synergy_geo_radius_km": (5.0, 200.0),
    "synergy_schedule_overlap_min": (0.0, 1.0),
    "synergy_volume_threshold": (10.0, 10000.0),
    "synergy_coord_cost_weight": (0.0, 1.0),
    "max_featured_slots": (1.0, 10.0),
    "max_best_practice_slots": (1.0, 5.0),
    "crisis_reliability_lcb": (0.2, 0.9),
    "crisis_proof_integrity_lcb": (0.2, 0.9),
}


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _enforce_bounds(params):
    """Enforce parameter bounds. Returns clamped copy."""
    clamped = dict(params)
    for key, (lo, hi) in _PARAM_BOUNDS.items():
        if key in clamped:
            clamped[key] = _clamp(float(clamped[key]), lo, hi)
    return clamped


def _evidence_hash(payload):
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


# ── Robust Normalization ──────────────────────────────────────

def _median(values):
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2 == 0:
        return (s[mid - 1] + s[mid]) / 2.0
    return s[mid]


def _mad(values, med=None):
    """Median Absolute Deviation."""
    if not values:
        return 1.0
    if med is None:
        med = _median(values)
    deviations = [abs(v - med) for v in values]
    m = _median(deviations)
    return m if m > 1e-9 else 1.0  # avoid division by zero


def robust_normalize(value, values_list):
    """Normalize using median + MAD. Returns z-score."""
    med = _median(values_list)
    mad_val = _mad(values_list, med)
    return (value - med) / mad_val


def _bounded_squash(z, k=1.5):
    """Bounded sigmoid: maps R → (0, 1). k controls steepness."""
    clamped_z = _clamp(z, -10.0, 10.0)
    return 1.0 / (1.0 + math.exp(-k * clamped_z))


# ── Scoring Functions ─────────────────────────────────────────

CANONICAL_VARS = [
    ("volume_moved", "w_volume", False),       # higher is better
    ("savings_per_unit", "w_savings", False),
    ("logistics_cost", "w_logistics", True),    # lower is better (inverted)
    ("quality_median", "w_quality", False),
    ("delivery_reliability", "w_delivery", False),
    ("disputes_rate", "w_disputes", True),      # lower is better (inverted)
    ("participation", "w_participation", False),
    ("accessibility", "w_accessibility", False),
    ("equity_fairness", "w_equity", False),
    ("burnout_index", "w_burnout", True),       # lower is better (inverted)
]


def compute_perf_score(metrics_row, all_metrics, params):
    """
    Compute Perf_m,t for a single microcosm given all metrics in the cohort.

    Returns (score, decomposition_dict).
    """
    decomposition = {}
    weighted_sum = 0.0

    for attr, weight_key, inverted in CANONICAL_VARS:
        value = getattr(metrics_row, attr, 0.0) or 0.0
        all_values = [getattr(m, attr, 0.0) or 0.0 for m in all_metrics]

        z = robust_normalize(value, all_values)
        if inverted:
            z = -z
        squashed = _bounded_squash(z, params.get("squash_k", 1.5))
        w = params.get(weight_key, 0.1)
        contribution = squashed * w
        weighted_sum += contribution

        decomposition[attr] = {
            "raw": round(value, 4),
            "z_score": round(z, 4),
            "squashed": round(squashed, 4),
            "weight": round(w, 4),
            "contribution": round(contribution, 4),
        }

    # Normalize by total weight so score is in [0, 1]
    total_w = sum(params.get(wk, 0.1) for _, wk, _ in CANONICAL_VARS)
    if total_w > 0:
        perf = _clamp(weighted_sum / total_w, 0.0, 1.0)
    else:
        perf = 0.0

    decomposition["_total_weight"] = round(total_w, 4)
    decomposition["_perf_score"] = round(perf, 4)
    return round(perf, 6), decomposition


def compute_synergy_score(m_i, m_j, params):
    """
    Pairwise synergy between two microcosms.
    Based on: geo proximity, schedule overlap, volume threshold, coordination cost.

    Returns score in [0, 1].
    """
    # Placeholder geo distance (would use real lat/lng in production)
    geo_close = 1.0  # assume nearby for alpha
    schedule_overlap = 0.5  # placeholder
    vol_sum = (m_i.volume_moved or 0) + (m_j.volume_moved or 0)
    vol_threshold = params.get("synergy_volume_threshold", 100.0)
    vol_factor = min(1.0, vol_sum / vol_threshold) if vol_threshold > 0 else 0.0

    coord_cost = params.get("synergy_coord_cost_weight", 0.3)
    raw = (geo_close * 0.3 + schedule_overlap * 0.3 + vol_factor * 0.4) * (1.0 - coord_cost * 0.5)
    return round(_clamp(raw, 0.0, 1.0), 6)


def compute_featured_score(perf, anti_capture_weight, metrics_row, params, mode=None):
    """
    FeaturedScore = anti_capture_weight * perf, with hard gates.
    Returns (featured_score, gate_failures_list).
    """
    gates = []

    rel_threshold = params.get("rel_lcb_featured_threshold", 0.3)
    proof_threshold = params.get("audit_failure_best_practice_threshold", 0.15)
    if mode in {MODE_BLACK_SWAN, MODE_CRISIS}:
        rel_threshold = max(rel_threshold, params.get("crisis_reliability_lcb", rel_threshold))
        proof_threshold = max(proof_threshold, params.get("crisis_proof_integrity_lcb", proof_threshold))

    # Gate 1: reliability lower bound
    if (metrics_row.reliability_lcb or 0) < rel_threshold:
        gates.append("reliability_lcb_below_threshold")

    # Gate 2: disputes spike
    if (metrics_row.disputes_rate or 0) > params.get("disputes_spike_threshold", 0.25):
        gates.append("disputes_spike")

    # Gate 3: proof integrity for best practice
    if (metrics_row.proof_integrity_lcb or 0) < (1.0 - proof_threshold):
        gates.append("audit_failure_rate_too_high")

    acw = _clamp(
        anti_capture_weight,
        params.get("lambda_c_min", 0.3),
        params.get("lambda_c_max", 1.0),
    )
    score = acw * perf
    if mode == MODE_BLACK_SWAN:
        gates.append("black_swan_restriction")
        return 0.0, gates
    return round(score, 6), gates


# ── Main Orchestrator ─────────────────────────────────────────

def score_constellation_week(constellation_id, week_start, actor_id=None):
    """
    Score all microcosms in a constellation for a given week.
    Stores rankings and emits audit events.

    Returns list of ConstellationRanking records.
    """
    params_raw, version = resolve_params(FORMULA_KEY)
    params = _enforce_bounds({**_DEFAULT_PARAMS, **(params_raw or {})})

    metrics = (
        ConstellationMetricsWeekly.query
        .filter_by(constellation_id=constellation_id, week_start=week_start)
        .all()
    )
    if not metrics:
        return []

    # Compute performance scores
    scored = []
    for m in metrics:
        perf, decomp = compute_perf_score(m, metrics, params)
        m.perf_score = perf
        m.perf_decomposition = decomp
        m.formula_version = version
        m.evidence_hash = _evidence_hash({
            "constellation_id": constellation_id,
            "microcosm_id": m.microcosm_id,
            "week_start": str(week_start),
            "perf": perf,
            "decomp": decomp,
        })
        scored.append((m, perf, decomp))

    # Compute anti-capture weights (default 1.0, adjusted by drift service)
    # Import here to avoid circular imports
    from .constellation_drift_service import get_anti_capture_weights
    acw_map = get_anti_capture_weights(constellation_id, week_start, params)

    # Remove any existing rankings for this week (idempotent reruns)
    ConstellationRanking.query.filter_by(
        constellation_id=constellation_id,
        week_start=week_start,
    ).delete(synchronize_session=False)
    db.session.flush()

    # Determine system mode (for crisis/black swan adjustments)
    mode = None
    try:
        from ..models import Constellation
        constellation = Constellation.query.get(constellation_id)
        if constellation:
            mode = get_system_state(constellation.node_id).current_mode
    except Exception:
        mode = None

    # Compute featured scores + rankings
    rankings = []
    for m, perf, decomp in scored:
        acw = acw_map.get(m.microcosm_id, params.get("lambda_c_default", 1.0))
        featured_score, gate_failures = compute_featured_score(perf, acw, m, params, mode=mode)

        r = ConstellationRanking(
            constellation_id=constellation_id,
            microcosm_id=m.microcosm_id,
            week_start=week_start,
            rank=0,  # set below after sorting
            raw_perf=perf,
            anti_capture_weight=acw,
            featured_score=featured_score,
            gate_failures=gate_failures if gate_failures else None,
            component_contributions=decomp,
            formula_version=version,
        )
        r._ev_hash_input = {
            "constellation_id": constellation_id,
            "microcosm_id": m.microcosm_id,
            "week": str(week_start),
            "perf": perf,
            "acw": acw,
            "featured": featured_score,
            "gates": gate_failures,
        }
        rankings.append(r)

    # Sort by featured_score descending → assign ranks
    rankings.sort(key=lambda r: r.featured_score, reverse=True)
    max_featured = int(params.get("max_featured_slots", 3))
    max_bp = int(params.get("max_best_practice_slots", 1))
    if mode == MODE_CRISIS:
        max_featured = max(1, int(max_featured * 0.5))
    featured_count = 0
    bp_count = 0

    for idx, r in enumerate(rankings):
        r.rank = idx + 1
        r.evidence_hash = _evidence_hash(r._ev_hash_input)

        # Featured if no gate failures and within slot limit
        if mode == MODE_BLACK_SWAN:
            r.is_featured = False
            r.is_best_practice = False
        elif not r.gate_failures and featured_count < max_featured:
            r.is_featured = True
            featured_count += 1
            # Best practice if top and audit gate passed
            if bp_count < max_bp and "audit_failure_rate_too_high" not in (r.gate_failures or []):
                r.is_best_practice = True
                bp_count += 1
        else:
            r.is_featured = False
            r.is_best_practice = False

        db.session.add(r)

    # Audit event
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="CONSTELLATION_RANKING_ADJUSTED",
        entity_type="constellation",
        entity_id=str(constellation_id),
        payload={
            "week_start": str(week_start),
            "formula_version": version,
            "rankings_count": len(rankings),
            "featured_count": featured_count,
            "evidence_hash": _evidence_hash({
                "constellation_id": constellation_id,
                "week": str(week_start),
                "n": len(rankings),
            }),
        },
    ))

    log_run(FORMULA_KEY, version, context={
        "constellation_id": constellation_id,
        "week_start": str(week_start),
        "n_microcosms": len(rankings),
    }, actor_id=actor_id)

    db.session.commit()
    return rankings


def compute_synergy_matrix(constellation_id, week_start):
    """Compute pairwise synergy scores for all microcosms in constellation."""
    params_raw, _ = resolve_params(FORMULA_KEY)
    params = _enforce_bounds({**_DEFAULT_PARAMS, **(params_raw or {})})

    metrics = (
        ConstellationMetricsWeekly.query
        .filter_by(constellation_id=constellation_id, week_start=week_start)
        .all()
    )
    synergies = []
    for i, m_i in enumerate(metrics):
        for j, m_j in enumerate(metrics):
            if i >= j:
                continue
            syn = compute_synergy_score(m_i, m_j, params)
            if syn > 0.3:
                synergies.append({
                    "microcosm_i": m_i.microcosm_id,
                    "microcosm_j": m_j.microcosm_id,
                    "synergy": syn,
                })
    synergies.sort(key=lambda s: s["synergy"], reverse=True)
    return synergies


def ensure_parameter_bounds():
    """Ensure all parameter bounds are registered in the database."""
    for key, (lo, hi) in _PARAM_BOUNDS.items():
        existing = ConstellationParameterBounds.query.filter_by(param_key=key, version=1).first()
        if not existing:
            db.session.add(ConstellationParameterBounds(
                param_key=key,
                version=1,
                lower_bound=lo,
                upper_bound=hi,
                default_value=_DEFAULT_PARAMS.get(key, (lo + hi) / 2),
                description=f"Bound for {key}",
            ))
    db.session.commit()
