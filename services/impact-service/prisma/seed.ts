import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { assertSafeLocalVerificationEnvironment } from '../src/falak/utils/localVerificationGuard';
import { assertSafeHostedStagingEnvironment } from '../src/falak/utils/stagingRolloutGuard';
import { PrismaFalakRepository } from '../src/falak/repositories/prismaFalakRepository';
import { AllocationWorkflowService } from '../src/falak/services/allocationWorkflowService';
import { ContributionWorkflowService } from '../src/falak/services/contributionWorkflowService';
import { EventWorkflowService } from '../src/falak/services/eventWorkflowService';
import { NoopFanoutPublisher } from '../src/falak/services/fanoutPublisher';
import { PolicyEngine } from '../src/falak/services/policyEngine';
import { RequestContext, ResolvedActor } from '../src/falak/domain/types';

const prisma = new PrismaClient();

interface RunSeedOptions {
  commandName: string;
  guardMode: 'local' | 'staging';
}

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

async function upsertFalakNode(args: {
  tenantId: string;
  actorId: string;
  type: string;
  slug: string;
  visibility: 'public' | 'tenant' | 'restricted';
  sensitivityClass: string;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
  geometry?: Record<string, unknown> | null;
  timeStart?: string | null;
  timeEnd?: string | null;
}) {
  const geometrySql = args.geometry
    ? Prisma.sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(args.geometry)}), 4326)`
    : Prisma.sql`NULL`;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO falak.nodes (
      tenant_id,
      type,
      status,
      visibility,
      sensitivity_class,
      slug,
      title,
      summary,
      metadata,
      geometry,
      time_start,
      time_end,
      created_by,
      updated_by
    )
    VALUES (
      ${args.tenantId}::uuid,
      ${args.type},
      'active'::falak.falak_node_status,
      ${args.visibility}::falak.falak_visibility,
      ${args.sensitivityClass},
      ${args.slug},
      ${args.title},
      ${args.summary},
      CAST(${JSON.stringify(args.metadata)} AS jsonb),
      ${geometrySql},
      ${args.timeStart ? new Date(args.timeStart) : null}::timestamptz,
      ${args.timeEnd ? new Date(args.timeEnd) : null}::timestamptz,
      ${args.actorId}::uuid,
      ${args.actorId}::uuid
    )
    ON CONFLICT (tenant_id, slug) DO UPDATE
    SET type = EXCLUDED.type,
        status = 'active'::falak.falak_node_status,
        visibility = EXCLUDED.visibility,
        sensitivity_class = EXCLUDED.sensitivity_class,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        metadata = EXCLUDED.metadata,
        geometry = EXCLUDED.geometry,
        time_start = EXCLUDED.time_start,
        time_end = EXCLUDED.time_end,
        updated_by = EXCLUDED.updated_by
    RETURNING id
  `);

  return rows[0]!.id;
}

function makeSeedContext(
  tenantId: string,
  actor: ResolvedActor | null,
  plane: RequestContext['plane']
): RequestContext {
  return {
    traceId: randomUUID(),
    tenantId,
    tenantSlug: 'anu-beta',
    plane,
    actor,
    actorResolution: {
      source: actor ? 'verified_auth' : 'none',
      isVerified: actor !== null,
      authenticatedIdentity: actor?.externalAuthId ?? actor?.email ?? null,
      requestedActorId: null
    },
    routeGuard: {
      applies: false,
      mode: 'enabled',
      access: plane === 'public' ? 'public' : 'privileged'
    },
    ipAddress: '127.0.0.1',
    userAgent: 'prisma-seed'
  };
}

async function ensureFalakSeed() {
  const tenant = await prisma.falakTenant.upsert({
    where: { slug: 'anu-beta' },
    update: {
      name: 'ANU Beta',
      status: 'active',
      settings: {
        protocol: 'falak',
        region: 'canberra',
        visibilityPolicy: 'culturally-aware',
      },
    },
    create: {
      slug: 'anu-beta',
      name: 'ANU Beta',
      status: 'active',
      settings: {
        protocol: 'falak',
        region: 'canberra',
        visibilityPolicy: 'culturally-aware',
      },
    },
  });

  const [admin, curator, governor, publicActor] = await Promise.all([
    prisma.falakActor.upsert({
      where: {
        tenantId_externalAuthId: {
          tenantId: tenant.id,
          externalAuthId: 'anu-admin',
        },
      },
      update: {
        actorType: 'user',
        email: 'admin@anu.beta',
        displayName: 'ANU Tenant Admin',
      },
      create: {
        tenantId: tenant.id,
        actorType: 'user',
        externalAuthId: 'anu-admin',
        email: 'admin@anu.beta',
        displayName: 'ANU Tenant Admin',
      },
    }),
    prisma.falakActor.upsert({
      where: {
        tenantId_externalAuthId: {
          tenantId: tenant.id,
          externalAuthId: 'anu-curator',
        },
      },
      update: {
        actorType: 'user',
        email: 'curator@anu.beta',
        displayName: 'ANU Curator',
      },
      create: {
        tenantId: tenant.id,
        actorType: 'user',
        externalAuthId: 'anu-curator',
        email: 'curator@anu.beta',
        displayName: 'ANU Curator',
      },
    }),
    prisma.falakActor.upsert({
      where: {
        tenantId_externalAuthId: {
          tenantId: tenant.id,
          externalAuthId: 'anu-governor',
        },
      },
      update: {
        actorType: 'user',
        email: 'governor@anu.beta',
        displayName: 'ANU Governor',
      },
      create: {
        tenantId: tenant.id,
        actorType: 'user',
        externalAuthId: 'anu-governor',
        email: 'governor@anu.beta',
        displayName: 'ANU Governor',
      },
    }),
    prisma.falakActor.upsert({
      where: {
        tenantId_externalAuthId: {
          tenantId: tenant.id,
          externalAuthId: 'anu-public',
        },
      },
      update: {
        actorType: 'user',
        email: 'public@anu.beta',
        displayName: 'ANU Public Member',
      },
      create: {
        tenantId: tenant.id,
        actorType: 'user',
        externalAuthId: 'anu-public',
        email: 'public@anu.beta',
        displayName: 'ANU Public Member',
      },
    }),
  ]);

  await prisma.falakActorRole.createMany({
    data: [
      { tenantId: tenant.id, actorId: admin.id, roleName: 'tenant_admin' },
      { tenantId: tenant.id, actorId: curator.id, roleName: 'curator' },
      { tenantId: tenant.id, actorId: governor.id, roleName: 'governor' },
      { tenantId: tenant.id, actorId: publicActor.id, roleName: 'viewer' },
    ],
    skipDuplicates: true,
  });

  const regionNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: admin.id,
    type: 'region',
    slug: 'ngunnawal-country',
    visibility: 'public',
    sensitivityClass: 'normal',
    title: 'Ngunnawal Country',
    summary: 'Regional anchor for ANU cultural coordination.',
    metadata: {
      kind: 'region',
      custodianship: 'Ngunnawal Country',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1187, -35.2777],
    },
  });

  const venueNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: curator.id,
    type: 'venue',
    slug: 'anu-school-of-music',
    visibility: 'public',
    sensitivityClass: 'normal',
    title: 'ANU School of Music',
    summary: 'Venue node for performances, rehearsals, and cultural gatherings.',
    metadata: {
      capacity: 240,
      access: 'public_programs',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1201, -35.2792],
    },
  });

  const organisationNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: admin.id,
    type: 'organisation',
    slug: 'anu-cultural-commons',
    visibility: 'tenant',
    sensitivityClass: 'normal',
    title: 'ANU Cultural Commons',
    summary: 'Tenant-scoped organisational node coordinating cultural programs.',
    metadata: {
      scope: 'tenant',
      stewardingModel: 'shared-governance',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1236, -35.2811],
    },
  });

  const communityNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: admin.id,
    type: 'community',
    slug: 'ngunnawal-arts-circle',
    visibility: 'tenant',
    sensitivityClass: 'normal',
    title: 'Ngunnawal Arts Circle',
    summary: 'Tenant-scoped community node for the first ANU Falak feature slice.',
    metadata: {
      scope: 'tenant',
      slice: 'cultural-event-contribution-allocation',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1192, -35.2801],
    },
  });

  const campaignNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: admin.id,
    type: 'campaign',
    slug: 'first-nations-stage-fund',
    visibility: 'public',
    sensitivityClass: 'normal',
    title: 'First Nations Stage Fund',
    summary: 'Public campaign node for governed cultural allocations.',
    metadata: {
      scope: 'public',
      slice: 'cultural-event-contribution-allocation',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1212, -35.2799],
    },
  });

  const poolNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: admin.id,
    type: 'liquidity_pool',
    slug: 'weaving-futures-pool',
    visibility: 'public',
    sensitivityClass: 'normal',
    title: 'Weaving Futures Pool',
    summary: 'Liquidity pool used by the first ANU governed coordination slice.',
    metadata: {
      slice: 'cultural-event-contribution-allocation',
      currency: 'AUD',
    },
    geometry: null,
  });

  const eventNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: curator.id,
    type: 'event',
    slug: 'weaving-futures-festival',
    visibility: 'public',
    sensitivityClass: 'normal',
    title: 'Weaving Futures Festival',
    summary: 'Public cultural event coordinated through the Falak graph.',
    metadata: {
      format: 'festival',
      programTrack: 'culture-and-care',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1205, -35.2795],
    },
    timeStart: '2026-05-01T08:00:00.000Z',
    timeEnd: '2026-05-03T18:00:00.000Z',
  });

  const storyNodeId = await upsertFalakNode({
    tenantId: tenant.id,
    actorId: curator.id,
    type: 'story',
    slug: 'songlines-of-lake-burley',
    visibility: 'restricted',
    sensitivityClass: 'cultural-sensitive',
    title: 'Songlines of Lake Burley Griffin',
    summary: 'Restricted cultural narrative node requiring custodial visibility controls.',
    metadata: {
      exportPolicy: 'custodian-review',
      culturalCare: 'restricted',
    },
    geometry: {
      type: 'Point',
      coordinates: [149.1169, -35.2922],
    },
  });

  const existingEdges = await prisma.$queryRaw<Array<{ relation: string; from_node: string; to_node: string }>>(Prisma.sql`
    SELECT relation, from_node, to_node
    FROM falak.edges
    WHERE tenant_id = ${tenant.id}::uuid
      AND (
        (from_node = ${venueNodeId}::uuid AND to_node = ${regionNodeId}::uuid AND relation = 'located_in')
        OR (from_node = ${eventNodeId}::uuid AND to_node = ${venueNodeId}::uuid AND relation = 'occurs_at')
        OR (from_node = ${eventNodeId}::uuid AND to_node = ${organisationNodeId}::uuid AND relation = 'hosted_by')
        OR (from_node = ${storyNodeId}::uuid AND to_node = ${regionNodeId}::uuid AND relation = 'rooted_in')
      )
  `);

  const hasEdge = (relation: string, fromNode: string, toNode: string) =>
    existingEdges.some((edge) => edge.relation === relation && edge.from_node === fromNode && edge.to_node === toNode);

  if (!hasEdge('located_in', venueNodeId, regionNodeId)) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO falak.edges (tenant_id, from_node, to_node, relation, status, weight, evidence, metadata, created_by)
      VALUES (
        ${tenant.id}::uuid,
        ${venueNodeId}::uuid,
        ${regionNodeId}::uuid,
        'located_in',
        'active'::falak.falak_edge_status,
        1,
        '[]'::jsonb,
        '{}'::jsonb,
        ${admin.id}::uuid
      )
    `);
  }

  if (!hasEdge('occurs_at', eventNodeId, venueNodeId)) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO falak.edges (tenant_id, from_node, to_node, relation, status, weight, evidence, metadata, created_by)
      VALUES (
        ${tenant.id}::uuid,
        ${eventNodeId}::uuid,
        ${venueNodeId}::uuid,
        'occurs_at',
        'active'::falak.falak_edge_status,
        1,
        '[]'::jsonb,
        '{}'::jsonb,
        ${curator.id}::uuid
      )
    `);
  }

  if (!hasEdge('hosted_by', eventNodeId, organisationNodeId)) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO falak.edges (tenant_id, from_node, to_node, relation, status, weight, evidence, metadata, created_by)
      VALUES (
        ${tenant.id}::uuid,
        ${eventNodeId}::uuid,
        ${organisationNodeId}::uuid,
        'hosted_by',
        'active'::falak.falak_edge_status,
        1,
        '[]'::jsonb,
        '{}'::jsonb,
        ${curator.id}::uuid
      )
    `);
  }

  if (!hasEdge('rooted_in', storyNodeId, regionNodeId)) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO falak.edges (tenant_id, from_node, to_node, relation, status, weight, evidence, metadata, created_by)
      VALUES (
        ${tenant.id}::uuid,
        ${storyNodeId}::uuid,
        ${regionNodeId}::uuid,
        'rooted_in',
        'active'::falak.falak_edge_status,
        1,
        '[]'::jsonb,
        '{}'::jsonb,
        ${curator.id}::uuid
      )
    `);
  }

  await Promise.all([
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'node-create-admin-curator',
        },
      },
      update: {
        resourceType: 'node',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'node-create-admin-curator',
        resourceType: 'node',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'node-update-restricted-needs-approval',
        },
      },
      update: {
        resourceType: 'node',
        action: 'update',
        effect: 'requires_approval',
        priority: 5,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          resource_visibility_in: ['restricted'],
          approval_threshold: 2,
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'node-update-restricted-needs-approval',
        resourceType: 'node',
        action: 'update',
        effect: 'requires_approval',
        priority: 5,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          resource_visibility_in: ['restricted'],
          approval_threshold: 2,
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'node-update-admin-curator',
        },
      },
      update: {
        resourceType: 'node',
        action: 'update',
        effect: 'allow',
        priority: 20,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'node-update-admin-curator',
        resourceType: 'node',
        action: 'update',
        effect: 'allow',
        priority: 20,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'node-delete-viewer-deny',
        },
      },
      update: {
        resourceType: 'node',
        action: 'delete',
        effect: 'deny',
        priority: 1,
        conditions: {
          roles_any: ['viewer'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'node-delete-viewer-deny',
        resourceType: 'node',
        action: 'delete',
        effect: 'deny',
        priority: 1,
        conditions: {
          roles_any: ['viewer'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'edge-create-admin-curator',
        },
      },
      update: {
        resourceType: 'edge',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'edge-create-admin-curator',
        resourceType: 'edge',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'approval-create-admin-curator',
        },
      },
      update: {
        resourceType: 'approval',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'approval-create-admin-curator',
        resourceType: 'approval',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'approval-vote-governor-admin',
        },
      },
      update: {
        resourceType: 'approval',
        action: 'vote',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'governor'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'approval-vote-governor-admin',
        resourceType: 'approval',
        action: 'vote',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'governor'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'event-create-admin-curator',
        },
      },
      update: {
        resourceType: 'event',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'event-create-admin-curator',
        resourceType: 'event',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'contribution-record-admin-curator',
        },
      },
      update: {
        resourceType: 'contribution',
        action: 'record',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'contribution-record-admin-curator',
        resourceType: 'contribution',
        action: 'record',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'contribution-record-anonymous',
        },
      },
      update: {
        resourceType: 'contribution',
        action: 'record',
        effect: 'allow',
        priority: 20,
        conditions: {
          context_equals: {
            anonymous: true,
          },
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'contribution-record-anonymous',
        resourceType: 'contribution',
        action: 'record',
        effect: 'allow',
        priority: 20,
        conditions: {
          context_equals: {
            anonymous: true,
          },
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'allocation-propose-admin-curator',
        },
      },
      update: {
        resourceType: 'allocation',
        action: 'propose',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'allocation-propose-admin-curator',
        resourceType: 'allocation',
        action: 'propose',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'allocation-execute-approval-threshold',
        },
      },
      update: {
        resourceType: 'allocation',
        action: 'execute',
        effect: 'requires_approval',
        priority: 5,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          context_equals: {
            currency: 'AUD',
          },
          context_number_gt: {
            amount: 500,
          },
          approval_threshold: 2,
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'allocation-execute-approval-threshold',
        resourceType: 'allocation',
        action: 'execute',
        effect: 'requires_approval',
        priority: 5,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          context_equals: {
            currency: 'AUD',
          },
          context_number_gt: {
            amount: 500,
          },
          approval_threshold: 2,
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'allocation-execute-admin-curator',
        },
      },
      update: {
        resourceType: 'allocation',
        action: 'execute',
        effect: 'allow',
        priority: 20,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'allocation-execute-admin-curator',
        resourceType: 'allocation',
        action: 'execute',
        effect: 'allow',
        priority: 20,
        conditions: {
          roles_any: ['tenant_admin', 'curator'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
    prisma.falakPolicy.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: 'federation-link-admin',
        },
      },
      update: {
        resourceType: 'federation_link',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin'],
          require_actor: true,
        },
      },
      create: {
        tenantId: tenant.id,
        name: 'federation-link-admin',
        resourceType: 'federation_link',
        action: 'create',
        effect: 'allow',
        priority: 10,
        conditions: {
          roles_any: ['tenant_admin'],
          require_actor: true,
        },
        createdById: admin.id,
        updatedById: admin.id,
      },
    }),
  ]);

  const repository = new PrismaFalakRepository(prisma);
  const policyEngine = new PolicyEngine(repository);
  const fanoutPublisher = new NoopFanoutPublisher();
  const eventWorkflowService = new EventWorkflowService(repository, policyEngine, fanoutPublisher);
  const contributionWorkflowService = new ContributionWorkflowService(repository, policyEngine, fanoutPublisher);
  const allocationWorkflowService = new AllocationWorkflowService(repository, policyEngine, fanoutPublisher);

  const adminActor: ResolvedActor = {
    id: admin.id,
    tenantId: tenant.id,
    actorType: admin.actorType,
    externalAuthId: admin.externalAuthId,
    email: admin.email,
    displayName: admin.displayName,
    roles: [{ id: `${admin.id}-tenant-admin`, roleName: 'tenant_admin', regionNodeId: null }],
  };
  const governorActor: ResolvedActor = {
    id: governor.id,
    tenantId: tenant.id,
    actorType: governor.actorType,
    externalAuthId: governor.externalAuthId,
    email: governor.email,
    displayName: governor.displayName,
    roles: [{ id: `${governor.id}-governor`, roleName: 'governor', regionNodeId: null }],
  };

  const adminContext = makeSeedContext(tenant.id, adminActor, 'privileged');
  const governorContext = makeSeedContext(tenant.id, governorActor, 'privileged');
  const anonymousContributionContext = makeSeedContext(tenant.id, null, 'public');

  const sliceEventSlug = 'anu-cultural-night';
  const existingSliceEvents = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM falak.nodes
    WHERE tenant_id = ${tenant.id}::uuid
      AND slug = ${sliceEventSlug}
    LIMIT 1
  `);
  const sliceEventId = existingSliceEvents[0]?.id ?? (
    await eventWorkflowService.createEvent(adminContext, {
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: sliceEventSlug,
      title: 'ANU Cultural Night',
      summary: 'Seeded end-to-end ANU event on the Falak protocol slice.',
      metadata: {
        seed: true,
        slice: 'cultural-event-contribution-allocation',
      },
      geometry: {
        type: 'Point',
        coordinates: [149.1206, -35.2794],
      },
      timeStart: '2026-05-10T08:00:00.000Z',
      timeEnd: '2026-05-10T12:00:00.000Z',
      venueNodeId,
      communityNodeId,
      campaignNodeId,
      poolNodeId,
    })
  ).event.id;

  const existingContributionRefs = await prisma.$queryRaw<Array<{ reference: string | null }>>(Prisma.sql`
    SELECT reference
    FROM falak.contributions
    WHERE tenant_id = ${tenant.id}::uuid
      AND event_node_id = ${sliceEventId}::uuid
      AND reference IN ('anu-seed-contribution-1', 'anu-seed-contribution-2')
  `);
  const existingContributionRefSet = new Set(existingContributionRefs.map((row) => row.reference).filter(Boolean));

  if (!existingContributionRefSet.has('anu-seed-contribution-1')) {
    await contributionWorkflowService.recordContribution(anonymousContributionContext, {
      eventNodeId: sliceEventId,
      poolNodeId,
      amount: 250,
      currency: 'AUD',
      note: 'Seeded public contribution',
      reference: 'anu-seed-contribution-1',
      contributedAt: '2026-05-10T09:00:00.000Z',
    });
  }

  if (!existingContributionRefSet.has('anu-seed-contribution-2')) {
    await contributionWorkflowService.recordContribution(anonymousContributionContext, {
      eventNodeId: sliceEventId,
      poolNodeId,
      amount: 475,
      currency: 'AUD',
      note: 'Seeded public contribution',
      reference: 'anu-seed-contribution-2',
      contributedAt: '2026-05-10T09:30:00.000Z',
    });
  }

  const existingSliceProposal = await prisma.$queryRaw<Array<{ id: string; approval_id: string | null; status: string }>>(Prisma.sql`
    SELECT id, approval_id, status
    FROM falak.allocation_proposals
    WHERE tenant_id = ${tenant.id}::uuid
      AND event_node_id = ${sliceEventId}::uuid
      AND rationale = 'Seed governed allocation proposal'
    LIMIT 1
  `);

  let seedProposalStatus = existingSliceProposal[0]?.status ?? null;
  let seedApprovalId = existingSliceProposal[0]?.approval_id ?? null;
  if (!existingSliceProposal[0]) {
    const proposalWorkflow = await allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: sliceEventId,
      poolNodeId,
      targetNodeId: campaignNodeId,
      amount: 600,
      currency: 'AUD',
      rationale: 'Seed governed allocation proposal',
    });
    seedProposalStatus = proposalWorkflow.proposal.status;
    seedApprovalId = proposalWorkflow.approval?.id ?? null;
  }

  return {
    tenant: tenant.slug,
    actors: [admin.displayName, curator.displayName, governor.displayName, publicActor.displayName],
    nodes: [
      'ngunnawal-country',
      'anu-school-of-music',
      'anu-cultural-commons',
      'weaving-futures-festival',
      'ngunnawal-arts-circle',
      'first-nations-stage-fund',
      'weaving-futures-pool',
      sliceEventSlug,
      'songlines-of-lake-burley',
    ],
    anuSlice: {
      event: sliceEventSlug,
      community: 'ngunnawal-arts-circle',
      campaign: 'first-nations-stage-fund',
      pool: 'weaving-futures-pool',
      pendingApprovalId: seedApprovalId,
      proposalStatus: seedProposalStatus,
    },
  };
}

export async function runSeed(options: RunSeedOptions) {
  if (options.guardMode === 'local') {
    assertSafeLocalVerificationEnvironment({
      commandName: options.commandName,
      envVarNames: ['DATABASE_URL']
    });
  } else {
    assertSafeHostedStagingEnvironment({
      commandName: options.commandName,
      envVarNames: ['DATABASE_URL']
    });
  }

  console.log('Seeding impact-service database...');

  const plans = await ensureMembershipPlans();
  await ensureLegacyImpactPools();
  const memeticSeed = await ensureMemeticMutualAidSeed();
  const falakSeed = await ensureFalakSeed();

  console.log('Seed complete', {
    membershipPlans: plans.map((plan) => plan.name),
    memeticSeed,
    falakSeed,
  });
}

export async function disconnectSeedPrisma(): Promise<void> {
  await prisma.$disconnect();
}

if (require.main === module) {
  runSeed({
    commandName: 'Prisma seed',
    guardMode: 'local'
  })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await disconnectSeedPrisma();
    });
}
