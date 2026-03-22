import { Prisma, PrismaClient } from '@prisma/client';
import { compileMapDraft, compileMapDraftFromSeed } from '../compiler/autopilot';
import { layoutInputsFromNodes } from '../compiler/layoutCompiler';
import {
  CategoryDef,
  CompileResult,
  MapCompileRequest,
  MapDefinition,
  MapEdge,
  MapEntityIndexEntry,
  MapImportActivityEntry,
  MapJob,
  MapLayoutSnapshot,
  MapListFilters,
  MapNode,
  MapResource,
  MapStatus,
  NodeSource,
  SeedCorpus,
} from '../domain/types';
import { normalizeTopicKey, stableId } from '../compiler/utils';

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function mapDefinitionRecord(row: any): MapDefinition {
  return {
    id: row.id,
    tenantId: row.tenantId,
    topicKey: row.topicKey,
    title: row.title,
    archetype: row.archetype,
    entityType: row.entityType,
    description: row.description ?? undefined,
    status: row.status,
    sizeFormula: row.sizeFormula,
    version: row.version,
    currentSnapshotId: row.currentSnapshotId ?? null,
    confidence: row.confidence as MapDefinition['confidence'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCategoryRecord(row: any): CategoryDef {
  return {
    id: row.id,
    mapId: row.mapId,
    key: row.key,
    label: row.label,
    colorToken: row.colorToken,
    parentKey: row.parentKey ?? undefined,
    description: row.description ?? undefined,
    order: row.order,
  };
}

function mapNodeSourceRecord(row: any): NodeSource {
  return {
    id: row.id,
    nodeId: row.nodeId,
    url: row.url,
    title: row.title ?? undefined,
    domain: row.domain ?? undefined,
    snippet: row.snippet ?? undefined,
    extractedAt: row.extractedAt ? row.extractedAt.toISOString() : undefined,
  };
}

function mapNodeRecord(row: any): MapNode {
  return {
    id: row.id,
    mapId: row.mapId,
    label: row.label,
    aliases: row.aliases ?? [],
    entityType: row.entityType,
    categoryKey: row.categoryKey ?? undefined,
    subcategoryKey: row.subcategoryKey ?? undefined,
    tags: row.tags ?? [],
    summary: row.summary ?? undefined,
    longDescription: row.longDescription ?? undefined,
    metadata: (row.metadata ?? {}) as MapNode['metadata'],
    axisScores: row.axisScores as MapNode['axisScores'],
    axisMeta: row.axisMeta as MapNode['axisMeta'],
    metrics: row.metrics as MapNode['metrics'],
    position: row.position as MapNode['position'],
    confidence: row.confidence as MapNode['confidence'],
    sources: (row.sources ?? []).map(mapNodeSourceRecord),
    pinned: Boolean(row.pinned),
    clusterId: row.clusterId ?? undefined,
  };
}

function mapEdgeRecord(row: any): MapEdge {
  return {
    id: row.id,
    mapId: row.mapId,
    sourceId: row.sourceId,
    targetId: row.targetId,
    relation: row.relation,
    weight: asNumber(row.weight),
    confidence: asNumber(row.confidence),
    evidence: row.evidence ?? undefined,
  };
}

function mapSnapshotRecord(row: any): MapLayoutSnapshot {
  return {
    id: row.id,
    mapId: row.mapId,
    version: row.version,
    name: row.name,
    nodes: row.nodesJson as MapLayoutSnapshot['nodes'],
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? null,
  };
}

function mapJobRecord(row: any): MapJob {
  return {
    id: row.id,
    tenantId: row.tenantId,
    topicKey: row.topicKey,
    requestedTopic: row.requestedTopic,
    mode: row.mode,
    status: row.status,
    mapId: row.mapId ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

function mapImportActivityRecord(row: any, tenantId: string, topicKey: string): MapImportActivityEntry | null {
  const patch = (row.patch ?? {}) as Record<string, unknown>;
  const importChecksum = asString(patch.importChecksum);
  const importMode = asString(patch.importMode);
  const importSource = asString(patch.importSource);
  const importType = asString(patch.importType) ?? 'seed_corpus';

  if (!importChecksum || !importMode || !importSource) {
    return null;
  }

  return {
    id: row.id,
    tenantId,
    topicKey,
    mapId: row.mapId,
    importType,
    importSource,
    importMode: importMode as MapImportActivityEntry['importMode'],
    importChecksum,
    nodeCount: asNumber(patch.nodeCount),
    edgeCount: asNumber(patch.edgeCount),
    sepLinkedNodeCount: asNumber(patch.sepLinkedNodeCount),
    importNote: asString(patch.importNote),
    importedByActorId: asString(patch.importedByActorId),
    importedByExternalAuthId: asString(patch.importedByExternalAuthId),
    recordedAt: row.createdAt.toISOString(),
  };
}

export class PrismaFalakMapRepository {
  constructor(private readonly prisma: PrismaExecutor) {}

  private async touchMapDefinition(db: PrismaExecutor, mapId: string): Promise<void> {
    await (db as any).falakMapDefinition.update({
      where: { id: mapId },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  private async setTenantSessionOn(db: PrismaExecutor, tenantId: string): Promise<void> {
    await db.$executeRaw(Prisma.sql`
      SELECT set_config('app.current_tenant_id', ${tenantId}, true)
    `);
  }

  private async withTenantSession<T>(tenantId: string, execute: (db: PrismaExecutor) => Promise<T>): Promise<T> {
    if ('$transaction' in this.prisma) {
      return (this.prisma as PrismaClient).$transaction(async (tx) => {
        await this.setTenantSessionOn(tx, tenantId);
        return execute(tx);
      });
    }

    await this.setTenantSessionOn(this.prisma, tenantId);
    return execute(this.prisma);
  }

  async listMaps(tenantId: string, filters: MapListFilters = {}): Promise<MapDefinition[]> {
    return this.withTenantSession(tenantId, async (db) => {
      const rows = await (db as any).falakMapDefinition.findMany({
        where: {
          tenantId,
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.query
            ? {
                OR: [
                  { title: { contains: filters.query, mode: 'insensitive' } },
                  { topicKey: { contains: filters.query, mode: 'insensitive' } },
                  { description: { contains: filters.query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ updatedAt: 'desc' }],
      });

      return rows.map(mapDefinitionRecord);
    });
  }

  private async getMapResourceWithDb(db: PrismaExecutor, tenantId: string, topicKey: string): Promise<MapResource | null> {
    const definition = await (db as any).falakMapDefinition.findFirst({
      where: {
        tenantId,
        OR: [{ topicKey }, { id: topicKey }],
      },
      include: {
        categories: { orderBy: [{ order: 'asc' }] },
        axes: { orderBy: [{ key: 'asc' }] },
        nodes: {
          include: {
            sources: true,
          },
          orderBy: [{ label: 'asc' }],
        },
        edges: true,
        aliases: true,
        snapshots: {
          orderBy: [{ version: 'desc' }],
        },
      },
    });

    if (!definition) {
      return null;
    }

    const jobs = await (db as any).falakMapJob.findMany({
      where: {
        tenantId,
        mapId: definition.id,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 10,
    });

    return {
      definition: mapDefinitionRecord(definition),
      categories: (definition.categories ?? []).map(mapCategoryRecord),
      axes: (definition.axes ?? []).map((row: any) => ({
        id: row.id,
        mapId: row.mapId,
        key: row.key,
        label: row.label,
        minLabel: row.minLabel,
        maxLabel: row.maxLabel,
        description: row.description ?? undefined,
        scoringMethod: row.scoringMethod,
      })),
      nodes: (definition.nodes ?? []).map(mapNodeRecord),
      edges: (definition.edges ?? []).map(mapEdgeRecord),
      aliases: (definition.aliases ?? []).map((row: any) => ({
        id: row.id,
        mapId: row.mapId,
        nodeId: row.nodeId,
        alias: row.alias,
        canonicalLabel: row.canonicalLabel,
      })),
      snapshots: (definition.snapshots ?? []).map(mapSnapshotRecord),
      jobs: jobs.map(mapJobRecord),
    };
  }

  async getMapResource(tenantId: string, topicKey: string): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => this.getMapResourceWithDb(db, tenantId, topicKey));
  }

  async listImportActivity(tenantId: string, topicKey: string): Promise<MapImportActivityEntry[] | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const definition = await (db as any).falakMapDefinition.findFirst({
        where: { tenantId, topicKey },
        select: { id: true },
      });
      if (!definition) {
        return null;
      }

      const overrides = await (db as any).falakMapOverride.findMany({
        where: {
          mapId: definition.id,
          targetType: 'map',
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      });

      return overrides
        .map((row: any) => mapImportActivityRecord(row, tenantId, topicKey))
        .filter((entry: MapImportActivityEntry | null): entry is MapImportActivityEntry => entry != null);
    });
  }

  async createJob(tenantId: string, request: MapCompileRequest): Promise<MapJob> {
    return this.withTenantSession(tenantId, async (db) => {
      const row = await (db as any).falakMapJob.create({
        data: {
          id: stableId('job', tenantId, request.topic, new Date().toISOString()),
          tenantId,
          topicKey: normalizeTopicKey(request.topic),
          requestedTopic: request.topic,
          mode: request.mode,
          status: 'queued',
        },
      });

      return mapJobRecord(row);
    });
  }

  async updateJob(
    tenantId: string,
    jobId: string,
    patch: Partial<{ status: string; mapId: string | null; errorMessage: string | null; startedAt: Date | null; completedAt: Date | null }>,
  ): Promise<void> {
    await this.withTenantSession(tenantId, async (db) => {
      await (db as any).falakMapJob.update({
        where: { id: jobId },
        data: patch,
      });
    });
  }

  async appendJobLogs(tenantId: string, jobId: string, logs: CompileResult['logs']): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    await this.withTenantSession(tenantId, async (db) => {
      await (db as any).falakMapJobLog.createMany({
        data: logs.map((log, index) => ({
          id: stableId('joblog', jobId, `${index}:${log.step}:${log.message}`),
          jobId,
          step: log.step,
          status: log.status,
          message: log.message,
          payload: log.payload ?? Prisma.JsonNull,
        })),
      });
    });
  }

  private async replaceCurrentMapState(db: PrismaExecutor, tenantId: string, compiled: CompileResult, jobId: string): Promise<MapResource> {
    const existing = await (db as any).falakMapDefinition.findFirst({
      where: {
        tenantId,
        topicKey: compiled.definition.topicKey,
      },
      select: {
        id: true,
        version: true,
      },
    });

    const mapId = existing?.id ?? stableId('maprec', tenantId, compiled.definition.topicKey);
    const version = (existing?.version ?? 0) + 1;

    await (db as any).falakMapDefinition.upsert({
      where: { id: mapId },
      update: {
        title: compiled.definition.title,
        archetype: compiled.definition.archetype,
        entityType: compiled.definition.entityType,
        description: compiled.definition.description,
        status: compiled.definition.status,
        sizeFormula: compiled.definition.sizeFormula,
        version,
        confidence: compiled.definition.confidence,
      },
      create: {
        id: mapId,
        tenantId,
        topicKey: compiled.definition.topicKey,
        title: compiled.definition.title,
        archetype: compiled.definition.archetype,
        entityType: compiled.definition.entityType,
        description: compiled.definition.description,
        status: compiled.definition.status,
        sizeFormula: compiled.definition.sizeFormula,
        version,
        confidence: compiled.definition.confidence,
      },
    });

    const existingNodes = await (db as any).falakMapNode.findMany({
      where: { mapId },
      select: { id: true },
    });
    const nodeIds = existingNodes.map((row: { id: string }) => row.id);

    if (nodeIds.length > 0) {
      await (db as any).falakMapNodeSource.deleteMany({
        where: {
          nodeId: {
            in: nodeIds,
          },
        },
      });
    }

    await (db as any).falakMapAlias.deleteMany({ where: { mapId } });
    await (db as any).falakMapEdge.deleteMany({ where: { mapId } });
    await (db as any).falakMapNode.deleteMany({ where: { mapId } });
    await (db as any).falakMapAxis.deleteMany({ where: { mapId } });
    await (db as any).falakMapCategory.deleteMany({ where: { mapId } });

    if (compiled.categories.length > 0) {
      await (db as any).falakMapCategory.createMany({
        data: compiled.categories.map((category) => ({
          ...category,
          mapId,
        })),
      });
    }

    if (compiled.axes.length > 0) {
      await (db as any).falakMapAxis.createMany({
        data: compiled.axes.map((axis) => ({
          ...axis,
          mapId,
        })),
      });
    }

    if (compiled.nodes.length > 0) {
      await (db as any).falakMapNode.createMany({
        data: compiled.nodes.map(({ sources, ...node }) => ({
          ...node,
          mapId,
        })),
      });

      const sources = compiled.nodes.flatMap((node) =>
        node.sources.map((source) => ({
          id: source.id,
          mapId,
          nodeId: node.id,
          url: source.url,
          title: source.title ?? null,
          domain: source.domain ?? null,
          snippet: source.snippet ?? null,
          extractedAt: source.extractedAt ? new Date(source.extractedAt) : null,
        })),
      );
      if (sources.length > 0) {
        await (db as any).falakMapNodeSource.createMany({ data: sources });
      }
    }

    if (compiled.edges.length > 0) {
      await (db as any).falakMapEdge.createMany({
        data: compiled.edges.map((edge) => ({
          id: stableId('edge', mapId, edge.sourceId, edge.targetId, edge.relation),
          ...edge,
          mapId,
        })),
      });
    }

    if (compiled.aliases.length > 0) {
      await (db as any).falakMapAlias.createMany({
        data: compiled.aliases.map((alias) => ({
          ...alias,
          mapId,
        })),
      });
    }

    const snapshotId = stableId('snapshot', mapId, String(version), compiled.snapshot.name);
    await (db as any).falakMapLayoutSnapshot.create({
      data: {
        id: snapshotId,
        mapId,
        version,
        name: compiled.snapshot.name,
        nodesJson: compiled.snapshot.nodes,
        createdBy: null,
      },
    });

    await (db as any).falakMapDefinition.update({
      where: { id: mapId },
      data: {
        currentSnapshotId: snapshotId,
      },
    });

    await (db as any).falakMapJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        mapId,
        completedAt: new Date(),
      },
    });

    const resource = await this.getMapResourceWithDb(db, tenantId, compiled.definition.topicKey);
    if (!resource) {
      throw new Error('Failed to load persisted map resource');
    }
    return resource;
  }

  async compileAndPersist(tenantId: string, request: MapCompileRequest, jobId: string): Promise<MapResource> {
    await this.updateJob(tenantId, jobId, {
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    });

    const compiled = compileMapDraft(request);
    await this.appendJobLogs(tenantId, jobId, compiled.logs);

    return this.withTenantSession(tenantId, async (db) => this.replaceCurrentMapState(db, tenantId, compiled, jobId));
  }

  async compileAndPersistFromSeed(
    tenantId: string,
    request: MapCompileRequest,
    seed: SeedCorpus,
    jobId: string,
  ): Promise<MapResource> {
    await this.updateJob(tenantId, jobId, {
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    });

    const compiled = compileMapDraftFromSeed(seed, request.mode);
    await this.appendJobLogs(tenantId, jobId, compiled.logs);

    return this.withTenantSession(tenantId, async (db) => this.replaceCurrentMapState(db, tenantId, compiled, jobId));
  }

  async latestImportChecksum(tenantId: string, topicKey: string): Promise<string | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const definition = await (db as any).falakMapDefinition.findFirst({
        where: { tenantId, topicKey },
        select: { id: true },
      });
      if (!definition) {
        return null;
      }

      const overrides = await (db as any).falakMapOverride.findMany({
        where: {
          mapId: definition.id,
          targetType: 'map',
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
      });

      for (const override of overrides) {
        const checksum = asString((override.patch as { importChecksum?: unknown } | null)?.importChecksum);
        if (checksum) {
          return checksum;
        }
      }

      return null;
    });
  }

  async recordImportMetadata(
    tenantId: string,
    topicKey: string,
    metadata: {
      importChecksum: string;
      mode: MapCompileRequest['mode'];
      source: string;
      nodeCount: number;
      edgeCount: number;
      sepLinkedNodeCount: number;
      importNote?: string;
      importedByActorId?: string;
      importedByExternalAuthId?: string;
    },
  ): Promise<void> {
    await this.withTenantSession(tenantId, async (db) => {
      const definition = await (db as any).falakMapDefinition.findFirst({
        where: { tenantId, topicKey },
        select: { id: true },
      });
      if (!definition) {
        return;
      }

      const importedAt = new Date().toISOString();
      const patch = {
        importType: 'seed_corpus',
        importChecksum: metadata.importChecksum,
        importMode: metadata.mode,
        importSource: metadata.source,
        importedAt,
        importedByActorId: metadata.importedByActorId ?? null,
        importedByExternalAuthId: metadata.importedByExternalAuthId ?? null,
        importNote: metadata.importNote ?? null,
        nodeCount: metadata.nodeCount,
        edgeCount: metadata.edgeCount,
        sepLinkedNodeCount: metadata.sepLinkedNodeCount,
      };

      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', definition.id, 'seed-import', metadata.importChecksum, importedAt),
          mapId: definition.id,
          targetType: 'map',
          targetId: definition.id,
          patch,
        },
      });

      await (db as any).domainEvent.create({
        data: {
          aggregateType: 'falak_map',
          aggregateId: definition.id,
          eventType: 'falak.map.seed_imported',
          payload: {
            tenantId,
            topicKey,
            ...patch,
          },
          actorId: metadata.importedByActorId ?? null,
          correlationId: null,
        },
      });
      await this.touchMapDefinition(db, definition.id);
    });
  }

  async markJobFailed(tenantId: string, jobId: string, errorMessage: string): Promise<void> {
    await this.updateJob(tenantId, jobId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
  }

  async updateMapStatus(tenantId: string, topicKey: string, status: MapStatus): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const definition = await (db as any).falakMapDefinition.findFirst({
        where: { tenantId, topicKey },
        select: { id: true },
      });
      if (!definition) {
        return null;
      }

      await (db as any).falakMapDefinition.update({
        where: { id: definition.id },
        data: { status },
      });
      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', definition.id, 'status', new Date().toISOString()),
          mapId: definition.id,
          targetType: 'map',
          targetId: definition.id,
          patch: { status },
        },
      });
      return this.getMapResourceWithDb(db, tenantId, topicKey);
    });
  }

  async updateCategory(
    tenantId: string,
    topicKey: string,
    categoryKey: string,
    patch: Partial<Pick<CategoryDef, 'label' | 'colorToken' | 'parentKey' | 'description' | 'order'>>,
  ): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const map = await this.getMapResourceWithDb(db, tenantId, topicKey);
      if (!map) {
        return null;
      }

      const category = map.categories.find((entry) => entry.key === categoryKey);
      if (!category) {
        return null;
      }

      const updateData: Record<string, unknown> = {};
      if (patch.label !== undefined) updateData.label = patch.label;
      if (patch.colorToken !== undefined) updateData.colorToken = patch.colorToken;
      if (patch.parentKey !== undefined) updateData.parentKey = patch.parentKey;
      if (patch.description !== undefined) updateData.description = patch.description;
      if (patch.order !== undefined) updateData.order = patch.order;

      if (Object.keys(updateData).length === 0) {
        return map;
      }

      await (db as any).falakMapCategory.update({
        where: { id: category.id },
        data: updateData,
      });
      await this.touchMapDefinition(db, map.definition.id);
      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', map.definition.id, category.id, new Date().toISOString()),
          mapId: map.definition.id,
          targetType: 'category',
          targetId: category.id,
          patch: {
            categoryKey,
            ...updateData,
          },
        },
      });
      return this.getMapResourceWithDb(db, tenantId, topicKey);
    });
  }

  async updateNode(tenantId: string, topicKey: string, nodeId: string, patch: Partial<Pick<MapNode, 'categoryKey' | 'summary' | 'longDescription' | 'pinned' | 'position'>>): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const map = await this.getMapResourceWithDb(db, tenantId, topicKey);
      if (!map) {
        return null;
      }
      if (!map.nodes.some((node) => node.id === nodeId)) {
        return null;
      }

      const updateData: Record<string, unknown> = {};
      if (patch.categoryKey !== undefined) updateData.categoryKey = patch.categoryKey;
      if (patch.summary !== undefined) updateData.summary = patch.summary;
      if (patch.longDescription !== undefined) updateData.longDescription = patch.longDescription;
      if (patch.pinned !== undefined) updateData.pinned = patch.pinned;
      if (patch.position !== undefined) updateData.position = patch.position;

      await (db as any).falakMapNode.update({
        where: { id: nodeId },
        data: updateData,
      });
      await this.touchMapDefinition(db, map.definition.id);
      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', map.definition.id, nodeId, new Date().toISOString()),
          mapId: map.definition.id,
          targetType: 'node',
          targetId: nodeId,
          patch: updateData,
        },
      });
      return this.getMapResourceWithDb(db, tenantId, topicKey);
    });
  }

  async updateEdge(tenantId: string, topicKey: string, edgeId: string, patch: Partial<Pick<MapEdge, 'relation' | 'weight' | 'confidence' | 'evidence'>>): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const map = await this.getMapResourceWithDb(db, tenantId, topicKey);
      if (!map) {
        return null;
      }
      if (!map.edges.some((edge) => edge.id === edgeId)) {
        return null;
      }

      const updateData: Record<string, unknown> = {};
      if (patch.relation !== undefined) updateData.relation = patch.relation;
      if (patch.weight !== undefined) updateData.weight = patch.weight;
      if (patch.confidence !== undefined) updateData.confidence = patch.confidence;
      if (patch.evidence !== undefined) updateData.evidence = patch.evidence;

      await (db as any).falakMapEdge.update({
        where: { id: edgeId },
        data: updateData,
      });
      await this.touchMapDefinition(db, map.definition.id);
      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', map.definition.id, edgeId, new Date().toISOString()),
          mapId: map.definition.id,
          targetType: 'edge',
          targetId: edgeId,
          patch: updateData,
        },
      });
      return this.getMapResourceWithDb(db, tenantId, topicKey);
    });
  }

  async rerunLayout(tenantId: string, topicKey: string): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const resource = await this.getMapResourceWithDb(db, tenantId, topicKey);
      if (!resource) {
        return null;
      }

      const layout = layoutInputsFromNodes(resource.nodes, resource.edges);
      for (const node of resource.nodes) {
        const positioned = layout.get(node.id);
        if (!positioned) {
          continue;
        }
        await (db as any).falakMapNode.update({
          where: { id: node.id },
          data: {
            position: positioned.position,
            clusterId: positioned.clusterId ?? null,
            confidence: {
              ...node.confidence,
              positioning: positioned.confidence,
            },
          },
        });
      }

      const snapshotVersion = (resource.snapshots[0]?.version ?? 0) + 1;
      const snapshotId = stableId('snapshot', resource.definition.id, String(snapshotVersion), 'rerun-layout');
      await (db as any).falakMapLayoutSnapshot.create({
        data: {
          id: snapshotId,
          mapId: resource.definition.id,
          version: snapshotVersion,
          name: `Layout Snapshot ${snapshotVersion}`,
          nodesJson: resource.nodes.map((node) => {
            const positioned = layout.get(node.id)!;
            return {
              nodeId: node.id,
              position: positioned.position,
              confidence: positioned.confidence,
              pinned: node.pinned,
              clusterId: positioned.clusterId,
            };
          }),
        },
      });
      await (db as any).falakMapDefinition.update({
        where: { id: resource.definition.id },
        data: {
          currentSnapshotId: snapshotId,
          updatedAt: new Date(),
        },
      });
      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', resource.definition.id, snapshotId, new Date().toISOString()),
          mapId: resource.definition.id,
          targetType: 'layout',
          targetId: snapshotId,
          patch: {
            snapshotId,
            snapshotVersion,
            pinnedNodeCount: resource.nodes.filter((node) => node.pinned).length,
          },
        },
      });
      return this.getMapResourceWithDb(db, tenantId, topicKey);
    });
  }

  async restoreSnapshot(tenantId: string, topicKey: string, snapshotId: string): Promise<MapResource | null> {
    return this.withTenantSession(tenantId, async (db) => {
      const resource = await this.getMapResourceWithDb(db, tenantId, topicKey);
      if (!resource) {
        return null;
      }

      const snapshot = resource.snapshots.find((entry) => entry.id === snapshotId);
      if (!snapshot) {
        return null;
      }

      const nodesById = new Map(snapshot.nodes.map((entry) => [entry.nodeId, entry]));
      for (const node of resource.nodes) {
        const persisted = nodesById.get(node.id);
        if (!persisted) {
          continue;
        }

        await (db as any).falakMapNode.update({
          where: { id: node.id },
          data: {
            position: persisted.position,
            pinned: persisted.pinned,
            clusterId: persisted.clusterId ?? null,
            confidence: {
              ...node.confidence,
              positioning: persisted.confidence,
            },
          },
        });
      }

      await (db as any).falakMapDefinition.update({
        where: { id: resource.definition.id },
        data: {
          currentSnapshotId: snapshot.id,
          updatedAt: new Date(),
        },
      });
      await (db as any).falakMapOverride.create({
        data: {
          id: stableId('override', resource.definition.id, snapshot.id, new Date().toISOString()),
          mapId: resource.definition.id,
          targetType: 'layout',
          targetId: snapshot.id,
          patch: {
            restoredSnapshotId: snapshot.id,
            restoredSnapshotVersion: snapshot.version,
          },
        },
      });
      return this.getMapResourceWithDb(db, tenantId, topicKey);
    });
  }

  async getCategoryView(tenantId: string, topicKey: string, categoryKey: string): Promise<{ category: CategoryDef; nodes: MapNode[] } | null> {
    const resource = await this.getMapResource(tenantId, topicKey);
    if (!resource) {
      return null;
    }

    const category = resource.categories.find((item) => item.key === categoryKey);
    if (!category) {
      return null;
    }

    return {
      category,
      nodes: resource.nodes.filter((node) => node.categoryKey === categoryKey),
    };
  }

  async listEntities(tenantId: string, topicKey: string): Promise<MapEntityIndexEntry[] | null> {
    const resource = await this.getMapResource(tenantId, topicKey);
    if (!resource) {
      return null;
    }

    return resource.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      categoryKey: node.categoryKey,
      tags: node.tags,
      importance: node.metrics.importance,
      evidence: node.metrics.evidence,
      confidence: node.confidence.positioning,
    }));
  }
}
