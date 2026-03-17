import { PrismaFalakMapRepository } from '../repositories/prismaFalakMapRepository';
import { MapCompileRequest, MapEntityIndexEntry, MapListFilters, MapResource, MapStatus } from '../domain/types';

export class FalakMapService {
  constructor(private readonly repository: PrismaFalakMapRepository) {}

  listMaps(tenantId: string, filters: MapListFilters) {
    return this.repository.listMaps(tenantId, filters);
  }

  getMap(tenantId: string, topicKey: string): Promise<MapResource | null> {
    return this.repository.getMapResource(tenantId, topicKey);
  }

  async resolveOrCompile(tenantId: string, request: MapCompileRequest): Promise<{ map: MapResource; jobCreated: boolean }> {
    const existing = await this.repository.getMapResource(tenantId, request.topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    if (existing) {
      return { map: existing, jobCreated: false };
    }

    const job = await this.repository.createJob(tenantId, request);
    try {
      const map = await this.repository.compileAndPersist(tenantId, request, job.id);
      return { map, jobCreated: true };
    } catch (error) {
      await this.repository.markJobFailed(tenantId, job.id, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  updateMapStatus(tenantId: string, topicKey: string, status: MapStatus) {
    return this.repository.updateMapStatus(tenantId, topicKey, status);
  }

  updateCategory(
    tenantId: string,
    topicKey: string,
    categoryKey: string,
    patch: Parameters<PrismaFalakMapRepository['updateCategory']>[3],
  ) {
    return this.repository.updateCategory(tenantId, topicKey, categoryKey, patch);
  }

  updateNode(
    tenantId: string,
    topicKey: string,
    nodeId: string,
    patch: Parameters<PrismaFalakMapRepository['updateNode']>[3],
  ) {
    return this.repository.updateNode(tenantId, topicKey, nodeId, patch);
  }

  updateEdge(
    tenantId: string,
    topicKey: string,
    edgeId: string,
    patch: Parameters<PrismaFalakMapRepository['updateEdge']>[3],
  ) {
    return this.repository.updateEdge(tenantId, topicKey, edgeId, patch);
  }

  rerunLayout(tenantId: string, topicKey: string) {
    return this.repository.rerunLayout(tenantId, topicKey);
  }

  restoreSnapshot(tenantId: string, topicKey: string, snapshotId: string) {
    return this.repository.restoreSnapshot(tenantId, topicKey, snapshotId);
  }

  getCategoryView(tenantId: string, topicKey: string, categoryKey: string) {
    return this.repository.getCategoryView(tenantId, topicKey, categoryKey);
  }

  listEntities(tenantId: string, topicKey: string): Promise<MapEntityIndexEntry[] | null> {
    return this.repository.listEntities(tenantId, topicKey);
  }
}
