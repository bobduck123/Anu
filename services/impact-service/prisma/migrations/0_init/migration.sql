-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');

-- CreateEnum
CREATE TYPE "public"."LedgerEntryType" AS ENUM ('subscription_credit', 'manual_credit', 'allocation_debit', 'reversal');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('grant', 'spend', 'reversal', 'adjustment');

-- CreateEnum
CREATE TYPE "public"."ModerationStatus" AS ENUM ('pending', 'approved', 'rejected', 'flagged');

-- CreateTable MembershipPlans
CREATE TABLE IF NOT EXISTS "public"."MembershipPlans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "stripeProductId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "intervalMonths" INTEGER NOT NULL DEFAULT 1,
    "creditGrantMonthly" INTEGER NOT NULL,
    "poolAllocationPct" NUMERIC(5,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable Subscriptions
CREATE TABLE IF NOT EXISTS "public"."Subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "streakMonths" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable ImpactPools
CREATE TABLE IF NOT EXISTS "public"."ImpactPools" (
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

-- CreateTable ImpactLedgerEntries
CREATE TABLE IF NOT EXISTS "public"."ImpactLedgerEntries" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "entryType" "public"."LedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT,
    "recordedBy" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactLedgerEntries_pkey" PRIMARY KEY ("id")
);

-- CreateTable ImpactCreditTransactions
CREATE TABLE IF NOT EXISTS "public"."ImpactCreditTransactions" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "transactionType" "public"."TransactionType" NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactCreditTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable RevenueEvents
CREATE TABLE IF NOT EXISTS "public"."RevenueEvents" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeEventId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueEvents_pkey" PRIMARY KEY ("id")
);

-- CreateTable ModerationQueues
CREATE TABLE IF NOT EXISTS "public"."ModerationQueues" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "public"."ModerationStatus" NOT NULL DEFAULT 'pending',
    "submittedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ModerationQueues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipPlans_name_key" ON "public"."MembershipPlans"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "MembershipPlans_stripePriceId_key" ON "public"."MembershipPlans"("stripePriceId");

-- CreateIndex for Subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriptions_userId_key" ON "public"."Subscriptions"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriptions_stripeCustomerId_key" ON "public"."Subscriptions"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriptions_stripeSubscriptionId_key" ON "public"."Subscriptions"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscriptions_stripeCustomerId_idx" ON "public"."Subscriptions"("stripeCustomerId");

-- CreateIndex for ImpactLedgerEntries
CREATE INDEX IF NOT EXISTS "ImpactLedgerEntries_poolId_idx" ON "public"."ImpactLedgerEntries"("poolId");

-- CreateIndex for ImpactCreditTransactions
CREATE INDEX IF NOT EXISTS "ImpactCreditTransactions_subscriptionId_idx" ON "public"."ImpactCreditTransactions"("subscriptionId");

-- CreateIndex for RevenueEvents
CREATE INDEX IF NOT EXISTS "RevenueEvents_subscriptionId_idx" ON "public"."RevenueEvents"("subscriptionId");

-- CreateIndex for ModerationQueues
CREATE INDEX IF NOT EXISTS "ModerationQueues_poolId_idx" ON "public"."ModerationQueues"("poolId");
CREATE INDEX IF NOT EXISTS "ModerationQueues_status_idx" ON "public"."ModerationQueues"("status");

-- AddForeignKey constraints
ALTER TABLE "public"."Subscriptions" ADD CONSTRAINT "Subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."MembershipPlans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ImpactLedgerEntries" ADD CONSTRAINT "ImpactLedgerEntries_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."ImpactPools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ImpactCreditTransactions" ADD CONSTRAINT "ImpactCreditTransactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."RevenueEvents" ADD CONSTRAINT "RevenueEvents_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ModerationQueues" ADD CONSTRAINT "ModerationQueues_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "public"."ImpactPools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
