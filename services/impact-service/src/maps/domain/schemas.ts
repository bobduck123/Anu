import { z } from 'zod';

export const mapArchetypeSchema = z.enum([
  'theory',
  'organization',
  'technology',
  'place',
  'event',
  'myth',
  'ecosystem',
  'person',
]);

export const mapStatusSchema = z.enum(['draft', 'reviewed', 'published']);
export const mapCompileModeSchema = z.enum(['auto_seed', 'auto_expand', 'curated_refine']);
export const mapRelationSchema = z.enum([
  'influences',
  'contradicts',
  'extends',
  'belongs_to',
  'derived_from',
  'similar_to',
  'co_occurs_with',
]);

export const nodeSourceSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  domain: z.string().optional(),
  snippet: z.string().optional(),
  extractedAt: z.string().optional(),
});

export const categoryDefSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  key: z.string(),
  label: z.string(),
  colorToken: z.string(),
  parentKey: z.string().optional(),
  description: z.string().optional(),
  order: z.number(),
});

export const axisDefSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  key: z.enum(['x', 'y', 'z']),
  label: z.string(),
  minLabel: z.string(),
  maxLabel: z.string(),
  description: z.string().optional(),
  scoringMethod: z.enum(['curated', 'rubric', 'derived']),
});

export const mapMetricsSchema = z.object({
  importance: z.number(),
  popularity: z.number(),
  evidence: z.number(),
  centrality: z.number(),
  complexity: z.number(),
  controversy: z.number(),
  freshness: z.number(),
  sizeScore: z.number(),
  renderRadius: z.number(),
});

export const mapNodeSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  label: z.string(),
  aliases: z.array(z.string()),
  entityType: z.string(),
  categoryKey: z.string().optional(),
  subcategoryKey: z.string().optional(),
  tags: z.array(z.string()),
  summary: z.string().optional(),
  longDescription: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
  axisScores: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  axisMeta: z.array(z.object({
    key: z.enum(['x', 'y', 'z']),
    explanation: z.string(),
    confidence: z.number(),
  })),
  metrics: mapMetricsSchema,
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  confidence: z.object({
    extraction: z.number(),
    classification: z.number(),
    positioning: z.number(),
  }),
  sources: z.array(nodeSourceSchema),
  pinned: z.boolean(),
  clusterId: z.string().optional(),
});

export const mapEdgeSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  relation: mapRelationSchema,
  weight: z.number(),
  confidence: z.number(),
  evidence: z.string().optional(),
});

export const mapDefinitionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  topicKey: z.string(),
  title: z.string(),
  archetype: mapArchetypeSchema,
  entityType: z.string(),
  description: z.string().optional(),
  status: mapStatusSchema,
  sizeFormula: z.string(),
  version: z.number(),
  currentSnapshotId: z.string().nullable().optional(),
  confidence: z.object({
    coverage: z.number(),
    taxonomy: z.number(),
    positions: z.number(),
    dedupe: z.number(),
    relationships: z.number(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mapLayoutSnapshotSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  version: z.number(),
  name: z.string(),
  nodes: z.array(z.object({
    nodeId: z.string(),
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    confidence: z.number(),
    pinned: z.boolean(),
    clusterId: z.string().optional(),
  })),
  createdAt: z.string(),
  createdBy: z.string().nullable().optional(),
});

export const mapAliasSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  nodeId: z.string(),
  alias: z.string(),
  canonicalLabel: z.string(),
});

export const mapJobSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  topicKey: z.string(),
  requestedTopic: z.string(),
  mode: mapCompileModeSchema,
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  mapId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
});

export const mapResourceSchema = z.object({
  definition: mapDefinitionSchema,
  categories: z.array(categoryDefSchema),
  axes: z.array(axisDefSchema),
  nodes: z.array(mapNodeSchema),
  edges: z.array(mapEdgeSchema),
  aliases: z.array(mapAliasSchema),
  snapshots: z.array(mapLayoutSnapshotSchema),
  jobs: z.array(mapJobSchema).optional(),
});

export const mapListQuerySchema = z.object({
  q: z.string().optional(),
  status: mapStatusSchema.optional(),
});

export const mapResolveBodySchema = z.object({
  topic: z.string().min(2),
  mode: mapCompileModeSchema.default('auto_seed'),
});

export const mapPathParamsSchema = z.object({
  topicKey: z.string().min(2),
});

export const mapCategoryParamsSchema = z.object({
  topicKey: z.string().min(2),
  categoryKey: z.string().min(1),
});

export const mapStatusBodySchema = z.object({
  status: mapStatusSchema,
});

export const mapCategoryUpdateBodySchema = z.object({
  label: z.string().min(1).optional(),
  colorToken: z.string().min(1).optional(),
  parentKey: z.string().min(1).nullable().optional(),
  description: z.string().min(1).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export const mapNodeUpdateBodySchema = z.object({
  categoryKey: z.string().optional(),
  summary: z.string().optional(),
  longDescription: z.string().optional(),
  pinned: z.boolean().optional(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
});

export const mapEdgeUpdateBodySchema = z.object({
  relation: mapRelationSchema.optional(),
  weight: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.string().optional(),
});

export const mapNodeParamsSchema = z.object({
  topicKey: z.string().min(2),
  nodeId: z.string().min(2),
});

export const mapEdgeParamsSchema = z.object({
  topicKey: z.string().min(2),
  edgeId: z.string().min(2),
});

export const mapEntityIndexSchema = z.array(z.object({
  id: z.string(),
  label: z.string(),
  categoryKey: z.string().optional(),
  tags: z.array(z.string()),
  importance: z.number(),
  evidence: z.number(),
  confidence: z.number(),
}));

export const mapSnapshotRestoreBodySchema = z.object({
  snapshotId: z.string().min(2),
});
