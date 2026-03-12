-- Flora Fauna memetic mutual-aid subsystem foundation

CREATE TYPE "MemeLineageRelationType" AS ENUM ('remix', 'reference', 'response', 'seed');
CREATE TYPE "RevenueSourceType" AS ENUM ('subscription', 'attention_sponsorship', 'partnership', 'grant', 'other_downstream');
CREATE TYPE "AttributionRecipientType" AS ENUM ('creator', 'platform', 'pool');
CREATE TYPE "LedgerAccountType" AS ENUM ('treasury', 'revenue_clearing', 'creator_reserve', 'mutual_aid_disbursed', 'platform_reserve');
CREATE TYPE "PoolLedgerEntryKind" AS ENUM ('funding_inflow', 'creator_allocation', 'pool_allocation', 'disbursement', 'adjustment');
CREATE TYPE "AllocationRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'disbursed', 'canceled');
CREATE TYPE "DisbursementStatus" AS ENUM ('pending', 'sent', 'settled', 'failed', 'reversed');
CREATE TYPE "ModerationSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "ModerationCaseStatus" AS ENUM ('open', 'reviewed', 'actioned', 'closed');
CREATE TYPE "ModerationActionType" AS ENUM ('note', 'warn', 'label', 'limit', 'remove', 'restore', 'close', 'escalate');

CREATE TABLE "creator_channels" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "creatorUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "manifesto" TEXT,
  "sharePolicy" TEXT NOT NULL DEFAULT 'free_shareable',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "creator_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_channels_slug_key" ON "creator_channels"("slug");
CREATE INDEX "creator_channels_creatorUserId_idx" ON "creator_channels"("creatorUserId");

CREATE TABLE "memes" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "summary" TEXT,
  "mediaUrl" TEXT,
  "attentionScore" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "shareable" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "memes_slug_key" ON "memes"("slug");
CREATE INDEX "memes_channelId_createdAt_idx" ON "memes"("channelId", "createdAt");
CREATE INDEX "memes_createdBy_createdAt_idx" ON "memes"("createdBy", "createdAt");

CREATE TABLE "meme_lineage_edges" (
  "id" TEXT NOT NULL,
  "parentMemeId" TEXT NOT NULL,
  "childMemeId" TEXT NOT NULL,
  "relationType" "MemeLineageRelationType" NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meme_lineage_edges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meme_lineage_edges_parentMemeId_childMemeId_relationType_key"
  ON "meme_lineage_edges"("parentMemeId", "childMemeId", "relationType");
CREATE INDEX "meme_lineage_edges_childMemeId_idx" ON "meme_lineage_edges"("childMemeId");

CREATE TABLE "nutrient_snapshots" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "memeId" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nutrient_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "nutrient_snapshots_channelId_capturedAt_idx" ON "nutrient_snapshots"("channelId", "capturedAt");
CREATE INDEX "nutrient_snapshots_memeId_idx" ON "nutrient_snapshots"("memeId");

CREATE TABLE "geological_form_snapshots" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "nutrientSnapshotId" TEXT NOT NULL,
  "formKey" TEXT NOT NULL,
  "strataSummary" TEXT NOT NULL,
  "permeabilityIndex" DECIMAL(5,4) NOT NULL,
  "volatilityIndex" DECIMAL(5,4) NOT NULL,
  "stabilityIndex" DECIMAL(5,4) NOT NULL,
  "rationale" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "geological_form_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "geological_form_snapshots_nutrientSnapshotId_key" ON "geological_form_snapshots"("nutrientSnapshotId");
CREATE INDEX "geological_form_snapshots_channelId_createdAt_idx" ON "geological_form_snapshots"("channelId", "createdAt");

CREATE TABLE "revenue_events" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "channelId" TEXT,
  "memeId" TEXT,
  "sourceType" "RevenueSourceType" NOT NULL,
  "grossAmountCents" INTEGER NOT NULL,
  "netAmountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "memo" TEXT,
  "recognizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revenue_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revenue_events_subscriptionId_recognizedAt_idx" ON "revenue_events"("subscriptionId", "recognizedAt");
CREATE INDEX "revenue_events_channelId_recognizedAt_idx" ON "revenue_events"("channelId", "recognizedAt");

CREATE TABLE "attribution_splits" (
  "id" TEXT NOT NULL,
  "revenueEventId" TEXT NOT NULL,
  "recipientType" "AttributionRecipientType" NOT NULL,
  "recipientId" TEXT NOT NULL,
  "sharePct" DECIMAL(5,4) NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attribution_splits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attribution_splits_revenueEventId_idx" ON "attribution_splits"("revenueEventId");
CREATE INDEX "attribution_splits_recipientType_recipientId_idx" ON "attribution_splits"("recipientType", "recipientId");

CREATE TABLE "liquidity_pools" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "policyJson" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "liquidity_pools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "liquidity_pools_slug_key" ON "liquidity_pools"("slug");

CREATE TABLE "ledger_accounts" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountType" "LedgerAccountType" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "isSystem" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ledger_accounts_poolId_code_key" ON "ledger_accounts"("poolId", "code");
CREATE INDEX "ledger_accounts_poolId_accountType_idx" ON "ledger_accounts"("poolId", "accountType");

CREATE TABLE "ledger_entries" (
  "id" TEXT NOT NULL,
  "journalId" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "entryKind" "PoolLedgerEntryKind" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "memo" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ledger_entries_poolId_createdAt_idx" ON "ledger_entries"("poolId", "createdAt");
CREATE INDEX "ledger_entries_journalId_idx" ON "ledger_entries"("journalId");
CREATE INDEX "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");

CREATE TABLE "allocation_requests" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "AllocationRequestStatus" NOT NULL DEFAULT 'pending',
  "rationale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "allocation_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "allocation_requests_poolId_status_createdAt_idx" ON "allocation_requests"("poolId", "status", "createdAt");
CREATE INDEX "allocation_requests_beneficiaryId_createdAt_idx" ON "allocation_requests"("beneficiaryId", "createdAt");

CREATE TABLE "disbursements" (
  "id" TEXT NOT NULL,
  "allocationRequestId" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" "DisbursementStatus" NOT NULL DEFAULT 'pending',
  "destinationRef" TEXT,
  "executedBy" TEXT,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disbursements_poolId_status_createdAt_idx" ON "disbursements"("poolId", "status", "createdAt");

CREATE TABLE "moderation_cases" (
  "id" TEXT NOT NULL,
  "channelId" TEXT,
  "memeId" TEXT,
  "openedBy" TEXT NOT NULL,
  "status" "ModerationCaseStatus" NOT NULL DEFAULT 'open',
  "severity" "ModerationSeverity" NOT NULL,
  "summary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "moderation_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_cases_status_createdAt_idx" ON "moderation_cases"("status", "createdAt");
CREATE INDEX "moderation_cases_channelId_idx" ON "moderation_cases"("channelId");
CREATE INDEX "moderation_cases_memeId_idx" ON "moderation_cases"("memeId");

CREATE TABLE "moderation_actions" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actionType" "ModerationActionType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_actions_caseId_createdAt_idx" ON "moderation_actions"("caseId", "createdAt");

CREATE TABLE "risk_flags" (
  "id" TEXT NOT NULL,
  "channelId" TEXT,
  "memeId" TEXT,
  "caseId" TEXT,
  "flagType" TEXT NOT NULL,
  "severity" "ModerationSeverity" NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "risk_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "risk_flags_severity_createdAt_idx" ON "risk_flags"("severity", "createdAt");
CREATE INDEX "risk_flags_channelId_idx" ON "risk_flags"("channelId");
CREATE INDEX "risk_flags_memeId_idx" ON "risk_flags"("memeId");

CREATE TABLE "domain_events" (
  "id" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "actorId" TEXT,
  "correlationId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "domain_events_aggregateType_aggregateId_occurredAt_idx" ON "domain_events"("aggregateType", "aggregateId", "occurredAt");
CREATE INDEX "domain_events_eventType_occurredAt_idx" ON "domain_events"("eventType", "occurredAt");

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT,
  "requestId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_entityType_entityId_occurredAt_idx" ON "audit_events"("entityType", "entityId", "occurredAt");
CREATE INDEX "audit_events_actorId_occurredAt_idx" ON "audit_events"("actorId", "occurredAt");

ALTER TABLE "memes"
  ADD CONSTRAINT "memes_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meme_lineage_edges"
  ADD CONSTRAINT "meme_lineage_edges_parentMemeId_fkey"
  FOREIGN KEY ("parentMemeId") REFERENCES "memes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meme_lineage_edges"
  ADD CONSTRAINT "meme_lineage_edges_childMemeId_fkey"
  FOREIGN KEY ("childMemeId") REFERENCES "memes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutrient_snapshots"
  ADD CONSTRAINT "nutrient_snapshots_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nutrient_snapshots"
  ADD CONSTRAINT "nutrient_snapshots_memeId_fkey"
  FOREIGN KEY ("memeId") REFERENCES "memes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "geological_form_snapshots"
  ADD CONSTRAINT "geological_form_snapshots_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "geological_form_snapshots"
  ADD CONSTRAINT "geological_form_snapshots_nutrientSnapshotId_fkey"
  FOREIGN KEY ("nutrientSnapshotId") REFERENCES "nutrient_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revenue_events"
  ADD CONSTRAINT "revenue_events_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_events"
  ADD CONSTRAINT "revenue_events_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_events"
  ADD CONSTRAINT "revenue_events_memeId_fkey"
  FOREIGN KEY ("memeId") REFERENCES "memes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attribution_splits"
  ADD CONSTRAINT "attribution_splits_revenueEventId_fkey"
  FOREIGN KEY ("revenueEventId") REFERENCES "revenue_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ledger_accounts"
  ADD CONSTRAINT "ledger_accounts_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ledger_entries"
  ADD CONSTRAINT "ledger_entries_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "ledger_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "allocation_requests"
  ADD CONSTRAINT "allocation_requests_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disbursements"
  ADD CONSTRAINT "disbursements_allocationRequestId_fkey"
  FOREIGN KEY ("allocationRequestId") REFERENCES "allocation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disbursements"
  ADD CONSTRAINT "disbursements_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "liquidity_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_cases"
  ADD CONSTRAINT "moderation_cases_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moderation_cases"
  ADD CONSTRAINT "moderation_cases_memeId_fkey"
  FOREIGN KEY ("memeId") REFERENCES "memes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moderation_actions"
  ADD CONSTRAINT "moderation_actions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "moderation_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "risk_flags"
  ADD CONSTRAINT "risk_flags_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "creator_channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "risk_flags"
  ADD CONSTRAINT "risk_flags_memeId_fkey"
  FOREIGN KEY ("memeId") REFERENCES "memes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "risk_flags"
  ADD CONSTRAINT "risk_flags_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "moderation_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
