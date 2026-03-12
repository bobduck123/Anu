-- Organiser Intelligence Layer schema migration (manual SQL)
-- Apply with your migration tool of choice (Alembic recommended).

CREATE TABLE IF NOT EXISTS formula_definition (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    version INTEGER NOT NULL,
    json_schema JSON,
    default_params_json JSON,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (key, version)
);

CREATE TABLE IF NOT EXISTS formula_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL,
    params_json JSON,
    activated_by_user_id INTEGER,
    activated_at TIMESTAMP DEFAULT NOW(),
    node_id INTEGER,
    notes VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS formula_run_log (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL,
    run_context_json JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    actor_user_id INTEGER
);

CREATE TABLE IF NOT EXISTS metric_definition (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    version INTEGER NOT NULL,
    required_event_types JSON,
    param_schema JSON,
    output_units VARCHAR(120),
    confidence_method VARCHAR(120),
    audit_behavior VARCHAR(120),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (key, version)
);

CREATE TABLE IF NOT EXISTS metric_run_log (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL,
    input_snapshot_hash VARCHAR(128),
    run_context_json JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    actor_user_id INTEGER
);

CREATE TABLE IF NOT EXISTS model_definition (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    version INTEGER NOT NULL,
    param_schema JSON,
    output_units VARCHAR(120),
    confidence_method VARCHAR(120),
    requires_backtest BOOLEAN DEFAULT TRUE,
    requires_calibration BOOLEAN DEFAULT TRUE,
    cooling_period_days INTEGER DEFAULT 7,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (key, version)
);

CREATE TABLE IF NOT EXISTS model_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL,
    params_json JSON,
    activated_by_user_id INTEGER,
    activated_at TIMESTAMP DEFAULT NOW(),
    node_id INTEGER,
    notes VARCHAR(500),
    cooling_until TIMESTAMP,
    backtest_report_json JSON,
    calibration_report_json JSON,
    active BOOLEAN DEFAULT TRUE,
    is_stable BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS model_run_log (
    id SERIAL PRIMARY KEY,
    key VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL,
    input_snapshot_hash VARCHAR(128),
    run_context_json JSON,
    created_at TIMESTAMP DEFAULT NOW(),
    actor_user_id INTEGER
);

CREATE TABLE IF NOT EXISTS event_primitive (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    actor_id INTEGER,
    entity_type VARCHAR(120),
    entity_id VARCHAR(120),
    event_type VARCHAR(120) NOT NULL,
    props JSON,
    node_id INTEGER,
    consent BOOLEAN DEFAULT TRUE,
    signature VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS posterior_record (
    id SERIAL PRIMARY KEY,
    posterior_key VARCHAR(120) NOT NULL,
    subject_id INTEGER,
    node_id INTEGER,
    version INTEGER DEFAULT 1,
    params_json JSON,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (posterior_key, subject_id)
);

CREATE TABLE IF NOT EXISTS posterior_update_event (
    id SERIAL PRIMARY KEY,
    posterior_key VARCHAR(120) NOT NULL,
    subject_id INTEGER,
    node_id INTEGER,
    version INTEGER DEFAULT 1,
    payload_json JSON,
    input_snapshot_hash VARCHAR(128),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epsilon_budget (
    id SERIAL PRIMARY KEY,
    node_id INTEGER,
    epsilon_total FLOAT DEFAULT 1.0,
    epsilon_spent FLOAT DEFAULT 0.0,
    epsilon_annual_limit FLOAT DEFAULT 1.0,
    annual_reset_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS epsilon_consumption (
    id SERIAL PRIMARY KEY,
    node_id INTEGER,
    epsilon FLOAT DEFAULT 0.0,
    purpose VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competency_domain (
    id SERIAL PRIMARY KEY,
    node_id INTEGER,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    node_scope VARCHAR(40) DEFAULT 'node',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competency_node (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL,
    slug VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    proficiency_scale JSON,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (domain_id, slug)
);

CREATE TABLE IF NOT EXISTS competency_edge (
    id SERIAL PRIMARY KEY,
    parent_node_id INTEGER NOT NULL,
    child_node_id INTEGER NOT NULL,
    edge_type VARCHAR(80) DEFAULT 'prerequisite',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organiser_competency_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    proficiency_level FLOAT DEFAULT 0.0,
    confidence_score FLOAT DEFAULT 0.0,
    details_json JSON,
    last_updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, node_id)
);

CREATE TABLE IF NOT EXISTS competency_evidence (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    evidence_type VARCHAR(80) NOT NULL,
    ref_type VARCHAR(80),
    ref_id VARCHAR(120),
    weight FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS peer_endorsement (
    id SERIAL PRIMARY KEY,
    endorser_user_id INTEGER NOT NULL,
    endorsed_user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    rating INTEGER DEFAULT 3,
    note VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_decay_record (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    decay_amount FLOAT DEFAULT 0.0,
    formula_version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS needs_signal (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL,
    domain_id INTEGER,
    competency_node_id INTEGER,
    severity_0_100 INTEGER DEFAULT 0,
    reason_codes_json JSON,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    created_by_system BOOLEAN DEFAULT TRUE,
    visible_level VARCHAR(40) DEFAULT 'organizer'
);

CREATE TABLE IF NOT EXISTS needs_signal_input_snapshot (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL,
    snapshot_json JSON,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organiser_performance_snapshot (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    events_created INTEGER DEFAULT 0,
    events_completed INTEGER DEFAULT 0,
    completion_rate FLOAT DEFAULT 0.0,
    attendance_avg FLOAT DEFAULT 0.0,
    retention_rate FLOAT DEFAULT 0.0,
    budget_variance_pct FLOAT DEFAULT 0.0,
    incident_count INTEGER DEFAULT 0,
    compliance_checklist_pass_rate FLOAT DEFAULT 0.0,
    feedback_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    formula_version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS guild (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL,
    type VARCHAR(80) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_membership (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role_in_guild VARCHAR(80) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guild_rotation (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    role_name VARCHAR(120) NOT NULL,
    current_user_id INTEGER,
    starts_at TIMESTAMP DEFAULT NOW(),
    ends_at TIMESTAMP,
    rotation_policy_json JSON
);

CREATE TABLE IF NOT EXISTS guild_goal (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    metric_key VARCHAR(120) NOT NULL,
    target_value FLOAT DEFAULT 0.0,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_performance_snapshot (
    id SERIAL PRIMARY KEY,
    guild_id INTEGER NOT NULL,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    metrics_json JSON,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collision_check (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    score FLOAT DEFAULT 0.0,
    reasons_json JSON,
    formula_version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    acknowledged_by_user_id INTEGER
);

CREATE TABLE IF NOT EXISTS collision_review (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    status VARCHAR(40) DEFAULT 'pending',
    reviewer_user_id INTEGER,
    notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organiser_burnout_snapshot (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    load_score FLOAT DEFAULT 0.0,
    burnout_risk VARCHAR(40) DEFAULT 'low',
    formula_version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
