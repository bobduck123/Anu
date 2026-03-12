import statistics
from datetime import datetime

from ..models import ModelRunLog, ModelConfig, EventPrimitive, AuditRecord, db


def check_anomaly(model_key, new_value, sigma_threshold=5.0):
    history = ModelRunLog.query.filter_by(key=model_key).order_by(ModelRunLog.created_at.desc()).limit(100).all()
    values = []
    for row in history:
        value = (row.run_context_json or {}).get("value")
        if isinstance(value, (int, float)):
            values.append(value)
    if len(values) < 5:
        return False, None
    mean = statistics.mean(values)
    stdev = statistics.pstdev(values) or 1e-6
    if abs(new_value - mean) > sigma_threshold * stdev:
        return True, {"mean": mean, "stdev": stdev}
    return False, None


def trigger_circuit_breaker(model_key, actor_id=None, stats=None):
    current = ModelConfig.query.filter_by(key=model_key, active=True).order_by(ModelConfig.activated_at.desc()).first()
    stable = ModelConfig.query.filter_by(key=model_key, is_stable=True).order_by(ModelConfig.activated_at.desc()).first()
    if current and stable and current.id != stable.id:
        current.active = False
        stable.active = True
    db.session.add(EventPrimitive(
        event_type="MODEL_ANOMALY",
        props={"model_key": model_key, "stats": stats or {}},
    ))
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="model_circuit_breaker_triggered",
        entity_type="model_config",
        entity_id=model_key,
        payload=stats or {},
    ))
    db.session.commit()
    return stable
