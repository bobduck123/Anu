import hashlib
import json
from datetime import datetime

from sqlalchemy import func

from ..config import Config
from ..extensions import db
from ..models import (
    BenefitsAccount,
    BenefitsLedgerEntry,
    AuditRecord,
    ConstellationMetricsWeekly,
    ConstellationMetricsWeeklyNode,
    Microcosm,
)


def get_or_create_benefits_account(node_id, global_subject_id):
    account = BenefitsAccount.query.filter_by(node_id=node_id, global_subject_id=global_subject_id).first()
    if not account:
        account = BenefitsAccount(node_id=node_id, global_subject_id=global_subject_id, balance_cents=0)
        db.session.add(account)
        db.session.commit()
    return account


def add_benefits_entry(node_id, global_subject_id, entry_type, amount_cents, source_event_id=None, metadata=None, actor_id=None):
    amount_cents = int(amount_cents)
    if entry_type == "redeem" and amount_cents > 0:
        amount_cents = -amount_cents
    if entry_type == "accrue" and amount_cents < 0:
        amount_cents = abs(amount_cents)

    account = get_or_create_benefits_account(node_id, global_subject_id)
    if account.balance_cents + amount_cents < 0:
        raise ValueError("Insufficient balance")

    entry = BenefitsLedgerEntry(
        node_id=node_id,
        global_subject_id=global_subject_id,
        entry_type=entry_type,
        amount_cents=amount_cents,
        source_event_id=source_event_id,
        metadata_json=metadata or {},
        created_by=actor_id,
    )
    db.session.add(entry)
    account.balance_cents += amount_cents
    db.session.add(account)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        node_id=node_id,
        action=f"BENEFITS_{entry_type.upper()}",
        entity_type="benefits_ledger",
        entity_id=str(entry.id),
        payload={"amount_cents": amount_cents, "source_event_id": source_event_id},
    ))
    db.session.commit()
    return entry, account


def compute_node_constellation_aggregates(constellation_id, node_id, week_start, min_cohort=None):
    min_cohort = min_cohort or int(Config.DP_MIN_COHORT or 30)
    metrics = (
        db.session.query(ConstellationMetricsWeekly)
        .join(Microcosm, Microcosm.id == ConstellationMetricsWeekly.microcosm_id)
        .filter(ConstellationMetricsWeekly.constellation_id == constellation_id)
        .filter(ConstellationMetricsWeekly.week_start == week_start)
        .filter(Microcosm.node_id == node_id)
        .all()
    )
    if len(metrics) < min_cohort:
        return None

    def _avg(attr):
        vals = [getattr(m, attr) for m in metrics if getattr(m, attr) is not None]
        return sum(vals) / len(vals) if vals else None

    aggregates = {
        "microcosm_count": len(metrics),
        "avg_volume_moved": _avg("volume_moved"),
        "avg_savings_per_unit": _avg("savings_per_unit"),
        "avg_logistics_cost": _avg("logistics_cost"),
        "avg_quality_median": _avg("quality_median"),
        "avg_delivery_reliability": _avg("delivery_reliability"),
        "avg_disputes_rate": _avg("disputes_rate"),
        "avg_participation": _avg("participation"),
        "avg_accessibility": _avg("accessibility"),
        "avg_equity_fairness": _avg("equity_fairness"),
        "avg_burnout_index": _avg("burnout_index"),
        "avg_perf_score": _avg("perf_score"),
    }

    evidence_hash = hashlib.sha256(json.dumps({
        "constellation_id": constellation_id,
        "node_id": node_id,
        "week_start": str(week_start),
        "aggregates": aggregates,
    }, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    record = ConstellationMetricsWeeklyNode(
        constellation_id=constellation_id,
        node_id=node_id,
        week_start=week_start,
        aggregates_json=aggregates,
        epsilon_used=0.0,
        min_cohort=min_cohort,
        evidence_hash=evidence_hash,
        created_at=datetime.utcnow(),
    )
    db.session.add(record)
    db.session.commit()
    return record
