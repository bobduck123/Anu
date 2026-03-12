-- Impact service baseline schema required before Flora Fauna memetics extensions

CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');
CREATE TYPE "LedgerEntryType" AS ENUM ('subscription_credit', 'manual_credit', 'allocation_debit', 'reversal');
CREATE TYPE "CreditTxType" AS ENUM ('monthly_grant', 'streak_bonus', 'spend', 'adjustment', 'reversal');

CREATE TABLE "MembershipPlans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "stripeProductId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "intervalMonths" INTEGER NOT NULL DEFAULT 1,
  "creditGrantMonthly" INTEGER NOT NULL,
  "poolAllocationPct" DECIMAL(5,4) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MembershipPlans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MembershipPlans_name_key" ON "MembershipPlans"("name");
CREATE UNIQUE INDEX "MembershipPlans_stripePriceId_key" ON "MembershipPlans"("stripePriceId");

CREATE TABLE "Subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "streakMonths" INTEGER NOT NULL DEFAULT 0,
  "lastPaymentAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscriptions_userId_key" ON "Subscriptions"("userId");
CREATE UNIQUE INDEX "Subscriptions_stripeCustomerId_key" ON "Subscriptions"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscriptions_stripeSubscriptionId_key" ON "Subscriptions"("stripeSubscriptionId");
CREATE INDEX "Subscriptions_stripeCustomerId_idx" ON "Subscriptions"("stripeCustomerId");

CREATE TABLE "ImpactPools" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "targetAmountCents" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImpactPools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImpactLedgerEntries" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "entryType" "LedgerEntryType" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "referenceId" TEXT,
  "referenceType" TEXT,
  "reversalOf" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "ImpactLedgerEntries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpactLedgerEntries_poolId_idx" ON "ImpactLedgerEntries"("poolId");
CREATE INDEX "ImpactLedgerEntries_createdAt_idx" ON "ImpactLedgerEntries"("createdAt");

CREATE TABLE "ImpactCreditTransactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "transactionType" "CreditTxType" NOT NULL,
  "amountCredits" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImpactCreditTransactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpactCreditTransactions_userId_idx" ON "ImpactCreditTransactions"("userId");
CREATE INDEX "ImpactCreditTransactions_createdAt_idx" ON "ImpactCreditTransactions"("createdAt");

CREATE TABLE "AuditLogs" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLogs_actorId_idx" ON "AuditLogs"("actorId");
CREATE INDEX "AuditLogs_targetType_targetId_idx" ON "AuditLogs"("targetType", "targetId");
CREATE INDEX "AuditLogs_createdAt_idx" ON "AuditLogs"("createdAt");

CREATE TABLE "StripeEvents" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "payload" JSONB,
  CONSTRAINT "StripeEvents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StripeEvents_processedAt_idx" ON "StripeEvents"("processedAt");

ALTER TABLE "Subscriptions"
  ADD CONSTRAINT "Subscriptions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "MembershipPlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpactLedgerEntries"
  ADD CONSTRAINT "ImpactLedgerEntries_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "ImpactPools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpactCreditTransactions"
  ADD CONSTRAINT "ImpactCreditTransactions_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
