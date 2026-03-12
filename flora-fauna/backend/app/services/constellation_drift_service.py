"""
Constellation Drift & Anti-Capture Monitoring
===============================================
Weekly monitoring metrics and response ladder.

Monitors:
  - HHI concentration (volume, featured attention)
  - Gini coefficient of featured tenure
  - Participation entropy across microcosms
  - Collusion/ring detection (repeated dyads, triadic closure, modularity)
  - Sybil detection (same organizer, many microcosms, same domain/geo)
  - Baseline manipulation (claimed divergence vs peer median)
  - Reaction manipulation (suspicious bursts from low-trust accounts)

Response ladder:
  1. Soft correction: increase anti-capture penalty (lambda_c)
  2. Uplift proof threshold for featuring
  3. Emit CONSTELLATION_DRIFT_ALERT_RAISED
  4. If severe: CAPTURE_REVIEW_REQUIRED to governance queue

NO automatic removals.
"""

import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import datetime

from ..extensions import db
from ..models import (
    ConstellationMetricsWeekly,
    ConstellationRanking,
    ConstellationDriftAlert,
    ConstellationMembership,
    Microcosm,
    AuditRecord,
)


DRIFT_FORMULA_KEY = "constellation_drift_v1"

_DRIFT_THRESHOLDS = {
    "hhi_volume_warning": 0.25,
    "hhi_volume_critical": 0.40,
    "hhi_featured_warning": 0.35,
    "hhi_featured_critical": 0.50,
    "gini_tenure_warning": 0.60,
    "gini_tenure_critical": 0.80,
    "entropy_low_warning": 1.0,
    "entropy_low_critical": 0.5,
    "sybil_same_organizer_threshold": 3,
    "dyad_repeat_threshold": 4,
    "triadic_closure_threshold": 0.6,
    "baseline_divergence_threshold": 2.5,  # MAD units
    "reaction_burst_threshold": 5,  # z-score of reaction rate
}


def _evidence_hash(payload):
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


# ── Concentration Metrics ─────────────────────────────────────

def compute_hhi(shares):
    """Herfindahl-Hirschman Index. Normalized to [0, 1]. Input: list of shares (sum to 1)."""
    if not shares:
        return 0.0
    total = sum(shares)
    if total <= 0:
        return 0.0
    normalized = [s / total for s in shares]
    return sum(s * s for s in normalized)


def compute_gini(values):
    """Gini coefficient. 0 = perfect equality, 1 = perfect inequality."""
    if not values or len(values) < 2:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    if total <= 0:
        return 0.0
    cum = 0.0
    gini_sum = 0.0
    for i, v in enumerate(sorted_vals):
        cum += v
        gini_sum += (2 * (i + 1) - n - 1) * v
    return gini_sum / (n * total)


def compute_entropy(counts):
    """Shannon entropy normalized to [0, 1]. Input: list of counts."""
    if not counts:
        return 0.0
    total = sum(counts)
    if total <= 0:
        return 0.0
    n = len(counts)
    if n <= 1:
        return 0.0
    probs = [c / total for c in counts if c > 0]
    raw_entropy = -sum(p * math.log2(p) for p in probs)
    max_entropy = math.log2(n)
    if max_entropy <= 0:
        return 0.0
    return raw_entropy / max_entropy


# ── Collusion / Ring Detection ────────────────────────────────

def detect_repeated_dyads(interaction_pairs, threshold=4):
    """
    Detect organizer pairs that co-appear in featured/top slots repeatedly.
    interaction_pairs: list of (org_a, org_b) tuples over recent weeks.
    Returns list of flagged dyads.
    """
    counter = Counter(tuple(sorted(p)) for p in interaction_pairs)
    return [{"pair": list(pair), "count": count}
            for pair, count in counter.items() if count >= threshold]


def compute_triadic_closure(adjacency):
    """
    Measure triadic closure ratio in an interaction graph.
    adjacency: dict of {node: set(neighbors)}.
    Returns ratio of closed triangles to possible triangles.
    """
    if len(adjacency) < 3:
        return 0.0
    triangles = 0
    triples = 0
    nodes = list(adjacency.keys())
    for i, a in enumerate(nodes):
        neighbors_a = adjacency.get(a, set())
        for b in neighbors_a:
            neighbors_b = adjacency.get(b, set())
            for c in neighbors_b:
                if c != a and c in neighbors_a:
                    triangles += 1
            triples += max(0, len(neighbors_b) - 1)
    if triples <= 0:
        return 0.0
    return triangles / triples


# ── Sybil Detection ──────────────────────────────────────────

def detect_sybil_microcosms(constellation_id):
    """
    Detect same organizer creating many microcosms in the same constellation.
    Returns list of flagged organizer_ids with their microcosm counts.
    """
    memberships = ConstellationMembership.query.filter_by(constellation_id=constellation_id).all()
    microcosm_ids = [m.microcosm_id for m in memberships]
    if not microcosm_ids:
        return []

    microcosms = Microcosm.query.filter(Microcosm.id.in_(microcosm_ids)).all()
    creator_counts = Counter(m.creator_id for m in microcosms)

    threshold = _DRIFT_THRESHOLDS.get("sybil_same_organizer_threshold", 3)
    return [{"organizerId": org_id, "microcosmCount": count}
            for org_id, count in creator_counts.items() if count >= threshold]


# ── Baseline Manipulation Detection ──────────────────────────

def detect_baseline_manipulation(metrics_list):
    """
    Detect microcosms whose claimed savings/quality diverge suspiciously
    from the peer median. Uses MAD-based z-scores.
    """
    if len(metrics_list) < 3:
        return []

    def _median(vals):
        s = sorted(vals)
        n = len(s)
        return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0

    def _mad(vals, med):
        devs = [abs(v - med) for v in vals]
        m = _median(devs)
        return m if m > 1e-9 else 1.0

    savings_vals = [m.savings_per_unit or 0 for m in metrics_list]
    med = _median(savings_vals)
    mad_v = _mad(savings_vals, med)
    threshold = _DRIFT_THRESHOLDS.get("baseline_divergence_threshold", 2.5)

    flagged = []
    for m in metrics_list:
        z = abs((m.savings_per_unit or 0) - med) / mad_v
        if z > threshold:
            flagged.append({
                "microcosmId": m.microcosm_id,
                "savings": m.savings_per_unit,
                "peerMedian": round(med, 4),
                "zScore": round(z, 4),
            })
    return flagged


# ── Reaction Manipulation Detection ──────────────────────────

def detect_reaction_manipulation(metrics_list):
    """
    Detect suspicious bursts: microcosms with participation spikes
    that deviate dramatically from their historical pattern.
    Uses z-score of participation relative to cohort.
    """
    if len(metrics_list) < 3:
        return []

    part_vals = [m.participation or 0 for m in metrics_list]
    mean_p = sum(part_vals) / len(part_vals) if part_vals else 0
    var_p = sum((v - mean_p) ** 2 for v in part_vals) / len(part_vals) if part_vals else 1
    std_p = math.sqrt(var_p) if var_p > 0 else 1.0

    threshold = _DRIFT_THRESHOLDS.get("reaction_burst_threshold", 5)
    flagged = []
    for m in metrics_list:
        z = ((m.participation or 0) - mean_p) / std_p if std_p > 1e-9 else 0
        if z > threshold:
            flagged.append({
                "microcosmId": m.microcosm_id,
                "participation": m.participation,
                "cohortMean": round(mean_p, 4),
                "zScore": round(z, 4),
            })
    return flagged


# ── Anti-Capture Weights ──────────────────────────────────────

def get_anti_capture_weights(constellation_id, week_start, params):
    """
    Compute per-microcosm anti-capture weight (lambda_c).
    Penalizes microcosms that have been featured too frequently.
    Returns dict: {microcosm_id: weight}.
    """
    # Count how many times each microcosm was featured in last 8 weeks
    from datetime import timedelta
    lookback_start = week_start - timedelta(weeks=8)
    recent_rankings = (
        ConstellationRanking.query
        .filter(
            ConstellationRanking.constellation_id == constellation_id,
            ConstellationRanking.week_start >= lookback_start,
            ConstellationRanking.week_start < week_start,
            ConstellationRanking.is_featured == True,
        )
        .all()
    )

    featured_counts = Counter(r.microcosm_id for r in recent_rankings)
    max_count = max(featured_counts.values()) if featured_counts else 0

    lambda_min = params.get("lambda_c_min", 0.3)
    lambda_max = params.get("lambda_c_max", 1.0)
    default = params.get("lambda_c_default", 1.0)

    # Strengthen anti-capture in crisis / black swan
    try:
        from .systemic_mode_service import get_system_state, MODE_BLACK_SWAN, MODE_CRISIS
        from ..models import Constellation
        constellation = Constellation.query.get(constellation_id)
        if constellation:
            mode = get_system_state(constellation.node_id).current_mode
            if mode in {MODE_BLACK_SWAN, MODE_CRISIS}:
                lambda_min = min(lambda_min, 0.2)
                lambda_max = max(lambda_min, 0.8)
                default = min(default, 0.9)
    except Exception:
        pass

    weights = {}
    memberships = ConstellationMembership.query.filter_by(constellation_id=constellation_id).all()

    for mem in memberships:
        count = featured_counts.get(mem.microcosm_id, 0)
        if max_count > 0 and count > 0:
            # Linear penalty: more featured → lower weight
            penalty_ratio = count / max_count
            w = lambda_max - penalty_ratio * (lambda_max - lambda_min)
            weights[mem.microcosm_id] = round(max(lambda_min, min(lambda_max, w)), 4)
        else:
            weights[mem.microcosm_id] = default

    return weights


# ── Main Drift Monitor ────────────────────────────────────────

def run_drift_monitor(constellation_id, week_start, actor_id=None):
    """
    Run all drift / anti-capture checks for a constellation week.
    Emits drift alerts and audit events.
    Returns list of ConstellationDriftAlert records created.
    """
    metrics = (
        ConstellationMetricsWeekly.query
        .filter_by(constellation_id=constellation_id, week_start=week_start)
        .all()
    )
    if not metrics:
        return []

    alerts = []

    # 1. HHI by volume
    volumes = [m.volume_moved or 0 for m in metrics]
    hhi_vol = compute_hhi(volumes)
    alerts.extend(_check_threshold(
        constellation_id, week_start,
        "hhi_volume", "hhi_volume", hhi_vol,
        _DRIFT_THRESHOLDS["hhi_volume_warning"],
        _DRIFT_THRESHOLDS["hhi_volume_critical"],
    ))

    # 2. HHI by featured attention (use perf_score as proxy)
    perfs = [m.perf_score or 0 for m in metrics]
    hhi_feat = compute_hhi(perfs)
    alerts.extend(_check_threshold(
        constellation_id, week_start,
        "hhi_featured", "hhi_featured_attention", hhi_feat,
        _DRIFT_THRESHOLDS["hhi_featured_warning"],
        _DRIFT_THRESHOLDS["hhi_featured_critical"],
    ))

    # 3. Gini of featured tenure
    from datetime import timedelta
    lookback = week_start - timedelta(weeks=12)
    recent_rankings = (
        ConstellationRanking.query
        .filter(
            ConstellationRanking.constellation_id == constellation_id,
            ConstellationRanking.week_start >= lookback,
            ConstellationRanking.is_featured == True,
        )
        .all()
    )
    featured_tenure = Counter(r.microcosm_id for r in recent_rankings)
    if featured_tenure:
        gini = compute_gini(list(featured_tenure.values()))
        alerts.extend(_check_threshold(
            constellation_id, week_start,
            "gini_tenure", "gini_featured_tenure", gini,
            _DRIFT_THRESHOLDS["gini_tenure_warning"],
            _DRIFT_THRESHOLDS["gini_tenure_critical"],
        ))

    # 4. Participation entropy
    participations = [m.participation or 0 for m in metrics]
    entropy = compute_entropy([max(1, int(p)) for p in participations])
    if entropy < _DRIFT_THRESHOLDS["entropy_low_warning"]:
        severity = "critical" if entropy < _DRIFT_THRESHOLDS["entropy_low_critical"] else "warning"
        alerts.append(_create_alert(
            constellation_id, week_start,
            "low_entropy", severity, "participation_entropy",
            entropy, _DRIFT_THRESHOLDS["entropy_low_warning"],
            response="soft_correction" if severity == "warning" else "drift_alert",
        ))

    # 5. Sybil detection
    sybil_flags = detect_sybil_microcosms(constellation_id)
    for flag in sybil_flags:
        alerts.append(_create_alert(
            constellation_id, week_start,
            "sybil", "critical", "sybil_organizer_microcosm_count",
            float(flag["microcosmCount"]),
            float(_DRIFT_THRESHOLDS["sybil_same_organizer_threshold"]),
            detail=flag,
            response="capture_review",
        ))

    # 6. Baseline manipulation
    baseline_flags = detect_baseline_manipulation(metrics)
    for flag in baseline_flags:
        alerts.append(_create_alert(
            constellation_id, week_start,
            "baseline_manipulation", "warning", "baseline_savings_divergence",
            flag["zScore"],
            _DRIFT_THRESHOLDS["baseline_divergence_threshold"],
            detail=flag,
            response="uplift_proof",
        ))

    # 7. Reaction manipulation
    reaction_flags = detect_reaction_manipulation(metrics)
    for flag in reaction_flags:
        alerts.append(_create_alert(
            constellation_id, week_start,
            "reaction_manipulation", "warning", "reaction_participation_burst",
            flag["zScore"],
            _DRIFT_THRESHOLDS["reaction_burst_threshold"],
            detail=flag,
            response="uplift_proof",
        ))

    # Persist alerts
    for alert in alerts:
        db.session.add(alert)

    # Audit events
    if alerts:
        severe = any(a.severity == "critical" for a in alerts)
        event_action = "CAPTURE_REVIEW_REQUIRED" if severe else "CONSTELLATION_DRIFT_ALERT_RAISED"
        try:
            from .systemic_mode_service import get_system_state, MODE_BLACK_SWAN, MODE_CRISIS
            from ..models import Constellation
            constellation = Constellation.query.get(constellation_id)
            if constellation:
                mode = get_system_state(constellation.node_id).current_mode
                if mode in {MODE_BLACK_SWAN, MODE_CRISIS}:
                    event_action = "CAPTURE_REVIEW_REQUIRED"
        except Exception:
            pass
        db.session.add(AuditRecord(
            actor_id=actor_id,
            action=event_action,
            entity_type="constellation",
            entity_id=str(constellation_id),
            payload={
                "week_start": str(week_start),
                "alert_count": len(alerts),
                "alert_types": list(set(a.alert_type for a in alerts)),
                "severities": list(set(a.severity for a in alerts)),
                "evidence_hash": _evidence_hash({
                    "constellation_id": constellation_id,
                    "week": str(week_start),
                    "alerts": [a.alert_type for a in alerts],
                }),
            },
        ))

    db.session.commit()
    return alerts


def _check_threshold(const_id, week_start, alert_type, metric_name, value, warn_thresh, crit_thresh):
    """Check a metric against warning and critical thresholds."""
    alerts = []
    if value >= crit_thresh:
        alerts.append(_create_alert(
            const_id, week_start, alert_type, "critical",
            metric_name, value, crit_thresh, response="capture_review",
        ))
    elif value >= warn_thresh:
        alerts.append(_create_alert(
            const_id, week_start, alert_type, "warning",
            metric_name, value, warn_thresh, response="soft_correction",
        ))
    return alerts


def _create_alert(const_id, week_start, alert_type, severity, metric_name,
                  metric_value, threshold, detail=None, response=None):
    ev_hash = _evidence_hash({
        "constellation_id": const_id,
        "week": str(week_start),
        "type": alert_type,
        "metric": metric_name,
        "value": metric_value,
        "threshold": threshold,
    })
    return ConstellationDriftAlert(
        constellation_id=const_id,
        week_start=week_start,
        alert_type=alert_type,
        severity=severity,
        metric_name=metric_name,
        metric_value=round(metric_value, 6),
        threshold=round(threshold, 6),
        detail_json=detail,
        response_action=response,
        evidence_hash=ev_hash,
    )
