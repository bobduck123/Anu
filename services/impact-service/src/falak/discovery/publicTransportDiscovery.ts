import { Prisma, PrismaClient } from '@prisma/client';
import { errors } from '../../utils/errors';

const publicNode = (tenantId: string) => ({
  tenantId, status: 'active' as const, visibility: 'public' as const, sensitivityClass: 'normal'
});

const entityFields = { id: true, slug: true, title: true, summary: true } as const;
const currentEdge = (tenantId: string, now: Date) => ({
  tenantId, status: 'active' as const,
  AND: [
    { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
    { OR: [{ validTo: null }, { validTo: { gt: now } }] }
  ]
});
const windowEdge = (tenantId: string, from: Date, to: Date) => ({
  tenantId, status: 'active' as const,
  AND: [
    { OR: [{ validFrom: null }, { validFrom: { lt: to } }] },
    { OR: [{ validTo: null }, { validTo: { gte: from } }] }
  ]
});

function entity(node: { id: string; slug: string | null; title: string | null; summary: string | null }) {
  return { id: node.id, slug: node.slug, title: node.title, summary: node.summary };
}

function page<T>(items: T[], limit: number, offset: number) {
  return { items: items.slice(0, limit), next_offset: items.length > limit ? offset + limit : null };
}

export class PublicTransportDiscovery {
  constructor(private readonly prisma: PrismaClient) {}

  private async coordinates(db: Prisma.TransactionClient, tenantId: string, ids: string[]) {
    if (ids.length === 0) return new Map<string, [number, number]>();
    const rows = await db.$queryRaw<Array<{ id: string; lng: number | null; lat: number | null }>>(Prisma.sql`
      SELECT id, falak.ST_X(falak.ST_Centroid(geometry)) AS lng,
        falak.ST_Y(falak.ST_Centroid(geometry)) AS lat
      FROM falak.nodes
      WHERE tenant_id = ${tenantId}::uuid
        AND id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
        AND status = 'active'::falak.falak_node_status
        AND visibility = 'public'::falak.falak_visibility
        AND sensitivity_class = 'normal'
    `);
    return new Map(rows.filter((row) => row.lng !== null && row.lat !== null)
      .map((row) => [row.id, [row.lng!, row.lat!] as [number, number]]));
  }

  private read<T>(tenantId: string, run: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      return run(db);
    }, { timeout: 15_000 });
  }

  networks(tenantId: string, limit: number, offset: number) {
    return this.read(tenantId, async (db) => {
      const rows = await db.falakNode.findMany({
        where: { ...publicNode(tenantId), type: 'transport_network' },
        select: entityFields, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: offset, take: limit + 1
      });
      return page(rows.map(entity), limit, offset);
    });
  }

  lines(tenantId: string, networkId: string, limit: number, offset: number) {
    return this.read(tenantId, async (db) => {
      const network = await db.falakNode.findFirst({
        where: { id: networkId, ...publicNode(tenantId), type: 'transport_network' }, select: entityFields
      });
      if (!network) throw errors.notFound('Network not found', 'TRANSPORT_NETWORK_NOT_FOUND');
      const rows = await db.falakNode.findMany({
        where: {
          ...publicNode(tenantId), type: 'transport_line',
          transportLines: { some: {
            tenantId, networkNodeId: networkId, status: 'active',
            calls: { some: {}, every: { station: publicNode(tenantId) } }
          } }
        },
        select: entityFields, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: offset, take: limit + 1
      });
      return { network: entity(network), ...page(rows.map(entity), limit, offset) };
    });
  }

  patterns(tenantId: string, lineId: string, limit: number, offset: number) {
    return this.read(tenantId, async (db) => {
      const line = await db.falakNode.findFirst({
        where: { id: lineId, ...publicNode(tenantId), type: 'transport_line' }, select: entityFields
      });
      if (!line) throw errors.notFound('Line not found', 'TRANSPORT_LINE_NOT_FOUND');
      const rows = await db.falakTransportPattern.findMany({
        where: {
          tenantId, lineNodeId: lineId, status: 'active',
          network: publicNode(tenantId),
          calls: { some: {}, every: { station: publicNode(tenantId) } }
        },
        select: {
          id: true, externalId: true, label: true, direction: true, sourceSlug: true,
          sourceVersion: true, sourceAttribution: true, sourceLicence: true, sourceUrl: true,
          network: { select: entityFields },
          calls: { orderBy: { sequence: 'asc' }, select: {
            sequence: true, sourceStopId: true, station: { select: entityFields }
          } }
        },
        orderBy: [{ externalId: 'asc' }, { id: 'asc' }], skip: offset, take: limit + 1
      });
      const stationIds = [...new Set(rows.flatMap((row) => row.calls.map((call) => call.station.id)))];
      const coordinates = await this.coordinates(db, tenantId, stationIds);
      const shapes = rows.length ? await db.$queryRaw<Array<{ id: string; geojson: string | null }>>(Prisma.sql`
        SELECT id, falak.ST_AsGeoJSON(geometry) AS geojson
        FROM falak.transport_patterns
        WHERE tenant_id = ${tenantId}::uuid
          AND id IN (${Prisma.join(rows.map((row) => Prisma.sql`${row.id}::uuid`))})
      `) : [];
      const shapeById = new Map(shapes.map((row) => [row.id, row.geojson ? JSON.parse(row.geojson) as {
        type: 'LineString'; coordinates: number[][]
      } : null]));
      return {
        line: entity(line),
        ...page(rows.map((row) => ({
          id: row.id, external_id: row.externalId, label: row.label, direction: row.direction,
          source: { slug: row.sourceSlug, version: row.sourceVersion,
            attribution: row.sourceAttribution, licence: row.sourceLicence, url: row.sourceUrl },
          network: entity(row.network),
          geometry: shapeById.get(row.id) ?? null,
          calls: row.calls.map((call) => ({
            sequence: call.sequence, source_stop_id: call.sourceStopId,
            station: { ...entity(call.station), coordinate: coordinates.get(call.station.id) ?? null }
          }))
        })), limit, offset)
      };
    });
  }

  station(tenantId: string, stationId: string, from: Date, to: Date, limit: number, offset: number) {
    return this.read(tenantId, async (db) => {
      const station = await db.falakNode.findFirst({
        where: {
          id: stationId, ...publicNode(tenantId), type: 'transport_station',
          transportCalls: { some: {
            pattern: { tenantId, status: 'active', network: publicNode(tenantId),
              line: publicNode(tenantId), calls: { every: { station: publicNode(tenantId) } } }
          } }
        }, select: entityFields
      });
      if (!station) throw errors.notFound('Station not found', 'TRANSPORT_STATION_NOT_FOUND');
      const stationCoordinates = await this.coordinates(db, tenantId, [stationId]);
      const stationProjection = { ...entity(station), coordinate: stationCoordinates.get(stationId) ?? null };

      const now = new Date();
      const venueEdges = await db.falakEdge.findMany({
        where: { ...currentEdge(tenantId, now), fromNodeId: stationId, relation: 'nearby_venue',
          toNode: { ...publicNode(tenantId), type: 'venue' } },
        select: { toNodeId: true, toNode: { select: entityFields } },
        orderBy: { id: 'asc' }, take: 501
      });
      if (venueEdges.length > 500) throw errors.badRequest('Station has too many venue links', 'DISCOVERY_LINK_LIMIT');
      const venues = new Map(venueEdges.map((edge) => [edge.toNodeId, entity(edge.toNode)]));
      if (venues.size === 0) return { station: stationProjection, from: from.toISOString(), to: to.toISOString(), items: [], next_offset: null };

      const rows = await db.falakNode.findMany({
        where: {
          ...publicNode(tenantId), type: 'event', timeStart: { lt: to },
          OR: [{ timeEnd: { gte: from } }, { timeEnd: null, timeStart: { gte: from } }],
          outgoingEdges: { some: {
            ...windowEdge(tenantId, from, to), relation: { in: ['occurs_at', 'at_venue'] },
            toNodeId: { in: [...venues.keys()] }
          } }
        },
        select: {
          ...entityFields, timeStart: true, timeEnd: true,
          outgoingEdges: { where: {
            ...windowEdge(tenantId, from, to), relation: { in: ['occurs_at', 'at_venue', 'features_artist', 'hosted_by'] },
            toNode: publicNode(tenantId)
          }, select: {
            relation: true, toNodeId: true,
            toNode: { select: { ...entityFields, type: true, status: true, visibility: true, sensitivityClass: true, tenantId: true } }
          } }
        },
        orderBy: [{ timeStart: 'asc' }, { id: 'asc' }], skip: offset, take: limit + 1
      });
      const items = rows.map((row) => ({
        ...entity(row), time_start: row.timeStart!.toISOString(), time_end: row.timeEnd?.toISOString() ?? null,
        venues: [...new Map(row.outgoingEdges.filter((edge) =>
          ['occurs_at', 'at_venue'].includes(edge.relation) && venues.has(edge.toNodeId))
          .map((edge) => [edge.toNodeId, venues.get(edge.toNodeId)!])).values()],
        artists: [...new Map(row.outgoingEdges.filter((edge) =>
          edge.relation === 'features_artist' && edge.toNode.type === 'artist' &&
          edge.toNode.tenantId === tenantId && edge.toNode.status === 'active' &&
          edge.toNode.visibility === 'public' && edge.toNode.sensitivityClass === 'normal')
          .map((edge) => [edge.toNodeId, entity(edge.toNode)])).values()],
        organizations: [...new Map(row.outgoingEdges.filter((edge) =>
          edge.relation === 'hosted_by' && ['organization', 'organisation'].includes(edge.toNode.type) &&
          edge.toNode.tenantId === tenantId && edge.toNode.status === 'active' &&
          edge.toNode.visibility === 'public' && edge.toNode.sensitivityClass === 'normal')
          .map((edge) => [edge.toNodeId, entity(edge.toNode)])).values()]
      }));
      return { station: stationProjection, from: from.toISOString(), to: to.toISOString(),
        ...page(items, limit, offset) };
    });
  }
}
