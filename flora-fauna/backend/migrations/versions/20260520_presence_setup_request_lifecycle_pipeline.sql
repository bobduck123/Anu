-- Presence setup request preview/publish lifecycle pipeline.
-- Date: 2026-05-20
--
-- Safe additive migration. Setup requests remain review records; preview
-- tokens only expose private preview payloads and do not publish nodes.

ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS preview_token VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS lifecycle_audit JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS ux_presence_beta_application_preview_token
    ON presence_beta_application (preview_token)
    WHERE preview_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_lifecycle_audit_gin
    ON presence_beta_application USING gin (lifecycle_audit jsonb_path_ops);
