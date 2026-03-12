"""Escrow service for event revenue management.

Event revenue is held in escrow until post-event settlement.
Incident flags block release. No manual override without governance audit record.
"""
from datetime import datetime, timedelta

from ..models import (
    EscrowRecord, EscrowSettlement, Incident, CrisisMode,
    AuditLog, db,
)
from .ledger_service import ensure_pool, append_entry
from .sovereignty_service import compute_auto_split


def create_escrow(node_id, event_id, organizer_id, amount_cents, timeout_days=30):
    """Create an escrow record for event revenue."""
    # Check crisis mode
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    if crisis and crisis.is_active and crisis.escrow_frozen:
        raise ValueError("Escrow creation is frozen during crisis mode")

    escrow = EscrowRecord(
        node_id=node_id,
        event_id=event_id,
        organizer_id=organizer_id,
        total_amount_cents=amount_cents,
        status="held",
        timeout_at=datetime.utcnow() + timedelta(days=timeout_days),
    )
    db.session.add(escrow)
    db.session.commit()
    return escrow


def check_incident_flag(escrow_id):
    """Check if any incident blocks this escrow release."""
    escrow = EscrowRecord.query.get(escrow_id)
    if not escrow:
        return False
    incidents = Incident.query.filter_by(
        event_id=escrow.event_id,
        escrow_frozen=True,
    ).filter(Incident.status.in_(["open", "investigating"])).all()
    if incidents:
        escrow.incident_flag = True
        escrow.status = "frozen"
        db.session.commit()
        return True
    return False


def release_escrow(escrow_id, approved_by, audit_reason="Post-event settlement"):
    """Release escrow and perform auto-split into pools."""
    escrow = EscrowRecord.query.get(escrow_id)
    if not escrow:
        raise ValueError("Escrow record not found")
    if escrow.status not in ("held",):
        raise ValueError(f"Cannot release escrow in status '{escrow.status}'")
    if escrow.incident_flag:
        raise ValueError("Escrow is flagged due to incident; cannot release without governance review")

    # Check crisis mode
    crisis = CrisisMode.query.filter_by(node_id=escrow.node_id).first()
    if crisis and crisis.is_active and crisis.escrow_frozen:
        raise ValueError("Escrow release is frozen during crisis mode")

    # Compute splits
    splits = compute_auto_split(escrow.node_id, escrow.total_amount_cents)

    settlements = []
    for pool_slug, amount in splits.items():
        if amount <= 0:
            continue
        pool = ensure_pool(escrow.node_id, pool_slug, pool_slug.replace("_", " ").title() + " Pool")
        settlement = EscrowSettlement(
            escrow_id=escrow.id,
            pool_id=pool.id,
            amount_cents=amount,
            settlement_type="pool_allocation",
        )
        db.session.add(settlement)
        settlements.append(settlement)
        append_entry(
            node_id=escrow.node_id,
            pool_id=pool.id,
            entry_type="credit",
            amount_cents=amount,
            description=f"Escrow settlement: {pool_slug}",
            reference_id=str(escrow.id),
            reference_type="escrow_settlement",
            created_by=approved_by,
        )

    escrow.status = "settled"
    escrow.release_approved_by = approved_by
    escrow.release_approved_at = datetime.utcnow()

    # Audit log
    audit = AuditLog(
        event="escrow_released",
        actor_id=approved_by,
        entity_type="escrow_record",
        entity_id=str(escrow.id),
        metadata_json={"reason": audit_reason, "splits": splits},
        node_id=escrow.node_id,
    )
    db.session.add(audit)
    db.session.commit()
    return escrow, settlements


def freeze_escrow_for_incident(escrow_id, incident_id):
    """Freeze an escrow due to an incident."""
    escrow = EscrowRecord.query.get(escrow_id)
    if not escrow:
        raise ValueError("Escrow record not found")
    escrow.incident_flag = True
    escrow.status = "frozen"
    db.session.commit()
    return escrow


def check_timeout(escrow_id):
    """Check if escrow has timed out and handle accordingly."""
    escrow = EscrowRecord.query.get(escrow_id)
    if not escrow:
        return None
    if escrow.status == "held" and escrow.timeout_at and datetime.utcnow() > escrow.timeout_at:
        if not escrow.incident_flag:
            escrow.status = "timed_out"
            db.session.commit()
    return escrow
