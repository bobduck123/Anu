"""Crisis mode service.

Provides read-only mode toggle, event submission freeze, escrow freeze,
high-risk event block, and governance emergency trigger.
All activations are permissioned and logged.
"""
from datetime import datetime

from ..models import CrisisMode, AuditLog, db


def get_crisis_state(node_id):
    """Get or create crisis mode state for a node."""
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    if not crisis:
        crisis = CrisisMode(node_id=node_id)
        db.session.add(crisis)
        db.session.commit()
    return crisis


def activate_crisis(node_id, activated_by, reason=None,
                    read_only=True, event_freeze=True,
                    escrow_freeze=True, high_risk_block=True):
    """Activate crisis mode for a node."""
    crisis = get_crisis_state(node_id)
    crisis.is_active = True
    crisis.read_only = read_only
    crisis.event_submission_frozen = event_freeze
    crisis.escrow_frozen = escrow_freeze
    crisis.high_risk_blocked = high_risk_block
    crisis.activated_by = activated_by
    crisis.activated_at = datetime.utcnow()
    crisis.deactivated_at = None
    crisis.reason = reason

    audit = AuditLog(
        event="crisis_mode_activated",
        actor_id=activated_by,
        entity_type="crisis_mode",
        entity_id=str(crisis.id),
        metadata_json={
            "reason": reason,
            "read_only": read_only,
            "event_freeze": event_freeze,
            "escrow_freeze": escrow_freeze,
            "high_risk_block": high_risk_block,
        },
        node_id=node_id,
    )
    db.session.add(audit)
    db.session.commit()
    return crisis


def deactivate_crisis(node_id, deactivated_by, reason=None):
    """Deactivate crisis mode for a node."""
    crisis = get_crisis_state(node_id)
    crisis.is_active = False
    crisis.read_only = False
    crisis.event_submission_frozen = False
    crisis.escrow_frozen = False
    crisis.high_risk_blocked = False
    crisis.deactivated_at = datetime.utcnow()

    audit = AuditLog(
        event="crisis_mode_deactivated",
        actor_id=deactivated_by,
        entity_type="crisis_mode",
        entity_id=str(crisis.id),
        metadata_json={"reason": reason},
        node_id=node_id,
    )
    db.session.add(audit)
    db.session.commit()
    return crisis


def is_crisis_active(node_id):
    """Quick check if crisis mode is active."""
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    return crisis.is_active if crisis else False


def is_event_submission_frozen(node_id):
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    return crisis.event_submission_frozen if crisis and crisis.is_active else False


def is_escrow_frozen(node_id):
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    return crisis.escrow_frozen if crisis and crisis.is_active else False


def is_high_risk_blocked(node_id):
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    return crisis.high_risk_blocked if crisis and crisis.is_active else False
