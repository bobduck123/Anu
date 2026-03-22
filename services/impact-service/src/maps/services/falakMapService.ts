import { createHash } from 'crypto';
import { compileMapDraftFromSeed } from '../compiler/autopilot';
import { errors, AppError } from '../../utils/errors';
import { PrismaFalakMapRepository } from '../repositories/prismaFalakMapRepository';
import { normalizeTopicKey } from '../compiler/utils';
import {
  MapCompileRequest,
  MapEntityIndexEntry,
  MapImportActivityEntry,
  MapListFilters,
  MapRelation,
  MapResource,
  MapSeedImportPersistResult,
  MapSeedImportPreview,
  MapStatus,
  SeedCorpus,
} from '../domain/types';

const MAX_IMPORT_NODES = 500;
const MAX_IMPORT_EDGES = 4000;
const MAX_IMPORT_DOCUMENTS = 200;

const MAP_IMPORT_INVALID_PAYLOAD = 'MAP_IMPORT_INVALID_PAYLOAD';
const MAP_IMPORT_LIMIT_EXCEEDED = 'MAP_IMPORT_LIMIT_EXCEEDED';
const MAP_IMPORT_COMPILE_FAILED = 'MAP_IMPORT_COMPILE_FAILED';

function importLimitError(kind: 'documents' | 'nodes' | 'edges', value: number, max: number) {
  return errors.unprocessable(
    `Seed import rejected: ${kind} exceed limit (${value} > ${max}).`,
    MAP_IMPORT_LIMIT_EXCEEDED,
    {
      resource: kind,
      actual: value,
      limit: max,
    },
  );
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([key, nested]) => [key, canonicalizeJson(nested)]));
  }

  return value;
}

function seedChecksum(seed: SeedCorpus): string {
  const canonical = JSON.stringify(canonicalizeJson(seed));
  return createHash('sha256').update(canonical).digest('hex');
}

function normalizeSeedTopic(seed: SeedCorpus): SeedCorpus {
  return {
    ...seed,
    topicKey: normalizeTopicKey(seed.topicKey),
  };
}

export class FalakMapService {
  constructor(private readonly repository: PrismaFalakMapRepository) {}

  listMaps(tenantId: string, filters: MapListFilters) {
    return this.repository.listMaps(tenantId, filters);
  }

  getMap(tenantId: string, topicKey: string): Promise<MapResource | null> {
    return this.repository.getMapResource(tenantId, topicKey);
  }

  async resolveOrCompile(tenantId: string, request: MapCompileRequest): Promise<{ map: MapResource; jobCreated: boolean }> {
    const existing = await this.repository.getMapResource(tenantId, normalizeTopicKey(request.topic));
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

  previewSeedImport(seed: SeedCorpus, mode: MapCompileRequest['mode'] = 'curated_refine'): MapSeedImportPreview {
    const compiled = compileMapDraftFromSeed(seed, mode);
    const relationBreakdown: Record<MapRelation, number> = {
      influences: 0,
      contradicts: 0,
      extends: 0,
      belongs_to: 0,
      derived_from: 0,
      similar_to: 0,
      co_occurs_with: 0,
    };

    for (const edge of compiled.edges) {
      relationBreakdown[edge.relation] += 1;
    }

    const sepLinkedNodeCount = compiled.nodes.filter((node) =>
      node.sources.some((source) => source.domain === 'plato.stanford.edu'),
    ).length;

    const warnings = compiled.logs
      .filter((log) => log.status !== 'info')
      .map((log) => `[${log.step}] ${log.message}`);

    return {
      topicKey: compiled.definition.topicKey,
      title: compiled.definition.title,
      archetype: compiled.definition.archetype,
      nodeCount: compiled.nodes.length,
      edgeCount: compiled.edges.length,
      categoryCount: compiled.categories.length,
      axisCount: compiled.axes.length,
      aliasCount: compiled.aliases.length,
      sepLinkedNodeCount,
      relationBreakdown,
      warnings,
    };
  }

  async importSeedAndPersist(
    tenantId: string,
    seed: SeedCorpus,
    options: {
      mode?: MapCompileRequest['mode'];
      status?: MapStatus;
      force?: boolean;
      importNote?: string;
      importedByActorId?: string;
      importedByExternalAuthId?: string;
    } = {},
  ): Promise<MapSeedImportPersistResult> {
    const mode = options.mode ?? 'curated_refine';
    const desiredStatus = options.status ?? 'draft';
    const normalizedSeed = normalizeSeedTopic(seed);
    if (!normalizedSeed.topicKey || !normalizedSeed.title?.trim()) {
      throw errors.badRequest('Seed import payload must include topicKey and title.', MAP_IMPORT_INVALID_PAYLOAD, {
        required: ['topicKey', 'title'],
      });
    }

    const checksum = seedChecksum(normalizedSeed);
    const preview = this.previewSeedImport(normalizedSeed, mode);

    if (normalizedSeed.documents.length > MAX_IMPORT_DOCUMENTS) {
      throw importLimitError('documents', normalizedSeed.documents.length, MAX_IMPORT_DOCUMENTS);
    }
    if (preview.nodeCount > MAX_IMPORT_NODES) {
      throw importLimitError('nodes', preview.nodeCount, MAX_IMPORT_NODES);
    }
    if (preview.edgeCount > MAX_IMPORT_EDGES) {
      throw importLimitError('edges', preview.edgeCount, MAX_IMPORT_EDGES);
    }

    const existing = await this.repository.getMapResource(tenantId, normalizedSeed.topicKey);
    if (existing && !options.force) {
      const latestChecksum = await this.repository.latestImportChecksum(tenantId, normalizedSeed.topicKey);
      if (latestChecksum === checksum) {
        if (desiredStatus !== existing.definition.status) {
          const updated = await this.repository.updateMapStatus(tenantId, normalizedSeed.topicKey, desiredStatus);
          if (updated) {
            await this.repository.recordImportMetadata(tenantId, normalizedSeed.topicKey, {
              importChecksum: checksum,
              mode,
              source: 'seed_import_idempotent_reuse',
              nodeCount: preview.nodeCount,
              edgeCount: preview.edgeCount,
              sepLinkedNodeCount: preview.sepLinkedNodeCount,
              importNote: options.importNote,
              importedByActorId: options.importedByActorId,
              importedByExternalAuthId: options.importedByExternalAuthId,
            });
            return {
              map: updated,
              jobCreated: false,
              idempotentReuse: true,
              checksum,
              preview,
            };
          }
        }

        return {
          map: existing,
          jobCreated: false,
          idempotentReuse: true,
          checksum,
          preview,
        };
      }
    }

    const request: MapCompileRequest = {
      topic: normalizedSeed.topicKey,
      mode,
    };

    const job = await this.repository.createJob(tenantId, request);
    try {
      let map = await this.repository.compileAndPersistFromSeed(tenantId, request, normalizedSeed, job.id);
      if (desiredStatus !== map.definition.status) {
        const updated = await this.repository.updateMapStatus(tenantId, normalizedSeed.topicKey, desiredStatus);
        if (updated) {
          map = updated;
        }
      }

      await this.repository.recordImportMetadata(tenantId, normalizedSeed.topicKey, {
        importChecksum: checksum,
        mode,
        source: 'seed_import_persist',
        nodeCount: preview.nodeCount,
        edgeCount: preview.edgeCount,
        sepLinkedNodeCount: preview.sepLinkedNodeCount,
        importNote: options.importNote,
        importedByActorId: options.importedByActorId,
        importedByExternalAuthId: options.importedByExternalAuthId,
      });

      await this.repository.appendJobLogs(tenantId, job.id, [
        {
          step: 'seed_import_metadata',
          status: 'info',
          message: `Recorded seed import checksum ${checksum.slice(0, 12)} for topic ${normalizedSeed.topicKey}.`,
          payload: {
            importType: 'seed_corpus',
            importChecksum: checksum,
            importMode: mode,
            importSource: 'seed_import_persist',
            importedByActorId: options.importedByActorId ?? null,
            importedByExternalAuthId: options.importedByExternalAuthId ?? null,
            importNote: options.importNote ?? null,
            nodeCount: preview.nodeCount,
            edgeCount: preview.edgeCount,
            sepLinkedNodeCount: preview.sepLinkedNodeCount,
          },
        },
      ]);

      return {
        map,
        jobCreated: true,
        idempotentReuse: false,
        checksum,
        preview,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.markJobFailed(tenantId, job.id, message);
      if (error instanceof AppError) {
        throw error;
      }
      throw errors.unprocessable(`Seed import compilation failed: ${message}`, MAP_IMPORT_COMPILE_FAILED, {
        topicKey: normalizedSeed.topicKey,
        mode,
      });
    }
  }

  listImportActivity(tenantId: string, topicKey: string): Promise<MapImportActivityEntry[] | null> {
    return this.repository.listImportActivity(tenantId, normalizeTopicKey(topicKey));
  }

  getCategoryView(tenantId: string, topicKey: string, categoryKey: string) {
    return this.repository.getCategoryView(tenantId, topicKey, categoryKey);
  }

  listEntities(tenantId: string, topicKey: string): Promise<MapEntityIndexEntry[] | null> {
    return this.repository.listEntities(tenantId, topicKey);
  }
}
