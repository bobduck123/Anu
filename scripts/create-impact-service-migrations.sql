-- Migration: Initialize Impact Service Schema
-- This creates all tables for the impact-service in the public schema

-- ============================================================================
-- MEMBERSHIP & SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "MembershipPlans" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  "stripePriceId" TEXT NOT NULL UNIQUE,
  "stripeProductId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "intervalMonths" INTEGER NOT NULL DEFAULT 1,
  "creditGrantMonthly" INTEGER NOT NULL,
  "poolAllocationPct" DECIMAL(5,4) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Subscriptions" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL UNIQUE,
  "stripeSubscriptionId" TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  "currentPeriodStart" TIMESTAMP NOT NULL,
  "currentPeriodEnd" TIMESTAMP NOT NULL,
  "streakMonths" INTEGER NOT NULL DEFAULT 0,
  "lastPaymentAt" TIMESTAMP,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("planId") REFERENCES "MembershipPlans"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Subscriptions_stripeCustomerId_idx" ON "Subscriptions"("stripeCustomerId");

-- ============================================================================
-- IMPACT POOLS & LEDGER (APPEND-ONLY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ImpactPools" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  "targetAmountCents" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ImpactLedgerEntries" (
  id TEXT PRIMARY KEY,
  "poolId" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  description TEXT NOT NULL,
  "referenceId" TEXT,
  "referenceType" TEXT,
  "reversalOf" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  FOREIGN KEY ("poolId") REFERENCES "ImpactPools"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ImpactLedgerEntries_poolId_idx" ON "ImpactLedgerEntries"("poolId");
CREATE INDEX IF NOT EXISTS "ImpactLedgerEntries_createdAt_idx" ON "ImpactLedgerEntries"("createdAt");

-- ============================================================================
-- IMPACT CREDITS (APPEND-ONLY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ImpactCreditTransactions" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "transactionType" TEXT NOT NULL,
  "amountCredits" INTEGER NOT NULL,
  description TEXT NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscriptions"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ImpactCreditTransactions_userId_idx" ON "ImpactCreditTransactions"("userId");
CREATE INDEX IF NOT EXISTS "ImpactCreditTransactions_createdAt_idx" ON "ImpactCreditTransactions"("createdAt");

-- ============================================================================
-- AUDIT LOG (APPEND-ONLY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  id TEXT PRIMARY KEY,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  action TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  before JSONB,
  after JSONB,
  ip TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AuditLogs_actorId_idx" ON "AuditLogs"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLogs_targetType_targetId_idx" ON "AuditLogs"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "AuditLogs_createdAt_idx" ON "AuditLogs"("createdAt");

-- ============================================================================
-- STRIPE WEBHOOKS (IDEMPOTENCY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "StripeEvents" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  "processedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,
  "errorMessage" TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS "StripeEvents_processedAt_idx" ON "StripeEvents"("processedAt");

-- ============================================================================
-- FLORA FAUNA MEMETIC MUTUAL-AID SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS "creator_channels" (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  "creatorUserId" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  manifesto TEXT,
  "sharePolicy" TEXT NOT NULL DEFAULT 'free_shareable',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "creator_channels_creatorUserId_idx" ON "creator_channels"("creatorUserId");

CREATE TABLE IF NOT EXISTS "memes" (
  id TEXT PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT,
  summary TEXT,
  "mediaUrl" TEXT,
  "attentionScore" DECIMAL(10,4) NOT NULL DEFAULT 0,
  shareable BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "memes_channelId_createdAt_idx" ON "memes"("channelId", "createdAt");
CREATE INDEX IF NOT EXISTS "memes_createdBy_createdAt_idx" ON "memes"("createdBy", "createdAt");

CREATE TABLE IF NOT EXISTS "meme_lineage_edges" (
  id TEXT PRIMARY KEY,
  "parentMemeId" TEXT NOT NULL,
  "childMemeId" TEXT NOT NULL,
  "relationType" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("parentMemeId") REFERENCES "memes"(id) ON DELETE CASCADE,
  FOREIGN KEY ("childMemeId") REFERENCES "memes"(id) ON DELETE CASCADE,
  UNIQUE ("parentMemeId", "childMemeId", "relationType")
);

CREATE INDEX IF NOT EXISTS "meme_lineage_edges_childMemeId_idx" ON "meme_lineage_edges"("childMemeId");

CREATE TABLE IF NOT EXISTS "nutrient_snapshots" (
  id TEXT PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "memeId" TEXT,
  "capturedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"(id) ON DELETE CASCADE,
  FOREIGN KEY ("memeId") REFERENCES "memes"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "nutrient_snapshots_channelId_capturedAt_idx" ON "nutrient_snapshots"("channelId", "capturedAt");
CREATE INDEX IF NOT EXISTS "nutrient_snapshots_memeId_idx" ON "nutrient_snapshots"("memeId");

CREATE TABLE IF NOT EXISTS "geological_form_snapshots" (
  id TEXT PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "nutrientSnapshotId" TEXT NOT NULL UNIQUE,
  "formKey" TEXT NOT NULL,
  "strataSummary" TEXT NOT NULL,
  "permeabilityIndex" DECIMAL(5,4) NOT NULL,
  "volatilityIndex" DECIMAL(5,4) NOT NULL,
  "stabilityIndex" DECIMAL(5,4) NOT NULL,
  rationale JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"(id) ON DELETE CASCADE,
  FOREIGN KEY ("nutrientSnapshotId") REFERENCES "nutrient_snapshots"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "geological_form_snapshots_channelId_createdAt_idx" ON "geological_form_snapshots"("channelId", "createdAt");

-- ============================================================================
-- REVENUE & ATTRIBUTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS "revenue_events" (
  id TEXT PRIMARY KEY,
  "subscriptionId" TEXT,
  "channelId" TEXT,
  "memeId" TEXT,
  "sourceType" TEXT NOT NULL,
  "grossAmountCents" INTEGER NOT NULL,
  "netAmountCents" INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  memo TEXT,
  "recognizedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscriptions"(id) ON DELETE SET NULL,
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"(id) ON DELETE SET NULL,
  FOREIGN KEY ("memeId") REFERENCES "memes"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "revenue_events_subscriptionId_recognizedAt_idx" ON "revenue_events"("subscriptionId", "recognizedAt");
CREATE INDEX IF NOT EXISTS "revenue_events_channelId_recognizedAt_idx" ON "revenue_events"("channelId", "recognizedAt");

CREATE TABLE IF NOT EXISTS "attribution_splits" (
  id TEXT PRIMARY KEY,
  "revenueEventId" TEXT NOT NULL,
  "recipientType" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "sharePct" DECIMAL(5,4) NOT NULL,
  "amountCents" INTEGER NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("revenueEventId") REFERENCES "revenue_events"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "attribution_splits_revenueEventId_idx" ON "attribution_splits"("revenueEventId");
CREATE INDEX IF NOT EXISTS "attribution_splits_recipientType_recipientId_idx" ON "attribution_splits"("recipientType", "recipientId");

-- ============================================================================
-- LIQUIDITY POOLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "liquidity_pools" (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  "policyJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ledger_accounts" (
  id TEXT PRIMARY KEY,
  "poolId" TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"(id) ON DELETE CASCADE,
  UNIQUE ("poolId", code)
);

CREATE INDEX IF NOT EXISTS "ledger_accounts_poolId_accountType_idx" ON "ledger_accounts"("poolId", "accountType");

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  id TEXT PRIMARY KEY,
  "journalId" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "entryKind" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  memo TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"(id) ON DELETE CASCADE,
  FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ledger_entries_poolId_createdAt_idx" ON "ledger_entries"("poolId", "createdAt");
CREATE INDEX IF NOT EXISTS "ledger_entries_journalId_idx" ON "ledger_entries"("journalId");
CREATE INDEX IF NOT EXISTS "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");

-- ============================================================================
-- ALLOCATION REQUESTS & DISBURSEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "allocation_requests" (
  id TEXT PRIMARY KEY,
  "poolId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  purpose TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rationale TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "allocation_requests_poolId_status_createdAt_idx" ON "allocation_requests"("poolId", status, "createdAt");
CREATE INDEX IF NOT EXISTS "allocation_requests_beneficiaryId_createdAt_idx" ON "allocation_requests"("beneficiaryId", "createdAt");

CREATE TABLE IF NOT EXISTS "disbursements" (
  id TEXT PRIMARY KEY,
  "allocationRequestId" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "destinationRef" TEXT,
  "executedBy" TEXT,
  "executedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("allocationRequestId") REFERENCES "allocation_requests"(id) ON DELETE CASCADE,
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "disbursements_poolId_status_createdAt_idx" ON "disbursements"("poolId", status, "createdAt");

-- ============================================================================
-- MODERATION & RISK FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "moderation_cases" (
  id TEXT PRIMARY KEY,
  "channelId" TEXT,
  "memeId" TEXT,
  "openedBy" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"(id) ON DELETE SET NULL,
  FOREIGN KEY ("memeId") REFERENCES "memes"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "moderation_cases_status_createdAt_idx" ON "moderation_cases"(status, "createdAt");
CREATE INDEX IF NOT EXISTS "moderation_cases_channelId_idx" ON "moderation_cases"("channelId");
CREATE INDEX IF NOT EXISTS "moderation_cases_memeId_idx" ON "moderation_cases"("memeId");

CREATE TABLE IF NOT EXISTS "moderation_actions" (
  id TEXT PRIMARY KEY,
  "caseId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("caseId") REFERENCES "moderation_cases"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "moderation_actions_caseId_createdAt_idx" ON "moderation_actions"("caseId", "createdAt");

CREATE TABLE IF NOT EXISTS "risk_flags" (
  id TEXT PRIMARY KEY,
  "channelId" TEXT,
  "memeId" TEXT,
  "caseId" TEXT,
  "flagType" TEXT NOT NULL,
  severity TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"(id) ON DELETE SET NULL,
  FOREIGN KEY ("memeId") REFERENCES "memes"(id) ON DELETE SET NULL,
  FOREIGN KEY ("caseId") REFERENCES "moderation_cases"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "risk_flags_severity_createdAt_idx" ON "risk_flags"(severity, "createdAt");
CREATE INDEX IF NOT EXISTS "risk_flags_channelId_idx" ON "risk_flags"("channelId");
CREATE INDEX IF NOT EXISTS "risk_flags_memeId_idx" ON "risk_flags"("memeId");

-- ============================================================================
-- DOMAIN EVENTS & AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS "domain_events" (
  id TEXT PRIMARY KEY,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  payload JSONB NOT NULL,
  "actorId" TEXT,
  "correlationId" TEXT,
  "occurredAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "domain_events_aggregateType_aggregateId_occurredAt_idx" ON "domain_events"("aggregateType", "aggregateId", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_eventType_occurredAt_idx" ON "domain_events"("eventType", "occurredAt");

CREATE TABLE IF NOT EXISTS "audit_events" (
  id TEXT PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  action TEXT NOT NULL,
  "actorId" TEXT,
  before JSONB,
  after JSONB,
  ip TEXT,
  "requestId" TEXT,
  "occurredAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_events_occurredAt_idx" ON "audit_events"("occurredAt");
