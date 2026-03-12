from datetime import datetime, timezone
from ..models import ImpactLedgerEntry, ImpactPool, db


def get_pool_by_slug(node_id, slug):
    return ImpactPool.query.filter_by(node_id=node_id, slug=slug).first()


def ensure_pool(node_id, slug, name, description="", category="general", created_by=None):
    pool = get_pool_by_slug(node_id, slug)
    if pool:
        return pool
    pool = ImpactPool(
        node_id=node_id,
        slug=slug,
        name=name,
        description=description,
        category=category,
        created_by=created_by,
    )
    db.session.add(pool)
    db.session.commit()
    return pool


def append_entry(node_id, pool_id, entry_type, amount_cents, description, reference_id=None, reference_type=None, reversal_of=None, created_by=None):
    entry = ImpactLedgerEntry(
        node_id=node_id,
        pool_id=pool_id,
        entry_type=entry_type,
        amount_cents=amount_cents,
        description=description,
        reference_id=reference_id,
        reference_type=reference_type,
        reversal_of=reversal_of,
        created_by=created_by,
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(entry)
    db.session.commit()
    return entry


def reversal_entry(node_id, pool_id, original_entry, reason, created_by=None):
    return append_entry(
        node_id=node_id,
        pool_id=pool_id,
        entry_type="reversal",
        amount_cents=-abs(original_entry.amount_cents),
        description=reason,
        reference_id=str(original_entry.id),
        reference_type="ledger_reversal",
        reversal_of=original_entry.id,
        created_by=created_by,
    )


def pool_balance(node_id, pool_id):
    credits = db.session.query(db.func.sum(ImpactLedgerEntry.amount_cents)).filter_by(node_id=node_id, pool_id=pool_id).scalar() or 0
    return credits
