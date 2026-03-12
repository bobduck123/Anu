from datetime import datetime

from ..models import MetricDefinition, MetricRunLog, AuditRecord, db


def ensure_metric_definitions(definitions):
    for definition in definitions:
        existing = MetricDefinition.query.filter_by(
            key=definition["key"],
            version=definition["version"],
        ).first()
        if not existing:
            db.session.add(MetricDefinition(**definition))
    db.session.commit()


def list_metrics():
    return MetricDefinition.query.order_by(MetricDefinition.key.asc(), MetricDefinition.version.desc()).all()


def validate_params(schema, params):
    required = schema.get("required", [])
    props = schema.get("properties", {})
    for key in required:
        if key not in params:
            return False, f"Missing required param {key}"
    for key, spec in props.items():
        if key not in params:
            continue
        value = params[key]
        if spec.get("type") == "number" and not isinstance(value, (int, float)):
            return False, f"{key} must be number"
        if spec.get("minimum") is not None and value < spec["minimum"]:
            return False, f"{key} below minimum"
        if spec.get("maximum") is not None and value > spec["maximum"]:
            return False, f"{key} above maximum"
    return True, None


def log_metric_run(key, version, input_hash, context=None, actor_id=None):
    db.session.add(MetricRunLog(
        key=key,
        version=version,
        input_snapshot_hash=input_hash,
        run_context_json=context or {},
        actor_user_id=actor_id,
    ))
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="metric_run_logged",
        entity_type="metric",
        entity_id=f"{key}:{version}",
        payload={"input_hash": input_hash},
    ))
    db.session.commit()
