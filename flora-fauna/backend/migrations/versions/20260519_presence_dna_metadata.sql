-- Presence DNA persistence (Pass 2).
--
-- Adds a generic JSONB metadata column on presence_node. Presence DNA is
-- stored at node_metadata['presence_dna']; other forward-compatible
-- metadata keys can live alongside without further migrations.
--
-- Safe-additive: nullable, no default, IF NOT EXISTS. Existing rows are
-- unaffected. resolvePresenceDna() in the frontend falls back through
-- demo_overlay → inferred when this column is empty.

ALTER TABLE presence_node ADD COLUMN IF NOT EXISTS node_metadata JSONB;

-- A GIN index so the eventual admin/search surface can query DNA fields.
CREATE INDEX IF NOT EXISTS ix_presence_node_metadata_gin
    ON presence_node USING gin (node_metadata jsonb_path_ops);
