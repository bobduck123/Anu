import { compileMapDraft } from '../../src/maps/compiler/autopilot';
import { layoutInputsFromNodes } from '../../src/maps/compiler/layoutCompiler';
import { stableId } from '../../src/maps/compiler/utils';
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
} from '../../src/maps/domain/types';
import { PrismaFalakMapRepository } from '../../src/maps/repositories/prismaFalakMapRepository';
import { FalakMapService } from '../../src/maps/services/falakMapService';

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
  private readonly maps = new Map<string, MapResource>();

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

  async createJob(tenantId: string, request: MapCompileRequest): Promise<MapJob> {
    const now = new Date().toISOString();
    const job: MapJob = {
      id: stableId('job', tenantId, request.topic, `${this.jobs.length}`),
      tenantId,
      topicKey: request.topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
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

  async markJobFailed(_tenantId: string, jobId: string, errorMessage: string): Promise<void> {
    this.updateJobState(jobId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
});
