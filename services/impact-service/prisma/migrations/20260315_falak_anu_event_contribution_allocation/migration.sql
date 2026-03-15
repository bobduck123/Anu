SET search_path TO falak, public;

CREATE TABLE IF NOT EXISTS falak.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  node_id UUID NOT NULL UNIQUE REFERENCES falak.nodes(id) ON DELETE CASCADE,
  event_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
  pool_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
  contributor_actor_id UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  amount NUMERIC(18,6) NOT NULL,
  currency TEXT NOT NULL,
  note TEXT,
  reference TEXT,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_falak_contributions_amount_positive CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_falak_contributions_tenant_event_created_at
ON falak.contributions(tenant_id, event_node_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_contributions_tenant_pool_created_at
ON falak.contributions(tenant_id, pool_node_id, created_at DESC);

ALTER TABLE falak.contributions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY falak_contributions_isolation ON falak.contributions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS falak.allocation_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES falak.tenants(id) ON DELETE CASCADE,
  node_id UUID NOT NULL UNIQUE REFERENCES falak.nodes(id) ON DELETE CASCADE,
  event_node_id UUID REFERENCES falak.nodes(id) ON DELETE SET NULL,
  pool_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES falak.nodes(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES falak.actors(id) ON DELETE SET NULL,
  amount NUMERIC(18,6) NOT NULL,
  currency TEXT NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approval_id UUID UNIQUE REFERENCES falak.approvals(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_falak_allocation_proposals_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_falak_allocation_proposals_status CHECK (status IN ('pending', 'executed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_falak_allocation_proposals_tenant_event_created_at
ON falak.allocation_proposals(tenant_id, event_node_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_allocation_proposals_tenant_pool_status_created_at
ON falak.allocation_proposals(tenant_id, pool_node_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_falak_allocation_proposals_tenant_target_status
ON falak.allocation_proposals(tenant_id, target_node_id, status);

DROP TRIGGER IF EXISTS trg_allocation_proposals_updated_at ON falak.allocation_proposals;
CREATE TRIGGER trg_allocation_proposals_updated_at
BEFORE UPDATE ON falak.allocation_proposals
FOR EACH ROW EXECUTE FUNCTION falak.set_updated_at();

ALTER TABLE falak.allocation_proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY falak_allocation_proposals_isolation ON falak.allocation_proposals
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
