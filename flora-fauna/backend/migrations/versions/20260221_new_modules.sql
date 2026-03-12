-- New modules: timebank, assets registry, insights, merchants, risk pools, burnout, crisis sim

CREATE TABLE IF NOT EXISTS time_entry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    microcosm_id INTEGER,
    guild_id INTEGER,
    activity_type VARCHAR(120) NOT NULL,
    hours FLOAT NOT NULL,
    occurred_at DATETIME NOT NULL,
    verification_status VARCHAR(40) DEFAULT 'pending',
    proof_ref VARCHAR(200),
    created_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id),
    FOREIGN KEY(guild_id) REFERENCES guild(id)
);

CREATE INDEX IF NOT EXISTS ix_time_entry_user_id ON time_entry (user_id);
CREATE INDEX IF NOT EXISTS ix_time_entry_microcosm_id ON time_entry (microcosm_id);
CREATE INDEX IF NOT EXISTS ix_time_entry_guild_id ON time_entry (guild_id);
CREATE INDEX IF NOT EXISTS ix_time_entry_occurred_at ON time_entry (occurred_at);

CREATE TABLE IF NOT EXISTS community_asset (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    asset_type VARCHAR(120) NOT NULL,
    location_text VARCHAR(200),
    lat FLOAT,
    lng FLOAT,
    ownership_type VARCHAR(80),
    capacity_notes VARCHAR(300),
    booking_rules_json JSON,
    maintenance_notes VARCHAR(500),
    created_by INTEGER,
    created_at DATETIME,
    FOREIGN KEY(created_by) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS ix_community_asset_type ON community_asset (asset_type);

CREATE TABLE IF NOT EXISTS asset_booking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    microcosm_id INTEGER,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status VARCHAR(40) DEFAULT 'requested',
    created_at DATETIME,
    FOREIGN KEY(asset_id) REFERENCES community_asset(id),
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);

CREATE INDEX IF NOT EXISTS ix_asset_booking_asset ON asset_booking (asset_id);
CREATE INDEX IF NOT EXISTS ix_asset_booking_user ON asset_booking (user_id);

CREATE TABLE IF NOT EXISTS insight (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    microcosm_id INTEGER,
    domain_tag VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    verification_level VARCHAR(60) DEFAULT 'unverified',
    evidence_ref VARCHAR(200),
    created_at DATETIME,
    FOREIGN KEY(author_id) REFERENCES "user"(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);

CREATE INDEX IF NOT EXISTS ix_insight_domain_tag ON insight (domain_tag);
CREATE INDEX IF NOT EXISTS ix_insight_microcosm_id ON insight (microcosm_id);

CREATE TABLE IF NOT EXISTS merchant (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    domain VARCHAR(120),
    website VARCHAR(200),
    location_text VARCHAR(200),
    created_at DATETIME
);

CREATE INDEX IF NOT EXISTS ix_merchant_domain ON merchant (domain);

CREATE TABLE IF NOT EXISTS merchant_transaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    microcosm_id INTEGER,
    amount FLOAT NOT NULL,
    occurred_at DATETIME NOT NULL,
    receipt_ref VARCHAR(200),
    dispute_flag BOOLEAN DEFAULT 0,
    FOREIGN KEY(merchant_id) REFERENCES merchant(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);

CREATE INDEX IF NOT EXISTS ix_merchant_tx_merchant ON merchant_transaction (merchant_id);
CREATE INDEX IF NOT EXISTS ix_merchant_tx_microcosm ON merchant_transaction (microcosm_id);
CREATE INDEX IF NOT EXISTS ix_merchant_tx_occurred ON merchant_transaction (occurred_at);

CREATE TABLE IF NOT EXISTS pool_policy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pool_id INTEGER NOT NULL,
    max_draw_per_event INTEGER NOT NULL,
    min_floor INTEGER NOT NULL,
    allowed_event_types JSON,
    created_at DATETIME,
    FOREIGN KEY(pool_id) REFERENCES impact_pool(id)
);

CREATE INDEX IF NOT EXISTS ix_pool_policy_pool ON pool_policy (pool_id);

CREATE TABLE IF NOT EXISTS burnout_score (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    microcosm_id INTEGER,
    score FLOAT NOT NULL,
    window_days INTEGER DEFAULT 30,
    reasons_json JSON,
    computed_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES "user"(id),
    FOREIGN KEY(microcosm_id) REFERENCES microcosm(id)
);

CREATE INDEX IF NOT EXISTS ix_burnout_score_user ON burnout_score (user_id);
CREATE INDEX IF NOT EXISTS ix_burnout_score_microcosm ON burnout_score (microcosm_id);

CREATE TABLE IF NOT EXISTS crisis_scenario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_type VARCHAR(120) NOT NULL,
    params_json JSON,
    created_by INTEGER,
    created_at DATETIME,
    FOREIGN KEY(created_by) REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS crisis_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    results_json JSON,
    computed_at DATETIME,
    FOREIGN KEY(scenario_id) REFERENCES crisis_scenario(id)
);

CREATE INDEX IF NOT EXISTS ix_crisis_run_scenario ON crisis_run (scenario_id);
