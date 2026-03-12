-- HELL / EARTH / HEAVEN alignment schema
-- Upgrade section (forward migration)

CREATE TABLE IF NOT EXISTS telemetry_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    t DATETIME NOT NULL,
    actor_id INTEGER,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    props_json JSON NOT NULL,
    node_id INTEGER,
    consent_flags JSON,
    signature VARCHAR(256),
    evidence_hash VARCHAR(128),
    schema_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    FOREIGN KEY(actor_id) REFERENCES "user"(id),
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE INDEX IF NOT EXISTS ix_telemetry_event_t ON telemetry_event(t);
CREATE INDEX IF NOT EXISTS ix_telemetry_event_entity ON telemetry_event(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_telemetry_event_type ON telemetry_event(event_type);
CREATE INDEX IF NOT EXISTS ix_telemetry_event_node ON telemetry_event(node_id);

CREATE TABLE IF NOT EXISTS operational_need (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(80) NOT NULL,
    severity VARCHAR(40) NOT NULL DEFAULT 'medium',
    lat FLOAT,
    lng FLOAT,
    microcosm_id INTEGER,
    availability_json JSON,
    requested_units INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
    is_sensitive BOOLEAN DEFAULT 1,
    queue_position INTEGER,
    expires_at DATETIME,
    closed_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);
CREATE INDEX IF NOT EXISTS ix_operational_need_status ON operational_need(status);
CREATE INDEX IF NOT EXISTS ix_operational_need_category ON operational_need(category);
CREATE INDEX IF NOT EXISTS ix_operational_need_node ON operational_need(node_id);
CREATE INDEX IF NOT EXISTS ix_operational_need_microcosm ON operational_need(microcosm_id);
CREATE INDEX IF NOT EXISTS ix_operational_need_created_at ON operational_need(created_at);

CREATE TABLE IF NOT EXISTS operational_offer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    need_id INTEGER,
    category VARCHAR(80) NOT NULL,
    contribution_type VARCHAR(40) NOT NULL,
    description TEXT,
    capacity_units INTEGER NOT NULL DEFAULT 1,
    availability_json JSON,
    lat FLOAT,
    lng FLOAT,
    microcosm_id INTEGER,
    status VARCHAR(64) NOT NULL DEFAULT 'PROPOSED',
    proof_json JSON,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(created_by) REFERENCES "user"(id),
    FOREIGN KEY(need_id) REFERENCES operational_need(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);
CREATE INDEX IF NOT EXISTS ix_operational_offer_status ON operational_offer(status);
CREATE INDEX IF NOT EXISTS ix_operational_offer_category ON operational_offer(category);
CREATE INDEX IF NOT EXISTS ix_operational_offer_node ON operational_offer(node_id);
CREATE INDEX IF NOT EXISTS ix_operational_offer_need_id ON operational_offer(need_id);
CREATE INDEX IF NOT EXISTS ix_operational_offer_created_at ON operational_offer(created_at);

CREATE TABLE IF NOT EXISTS need_offer_match (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    need_id INTEGER NOT NULL,
    offer_id INTEGER NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'MATCHED',
    score FLOAT NOT NULL DEFAULT 0.0,
    distance_km FLOAT,
    microcosm_bonus BOOLEAN DEFAULT 0,
    matched_at DATETIME,
    accepted_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY(need_id) REFERENCES operational_need(id),
    FOREIGN KEY(offer_id) REFERENCES operational_offer(id)
);
CREATE INDEX IF NOT EXISTS ix_need_offer_match_need ON need_offer_match(need_id);
CREATE INDEX IF NOT EXISTS ix_need_offer_match_offer ON need_offer_match(offer_id);
CREATE INDEX IF NOT EXISTS ix_need_offer_match_status ON need_offer_match(status);

CREATE TABLE IF NOT EXISTS microcosm_lifecycle_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    microcosm_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PROPOSED',
    updated_at DATETIME,
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id),
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_microcosm_lifecycle ON microcosm_lifecycle_state(microcosm_id);
CREATE INDEX IF NOT EXISTS ix_microcosm_lifecycle_status ON microcosm_lifecycle_state(status);

CREATE TABLE IF NOT EXISTS need_projection_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    need_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    status VARCHAR(64) NOT NULL,
    category VARCHAR(80) NOT NULL,
    severity VARCHAR(40) NOT NULL,
    microcosm_id INTEGER,
    requested_units INTEGER DEFAULT 1,
    fulfilled_units INTEGER DEFAULT 0,
    queue_position INTEGER,
    is_sensitive BOOLEAN DEFAULT 1,
    last_event_id INTEGER,
    updated_at DATETIME,
    FOREIGN KEY(need_id) REFERENCES operational_need(id),
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_need_projection_need ON need_projection_read(need_id);
CREATE INDEX IF NOT EXISTS ix_need_projection_status ON need_projection_read(status);
CREATE INDEX IF NOT EXISTS ix_need_projection_node ON need_projection_read(node_id);

CREATE TABLE IF NOT EXISTS offer_projection_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    need_id INTEGER,
    status VARCHAR(64) NOT NULL,
    category VARCHAR(80) NOT NULL,
    contribution_type VARCHAR(40) NOT NULL,
    capacity_units INTEGER DEFAULT 1,
    delivered_units INTEGER DEFAULT 0,
    last_event_id INTEGER,
    updated_at DATETIME,
    FOREIGN KEY(offer_id) REFERENCES operational_offer(id),
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(need_id) REFERENCES operational_need(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_projection_offer ON offer_projection_read(offer_id);
CREATE INDEX IF NOT EXISTS ix_offer_projection_status ON offer_projection_read(status);
CREATE INDEX IF NOT EXISTS ix_offer_projection_node ON offer_projection_read(node_id);

CREATE TABLE IF NOT EXISTS microcosm_projection_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    microcosm_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PROPOSED',
    active_needs INTEGER DEFAULT 0,
    active_offers INTEGER DEFAULT 0,
    fulfilled_30d INTEGER DEFAULT 0,
    last_event_id INTEGER,
    updated_at DATETIME,
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id),
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_microcosm_projection_microcosm ON microcosm_projection_read(microcosm_id);
CREATE INDEX IF NOT EXISTS ix_microcosm_projection_node ON microcosm_projection_read(node_id);
CREATE INDEX IF NOT EXISTS ix_microcosm_projection_status ON microcosm_projection_read(status);

CREATE TABLE IF NOT EXISTS trust_projection_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    reliability FLOAT DEFAULT 50.0,
    confirmed_contributions INTEGER DEFAULT 0,
    failed_contributions INTEGER DEFAULT 0,
    verification_votes INTEGER DEFAULT 0,
    last_event_id INTEGER,
    updated_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trust_projection_user ON trust_projection_read(user_id);
CREATE INDEX IF NOT EXISTS ix_trust_projection_node ON trust_projection_read(node_id);

CREATE TABLE IF NOT EXISTS treasury_projection_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    pledge_intent_cents INTEGER DEFAULT 0,
    received_cents INTEGER DEFAULT 0,
    split_allocated_cents INTEGER DEFAULT 0,
    escrowed_cents INTEGER DEFAULT 0,
    released_cents INTEGER DEFAULT 0,
    reversed_cents INTEGER DEFAULT 0,
    disbursed_cents INTEGER DEFAULT 0,
    last_event_id INTEGER,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_treasury_projection_node ON treasury_projection_read(node_id);

CREATE TABLE IF NOT EXISTS coverage_projection_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL,
    category VARCHAR(80) NOT NULL,
    microcosm_id INTEGER,
    active_needs INTEGER DEFAULT 0,
    active_offers INTEGER DEFAULT 0,
    routing_capacity INTEGER DEFAULT 0,
    gap_index FLOAT DEFAULT 0.0,
    k_anon_bucket_size INTEGER DEFAULT 0,
    updated_at DATETIME,
    FOREIGN KEY(node_id) REFERENCES node(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_coverage_projection_bucket ON coverage_projection_read(node_id, category, microcosm_id);
CREATE INDEX IF NOT EXISTS ix_coverage_projection_node ON coverage_projection_read(node_id);
CREATE INDEX IF NOT EXISTS ix_coverage_projection_gap ON coverage_projection_read(gap_index);

CREATE TABLE IF NOT EXISTS contribution_footprint_read (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    time_units FLOAT DEFAULT 0.0,
    goods_units FLOAT DEFAULT 0.0,
    skills_units FLOAT DEFAULT 0.0,
    logistics_units FLOAT DEFAULT 0.0,
    verification_units FLOAT DEFAULT 0.0,
    money_cents INTEGER DEFAULT 0,
    impact_credits FLOAT DEFAULT 0.0,
    microcosm_ids_json JSON,
    updated_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(node_id) REFERENCES node(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contribution_footprint_user_node ON contribution_footprint_read(user_id, node_id);
CREATE INDEX IF NOT EXISTS ix_contribution_footprint_node ON contribution_footprint_read(node_id);

CREATE TABLE IF NOT EXISTS projector_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projector_name VARCHAR(120) NOT NULL,
    projector_version VARCHAR(40) NOT NULL,
    last_event_id INTEGER DEFAULT 0,
    config_hash VARCHAR(128),
    updated_at DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_projector_state_name ON projector_state(projector_name);

-- Downgrade section (reverse migration; execute manually if rollback required)
-- DROP TABLE IF EXISTS projector_state;
-- DROP TABLE IF EXISTS contribution_footprint_read;
-- DROP TABLE IF EXISTS coverage_projection_read;
-- DROP TABLE IF EXISTS treasury_projection_read;
-- DROP TABLE IF EXISTS trust_projection_read;
-- DROP TABLE IF EXISTS microcosm_projection_read;
-- DROP TABLE IF EXISTS offer_projection_read;
-- DROP TABLE IF EXISTS need_projection_read;
-- DROP TABLE IF EXISTS microcosm_lifecycle_state;
-- DROP TABLE IF EXISTS need_offer_match;
-- DROP TABLE IF EXISTS operational_offer;
-- DROP TABLE IF EXISTS operational_need;
-- DROP TABLE IF EXISTS telemetry_event;
