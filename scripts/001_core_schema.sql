-- =============================================================================
-- ANU CORE SCHEMA - Multi-tenant white-label platform tables
-- Run this first to establish the foundation tables
-- =============================================================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TENANT (NODE) TABLES - Foundation for multi-tenancy
-- =============================================================================

CREATE TABLE IF NOT EXISTS node (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(120) UNIQUE,
    status VARCHAR(40) DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS node_domain (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    domain VARCHAR(200) NOT NULL,
    status VARCHAR(40) DEFAULT 'active',
    tls_ready BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_node_domain_domain UNIQUE (domain)
);
CREATE INDEX IF NOT EXISTS ix_node_domain_node_id ON node_domain(node_id);

CREATE TABLE IF NOT EXISTS node_config (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    config_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_node_config_node UNIQUE (node_id)
);
CREATE INDEX IF NOT EXISTS ix_node_config_node_id ON node_config(node_id);

-- =============================================================================
-- USER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    global_subject_id VARCHAR(120),
    username VARCHAR(150) NOT NULL UNIQUE,
    pseudonym VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'participant',
    encrypted_identity_ref VARCHAR(500),
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason VARCHAR(500),
    bio VARCHAR(500),
    avatar_url VARCHAR(500),
    banner_url VARCHAR(500),
    profile_theme VARCHAR(50) DEFAULT 'default',
    location VARCHAR(200),
    website_url VARCHAR(300),
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    points_to_level_up INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_user_global_subject_id ON "user"(global_subject_id);
CREATE INDEX IF NOT EXISTS ix_user_node_id ON "user"(node_id);

-- =============================================================================
-- VENUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS venue (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    is_global BOOLEAN DEFAULT FALSE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_venue_city ON venue(city);
CREATE INDEX IF NOT EXISTS ix_venue_country ON venue(country);
CREATE INDEX IF NOT EXISTS ix_venue_user_id ON venue(user_id);

-- =============================================================================
-- EVENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS event (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    address VARCHAR(200),
    city VARCHAR(50),
    country VARCHAR(50),
    longitude FLOAT,
    latitude FLOAT,
    is_online BOOLEAN DEFAULT FALSE,
    is_global BOOLEAN DEFAULT FALSE,
    date TIMESTAMPTZ NOT NULL,
    time TIME NOT NULL,
    venue_id INTEGER NOT NULL REFERENCES venue(id) ON DELETE CASCADE,
    attendees INTEGER DEFAULT 0,
    goal INTEGER NOT NULL,
    points_assigned INTEGER DEFAULT 0,
    reminder_week VARCHAR(500),
    reminder_day VARCHAR(500),
    reminder_hours VARCHAR(500),
    risk_tier_id INTEGER,
    min_cert_level INTEGER,
    compliance_checklist_complete BOOLEAN DEFAULT FALSE,
    compliance_signed_at TIMESTAMPTZ,
    compliance_signed_by INTEGER REFERENCES "user"(id),
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_event_date ON event(date);
CREATE INDEX IF NOT EXISTS ix_event_city ON event(city);
CREATE INDEX IF NOT EXISTS ix_event_user_id ON event(user_id);
CREATE INDEX IF NOT EXISTS ix_event_node_id ON event(node_id);

-- =============================================================================
-- MICROCOSM (COMMUNITY) TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS microcosm (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255),
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    creator_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_microcosm_creator_id ON microcosm(creator_id);

CREATE TABLE IF NOT EXISTS microcosm_user (
    microcosm_id INTEGER NOT NULL REFERENCES microcosm(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    PRIMARY KEY (microcosm_id, user_id)
);

-- =============================================================================
-- ARTICLE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS article (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_pseudonym VARCHAR(80) NOT NULL,
    microcosm_id INTEGER REFERENCES microcosm(id) ON DELETE SET NULL,
    author_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    featured BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_article_category ON article(category);
CREATE INDEX IF NOT EXISTS ix_article_author_id ON article(author_id);
CREATE INDEX IF NOT EXISTS ix_article_node_id ON article(node_id);

-- =============================================================================
-- ACTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS action (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    details VARCHAR(1000) NOT NULL,
    instructions VARCHAR(1000),
    action_tile VARCHAR(200),
    action_type VARCHAR(50) NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    is_global BOOLEAN DEFAULT FALSE,
    latitude FLOAT,
    longitude FLOAT,
    address VARCHAR(200),
    city VARCHAR(100),
    country VARCHAR(100),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    first_milestone VARCHAR(100),
    second_milestone VARCHAR(100),
    final_milestone VARCHAR(100),
    points_assigned INTEGER NOT NULL,
    recurrence VARCHAR(50) NOT NULL DEFAULT 'none',
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    completions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_action_user_id ON action(user_id);
CREATE INDEX IF NOT EXISTS ix_action_end_date ON action(end_date);
CREATE INDEX IF NOT EXISTS ix_action_node_id ON action(node_id);

CREATE TABLE IF NOT EXISTS action_proof (
    id SERIAL PRIMARY KEY,
    action_id INTEGER NOT NULL REFERENCES action(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    before_url VARCHAR(500),
    after_url VARCHAR(500),
    proof_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_action_proof_action_id ON action_proof(action_id);
CREATE INDEX IF NOT EXISTS ix_action_proof_user_id ON action_proof(user_id);

CREATE TABLE IF NOT EXISTS action_impact_metric (
    id SERIAL PRIMARY KEY,
    action_id INTEGER NOT NULL REFERENCES action(id) ON DELETE CASCADE,
    label VARCHAR(120) NOT NULL,
    value FLOAT NOT NULL,
    unit VARCHAR(40),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_action_metric_action_id ON action_impact_metric(action_id);

-- =============================================================================
-- TICKET TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ticket (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    event_id INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    ticket_type VARCHAR(50) NOT NULL DEFAULT 'general',
    price FLOAT NOT NULL DEFAULT 0.0,
    purchase_date TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ticket_event_id ON ticket(event_id);
CREATE INDEX IF NOT EXISTS ix_ticket_user_id ON ticket(user_id);
CREATE INDEX IF NOT EXISTS ix_ticket_node_id ON ticket(node_id);

-- =============================================================================
-- TODO TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS todo (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    action_id INTEGER NOT NULL REFERENCES action(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_todo_user_id ON todo(user_id);
CREATE INDEX IF NOT EXISTS ix_todo_is_completed ON todo(is_completed);

-- =============================================================================
-- FEEDBACK, COMMENT, NOTIFICATION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    item_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS ix_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS ix_feedback_timestamp ON feedback(timestamp);

CREATE TABLE IF NOT EXISTS comment (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES article(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_comment_article_id ON comment(article_id);
CREATE INDEX IF NOT EXISTS ix_comment_timestamp ON comment(timestamp);

CREATE TABLE IF NOT EXISTS notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS ix_notification_is_read ON notification(is_read);
CREATE INDEX IF NOT EXISTS ix_notification_timestamp ON notification(timestamp);

-- =============================================================================
-- FAVORITE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS favorite (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES article(id) ON DELETE CASCADE
);

-- =============================================================================
-- TEAM TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS team (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    microcosm_id INTEGER NOT NULL REFERENCES microcosm(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MESSAGE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS message (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_message_sender_id ON message(sender_id);
CREATE INDEX IF NOT EXISTS ix_message_receiver_id ON message(receiver_id);

-- =============================================================================
-- PARTNER KEY & IDENTITY LINK TABLES (Federation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS partner_key (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    key_id VARCHAR(120) NOT NULL,
    public_key TEXT NOT NULL,
    status VARCHAR(40) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    CONSTRAINT uq_partner_key_node_key UNIQUE (node_id, key_id)
);
CREATE INDEX IF NOT EXISTS ix_partner_key_node_id ON partner_key(node_id);

CREATE TABLE IF NOT EXISTS identity_link (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    partner_user_id VARCHAR(500) NOT NULL,
    partner_user_hash VARCHAR(128) NOT NULL,
    global_subject_id VARCHAR(120) NOT NULL,
    link_confidence FLOAT DEFAULT 1.0,
    auth_mode VARCHAR(40) DEFAULT 'jwt',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_identity_link_partner UNIQUE (node_id, partner_user_hash)
);
CREATE INDEX IF NOT EXISTS ix_identity_link_node ON identity_link(node_id);
CREATE INDEX IF NOT EXISTS ix_identity_link_global_subject ON identity_link(global_subject_id);

-- =============================================================================
-- AUDIT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
    actor_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    event VARCHAR(120) NOT NULL,
    entity_type VARCHAR(120),
    entity_id VARCHAR(120),
    metadata_json JSONB,
    sensitive_read BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USER CONSENT TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_consent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Insert default node
-- =============================================================================

INSERT INTO node (name, slug, status, is_default, created_at)
VALUES ('Anu', 'anu', 'active', TRUE, NOW())
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RLS POLICIES FOR CORE TABLES
-- =============================================================================

-- Enable RLS on key tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE action ENABLE ROW LEVEL SECURITY;
ALTER TABLE article ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_config ENABLE ROW LEVEL SECURITY;

-- Basic read policies (adjust based on your auth setup)
-- These are permissive policies - you may want to tighten them

-- Users can read their own data
CREATE POLICY "users_select_own" ON "user" 
    FOR SELECT USING (true);  -- Public profiles

-- Events are publicly readable
CREATE POLICY "events_select_public" ON event 
    FOR SELECT USING (true);

-- Actions are publicly readable
CREATE POLICY "actions_select_public" ON action 
    FOR SELECT USING (true);

-- Articles are publicly readable
CREATE POLICY "articles_select_public" ON article 
    FOR SELECT USING (true);

-- Node config readable by authenticated users
CREATE POLICY "node_config_select_auth" ON node_config 
    FOR SELECT USING (true);

COMMIT;
