from datetime import datetime

from ..models import FormulaDefinition, FormulaConfig, FormulaRunLog, AuditRecord, db


def _validate_params(schema, params):
    if not schema:
        return True, None
    required = schema.get("required", [])
    properties = schema.get("properties", {})
    for key in required:
        if key not in params:
            return False, f"Missing required param: {key}"
    for key, value in params.items():
        spec = properties.get(key, {})
        expected = spec.get("type")
        if expected == "number" and not isinstance(value, (int, float)):
            return False, f"Param {key} must be number"
        if expected == "integer" and not isinstance(value, int):
            return False, f"Param {key} must be integer"
        if expected == "string" and not isinstance(value, str):
            return False, f"Param {key} must be string"
        if expected == "boolean" and not isinstance(value, bool):
            return False, f"Param {key} must be boolean"
        if expected == "object" and not isinstance(value, dict):
            return False, f"Param {key} must be object"
        if expected == "array" and not isinstance(value, list):
            return False, f"Param {key} must be array"
    return True, None


def ensure_defaults(definitions):
    for definition in definitions:
        existing = FormulaDefinition.query.filter_by(
            key=definition["key"],
            version=definition["version"],
        ).first()
        if not existing:
            db.session.add(FormulaDefinition(**definition))
    db.session.commit()


def get_active_config(key, node_id=None):
    query = FormulaConfig.query.filter_by(key=key)
    if node_id is not None:
        node_specific = query.filter_by(node_id=node_id).order_by(FormulaConfig.activated_at.desc()).first()
        if node_specific:
            return node_specific
    return query.filter_by(node_id=None).order_by(FormulaConfig.activated_at.desc()).first()


def get_definition(key, version):
    return FormulaDefinition.query.filter_by(key=key, version=version).first()


def activate_formula(key, version, params, actor_id=None, node_id=None, notes=None):
    definition = get_definition(key, version)
    if not definition:
        raise ValueError("Formula definition not found")
    ok, err = _validate_params(definition.json_schema or {}, params or {})
    if not ok:
        raise ValueError(err)
    config = FormulaConfig(
        key=key,
        version=version,
        params_json=params or {},
        activated_by_user_id=actor_id,
        activated_at=datetime.utcnow(),
        node_id=node_id,
        notes=notes,
    )
    db.session.add(config)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="formula_config_activated",
        entity_type="formula_config",
        entity_id=f"{key}:{version}",
        payload={"node_id": node_id, "params": params},
    ))
    db.session.commit()
    return config


def resolve_params(key, node_id=None):
    config = get_active_config(key, node_id=node_id)
    if config:
        return config.params_json or {}, config.version
    definition = FormulaDefinition.query.filter_by(key=key).order_by(FormulaDefinition.version.desc()).first()
    if definition:
        return definition.default_params_json or {}, definition.version
    return {}, 1


def log_run(key, version, context=None, actor_id=None):
    entry = FormulaRunLog(
        key=key,
        version=version,
        run_context_json=context or {},
        actor_user_id=actor_id,
    )
    db.session.add(entry)
    db.session.commit()
    return entry
