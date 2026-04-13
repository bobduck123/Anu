import { randomUUID } from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { FalakService } from '../../src/falak/services/falakService';
import { EventWorkflowService } from '../../src/falak/services/eventWorkflowService';
import { ContributionWorkflowService } from '../../src/falak/services/contributionWorkflowService';
import { AllocationWorkflowService } from '../../src/falak/services/allocationWorkflowService';
import { ImpactQueryService } from '../../src/falak/services/impactQueryService';
import { MutationPipeline } from '../../src/falak/services/mutationPipeline';
import { NoopFanoutPublisher } from '../../src/falak/services/fanoutPublisher';
import { PolicyEngine } from '../../src/falak/services/policyEngine';
import { createSeededFalakRepository } from '../../src/falak/testing/inMemoryFalakRepository';
import { registerFalakRoutes } from '../../src/falak/routes/registerFalakRoutes';
import { readFalakRuntimeConfig } from '../../src/falak/config/falakRuntimeConfig';
import { buildRequestContextHook, requireFalakContext } from '../../src/falak/plugins/requestContext';
import { evaluateFalakRouteAccess } from '../../src/falak/security/routeGuard';
import { validateFalakStartup } from '../../src/falak/startup/falakStartupGuard';
import { AppError } from '../../src/utils/errors';

const falakGuardEnvKeys = [
  'FALAK_ROUTE_GUARD_MODE',
  'FALAK_MAP_ROUTE_GUARD_MODE',
  'FALAK_ALLOWED_TENANT_SLUGS',
  'FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS',
  'FALAK_TRUST_X_ACTOR_ID',
  'FALAK_REQUIRE_VERIFIED_ACTOR'
] as const;

type FalakGuardEnvKey = (typeof falakGuardEnvKeys)[number];
type FalakGuardEnv = Partial<Record<FalakGuardEnvKey, string>>;

const defaultHttpGuardEnv: Record<FalakGuardEnvKey, string> = {
  FALAK_ROUTE_GUARD_MODE: 'enabled',
  FALAK_MAP_ROUTE_GUARD_MODE: 'inherit',
  FALAK_ALLOWED_TENANT_SLUGS: '',
  FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS: '',
  FALAK_TRUST_X_ACTOR_ID: 'false',
  FALAK_REQUIRE_VERIFIED_ACTOR: 'true'
};

async function withFalakGuardEnv<T>(overrides: FalakGuardEnv, execute: () => Promise<T>): Promise<T> {
  const previous = new Map<FalakGuardEnvKey, string | undefined>();
  for (const key of falakGuardEnvKeys) {
    previous.set(key, process.env[key]);
    const nextValue = overrides[key] ?? defaultHttpGuardEnv[key];
    process.env[key] = nextValue;
  }

  try {
    return await execute();
  } finally {
    for (const key of falakGuardEnvKeys) {
      const previousValue = previous.get(key);
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
}

function signFalakToken(externalAuthId: string): string {
  return jwt.sign(
    {
      sub: {
        username: externalAuthId,
        role: 'operator'
      },
      aud: 'control',
      token_use: 'control'
    },
    process.env.JWT_SECRET_KEY ?? 'falak-test-secret'
  );
}

function bearerHeaders(tenantId: string, externalAuthId: string): Record<string, string> {
  return {
    'x-tenant-id': tenantId,
    authorization: `Bearer ${signFalakToken(externalAuthId)}`
  };
}

function overrideHeaders(tenantId: string, actorId: string): Record<string, string> {
  return {
    'x-tenant-id': tenantId,
    'x-actor-id': actorId
  };
}

function buildFixture() {
  const fixture = createSeededFalakRepository();
  const policyEngine = new PolicyEngine(fixture.repository);
  const fanoutPublisher = new NoopFanoutPublisher();
  const pipeline = new MutationPipeline(fixture.repository, policyEngine, fanoutPublisher);
  const service = new FalakService(fixture.repository, policyEngine, pipeline);
  const eventWorkflowService = new EventWorkflowService(fixture.repository, policyEngine, fanoutPublisher);
  const contributionWorkflowService = new ContributionWorkflowService(fixture.repository, policyEngine, fanoutPublisher);
  const allocationWorkflowService = new AllocationWorkflowService(fixture.repository, policyEngine, fanoutPublisher);
  const impactQueryService = new ImpactQueryService(fixture.repository);

  return {
    ...fixture,
    policyEngine,
    service,
    eventWorkflowService,
    contributionWorkflowService,
    allocationWorkflowService,
    impactQueryService
  };
}

async function buildHttpFixture(): Promise<ReturnType<typeof buildFixture> & { app: FastifyInstance }> {
  const fixture = buildFixture();
  const runtimeConfig = readFalakRuntimeConfig(process.env);
  const app = Fastify({
    logger: false,
    disableRequestLogging: true
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: {
          code: error.code ?? 'FALAK_ERROR',
          message: error.message,
          trace_id: request.falakContext?.traceId
        }
      });
      return;
    }

    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error',
        trace_id: request.falakContext?.traceId
      }
    });
  });

  await registerFalakRoutes(app, fixture.service, fixture.repository, {
    hasDatabase: false,
    hasRedis: false,
    runtimeConfig
  }, {
    eventWorkflowService: fixture.eventWorkflowService,
    contributionWorkflowService: fixture.contributionWorkflowService,
    allocationWorkflowService: fixture.allocationWorkflowService,
    impactQueryService: fixture.impactQueryService
  });

  const publicContext = buildRequestContextHook(fixture.repository, {
    privileged: false,
    routeGuardMode: runtimeConfig.routeGuardMode,
    runtimeConfig
  });
  const privilegedContext = buildRequestContextHook(fixture.repository, {
    privileged: true,
    routeGuardMode: runtimeConfig.routeGuardMode,
    runtimeConfig
  });

  app.get('/__test/falak-context/public', {
    preHandler: publicContext
  }, async (request) => {
    const context = requireFalakContext(request);
    return {
      tenant_id: context.tenantId,
      tenant_slug: context.tenantSlug,
      actor_id: context.actor?.id ?? null,
      actor_external_auth_id: context.actor?.externalAuthId ?? null,
      actor_source: context.actorResolution.source,
      actor_verified: context.actorResolution.isVerified,
      authenticated_identity: context.actorResolution.authenticatedIdentity,
      requested_actor_id: context.actorResolution.requestedActorId,
      gate_mode: context.routeGuard.mode,
      gate_access: context.routeGuard.access,
      gate_applies: context.routeGuard.applies,
      plane: context.plane
    };
  });

  app.get('/__test/falak-context/privileged', {
    preHandler: privilegedContext
  }, async (request) => {
    const context = requireFalakContext(request);
    return {
      tenant_id: context.tenantId,
      tenant_slug: context.tenantSlug,
      actor_id: context.actor?.id ?? null,
      actor_external_auth_id: context.actor?.externalAuthId ?? null,
      actor_source: context.actorResolution.source,
      actor_verified: context.actorResolution.isVerified,
      authenticated_identity: context.actorResolution.authenticatedIdentity,
      requested_actor_id: context.actorResolution.requestedActorId,
      gate_mode: context.routeGuard.mode,
      gate_access: context.routeGuard.access,
      gate_applies: context.routeGuard.applies,
      plane: context.plane
    };
  });

  return {
    ...fixture,
    app
  };
}

async function withGuardedHttpFixture<T>(
  envOverrides: FalakGuardEnv,
  execute: (fixture: Awaited<ReturnType<typeof buildHttpFixture>>) => Promise<T>
): Promise<T> {
  return withFalakGuardEnv(envOverrides, async () => {
    const fixture = await buildHttpFixture();
    try {
      return await execute(fixture);
    } finally {
      await fixture.app.close();
    }
  });
}

describe('Falak route guard config', () => {
  test('defaults to disabled, verified actor required, and no trusted header override', () => {
    const config = readFalakRuntimeConfig({
      NODE_ENV: 'production'
    } as NodeJS.ProcessEnv);

    expect(config).toMatchObject({
      routeGuardMode: 'disabled',
      mapRouteGuardMode: 'disabled',
      trustXActorId: false,
      requireVerifiedActor: true
    });
    expect(config.allowedTenantSlugs).toEqual([]);
    expect(config.allowedActorExternalAuthIds).toEqual([]);
  });

  test('never trusts x-actor-id in production even when requested', () => {
    const config = readFalakRuntimeConfig({
      NODE_ENV: 'production',
      FALAK_TRUST_X_ACTOR_ID: 'true'
    } as NodeJS.ProcessEnv);

    expect(config.trustXActorId).toBe(false);
  });

  test('map sandbox mode enables local Falak routes and trusted actor overrides by default', () => {
    const config = readFalakRuntimeConfig({
      NODE_ENV: 'development',
      FALAK_MODE: 'map_sandbox'
    } as NodeJS.ProcessEnv);

    expect(config).toMatchObject({
      mode: 'map_sandbox',
      isSandbox: true,
      routeGuardMode: 'enabled',
      mapRouteGuardMode: 'enabled',
      trustXActorIdRequested: true,
      trustXActorId: true,
      requireVerifiedActor: false,
      darkLaunch: false,
      mapDarkLaunch: false,
    });
  });

  test('admin_only denies access when allowlists are missing', () => {
    const decision = evaluateFalakRouteAccess(readFalakRuntimeConfig({
      NODE_ENV: 'production',
      FALAK_ROUTE_GUARD_MODE: 'admin_only'
    } as NodeJS.ProcessEnv), {
      access: 'privileged',
      tenantSlug: 'anu-beta',
      actor: {
        id: 'actor-1',
        tenantId: 'tenant-1',
        actorType: 'user',
        externalAuthId: 'anu-admin',
        email: 'admin@anu.beta',
        displayName: 'ANU Admin',
        roles: []
      },
      actorResolution: {
        source: 'verified_auth',
        isVerified: true,
        tokenAudience: 'control'
      }
    });

    expect(decision).toMatchObject({
      allowed: false,
      code: 'TENANT_NOT_ALLOWED'
    });
  });
});

describe('Falak startup guard', () => {
  test('fails production startup when x-actor-id trust is requested', () => {
    const messages = validateFalakStartup(readFalakRuntimeConfig({
      NODE_ENV: 'production',
      FALAK_ROUTE_GUARD_MODE: 'disabled',
      FALAK_TRUST_X_ACTOR_ID: 'true'
    } as NodeJS.ProcessEnv));

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: 'error',
        code: 'FALAK_TRUST_X_ACTOR_ID_FORBIDDEN'
      })
    ]));
  });

  test('warns loudly when Falak is fully enabled in production', () => {
    const messages = validateFalakStartup(readFalakRuntimeConfig({
      NODE_ENV: 'production',
      FALAK_ROUTE_GUARD_MODE: 'enabled'
    } as NodeJS.ProcessEnv));

    expect(messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: 'warn',
        code: 'FALAK_PRODUCTION_ENABLED'
      })
    ]));
  });
});

describe('Falak policy engine', () => {
  test('allows node creation for admin roles', async () => {
    const { service, adminContext } = buildFixture();

    const decision = await service.evaluatePolicy(adminContext, {
      resourceType: 'node',
      action: 'create',
      nodeType: 'event',
      resourceVisibility: 'public',
      sensitivityClass: 'normal',
      context: {}
    });

    expect(decision.decision).toBe('allow');
  });

  test('denies node deletion for viewer role', async () => {
    const { service, viewerContext, nodeIds } = buildFixture();

    const decision = await service.evaluatePolicy(viewerContext, {
      resourceType: 'node',
      action: 'delete',
      targetId: nodeIds.publicVenue,
      context: {}
    });

    expect(decision.decision).toBe('deny');
  });

  test('requires approval for restricted node updates', async () => {
    const { service, adminContext, nodeIds } = buildFixture();

    const decision = await service.evaluatePolicy(adminContext, {
      resourceType: 'node',
      action: 'update',
      targetId: nodeIds.restrictedStory,
      resourceVisibility: 'restricted',
      sensitivityClass: 'cultural-sensitive',
      nodeType: 'story',
      context: {}
    });

    expect(decision.decision).toBe('requires_approval');
    expect(decision.requiredApprovals).toBe(2);
  });

  test('ignores malformed approval_threshold values', async () => {
    const { service, repository, adminContext, nodeIds, tenantId } = buildFixture();

    const malformedPolicyId = randomUUID();
    repository.state.policies.set(malformedPolicyId, {
      id: malformedPolicyId,
      tenantId,
      name: 'node-update-restricted-malformed-threshold',
      resourceType: 'node',
      action: 'update',
      effect: 'requires_approval',
      priority: 4,
      enabled: true,
      conditions: {
        roles_any: ['tenant_admin'],
        resource_visibility_in: ['restricted'],
        approval_threshold: 'two',
        require_actor: true
      },
      description: null
    });

    const decision = await service.evaluatePolicy(adminContext, {
      resourceType: 'node',
      action: 'update',
      targetId: nodeIds.restrictedStory,
      resourceVisibility: 'restricted',
      sensitivityClass: 'cultural-sensitive',
      nodeType: 'story',
      context: {}
    });

    expect(decision.decision).toBe('requires_approval');
    expect(decision.requiredApprovals).toBe(2);
  });

  test('propagates the highest normalized approval threshold', async () => {
    const { service, repository, adminContext, nodeIds, tenantId } = buildFixture();

    const escalatedPolicyId = randomUUID();
    repository.state.policies.set(escalatedPolicyId, {
      id: escalatedPolicyId,
      tenantId,
      name: 'node-update-restricted-escalated-threshold',
      resourceType: 'node',
      action: 'update',
      effect: 'requires_approval',
      priority: 6,
      enabled: true,
      conditions: {
        roles_any: ['tenant_admin'],
        resource_visibility_in: ['restricted'],
        approval_threshold: 3,
        require_actor: true
      },
      description: null
    });

    const decision = await service.evaluatePolicy(adminContext, {
      resourceType: 'node',
      action: 'update',
      targetId: nodeIds.restrictedStory,
      resourceVisibility: 'restricted',
      sensitivityClass: 'cultural-sensitive',
      nodeType: 'story',
      context: {}
    });

    expect(decision.decision).toBe('requires_approval');
    expect(decision.requiredApprovals).toBe(3);
  });
});

describe('Falak service mutations', () => {
  test('creates a node and emits event + audit trail', async () => {
    const { service, repository, adminContext } = buildFixture();

    const execution = await service.createNode(adminContext, {
      type: 'event',
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'night-market',
      title: 'Night Market',
      summary: 'Open cultural night market',
      metadata: { channel: 'public-program' },
      geometry: { type: 'Point', coordinates: [149.121, -35.28] },
      timeStart: null,
      timeEnd: null
    });

    expect(execution.status).toBe('applied');
    if (execution.status === 'applied') {
      expect(execution.payload.result.status).toBe('draft');
      expect(execution.payload.result.slug).toBe('night-market');
    }
    expect(repository.state.events.size).toBe(1);
    expect(repository.state.auditLogs).toHaveLength(1);
  });

  test('detects optimistic concurrency conflicts on node update', async () => {
    const { service, adminContext, nodeIds } = buildFixture();

    await expect(service.updateNode(adminContext, nodeIds.publicVenue, {
      title: 'Changed title',
      expectedVersion: 99
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'VERSION_CONFLICT'
    });
  });

  test('viewer cannot mutate a restricted node', async () => {
    const { service, viewerContext, nodeIds } = buildFixture();

    await expect(service.updateNode(viewerContext, nodeIds.restrictedStory, {
      title: 'Unauthorized change',
      expectedVersion: 1
    })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NODE_NOT_FOUND'
    });
  });

  test('creates an edge between visible nodes', async () => {
    const { service, repository, curatorContext, nodeIds } = buildFixture();

    const execution = await service.createEdge(curatorContext, {
      fromNode: nodeIds.publicEvent,
      toNode: nodeIds.publicVenue,
      relation: 'occurs_at',
      weight: 1,
      validFrom: null,
      validTo: null,
      evidence: [],
      metadata: {}
    });

    expect(execution.status).toBe('applied');
    expect(repository.state.edges.size).toBe(1);
  });

  test('rejects cross-tenant edge creation even when target node is public', async () => {
    const { service, curatorContext, nodeIds } = buildFixture();

    await expect(service.createEdge(curatorContext, {
      fromNode: nodeIds.publicEvent,
      toNode: nodeIds.otherTenantPublicVenue,
      relation: 'occurs_at',
      weight: 1,
      validFrom: null,
      validTo: null,
      evidence: [],
      metadata: {}
    })).rejects.toMatchObject({
      statusCode: 404,
      code: 'TARGET_NODE_NOT_FOUND'
    });
  });

  test('requires_approval creates an approval automatically', async () => {
    const { service, repository, adminContext, nodeIds } = buildFixture();

    const execution = await service.updateNode(adminContext, nodeIds.restrictedStory, {
      title: 'Pending restricted update',
      expectedVersion: 1
    });

    expect(execution.status).toBe('blocked');
    if (execution.status !== 'blocked') {
      throw new Error('Expected restricted update to require approval');
    }

    expect(execution.decision.decision).toBe('requires_approval');
    expect(execution.decision.requiredApprovals).toBe(2);
    expect(execution.decision.approvalId).toBeTruthy();
    expect(repository.state.approvals.size).toBe(1);

    const approval = [...repository.state.approvals.values()][0]!;
    expect(approval.id).toBe(execution.decision.approvalId);
    expect(approval.targetId).toBe(nodeIds.restrictedStory);
    expect(approval.requiredApprovals).toBe(2);

    const blockedEvent = [...repository.state.events.values()][0]!;
    expect(blockedEvent.payload).toMatchObject({
      decision: 'requires_approval',
      approvalId: execution.decision.approvalId,
      requiredApprovals: 2
    });
  });

  test('approval voting resolves correctly at threshold', async () => {
    const { service, adminContext, governorContext, repository, nodeIds } = buildFixture();

    const blockedExecution = await service.updateNode(adminContext, nodeIds.restrictedStory, {
      title: 'Pending restricted update',
      expectedVersion: 1
    });

    expect(blockedExecution.status).toBe('blocked');
    if (blockedExecution.status !== 'blocked' || !blockedExecution.decision.approvalId) {
      throw new Error('Expected restricted update to create an approval');
    }

    const approvalId = blockedExecution.decision.approvalId;
    const firstVote = await service.voteApproval(governorContext, approvalId, {
      vote: 'approve',
      note: 'ready for governance review'
    });
    expect(firstVote.status).toBe('applied');
    if (firstVote.status === 'applied') {
      expect(firstVote.payload.result.status).toBe('pending');
      expect(firstVote.payload.result.currentApprovals).toBe(1);
    }

    const secondVote = await service.voteApproval(adminContext, approvalId, {
      vote: 'approve',
      note: 'final approval'
    });
    expect(secondVote.status).toBe('applied');
    if (secondVote.status === 'applied') {
      expect(secondVote.payload.result.status).toBe('approved');
      expect(secondVote.payload.result.currentApprovals).toBe(2);
    }

    expect(repository.state.approvalVotes).toHaveLength(2);
  });

  test('federation link rejects a non-public cross-tenant target', async () => {
    const { service, adminContext, nodeIds } = buildFixture();

    await expect(service.createFederationLink(adminContext, {
      sourceNodeId: nodeIds.publicEvent,
      targetNodeId: nodeIds.otherTenantRestrictedStory,
      relation: 'federates_with',
      contract: {}
    })).rejects.toMatchObject({
      statusCode: 404,
      code: 'TARGET_NODE_NOT_FOUND'
    });
  });
});

describe('Falak queries and visibility', () => {
  test('rejects cross-tenant node reads even for public nodes', async () => {
    const { service, adminContext, nodeIds } = buildFixture();

    await expect(service.getNode(adminContext, nodeIds.otherTenantPublicVenue)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NODE_NOT_FOUND'
    });
  });

  test('returns nearby public nodes ordered by distance', async () => {
    const { service, publicContext } = buildFixture();

    const nodes = await service.nearbyNodes(publicContext, {
      lat: -35.279,
      lng: 149.1202,
      radiusMeters: 1000
    });

    expect(nodes.length).toBeGreaterThanOrEqual(2);
    expect(nodes[0]!.distanceMeters).toBeLessThanOrEqual(nodes[1]!.distanceMeters ?? Number.MAX_SAFE_INTEGER);
    expect(nodes.every((node) => node.visibility === 'public')).toBe(true);
  });

  test('hides restricted nodes from public visibility and shows them to admins', async () => {
    const { service, publicContext, adminContext } = buildFixture();

    const publicNodes = await service.listNodes(publicContext, {
      limit: 20
    });
    const adminNodes = await service.listNodes(adminContext, {
      limit: 20
    });

    expect(publicNodes.items.some((node) => node.visibility === 'restricted')).toBe(false);
    expect(adminNodes.items.some((node) => node.visibility === 'restricted')).toBe(true);
    expect(adminNodes.items.some((node) => node.visibility === 'tenant')).toBe(true);
  });
});

describe('Falak ANU feature slice', () => {
  async function createEventPoolScenario() {
    const fixture = buildFixture();
    const created = await fixture.eventWorkflowService.createEvent(fixture.adminContext, {
      visibility: 'public',
      sensitivityClass: 'normal',
      slug: 'anu-night-of-weaving',
      title: 'ANU Night of Weaving',
      summary: 'First governed event workflow',
      metadata: { program: 'anu-slice' },
      geometry: { type: 'Point', coordinates: [149.1206, -35.2794] },
      timeStart: '2026-05-10T08:00:00.000Z',
      timeEnd: '2026-05-10T12:00:00.000Z',
      venueNodeId: fixture.nodeIds.publicVenue,
      communityNodeId: fixture.nodeIds.community,
      campaignNodeId: fixture.nodeIds.campaign,
      poolNodeId: fixture.nodeIds.liquidityPool
    });

    return {
      ...fixture,
      created
    };
  }

  test('tenant_admin can create event linked to venue', async () => {
    const { created } = await createEventPoolScenario();

    expect(created.event.type).toBe('event');
    expect(created.event.status).toBe('active');
    expect(created.links.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining(['occurs_at', 'hosts', 'benefits', 'tied_to_pool'])
    );
  });

  test('public cannot create privileged event', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext, nodeIds }) => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/falak/events',
        headers: {
          'x-tenant-id': adminContext.tenantId
        },
        payload: {
          title: 'Unauthorized event',
          venue_id: nodeIds.publicVenue
        }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VERIFIED_ACTOR_REQUIRED'
        }
      });
    });
  });

  test('contribution increases event and pool impact totals', async () => {
    const { contributionWorkflowService, impactQueryService, publicContext, adminContext, created, nodeIds } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 120,
      currency: 'AUD',
      note: 'Public contribution',
      reference: 'gift-001',
      contributedAt: '2026-05-10T09:00:00.000Z'
    });

    const balance = await impactQueryService.getPoolBalance(adminContext, nodeIds.liquidityPool);
    const impact = await impactQueryService.getEventImpact(adminContext, created.event.id);

    expect(balance.balances).toContainEqual({ currency: 'AUD', amount: 120 });
    expect(impact.totalContributions).toContainEqual({ currency: 'AUD', amount: 120 });
    expect(impact.contributionCount).toBe(1);
  });

  test('allocation above threshold auto-creates approval', async () => {
    const { contributionWorkflowService, allocationWorkflowService, adminContext, publicContext, created, nodeIds } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: 'Seed contribution',
      reference: 'gift-002',
      contributedAt: null
    });

    const workflow = await allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      targetNodeId: nodeIds.campaign,
      amount: 600,
      currency: 'AUD',
      rationale: 'Fund the stage build'
    });

    expect(workflow.approval?.requiredApprovals).toBe(2);
    expect(workflow.proposal.status).toBe('pending');
    expect(workflow.executed).toBe(false);
    expect(workflow.ledgerEntries).toHaveLength(0);
  });

  test('approval voting at threshold executes allocation exactly once', async () => {
    const {
      contributionWorkflowService,
      allocationWorkflowService,
      adminContext,
      governorContext,
      publicContext,
      created,
      nodeIds,
      repository
    } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: 'Seed contribution',
      reference: 'gift-003',
      contributedAt: null
    });

    const workflow = await allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      targetNodeId: nodeIds.campaign,
      amount: 600,
      currency: 'AUD',
      rationale: 'Fund the stage build'
    });

    if (!workflow.approval) {
      throw new Error('Expected approval to be created');
    }

    const firstVote = await allocationWorkflowService.voteApproval(governorContext, workflow.approval.id, {
      vote: 'approve',
      note: 'Governor approval'
    });
    const secondVote = await allocationWorkflowService.voteApproval(adminContext, workflow.approval.id, {
      vote: 'approve',
      note: 'Admin approval'
    });

    expect(firstVote.approval.status).toBe('pending');
    expect(secondVote.approval.status).toBe('approved');
    expect(secondVote.executed).toBe(true);
    expect(secondVote.proposal?.status).toBe('executed');
    expect(repository.state.ledgerEntries.size).toBe(3);
  });

  test('executed allocation writes ledger entries', async () => {
    const {
      contributionWorkflowService,
      allocationWorkflowService,
      adminContext,
      governorContext,
      publicContext,
      created,
      nodeIds,
      repository
    } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: null,
      reference: null,
      contributedAt: null
    });

    const proposal = await allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      targetNodeId: nodeIds.campaign,
      amount: 600,
      currency: 'AUD',
      rationale: 'Fund the stage build'
    });
    if (!proposal.approval) {
      throw new Error('Expected approval to be created');
    }

    await allocationWorkflowService.voteApproval(governorContext, proposal.approval.id, { vote: 'approve', note: null });
    const result = await allocationWorkflowService.voteApproval(adminContext, proposal.approval.id, { vote: 'approve', note: null });

    const entries = [...repository.state.ledgerEntries.values()];
    expect(result.ledgerEntries).toHaveLength(2);
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        referenceType: 'pool',
        amount: -600,
        currency: 'AUD'
      }),
      expect.objectContaining({
        referenceType: 'node',
        referenceId: nodeIds.campaign,
        amount: 600,
        currency: 'AUD'
      })
    ]));
  });

  test('public event impact view excludes restricted linked nodes', async () => {
    const { contributionWorkflowService, impactQueryService, adminContext, publicContext, created, nodeIds } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 80,
      currency: 'AUD',
      note: null,
      reference: null,
      contributedAt: null
    });

    const publicImpact = await impactQueryService.getEventImpact(publicContext, created.event.id);
    const adminImpact = await impactQueryService.getEventImpact(adminContext, created.event.id);

    expect(publicImpact.graph.nodes.some((node) => node.id === nodeIds.community)).toBe(false);
    expect(adminImpact.graph.nodes.some((node) => node.id === nodeIds.community)).toBe(true);
  });

  test('cross-tenant allocation target is denied', async () => {
    const { contributionWorkflowService, allocationWorkflowService, adminContext, publicContext, created, nodeIds } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: null,
      reference: null,
      contributedAt: null
    });

    await expect(allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      targetNodeId: nodeIds.otherTenantCampaign,
      amount: 200,
      currency: 'AUD',
      rationale: 'Cross tenant transfer'
    })).rejects.toMatchObject({
      statusCode: 404
    });
  });

  test('repeated approval vote or duplicate execution attempt does not double-spend', async () => {
    const {
      contributionWorkflowService,
      allocationWorkflowService,
      adminContext,
      governorContext,
      publicContext,
      created,
      nodeIds,
      repository
    } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: null,
      reference: null,
      contributedAt: null
    });

    const proposal = await allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      targetNodeId: nodeIds.campaign,
      amount: 600,
      currency: 'AUD',
      rationale: 'Fund the stage build'
    });
    if (!proposal.approval) {
      throw new Error('Expected approval to be created');
    }

    await allocationWorkflowService.voteApproval(governorContext, proposal.approval.id, { vote: 'approve', note: null });
    await allocationWorkflowService.voteApproval(adminContext, proposal.approval.id, { vote: 'approve', note: null });
    const ledgerCountAfterExecution = repository.state.ledgerEntries.size;

    await expect(allocationWorkflowService.voteApproval(adminContext, proposal.approval.id, {
      vote: 'approve',
      note: 'duplicate'
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'APPROVAL_RESOLVED'
    });

    const duplicateExecution = await allocationWorkflowService.executeApprovedAllocation(adminContext, proposal.proposal.id);
    expect(duplicateExecution.executed).toBe(false);
    expect(repository.state.ledgerEntries.size).toBe(ledgerCountAfterExecution);
  });

  test('event impact query returns coherent graph and summary', async () => {
    const {
      contributionWorkflowService,
      allocationWorkflowService,
      impactQueryService,
      adminContext,
      governorContext,
      publicContext,
      created,
      nodeIds
    } = await createEventPoolScenario();

    await contributionWorkflowService.recordContribution(publicContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      amount: 900,
      currency: 'AUD',
      note: 'Public gift',
      reference: 'gift-004',
      contributedAt: null
    });

    const proposal = await allocationWorkflowService.proposeAllocation(adminContext, {
      eventNodeId: created.event.id,
      poolNodeId: nodeIds.liquidityPool,
      targetNodeId: nodeIds.campaign,
      amount: 600,
      currency: 'AUD',
      rationale: 'Fund the stage build'
    });
    if (!proposal.approval) {
      throw new Error('Expected approval to be created');
    }

    await allocationWorkflowService.voteApproval(governorContext, proposal.approval.id, { vote: 'approve', note: null });
    await allocationWorkflowService.voteApproval(adminContext, proposal.approval.id, { vote: 'approve', note: null });

    const impact = await impactQueryService.getEventImpact(adminContext, created.event.id);

    expect(impact.event.id).toBe(created.event.id);
    expect(impact.venue?.id).toBe(nodeIds.publicVenue);
    expect(impact.pool?.id).toBe(nodeIds.liquidityPool);
    expect(impact.graph.edges.map((edge) => edge.relation)).toEqual(expect.arrayContaining(['occurs_at', 'hosts', 'benefits', 'tied_to_pool']));
    expect(impact.totalContributions).toContainEqual({ currency: 'AUD', amount: 900 });
    expect(impact.proposedAllocations).toHaveLength(1);
    expect(impact.approvedAllocations).toHaveLength(1);
    expect(impact.executedTotals).toContainEqual({ currency: 'AUD', amount: 600 });
    expect(impact.poolBalance?.balances).toContainEqual({ currency: 'AUD', amount: 300 });
    expect(impact.eventStream.some((event) => event.eventType === 'allocation.executed')).toBe(true);
  });
});

describe('Falak HTTP access planes', () => {
  test('keeps authenticated callers on the public plane for public routes', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext, nodeIds }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/nodes',
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as { items: Array<{ id: string; visibility: string }> };
      expect(body.items.every((node) => node.visibility === 'public')).toBe(true);
      expect(body.items.some((node) => node.id === nodeIds.organisation)).toBe(false);
      expect(body.items.some((node) => node.id === nodeIds.restrictedStory)).toBe(false);
    });
  });

  test('does not expose restricted entities through public node lookup', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext, nodeIds }) => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/nodes/${nodeIds.restrictedStory}`,
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: {
          code: 'NODE_NOT_FOUND'
        }
      });
    });
  });

  test('enabled mode still rejects privileged requests without verified actor when strict mode is on', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: {
          'x-tenant-id': adminContext.tenantId
        }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VERIFIED_ACTOR_REQUIRED'
        }
      });
    });
  });

  test('returns approval_id in blocked mutation responses', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext, nodeIds }) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/nodes/${nodeIds.restrictedStory}`,
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin'),
        payload: {
          title: 'Pending restricted update',
          expected_version: 1
        }
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: {
          code: 'APPROVAL_REQUIRED'
        },
        decision: {
          decision: 'requires_approval',
          approval_id: expect.any(String),
          required_approvals: 2
        }
      });
    });
  });
});

describe('Falak route gating and actor resolution', () => {
  test('dark launch still exposes Falak health and readiness endpoints', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled'
    }, async ({ app }) => {
      const health = await app.inject({
        method: 'GET',
        url: '/v1/falak/health'
      });
      const readiness = await app.inject({
        method: 'GET',
        url: '/v1/falak/readiness'
      });

      expect(health.statusCode).toBe(200);
      expect(health.json()).toMatchObject({
        runtime: {
          route_guard_mode: 'disabled',
          dark_launch: true,
          map_route_guard_mode: 'disabled',
          map_dark_launch: true
        }
      });
      expect(readiness.statusCode).toBe(503);
    });
  });

  test('disabled mode blocks Falak routes', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled'
    }, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/nodes',
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: {
          code: 'FALAK_DISABLED'
        }
      });
    });
  });

  test('disabled mode short-circuits before tenant resolution', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'disabled'
    }, async ({ app }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/nodes'
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: {
          code: 'FALAK_DISABLED'
        }
      });
    });
  });

  test('admin_only mode allows only allowlisted actors', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'admin_only',
      FALAK_ALLOWED_TENANT_SLUGS: 'anu-beta',
      FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS: 'anu-admin'
    }, async ({ app, adminContext }) => {
      const allowed = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });
      const denied = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: bearerHeaders(adminContext.tenantId, 'anu-governor')
      });

      expect(allowed.statusCode).toBe(200);
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({
        error: {
          code: 'ACTOR_NOT_ALLOWED'
        }
      });
    });
  });

  test('tenant_allowlist mode blocks disallowed tenants', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'tenant_allowlist',
      FALAK_ALLOWED_TENANT_SLUGS: 'anu-beta'
    }, async ({ app, adminContext, otherTenantId }) => {
      const allowed = await app.inject({
        method: 'GET',
        url: '/v1/nodes',
        headers: {
          'x-tenant-id': adminContext.tenantId
        }
      });
      const denied = await app.inject({
        method: 'GET',
        url: '/v1/nodes',
        headers: {
          'x-tenant-id': otherTenantId
        }
      });

      expect(allowed.statusCode).toBe(200);
      expect(denied.statusCode).toBe(403);
      expect(denied.json()).toMatchObject({
        error: {
          code: 'TENANT_NOT_ALLOWED'
        }
      });
    });
  });

  test('x-actor-id is ignored when FALAK_TRUST_X_ACTOR_ID=false', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'enabled',
      FALAK_TRUST_X_ACTOR_ID: 'false',
      FALAK_REQUIRE_VERIFIED_ACTOR: 'true'
    }, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: overrideHeaders(adminContext.tenantId, adminContext.actor?.id ?? '')
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: {
          code: 'VERIFIED_ACTOR_REQUIRED'
        }
      });
    });
  });

  test('local/internal override works only when explicitly enabled', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'enabled',
      FALAK_TRUST_X_ACTOR_ID: 'true',
      FALAK_REQUIRE_VERIFIED_ACTOR: 'false'
    }, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/__test/falak-context/privileged',
        headers: overrideHeaders(adminContext.tenantId, adminContext.actor?.id ?? '')
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        actor_id: adminContext.actor?.id,
        actor_source: 'trusted_header_override',
        actor_verified: false,
        requested_actor_id: adminContext.actor?.id
      });
    });
  });

  test('public Falak route behavior matches tenant allowlist mode', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'tenant_allowlist',
      FALAK_ALLOWED_TENANT_SLUGS: 'anu-beta'
    }, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/nodes',
        headers: {
          'x-tenant-id': adminContext.tenantId
        }
      });

      expect(response.statusCode).toBe(200);
    });
  });

  test('verified actor context is attached correctly when resolved', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/__test/falak-context/privileged',
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        actor_id: adminContext.actor?.id,
        actor_external_auth_id: 'anu-admin',
        actor_source: 'verified_auth',
        actor_verified: true,
        authenticated_identity: 'anu-admin',
        gate_mode: 'enabled',
        gate_access: 'privileged',
        plane: 'privileged'
      });
    });
  });

  test('actor lookup by authenticated external auth id works', async () => {
    await withGuardedHttpFixture({}, async ({ app, adminContext }) => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/events',
        headers: bearerHeaders(adminContext.tenantId, 'anu-admin')
      });

      expect(response.statusCode).toBe(200);
    });
  });

  test('no regression to existing local verification mode when explicitly configured for it', async () => {
    await withGuardedHttpFixture({
      FALAK_ROUTE_GUARD_MODE: 'enabled',
      FALAK_TRUST_X_ACTOR_ID: 'true',
      FALAK_REQUIRE_VERIFIED_ACTOR: 'false'
    }, async ({ app, adminContext, nodeIds }) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/nodes/${nodeIds.restrictedStory}`,
        headers: overrideHeaders(adminContext.tenantId, adminContext.actor?.id ?? ''),
        payload: {
          title: 'Pending restricted update from local override',
          expected_version: 1
        }
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        error: {
          code: 'APPROVAL_REQUIRED'
        },
        decision: {
          approval_id: expect.any(String)
        }
      });
    });
  });
});
