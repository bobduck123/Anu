import { compileMapDraft, compileMapDraftFromSeed } from '../../src/maps/compiler/autopilot';
import { LEFT_THOUGHT_GRAPH_SEED } from '../../src/maps/compiler/leftThoughtSeed';
import { layoutInputsFromNodes } from '../../src/maps/compiler/layoutCompiler';
import { normalizeTopicKey, stableId } from '../../src/maps/compiler/utils';
import type {
  MapCompileRequest,
  MapDefinition,
  MapEdge,
  MapJob,
  MapJobStatus,
  MapNode,
  MapOverride,
  MapResource,
  MapStatus,
  SeedCorpus,
} from '../../src/maps/domain/types';
import { PrismaFalakMapRepository } from '../../src/maps/repositories/prismaFalakMapRepository';
import { FalakMapService } from '../../src/maps/services/falakMapService';
import { AppError } from '../../src/utils/errors';

const TENANT_ID = 'tenant-test';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function resourceKey(tenantId: string, topicKey: string): string {
  return `${tenantId}:${topicKey}`;
}

class InMemoryFalakMapRepository {
  readonly overrides: MapOverride[] = [];
  readonly jobs: MapJob[] = [];
  readonly jobLogs: Array<{ jobId: string; step: string; status: string; message: string; payload?: Record<string, unknown> | null }> = [];
  private readonly maps = new Map<string, MapResource>();
  private readonly importChecksums = new Map<string, string>();

  async listMaps(tenantId: string, filters: { status?: MapStatus; query?: string } = {}): Promise<MapDefinition[]> {
    return Array.from(this.maps.values())
      .filter((resource) => resource.definition.tenantId === tenantId)
      .filter((resource) => (filters.status ? resource.definition.status === filters.status : true))
      .filter((resource) => {
        if (!filters.query) {
          return true;
        }

        const query = filters.query.toLowerCase();
        return (
          resource.definition.title.toLowerCase().includes(query) ||
          resource.definition.topicKey.toLowerCase().includes(query) ||
          resource.definition.description?.toLowerCase().includes(query)
        );
      })
      .map((resource) => clone(resource.definition));
  }

  async getMapResource(tenantId: string, topicKey: string): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    return clone({
      ...resource,
      jobs: this.jobs.filter((job) => job.mapId === resource.definition.id || job.topicKey === resource.definition.topicKey),
    });
  }

  async listImportActivity(tenantId: string, topicKey: string) {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    return this.overrides
      .filter((override) => override.mapId === resource.definition.id && override.targetType === 'map')
      .map((override) => ({
        id: override.id,
        tenantId,
        topicKey,
        mapId: resource.definition.id,
        importType: String((override.patch as { importType?: unknown }).importType ?? 'seed_corpus'),
        importSource: String((override.patch as { importSource?: unknown }).importSource ?? 'unknown'),
        importMode: String((override.patch as { importMode?: unknown }).importMode ?? 'curated_refine'),
        importChecksum: String((override.patch as { importChecksum?: unknown }).importChecksum ?? ''),
        nodeCount: Number((override.patch as { nodeCount?: unknown }).nodeCount ?? 0),
        edgeCount: Number((override.patch as { edgeCount?: unknown }).edgeCount ?? 0),
        sepLinkedNodeCount: Number((override.patch as { sepLinkedNodeCount?: unknown }).sepLinkedNodeCount ?? 0),
        importNote: (override.patch as { importNote?: string }).importNote,
        importedByActorId: (override.patch as { importedByActorId?: string }).importedByActorId,
        importedByExternalAuthId: (override.patch as { importedByExternalAuthId?: string }).importedByExternalAuthId,
        recordedAt: override.createdAt,
      }))
      .filter((entry) => Boolean(entry.importChecksum));
  }

  async createJob(tenantId: string, request: MapCompileRequest): Promise<MapJob> {
    const now = new Date().toISOString();
    const job: MapJob = {
      id: stableId('job', tenantId, request.topic, `${this.jobs.length}`),
      tenantId,
      topicKey: normalizeTopicKey(request.topic),
      requestedTopic: request.topic,
      mode: request.mode,
      status: 'queued',
      mapId: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
    };
    this.jobs.push(job);
    return clone(job);
  }

  async appendJobLogs(
    _tenantId: string,
    jobId: string,
    logs: Array<{ step: string; status: 'info' | 'warning' | 'error'; message: string; payload?: Record<string, unknown> | null }>,
  ): Promise<void> {
    for (const log of logs) {
      this.jobLogs.push({
        jobId,
        step: log.step,
        status: log.status,
        message: log.message,
        payload: log.payload ?? null,
      });
    }
  }

  async compileAndPersist(tenantId: string, request: MapCompileRequest, jobId: string): Promise<MapResource> {
    const compiled = compileMapDraft(request);
    const existing = this.maps.get(resourceKey(tenantId, compiled.definition.topicKey));
    const now = new Date().toISOString();
    const mapId = existing?.definition.id ?? stableId('maprec', tenantId, compiled.definition.topicKey);
    const version = (existing?.definition.version ?? 0) + 1;
    const snapshotId = stableId('snapshot', mapId, String(version), compiled.snapshot.name);

    const resource: MapResource = {
      definition: {
        ...compiled.definition,
        id: mapId,
        tenantId,
        version,
        currentSnapshotId: snapshotId,
        createdAt: existing?.definition.createdAt ?? now,
        updatedAt: now,
      },
      categories: compiled.categories.map((category) => ({ ...category, mapId })),
      axes: compiled.axes.map((axis) => ({ ...axis, mapId })),
      nodes: compiled.nodes.map((node) => ({ ...node, mapId })),
      edges: compiled.edges.map((edge) => ({
        ...edge,
        id: stableId('edge', mapId, edge.sourceId, edge.targetId, edge.relation),
        mapId,
      })),
      aliases: compiled.aliases.map((alias) => ({ ...alias, mapId })),
      snapshots: [
        {
          ...compiled.snapshot,
          id: snapshotId,
          mapId,
          version,
          createdAt: now,
        },
        ...(existing?.snapshots ?? []),
      ],
      jobs: [],
    };

    this.maps.set(resourceKey(tenantId, compiled.definition.topicKey), resource);
    this.updateJobState(jobId, {
      status: 'completed',
      mapId,
      startedAt: this.findJob(jobId)?.startedAt ?? now,
      completedAt: now,
      updatedAt: now,
    });

    return clone({
      ...resource,
      jobs: this.jobs.filter((job) => job.mapId === mapId || job.topicKey === resource.definition.topicKey),
    });
  }

  async compileAndPersistFromSeed(tenantId: string, request: MapCompileRequest, seed: SeedCorpus, jobId: string): Promise<MapResource> {
    const compiled = compileMapDraftFromSeed(seed, request.mode);
    const existing = this.maps.get(resourceKey(tenantId, compiled.definition.topicKey));
    const now = new Date().toISOString();
    const mapId = existing?.definition.id ?? stableId('maprec', tenantId, compiled.definition.topicKey);
    const version = (existing?.definition.version ?? 0) + 1;
    const snapshotId = stableId('snapshot', mapId, String(version), compiled.snapshot.name);

    const resource: MapResource = {
      definition: {
        ...compiled.definition,
        id: mapId,
        tenantId,
        version,
        currentSnapshotId: snapshotId,
        createdAt: existing?.definition.createdAt ?? now,
        updatedAt: now,
      },
      categories: compiled.categories.map((category) => ({ ...category, mapId })),
      axes: compiled.axes.map((axis) => ({ ...axis, mapId })),
      nodes: compiled.nodes.map((node) => ({ ...node, mapId })),
      edges: compiled.edges.map((edge) => ({
        ...edge,
        id: stableId('edge', mapId, edge.sourceId, edge.targetId, edge.relation),
        mapId,
      })),
      aliases: compiled.aliases.map((alias) => ({ ...alias, mapId })),
      snapshots: [
        {
          ...compiled.snapshot,
          id: snapshotId,
          mapId,
          version,
          createdAt: now,
        },
        ...(existing?.snapshots ?? []),
      ],
      jobs: [],
    };

    this.maps.set(resourceKey(tenantId, compiled.definition.topicKey), resource);
    this.updateJobState(jobId, {
      status: 'completed',
      mapId,
      startedAt: this.findJob(jobId)?.startedAt ?? now,
      completedAt: now,
      updatedAt: now,
    });

    return clone({
      ...resource,
      jobs: this.jobs.filter((job) => job.mapId === mapId || job.topicKey === resource.definition.topicKey),
    });
  }

  async markJobFailed(_tenantId: string, jobId: string, errorMessage: string): Promise<void> {
    this.updateJobState(jobId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async latestImportChecksum(tenantId: string, topicKey: string): Promise<string | null> {
    return this.importChecksums.get(resourceKey(tenantId, topicKey)) ?? null;
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
    this.importChecksums.set(resourceKey(tenantId, topicKey), metadata.importChecksum);

    const map = this.maps.get(resourceKey(tenantId, topicKey));
    if (!map) {
      return;
    }

    this.overrides.push({
      id: stableId('override', map.definition.id, 'seed-import', `${this.overrides.length}`),
      mapId: map.definition.id,
      targetType: 'map',
      targetId: map.definition.id,
      patch: {
        importType: 'seed_corpus',
        importChecksum: metadata.importChecksum,
        importMode: metadata.mode,
        importSource: metadata.source,
        importedByActorId: metadata.importedByActorId ?? null,
        importedByExternalAuthId: metadata.importedByExternalAuthId ?? null,
        importNote: metadata.importNote ?? null,
        nodeCount: metadata.nodeCount,
        edgeCount: metadata.edgeCount,
        sepLinkedNodeCount: metadata.sepLinkedNodeCount,
      },
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });
  }

  async updateMapStatus(tenantId: string, topicKey: string, status: MapStatus): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    resource.definition.status = status;
    resource.definition.updatedAt = new Date().toISOString();
    this.overrides.push({
      id: stableId('override', resource.definition.id, 'status', `${this.overrides.length}`),
      mapId: resource.definition.id,
      targetType: 'map',
      targetId: resource.definition.id,
      patch: { status },
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });

    return clone(resource);
  }

  async updateNode(
    tenantId: string,
    topicKey: string,
    nodeId: string,
    patch: Partial<Pick<MapNode, 'categoryKey' | 'summary' | 'longDescription' | 'pinned' | 'position'>>,
  ): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    const node = resource.nodes.find((entry) => entry.id === nodeId);
    if (!node) {
      return null;
    }

    Object.assign(node, patch);
    resource.definition.updatedAt = new Date().toISOString();
    this.overrides.push({
      id: stableId('override', resource.definition.id, nodeId, `${this.overrides.length}`),
      mapId: resource.definition.id,
      targetType: 'node',
      targetId: nodeId,
      patch: patch as MapOverride['patch'],
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });

    return clone(resource);
  }

  async updateCategory(
    tenantId: string,
    topicKey: string,
    categoryKey: string,
    patch: Partial<Pick<MapResource['categories'][number], 'label' | 'colorToken' | 'parentKey' | 'description' | 'order'>>,
  ): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    const category = resource.categories.find((entry) => entry.key === categoryKey);
    if (!category) {
      return null;
    }

    Object.assign(category, patch);
    resource.definition.updatedAt = new Date().toISOString();
    this.overrides.push({
      id: stableId('override', resource.definition.id, category.id, `${this.overrides.length}`),
      mapId: resource.definition.id,
      targetType: 'category',
      targetId: category.id,
      patch: { categoryKey, ...patch } as MapOverride['patch'],
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });

    return clone(resource);
  }

  async updateEdge(
    tenantId: string,
    topicKey: string,
    edgeId: string,
    patch: Partial<Pick<MapEdge, 'relation' | 'weight' | 'confidence' | 'evidence'>>,
  ): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    const edge = resource.edges.find((entry) => entry.id === edgeId);
    if (!edge) {
      return null;
    }

    Object.assign(edge, patch);
    resource.definition.updatedAt = new Date().toISOString();
    this.overrides.push({
      id: stableId('override', resource.definition.id, edgeId, `${this.overrides.length}`),
      mapId: resource.definition.id,
      targetType: 'edge',
      targetId: edgeId,
      patch: patch as MapOverride['patch'],
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });

    return clone(resource);
  }

  async rerunLayout(tenantId: string, topicKey: string): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    const layout = layoutInputsFromNodes(resource.nodes, resource.edges);
    resource.nodes = resource.nodes.map((node) => {
      const positioned = layout.get(node.id);
      if (!positioned) {
        return node;
      }

      return {
        ...node,
        position: positioned.position,
        clusterId: positioned.clusterId,
        confidence: {
          ...node.confidence,
          positioning: positioned.confidence,
        },
      };
    });

    const snapshotVersion = (resource.snapshots[0]?.version ?? 0) + 1;
    const snapshotId = stableId('snapshot', resource.definition.id, String(snapshotVersion), 'rerun-layout');
    resource.snapshots = [
      {
        id: snapshotId,
        mapId: resource.definition.id,
        version: snapshotVersion,
        name: `Layout Snapshot ${snapshotVersion}`,
        createdAt: new Date().toISOString(),
        createdBy: null,
        nodes: resource.nodes.map((node) => ({
          nodeId: node.id,
          position: node.position,
          confidence: node.confidence.positioning,
          pinned: node.pinned,
          clusterId: node.clusterId,
        })),
      },
      ...resource.snapshots,
    ];
    resource.definition.currentSnapshotId = snapshotId;
    resource.definition.updatedAt = new Date().toISOString();
    this.overrides.push({
      id: stableId('override', resource.definition.id, snapshotId, `${this.overrides.length}`),
      mapId: resource.definition.id,
      targetType: 'layout',
      targetId: snapshotId,
      patch: {
        snapshotId,
        snapshotVersion,
        pinnedNodeCount: resource.nodes.filter((node) => node.pinned).length,
      },
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });

    return clone(resource);
  }

  async restoreSnapshot(tenantId: string, topicKey: string, snapshotId: string): Promise<MapResource | null> {
    const resource = this.maps.get(resourceKey(tenantId, topicKey));
    if (!resource) {
      return null;
    }

    const snapshot = resource.snapshots.find((entry) => entry.id === snapshotId);
    if (!snapshot) {
      return null;
    }

    const snapshotNodes = new Map(snapshot.nodes.map((entry) => [entry.nodeId, entry]));
    resource.nodes = resource.nodes.map((node) => {
      const restored = snapshotNodes.get(node.id);
      if (!restored) {
        return node;
      }

      return {
        ...node,
        position: restored.position,
        pinned: restored.pinned,
        clusterId: restored.clusterId,
        confidence: {
          ...node.confidence,
          positioning: restored.confidence,
        },
      };
    });
    resource.definition.currentSnapshotId = snapshot.id;
    resource.definition.updatedAt = new Date().toISOString();
    this.overrides.push({
      id: stableId('override', resource.definition.id, snapshot.id, `${this.overrides.length}`),
      mapId: resource.definition.id,
      targetType: 'layout',
      targetId: snapshot.id,
      patch: {
        restoredSnapshotId: snapshot.id,
        restoredSnapshotVersion: snapshot.version,
      },
      createdAt: new Date().toISOString(),
      createdBy: null,
      note: undefined,
    });

    return clone(resource);
  }

  async seedMap(tenantId: string, request: MapCompileRequest): Promise<MapResource> {
    const job = await this.createJob(tenantId, request);
    return this.compileAndPersist(tenantId, request, job.id);
  }

  private findJob(jobId: string): MapJob | undefined {
    return this.jobs.find((entry) => entry.id === jobId);
  }

  private updateJobState(jobId: string, patch: Partial<MapJob> & { status: MapJobStatus }): void {
    const job = this.findJob(jobId);
    if (!job) {
      return;
    }

    Object.assign(job, patch);
  }
}

describe('FalakMapService integration', () => {
  function createServiceWithRepository() {
    const repository = new InMemoryFalakMapRepository();
    const service = new FalakMapService(repository as unknown as PrismaFalakMapRepository);
    return { repository, service };
  }

  it('opens an existing map without compiling a new draft', async () => {
    const { repository, service } = createServiceWithRepository();
    const seeded = await repository.seedMap(TENANT_ID, {
      topic: 'ancient levantine deities',
      mode: 'auto_seed',
    });
    repository.jobs.length = 0;

    const result = await service.resolveOrCompile(TENANT_ID, {
      topic: 'Ancient Levantine Deities',
      mode: 'auto_seed',
    });

    expect(result.jobCreated).toBe(false);
    expect(result.map.definition.id).toBe(seeded.definition.id);
    expect(repository.jobs).toHaveLength(0);
  });

  it('generates and persists a missing map draft as a first-class resource', async () => {
    const { repository, service } = createServiceWithRepository();

    const result = await service.resolveOrCompile(TENANT_ID, {
      topic: 'software architecture patterns',
      mode: 'auto_seed',
    });

    expect(result.jobCreated).toBe(true);
    expect(result.map.definition.topicKey).toBe('software-architecture-patterns');
    expect(result.map.definition.status).toBe('draft');
    expect(result.map.nodes.length).toBeGreaterThan(0);
    expect(result.map.snapshots).toHaveLength(1);
    expect(repository.jobs[0]?.status).toBe('completed');
  });

  it('compiles and persists the left-thought graph atlas as a first-class Falak map resource', async () => {
    const { repository, service } = createServiceWithRepository();

    const result = await service.resolveOrCompile(TENANT_ID, {
      topic: 'left-thought-graph-atlas',
      mode: 'curated_refine',
    });

    expect(result.jobCreated).toBe(true);
    expect(result.map.definition.topicKey).toBe('left-thought-graph-atlas');
    expect(result.map.nodes).toHaveLength(79);
    expect(result.map.edges).toHaveLength(126);

    const marx = result.map.nodes.find((node) => node.label === 'Karl Marx');
    expect(marx?.sources.some((source) => source.domain === 'plato.stanford.edu')).toBe(true);

    const authoredByEdge = result.map.edges.find((edge) => edge.evidence?.includes('authored by'));
    expect(authoredByEdge?.relation).toBe('derived_from');

    const persisted = await service.getMap(TENANT_ID, 'left-thought-graph-atlas');
    expect(persisted?.definition.id).toBe(result.map.definition.id);
  });

  it('previews caller-supplied seed corpora for Phase C import flow without persisting map state', async () => {
    const { repository, service } = createServiceWithRepository();

    const preview = service.previewSeedImport(LEFT_THOUGHT_GRAPH_SEED, 'curated_refine');

    expect(preview.topicKey).toBe('left-thought-graph-atlas');
    expect(preview.nodeCount).toBe(79);
    expect(preview.edgeCount).toBe(126);
    expect(preview.sepLinkedNodeCount).toBe(79);
    expect(preview.relationBreakdown.derived_from).toBeGreaterThan(0);

    const persisted = await service.getMap(TENANT_ID, 'left-thought-graph-atlas');
    expect(persisted).toBeNull();
    expect(repository.jobs).toHaveLength(0);
  });

  it('persists caller-supplied seed imports with checksum metadata and idempotent reuse on repeat payloads', async () => {
    const { repository, service } = createServiceWithRepository();

    const first = await service.importSeedAndPersist(TENANT_ID, LEFT_THOUGHT_GRAPH_SEED, {
      mode: 'curated_refine',
      status: 'reviewed',
      importNote: 'Initial curated import',
      importedByActorId: 'actor-admin',
      importedByExternalAuthId: 'anu-admin',
    });

    expect(first.jobCreated).toBe(true);
    expect(first.idempotentReuse).toBe(false);
    expect(first.map.definition.topicKey).toBe('left-thought-graph-atlas');
    expect(first.map.definition.status).toBe('reviewed');
    expect(first.preview.nodeCount).toBe(79);
    expect(first.preview.edgeCount).toBe(126);

    const second = await service.importSeedAndPersist(TENANT_ID, LEFT_THOUGHT_GRAPH_SEED, {
      mode: 'curated_refine',
      status: 'published',
    });

    expect(second.jobCreated).toBe(false);
    expect(second.idempotentReuse).toBe(true);
    expect(second.checksum).toBe(first.checksum);
    expect(second.map.definition.status).toBe('published');
    expect(repository.jobs).toHaveLength(1);

    const importOverride = repository.overrides.find((override) => {
      const checksum = (override.patch as { importChecksum?: string }).importChecksum;
      return override.targetType === 'map' && checksum === first.checksum;
    });
    expect(importOverride).toBeDefined();
    expect((importOverride?.patch as { importNote?: string }).importNote).toBe('Initial curated import');
    expect((importOverride?.patch as { importedByActorId?: string }).importedByActorId).toBe('actor-admin');

    const metadataLog = repository.jobLogs.find((log) => log.step === 'seed_import_metadata');
    expect(metadataLog).toBeDefined();
    expect(metadataLog?.payload).toMatchObject({
      importChecksum: first.checksum,
      importNote: 'Initial curated import',
      importedByActorId: 'actor-admin',
      importedByExternalAuthId: 'anu-admin',
    });
  });

  it('lists import activity records for persisted seed imports', async () => {
    const { service } = createServiceWithRepository();

    await service.importSeedAndPersist(TENANT_ID, LEFT_THOUGHT_GRAPH_SEED, {
      mode: 'curated_refine',
      importNote: 'activity check',
      importedByActorId: 'actor-admin',
      importedByExternalAuthId: 'anu-admin',
    });

    const activity = await service.listImportActivity(TENANT_ID, 'left-thought-graph-atlas');

    expect(activity).not.toBeNull();
    expect(activity?.length).toBeGreaterThan(0);
    expect(activity?.[0]).toMatchObject({
      topicKey: 'left-thought-graph-atlas',
      importType: 'seed_corpus',
      importMode: 'curated_refine',
      importNote: 'activity check',
      importedByActorId: 'actor-admin',
    });
  });

  it('supports forcing re-import even when checksum matches', async () => {
    const { repository, service } = createServiceWithRepository();

    const first = await service.importSeedAndPersist(TENANT_ID, LEFT_THOUGHT_GRAPH_SEED, {
      mode: 'curated_refine',
    });
    const second = await service.importSeedAndPersist(TENANT_ID, LEFT_THOUGHT_GRAPH_SEED, {
      mode: 'curated_refine',
      force: true,
    });

    expect(first.jobCreated).toBe(true);
    expect(second.jobCreated).toBe(true);
    expect(second.idempotentReuse).toBe(false);
    expect(second.checksum).toBe(first.checksum);
    expect(repository.jobs).toHaveLength(2);
  });

  it('rejects imports missing required topic identity metadata with typed bad-request errors', async () => {
    const { repository, service } = createServiceWithRepository();

    const invalidSeed: SeedCorpus = {
      ...LEFT_THOUGHT_GRAPH_SEED,
      topicKey: '   ',
      title: '   ',
    };

    let thrown: unknown;
    try {
      await service.importSeedAndPersist(TENANT_ID, invalidSeed, {
        mode: 'curated_refine',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).code).toBe('MAP_IMPORT_INVALID_PAYLOAD');
    expect((thrown as AppError).details).toEqual({
      required: ['topicKey', 'title'],
    });
    expect(repository.jobs).toHaveLength(0);
  });

  it('rejects imports that exceed service safety limits before creating jobs', async () => {
    const { repository, service } = createServiceWithRepository();

    const oversizedSeed: SeedCorpus = {
      ...LEFT_THOUGHT_GRAPH_SEED,
      topicKey: 'left-thought-graph-atlas-oversized',
      entities: Array.from({ length: 501 }, (_, index) => ({
        ...LEFT_THOUGHT_GRAPH_SEED.entities[index % LEFT_THOUGHT_GRAPH_SEED.entities.length],
        label: `Oversized Entity ${index + 1}`,
      })),
    };

    let thrown: unknown;
    try {
      await service.importSeedAndPersist(TENANT_ID, oversizedSeed, {
        mode: 'curated_refine',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AppError);
    expect((thrown as AppError).code).toBe('MAP_IMPORT_LIMIT_EXCEEDED');
    expect((thrown as AppError).message).toContain('nodes exceed limit');
    expect((thrown as AppError).details).toMatchObject({
      resource: 'nodes',
      limit: 500,
    });
    expect(((thrown as AppError).details as { actual?: number }).actual).toBeGreaterThan(500);

    expect(repository.jobs).toHaveLength(0);
  });

  it('saves admin overrides for node and edge updates', async () => {
    const { repository, service } = createServiceWithRepository();
    const resource = await repository.seedMap(TENANT_ID, {
      topic: 'consciousness theories',
      mode: 'auto_seed',
    });
    const node = resource.nodes[0];
    const edge = resource.edges[0];

    const updatedNodeMap = await service.updateNode(TENANT_ID, resource.definition.topicKey, node.id, {
      summary: 'Pinned editorial summary',
      pinned: true,
    });
    const updatedEdgeMap = await service.updateEdge(TENANT_ID, resource.definition.topicKey, edge.id, {
      weight: 0.91,
      evidence: 'Curator verified this relation.',
    });

    expect(updatedNodeMap?.nodes.find((entry) => entry.id === node.id)?.summary).toBe('Pinned editorial summary');
    expect(updatedNodeMap?.nodes.find((entry) => entry.id === node.id)?.pinned).toBe(true);
    expect(updatedEdgeMap?.edges.find((entry) => entry.id === edge.id)?.weight).toBe(0.91);
    expect(repository.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'node',
          targetId: node.id,
          patch: expect.objectContaining({ summary: 'Pinned editorial summary', pinned: true }),
        }),
        expect.objectContaining({
          targetType: 'edge',
          targetId: edge.id,
          patch: expect.objectContaining({ weight: 0.91, evidence: 'Curator verified this relation.' }),
        }),
      ]),
    );
  });

  it('persists taxonomy/category edits as first-class overrides', async () => {
    const { repository, service } = createServiceWithRepository();
    const resource = await repository.seedMap(TENANT_ID, {
      topic: 'software architecture patterns',
      mode: 'auto_seed',
    });
    const category = resource.categories[0];

    const updated = await service.updateCategory(TENANT_ID, resource.definition.topicKey, category.key, {
      label: 'Execution Models',
      description: 'Sandbox editorial relabel for verification.',
      colorToken: 'amber',
      order: 7,
    });

    const updatedCategory = updated?.categories.find((entry) => entry.key === category.key);
    expect(updatedCategory).toMatchObject({
      label: 'Execution Models',
      description: 'Sandbox editorial relabel for verification.',
      colorToken: 'amber',
      order: 7,
    });
    expect(repository.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'category',
          targetId: category.id,
          patch: expect.objectContaining({
            categoryKey: category.key,
            label: 'Execution Models',
          }),
        }),
      ]),
    );
  });

  it('re-runs layout without moving pinned nodes and persists a new snapshot', async () => {
    const { repository, service } = createServiceWithRepository();
    const resource = await repository.seedMap(TENANT_ID, {
      topic: 'ancient levantine deities',
      mode: 'auto_seed',
    });
    const pinnedNode = resource.nodes[0];
    const pinnedPosition = { x: 4.25, y: -3.5, z: 1.75 };

    await service.updateNode(TENANT_ID, resource.definition.topicKey, pinnedNode.id, {
      pinned: true,
      position: pinnedPosition,
    });

    const rerun = await service.rerunLayout(TENANT_ID, resource.definition.topicKey);
    const rerunNode = rerun?.nodes.find((entry) => entry.id === pinnedNode.id);
    const latestSnapshot = rerun?.snapshots[0];

    expect(rerunNode?.pinned).toBe(true);
    expect(rerunNode?.position).toEqual(pinnedPosition);
    expect(rerun?.snapshots).toHaveLength(2);
    expect(rerun?.definition.currentSnapshotId).toBe(latestSnapshot?.id);
    expect(latestSnapshot?.nodes.find((entry) => entry.nodeId === pinnedNode.id)?.position).toEqual(pinnedPosition);
    expect(repository.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'layout',
          targetId: latestSnapshot?.id,
          patch: expect.objectContaining({ pinnedNodeCount: 1 }),
        }),
      ]),
    );
  });

  it('restores an older snapshot and reapplies pinned positions from that snapshot', async () => {
    const { repository, service } = createServiceWithRepository();
    const resource = await repository.seedMap(TENANT_ID, {
      topic: 'ancient levantine deities',
      mode: 'auto_seed',
    });
    const pinnedNode = resource.nodes[0];
    const originalSnapshotId = resource.snapshots[0]?.id;
    const pinnedPosition = { x: 8.5, y: -2.25, z: 4.1 };

    await service.updateNode(TENANT_ID, resource.definition.topicKey, pinnedNode.id, {
      pinned: true,
      position: pinnedPosition,
    });

    const rerun = await service.rerunLayout(TENANT_ID, resource.definition.topicKey);
    expect(rerun?.definition.currentSnapshotId).not.toBe(originalSnapshotId);

    const restored = await service.restoreSnapshot(TENANT_ID, resource.definition.topicKey, originalSnapshotId!);
    const restoredNode = restored?.nodes.find((entry) => entry.id === pinnedNode.id);
    const originalSnapshotNode = resource.snapshots[0]?.nodes.find((entry) => entry.nodeId === pinnedNode.id);

    expect(restored?.definition.currentSnapshotId).toBe(originalSnapshotId);
    expect(restoredNode?.position).toEqual(originalSnapshotNode?.position);
    expect(restoredNode?.pinned).toBe(originalSnapshotNode?.pinned);
    expect(repository.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: 'layout',
          targetId: originalSnapshotId,
          patch: expect.objectContaining({
            restoredSnapshotId: originalSnapshotId,
          }),
        }),
      ]),
    );
  });
});
