from ..models import ImpactCreditTx, db


def award_credits(user_id, node_id, amount, description, reference_id=None):
    tx = ImpactCreditTx(
        user_id=user_id,
        node_id=node_id,
        tx_type="award",
        amount=amount,
        description=description,
        reference_id=reference_id,
    )
    db.session.add(tx)
    db.session.commit()
    return tx


def balance(user_id):
    total = db.session.query(db.func.sum(ImpactCreditTx.amount)).filter_by(user_id=user_id).scalar() or 0
    return total
