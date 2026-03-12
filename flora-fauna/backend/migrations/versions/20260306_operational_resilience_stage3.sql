-- Operational resilience stage 3
-- - Connector async pull queue
-- - Control audit hash-chain + checkpoint table
-- - World signing key registry
-- - Cursor-query support indexes

CREATE TABLE IF NOT EXISTS ci_connector_pull_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connector_id INTEGER NOT NULL REFERENCES ci_connector_registration(id),
    requested_by INTEGER REFERENCES user(id),
    status VARCHAR(30) NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_error VARCHAR(500),
    payload_json JSON,
    worker_id VARCHAR(120),
    not_before DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    dead_letter_reason VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_ci_connector_pull_job_status ON ci_connector_pull_job(status);
CREATE INDEX IF NOT EXISTS ix_ci_connector_pull_job_not_before ON ci_connector_pull_job(not_before);
CREATE INDEX IF NOT EXISTS ix_ci_connector_pull_job_connector ON ci_connector_pull_job(connector_id);

ALTER TABLE control_audit_event ADD COLUMN chain_index INTEGER DEFAULT 0;
ALTER TABLE control_audit_event ADD COLUMN prev_hash VARCHAR(96);
ALTER TABLE control_audit_event ADD COLUMN event_hash VARCHAR(96);

CREATE INDEX IF NOT EXISTS ix_control_audit_event_chain_index ON control_audit_event(chain_index);
CREATE INDEX IF NOT EXISTS ix_control_audit_event_hash ON control_audit_event(event_hash);

CREATE TABLE IF NOT EXISTS control_audit_checkpoint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_event_id INTEGER NOT NULL,
    to_event_id INTEGER NOT NULL,
    event_count INTEGER NOT NULL DEFAULT 0,
    checkpoint_hash VARCHAR(96) NOT NULL,
    signature TEXT,
    signature_key_id VARCHAR(120),
    storage_uri VARCHAR(500),
    created_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_control_audit_checkpoint_created_at ON control_audit_checkpoint(created_at);
CREATE INDEX IF NOT EXISTS ix_control_audit_checkpoint_to_event ON control_audit_checkpoint(to_event_id);

CREATE TABLE IF NOT EXISTS world_signing_key (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id VARCHAR(120) NOT NULL UNIQUE,
    public_key_pem TEXT NOT NULL,
    private_key_file VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    valid_from DATETIME,
    valid_to DATETIME,
    rotated_by INTEGER REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_world_signing_key_active ON world_signing_key(is_active);
CREATE INDEX IF NOT EXISTS ix_world_signing_key_valid_to ON world_signing_key(valid_to);

CREATE INDEX IF NOT EXISTS ix_ci_fused_event_event_region_id ON ci_fused_event(event_type, region, id DESC);
CREATE INDEX IF NOT EXISTS ix_ci_story_cluster_score_id ON ci_story_cluster(score DESC, id DESC);
CREATE INDEX IF NOT EXISTS ix_ci_graph_entity_name_id ON ci_graph_entity(canonical_name, id DESC);
