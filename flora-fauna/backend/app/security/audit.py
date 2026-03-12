from flask import request

from ..models import AuditLog, db


def audit(event, actor_id=None, entity_type=None, entity_id=None, metadata=None, node_id=None, sensitive_read=False):
    entry = AuditLog(
        event=event,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        metadata_json=metadata,
        node_id=node_id,
        sensitive_read=sensitive_read,
        ip_address=request.remote_addr if request else None,
    )
    db.session.add(entry)
    db.session.commit()
    return entry


def audit_read(entity_type, entity_id, actor_id=None, node_id=None, metadata=None):
    return audit(
        event="sensitive_read",
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata,
        node_id=node_id,
        sensitive_read=True,
    )
