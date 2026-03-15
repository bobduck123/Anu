CREATE SCHEMA IF NOT EXISTS falak;

SET search_path TO falak, public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE falak.falak_node_status AS ENUM ('draft', 'active', 'archived', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE falak.falak_visibility AS ENUM ('public', 'tenant', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE falak.falak_edge_status AS ENUM ('active', 'deprecated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE falak.falak_policy_effect AS ENUM ('allow', 'deny', 'requires_approval');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE falak.falak_event_policy_result AS ENUM ('allowed', 'denied', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE falak.falak_approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE falak.falak_ledger_category AS ENUM (
    'financial',
    'governance',
    'verification',
    'moderation',
    'security',
    'publication'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION falak.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION falak.prevent_event_update_delete()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'falak.events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION falak.prevent_ledger_update_delete()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'falak.ledger_entries is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION falak.bump_node_version()
RETURNS trigger AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION falak.validate_edge_scope()
RETURNS trigger AS $$
DECLARE
  source_tenant UUID;
  source_status falak.falak_node_status;
  target_tenant UUID;
  target_status falak.falak_node_status;
  target_visibility falak.falak_visibility;
  is_federation BOOLEAN;
BEGIN
  SELECT tenant_id, status
  INTO source_tenant, source_status
  FROM falak.nodes
  WHERE id = NEW.from_node;

  SELECT tenant_id, status, visibility
  INTO target_tenant, target_status, target_visibility
  FROM falak.nodes
  WHERE id = NEW.to_node;

  IF source_tenant IS NULL OR target_tenant IS NULL THEN
    RAISE EXCEPTION 'edge endpoints must reference existing nodes';
  END IF;

  IF source_status = 'deleted'::falak.falak_node_status OR target_status = 'deleted'::falak.falak_node_status THEN
    RAISE EXCEPTION 'edge endpoints cannot reference deleted nodes';
  END IF;

  IF source_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'source node tenant must match edge tenant';
  END IF;

  is_federation := COALESCE((NEW.metadata ->> 'federation')::boolean, FALSE);

  IF is_federation THEN
    IF target_visibility <> 'public'::falak.falak_visibility THEN
      RAISE EXCEPTION 'federation targets must be public';
    END IF;
  ELSIF target_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'non-federation edges must remain within tenant scope';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS falak.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON falak.tenants;
CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON falak.tenants
FOR EACH ROW EXECUTE FUNCTION falak.set_updated_at();

CREATE TABLE IF NOT EXISTS falak.actors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,
  external_auth_id TEXT,
  email TEXT,
  display_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, external_auth_id)
);

CREATE INDEX IF NOT EXISTS idx_falak_actors_tenant_id ON falak.actors(tenant_id);

DROP TRIGGER IF EXISTS trg_actors_updated_at ON falak.actors;
CREATE TRIGGER trg_actors_updated_at
BEFORE UPDATE ON falak.actors
FOR EACH ROW EXECUTE FUNCTION falak.set_updated_at();

CREATE TABLE IF NOT EXISTS falak.actor_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES falak.actors(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  region_node_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, actor_id, role_name, region_node_id)
);

CREATE INDEX IF NOT EXISTS idx_falak_actor_roles_actor_id ON falak.actor_roles(actor_id);
CREATE INDEX IF NOT EXISTS idx_falak_actor_roles_tenant_actor ON falak.actor_roles(tenant_id, actor_id);

CREATE TABLE IF NOT EXISTS falak.nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status falak.falak_node_status NOT NULL DEFAULT 'draft',
  visibility falak.falak_visibility NOT NULL DEFAULT 'tenant',
  sensitivity_class TEXT NOT NULL DEFAULT 'normal',
  slug TEXT,
  title TEXT,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  geometry geometry(Geometry, 4326),
  time_start TIMESTAMPTZ,
  time_end TIMESTAMPTZ,
  created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version BIGINT NOT NULL DEFAULT 1,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(metadata::text, '')), 'C')
  ) STORED,
  CONSTRAINT chk_falak_nodes_time_range CHECK (
    time_end IS NULL OR time_start IS NULL OR time_end >= time_start
  ),
  CONSTRAINT chk_falak_nodes_geometry_srid CHECK (
    geometry IS NULL OR ST_SRID(geometry) = 4326
  ),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_falak_nodes_tenant_id ON falak.nodes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_type ON falak.nodes(type);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_status ON falak.nodes(status);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_visibility ON falak.nodes(visibility);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_tenant_type_status ON falak.nodes(tenant_id, type, status);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_time_start ON falak.nodes(time_start);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_time_end ON falak.nodes(time_end);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_metadata_gin ON falak.nodes USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_geometry_gist ON falak.nodes USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_falak_nodes_search_vector ON falak.nodes USING GIN (search_vector);

DROP TRIGGER IF EXISTS trg_nodes_updated_at ON falak.nodes;
CREATE TRIGGER trg_nodes_updated_at
BEFORE UPDATE ON falak.nodes
FOR EACH ROW EXECUTE FUNCTION falak.set_updated_at();

DROP TRIGGER IF EXISTS trg_nodes_bump_version ON falak.nodes;
CREATE TRIGGER trg_nodes_bump_version
BEFORE UPDATE ON falak.nodes
FOR EACH ROW EXECUTE FUNCTION falak.bump_node_version();

DO $$ BEGIN
  ALTER TABLE falak.actor_roles
    ADD CONSTRAINT fk_falak_actor_roles_region_node
    FOREIGN KEY (region_node_id) REFERENCES falak.nodes(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS falak.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  from_node UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
  to_node UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  status falak.falak_edge_status NOT NULL DEFAULT 'active',
  weight NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_falak_edges_valid_range CHECK (
    valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from
  )
);

CREATE INDEX IF NOT EXISTS idx_falak_edges_tenant_id ON falak.edges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_falak_edges_from_node ON falak.edges(from_node);
CREATE INDEX IF NOT EXISTS idx_falak_edges_to_node ON falak.edges(to_node);
CREATE INDEX IF NOT EXISTS idx_falak_edges_relation ON falak.edges(relation);
CREATE INDEX IF NOT EXISTS idx_falak_edges_tenant_from_relation ON falak.edges(tenant_id, from_node, relation);
CREATE INDEX IF NOT EXISTS idx_falak_edges_tenant_to_relation ON falak.edges(tenant_id, to_node, relation);
CREATE INDEX IF NOT EXISTS idx_falak_edges_metadata_gin ON falak.edges USING GIN (metadata);

DROP TRIGGER IF EXISTS trg_edges_validate_scope ON falak.edges;
CREATE TRIGGER trg_edges_validate_scope
BEFORE INSERT OR UPDATE ON falak.edges
FOR EACH ROW EXECUTE FUNCTION falak.validate_edge_scope();

CREATE TABLE IF NOT EXISTS falak.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  action TEXT NOT NULL,
  effect falak.falak_policy_effect NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_falak_policies_tenant_resource_action
ON falak.policies(tenant_id, resource_type, action, enabled, priority);

CREATE INDEX IF NOT EXISTS idx_falak_policies_conditions_gin
ON falak.policies USING GIN (conditions);

DROP TRIGGER IF EXISTS trg_policies_updated_at ON falak.policies;
CREATE TRIGGER trg_policies_updated_at
BEFORE UPDATE ON falak.policies
FOR EACH ROW EXECUTE FUNCTION falak.set_updated_at();

CREATE TABLE IF NOT EXISTS falak.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  status falak.falak_approval_status NOT NULL DEFAULT 'pending',
  required_approvals INTEGER NOT NULL DEFAULT 1,
  current_approvals INTEGER NOT NULL DEFAULT 0,
  requested_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT chk_falak_approvals_required_positive CHECK (required_approvals >= 1),
  CONSTRAINT chk_falak_approvals_current_nonnegative CHECK (current_approvals >= 0),
  CONSTRAINT chk_falak_approvals_current_bounded CHECK (current_approvals <= required_approvals)
);

CREATE INDEX IF NOT EXISTS idx_falak_approvals_tenant_status
ON falak.approvals(tenant_id, status, request_type);

CREATE INDEX IF NOT EXISTS idx_falak_approvals_target
ON falak.approvals(target_type, target_id);

DROP TRIGGER IF EXISTS trg_approvals_updated_at ON falak.approvals;
CREATE TRIGGER trg_approvals_updated_at
BEFORE UPDATE ON falak.approvals
FOR EACH ROW EXECUTE FUNCTION falak.set_updated_at();

CREATE TABLE IF NOT EXISTS falak.approval_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES falak.approvals(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES falak.actors(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (approval_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_falak_approval_votes_approval_id
ON falak.approval_votes(approval_id);

CREATE TABLE IF NOT EXISTS falak.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  correlation_id UUID,
  causation_id UUID,
  trace_id UUID,
  policy_result falak.falak_event_policy_result NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_falak_events_tenant_occurred_at
ON falak.events(tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_events_tenant_event_type
ON falak.events(tenant_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_events_target
ON falak.events(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_falak_events_trace_id
ON falak.events(trace_id);

CREATE INDEX IF NOT EXISTS idx_falak_events_payload_gin
ON falak.events USING GIN (payload);

DROP TRIGGER IF EXISTS trg_events_no_update ON falak.events;
CREATE TRIGGER trg_events_no_update
BEFORE UPDATE OR DELETE ON falak.events
FOR EACH ROW EXECUTE FUNCTION falak.prevent_event_update_delete();

CREATE TABLE IF NOT EXISTS falak.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  category falak.falak_ledger_category NOT NULL,
  event_id UUID REFERENCES falak.events(id) ON DELETE SET NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  amount NUMERIC(18,6),
  currency TEXT,
  hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_falak_ledger_entries_tenant_category_time
ON falak.ledger_entries(tenant_id, category, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_ledger_entries_reference
ON falak.ledger_entries(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_falak_ledger_entries_metadata_gin
ON falak.ledger_entries USING GIN (metadata);

DROP TRIGGER IF EXISTS trg_ledger_no_update ON falak.ledger_entries;
CREATE TRIGGER trg_ledger_no_update
BEFORE UPDATE OR DELETE ON falak.ledger_entries
FOR EACH ROW EXECUTE FUNCTION falak.prevent_ledger_update_delete();

CREATE TABLE IF NOT EXISTS falak.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES falak.actors(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  target_id UUID,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_channel TEXT NOT NULL DEFAULT 'in_app',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, actor_id, subscription_type, target_id, delivery_channel)
);

CREATE INDEX IF NOT EXISTS idx_falak_subscriptions_tenant_actor
ON falak.subscriptions(tenant_id, actor_id);

CREATE TABLE IF NOT EXISTS falak.derived_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_rebuilt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, view_name, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_falak_derived_views_lookup
ON falak.derived_views(tenant_id, view_name, target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_falak_derived_views_data_gin
ON falak.derived_views USING GIN (data);

CREATE TABLE IF NOT EXISTS falak.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES falak.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  plane TEXT NOT NULL CHECK (plane IN ('public', 'privileged', 'system')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_falak_audit_log_tenant_created_at
ON falak.audit_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_audit_log_resource
ON falak.audit_log(resource_type, resource_id);

ALTER TABLE falak.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.actor_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.approval_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.derived_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE falak.audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY falak_tenants_isolation ON falak.tenants
    USING (id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_actors_isolation ON falak.actors
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_actor_roles_isolation ON falak.actor_roles
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_nodes_isolation ON falak.nodes
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_edges_isolation ON falak.edges
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_policies_isolation ON falak.policies
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_approvals_isolation ON falak.approvals
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_approval_votes_isolation ON falak.approval_votes
    USING (
      EXISTS (
        SELECT 1
        FROM falak.approvals approvals
        WHERE approvals.id = approval_id
          AND approvals.tenant_id = current_setting('app.current_tenant_id', true)::uuid
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_events_isolation ON falak.events
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_ledger_entries_isolation ON falak.ledger_entries
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_subscriptions_isolation ON falak.subscriptions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_derived_views_isolation ON falak.derived_views
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY falak_audit_log_isolation ON falak.audit_log
    USING (
      tenant_id IS NULL OR
      tenant_id = current_setting('app.current_tenant_id', true)::uuid
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
