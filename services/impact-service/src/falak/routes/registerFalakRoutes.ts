import { FastifyInstance, FastifyReply } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  approvalPathParamsSchema,
  approvalSchema,
  approvalVoteBodySchema,
  approvalVoteWorkflowSchema,
  allocationProposalWorkflowSchema,
  createApprovalBodySchema,
  createAllocationProposalBodySchema,
  createEdgeBodySchema,
  createEventWorkflowBodySchema,
  createNodeBodySchema,
  deleteNodeQuerySchema,
  edgeSchema,
  errorResponseSchema,
  eventImpactPathParamsSchema,
  eventImpactSchema,
  eventSchema,
  eventWorkflowResponseSchema,
  falakOperationalHealthSchema,
  federationLinkBodySchema,
  graphQuerySchema,
  graphSchema,
  healthResponseSchema,
  ledgerEntrySchema,
  listEventsQuerySchema,
  listLedgerQuerySchema,
  listNodesQuerySchema,
  nearbyQuerySchema,
  nodePathParamsSchema,
  nodeSchema,
  nodesListResponseSchema,
  policyDecisionResponseSchema,
  policyEvaluateBodySchema,
  poolBalanceSchema,
  poolPathParamsSchema,
  recordContributionBodySchema,
  contributionSchema,
  updateNodeBodySchema
} from '../domain/schemas';
import { GeometryValue, JsonObject, JsonValue, PolicyEvaluationResult } from '../domain/types';
import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';
import { FalakHealthService } from '../health/falakHealthService';
import { buildRequestContextHook, requireFalakContext } from '../plugins/requestContext';
import { FalakRepository } from '../domain/types';
import { FalakService } from '../services/falakService';
import { AllocationWorkflowService } from '../services/allocationWorkflowService';
import { ContributionWorkflowService } from '../services/contributionWorkflowService';
import { EventWorkflowService } from '../services/eventWorkflowService';
import { ImpactQueryService } from '../services/impactQueryService';
import {
  presentAllocationProposalWorkflow,
  presentApproval,
  presentApprovalVoteWorkflow,
  presentContribution,
  presentEdge,
  presentEventImpact,
  presentEvent,
  presentEventWorkflow,
  presentGraph,
  presentLedgerEntry,
  presentNode,
  presentNodesList,
  presentPoolBalance,
  presentPolicyDecision
} from '../utils/presenters';

const blockedMutationSchema = errorResponseSchema.extend({
  decision: policyDecisionResponseSchema
});

function asJsonObject(value: unknown): JsonObject {
  return value as JsonObject;
}

function asGeometry(value: unknown): GeometryValue | null {
  return (value ?? null) as GeometryValue | null;
}

function asJsonArray(value: unknown[]): JsonValue[] {
  return value as JsonValue[];
}

function sendBlocked(reply: FastifyReply, traceId: string, decision: PolicyEvaluationResult): FastifyReply {
  const code = decision.decision === 'requires_approval' ? 'APPROVAL_REQUIRED' : 'POLICY_DENIED';
  const message =
    decision.decision === 'requires_approval'
      ? 'Approval required before this mutation can proceed'
      : 'Mutation denied by Falak policy';

  return reply.status(403).send({
    error: {
      code,
      message,
      trace_id: traceId
    },
    decision: presentPolicyDecision(decision)
  });
}

export async function registerFalakRoutes(
  app: FastifyInstance,
  service: FalakService,
  repository: FalakRepository,
  runtime: {
    hasDatabase: boolean;
    hasRedis: boolean;
    runtimeConfig: FalakRuntimeConfig;
    falakHealthService?: FalakHealthService;
  },
  workflows: {
    eventWorkflowService: EventWorkflowService;
    contributionWorkflowService: ContributionWorkflowService;
    allocationWorkflowService: AllocationWorkflowService;
    impactQueryService: ImpactQueryService;
  }
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  const publicContext = buildRequestContextHook(repository, {
    privileged: false,
    routeGuardMode: runtime.runtimeConfig.routeGuardMode,
    runtimeConfig: runtime.runtimeConfig
  });
  const privilegedContext = buildRequestContextHook(repository, {
    privileged: true,
    routeGuardMode: runtime.runtimeConfig.routeGuardMode,
    runtimeConfig: runtime.runtimeConfig
  });

  typed.get('/v1/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      response: {
        200: healthResponseSchema
      }
    }
  }, async () => ({
    status: runtime.hasDatabase ? ('ok' as const) : ('degraded' as const),
    service: 'impact-service',
    protocol: 'Falak Protocol',
    version: '0.1.0',
    dependencies: {
      database: runtime.hasDatabase ? ('configured' as const) : ('todo' as const),
      redis: runtime.hasRedis ? ('configured' as const) : ('todo' as const)
    }
  }));

  typed.get('/v1/falak/health', {
    schema: {
      tags: ['Health'],
      summary: 'Falak operational health',
      response: {
        200: falakOperationalHealthSchema
      }
    }
  }, async (_request, reply) => {
    if (!runtime.falakHealthService) {
      return reply.status(200).send({
        status: runtime.hasDatabase ? 'degraded' : 'not_ready',
        service: 'impact-service',
        protocol: 'Falak Protocol',
        runtime: {
          route_guard_mode: runtime.runtimeConfig.routeGuardMode,
          dark_launch: runtime.runtimeConfig.darkLaunch,
          map_route_guard_mode: runtime.runtimeConfig.mapRouteGuardMode,
          map_dark_launch: runtime.runtimeConfig.mapDarkLaunch,
          require_verified_actor: runtime.runtimeConfig.requireVerifiedActor
        },
        checks: {
          database: runtime.hasDatabase ? 'ok' : 'error',
          postgis: 'skipped',
          prisma: runtime.hasDatabase ? 'ok' : 'error',
          falak_schema: 'skipped',
          migrations: 'skipped'
        },
        details: {
          database_name: null,
          migration_failures: null,
          postgis_version: null
        }
      });
    }

    const report = await runtime.falakHealthService.health();
    return {
      status: report.status,
      service: 'impact-service',
      protocol: 'Falak Protocol',
      runtime: {
        route_guard_mode: report.runtime.routeGuardMode,
        dark_launch: report.runtime.darkLaunch,
        map_route_guard_mode: report.runtime.mapRouteGuardMode,
        map_dark_launch: report.runtime.mapDarkLaunch,
        require_verified_actor: report.runtime.requireVerifiedActor
      },
      checks: {
        database: report.checks.database,
        postgis: report.checks.postgis,
        prisma: report.checks.prisma,
        falak_schema: report.checks.falakSchema,
        migrations: report.checks.migrations
      },
      details: {
        database_name: report.details.databaseName,
        migration_failures: report.details.migrationFailures,
        postgis_version: report.details.postgisVersion
      }
    };
  });

  typed.get('/v1/falak/readiness', {
    schema: {
      tags: ['Health'],
      summary: 'Falak readiness',
      response: {
        200: falakOperationalHealthSchema,
        503: falakOperationalHealthSchema
      }
    }
  }, async (_request, reply) => {
    if (!runtime.falakHealthService) {
      const status = runtime.hasDatabase ? 'degraded' : 'not_ready';
      return reply.status(503).send({
        status,
        service: 'impact-service',
        protocol: 'Falak Protocol',
        runtime: {
          route_guard_mode: runtime.runtimeConfig.routeGuardMode,
          dark_launch: runtime.runtimeConfig.darkLaunch,
          map_route_guard_mode: runtime.runtimeConfig.mapRouteGuardMode,
          map_dark_launch: runtime.runtimeConfig.mapDarkLaunch,
          require_verified_actor: runtime.runtimeConfig.requireVerifiedActor
        },
        checks: {
          database: runtime.hasDatabase ? 'ok' : 'error',
          postgis: 'skipped',
          prisma: runtime.hasDatabase ? 'ok' : 'error',
          falak_schema: 'skipped',
          migrations: 'skipped'
        },
        details: {
          database_name: null,
          migration_failures: null,
          postgis_version: null
        }
      });
    }

    const report = await runtime.falakHealthService.readiness();
    return reply.status(report.status === 'ok' ? 200 : 503).send({
      status: report.status,
      service: 'impact-service',
      protocol: 'Falak Protocol',
      runtime: {
        route_guard_mode: report.runtime.routeGuardMode,
        dark_launch: report.runtime.darkLaunch,
        map_route_guard_mode: report.runtime.mapRouteGuardMode,
        map_dark_launch: report.runtime.mapDarkLaunch,
        require_verified_actor: report.runtime.requireVerifiedActor
      },
      checks: {
        database: report.checks.database,
        postgis: report.checks.postgis,
        prisma: report.checks.prisma,
        falak_schema: report.checks.falakSchema,
        migrations: report.checks.migrations
      },
      details: {
        database_name: report.details.databaseName,
        migration_failures: report.details.migrationFailures,
        postgis_version: report.details.postgisVersion
      }
    });
  });

  await typed.register(async (publicInstance) => {
    const publicApi = publicInstance.withTypeProvider<ZodTypeProvider>();
    publicApi.addHook('preHandler', publicContext);

    publicApi.get('/nodes', {
      schema: {
        tags: ['Nodes'],
        summary: 'List nodes',
        querystring: listNodesQuerySchema,
        response: {
          200: nodesListResponseSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const query = request.query;
      const result = await service.listNodes(context, {
        type: query.type,
        status: query.status,
        visibility: query.visibility,
        query: query.q,
        limit: query.limit,
        cursor: query.cursor
      });

      return presentNodesList(result);
    });

    publicApi.get('/nodes/:nodeId', {
      schema: {
        tags: ['Nodes'],
        summary: 'Get node',
        params: nodePathParamsSchema,
        response: {
          200: nodeSchema,
          404: errorResponseSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const node = await service.getNode(context, request.params.nodeId);
      return presentNode(node);
    });

    publicApi.get('/graph/:nodeId', {
      schema: {
        tags: ['Graph'],
        summary: 'Get graph neighborhood',
        params: nodePathParamsSchema,
        querystring: graphQuerySchema,
        response: {
          200: graphSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const graph = await service.getGraph(context, request.params.nodeId, request.query.depth);
      return presentGraph(graph);
    });

    publicApi.get('/spatial/nearby', {
      schema: {
        tags: ['Spatial'],
        summary: 'Find nearby nodes',
        querystring: nearbyQuerySchema,
        response: {
          200: nodeSchema.array()
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const nodes = await service.nearbyNodes(context, {
        lat: request.query.lat,
        lng: request.query.lng,
        radiusMeters: request.query.radius_meters,
        type: request.query.type
      });

      return nodes.map(presentNode);
    });

    publicApi.post('/falak/contributions', {
      schema: {
        tags: ['Contributions'],
        summary: 'Record a Falak contribution',
        body: recordContributionBodySchema,
        response: {
          201: contributionSchema,
          403: errorResponseSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const contribution = await workflows.contributionWorkflowService.recordContribution(context, {
        eventNodeId: request.body.event_id,
        poolNodeId: request.body.pool_id,
        amount: request.body.amount,
        currency: request.body.currency,
        note: request.body.note ?? null,
        reference: request.body.reference ?? null,
        contributedAt: request.body.contributed_at ?? null
      });

      return reply.status(201).send(presentContribution(contribution));
    });

    publicApi.get('/falak/events/:eventId/impact', {
      schema: {
        tags: ['Events'],
        summary: 'Get event impact view',
        params: eventImpactPathParamsSchema,
        response: {
          200: eventImpactSchema,
          404: errorResponseSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const impact = await workflows.impactQueryService.getEventImpact(context, request.params.eventId);
      return presentEventImpact(impact);
    });

    publicApi.get('/falak/pools/:poolId/balance', {
      schema: {
        tags: ['Pools'],
        summary: 'Get liquidity pool balance',
        params: poolPathParamsSchema,
        response: {
          200: poolBalanceSchema,
          404: errorResponseSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const balance = await workflows.impactQueryService.getPoolBalance(context, request.params.poolId);
      return presentPoolBalance(balance);
    });
  }, { prefix: '/v1' });

  await typed.register(async (privilegedInstance) => {
    const privilegedApi = privilegedInstance.withTypeProvider<ZodTypeProvider>();
    privilegedApi.addHook('preHandler', privilegedContext);

    privilegedApi.post('/nodes', {
      schema: {
        tags: ['Nodes'],
        summary: 'Create node',
        security: [{ bearerAuth: [] }],
        body: createNodeBodySchema,
        response: {
          201: nodeSchema,
          403: blockedMutationSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.createNode(context, {
        type: request.body.type,
        visibility: request.body.visibility,
        sensitivityClass: request.body.sensitivity_class,
        slug: request.body.slug ?? null,
        title: request.body.title ?? null,
        summary: request.body.summary ?? null,
        metadata: asJsonObject(request.body.metadata),
        geometry: asGeometry(request.body.geometry),
        timeStart: request.body.time_start ?? null,
        timeEnd: request.body.time_end ?? null
      });

      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return reply.status(201).send(presentNode(execution.payload.result));
    });

    privilegedApi.post('/falak/events', {
      schema: {
        tags: ['Events'],
        summary: 'Create a Falak cultural event',
        security: [{ bearerAuth: [] }],
        body: createEventWorkflowBodySchema,
        response: {
          201: eventWorkflowResponseSchema,
          403: errorResponseSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const created = await workflows.eventWorkflowService.createEvent(context, {
        visibility: request.body.visibility,
        sensitivityClass: request.body.sensitivity_class,
        slug: request.body.slug ?? null,
        title: request.body.title,
        summary: request.body.summary ?? null,
        metadata: asJsonObject(request.body.metadata),
        geometry: asGeometry(request.body.geometry),
        timeStart: request.body.time_start ?? null,
        timeEnd: request.body.time_end ?? null,
        venueNodeId: request.body.venue_id,
        communityNodeId: request.body.community_id ?? null,
        campaignNodeId: request.body.campaign_id ?? null,
        poolNodeId: request.body.pool_id ?? null
      });

      return reply.status(201).send(presentEventWorkflow(created));
    });

    privilegedApi.patch('/nodes/:nodeId', {
      schema: {
        tags: ['Nodes'],
        summary: 'Update node',
        security: [{ bearerAuth: [] }],
        params: nodePathParamsSchema,
        body: updateNodeBodySchema,
        response: {
          200: nodeSchema,
          403: blockedMutationSchema,
          409: errorResponseSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.updateNode(context, request.params.nodeId, {
        status: request.body.status,
        visibility: request.body.visibility,
        sensitivityClass: request.body.sensitivity_class,
        slug: request.body.slug,
        title: request.body.title,
        summary: request.body.summary,
        metadata: request.body.metadata ? asJsonObject(request.body.metadata) : undefined,
        geometry: request.body.geometry === undefined ? undefined : asGeometry(request.body.geometry),
        timeStart: request.body.time_start,
        timeEnd: request.body.time_end,
        expectedVersion: request.body.expected_version
      });

      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return presentNode(execution.payload.result);
    });

    privilegedApi.delete('/nodes/:nodeId', {
      schema: {
        tags: ['Nodes'],
        summary: 'Soft delete node',
        security: [{ bearerAuth: [] }],
        params: nodePathParamsSchema,
        querystring: deleteNodeQuerySchema,
        response: {
          204: z.null(),
          403: blockedMutationSchema,
          409: errorResponseSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.deleteNode(context, request.params.nodeId, request.query.expected_version);
      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return reply.status(204).send(null);
    });

    privilegedApi.post('/edges', {
      schema: {
        tags: ['Edges'],
        summary: 'Create edge',
        security: [{ bearerAuth: [] }],
        body: createEdgeBodySchema,
        response: {
          201: edgeSchema,
          403: blockedMutationSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.createEdge(context, {
        fromNode: request.body.from_node,
        toNode: request.body.to_node,
        relation: request.body.relation,
        weight: request.body.weight,
        validFrom: request.body.valid_from ?? null,
        validTo: request.body.valid_to ?? null,
        evidence: asJsonArray(request.body.evidence),
        metadata: asJsonObject(request.body.metadata)
      });

      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return reply.status(201).send(presentEdge(execution.payload.result));
    });

    privilegedApi.post('/policies/evaluate', {
      schema: {
        tags: ['Policies'],
        summary: 'Evaluate policy without mutation',
        security: [{ bearerAuth: [] }],
        body: policyEvaluateBodySchema,
        response: {
          200: policyDecisionResponseSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const decision = await service.evaluatePolicy(context, {
        resourceType: request.body.resource_type,
        action: request.body.action,
        targetId: request.body.target_id,
        context: asJsonObject(request.body.context)
      });

      return presentPolicyDecision(decision);
    });

    privilegedApi.post('/approvals', {
      schema: {
        tags: ['Approvals'],
        summary: 'Create approval request',
        security: [{ bearerAuth: [] }],
        body: createApprovalBodySchema,
        response: {
          201: approvalSchema,
          403: blockedMutationSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.createApproval(context, {
        requestType: request.body.request_type,
        targetType: request.body.target_type,
        targetId: request.body.target_id,
        requiredApprovals: request.body.required_approvals,
        context: asJsonObject(request.body.context)
      });

      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return reply.status(201).send(presentApproval(execution.payload.result));
    });

    privilegedApi.post('/approvals/:approvalId/vote', {
      schema: {
        tags: ['Approvals'],
        summary: 'Submit approval vote',
        security: [{ bearerAuth: [] }],
        params: approvalPathParamsSchema,
        body: approvalVoteBodySchema,
        response: {
          200: approvalSchema,
          403: blockedMutationSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.voteApproval(context, request.params.approvalId, {
        vote: request.body.vote,
        note: request.body.note ?? null
      });

      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return presentApproval(execution.payload.result);
    });

    privilegedApi.post('/falak/allocations/propose', {
      schema: {
        tags: ['Allocations'],
        summary: 'Propose a Falak allocation',
        security: [{ bearerAuth: [] }],
        body: createAllocationProposalBodySchema,
        response: {
          201: allocationProposalWorkflowSchema,
          403: errorResponseSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const workflow = await workflows.allocationWorkflowService.proposeAllocation(context, {
        eventNodeId: request.body.event_id ?? null,
        poolNodeId: request.body.pool_id,
        targetNodeId: request.body.target_id,
        amount: request.body.amount,
        currency: request.body.currency,
        rationale: request.body.rationale ?? null
      });

      return reply.status(201).send(presentAllocationProposalWorkflow(workflow));
    });

    privilegedApi.post('/falak/approvals/:approvalId/vote', {
      schema: {
        tags: ['Approvals'],
        summary: 'Vote on a Falak allocation approval',
        security: [{ bearerAuth: [] }],
        params: approvalPathParamsSchema,
        body: approvalVoteBodySchema,
        response: {
          200: approvalVoteWorkflowSchema,
          403: errorResponseSchema
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const workflow = await workflows.allocationWorkflowService.voteApproval(context, request.params.approvalId, {
        vote: request.body.vote,
        note: request.body.note ?? null
      });

      return presentApprovalVoteWorkflow(workflow);
    });

    privilegedApi.get('/events', {
      schema: {
        tags: ['Events'],
        summary: 'List events',
        security: [{ bearerAuth: [] }],
        querystring: listEventsQuerySchema,
        response: {
          200: eventSchema.array()
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const events = await service.listEvents(context, {
        eventType: request.query.event_type,
        targetType: request.query.target_type,
        targetId: request.query.target_id,
        limit: request.query.limit
      });

      return events.map(presentEvent);
    });

    privilegedApi.get('/ledger', {
      schema: {
        tags: ['Ledger'],
        summary: 'List ledger entries',
        security: [{ bearerAuth: [] }],
        querystring: listLedgerQuerySchema,
        response: {
          200: ledgerEntrySchema.array()
        }
      }
    }, async (request) => {
      const context = requireFalakContext(request);
      const entries = await service.listLedger(context, {
        category: request.query.category,
        referenceType: request.query.reference_type,
        referenceId: request.query.reference_id
      });

      return entries.map(presentLedgerEntry);
    });

    privilegedApi.post('/federation/links', {
      schema: {
        tags: ['Federation'],
        summary: 'Create federation link',
        security: [{ bearerAuth: [] }],
        body: federationLinkBodySchema,
        response: {
          201: edgeSchema,
          403: blockedMutationSchema
        }
      }
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const execution = await service.createFederationLink(context, {
        sourceNodeId: request.body.source_node_id,
        targetNodeId: request.body.target_node_id,
        relation: request.body.relation,
        contract: asJsonObject(request.body.contract)
      });

      if (execution.status === 'blocked') {
        return sendBlocked(reply, context.traceId, execution.decision);
      }

      return reply.status(201).send(presentEdge(execution.payload.result));
    });
  }, { prefix: '/v1' });
}
