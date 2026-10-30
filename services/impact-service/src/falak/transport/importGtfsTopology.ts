import { createHash } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { GtfsTopology } from './gtfsTopology';

export interface TransportImportOptions {
  tenantId: string;
  sourceSlug: string;
  sourceVersion: string;
  sourceAttribution: string;
  sourceLicence: string;
  sourceUrl: string;
  networkExternalId: string;
  networkName: string;
}

export interface TransportImportReport {
  sourceSlug: string;
  sourceVersion: string;
  stations: number;
  lines: number;
  patterns: number;
  createdNodes: number;
  updatedNodes: number;
  createdPatterns: number;
  updatedPatterns: number;
  retiredPatterns: number;
  missingSourceStations: number;
  missingSourceLines: number;
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function nodeSlug(sourceSlug: string, type: string, externalId: string): string {
  return `gtfs-${digest(sourceSlug).slice(0, 12)}-${type.replace('transport_', '')}-${digest(externalId).slice(0, 24)}`;
}

export function validateImportOptions(options: TransportImportOptions): void {
  if (!/^[a-z0-9][a-z0-9-]{1,118}$/.test(options.sourceSlug)) throw new Error('sourceSlug must be a stable lowercase source key');
  if (!options.sourceVersion.trim() || !options.sourceAttribution.trim() || !options.sourceLicence.trim() || !/^https:\/\//.test(options.sourceUrl)) {
    throw new Error('sourceVersion, sourceAttribution, sourceLicence and HTTPS sourceUrl are required');
  }
  if (!options.networkExternalId.trim() || !options.networkName.trim()) throw new Error('Network identity is required');
  if (!/^[0-9a-f-]{36}$/i.test(options.tenantId)) throw new Error('tenantId must be a UUID');
  if (options.sourceVersion.length > 120 || options.sourceAttribution.length > 300 ||
      options.sourceLicence.length > 200 || options.sourceUrl.length > 700) {
    throw new Error('Source provenance exceeds database field limits');
  }
}

export async function importGtfsTopology(
  prisma: PrismaClient,
  topology: GtfsTopology,
  options: TransportImportOptions
): Promise<TransportImportReport> {
  validateImportOptions(options);
  if (!topology.patterns.length || !topology.stations.length || !topology.lines.length) throw new Error('Empty GTFS topology');

  return prisma.$transaction(async (tx) => {
    if (!await tx.falakTenant.findUnique({ where: { id: options.tenantId }, select: { id: true } })) {
      throw new Error('Selected Falak tenant does not exist');
    }
    const report: TransportImportReport = {
      sourceSlug: options.sourceSlug, sourceVersion: options.sourceVersion,
      stations: topology.stations.length, lines: topology.lines.length, patterns: topology.patterns.length,
      createdNodes: 0, updatedNodes: 0, createdPatterns: 0, updatedPatterns: 0,
      retiredPatterns: 0, missingSourceStations: 0, missingSourceLines: 0
    };
    const stationIds = new Map<string, string>();
    const lineIds = new Map<string, string>();
    const provenance = {
      slug: options.sourceSlug, version: options.sourceVersion,
      attribution: options.sourceAttribution, licence: options.sourceLicence,
      url: options.sourceUrl
    };

    async function upsertNode(type: string, externalId: string, title: string, coordinate?: [number, number]): Promise<string> {
      const slug = nodeSlug(options.sourceSlug, type, externalId);
      const metadata = { transport_source: { ...provenance, external_id: externalId, coordinate: coordinate ?? null } };
      const existing = await tx.falakNode.findUnique({
        where: { tenantId_slug: { tenantId: options.tenantId, slug } },
        select: { id: true, type: true, title: true, metadata: true }
      });
      if (existing && existing.type !== type) throw new Error(`Source slug collision with a ${existing.type} node`);
      if (existing && typeof existing.metadata === 'object' && existing.metadata !== null &&
          !Array.isArray(existing.metadata)) {
        const source = existing.metadata['transport_source'] as Record<string, unknown> | undefined;
        if (source?.slug !== options.sourceSlug || source?.external_id !== externalId) {
          throw new Error('Source slug collision with another canonical node');
        }
      }
      const editorialOverride = existing && typeof existing.metadata === 'object' && existing.metadata !== null &&
        !Array.isArray(existing.metadata) && existing.metadata['editorial_override'] === true;
      const nextMetadata = existing && typeof existing.metadata === 'object' && existing.metadata !== null &&
        !Array.isArray(existing.metadata)
        ? { ...existing.metadata as Record<string, Prisma.JsonValue>, ...metadata }
        : metadata;
      if (existing && (editorialOverride || existing.title === title) &&
          stableJson(existing.metadata) === stableJson(nextMetadata)) {
        return existing.id;
      }
      const record = existing
        ? await tx.falakNode.update({ where: { id: existing.id }, data: {
          ...(!editorialOverride ? { title } : {}), metadata: nextMetadata as Prisma.InputJsonObject
        } })
        : await tx.falakNode.create({ data: {
          tenantId: options.tenantId, type, slug, title, metadata,
          status: 'draft', visibility: 'tenant', sensitivityClass: 'normal'
        } });
      if (existing) report.updatedNodes += 1;
      else report.createdNodes += 1;
      if (coordinate && !editorialOverride) {
        await tx.$executeRaw`UPDATE falak.nodes
          SET geometry = falak.ST_SetSRID(falak.ST_MakePoint(${coordinate[0]}, ${coordinate[1]}), 4326)
          WHERE id = ${record.id}::uuid`;
      }
      return record.id;
    }

    const networkId = await upsertNode('transport_network', options.networkExternalId, options.networkName);
    for (const line of topology.lines) {
      lineIds.set(line.externalId, await upsertNode('transport_line', line.externalId, line.name));
    }
    for (const station of topology.stations) {
      stationIds.set(station.externalId, await upsertNode(
        'transport_station', station.externalId, station.name, [station.longitude, station.latitude]
      ));
    }

    const seenPatternIds: string[] = [];
    for (const pattern of topology.patterns) {
      const lineNodeId = lineIds.get(pattern.lineExternalId);
      if (!lineNodeId) throw new Error(`Missing line ${pattern.lineExternalId}`);
      const stationNodeIds = pattern.stationExternalIds.map((id) => {
        const stationId = stationIds.get(id);
        if (!stationId) throw new Error(`Missing station ${id}`);
        return stationId;
      });
      const shapeHash = pattern.geometry ? digest(JSON.stringify(pattern.geometry)) : null;
      const existing = await tx.falakTransportPattern.findUnique({
        where: { tenantId_sourceSlug_externalId: {
          tenantId: options.tenantId, sourceSlug: options.sourceSlug, externalId: pattern.externalId
        } },
        include: { calls: { orderBy: { sequence: 'asc' } } }
      });
      const sameCalls = existing?.calls.length === stationNodeIds.length && existing.calls.every((call, index) =>
        call.sequence === index && call.stationNodeId === stationNodeIds[index] &&
        call.sourceStopId === (pattern.sourceStopIds[index] ?? null)
      );
      const samePattern = existing && existing.networkNodeId === networkId && existing.lineNodeId === lineNodeId &&
        existing.label === pattern.label && existing.direction === pattern.direction && existing.status === 'active' &&
        existing.sourceVersion === options.sourceVersion && existing.sourceAttribution === options.sourceAttribution &&
        existing.sourceUrl === options.sourceUrl && existing.sourceLicence === options.sourceLicence &&
        existing.shapeHash === shapeHash && sameCalls;
      if (samePattern) {
        seenPatternIds.push(existing.id);
        continue;
      }
      const values = {
        networkNodeId: networkId, lineNodeId, label: pattern.label, direction: pattern.direction,
        status: 'active', sourceVersion: options.sourceVersion,
        sourceAttribution: options.sourceAttribution, sourceLicence: options.sourceLicence, sourceUrl: options.sourceUrl,
        shapeHash, importedAt: new Date()
      };
      const row = existing
        ? await tx.falakTransportPattern.update({ where: { id: existing.id }, data: values })
        : await tx.falakTransportPattern.create({ data: {
          tenantId: options.tenantId, sourceSlug: options.sourceSlug, externalId: pattern.externalId, ...values
        } });
      if (existing) report.updatedPatterns += 1;
      else report.createdPatterns += 1;
      if (pattern.geometry) {
        await tx.$executeRaw`UPDATE falak.transport_patterns
          SET geometry = falak.ST_SetSRID(falak.ST_GeomFromGeoJSON(${JSON.stringify(pattern.geometry)}), 4326)
          WHERE id = ${row.id}::uuid`;
      } else if (existing?.shapeHash) {
        await tx.$executeRaw`UPDATE falak.transport_patterns SET geometry = NULL WHERE id = ${row.id}::uuid`;
      }
      if (!sameCalls) {
        await tx.falakTransportPatternCall.deleteMany({ where: { patternId: row.id } });
        await tx.falakTransportPatternCall.createMany({ data: stationNodeIds.map((stationNodeId, sequence) => ({
          patternId: row.id, sequence, stationNodeId, sourceStopId: pattern.sourceStopIds[sequence] ?? null
        })) });
      }
      seenPatternIds.push(row.id);
    }

    const retired = await tx.falakTransportPattern.updateMany({
      where: {
        tenantId: options.tenantId, networkNodeId: networkId,
        sourceSlug: options.sourceSlug, status: 'active', id: { notIn: seenPatternIds }
      },
      data: { status: 'retired', updatedAt: new Date() }
    });
    report.retiredPatterns = retired.count;
    const sourcePrefix = `gtfs-${digest(options.sourceSlug).slice(0, 12)}-`;
    const knownNodes = await tx.falakNode.findMany({
      where: {
        tenantId: options.tenantId,
        type: { in: ['transport_station', 'transport_line'] },
        slug: { startsWith: sourcePrefix }
      },
      select: { id: true, type: true }
    });
    const importedStationIds = new Set(stationIds.values());
    const importedLineIds = new Set(lineIds.values());
    report.missingSourceStations = knownNodes.filter((node) =>
      node.type === 'transport_station' && !importedStationIds.has(node.id)
    ).length;
    report.missingSourceLines = knownNodes.filter((node) =>
      node.type === 'transport_line' && !importedLineIds.has(node.id)
    ).length;
    return report;
  }, { timeout: 600_000 });
}
