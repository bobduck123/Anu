import hashlib
import json

from ..models import EventPrimitive


def _snapshot_hash(events):
    payload = json.dumps(events, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def replay_events(event_types=None, node_id=None):
    query = EventPrimitive.query
    if event_types:
        query = query.filter(EventPrimitive.event_type.in_(event_types))
    if node_id:
        query = query.filter_by(node_id=node_id)
    events = query.order_by(EventPrimitive.timestamp.asc()).all()
    normalized = [{
        "t": e.timestamp.isoformat(),
        "actor": e.actor_id,
        "entity": {"type": e.entity_type, "id": e.entity_id},
        "type": e.event_type,
        "props": e.props or {},
        "node": e.node_id,
        "consent": e.consent,
        "signature": e.signature,
    } for e in events]
    return normalized, _snapshot_hash(normalized)
