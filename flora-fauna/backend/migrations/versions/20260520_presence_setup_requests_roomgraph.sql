-- Presence setup-request lifecycle and RoomGraph-ready intake fields.
-- Date: 2026-05-20
--
-- Safe additive migration. The public setup-request endpoint persists to
-- presence_beta_application; records remain intent/review objects and do not
-- publish Presence Nodes directly.

ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS contact_name VARCHAR(160);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS archetype VARCHAR(80);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS room_preference VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS short_bio TEXT;
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS services_offerings JSONB;
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS links JSONB;
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS source_origin VARCHAR(300);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS presence_node_id INTEGER REFERENCES presence_node(id);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS selected_room_world VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS atmosphere VARCHAR(120);
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS presence_dna JSONB;
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS room_graph JSONB;
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS schema_version VARCHAR(80) NOT NULL DEFAULT 'presence-roomgraph-v1';
ALTER TABLE presence_beta_application ADD COLUMN IF NOT EXISTS presence_status VARCHAR(40) NOT NULL DEFAULT 'setup_request';

UPDATE presence_beta_application
SET status = 'submitted'
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_presence_beta_application_presence_node
    ON presence_beta_application (presence_node_id);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_presence_status
    ON presence_beta_application (presence_status);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_source_origin
    ON presence_beta_application (source_origin);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_dna_gin
    ON presence_beta_application USING gin (presence_dna jsonb_path_ops);
CREATE INDEX IF NOT EXISTS ix_presence_beta_application_room_graph_gin
    ON presence_beta_application USING gin (room_graph jsonb_path_ops);
