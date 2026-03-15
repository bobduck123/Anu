CREATE SCHEMA IF NOT EXISTS falak;

CREATE TABLE IF NOT EXISTS falak.tenants (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO falak.tenants (id, slug, name)
VALUES ('11111111-1111-4111-8111-111111111111', 'anu-local', 'Anu Local Tenant')
ON CONFLICT (id) DO UPDATE
SET slug = EXCLUDED.slug,
    name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS falak.actors (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  actor_type text NOT NULL,
  external_auth_id text,
  email text,
  display_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS falak.actor_roles (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES falak.actors(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  region_node_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS falak_actors_tenant_idx ON falak.actors (tenant_id);
CREATE INDEX IF NOT EXISTS falak_actor_roles_tenant_actor_idx ON falak.actor_roles (tenant_id, actor_id);

UPDATE falak.actors
SET actor_type = 'user',
    email = 'alpha@local',
    display_name = 'Alpha Public',
    metadata = '{"seeded": true, "source": "falak-map-minimal-bootstrap"}'::jsonb,
    updated_at = now()
WHERE tenant_id = '11111111-1111-4111-8111-111111111111'
  AND external_auth_id = 'alpha_public';

INSERT INTO falak.actors (
  id,
  tenant_id,
  actor_type,
  external_auth_id,
  email,
  display_name,
  metadata
)
SELECT
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'user',
  'alpha_public',
  'alpha@local',
  'Alpha Public',
  '{"seeded": true, "source": "falak-map-minimal-bootstrap"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM falak.actors
  WHERE tenant_id = '11111111-1111-4111-8111-111111111111'
    AND external_auth_id = 'alpha_public'
);

INSERT INTO falak.actor_roles (
  id,
  tenant_id,
  actor_id,
  role_name,
  region_node_id
)
SELECT
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-1111-4111-8111-111111111111',
  actor.id,
  'tenant_admin',
  NULL
FROM falak.actors actor
WHERE actor.tenant_id = '11111111-1111-4111-8111-111111111111'
  AND actor.external_auth_id = 'alpha_public'
  AND NOT EXISTS (
    SELECT 1
    FROM falak.actor_roles role
    WHERE role.tenant_id = actor.tenant_id
      AND role.actor_id = actor.id
      AND role.role_name = 'tenant_admin'
      AND role.region_node_id IS NULL
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'falak_map_archetype' AND n.nspname = 'falak') THEN
    CREATE TYPE falak.falak_map_archetype AS ENUM ('theory', 'organization', 'technology', 'place', 'event', 'myth', 'ecosystem', 'person');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'falak_map_status' AND n.nspname = 'falak') THEN
    CREATE TYPE falak.falak_map_status AS ENUM ('draft', 'reviewed', 'published');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'falak_map_compile_mode' AND n.nspname = 'falak') THEN
    CREATE TYPE falak.falak_map_compile_mode AS ENUM ('auto_seed', 'auto_expand', 'curated_refine');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'falak_map_job_status' AND n.nspname = 'falak') THEN
    CREATE TYPE falak.falak_map_job_status AS ENUM ('queued', 'running', 'completed', 'failed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'falak_map_relation' AND n.nspname = 'falak') THEN
    CREATE TYPE falak.falak_map_relation AS ENUM ('influences', 'contradicts', 'extends', 'belongs_to', 'derived_from', 'similar_to', 'co_occurs_with');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS falak.map_definitions (
  id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  topic_key text NOT NULL,
  title text NOT NULL,
  archetype falak.falak_map_archetype NOT NULL,
  entity_type text NOT NULL,
  description text,
  status falak.falak_map_status NOT NULL DEFAULT 'draft',
  size_formula text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  current_snapshot_id text,
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, topic_key)
);

CREATE TABLE IF NOT EXISTS falak.map_categories (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  color_token text NOT NULL,
  parent_key text,
  description text,
  "order" integer NOT NULL DEFAULT 0,
  UNIQUE (map_id, key)
);

CREATE TABLE IF NOT EXISTS falak.map_axes (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  min_label text NOT NULL,
  max_label text NOT NULL,
  description text,
  scoring_method text NOT NULL,
  UNIQUE (map_id, key)
);

CREATE TABLE IF NOT EXISTS falak.map_nodes (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  label text NOT NULL,
  aliases text[] NOT NULL DEFAULT ARRAY[]::text[],
  entity_type text NOT NULL,
  category_key text,
  subcategory_key text,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  summary text,
  long_description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  axis_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  axis_meta jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  position jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  cluster_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (map_id, label)
);

CREATE TABLE IF NOT EXISTS falak.map_edges (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES falak.map_nodes(id) ON DELETE CASCADE,
  target_id text NOT NULL REFERENCES falak.map_nodes(id) ON DELETE CASCADE,
  relation falak.falak_map_relation NOT NULL,
  weight numeric(10,4) NOT NULL,
  confidence numeric(10,4) NOT NULL,
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS falak.map_node_sources (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  node_id text NOT NULL REFERENCES falak.map_nodes(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  domain text,
  snippet text,
  extracted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS falak.map_layout_snapshots (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  nodes_json jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (map_id, version)
);

CREATE TABLE IF NOT EXISTS falak.map_jobs (
  id text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  map_id text REFERENCES falak.map_definitions(id) ON DELETE SET NULL,
  topic_key text NOT NULL,
  requested_topic text NOT NULL,
  mode falak.falak_map_compile_mode NOT NULL,
  status falak.falak_map_job_status NOT NULL,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS falak.map_job_logs (
  id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES falak.map_jobs(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS falak.map_aliases (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  node_id text NOT NULL REFERENCES falak.map_nodes(id) ON DELETE CASCADE,
  alias text NOT NULL,
  canonical_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (map_id, alias)
);

CREATE TABLE IF NOT EXISTS falak.map_overrides (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_definitions_tenant_status_idx ON falak.map_definitions (tenant_id, status);
CREATE INDEX IF NOT EXISTS map_categories_map_order_idx ON falak.map_categories (map_id, "order");
CREATE INDEX IF NOT EXISTS map_nodes_map_category_idx ON falak.map_nodes (map_id, category_key);
CREATE INDEX IF NOT EXISTS map_edges_map_relation_idx ON falak.map_edges (map_id, relation);
CREATE INDEX IF NOT EXISTS map_edges_source_idx ON falak.map_edges (source_id);
CREATE INDEX IF NOT EXISTS map_edges_target_idx ON falak.map_edges (target_id);
CREATE INDEX IF NOT EXISTS map_node_sources_map_idx ON falak.map_node_sources (map_id);
CREATE INDEX IF NOT EXISTS map_node_sources_node_idx ON falak.map_node_sources (node_id);
CREATE INDEX IF NOT EXISTS map_layout_snapshots_map_created_idx ON falak.map_layout_snapshots (map_id, created_at DESC);
CREATE INDEX IF NOT EXISTS map_jobs_tenant_status_created_idx ON falak.map_jobs (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS map_jobs_map_idx ON falak.map_jobs (map_id);
CREATE INDEX IF NOT EXISTS map_job_logs_job_created_idx ON falak.map_job_logs (job_id, created_at ASC);
CREATE INDEX IF NOT EXISTS map_aliases_node_idx ON falak.map_aliases (node_id);
CREATE INDEX IF NOT EXISTS map_overrides_map_created_idx ON falak.map_overrides (map_id, created_at DESC);
