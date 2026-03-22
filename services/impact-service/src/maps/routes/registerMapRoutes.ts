import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { FalakRuntimeConfig } from '../../falak/config/falakRuntimeConfig';
import { errorResponseSchema } from '../../falak/domain/schemas';
import { FalakRepository } from '../../falak/domain/types';
import { buildRequestContextHook, requireFalakContext } from '../../falak/plugins/requestContext';
import {
  mapCategoryParamsSchema,
  mapCategoryUpdateBodySchema,
  mapEntityIndexSchema,
  mapListQuerySchema,
  mapNodeParamsSchema,
  mapNodeUpdateBodySchema,
  mapEdgeParamsSchema,
  mapEdgeUpdateBodySchema,
  mapPathParamsSchema,
  mapResolveBodySchema,
  mapResourceSchema,
  mapSnapshotRestoreBodySchema,
  mapStatusBodySchema,
  mapDefinitionSchema,
  mapImportPreviewBodySchema,
  mapImportPreviewSchema,
  mapImportPersistBodySchema,
  mapImportPersistSchema,
  mapImportActivitySchema,
} from '../domain/schemas';
import { FalakMapService } from '../services/falakMapService';
import type { SeedCorpus } from '../domain/types';

function sendNotFound(traceId?: string) {
  return {
    error: {
      code: 'MAP_NOT_FOUND',
      message: 'Education map not found',
      trace_id: traceId,
    },
  };
}

export async function registerMapRoutes(
  app: FastifyInstance,
  service: FalakMapService,
  falakRepository: FalakRepository,
  runtimeConfig: FalakRuntimeConfig
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  const publicContext = buildRequestContextHook(falakRepository, {
    privileged: false,
    routeGuardMode: runtimeConfig.mapRouteGuardMode,
    runtimeConfig,
    disabledErrorCode: 'FALAK_MAPS_DISABLED',
    disabledErrorMessage: 'Falak-backed education maps are disabled'
  });
  const privilegedContext = buildRequestContextHook(falakRepository, {
    privileged: true,
    routeGuardMode: runtimeConfig.mapRouteGuardMode,
    runtimeConfig,
    disabledErrorCode: 'FALAK_MAPS_DISABLED',
    disabledErrorMessage: 'Falak-backed education maps are disabled'
  });

  await typed.register(async (publicInstance) => {
    const publicApi = publicInstance.withTypeProvider<ZodTypeProvider>();
    publicApi.addHook('preHandler', publicContext);

    publicApi.get('/education/maps', {
      schema: {
        tags: ['Education Maps'],
        summary: 'List Education Resource Library maps',
        querystring: mapListQuerySchema,
        response: {
          200: z.array(mapDefinitionSchema),
        },
      },
    }, async (request) => {
      const context = requireFalakContext(request);
      return service.listMaps(context.tenantId, {
        query: request.query.q,
        status: request.query.status,
      });
    });

    publicApi.post('/education/maps/resolve', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Return an existing map or compile a new draft',
        body: mapResolveBodySchema,
        response: {
          200: z.object({
            map: mapResourceSchema,
            jobCreated: z.boolean(),
          }),
        },
      },
    }, async (request) => {
      const context = requireFalakContext(request);
      return service.resolveOrCompile(context.tenantId, request.body);
    });

    publicApi.get('/education/maps/:topicKey', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Get Education map detail',
        params: mapPathParamsSchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const map = await service.getMap(context.tenantId, request.params.topicKey);
      if (!map) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return map;
    });

    publicApi.get('/education/maps/:topicKey/categories/:categoryKey', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Get nodes for a single category in an Education map',
        params: mapCategoryParamsSchema,
        response: {
          200: z.object({
            category: z.object({
              id: z.string(),
              mapId: z.string(),
              key: z.string(),
              label: z.string(),
              colorToken: z.string(),
              parentKey: z.string().optional(),
              description: z.string().optional(),
              order: z.number(),
            }),
            nodes: z.array(mapResourceSchema.shape.nodes.element),
          }),
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const categoryView = await service.getCategoryView(context.tenantId, request.params.topicKey, request.params.categoryKey);
      if (!categoryView) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return categoryView;
    });

    publicApi.get('/education/maps/:topicKey/entities', {
      schema: {
        tags: ['Education Maps'],
        summary: 'List all entities in an Education map',
        params: mapPathParamsSchema,
        response: {
          200: mapEntityIndexSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const entities = await service.listEntities(context.tenantId, request.params.topicKey);
      if (!entities) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return entities;
    });
  }, { prefix: '/v1' });

  await typed.register(async (privilegedInstance) => {
    const privilegedApi = privilegedInstance.withTypeProvider<ZodTypeProvider>();
    privilegedApi.addHook('preHandler', privilegedContext);

    privilegedApi.post('/education/maps/import/preview', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Preview compilation for a caller-supplied seed corpus (Phase C start)',
        security: [{ bearerAuth: [] }],
        body: mapImportPreviewBodySchema,
        response: {
          200: z.object({
            preview: mapImportPreviewSchema,
          }),
          400: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    }, async (request) => {
      return {
        preview: service.previewSeedImport(request.body.seed as SeedCorpus, request.body.mode),
      };
    });

    privilegedApi.post('/education/maps/import/persist', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Persist a caller-supplied seed corpus as a managed map (Phase C)',
        security: [{ bearerAuth: [] }],
        body: mapImportPersistBodySchema,
        response: {
          200: mapImportPersistSchema,
          400: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    }, async (request) => {
      const context = requireFalakContext(request);
      return service.importSeedAndPersist(context.tenantId, request.body.seed as SeedCorpus, {
        mode: request.body.mode,
        status: request.body.status,
        force: request.body.force,
        importNote: request.body.importNote,
        importedByActorId: context.actor?.id ?? undefined,
        importedByExternalAuthId: context.actor?.externalAuthId ?? undefined,
      });
    });

    privilegedApi.get('/education/maps/:topicKey/import-activity', {
      schema: {
        tags: ['Education Maps'],
        summary: 'List recent seed import activity for a map topic',
        security: [{ bearerAuth: [] }],
        params: mapPathParamsSchema,
        response: {
          200: z.array(mapImportActivitySchema),
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const activity = await service.listImportActivity(context.tenantId, request.params.topicKey);
      if (!activity) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return activity;
    });

    privilegedApi.patch('/education/maps/:topicKey/status', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Update Education map publication status',
        security: [{ bearerAuth: [] }],
        params: mapPathParamsSchema,
        body: mapStatusBodySchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const updated = await service.updateMapStatus(context.tenantId, request.params.topicKey, request.body.status);
      if (!updated) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return updated;
    });

    privilegedApi.patch('/education/maps/:topicKey/categories/:categoryKey', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Update Education map taxonomy metadata',
        security: [{ bearerAuth: [] }],
        params: mapCategoryParamsSchema,
        body: mapCategoryUpdateBodySchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
      }, async (request, reply) => {
        const context = requireFalakContext(request);
        const updated = await service.updateCategory(
          context.tenantId,
          request.params.topicKey,
          request.params.categoryKey,
          {
            ...request.body,
            parentKey: request.body.parentKey ?? undefined,
            description: request.body.description ?? undefined,
          },
        );
        if (!updated) {
          return reply.status(404).send(sendNotFound(context.traceId));
        }
        return updated;
    });

    privilegedApi.patch('/education/maps/:topicKey/nodes/:nodeId', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Update an Education map node',
        security: [{ bearerAuth: [] }],
        params: mapNodeParamsSchema,
        body: mapNodeUpdateBodySchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const updated = await service.updateNode(context.tenantId, request.params.topicKey, request.params.nodeId, request.body);
      if (!updated) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return updated;
    });

    privilegedApi.patch('/education/maps/:topicKey/edges/:edgeId', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Update an Education map edge',
        security: [{ bearerAuth: [] }],
        params: mapEdgeParamsSchema,
        body: mapEdgeUpdateBodySchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const updated = await service.updateEdge(context.tenantId, request.params.topicKey, request.params.edgeId, request.body);
      if (!updated) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return updated;
    });

    privilegedApi.post('/education/maps/:topicKey/layout/rerun', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Re-run semantic layout and create a new snapshot',
        security: [{ bearerAuth: [] }],
        params: mapPathParamsSchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const updated = await service.rerunLayout(context.tenantId, request.params.topicKey);
      if (!updated) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return updated;
    });

    privilegedApi.post('/education/maps/:topicKey/layout/restore', {
      schema: {
        tags: ['Education Maps'],
        summary: 'Restore a saved layout snapshot',
        security: [{ bearerAuth: [] }],
        params: mapPathParamsSchema,
        body: mapSnapshotRestoreBodySchema,
        response: {
          200: mapResourceSchema,
          404: errorResponseSchema,
        },
      },
    }, async (request, reply) => {
      const context = requireFalakContext(request);
      const updated = await service.restoreSnapshot(context.tenantId, request.params.topicKey, request.body.snapshotId);
      if (!updated) {
        return reply.status(404).send(sendNotFound(context.traceId));
      }
      return updated;
    });
  }, { prefix: '/v1' });
}
