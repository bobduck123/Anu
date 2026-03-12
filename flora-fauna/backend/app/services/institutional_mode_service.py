from datetime import datetime

from ..models import InstitutionalModeConfig, ExternalObserverSeat, GovernanceVote, AuditRecord, db


def get_config(node_id):
    if node_id is None:
        node_id = 1
    config = InstitutionalModeConfig.query.filter_by(node_id=node_id).first()
    if not config:
        config = InstitutionalModeConfig(node_id=node_id)
        db.session.add(config)
        db.session.commit()
    return config


def set_config(node_id, payload, actor_id=None):
    config = get_config(node_id)
    config.enabled = bool(payload.get("enabled", config.enabled))
    config.quorum_min = int(payload.get("quorum_min", config.quorum_min or 2))
    config.external_observer_enabled = bool(payload.get("external_observer_enabled", config.external_observer_enabled))
    config.extended_audit_logging = bool(payload.get("extended_audit_logging", config.extended_audit_logging))
    config.worm_audit_suggestion = bool(payload.get("worm_audit_suggestion", config.worm_audit_suggestion))
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="institutional_mode_updated",
        entity_type="institutional_mode_config",
        entity_id=str(config.node_id),
        payload={
            "enabled": config.enabled,
            "quorum_min": config.quorum_min,
            "external_observer_enabled": config.external_observer_enabled,
        },
    ))
    db.session.commit()
    return config


def create_observer(node_id, name, organization=None, email=None, actor_id=None):
    seat = ExternalObserverSeat(
        node_id=node_id,
        name=name,
        organization=organization,
        email=email,
        active=True,
    )
    db.session.add(seat)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="external_observer_created",
        entity_type="external_observer_seat",
        entity_id=str(seat.id),
    ))
    db.session.commit()
    return seat


def export_governance_votes(node_id):
    votes = GovernanceVote.query.order_by(GovernanceVote.created_at.desc()).limit(500).all()
    payload = [{
        "proposal_type": vote.proposal_type,
        "proposal_id": vote.proposal_id,
        "vote": vote.vote,
        "weight": vote.weight,
        "created_at": vote.created_at.isoformat() if vote.created_at else None,
    } for vote in votes]
    return {
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "votes": payload,
    }
