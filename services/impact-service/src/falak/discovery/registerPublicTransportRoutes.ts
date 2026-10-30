import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { errors } from '../../utils/errors';
import { FalakRuntimeConfig } from '../config/falakRuntimeConfig';
import { errorResponseSchema } from '../domain/schemas';
import { FalakRepository } from '../domain/types';
import { buildRequestContextHook, requireFalakContext } from '../plugins/requestContext';
import { PublicTransportDiscovery } from './publicTransportDiscovery';

const id = z.string().uuid();
const entity = z.object({ id, slug: z.string().nullable(), title: z.string().nullable(), summary: z.string().nullable() });
const coordinate = z.tuple([z.number(), z.number()]).nullable();
const station = entity.extend({ coordinate });
const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(1000).default(0)
});
const pageFields = { items: z.array(entity), next_offset: z.number().int().nullable() };
const dateTime = z.string().datetime({ offset: true });
const stationQuery = pageQuery.extend({ from: dateTime.optional(), to: dateTime.optional() });
const pattern = z.object({
  id, external_id: z.string(), label: z.string(), direction: z.string().nullable(),
  source: z.object({ slug: z.string(), version: z.string().nullable(),
    attribution: z.string().nullable(), licence: z.string().nullable(), url: z.string().nullable() }),
  network: entity,
  geometry: z.object({ type: z.literal('LineString'), coordinates: z.array(z.array(z.number())) }).nullable(),
  calls: z.array(z.object({ sequence: z.number().int(), source_stop_id: z.string().nullable(), station }))
});
const event = entity.extend({
  time_start: dateTime, time_end: dateTime.nullable(),
  venues: z.array(entity), artists: z.array(entity), organizations: z.array(entity)
});

export async function registerPublicTransportRoutes(
  app: FastifyInstance, prisma: PrismaClient, repository: FalakRepository, runtimeConfig: FalakRuntimeConfig
): Promise<void> {
  const discovery = new PublicTransportDiscovery(prisma);
  const api = app.withTypeProvider<ZodTypeProvider>();
  await api.register(async (instance) => {
    const routes = instance.withTypeProvider<ZodTypeProvider>();
    routes.addHook('preHandler', buildRequestContextHook(repository, {
      privileged: false, routeGuardMode: runtimeConfig.routeGuardMode, runtimeConfig
    }));

    routes.get('/networks', {
      schema: { tags: ['Transport'], summary: 'List published transport networks',
        querystring: pageQuery, response: { 200: z.object(pageFields) } }
    }, async (request) => {
      const { tenantId } = requireFalakContext(request);
      return discovery.networks(tenantId, request.query.limit, request.query.offset);
    });

    routes.get('/networks/:networkId/lines', {
      schema: { tags: ['Transport'], summary: 'List published lines in a network',
        params: z.object({ networkId: id }), querystring: pageQuery,
        response: { 200: z.object({ network: entity, ...pageFields }), 404: errorResponseSchema } }
    }, async (request) => {
      const { tenantId } = requireFalakContext(request);
      return discovery.lines(tenantId, request.params.networkId, request.query.limit, request.query.offset);
    });

    routes.get('/lines/:lineId/patterns', {
      schema: { tags: ['Transport'], summary: 'Get ordered published route patterns',
        params: z.object({ lineId: id }), querystring: pageQuery,
        response: { 200: z.object({ line: entity, items: z.array(pattern), next_offset: z.number().int().nullable() }),
          404: errorResponseSchema } }
    }, async (request) => {
      const { tenantId } = requireFalakContext(request);
      return discovery.patterns(tenantId, request.params.lineId, request.query.limit, request.query.offset);
    });

    routes.get('/stations/:stationId/discovery', {
      schema: { tags: ['Transport'], summary: 'Find published cultural events by station and date window',
        params: z.object({ stationId: id }), querystring: stationQuery,
        response: { 200: z.object({ station, from: dateTime, to: dateTime,
          items: z.array(event), next_offset: z.number().int().nullable() }),
          400: errorResponseSchema, 404: errorResponseSchema } }
    }, async (request) => {
      const { tenantId } = requireFalakContext(request);
      const from = request.query.from ? new Date(request.query.from) : new Date();
      const to = request.query.to ? new Date(request.query.to) : new Date(from.getTime() + 7 * 86_400_000);
      if (to <= from || to.getTime() - from.getTime() > 31 * 86_400_000) {
        throw errors.badRequest('Discovery window must be positive and at most 31 days', 'INVALID_DISCOVERY_WINDOW');
      }
      return discovery.station(tenantId, request.params.stationId, from, to,
        request.query.limit, request.query.offset);
    });
  }, { prefix: '/v1/falak/transport' });
}
