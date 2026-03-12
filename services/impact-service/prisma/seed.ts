import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureMembershipPlans() {
  return Promise.all([
    prisma.membershipPlan.upsert({
      where: { name: 'Seed' },
      update: {},
      create: {
        name: 'Seed',
        stripePriceId: 'price_seed_dev',
        stripeProductId: 'prod_seed_dev',
        amountCents: 999,
        intervalMonths: 1,
        creditGrantMonthly: 100,
        poolAllocationPct: 0.2,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { name: 'Sapling' },
      update: {},
      create: {
        name: 'Sapling',
        stripePriceId: 'price_sapling_dev',
        stripeProductId: 'prod_sapling_dev',
        amountCents: 2499,
        intervalMonths: 1,
        creditGrantMonthly: 250,
        poolAllocationPct: 0.3,
        isActive: true,
      },
    }),
    prisma.membershipPlan.upsert({
      where: { name: 'Forest' },
      update: {},
      create: {
        name: 'Forest',
        stripePriceId: 'price_forest_dev',
        stripeProductId: 'prod_forest_dev',
        amountCents: 4999,
        intervalMonths: 1,
        creditGrantMonthly: 500,
        poolAllocationPct: 0.4,
        isActive: true,
      },
    }),
  ]);
}

async function ensureLegacyImpactPools() {
  const reforestation = await prisma.impactPool.findFirst({
    where: { name: 'Reforestation' },
  });
  if (!reforestation) {
    await prisma.impactPool.create({
      data: {
        name: 'Reforestation',
        description: 'Supporting tree-planting initiatives',
        category: 'Environment',
        targetAmountCents: 100000,
        isActive: true,
        createdBy: 'admin',
      },
    });
  }

  const communityGardens = await prisma.impactPool.findFirst({
    where: { name: 'Community Gardens' },
  });
  if (!communityGardens) {
    await prisma.impactPool.create({
      data: {
        name: 'Community Gardens',
        description: 'Local urban gardens and food security',
        category: 'Food',
        targetAmountCents: 50000,
        isActive: true,
        createdBy: 'admin',
      },
    });
  }
}

async function ensureMemeticMutualAidSeed() {
  const existingChannel = await prisma.creatorChannel.findFirst({
    where: {
      OR: [
        { slug: 'manara-origami' },
        { slug: 'flora-fauna-origami' },
      ],
    },
  });

  const channel = existingChannel
    ? await prisma.creatorChannel.update({
      where: { id: existingChannel.id },
      data: {
        slug: 'manara-origami',
        creatorUserId: 'gardenkeeper',
        title: 'Manara Origami',
        description: 'Memes as mutual-aid spores and shareable cultural infrastructure.',
        manifesto: 'Memes circulate freely; revenue only arrives through downstream attention and subscriptions.',
        sharePolicy: 'free_shareable',
      },
    })
    : await prisma.creatorChannel.create({
      data: {
        slug: 'manara-origami',
        creatorUserId: 'gardenkeeper',
        title: 'Manara Origami',
        description: 'Memes as mutual-aid spores and shareable cultural infrastructure.',
        manifesto: 'Memes circulate freely; revenue only arrives through downstream attention and subscriptions.',
        sharePolicy: 'free_shareable',
      },
    });

  const seedMeme = await prisma.meme.upsert({
    where: { slug: 'seed-the-canopy' },
    update: {},
    create: {
      channelId: channel.id,
      slug: 'seed-the-canopy',
      title: 'Seed the Canopy',
      summary: 'A founding mutual-aid meme for free replication.',
      body: 'Take, remix, and propagate. Never sell the artifact; only steward the attention around it.',
      attentionScore: 0.88,
      createdBy: 'gardenkeeper',
      shareable: true,
    },
  });

  const remixMeme = await prisma.meme.upsert({
    where: { slug: 'delta-remix-ledger' },
    update: {},
    create: {
      channelId: channel.id,
      slug: 'delta-remix-ledger',
      title: 'Delta Remix Ledger',
      summary: 'A remix about auditable pool flow.',
      body: 'Every remix should leave a public trace and a ledger-readable downstream footprint.',
      attentionScore: 0.76,
      createdBy: 'gardenkeeper',
      shareable: true,
    },
  });

  await prisma.memeLineageEdge.createMany({
    data: [
      {
        parentMemeId: seedMeme.id,
        childMemeId: remixMeme.id,
        relationType: 'remix',
        createdBy: 'gardenkeeper',
      },
    ],
    skipDuplicates: true,
  });

  let snapshot = await prisma.nutrientSnapshot.findFirst({
    where: { channelId: channel.id },
    orderBy: { capturedAt: 'desc' },
  });

  if (!snapshot) {
    snapshot = await prisma.nutrientSnapshot.create({
      data: {
        channelId: channel.id,
        memeId: remixMeme.id,
        careIndex: 0.72,
        reciprocityIndex: 0.79,
        resonanceIndex: 0.68,
        originalityIndex: 0.63,
        stewardshipIndex: 0.74,
        mycelialDensityIndex: 0.83,
        ecologyIdentity: 'estuary commons',
        identityConfidence: 0.71,
        nutrientVector: {
          careIndex: 0.72,
          reciprocityIndex: 0.79,
          resonanceIndex: 0.68,
          originalityIndex: 0.63,
          stewardshipIndex: 0.74,
          mycelialDensityIndex: 0.83,
        },
        capturedBy: 'gardenkeeper',
      },
    });
  }

  await prisma.geologicalFormSnapshot.upsert({
    where: { nutrientSnapshotId: snapshot.id },
    update: {},
    create: {
      channelId: channel.id,
      nutrientSnapshotId: snapshot.id,
      formKey: 'alluvial-delta',
      strataSummary: 'Dense reciprocity and connective tissue move attention through the commons without hard bottlenecks.',
      permeabilityIndex: 0.79,
      volatilityIndex: 0.44,
      stabilityIndex: 0.75,
      rationale: {
        reciprocityIndex: 0.79,
        mycelialDensityIndex: 0.83,
        stewardshipIndex: 0.74,
      },
    },
  });

  const pool = await prisma.liquidityPool.upsert({
    where: { slug: 'mutual-aid-canopy' },
    update: {},
    create: {
      slug: 'mutual-aid-canopy',
      name: 'Mutual Aid Canopy',
      description: 'Shared liquidity for rapid-response care and community stabilisation.',
      policyJson: {
        reserveFloorPct: 0.15,
        disbursementWindowHours: 48,
        auditVisibility: 'public',
      },
      createdBy: 'gardenkeeper',
    },
  });

  await prisma.ledgerAccount.createMany({
    data: [
      { poolId: pool.id, code: 'treasury', name: 'Pool Treasury', accountType: 'treasury', currency: 'usd', isSystem: true },
      { poolId: pool.id, code: 'allocation-reserve', name: 'Allocation Reserve', accountType: 'allocation_reserve', currency: 'usd', isSystem: true },
      { poolId: pool.id, code: 'revenue-clearing', name: 'Revenue Clearing', accountType: 'revenue_clearing', currency: 'usd', isSystem: true },
      { poolId: pool.id, code: 'creator-reserve', name: 'Creator Reserve', accountType: 'creator_reserve', currency: 'usd', isSystem: true },
      { poolId: pool.id, code: 'platform-reserve', name: 'Platform Reserve', accountType: 'platform_reserve', currency: 'usd', isSystem: true },
      { poolId: pool.id, code: 'mutual-aid-disbursed', name: 'Mutual Aid Disbursed', accountType: 'mutual_aid_disbursed', currency: 'usd', isSystem: true },
    ],
    skipDuplicates: true,
  });

  const treasuryAccount = await prisma.ledgerAccount.findUnique({
    where: {
      poolId_code: {
        poolId: pool.id,
        code: 'treasury',
      },
    },
  });
  const clearingAccount = await prisma.ledgerAccount.findUnique({
    where: {
      poolId_code: {
        poolId: pool.id,
        code: 'revenue-clearing',
      },
    },
  });

  const ledgerCount = await prisma.ledgerEntry.count({
    where: { poolId: pool.id },
  });
  if (ledgerCount === 0 && treasuryAccount && clearingAccount) {
    const journalId = `journal_seed_${Date.now()}`;
    await prisma.ledgerEntry.createMany({
      data: [
        {
          journalId,
          poolId: pool.id,
          accountId: treasuryAccount.id,
          entryKind: 'pool_allocation',
          amountCents: 48000,
          referenceType: 'seed',
          referenceId: 'memetic-foundation',
          memo: 'Initial mutual-aid canopy funding',
          createdBy: 'gardenkeeper',
        },
        {
          journalId,
          poolId: pool.id,
          accountId: clearingAccount.id,
          entryKind: 'pool_allocation',
          amountCents: -48000,
          referenceType: 'seed',
          referenceId: 'memetic-foundation',
          memo: 'Initial mutual-aid canopy funding',
          createdBy: 'gardenkeeper',
        },
      ],
    });
  }

  const revenueEventCount = await prisma.revenueEvent.count({
    where: { channelId: channel.id },
  });
  if (revenueEventCount === 0) {
    const revenueEvent = await prisma.revenueEvent.create({
      data: {
        channelId: channel.id,
        memeId: remixMeme.id,
        sourceType: 'attention_sponsorship',
        grossAmountCents: 15000,
        netAmountCents: 12000,
        currency: 'usd',
        memo: 'Community attention sponsorship pilot',
        createdBy: 'gardenkeeper',
      },
    });

    await prisma.attributionSplit.createMany({
      data: [
        {
          revenueEventId: revenueEvent.id,
          recipientType: 'creator',
          recipientId: channel.creatorUserId,
          sharePct: 0.45,
          amountCents: 5400,
        },
        {
          revenueEventId: revenueEvent.id,
          recipientType: 'platform',
          recipientId: 'manara-platform',
          sharePct: 0.2,
          amountCents: 2400,
        },
        {
          revenueEventId: revenueEvent.id,
          recipientType: 'pool',
          recipientId: pool.id,
          sharePct: 0.35,
          amountCents: 4200,
        },
      ],
    });
  }

  const moderationCase = await prisma.moderationCase.findFirst({
    where: { memeId: remixMeme.id },
  });
  const createdCase = moderationCase ?? await prisma.moderationCase.create({
    data: {
      channelId: channel.id,
      memeId: remixMeme.id,
      openedBy: 'gardenkeeper',
      severity: 'medium',
      summary: 'Seed moderation case for testing risk flag and action plumbing.',
    },
  });

  const existingFlag = await prisma.riskFlag.findFirst({
    where: {
      caseId: createdCase.id,
      flagType: 'context-check',
    },
  });
  if (!existingFlag) {
    await prisma.riskFlag.create({
      data: {
        channelId: channel.id,
        memeId: remixMeme.id,
        caseId: createdCase.id,
        flagType: 'context-check',
        severity: 'medium',
        reason: 'Needs provenance note before cross-platform syndication.',
        createdBy: 'gardenkeeper',
      },
    });
  }

  const moderationActionCount = await prisma.moderationAction.count({
    where: { caseId: createdCase.id },
  });
  if (moderationActionCount === 0) {
    await prisma.moderationAction.create({
      data: {
        caseId: createdCase.id,
        actionType: 'note',
        actorId: 'gardenkeeper',
        notes: 'Seed action to demonstrate case timelines.',
      },
    });
  }

  const existingChannelSeedEvent = await prisma.domainEvent.findFirst({
    where: {
      aggregateType: 'creator_channel',
      aggregateId: channel.id,
      eventType: 'seeded.channel.ready',
    },
  });
  if (!existingChannelSeedEvent) {
    await prisma.domainEvent.create({
      data: {
        aggregateType: 'creator_channel',
        aggregateId: channel.id,
        eventType: 'seeded.channel.ready',
        payload: {
          channelId: channel.id,
          memeCount: 2,
        },
        actorId: 'seed-script',
      },
    });
  }

  const existingPoolSeedEvent = await prisma.domainEvent.findFirst({
    where: {
      aggregateType: 'liquidity_pool',
      aggregateId: pool.id,
      eventType: 'seeded.pool.ready',
    },
  });
  if (!existingPoolSeedEvent) {
    await prisma.domainEvent.create({
      data: {
        aggregateType: 'liquidity_pool',
        aggregateId: pool.id,
        eventType: 'seeded.pool.ready',
        payload: {
          poolId: pool.id,
          availableBalanceCents: 48000,
        },
        actorId: 'seed-script',
      },
    });
  }

  const existingChannelAudit = await prisma.auditEvent.findFirst({
    where: {
      entityType: 'creator_channel',
      entityId: channel.id,
      action: 'seeded',
    },
  });
  if (!existingChannelAudit) {
    await prisma.auditEvent.create({
      data: {
        entityType: 'creator_channel',
        entityId: channel.id,
        action: 'seeded',
        actorId: 'seed-script',
        after: {
          slug: channel.slug,
          title: channel.title,
        },
      },
    });
  }

  const existingPoolAudit = await prisma.auditEvent.findFirst({
    where: {
      entityType: 'liquidity_pool',
      entityId: pool.id,
      action: 'seeded',
    },
  });
  if (!existingPoolAudit) {
    await prisma.auditEvent.create({
      data: {
        entityType: 'liquidity_pool',
        entityId: pool.id,
        action: 'seeded',
        actorId: 'seed-script',
        after: {
          slug: pool.slug,
          name: pool.name,
        },
      },
    });
  }

  return {
    channel,
    memes: [seedMeme.slug, remixMeme.slug],
    liquidityPool: pool.slug,
  };
}

async function main() {
  console.log('Seeding impact-service database...');

  const plans = await ensureMembershipPlans();
  await ensureLegacyImpactPools();
  const memeticSeed = await ensureMemeticMutualAidSeed();

  console.log('Seed complete', {
    membershipPlans: plans.map((plan) => plan.name),
    memeticSeed,
  });
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
