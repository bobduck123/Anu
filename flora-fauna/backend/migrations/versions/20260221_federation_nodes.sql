-- Silent Federation Nodes: node domains, config, partner keys, identity links, benefits ledger, node aggregates

ALTER TABLE "user" ADD COLUMN global_subject_id VARCHAR(120);
ALTER TABLE "node" ADD COLUMN status VARCHAR(40) DEFAULT "active";
ALTER TABLE "event" ADD COLUMN node_id INTEGER;
ALTER TABLE "action" ADD COLUMN node_id INTEGER;
ALTER TABLE "article" ADD COLUMN node_id INTEGER;
ALTER TABLE "story_post" ADD COLUMN node_id INTEGER;
ALTER TABLE "ticket" ADD COLUMN node_id INTEGER;
ALTER TABLE "audit_record" ADD COLUMN node_id INTEGER;
ALTER TABLE "discovery_pack" ADD COLUMN node_id INTEGER;
ALTER TABLE "community_asset" ADD COLUMN node_id INTEGER;
ALTER TABLE "insight" ADD COLUMN node_id INTEGER;
ALTER TABLE "merchant" ADD COLUMN node_id INTEGER;
ALTER TABLE "merchant_transaction" ADD COLUMN node_id INTEGER;

CREATE TABLE IF NOT EXISTS node_domain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    domain VARCHAR(200) NOT NULL,
    status VARCHAR(40) DEFAULT 'active',
    tls_ready BOOLEAN DEFAULT 0,
    created_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_node_domain_domain ON node_domain (domain);
CREATE INDEX IF NOT EXISTS ix_node_domain_node_id ON node_domain (node_id);

CREATE TABLE IF NOT EXISTS node_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    config_json JSON,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_node_config_node ON node_config (node_id);
CREATE INDEX IF NOT EXISTS ix_node_config_node_id ON node_config (node_id);

CREATE TABLE IF NOT EXISTS partner_key (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    key_id VARCHAR(120) NOT NULL,
    public_key TEXT NOT NULL,
    status VARCHAR(40) DEFAULT 'active',
    created_at DATETIME,
    rotated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_key_node_key ON partner_key (node_id, key_id);
CREATE INDEX IF NOT EXISTS ix_partner_key_node_id ON partner_key (node_id);

CREATE TABLE IF NOT EXISTS identity_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    partner_user_id VARCHAR(500) NOT NULL,
    partner_user_hash VARCHAR(128) NOT NULL,
    global_subject_id VARCHAR(120) NOT NULL,
    link_confidence FLOAT DEFAULT 1.0,
    auth_mode VARCHAR(40) DEFAULT 'jwt',
    created_at DATETIME,
    last_seen_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_link_partner ON identity_link (node_id, partner_user_hash);
CREATE INDEX IF NOT EXISTS ix_identity_link_node ON identity_link (node_id);
CREATE INDEX IF NOT EXISTS ix_identity_link_global_subject ON identity_link (global_subject_id);

CREATE TABLE IF NOT EXISTS benefits_account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    global_subject_id VARCHAR(120) NOT NULL,
    balance_cents INTEGER DEFAULT 0,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_benefits_account_subject ON benefits_account (node_id, global_subject_id);
CREATE INDEX IF NOT EXISTS ix_benefits_account_node ON benefits_account (node_id);

CREATE TABLE IF NOT EXISTS benefits_ledger_entry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    global_subject_id VARCHAR(120) NOT NULL,
    entry_type VARCHAR(40) NOT NULL,
    amount_cents INTEGER NOT NULL,
    source_event_id VARCHAR(120),
    metadata_json JSON,
    created_by INTEGER,
    created_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id)
);
CREATE INDEX IF NOT EXISTS ix_benefits_ledger_node ON benefits_ledger_entry (node_id);
CREATE INDEX IF NOT EXISTS ix_benefits_ledger_subject ON benefits_ledger_entry (global_subject_id);
CREATE INDEX IF NOT EXISTS ix_benefits_ledger_created_at ON benefits_ledger_entry (created_at);

CREATE TABLE IF NOT EXISTS constellation_metrics_weekly_node (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    constellation_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    week_start DATE NOT NULL,
    aggregates_json JSON,
    epsilon_used FLOAT DEFAULT 0.0,
    min_cohort INTEGER DEFAULT 0,
    evidence_hash VARCHAR(128),
    created_at DATETIME,
    FOREIGN KEY(constellation_id) REFERENCES constellation(id),
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_constellation_node_week ON constellation_metrics_weekly_node (constellation_id, node_id, week_start);
CREATE INDEX IF NOT EXISTS ix_constellation_node_week ON constellation_metrics_weekly_node (node_id, week_start);

-- Backfill node_id on existing data to default node (if available)
UPDATE event SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE action SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE article SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE story_post SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE ticket SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE audit_record SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE discovery_pack SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE community_asset SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE insight SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE merchant SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
UPDATE merchant_transaction SET node_id = COALESCE(node_id, (SELECT id FROM node WHERE is_default=1 LIMIT 1)) WHERE node_id IS NULL;
