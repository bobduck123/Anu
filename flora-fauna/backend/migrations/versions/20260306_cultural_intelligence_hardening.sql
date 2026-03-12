-- Cultural Intelligence hardening: control-plane idempotency records

CREATE TABLE IF NOT EXISTS control_idempotency_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES user(id),
    method VARCHAR(20) NOT NULL,
    route VARCHAR(320) NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    response_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (actor_id, method, route, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_control_idempotency_created_at ON control_idempotency_record(created_at);
CREATE INDEX IF NOT EXISTS ix_control_idempotency_key ON control_idempotency_record(idempotency_key);
