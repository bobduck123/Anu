-- Migration: Presence owner identity bridge hardening
-- Date: 2026-05-08
-- Ensures ANU can map Presence owner Supabase JWT subjects to local User rows.
-- No admin roles, owner records, or Presence nodes are created by this migration.

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS global_subject_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS ix_user_global_subject_id
    ON "user" (global_subject_id);
