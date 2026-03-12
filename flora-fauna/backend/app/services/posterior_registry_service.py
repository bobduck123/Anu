import hashlib
import json

from ..models import PosteriorRecord, PosteriorUpdateEvent, AuditRecord, db


def _snapshot_hash(payload):
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _apply_delta(current, delta):
    if current is None:
        current = {}
    updated = dict(current)
    for key, value in (delta or {}).items():
        if isinstance(value, dict) and isinstance(updated.get(key), dict):
            updated[key] = _apply_delta(updated.get(key), value)
        elif isinstance(value, (int, float)) and isinstance(updated.get(key), (int, float)):
            updated[key] = updated.get(key, 0) + value
        else:
            updated[key] = value
    return updated


def update_posterior(model_key, posterior_key, subject_id, node_id, formula_version, delta_params, evidence_hash, actor_id=None):
    event = PosteriorUpdateEvent(
        posterior_key=posterior_key,
        model_key=model_key,
        subject_id=subject_id,
        node_id=node_id,
        formula_version=formula_version,
        delta_params_json=delta_params,
        evidence_hash=evidence_hash,
    )
    db.session.add(event)
    record = PosteriorRecord.query.filter_by(posterior_key=posterior_key, subject_id=subject_id).first()
    if not record:
        record = PosteriorRecord(posterior_key=posterior_key, subject_id=subject_id, node_id=node_id)
        db.session.add(record)
    record.version = formula_version
    record.params_json = _apply_delta(record.params_json or {}, delta_params or {})
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="posterior_update",
        entity_type="posterior",
        entity_id=f"{posterior_key}:{subject_id}",
        payload={"evidence_hash": evidence_hash, "model_key": model_key},
    ))
    db.session.commit()
    return record


def get_posterior(posterior_key, subject_id):
    return PosteriorRecord.query.filter_by(posterior_key=posterior_key, subject_id=subject_id).first()
