-- Risk-Hardened v1.1 steps 5-9 additions

CREATE TABLE IF NOT EXISTS epsilon_consumption (
    id SERIAL PRIMARY KEY,
    node_id INTEGER,
    epsilon FLOAT DEFAULT 0.0,
    purpose VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS query_key VARCHAR(120);
ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS sensitivity FLOAT DEFAULT 1.0;
ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS clipping_rule VARCHAR(200);
ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS epsilon_before FLOAT DEFAULT 0.0;
ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS epsilon_after FLOAT DEFAULT 0.0;
ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS epsilon_annual_limit FLOAT DEFAULT 1.0;
ALTER TABLE epsilon_consumption ADD COLUMN IF NOT EXISTS scope VARCHAR(120);

CREATE TABLE IF NOT EXISTS governance_proposal (
    id SERIAL PRIMARY KEY,
    node_id INTEGER,
    proposal_type VARCHAR(120) NOT NULL,
    title VARCHAR(200),
    details_json JSON,
    status VARCHAR(40) DEFAULT 'pending',
    quorum_min INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_gov_proposal_node ON governance_proposal (node_id);
CREATE INDEX IF NOT EXISTS ix_gov_proposal_status ON governance_proposal (status);
