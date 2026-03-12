from datetime import datetime, timedelta

from ..models import (
    SovereigntyIndex,
    SovereigntyIndexConfig,
    ImpactPool,
    ImpactLedgerEntry,
    InfrastructureAsset,
    Vendor,
    Certification,
    GovernanceVote,
    Incident,
    User,
    db,
)
from .ledger_service import pool_balance


FORMULA_VERSION = 1


def _ratio(value, max_value):
    if max_value <= 0:
        return 0.0
    return min(value / max_value, 1.0)


def compute_index(node_id, formula_version=FORMULA_VERSION):
    pools = ImpactPool.query.filter_by(node_id=node_id).all()
    balances = [pool_balance(node_id, p.id) for p in pools]
    total_balance = sum(balances)
    target_total = sum(p.target_amount_cents or 0 for p in pools) or 1
    treasury_strength = _ratio(total_balance, target_total)

    infra_assets = InfrastructureAsset.query.all()
    infra_value = sum((a.capex_cents or 0) for a in infra_assets) if infra_assets else 0
    infra_component = _ratio(infra_value, max(target_total, 1))

    total_users = User.query.count() or 1
    certified_users = Certification.query.filter_by(status="active").distinct(Certification.user_id).count()
    cert_penetration = _ratio(certified_users, total_users)

    vendor_density = _ratio(Vendor.query.count(), max(total_users, 1))

    since = datetime.utcnow() - timedelta(days=90)
    governance_participation = _ratio(
        GovernanceVote.query.filter(GovernanceVote.created_at >= since).count(),
        max(total_users, 1),
    )

    incidents = Incident.query.filter(Incident.created_at >= since).count()
    risk_stability = max(0.0, 1.0 - min(incidents / 25, 1.0))

    index_value = round(
        (treasury_strength * 0.3)
        + (infra_component * 0.15)
        + (cert_penetration * 0.2)
        + (vendor_density * 0.1)
        + (governance_participation * 0.15)
        + (risk_stability * 0.1),
        4,
    )

    record = SovereigntyIndex(
        node_id=node_id,
        index_value=index_value,
        formula_version=formula_version,
        components_json={
            "treasury_strength": treasury_strength,
            "infrastructure_assets": infra_component,
            "certification_penetration": cert_penetration,
            "vendor_density": vendor_density,
            "governance_participation": governance_participation,
            "risk_stability": risk_stability,
        },
    )
    db.session.add(record)
    db.session.commit()
    return record


def get_visibility_config(node_id):
    config = SovereigntyIndexConfig.query.filter_by(node_id=node_id).first()
    if not config:
        config = SovereigntyIndexConfig(node_id=node_id, public_visible=False)
        db.session.add(config)
        db.session.commit()
    return config


def set_visibility(node_id, public_visible):
    config = get_visibility_config(node_id)
    config.public_visible = bool(public_visible)
    db.session.commit()
    return config
