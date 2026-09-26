-- ANU-004: additive private participant commitment and review record.
CREATE TABLE IF NOT EXISTS action_commitment (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id),
    action_id INTEGER NOT NULL REFERENCES action(id),
    user_id INTEGER NOT NULL REFERENCES "user"(id),
    status VARCHAR(24) NOT NULL DEFAULT 'CONFIRMED',
    evidence_url VARCHAR(500),
    evidence_note VARCHAR(1000),
    review_note VARCHAR(1000),
    reviewed_by_id INTEGER REFERENCES "user"(id),
    confirmed_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    CONSTRAINT uq_action_commitment_user_action UNIQUE (user_id, action_id)
);
CREATE INDEX IF NOT EXISTS ix_action_commitment_node_status ON action_commitment (node_id, status);
