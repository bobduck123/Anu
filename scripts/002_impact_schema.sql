-- =============================================================================
-- ANU IMPACT SCHEMA - Membership, Subscriptions, Impact Pools & Ledger
-- Run after 001_core_schema.sql
-- =============================================================================

-- =============================================================================
-- MEMBERSHIP & SUBSCRIPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS "MembershipPlans" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    "stripePriceId" TEXT NOT NULL UNIQUE,
    "stripeProductId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "intervalMonths" INTEGER DEFAULT 1,
    "creditGrantMonthly" INTEGER NOT NULL,
    "poolAllocationPct" DECIMAL(5,4) NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE subscription_status AS ENUM (
    'active', 'past_due', 'canceled', 'trialing', 
    'incomplete', 'incomplete_expired', 'unpaid'
);

CREATE TABLE IF NOT EXISTS "Subscriptions" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    "planId" TEXT NOT NULL REFERENCES "MembershipPlans"(id) ON DELETE CASCADE,
    "stripeCustomerId" TEXT NOT NULL UNIQUE,
    "stripeSubscriptionId" TEXT NOT NULL UNIQUE,
    status subscription_status NOT NULL,
    "currentPeriodStart" TIMESTAMPTZ NOT NULL,
    "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
    "streakMonths" INTEGER DEFAULT 0,
    "lastPaymentAt" TIMESTAMPTZ,
    "cancelAtPeriodEnd" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_subscriptions_customer ON "Subscriptions"("stripeCustomerId");

-- =============================================================================
-- IMPACT POOLS & LEDGER (APPEND-ONLY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "ImpactPools" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    "targetAmountCents" INTEGER NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE ledger_entry_type AS ENUM (
    'subscription_credit', 'manual_credit', 'allocation_debit', 'reversal'
);

CREATE TABLE IF NOT EXISTS "ImpactLedgerEntries" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "poolId" TEXT NOT NULL REFERENCES "ImpactPools"(id) ON DELETE CASCADE,
    "entryType" ledger_entry_type NOT NULL,
    "amountCents" INTEGER NOT NULL,
    description TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "reversalOf" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "createdBy" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_impact_ledger_pool ON "ImpactLedgerEntries"("poolId");
CREATE INDEX IF NOT EXISTS ix_impact_ledger_created ON "ImpactLedgerEntries"("createdAt");

-- Append-only enforcement rule
CREATE OR REPLACE RULE impact_ledger_no_update AS
    ON UPDATE TO "ImpactLedgerEntries"
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE impact_ledger_no_delete AS
    ON DELETE TO "ImpactLedgerEntries"
    DO INSTEAD NOTHING;

-- =============================================================================
-- IMPACT CREDITS (APPEND-ONLY)
-- =============================================================================

CREATE TYPE credit_tx_type AS ENUM (
    'monthly_grant', 'streak_bonus', 'spend', 'adjustment', 'reversal'
);

CREATE TABLE IF NOT EXISTS "ImpactCreditTransactions" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT REFERENCES "Subscriptions"(id) ON DELETE SET NULL,
    "transactionType" credit_tx_type NOT NULL,
    "amountCredits" INTEGER NOT NULL,
    description TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_credit_tx_user ON "ImpactCreditTransactions"("userId");
CREATE INDEX IF NOT EXISTS ix_credit_tx_created ON "ImpactCreditTransactions"("createdAt");

-- Append-only enforcement rule
CREATE OR REPLACE RULE credit_tx_no_update AS
    ON UPDATE TO "ImpactCreditTransactions"
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE credit_tx_no_delete AS
    ON DELETE TO "ImpactCreditTransactions"
    DO INSTEAD NOTHING;

-- =============================================================================
-- AUDIT LOG (APPEND-ONLY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "AuditLogs" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    action TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    before JSONB,
    after JSONB,
    ip TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_audit_actor ON "AuditLogs"("actorId");
CREATE INDEX IF NOT EXISTS ix_audit_target ON "AuditLogs"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS ix_audit_created ON "AuditLogs"("createdAt");

-- Append-only enforcement rule
CREATE OR REPLACE RULE audit_log_no_update AS
    ON UPDATE TO "AuditLogs"
    DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete AS
    ON DELETE TO "AuditLogs"
    DO INSTEAD NOTHING;

-- =============================================================================
-- STRIPE WEBHOOKS (IDEMPOTENCY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "StripeEvents" (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    "processedAt" TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL,
    "errorMessage" TEXT,
    payload JSONB
);
CREATE INDEX IF NOT EXISTS ix_stripe_events_processed ON "StripeEvents"("processedAt");

-- =============================================================================
-- FLORA FAUNA MEMETIC MUTUAL-AID SUBSYSTEM
-- =============================================================================

CREATE TYPE meme_lineage_relation_type AS ENUM (
    'remix', 'reference', 'response', 'seed'
);

CREATE TABLE IF NOT EXISTS creator_channels (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT NOT NULL UNIQUE,
    "creatorUserId" TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    manifesto TEXT,
    "sharePolicy" TEXT DEFAULT 'free_shareable',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_creator_channels_user ON creator_channels("creatorUserId");

CREATE TABLE IF NOT EXISTS memes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "channelId" TEXT NOT NULL REFERENCES creator_channels(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body TEXT,
    summary TEXT,
    "mediaUrl" TEXT,
    "attentionScore" DECIMAL(10,4) DEFAULT 0,
    shareable BOOLEAN DEFAULT TRUE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_memes_channel_created ON memes("channelId", "createdAt");
CREATE INDEX IF NOT EXISTS ix_memes_created_by ON memes("createdBy", "createdAt");

CREATE TABLE IF NOT EXISTS meme_lineage_edges (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "parentMemeId" TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
    "childMemeId" TEXT NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
    "relationType" meme_lineage_relation_type NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("parentMemeId", "childMemeId", "relationType")
);
CREATE INDEX IF NOT EXISTS ix_lineage_child ON meme_lineage_edges("childMemeId");

CREATE TABLE IF NOT EXISTS nutrient_snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "channelId" TEXT NOT NULL REFERENCES creator_channels(id) ON DELETE CASCADE,
    "memeId" TEXT REFERENCES memes(id) ON DELETE SET NULL,
    "capturedAt" TIMESTAMPTZ DEFAULT NOW(),
    "careIndex" DECIMAL(5,4) NOT NULL,
    "reciprocityIndex" DECIMAL(5,4) NOT NULL,
    "resonanceIndex" DECIMAL(5,4) NOT NULL,
    "originalityIndex" DECIMAL(5,4) NOT NULL,
    "stewardshipIndex" DECIMAL(5,4) NOT NULL,
    "mycelialDensityIndex" DECIMAL(5,4) NOT NULL,
    "ecologyIdentity" TEXT NOT NULL,
    "identityConfidence" DECIMAL(5,4) NOT NULL,
    "nutrientVector" JSONB NOT NULL,
    "capturedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_nutrient_channel_captured ON nutrient_snapshots("channelId", "capturedAt");
CREATE INDEX IF NOT EXISTS ix_nutrient_meme ON nutrient_snapshots("memeId");

CREATE TABLE IF NOT EXISTS geological_form_snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "channelId" TEXT NOT NULL REFERENCES creator_channels(id) ON DELETE CASCADE,
    "nutrientSnapshotId" TEXT NOT NULL UNIQUE REFERENCES nutrient_snapshots(id) ON DELETE CASCADE,
    "formKey" TEXT NOT NULL,
    "strataSummary" TEXT NOT NULL,
    "permeabilityIndex" DECIMAL(5,4) NOT NULL,
    "volatilityIndex" DECIMAL(5,4) NOT NULL,
    "stabilityIndex" DECIMAL(5,4) NOT NULL,
    rationale JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_geological_channel_created ON geological_form_snapshots("channelId", "createdAt");

-- =============================================================================
-- REVENUE & ATTRIBUTION
-- =============================================================================

CREATE TYPE revenue_source_type AS ENUM (
    'subscription', 'attention_sponsorship', 'partnership', 'grant', 'other_downstream'
);

CREATE TYPE attribution_recipient_type AS ENUM (
    'creator', 'platform', 'pool'
);

CREATE TABLE IF NOT EXISTS revenue_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "subscriptionId" TEXT REFERENCES "Subscriptions"(id) ON DELETE SET NULL,
    "channelId" TEXT REFERENCES creator_channels(id) ON DELETE SET NULL,
    "memeId" TEXT REFERENCES memes(id) ON DELETE SET NULL,
    "sourceType" revenue_source_type NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "netAmountCents" INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    memo TEXT,
    "recognizedAt" TIMESTAMPTZ DEFAULT NOW(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_revenue_subscription ON revenue_events("subscriptionId", "recognizedAt");
CREATE INDEX IF NOT EXISTS ix_revenue_channel ON revenue_events("channelId", "recognizedAt");

CREATE TABLE IF NOT EXISTS attribution_splits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "revenueEventId" TEXT NOT NULL REFERENCES revenue_events(id) ON DELETE CASCADE,
    "recipientType" attribution_recipient_type NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sharePct" DECIMAL(5,4) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_attribution_revenue ON attribution_splits("revenueEventId");
CREATE INDEX IF NOT EXISTS ix_attribution_recipient ON attribution_splits("recipientType", "recipientId");

-- =============================================================================
-- LIQUIDITY POOLS
-- =============================================================================

CREATE TYPE ledger_account_type AS ENUM (
    'treasury', 'allocation_reserve', 'revenue_clearing', 
    'creator_reserve', 'mutual_aid_disbursed', 'platform_reserve'
);

CREATE TYPE pool_ledger_entry_kind AS ENUM (
    'funding_inflow', 'allocation_reservation', 'allocation_release',
    'creator_allocation', 'pool_allocation', 'disbursement', 'adjustment'
);

CREATE TABLE IF NOT EXISTS liquidity_pools (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    "policyJson" JSONB,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "poolId" TEXT NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    "accountType" ledger_account_type NOT NULL,
    currency TEXT DEFAULT 'usd',
    "isSystem" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("poolId", code)
);
CREATE INDEX IF NOT EXISTS ix_ledger_accounts_pool ON ledger_accounts("poolId", "accountType");

CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "journalId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
    "accountId" TEXT NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
    "entryKind" pool_ledger_entry_kind NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    memo TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ledger_pool_created ON ledger_entries("poolId", "createdAt");
CREATE INDEX IF NOT EXISTS ix_ledger_journal ON ledger_entries("journalId");
CREATE INDEX IF NOT EXISTS ix_ledger_account_created ON ledger_entries("accountId", "createdAt");

-- =============================================================================
-- ALLOCATION REQUESTS & DISBURSEMENTS
-- =============================================================================

CREATE TYPE allocation_request_status AS ENUM (
    'pending', 'approved', 'rejected', 'disbursed', 'canceled'
);

CREATE TYPE disbursement_status AS ENUM (
    'pending', 'sent', 'settled', 'failed', 'reversed'
);

CREATE TABLE IF NOT EXISTS allocation_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "poolId" TEXT NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
    "requestedBy" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    purpose TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    status allocation_request_status DEFAULT 'pending',
    rationale TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_allocation_pool_status ON allocation_requests("poolId", status, "createdAt");
CREATE INDEX IF NOT EXISTS ix_allocation_beneficiary ON allocation_requests("beneficiaryId", "createdAt");

CREATE TABLE IF NOT EXISTS disbursements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "allocationRequestId" TEXT NOT NULL REFERENCES allocation_requests(id) ON DELETE CASCADE,
    "poolId" TEXT NOT NULL REFERENCES liquidity_pools(id) ON DELETE CASCADE,
    "amountCents" INTEGER NOT NULL,
    status disbursement_status DEFAULT 'pending',
    "destinationRef" TEXT,
    "executedBy" TEXT,
    "executedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_disbursements_pool ON disbursements("poolId", status, "createdAt");

-- =============================================================================
-- MODERATION SYSTEM
-- =============================================================================

CREATE TYPE moderation_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE moderation_case_status AS ENUM ('open', 'reviewed', 'actioned', 'closed');
CREATE TYPE moderation_action_type AS ENUM (
    'note', 'warn', 'label', 'limit', 'remove', 'restore', 'close', 'escalate'
);

CREATE TABLE IF NOT EXISTS moderation_cases (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "channelId" TEXT REFERENCES creator_channels(id) ON DELETE SET NULL,
    "memeId" TEXT REFERENCES memes(id) ON DELETE SET NULL,
    "openedBy" TEXT NOT NULL,
    status moderation_case_status DEFAULT 'open',
    severity moderation_severity NOT NULL,
    summary TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_moderation_status ON moderation_cases(status, "createdAt");
CREATE INDEX IF NOT EXISTS ix_moderation_channel ON moderation_cases("channelId");
CREATE INDEX IF NOT EXISTS ix_moderation_meme ON moderation_cases("memeId");

CREATE TABLE IF NOT EXISTS moderation_actions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
    "actionType" moderation_action_type NOT NULL,
    "actorId" TEXT NOT NULL,
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_moderation_actions_case ON moderation_actions("caseId", "createdAt");

CREATE TABLE IF NOT EXISTS risk_flags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "channelId" TEXT REFERENCES creator_channels(id) ON DELETE SET NULL,
    "memeId" TEXT REFERENCES memes(id) ON DELETE SET NULL,
    "caseId" TEXT REFERENCES moderation_cases(id) ON DELETE SET NULL,
    "flagType" TEXT NOT NULL,
    severity moderation_severity NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_risk_flags_severity ON risk_flags(severity, "createdAt");
CREATE INDEX IF NOT EXISTS ix_risk_flags_channel ON risk_flags("channelId");
CREATE INDEX IF NOT EXISTS ix_risk_flags_meme ON risk_flags("memeId");

-- =============================================================================
-- DOMAIN EVENTS & AUDIT
-- =============================================================================

CREATE TABLE IF NOT EXISTS domain_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    payload JSONB NOT NULL,
    "actorId" TEXT,
    "correlationId" TEXT,
    "occurredAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_domain_events_aggregate ON domain_events("aggregateType", "aggregateId", "occurredAt");
CREATE INDEX IF NOT EXISTS ix_domain_events_type ON domain_events("eventType", "occurredAt");

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    action TEXT NOT NULL,
    "actorId" TEXT,
    before JSONB,
    after JSONB,
    ip TEXT,
    "requestId" TEXT,
    "occurredAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_audit_events_entity ON audit_events("entityType", "entityId", "occurredAt");
CREATE INDEX IF NOT EXISTS ix_audit_events_actor ON audit_events("actorId", "occurredAt");

-- =============================================================================
-- BENEFITS ACCOUNTS (Per-node benefits tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS benefits_account (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    global_subject_id VARCHAR(120) NOT NULL,
    balance_cents INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_benefits_account_subject UNIQUE (node_id, global_subject_id)
);
CREATE INDEX IF NOT EXISTS ix_benefits_account_node ON benefits_account(node_id);

CREATE TABLE IF NOT EXISTS benefits_ledger_entry (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    global_subject_id VARCHAR(120) NOT NULL,
    entry_type VARCHAR(40) NOT NULL,
    amount_cents INTEGER NOT NULL,
    source_event_id VARCHAR(120),
    metadata_json JSONB,
    created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_benefits_ledger_node ON benefits_ledger_entry(node_id);
CREATE INDEX IF NOT EXISTS ix_benefits_ledger_subject ON benefits_ledger_entry(global_subject_id);
CREATE INDEX IF NOT EXISTS ix_benefits_ledger_created_at ON benefits_ledger_entry(created_at);

-- =============================================================================
-- IMPACT POOLS (Flask version - per node)
-- =============================================================================

CREATE TABLE IF NOT EXISTS impact_pool (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    slug VARCHAR(120) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    category VARCHAR(120),
    target_amount_cents INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_impact_pool_node_slug UNIQUE (node_id, slug)
);
CREATE INDEX IF NOT EXISTS ix_impact_pool_node_id ON impact_pool(node_id);

CREATE TABLE IF NOT EXISTS impact_ledger_entry (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    pool_id INTEGER NOT NULL REFERENCES impact_pool(id) ON DELETE CASCADE,
    entry_type VARCHAR(50) NOT NULL,
    amount_cents INTEGER NOT NULL,
    description VARCHAR(500),
    reference_id VARCHAR(120),
    reference_type VARCHAR(120),
    reversal_of INTEGER REFERENCES impact_ledger_entry(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_impact_ledger_node_id ON impact_ledger_entry(node_id);
CREATE INDEX IF NOT EXISTS ix_impact_ledger_pool_id ON impact_ledger_entry(pool_id);
CREATE INDEX IF NOT EXISTS ix_impact_ledger_created_at ON impact_ledger_entry(created_at);

COMMIT;
