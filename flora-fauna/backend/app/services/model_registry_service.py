from datetime import datetime, timedelta

from ..models import ModelDefinition, ModelConfig, ModelRunLog, AuditRecord, db
from .circuit_breaker_service import check_anomaly, trigger_circuit_breaker


def ensure_model_definitions(definitions):
    for definition in definitions:
        existing = ModelDefinition.query.filter_by(
            key=definition["key"],
            version=definition["version"],
        ).first()
        if not existing:
            db.session.add(ModelDefinition(**definition))
        else:
            # Keep seeded interface metadata in sync for existing definitions
            updated = False
            for key in (
                "required_inputs",
                "min_sample_size",
                "uncertainty_format",
                "convexity_property",
                "fallback_mode",
                "complexity_bound",
                "update_policy",
            ):
                if getattr(existing, key, None) in (None, [], "") and key in definition:
                    setattr(existing, key, definition.get(key))
                    updated = True
            if updated:
                db.session.add(existing)
    db.session.commit()


def list_models():
    return ModelDefinition.query.order_by(ModelDefinition.key.asc(), ModelDefinition.version.desc()).all()


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
        if spec.get("type") == "integer" and not isinstance(value, int):
            return False, f"{key} must be integer"
        if spec.get("type") == "boolean" and not isinstance(value, bool):
            return False, f"{key} must be boolean"
        if spec.get("minimum") is not None and value < spec["minimum"]:
            return False, f"{key} below minimum"
        if spec.get("maximum") is not None and value > spec["maximum"]:
            return False, f"{key} above maximum"
    return True, None


def validate_model_interface(definition):
    if not definition.required_inputs:
        return False, "Model interface missing required_inputs"
    if not isinstance(definition.required_inputs, list):
        return False, "Model interface required_inputs must be list"
    if not definition.min_sample_size or definition.min_sample_size < 1:
        return False, "Model interface missing min_sample_size"
    if not definition.uncertainty_format:
        return False, "Model interface missing uncertainty_format"
    if not definition.fallback_mode:
        return False, "Model interface missing fallback_mode"
    if not definition.complexity_bound:
        return False, "Model interface missing complexity_bound"
    if not definition.update_policy:
        return False, "Model interface missing update_policy"
    return True, None


def _spectral_radius(matrix, iterations=50):
    if not matrix:
        return 0.0
    n = len(matrix)
    vec = [1.0] * n
    for _ in range(iterations):
        next_vec = [0.0] * n
        for i in range(n):
            row = matrix[i]
            for j, val in enumerate(row):
                next_vec[i] += val * vec[j]
        norm = max(abs(v) for v in next_vec) or 1e-9
        vec = [v / norm for v in next_vec]
    # Rayleigh quotient approximation
    num = 0.0
    den = 0.0
    for i in range(n):
        row = matrix[i]
        dot = 0.0
        for j, val in enumerate(row):
            dot += val * vec[j]
        num += vec[i] * dot
        den += vec[i] * vec[i]
    if den == 0:
        return 0.0
    return abs(num / den)


def enforce_spectral_radius(params, delta=0.01):
    if not params:
        return True, None
    matrix = params.get("state_matrix")
    if matrix is None:
        return True, None
    if not isinstance(matrix, list) or not matrix:
        return False, "state_matrix must be non-empty list"
    for row in matrix:
        if not isinstance(row, list) or len(row) != len(matrix):
            return False, "state_matrix must be square"
    radius = _spectral_radius(matrix)
    if radius >= 1 - delta:
        return False, f"spectral_radius_violation: {radius:.4f} >= {1 - delta:.4f}"
    return True, None


def _default_params_from_schema(schema):
    props = schema.get("properties", {}) if schema else {}
    defaults = {}
    for key, spec in props.items():
        if "default" in spec:
            defaults[key] = spec["default"]
        elif spec.get("minimum") is not None:
            defaults[key] = spec["minimum"]
        elif spec.get("type") == "boolean":
            defaults[key] = False
        elif spec.get("type") in ("number", "integer"):
            defaults[key] = 0
    return defaults


def activate_model(key, version, params, actor_id=None, node_id=None, notes=None, backtest_report=None, calibration_report=None):
    definition = ModelDefinition.query.filter_by(key=key, version=version).first()
    if not definition:
        raise ValueError("Model definition not found")
    ok, err = validate_model_interface(definition)
    if not ok:
        raise ValueError(err)
    ok, err = validate_params(definition.param_schema or {}, params or {})
    if not ok:
        raise ValueError(err)
    delta = (params or {}).get("spectral_margin", 0.01)
    ok, err = enforce_spectral_radius(params or {}, delta=delta)
    if not ok:
        raise ValueError(err)
    if definition.requires_backtest and not backtest_report:
        raise ValueError("Backtest report required")
    if definition.requires_calibration and not calibration_report:
        raise ValueError("Calibration report required")
    cooling_until = datetime.utcnow() + timedelta(days=definition.cooling_period_days or 0)
    existing = ModelConfig.query.filter_by(key=key, node_id=node_id, active=True).all()
    for cfg in existing:
        cfg.active = False
    config = ModelConfig(
        key=key,
        version=version,
        params_json=params or {},
        activated_by_user_id=actor_id,
        activated_at=datetime.utcnow(),
        node_id=node_id,
        notes=notes,
        cooling_until=cooling_until,
        backtest_report_json=backtest_report,
        calibration_report_json=calibration_report,
        active=True,
        is_stable=(definition.cooling_period_days or 0) == 0,
    )
    db.session.add(config)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="model_config_activated",
        entity_type="model_config",
        entity_id=f"{key}:{version}",
        payload={"node_id": node_id, "params": params},
    ))
    db.session.commit()
    return config


def resolve_model_params(key, node_id=None):
    query = ModelConfig.query.filter_by(key=key, active=True)
    if node_id is not None:
        node_cfg = query.filter_by(node_id=node_id).order_by(ModelConfig.activated_at.desc()).first()
        if node_cfg:
            return node_cfg.params_json or {}, node_cfg.version
    cfg = query.filter_by(node_id=None).order_by(ModelConfig.activated_at.desc()).first()
    if cfg:
        return cfg.params_json or {}, cfg.version
    definition = ModelDefinition.query.filter_by(key=key).order_by(ModelDefinition.version.desc()).first()
    if definition:
        return _default_params_from_schema(definition.param_schema or {}), definition.version
    return {}, 1


def promote_model_stability(config_id, actor_id=None):
    config = ModelConfig.query.get(config_id)
    if not config:
        raise ValueError("Model config not found")
    config.is_stable = True
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="model_config_promoted",
        entity_type="model_config",
        entity_id=str(config_id),
    ))
    db.session.commit()
    return config


def log_model_run(key, version, input_hash, context=None, actor_id=None, output_value=None):
    if context is None:
        context = {}
    if output_value is not None:
        context = dict(context)
        context["value"] = output_value
    anomalous = False
    stats = None
    if output_value is not None:
        anomalous, stats = check_anomaly(key, output_value)

    run = ModelRunLog(
        key=key,
        version=version,
        input_snapshot_hash=input_hash,
        run_context_json=context or {},
        actor_user_id=actor_id,
    )
    db.session.add(run)
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="model_run_logged",
        entity_type="model",
        entity_id=f"{key}:{version}",
        payload={"input_hash": input_hash},
    ))
    db.session.commit()
    if output_value is not None and anomalous:
        trigger_circuit_breaker(key, actor_id=actor_id, stats=stats)
