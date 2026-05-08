-- Migration: Presence beta-application persistence
-- Date: 2026-05-08
-- Adds presence_beta_application table for capturing public-beta setup requests
-- from verified Supabase users. NOT a PresenceNode. Captures intent only.
-- Studio reviews these and provisions real draft nodes manually.

CREATE TABLE IF NOT EXISTS presence_beta_application (
    id                  SERIAL PRIMARY KEY,
    user_id             VARCHAR(80),
    email               VARCHAR(180),
    display_name        VARCHAR(160),
    desired_slug        VARCHAR(160),
    presence_type       VARCHAR(80),
    primary_purpose     VARCHAR(80),
    primary_cta         VARCHAR(80),
    template_direction  VARCHAR(80),
    visual_mood         VARCHAR(80),
    location_label      VARCHAR(160),
    headline            VARCHAR(280),
    description         TEXT,
    beta_mode           VARCHAR(40)  NOT NULL DEFAULT 'setup_request',
    status              VARCHAR(40)  NOT NULL DEFAULT 'pending',
    notes               TEXT,
    metadata_json       JSONB,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_presence_beta_application_user
    ON presence_beta_application (user_id);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_email
    ON presence_beta_application (email);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_status
    ON presence_beta_application (status);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_created
    ON presence_beta_application (created_at);
