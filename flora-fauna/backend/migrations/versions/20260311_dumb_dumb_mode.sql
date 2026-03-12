-- Dumb Dumb Mode: transparent parody wishlists mapped to real mutual-aid pools

CREATE TABLE IF NOT EXISTS dumb_dumb_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL REFERENCES node(id),
    owner_user_id INTEGER NOT NULL REFERENCES user(id),
    title VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    intro_text VARCHAR(800),
    parody_disclaimer VARCHAR(500) NOT NULL,
    is_public BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dumb_dumb_list_node_slug UNIQUE (node_id, slug)
);

CREATE INDEX IF NOT EXISTS ix_dumb_dumb_list_owner ON dumb_dumb_list (owner_user_id);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_list_public ON dumb_dumb_list (is_public);

CREATE TABLE IF NOT EXISTS dumb_dumb_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES dumb_dumb_list(id),
    title VARCHAR(120) NOT NULL,
    parody_description VARCHAR(600),
    image_url VARCHAR(500),
    icon_key VARCHAR(80),
    price_cents INTEGER NOT NULL,
    currency VARCHAR(12) NOT NULL DEFAULT 'usd',
    mutual_aid_pool_id INTEGER NOT NULL REFERENCES impact_pool(id),
    impact_title VARCHAR(160) NOT NULL,
    impact_description VARCHAR(500) NOT NULL,
    quantity_limit INTEGER,
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_dumb_dumb_item_list ON dumb_dumb_item (list_id);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_item_pool ON dumb_dumb_item (mutual_aid_pool_id);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_item_active ON dumb_dumb_item (is_active);

CREATE TABLE IF NOT EXISTS dumb_dumb_purchase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL REFERENCES node(id),
    list_id INTEGER NOT NULL REFERENCES dumb_dumb_list(id),
    item_id INTEGER NOT NULL REFERENCES dumb_dumb_item(id),
    buyer_user_id INTEGER REFERENCES user(id),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(12) NOT NULL DEFAULT 'usd',
    payment_intent_id VARCHAR(200),
    external_payment_id VARCHAR(200),
    checkout_session_id VARCHAR(200),
    status VARCHAR(40) NOT NULL DEFAULT 'checkout_pending',
    destination_pool_id INTEGER NOT NULL REFERENCES impact_pool(id),
    receipt_snapshot_json JSON,
    inventory_reserved BOOLEAN DEFAULT 0,
    reservation_expires_at DATETIME,
    inventory_released_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_dumb_dumb_purchase_item ON dumb_dumb_purchase (item_id);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_purchase_buyer ON dumb_dumb_purchase (buyer_user_id);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_purchase_status ON dumb_dumb_purchase (status);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_purchase_destination ON dumb_dumb_purchase (destination_pool_id);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_purchase_created_at ON dumb_dumb_purchase (created_at);
CREATE INDEX IF NOT EXISTS ix_dumb_dumb_purchase_checkout_session ON dumb_dumb_purchase (checkout_session_id);
