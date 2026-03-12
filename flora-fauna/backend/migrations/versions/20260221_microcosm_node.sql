-- Add node_id to microcosm
ALTER TABLE microcosm ADD COLUMN node_id INTEGER;
CREATE INDEX IF NOT EXISTS ix_microcosm_node_id ON microcosm (node_id);
