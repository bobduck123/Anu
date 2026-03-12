-- Phase 1: Weekly Cost-Lowering Engine (WCLE) tables
-- Creates: wcle_run, wcle_pack, wcle_pledge, wcle_run_receipt, wcle_retail_baseline_price

CREATE TABLE IF NOT EXISTS wcle_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    supplier_type VARCHAR(40) NOT NULL DEFAULT 'CUSTOM',
    location_name VARCHAR(200),
    address VARCHAR(300),
    suburb VARCHAR(100),
    postcode VARCHAR(10),
    lat FLOAT,
    lng FLOAT,
    organizer_user_id INTEGER NOT NULL REFERENCES user(id),
    microcosm_id INTEGER REFERENCES microcosm(id),
    run_date DATETIME NOT NULL,
    pledge_deadline DATETIME NOT NULL,
    pickup_window_start DATETIME,
    pickup_window_end DATETIME,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    coordination_fee_per_household_cents INTEGER NOT NULL DEFAULT 0,
    max_households INTEGER,
    retail_equivalent_total_cents INTEGER,
    bulk_estimate_total_cents INTEGER,
    bulk_actual_total_cents INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_wcle_run_organizer ON wcle_run (organizer_user_id);
CREATE INDEX IF NOT EXISTS ix_wcle_run_microcosm ON wcle_run (microcosm_id);
CREATE INDEX IF NOT EXISTS ix_wcle_run_status ON wcle_run (status);
CREATE INDEX IF NOT EXISTS ix_wcle_run_date ON wcle_run (run_date);
CREATE INDEX IF NOT EXISTS ix_wcle_run_postcode ON wcle_run (postcode);

CREATE TABLE IF NOT EXISTS wcle_pack (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES wcle_run(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    items_json TEXT NOT NULL DEFAULT '[]',
    adjustable_quantities BOOLEAN DEFAULT 0,
    waste_buffer_bps INTEGER DEFAULT 500,
    retail_estimate_cents INTEGER,
    bulk_estimate_cents INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_wcle_pack_run_id ON wcle_pack (run_id);

CREATE TABLE IF NOT EXISTS wcle_pledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES wcle_run(id),
    user_id INTEGER NOT NULL REFERENCES user(id),
    pack_id INTEGER REFERENCES wcle_pack(id),
    custom_items_json TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    estimated_retail_cents INTEGER,
    estimated_bulk_cents INTEGER,
    final_allocated_bulk_cents INTEGER,
    final_coordination_fee_cents INTEGER,
    final_total_cents INTEGER,
    savings_cents INTEGER,
    pickup_confirmed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_wcle_pledge_run_id ON wcle_pledge (run_id);
CREATE INDEX IF NOT EXISTS ix_wcle_pledge_user_id ON wcle_pledge (user_id);
CREATE INDEX IF NOT EXISTS ix_wcle_pledge_pack_id ON wcle_pledge (pack_id);
CREATE INDEX IF NOT EXISTS ix_wcle_pledge_status ON wcle_pledge (status);

CREATE TABLE IF NOT EXISTS wcle_run_receipt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES wcle_run(id),
    receipt_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL_ENTRY',
    receipt_hash VARCHAR(64) NOT NULL UNIQUE,
    receipt_meta_json TEXT,
    bulk_actual_total_cents INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_wcle_receipt_run_id ON wcle_run_receipt (run_id);

CREATE TABLE IF NOT EXISTS wcle_retail_baseline_price (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_key VARCHAR(200) NOT NULL,
    retailer VARCHAR(40) NOT NULL,
    price_cents INTEGER NOT NULL,
    unit VARCHAR(40) NOT NULL,
    postcode VARCHAR(10),
    captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source_note VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_wcle_baseline_item_key ON wcle_retail_baseline_price (item_key);
CREATE INDEX IF NOT EXISTS ix_wcle_baseline_retailer ON wcle_retail_baseline_price (retailer);
CREATE INDEX IF NOT EXISTS ix_wcle_baseline_captured_at ON wcle_retail_baseline_price (captured_at);
