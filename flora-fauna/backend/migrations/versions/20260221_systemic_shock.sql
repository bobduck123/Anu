-- Systemic Shock Preparedness: system modes, resilience, simulations, crisis digest

ALTER TABLE "crisis_scenario" ADD COLUMN node_id INTEGER;
ALTER TABLE "crisis_run" ADD COLUMN node_id INTEGER;

CREATE TABLE IF NOT EXISTS system_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    current_mode VARCHAR(40) NOT NULL DEFAULT 'NORMAL',
    activated_at DATETIME,
    activated_by INTEGER,
    expiry_at DATETIME,
    evidence_hash VARCHAR(128),
    formula_version INTEGER,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(activated_by) REFERENCES "user"(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_state_node ON system_state (node_id);
CREATE INDEX IF NOT EXISTS ix_system_state_mode ON system_state (current_mode);

CREATE TABLE IF NOT EXISTS system_parameter_bounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(120) NOT NULL,
    version INTEGER DEFAULT 1,
    lower_bound FLOAT,
    upper_bound FLOAT,
    default_value FLOAT,
    description VARCHAR(500),
    active BOOLEAN DEFAULT 1,
    created_at DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_param_bounds ON system_parameter_bounds (key, version);
CREATE INDEX IF NOT EXISTS ix_system_param_key ON system_parameter_bounds (key);
CREATE INDEX IF NOT EXISTS ix_system_param_active ON system_parameter_bounds (active);

CREATE TABLE IF NOT EXISTS resilience_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    week_start DATE,
    resilience_score FLOAT NOT NULL DEFAULT 0.0,
    submetrics_json JSON,
    recommended_mode VARCHAR(40),
    formula_version INTEGER,
    evidence_hash VARCHAR(128),
    created_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE INDEX IF NOT EXISTS ix_resilience_node_id ON resilience_snapshot (node_id);
CREATE INDEX IF NOT EXISTS ix_resilience_week_start ON resilience_snapshot (week_start);
CREATE INDEX IF NOT EXISTS ix_resilience_created_at ON resilience_snapshot (created_at);

CREATE TABLE IF NOT EXISTS system_simulation_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    started_at DATETIME,
    config_json JSON,
    outputs_json JSON,
    resilience_score FLOAT,
    worst_case_runway FLOAT,
    capture_prob FLOAT,
    overload_prob FLOAT,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE INDEX IF NOT EXISTS ix_system_sim_node_id ON system_simulation_run (node_id);
CREATE INDEX IF NOT EXISTS ix_system_sim_started_at ON system_simulation_run (started_at);

CREATE TABLE IF NOT EXISTS crisis_digest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    mode VARCHAR(40) NOT NULL,
    summary_json JSON,
    evidence_hash VARCHAR(128),
    created_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE INDEX IF NOT EXISTS ix_crisis_digest_node_id ON crisis_digest (node_id);
CREATE INDEX IF NOT EXISTS ix_crisis_digest_created_at ON crisis_digest (created_at);

-- Backfill node_id on crisis tables to default node (if available)
UPDATE crisis_scenario SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE crisis_run SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
