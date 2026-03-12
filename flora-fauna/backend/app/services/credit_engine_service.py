from datetime import datetime, timedelta

from ..models import ImpactCreditTx, CreditDecayLog, GovernanceInfluenceSnapshot, TrustScore, db


DECAY_FORMULA_VERSION = 1
DECAY_RATE_PER_MONTH = 0.05  # 5% monthly decay
INFLUENCE_CAP = 1000
MAX_INFLUENCE_WEIGHT = 2.0
MAX_FUNDING_MULTIPLIER = 1.5


def _sum_credits(user_id, tx_type):
    return db.session.query(db.func.coalesce(db.func.sum(ImpactCreditTx.amount), 0)).filter_by(
        user_id=user_id, tx_type=tx_type
    ).scalar() or 0


def compute_summary(user_id):
    earned = _sum_credits(user_id, "earn")
    spent = _sum_credits(user_id, "spend")
    decayed = _sum_credits(user_id, "decay")
    balance = earned - spent - decayed
    influence = min(balance, INFLUENCE_CAP)
    weight = min(1 + (influence / INFLUENCE_CAP), MAX_INFLUENCE_WEIGHT)
    funding_multiplier = min(1 + (influence / INFLUENCE_CAP) * 0.5, MAX_FUNDING_MULTIPLIER)
    return {
        "earned": int(earned),
        "spent": int(spent),
        "decayed": int(decayed),
        "balance": int(balance),
        "influence": int(influence),
        "influence_weight": float(weight),
        "funding_cap_multiplier": float(funding_multiplier),
    }


def apply_decay(user_id, node_id):
    last_decay = ImpactCreditTx.query.filter_by(user_id=user_id, tx_type="decay").order_by(
        ImpactCreditTx.created_at.desc()
    ).first()
    if last_decay and last_decay.created_at and last_decay.created_at > datetime.utcnow() - timedelta(days=30):
        return None

    summary = compute_summary(user_id)
    balance = summary["balance"]
    if balance <= 0:
        return None

    decay_amount = int(balance * DECAY_RATE_PER_MONTH)
    if decay_amount <= 0:
        return None

    tx = ImpactCreditTx(
        user_id=user_id,
        node_id=node_id,
        tx_type="decay",
        amount=decay_amount,
        description="Monthly influence decay",
        source_type="decay",
    )
    db.session.add(tx)
    db.session.add(CreditDecayLog(
        user_id=user_id,
        amount=decay_amount,
        formula_version=DECAY_FORMULA_VERSION,
    ))
    db.session.commit()
    return tx


def compute_governance_weight(user_id):
    summary = compute_summary(user_id)
    trust = TrustScore.query.filter_by(user_id=user_id).first()
    trust_factor = trust.score if trust else 1.0
    weight = summary["influence_weight"] * min(trust_factor / 100, 1.5)
    snapshot = GovernanceInfluenceSnapshot(
        user_id=user_id,
        influence_score=weight,
        cap_applied=summary["balance"] >= INFLUENCE_CAP,
    )
    db.session.add(snapshot)
    db.session.commit()
    return weight


def award_credit(user_id, node_id, amount, source_type, description, reference_id=None):
    if amount <= 0:
        return None
    tx = ImpactCreditTx(
        user_id=user_id,
        node_id=node_id,
        tx_type="earn",
        amount=amount,
        description=description,
        source_type=source_type,
        reference_id=reference_id,
    )
    db.session.add(tx)
    db.session.commit()
    return tx
