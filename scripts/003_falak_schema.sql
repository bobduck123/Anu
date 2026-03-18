-- =============================================================================
-- FALAK PROTOCOL SCHEMA
-- A separate PostgreSQL schema for the Falak knowledge graph protocol
-- Run after 002_impact_schema.sql
-- =============================================================================

-- Create the falak schema
CREATE SCHEMA IF NOT EXISTS falak;

-- Enable PostGIS if not already enabled (for spatial queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================================================
-- FALAK ENUMS
-- =============================================================================

CREATE TYPE falak.falak_node_status AS ENUM ('draft', 'active', 'archived', 'deleted');
CREATE TYPE falak.falak_visibility AS ENUM ('public', 'tenant', 'restricted');
CREATE TYPE falak.falak_edge_status AS ENUM ('active', 'deprecated');
CREATE TYPE falak.falak_policy_effect AS ENUM ('allow', 'deny', 'requires_approval');
CREATE TYPE falak.falak_event_policy_result AS ENUM ('allowed', 'denied', 'pending');
CREATE TYPE falak.falak_approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE falak.falak_ledger_category AS ENUM (
    'financial', 'governance', 'verification', 'moderation', 'security', 'publication'
);

-- =============================================================================
-- FALAK TENANT
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FALAK ACTORS & ROLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL,
    external_auth_id TEXT,
    email TEXT,
    display_name TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, external_auth_id)
);
CREATE INDEX IF NOT EXISTS ix_falak_actors_tenant ON falak.actors(tenant_id);

CREATE TABLE IF NOT EXISTS falak.actor_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES falak.actors(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL,
    region_node_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, actor_id, role_name, region_node_id)
);
CREATE INDEX IF NOT EXISTS ix_falak_actor_roles_actor ON falak.actor_roles(actor_id);
CREATE INDEX IF NOT EXISTS ix_falak_actor_roles_tenant ON falak.actor_roles(tenant_id, actor_id);

-- =============================================================================
-- FALAK NODES (Knowledge Graph Nodes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    status falak.falak_node_status DEFAULT 'draft',
    visibility falak.falak_visibility DEFAULT 'tenant',
    sensitivity_class TEXT DEFAULT 'normal',
    slug TEXT,
    title TEXT,
    summary TEXT,
    metadata JSONB DEFAULT '{}',
    geometry geometry(Geometry, 4326),
    time_start TIMESTAMPTZ,
    time_end TIMESTAMPTZ,
    created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version BIGINT DEFAULT 1,
    UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_tenant ON falak.nodes(tenant_id);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_type ON falak.nodes(type);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_status ON falak.nodes(status);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_visibility ON falak.nodes(visibility);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_tenant_type_status ON falak.nodes(tenant_id, type, status);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_time_start ON falak.nodes(time_start);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_time_end ON falak.nodes(time_end);
CREATE INDEX IF NOT EXISTS ix_falak_nodes_geometry ON falak.nodes USING GIST(geometry);

-- Add foreign key for actor_roles region
ALTER TABLE falak.actor_roles 
    ADD CONSTRAINT fk_actor_roles_region 
    FOREIGN KEY (region_node_id) REFERENCES falak.nodes(id) ON DELETE SET NULL;

-- =============================================================================
-- FALAK EDGES (Knowledge Graph Edges)
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    from_node UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
    to_node UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
    relation TEXT NOT NULL,
    status falak.falak_edge_status DEFAULT 'active',
    weight DECIMAL(10, 4) DEFAULT 1.0,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    evidence JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_edges_tenant ON falak.edges(tenant_id);
CREATE INDEX IF NOT EXISTS ix_falak_edges_from ON falak.edges(from_node);
CREATE INDEX IF NOT EXISTS ix_falak_edges_to ON falak.edges(to_node);
CREATE INDEX IF NOT EXISTS ix_falak_edges_relation ON falak.edges(relation);
CREATE INDEX IF NOT EXISTS ix_falak_edges_tenant_from_relation ON falak.edges(tenant_id, from_node, relation);
CREATE INDEX IF NOT EXISTS ix_falak_edges_tenant_to_relation ON falak.edges(tenant_id, to_node, relation);

-- =============================================================================
-- FALAK POLICIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    action TEXT NOT NULL,
    effect falak.falak_policy_effect NOT NULL,
    priority INTEGER DEFAULT 100,
    enabled BOOLEAN DEFAULT TRUE,
    conditions JSONB DEFAULT '{}',
    description TEXT,
    created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS ix_falak_policies_tenant ON falak.policies(tenant_id, resource_type, action, enabled, priority);

-- =============================================================================
-- FALAK APPROVALS
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    status falak.falak_approval_status DEFAULT 'pending',
    required_approvals INTEGER DEFAULT 1,
    current_approvals INTEGER DEFAULT 0,
    requested_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_falak_approvals_tenant_status ON falak.approvals(tenant_id, status, request_type);
CREATE INDEX IF NOT EXISTS ix_falak_approvals_target ON falak.approvals(target_type, target_id);

CREATE TABLE IF NOT EXISTS falak.approval_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID NOT NULL REFERENCES falak.approvals(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES falak.actors(id) ON DELETE CASCADE,
    vote TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (approval_id, actor_id)
);
CREATE INDEX IF NOT EXISTS ix_falak_approval_votes_approval ON falak.approval_votes(approval_id);

-- =============================================================================
-- FALAK CONTRIBUTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    node_id UUID NOT NULL UNIQUE REFERENCES falak.nodes(id) ON DELETE CASCADE,
    event_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
    pool_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
    contributor_actor_id UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    amount DECIMAL(18, 6) NOT NULL,
    currency TEXT NOT NULL,
    note TEXT,
    reference TEXT,
    contributed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_contributions_event ON falak.contributions(tenant_id, event_node_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_contributions_pool ON falak.contributions(tenant_id, pool_node_id, created_at DESC);

-- =============================================================================
-- FALAK ALLOCATION PROPOSALS
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.allocation_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    node_id UUID NOT NULL UNIQUE REFERENCES falak.nodes(id) ON DELETE CASCADE,
    event_node_id UUID REFERENCES falak.nodes(id) ON DELETE SET NULL,
    pool_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    amount DECIMAL(18, 6) NOT NULL,
    currency TEXT NOT NULL,
    rationale TEXT,
    status TEXT DEFAULT 'pending',
    approval_id UUID UNIQUE REFERENCES falak.approvals(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_allocation_event ON falak.allocation_proposals(tenant_id, event_node_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_allocation_pool ON falak.allocation_proposals(tenant_id, pool_node_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_allocation_target ON falak.allocation_proposals(tenant_id, target_node_id, status);

-- =============================================================================
-- FALAK EVENTS (Domain Events)
-- =============================================================================

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
    payload JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_events_tenant_occurred ON falak.events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_events_tenant_type ON falak.events(tenant_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_events_target ON falak.events(target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_falak_events_trace ON falak.events(trace_id);

-- =============================================================================
-- FALAK LEDGER (Immutable Ledger)
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    category falak.falak_ledger_category NOT NULL,
    event_id UUID REFERENCES falak.events(id) ON DELETE SET NULL,
    reference_type TEXT NOT NULL,
    reference_id UUID,
    amount DECIMAL(18, 6),
    currency TEXT,
    hash TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_ledger_tenant_category ON falak.ledger_entries(tenant_id, category, recorded_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_ledger_reference ON falak.ledger_entries(reference_type, reference_id);

-- Immutable ledger rules
CREATE OR REPLACE RULE falak_ledger_no_update AS
    ON UPDATE TO falak.ledger_entries
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE falak_ledger_no_delete AS
    ON DELETE TO falak.ledger_entries
    DO INSTEAD NOTHING;

-- =============================================================================
-- FALAK SUBSCRIPTIONS (Event Subscriptions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event_types JSONB DEFAULT '[]',
    filters JSONB DEFAULT '{}',
    webhook_url TEXT,
    webhook_secret TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS ix_falak_subscriptions_tenant ON falak.subscriptions(tenant_id, enabled);

-- =============================================================================
-- FALAK DERIVED VIEWS (Materialized Queries)
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.derived_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    view_type TEXT NOT NULL,
    query_spec JSONB NOT NULL,
    last_refreshed_at TIMESTAMPTZ,
    refresh_interval_seconds INTEGER DEFAULT 3600,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

-- =============================================================================
-- FALAK AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    ip_address TEXT,
    user_agent TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_audit_tenant ON falak.audit_logs(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_audit_actor ON falak.audit_logs(actor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_audit_resource ON falak.audit_logs(resource_type, resource_id);

-- =============================================================================
-- FALAK MAP DEFINITIONS & JOBS
-- =============================================================================

CREATE TABLE IF NOT EXISTS falak.map_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS ix_falak_map_defs_tenant ON falak.map_definitions(tenant_id);

CREATE TABLE IF NOT EXISTS falak.map_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
    map_definition_id UUID NOT NULL REFERENCES falak.map_definitions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    result_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_falak_map_jobs_tenant ON falak.map_jobs(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_falak_map_jobs_def ON falak.map_jobs(map_definition_id, status);

-- =============================================================================
-- GRANT PERMISSIONS (for Supabase service role)
-- =============================================================================

GRANT USAGE ON SCHEMA falak TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA falak TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA falak TO service_role;

-- Grant to authenticated users (for RLS)
GRANT USAGE ON SCHEMA falak TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA falak TO authenticated;

COMMIT;
