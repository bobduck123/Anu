from datetime import datetime, timedelta
from collections import defaultdict

from ..models import (
    ImpactPool,
    ImpactLedgerEntry,
    ReliefRequest,
    CapitalMetricSnapshot,
    CapitalStressFlag,
    CapitalResilienceIndex,
    SovereigntyConfig,
    db,
)
from .ledger_service import pool_balance


def _period_bounds(bucket):
    now = datetime.utcnow()
    if bucket == "daily":
        start = now - timedelta(days=30)
        step = timedelta(days=1)
    elif bucket == "weekly":
        start = now - timedelta(weeks=12)
        step = timedelta(weeks=1)
    else:
        start = now - timedelta(days=365)
        step = timedelta(days=30)
    return start, now, step


def compute_heatmap(node_id):
    pools = ImpactPool.query.filter_by(node_id=node_id).all()
    snapshots = []
    total_balance = sum(pool_balance(node_id, p.id) for p in pools) or 1

    for bucket in ("daily", "weekly", "monthly"):
        start, end, step = _period_bounds(bucket)
        cursor = start
        while cursor < end:
            period_end = min(cursor + step, end)
            for pool in pools:
                existing = CapitalMetricSnapshot.query.filter_by(
                    node_id=node_id,
                    pool_id=pool.id,
                    bucket=bucket,
                    period_start=cursor,
                ).first()
                if existing:
                    snapshots.append(existing)
                    continue
                entries = ImpactLedgerEntry.query.filter(
                    ImpactLedgerEntry.node_id == node_id,
                    ImpactLedgerEntry.pool_id == pool.id,
                    ImpactLedgerEntry.created_at >= cursor,
                    ImpactLedgerEntry.created_at < period_end,
                ).all()
                inflow = sum(e.amount_cents for e in entries if e.amount_cents > 0)
                outflow = sum(-e.amount_cents for e in entries if e.amount_cents < 0)
                balance = pool_balance(node_id, pool.id)
                snapshot = CapitalMetricSnapshot(
                    node_id=node_id,
                    pool_id=pool.id,
                    bucket=bucket,
                    period_start=cursor,
                    period_end=period_end,
                    inflow_cents=inflow,
                    outflow_cents=outflow,
                    net_flow_cents=inflow - outflow,
                    balance_cents=balance,
                    allocation_ratio=(balance / total_balance) if total_balance else 0.0,
                )
                db.session.add(snapshot)
                snapshots.append(snapshot)
            cursor = period_end
    db.session.commit()
    return snapshots


def compute_stress_flags(node_id):
    flags = []
    pools = {p.slug: p for p in ImpactPool.query.filter_by(node_id=node_id).all()}
    total_balance = sum(pool_balance(node_id, p.id) for p in pools.values()) or 1

    sovereignty_min = SovereigntyConfig.query.filter_by(
        node_id=node_id, config_key="sovereignty_pool_min_pct"
    ).first()
    sovereignty_min_pct = sovereignty_min.config_value if sovereignty_min else 15.0
    infra_min = SovereigntyConfig.query.filter_by(
        node_id=node_id, config_key="infrastructure_pool_min_pct"
    ).first()
    infra_min_pct = infra_min.config_value if infra_min else 10.0

    def _flag(flag_type, message, severity="medium"):
        existing = CapitalStressFlag.query.filter(
            CapitalStressFlag.node_id == node_id,
            CapitalStressFlag.flag_type == flag_type,
            CapitalStressFlag.created_at >= datetime.utcnow() - timedelta(hours=24),
        ).first()
        if not existing:
            flag = CapitalStressFlag(node_id=node_id, flag_type=flag_type, message=message, severity=severity)
            db.session.add(flag)
            flags.append(flag)

    sovereignty_pool = pools.get("sovereignty")
    if sovereignty_pool:
        balance = pool_balance(node_id, sovereignty_pool.id)
        ratio = (balance / total_balance) * 100
        if ratio < sovereignty_min_pct:
            _flag("sovereignty_below_threshold", f"Sovereignty pool at {ratio:.1f}% (< {sovereignty_min_pct}%)", "high")

    infra_pool = pools.get("infrastructure")
    if infra_pool:
        balance = pool_balance(node_id, infra_pool.id)
        ratio = (balance / total_balance) * 100
        if ratio < infra_min_pct:
            _flag("infrastructure_below_threshold", f"Infrastructure pool at {ratio:.1f}% (< {infra_min_pct}%)", "medium")

    relief_requests_30d = ReliefRequest.query.filter(
        ReliefRequest.node_id == node_id,
        ReliefRequest.submitted_at >= datetime.utcnow() - timedelta(days=30),
    ).count()
    if relief_requests_30d > 20:
        _flag("relief_frequency_high", f"Relief requests in 30d: {relief_requests_30d}", "medium")

    db.session.commit()
    return flags


def compute_resilience_index(node_id, formula_version=1):
    pools = ImpactPool.query.filter_by(node_id=node_id).all()
    balances = [pool_balance(node_id, p.id) for p in pools]
    total_balance = sum(balances) or 1
    diversification = len([b for b in balances if b > 0]) / max(len(balances), 1)

    # Liquidity buffer ratio: total balance / avg monthly outflow (90d)
    since = datetime.utcnow() - timedelta(days=90)
    outflows = ImpactLedgerEntry.query.filter(
        ImpactLedgerEntry.node_id == node_id,
        ImpactLedgerEntry.created_at >= since,
        ImpactLedgerEntry.amount_cents < 0,
    ).all()
    monthly_outflow = (sum(-e.amount_cents for e in outflows) / 3) if outflows else 1
    liquidity_buffer = min(total_balance / monthly_outflow, 5.0) / 5.0

    # Revenue stability: 1 - (stddev/mean) of inflows across months (simple proxy)
    inflows = ImpactLedgerEntry.query.filter(
        ImpactLedgerEntry.node_id == node_id,
        ImpactLedgerEntry.created_at >= since,
        ImpactLedgerEntry.amount_cents > 0,
    ).all()
    monthly = defaultdict(int)
    for e in inflows:
        key = e.created_at.strftime("%Y-%m")
        monthly[key] += e.amount_cents
    values = list(monthly.values())
    if len(values) > 1:
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        stability = max(0.0, 1 - (variance ** 0.5) / (mean or 1))
    else:
        stability = 0.7

    relief_volatility = 1 - min(ReliefRequest.query.filter_by(node_id=node_id).count() / 50, 1)
    event_recurrence = min(len(inflows) / 20, 1)

    index_value = round((liquidity_buffer * 0.3) + (diversification * 0.2) + (stability * 0.2) + (relief_volatility * 0.15) + (event_recurrence * 0.15), 3)
    record = CapitalResilienceIndex(
        node_id=node_id,
        index_value=index_value,
        formula_version=formula_version,
        components_json={
            "liquidity_buffer": liquidity_buffer,
            "diversification": diversification,
            "revenue_stability": stability,
            "relief_volatility": relief_volatility,
            "event_recurrence": event_recurrence,
        },
    )
    db.session.add(record)
    db.session.commit()
    return record


def simulate_treasury(node_id, revenue_drop_pct, relief_surge_pct, ops_cost_increase_pct):
    pools = ImpactPool.query.filter_by(node_id=node_id).all()
    balances = {p.slug: pool_balance(node_id, p.id) for p in pools}

    # Baseline monthly net = 90d net / 3
    since = datetime.utcnow() - timedelta(days=90)
    net_by_pool = {}
    for pool in pools:
        entries = ImpactLedgerEntry.query.filter(
            ImpactLedgerEntry.node_id == node_id,
            ImpactLedgerEntry.pool_id == pool.id,
            ImpactLedgerEntry.created_at >= since,
        ).all()
        net_90d = sum(e.amount_cents for e in entries)
        net_by_pool[pool.slug] = net_90d / 3

    # Apply shocks
    for pool in pools:
        if pool.slug in ("sovereignty", "operations", "rotation_spotlight"):
            net_by_pool[pool.slug] *= (1 - revenue_drop_pct / 100)
        if pool.slug == "relief":
            net_by_pool[pool.slug] *= (1 - relief_surge_pct / 100)
        if pool.slug == "operations":
            net_by_pool[pool.slug] -= abs(net_by_pool[pool.slug]) * (ops_cost_increase_pct / 100)

    projections = {}
    for slug, balance in balances.items():
        monthly_net = net_by_pool.get(slug, 0)
        if monthly_net >= 0:
            horizon = 999
        else:
            horizon = int(balance / abs(monthly_net)) if balance > 0 else 0
        projections[slug] = {
            "monthly_net": int(monthly_net),
            "months_to_depletion": horizon,
        }

    sovereignty_ratio = (balances.get("sovereignty", 0) / (sum(balances.values()) or 1)) * 100
    breach_probability = 0.0 if sovereignty_ratio >= 15 else 0.6

    return {
        "projections": projections,
        "sustainability_horizon_months": min([v["months_to_depletion"] for v in projections.values()]) if projections else 0,
        "sovereignty_breach_probability": breach_probability,
    }
