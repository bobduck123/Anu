-- Operational resilience stage 4
-- - Control token grant registry (jti allowlist + revocation)
-- - World snapshot manifest hash persistence
-- - Connector pull queue lease + request-key dedupe

CREATE TABLE IF NOT EXISTS control_token_grant (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jti VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES user(id),
    token_use VARCHAR(30) NOT NULL DEFAULT 'control',
    audience VARCHAR(80) NOT NULL DEFAULT 'control',
    role VARCHAR(80),
    scopes_json JSON,
    expires_at DATETIME,
    revoked_at DATETIME,
    revoked_reason VARCHAR(300),
    issued_by_ip VARCHAR(64),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_control_token_grant_user ON control_token_grant(user_id);
CREATE INDEX IF NOT EXISTS ix_control_token_grant_expires_at ON control_token_grant(expires_at);
CREATE INDEX IF NOT EXISTS ix_control_token_grant_revoked_at ON control_token_grant(revoked_at);

ALTER TABLE ci_world_snapshot ADD COLUMN manifest_hash VARCHAR(96);
CREATE INDEX IF NOT EXISTS ix_ci_world_snapshot_manifest_hash ON ci_world_snapshot(manifest_hash);

ALTER TABLE ci_connector_pull_job ADD COLUMN request_key VARCHAR(160);
ALTER TABLE ci_connector_pull_job ADD COLUMN lease_expires_at DATETIME;
CREATE INDEX IF NOT EXISTS ix_ci_connector_pull_job_request_key ON ci_connector_pull_job(request_key);
CREATE INDEX IF NOT EXISTS ix_ci_connector_pull_job_lease_expires ON ci_connector_pull_job(lease_expires_at);
