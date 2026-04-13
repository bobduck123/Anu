SET search_path TO falak, public;

ALTER TABLE falak.tenants
  ADD COLUMN IF NOT EXISTS backend_node_slug TEXT,
  ADD COLUMN IF NOT EXISTS backend_node_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_falak_tenants_backend_node_slug
ON falak.tenants (backend_node_slug)
WHERE backend_node_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_falak_tenants_backend_node_id
ON falak.tenants (backend_node_id)
WHERE backend_node_id IS NOT NULL;
