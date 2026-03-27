import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createPrismaClient } from '../../src/lib/prisma';
import { RequestContext } from '../../src/falak/domain/types';
import { PrismaFalakRepository } from '../../src/falak/repositories/prismaFalakRepository';
import { FalakService } from '../../src/falak/services/falakService';
import { EventWorkflowService } from '../../src/falak/services/eventWorkflowService';
import { ContributionWorkflowService } from '../../src/falak/services/contributionWorkflowService';
import { AllocationWorkflowService } from '../../src/falak/services/allocationWorkflowService';
import { ImpactQueryService } from '../../src/falak/services/impactQueryService';
import { MutationPipeline } from '../../src/falak/services/mutationPipeline';
import { NoopFanoutPublisher } from '../../src/falak/services/fanoutPublisher';
import { PolicyEngine } from '../../src/falak/services/policyEngine';

const describeIfDatabase =
  process.env.FALAK_INTEGRATION_LOCAL === 'true' && process.env.DATABASE_URL ? describe : describe.skip;

interface LiveFixture {
  tenantId: string;
  otherTenantId: string;
  actorIds: {
    admin: string;
    governor: string;
    viewer: string;
  };
  contexts: {
    admin: RequestContext;
    governor: RequestContext;
    viewer: RequestContext;
    public: RequestContext;
  };
  nodeIds: {
    publicVenue: string;
    publicEvent: string;
    community: string;
    campaign: string;
    liquidityPool: string;
    restrictedStory: string;
    otherTenantCampaign: string;
    otherTenantRestrictedStory: string;
  };
}

describeIfDatabase('Falak database invariants', () => {
  const prisma = createPrismaClient();
  const repository = new PrismaFalakRepository(prisma);
  const policyEngine = new PolicyEngine(repository);
  const fanoutPublisher = new NoopFanoutPublisher();
  const mutationPipeline = new MutationPipeline(repository, policyEngine, fanoutPublisher);
  const service = new FalakService(repository, policyEngine, mutationPipeline);
  const eventWorkflowService = new EventWorkflowService(repository, policyEngine, fanoutPublisher);
  const contributionWorkflowService = new ContributionWorkflowService(repository, policyEngine, fanoutPublisher);
  const allocationWorkflowService = new AllocationWorkflowService(repository, policyEngine, fanoutPublisher);
  const impactQueryService = new ImpactQueryService(repository);
  const createdTenantIds: string[] = [];

  function makeContext(args: {
    tenantId: string;
    actorId: string | null;
    actorRoles: string[];
    plane: RequestContext['plane'];
  }): RequestContext {
    return {
      traceId: randomUUID(),
      tenantId: args.tenantId,
      tenantSlug: `falak-test-${args.tenantId}`,
      plane: args.plane,
      actor: args.actorId
        ? {
            id: args.actorId,
            tenantId: args.tenantId,
            actorType: 'user',
            externalAuthId: null,
            email: null,
            displayName: 'Falak Integration Actor',
            roles: args.actorRoles.map((roleName) => ({
              id: randomUUID(),
              roleName,
              regionNodeId: null
              }))
          }
        : null,
      actorResolution: {
        source: args.actorId ? 'verified_auth' : 'none',
        isVerified: args.actorId !== null,
        authenticatedIdentity: null,
        requestedActorId: null
      },
      routeGuard: {
        applies: false,
        mode: 'enabled',
        access: args.plane === 'public' ? 'public' : 'privileged'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'falak-integration-jest'
    };
  }

  async function createFixture(): Promise<LiveFixture> {
    const tenantId = randomUUID();
    const otherTenantId = randomUUID();
    const adminId = randomUUID();
    const governorId = randomUUID();
    const viewerId = randomUUID();
    const otherTenantAdminId = randomUUID();

    createdTenantIds.push(tenantId, otherTenantId);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO falak.tenants (id, slug, name)
        VALUES
          (${tenantId}::uuid, ${`falak-test-${tenantId}`}, 'Falak Integration Tenant'),
          (${otherTenantId}::uuid, ${`falak-test-${otherTenantId}`}, 'Falak Integration Partner Tenant')
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO falak.actors (id, tenant_id, actor_type, display_name)
        VALUES
          (${adminId}::uuid, ${tenantId}::uuid, 'user', 'Falak Integration Admin'),
          (${governorId}::uuid, ${tenantId}::uuid, 'user', 'Falak Integration Governor'),
          (${viewerId}::uuid, ${tenantId}::uuid, 'user', 'Falak Integration Viewer'),
          (${otherTenantAdminId}::uuid, ${otherTenantId}::uuid, 'user', 'Partner Tenant Admin')
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO falak.actor_roles (tenant_id, actor_id, role_name)
        VALUES
          (${tenantId}::uuid, ${adminId}::uuid, 'tenant_admin'),
          (${tenantId}::uuid, ${governorId}::uuid, 'governor'),
          (${tenantId}::uuid, ${viewerId}::uuid, 'viewer'),
          (${otherTenantId}::uuid, ${otherTenantAdminId}::uuid, 'tenant_admin')
      `);

      await tx.falakPolicy.createMany({
        data: [
          {
            tenantId,
            name: 'node-update-restricted-needs-approval',
            resourceType: 'node',
            action: 'update',
            effect: 'requires_approval',
            priority: 5,
            conditions: {
              roles_any: ['tenant_admin'],
              resource_visibility_in: ['restricted'],
              approval_threshold: 2,
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'node-update-admin',
            resourceType: 'node',
            action: 'update',
            effect: 'allow',
            priority: 20,
            conditions: {
              roles_any: ['tenant_admin'],
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'approval-vote-governor-admin',
            resourceType: 'approval',
            action: 'vote',
            effect: 'allow',
            priority: 10,
            conditions: {
              roles_any: ['tenant_admin', 'governor'],
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'event-create-admin-curator',
            resourceType: 'event',
            action: 'create',
            effect: 'allow',
            priority: 10,
            conditions: {
              roles_any: ['tenant_admin', 'curator'],
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'contribution-record-admin-curator',
            resourceType: 'contribution',
            action: 'record',
            effect: 'allow',
            priority: 10,
            conditions: {
              roles_any: ['tenant_admin', 'curator'],
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'contribution-record-anonymous',
            resourceType: 'contribution',
            action: 'record',
            effect: 'allow',
            priority: 20,
            conditions: {
              context_equals: {
                anonymous: true
              }
            }
          },
          {
            tenantId,
            name: 'allocation-propose-admin-curator',
            resourceType: 'allocation',
            action: 'propose',
            effect: 'allow',
            priority: 10,
            conditions: {
              roles_any: ['tenant_admin', 'curator'],
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'allocation-execute-approval-threshold',
            resourceType: 'allocation',
            action: 'execute',
            effect: 'requires_approval',
            priority: 5,
            conditions: {
              roles_any: ['tenant_admin', 'curator'],
              context_equals: {
                currency: 'AUD'
              },
              context_number_gt: {
                amount: 500
              },
              approval_threshold: 2,
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'allocation-execute-admin-curator',
            resourceType: 'allocation',
            action: 'execute',
            effect: 'allow',
            priority: 20,
            conditions: {
              roles_any: ['tenant_admin', 'curator'],
              require_actor: true
            }
          },
          {
            tenantId,
            name: 'federation-link-admin',
            resourceType: 'federation_link',
            action: 'create',
            effect: 'allow',
            priority: 10,
            conditions: {
              roles_any: ['tenant_admin'],
              require_actor: true
            }
          }
        ]
      });
    });

    const contexts = {
      admin: makeContext({ tenantId, actorId: adminId, actorRoles: ['tenant_admin'], plane: 'privileged' }),
      governor: makeContext({ tenantId, actorId: governorId, actorRoles: ['governor'], plane: 'privileged' }),
      viewer: makeContext({ tenantId, actorId: viewerId, actorRoles: ['viewer'], plane: 'privileged' }),
      public: makeContext({ tenantId, actorId: null, actorRoles: [], plane: 'public' })
    };

    const nodeIds = await repository.transaction(tenantId, async (tx) => {
      const publicVenue = await tx.createNode(contexts.admin, {
        type: 'venue',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `venue-${tenantId}`,
        title: 'Integration Venue',
        summary: 'Public venue for integration verification',
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1201, -35.2792] },
        timeStart: null,
        timeEnd: null
      });
      const publicEvent = await tx.createNode(contexts.admin, {
        type: 'event',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `event-${tenantId}`,
        title: 'Integration Event',
        summary: 'Public event for federation tests',
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1205, -35.2795] },
        timeStart: null,
        timeEnd: null
      });
      const community = await tx.createNode(contexts.admin, {
        type: 'community',
        visibility: 'tenant',
        sensitivityClass: 'normal',
        slug: `community-${tenantId}`,
        title: 'Integration Community',
        summary: 'Tenant community for ANU slice tests',
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1192, -35.2801] },
        timeStart: null,
        timeEnd: null
      });
      const campaign = await tx.createNode(contexts.admin, {
        type: 'campaign',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `campaign-${tenantId}`,
        title: 'Integration Campaign',
        summary: 'Public campaign for ANU slice tests',
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1212, -35.2799] },
        timeStart: null,
        timeEnd: null
      });
      const liquidityPool = await tx.createNode(contexts.admin, {
        type: 'liquidity_pool',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `pool-${tenantId}`,
        title: 'Integration Pool',
        summary: 'Falak liquidity pool for ANU slice tests',
        metadata: {},
        geometry: null,
        timeStart: null,
        timeEnd: null
      });
      const restrictedStory = await tx.createNode(contexts.admin, {
        type: 'story',
        visibility: 'restricted',
        sensitivityClass: 'cultural-sensitive',
        slug: `story-${tenantId}`,
        title: 'Restricted Story',
        summary: 'Restricted story for approval tests',
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1169, -35.2922] },
        timeStart: null,
        timeEnd: null
      });

      return {
        publicVenue: publicVenue.id,
        publicEvent: publicEvent.id,
        community: community.id,
        campaign: campaign.id,
        liquidityPool: liquidityPool.id,
        restrictedStory: restrictedStory.id
      };
    });

    const otherTenantNodes = await repository.transaction(otherTenantId, async (tx) => {
      const otherTenantAdminContext = makeContext({
        tenantId: otherTenantId,
        actorId: otherTenantAdminId,
        actorRoles: ['tenant_admin'],
        plane: 'privileged'
      });

      const publicCampaign = await tx.createNode(otherTenantAdminContext, {
        type: 'campaign',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `campaign-${otherTenantId}`,
        title: 'Partner Campaign',
        summary: 'Cross-tenant public campaign for rejection tests',
        metadata: {},
        geometry: null,
        timeStart: null,
        timeEnd: null
      });
      const restrictedNode = await tx.createNode(otherTenantAdminContext, {
        type: 'story',
        visibility: 'restricted',
        sensitivityClass: 'cultural-sensitive',
        slug: `story-${otherTenantId}`,
        title: 'Partner Restricted Story',
        summary: 'Cross-tenant restricted story for federation rejection',
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1315, -35.2865] },
        timeStart: null,
        timeEnd: null
      });

      return {
        otherTenantCampaign: publicCampaign.id,
        otherTenantRestrictedStory: restrictedNode.id
      };
    });

    return {
      tenantId,
      otherTenantId,
      actorIds: {
        admin: adminId,
        governor: governorId,
        viewer: viewerId
      },
      contexts,
      nodeIds: {
        ...nodeIds,
        ...otherTenantNodes
      }
    };
  }

  afterEach(async () => {
    while (createdTenantIds.length > 0) {
      const tenantId = createdTenantIds.pop()!;
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT set_config('app.current_tenant_id', ${tenantId}, true)
        `);
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM falak.tenants
          WHERE id = ${tenantId}::uuid
        `);
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('rejects event updates and deletes because the event stream is append-only', async () => {
    const fixture = await createFixture();
    const event = await repository.transaction(fixture.tenantId, (tx) =>
      tx.writeEvent({
        tenantId: fixture.tenantId,
        eventType: 'node.create',
        actorId: fixture.actorIds.admin,
        targetType: 'node',
        targetId: fixture.nodeIds.publicVenue,
        policyResult: 'allowed',
        payload: { source: 'integration-test' },
        traceId: randomUUID()
      })
    );

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT set_config('app.current_tenant_id', ${fixture.tenantId}, true)
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE falak.events
          SET event_type = 'tampered.event'
          WHERE id = ${event.id}::uuid
        `);
      })
    ).rejects.toThrow(/append-only/i);

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT set_config('app.current_tenant_id', ${fixture.tenantId}, true)
        `);
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM falak.events
          WHERE id = ${event.id}::uuid
        `);
      })
    ).rejects.toThrow(/append-only/i);
  });

  test('rejects ledger updates and deletes because ledger entries are immutable', async () => {
    const fixture = await createFixture();
    const ledgerEntry = await repository.transaction(fixture.tenantId, (tx) =>
      tx.writeLedgerEntry({
        tenantId: fixture.tenantId,
        category: 'governance',
        eventId: null,
        referenceType: 'test',
        referenceId: fixture.nodeIds.publicVenue,
        metadata: { source: 'integration-test' }
      })
    );

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT set_config('app.current_tenant_id', ${fixture.tenantId}, true)
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE falak.ledger_entries
          SET reference_type = 'tampered'
          WHERE id = ${ledgerEntry.id}::uuid
        `);
      })
    ).rejects.toThrow(/immutable/i);

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          SELECT set_config('app.current_tenant_id', ${fixture.tenantId}, true)
        `);
        await tx.$executeRaw(Prisma.sql`
          DELETE FROM falak.ledger_entries
          WHERE id = ${ledgerEntry.id}::uuid
        `);
      })
    ).rejects.toThrow(/immutable/i);
  });

  test('orders nearby nodes by computed PostGIS distance', async () => {
    const fixture = await createFixture();
    const { nearNode, farNode } = await repository.transaction(fixture.tenantId, async (tx) => {
      const createdNearNode = await tx.createNode(fixture.contexts.admin, {
        type: 'venue',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `near-${randomUUID()}`,
        title: 'Near Venue',
        summary: null,
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.1201, -35.2792] },
        timeStart: null,
        timeEnd: null
      });
      const createdFarNode = await tx.createNode(fixture.contexts.admin, {
        type: 'venue',
        visibility: 'public',
        sensitivityClass: 'normal',
        slug: `far-${randomUUID()}`,
        title: 'Far Venue',
        summary: null,
        metadata: {},
        geometry: { type: 'Point', coordinates: [149.135, -35.289] },
        timeStart: null,
        timeEnd: null
      });

      return {
        nearNode: createdNearNode,
        farNode: createdFarNode
      };
    });

    const nodes = await repository.nearbyNodes(fixture.contexts.public, {
      lat: -35.279,
      lng: 149.1202,
      radiusMeters: 5_000,
      type: 'venue'
    });

    const nearIndex = nodes.findIndex((node) => node.id === nearNode.id);
    const farIndex = nodes.findIndex((node) => node.id === farNode.id);
    const nearDistance = nodes.find((node) => node.id === nearNode.id)?.distanceMeters ?? 0;
    const farDistance = nodes.find((node) => node.id === farNode.id)?.distanceMeters ?? 0;

    expect(nearIndex).toBeGreaterThanOrEqual(0);
    expect(farIndex).toBeGreaterThanOrEqual(0);
    expect(nearIndex).toBeLessThan(farIndex);
    expect(farDistance).toBeGreaterThan(nearDistance);
  });

  test('requires_approval auto-creates an approval inside the blocked transaction', async () => {
    const fixture = await createFixture();
    const execution = await service.updateNode(fixture.contexts.admin, fixture.nodeIds.restrictedStory, {
      title: 'Pending restricted update',
      expectedVersion: 1
    });

    expect(execution.status).toBe('blocked');
    if (execution.status !== 'blocked' || !execution.decision.approvalId) {
      throw new Error('Expected update to require approval and materialize an approval row');
    }

    const approval = await repository.getApprovalById(fixture.tenantId, execution.decision.approvalId);
    expect(approval).toMatchObject({
      id: execution.decision.approvalId,
      targetId: fixture.nodeIds.restrictedStory,
      requiredApprovals: 2,
      status: 'pending'
    });

    const events = await repository.listEvents(fixture.contexts.admin, { limit: 10 });
    expect(events[0]?.payload).toMatchObject({
      decision: 'requires_approval',
      approvalId: execution.decision.approvalId
    });
  });

  test('reports optimistic concurrency conflicts through the live repository', async () => {
    const fixture = await createFixture();

    await service.updateNode(fixture.contexts.admin, fixture.nodeIds.publicVenue, {
      title: 'Fresh update',
      expectedVersion: 1
    });

    await expect(service.updateNode(fixture.contexts.admin, fixture.nodeIds.publicVenue, {
      title: 'Stale update',
      expectedVersion: 1
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'VERSION_CONFLICT'
    });
  });

  test('prevents public reads of restricted nodes against the live database', async () => {
    const fixture = await createFixture();

    await expect(service.getNode(fixture.contexts.public, fixture.nodeIds.restrictedStory)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NODE_NOT_FOUND'
    });
  });

  test('rejects federation links to non-public cross-tenant targets', async () => {
    const fixture = await createFixture();

    await expect(service.createFederationLink(fixture.contexts.admin, {
      sourceNodeId: fixture.nodeIds.publicEvent,
      targetNodeId: fixture.nodeIds.otherTenantRestrictedStory,
      relation: 'federates_with',
      contract: {}
    })).rejects.toMatchObject({
      statusCode: 404,
      code: 'TARGET_NODE_NOT_FOUND'
    });
  });

  test('creates an event, records contributions, and returns coherent impact totals', async () => {
    const fixture = await createFixture();
    const created = await eventWorkflowService.createEvent(fixture.contexts.admin, {
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: `anu-slice-${fixture.tenantId}`,
      title: 'ANU Slice Event',
      summary: 'Integration feature slice event',
      metadata: { source: 'integration-test' },
      geometry: { type: 'Point', coordinates: [149.1206, -35.2794] },
      timeStart: '2026-05-10T08:00:00.000Z',
      timeEnd: '2026-05-10T12:00:00.000Z',
      venueNodeId: fixture.nodeIds.publicVenue,
      communityNodeId: fixture.nodeIds.community,
      campaignNodeId: fixture.nodeIds.campaign,
      poolNodeId: fixture.nodeIds.liquidityPool
    });

    await contributionWorkflowService.recordContribution(fixture.contexts.public, {
      eventNodeId: created.event.id,
      poolNodeId: fixture.nodeIds.liquidityPool,
      amount: 150,
      currency: 'AUD',
      note: 'Integration contribution',
      reference: 'int-001',
      contributedAt: null
    });

    const impact = await impactQueryService.getEventImpact(fixture.contexts.admin, created.event.id);
    const publicImpact = await impactQueryService.getEventImpact(fixture.contexts.public, created.event.id);

    expect(impact.totalContributions).toContainEqual({ currency: 'AUD', amount: 150 });
    expect(impact.poolBalance?.balances).toContainEqual({ currency: 'AUD', amount: 150 });
    expect(publicImpact.graph.nodes.some((node) => node.id === fixture.nodeIds.community)).toBe(false);
    expect(impact.graph.edges.map((edge) => edge.relation)).toEqual(expect.arrayContaining(['occurs_at', 'hosts', 'benefits', 'tied_to_pool']));
  });

  test('allocation approvals execute exactly once against the live database', async () => {
    const fixture = await createFixture();
    const created = await eventWorkflowService.createEvent(fixture.contexts.admin, {
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: `anu-allocation-${fixture.tenantId}`,
      title: 'ANU Allocation Event',
      summary: 'Allocation approval integration test',
      metadata: { source: 'integration-test' },
      geometry: { type: 'Point', coordinates: [149.1207, -35.2793] },
      timeStart: '2026-05-11T08:00:00.000Z',
      timeEnd: '2026-05-11T12:00:00.000Z',
      venueNodeId: fixture.nodeIds.publicVenue,
      communityNodeId: fixture.nodeIds.community,
      campaignNodeId: fixture.nodeIds.campaign,
      poolNodeId: fixture.nodeIds.liquidityPool
    });

    await contributionWorkflowService.recordContribution(fixture.contexts.public, {
      eventNodeId: created.event.id,
      poolNodeId: fixture.nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: 'Funding the pool',
      reference: 'int-002',
      contributedAt: null
    });

    const proposal = await allocationWorkflowService.proposeAllocation(fixture.contexts.admin, {
      eventNodeId: created.event.id,
      poolNodeId: fixture.nodeIds.liquidityPool,
      targetNodeId: fixture.nodeIds.campaign,
      amount: 600,
      currency: 'AUD',
      rationale: 'Integration allocation'
    });
    if (!proposal.approval) {
      throw new Error('Expected approval to be created');
    }

    await allocationWorkflowService.voteApproval(fixture.contexts.governor, proposal.approval.id, {
      vote: 'approve',
      note: 'Governor approval'
    });
    const result = await allocationWorkflowService.voteApproval(fixture.contexts.admin, proposal.approval.id, {
      vote: 'approve',
      note: 'Admin approval'
    });

    expect(result.executed).toBe(true);
    expect(result.ledgerEntries).toHaveLength(2);

    const duplicate = await allocationWorkflowService.executeApprovedAllocation(fixture.contexts.admin, proposal.proposal.id);
    expect(duplicate.executed).toBe(false);

    const poolBalance = await impactQueryService.getPoolBalance(fixture.contexts.admin, fixture.nodeIds.liquidityPool);
    expect(poolBalance.balances).toContainEqual({ currency: 'AUD', amount: 300 });
  });

  test('denies cross-tenant allocation targets against the live database', async () => {
    const fixture = await createFixture();
    const created = await eventWorkflowService.createEvent(fixture.contexts.admin, {
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: `anu-cross-tenant-${fixture.tenantId}`,
      title: 'Cross Tenant Guardrail',
      summary: 'Cross tenant allocation denial test',
      metadata: { source: 'integration-test' },
      geometry: { type: 'Point', coordinates: [149.1208, -35.2792] },
      timeStart: '2026-05-12T08:00:00.000Z',
      timeEnd: '2026-05-12T12:00:00.000Z',
      venueNodeId: fixture.nodeIds.publicVenue,
      communityNodeId: fixture.nodeIds.community,
      campaignNodeId: fixture.nodeIds.campaign,
      poolNodeId: fixture.nodeIds.liquidityPool
    });

    await contributionWorkflowService.recordContribution(fixture.contexts.public, {
      eventNodeId: created.event.id,
      poolNodeId: fixture.nodeIds.liquidityPool,
      amount: 300,
      currency: 'AUD',
      note: null,
      reference: null,
      contributedAt: null
    });

    await expect(allocationWorkflowService.proposeAllocation(fixture.contexts.admin, {
      eventNodeId: created.event.id,
      poolNodeId: fixture.nodeIds.liquidityPool,
      targetNodeId: fixture.nodeIds.otherTenantCampaign,
      amount: 100,
      currency: 'AUD',
      rationale: 'Should fail'
    })).rejects.toMatchObject({
      statusCode: 404
    });
  });
});
