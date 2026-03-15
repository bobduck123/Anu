CREATE SCHEMA IF NOT EXISTS falak;

SET search_path TO falak, public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS falak.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE falak.falak_map_archetype AS ENUM (
  'theory',
  'organization',
  'technology',
  'place',
  'event',
  'myth',
  'ecosystem',
  'person'
);

CREATE TYPE falak.falak_map_status AS ENUM (
  'draft',
  'reviewed',
  'published'
);

CREATE TYPE falak.falak_map_compile_mode AS ENUM (
  'auto_seed',
  'auto_expand',
  'curated_refine'
);

CREATE TYPE falak.falak_map_job_status AS ENUM (
  'queued',
  'running',
  'completed',
  'failed'
);

CREATE TYPE falak.falak_map_relation AS ENUM (
  'influences',
  'contradicts',
  'extends',
  'belongs_to',
  'derived_from',
  'similar_to',
  'co_occurs_with'
);

CREATE TABLE falak.map_definitions (
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

CREATE TABLE falak.map_categories (
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

CREATE TABLE falak.map_axes (
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

CREATE TABLE falak.map_nodes (
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

CREATE TABLE falak.map_edges (
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

CREATE TABLE falak.map_node_sources (
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

CREATE TABLE falak.map_layout_snapshots (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  nodes_json jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (map_id, version)
);

CREATE TABLE falak.map_jobs (
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

CREATE TABLE falak.map_job_logs (
  id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES falak.map_jobs(id) ON DELETE CASCADE,
  step text NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE falak.map_aliases (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  node_id text NOT NULL REFERENCES falak.map_nodes(id) ON DELETE CASCADE,
  alias text NOT NULL,
  canonical_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (map_id, alias)
);

CREATE TABLE falak.map_overrides (
  id text PRIMARY KEY,
  map_id text NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX map_definitions_tenant_status_idx
  ON falak.map_definitions (tenant_id, status);

CREATE INDEX map_categories_map_order_idx
  ON falak.map_categories (map_id, "order");

CREATE INDEX map_nodes_map_category_idx
  ON falak.map_nodes (map_id, category_key);

CREATE INDEX map_edges_map_relation_idx
  ON falak.map_edges (map_id, relation);

CREATE INDEX map_edges_source_idx
  ON falak.map_edges (source_id);

CREATE INDEX map_edges_target_idx
  ON falak.map_edges (target_id);

CREATE INDEX map_node_sources_map_idx
  ON falak.map_node_sources (map_id);

CREATE INDEX map_node_sources_node_idx
  ON falak.map_node_sources (node_id);

CREATE INDEX map_layout_snapshots_map_created_idx
  ON falak.map_layout_snapshots (map_id, created_at DESC);

CREATE INDEX map_jobs_tenant_status_created_idx
  ON falak.map_jobs (tenant_id, status, created_at DESC);

CREATE INDEX map_jobs_map_idx
  ON falak.map_jobs (map_id);

CREATE INDEX map_job_logs_job_created_idx
  ON falak.map_job_logs (job_id, created_at ASC);

CREATE INDEX map_aliases_node_idx
  ON falak.map_aliases (node_id);

CREATE INDEX map_overrides_map_created_idx
  ON falak.map_overrides (map_id, created_at DESC);
