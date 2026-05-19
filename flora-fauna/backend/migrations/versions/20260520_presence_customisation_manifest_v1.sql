-- Presence Customisation Manifest v1 persistence fields.
-- Date: 2026-05-20
--
-- Safe additive migration. Setup requests store stable option ids and a
-- snapshot of the manifest-resolved selection so later preview generation does
-- not guess from vague text fields.

ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS room_world VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS engagement_dynamic VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS motion_profile VARCHAR(80);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS object_skin_pack VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS atmosphere_pack VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS customisation_manifest_version VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS customisation_snapshot JSONB;

CREATE INDEX IF NOT EXISTS ix_presence_beta_application_room_world
    ON presence_beta_application (room_world);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_customisation_manifest
    ON presence_beta_application (customisation_manifest_version);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_customisation_snapshot_gin
    ON presence_beta_application USING gin (customisation_snapshot jsonb_path_ops);
