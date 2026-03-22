export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type MapArchetype =
  | 'theory'
  | 'organization'
  | 'technology'
  | 'place'
  | 'event'
  | 'myth'
  | 'ecosystem'
  | 'person';

export type MapStatus = 'draft' | 'reviewed' | 'published';
export type MapCompileMode = 'auto_seed' | 'auto_expand' | 'curated_refine';
export type MapJobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type AxisKey = 'x' | 'y' | 'z';
export type AxisScoringMethod = 'curated' | 'rubric' | 'derived';
export type MapRelation =
  | 'influences'
  | 'contradicts'
  | 'extends'
  | 'belongs_to'
  | 'derived_from'
  | 'similar_to'
  | 'co_occurs_with';

export interface MapConfidenceBreakdown {
  coverage: number;
  taxonomy: number;
  positions: number;
  dedupe: number;
  relationships: number;
}

export interface MapDefinition {
  id: string;
  tenantId: string;
  topicKey: string;
  title: string;
  archetype: MapArchetype;
  entityType: string;
  description?: string;
  status: MapStatus;
  sizeFormula: string;
  version: number;
  currentSnapshotId?: string | null;
  confidence: MapConfidenceBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDef {
  id: string;
  mapId: string;
  key: string;
  label: string;
  colorToken: string;
  parentKey?: string;
  description?: string;
  order: number;
}

export interface AxisDef {
  id: string;
  mapId: string;
  key: AxisKey;
  label: string;
  minLabel: string;
  maxLabel: string;
  description?: string;
  scoringMethod: AxisScoringMethod;
}

export interface NodeSource {
  id: string;
  nodeId: string;
  url: string;
  title?: string;
  domain?: string;
  snippet?: string;
  extractedAt?: string;
}

export interface NodeAxisMeta {
  key: AxisKey;
  explanation: string;
  confidence: number;
}

export interface MapMetrics {
  importance: number;
  popularity: number;
  evidence: number;
  centrality: number;
  complexity: number;
  controversy: number;
  freshness: number;
  sizeScore: number;
  renderRadius: number;
}

export interface MapNodeConfidence {
  extraction: number;
  classification: number;
  positioning: number;
}

export interface MapPosition {
  x: number;
  y: number;
  z: number;
}

export interface MapNode {
  id: string;
  mapId: string;
  label: string;
  aliases: string[];
  entityType: string;
  categoryKey?: string;
  subcategoryKey?: string;
  tags: string[];
  summary?: string;
  longDescription?: string;
  metadata: JsonObject;
  axisScores: { x: number; y: number; z: number };
  axisMeta: NodeAxisMeta[];
  metrics: MapMetrics;
  position: MapPosition;
  confidence: MapNodeConfidence;
  sources: NodeSource[];
  pinned: boolean;
  clusterId?: string;
}

export interface MapEdge {
  id: string;
  mapId: string;
  sourceId: string;
  targetId: string;
  relation: MapRelation;
  weight: number;
  confidence: number;
  evidence?: string;
}

export interface MapLayoutSnapshot {
  id: string;
  mapId: string;
  version: number;
  name: string;
  nodes: Array<{
    nodeId: string;
    position: MapPosition;
    confidence: number;
    pinned: boolean;
    clusterId?: string;
  }>;
  createdAt: string;
  createdBy?: string | null;
}

export interface MapAlias {
  id: string;
  mapId: string;
  nodeId: string;
  alias: string;
  canonicalLabel: string;
}

export interface MapOverride {
  id: string;
  mapId: string;
  targetType: 'map' | 'node' | 'edge' | 'axis' | 'layout' | 'category';
  targetId?: string | null;
  patch: JsonObject;
  note?: string;
  createdAt: string;
  createdBy?: string | null;
}

export interface MapJob {
  id: string;
  tenantId: string;
  topicKey: string;
  requestedTopic: string;
  mode: MapCompileMode;
  status: MapJobStatus;
  mapId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface MapJobLog {
  id: string;
  jobId: string;
  step: string;
  status: 'info' | 'warning' | 'error';
  message: string;
  payload?: JsonObject;
  createdAt: string;
}

export interface MapResource {
  definition: MapDefinition;
  categories: CategoryDef[];
  axes: AxisDef[];
  nodes: MapNode[];
  edges: MapEdge[];
  aliases: MapAlias[];
  snapshots: MapLayoutSnapshot[];
  jobs?: MapJob[];
}

export interface AxisTemplate {
  key: AxisKey;
  label: string;
  minLabel: string;
  maxLabel: string;
  description: string;
  scoringMethod: AxisScoringMethod;
}

export interface TopicProfile {
  topic: string;
  topicKey: string;
  title: string;
  archetype: MapArchetype;
  entityType: string;
  likelySourceClasses: string[];
  defaultCategoryPatterns: string[];
  axisTemplates: AxisTemplate[];
  defaultEdgeTypes: MapRelation[];
}

export interface StructuredSourceDocument {
  id: string;
  url: string;
  title: string;
  type: 'list_page' | 'entity_page' | 'reference' | 'source_pack';
  summary?: string;
  breadcrumbs?: string[];
  metadata?: Record<string, string | number | boolean>;
  sections: Array<{
    heading: string;
    kind: 'list' | 'summary' | 'detail' | 'metadata';
    lines: string[];
  }>;
}

export interface SeedEntity {
  label: string;
  aliases?: string[];
  entityType?: string;
  categoryKey?: string;
  subcategoryKey?: string;
  tags?: string[];
  summary?: string;
  longDescription?: string;
  axisScores?: Partial<Record<AxisKey, number>>;
  axisExplanations?: Partial<Record<AxisKey, string>>;
  metrics?: Partial<Omit<MapMetrics, 'sizeScore' | 'renderRadius'>>;
  metadata?: JsonObject;
  sources?: Array<Omit<NodeSource, 'id' | 'nodeId'>>;
  relations?: Array<{
    target: string;
    relation: MapRelation;
    weight?: number;
    confidence?: number;
    evidence?: string;
  }>;
}

export interface SeedCorpus {
  topicKey: string;
  title: string;
  archetype?: MapArchetype;
  description?: string;
  seedQueries?: string[];
  suppliedUrls?: string[];
  documents: StructuredSourceDocument[];
  entities: SeedEntity[];
}

export interface SourcePlan {
  seedQueries: string[];
  suppliedUrls: string[];
  sourceClasses: string[];
  documents: StructuredSourceDocument[];
}

export interface DiscoveredEntity {
  label: string;
  aliases: string[];
  entityType: string;
  categoryHint?: string;
  tags: string[];
  summary?: string;
  longDescription?: string;
  metadata: JsonObject;
  sources: Array<Omit<NodeSource, 'id' | 'nodeId'>>;
  seedAxisScores?: Partial<Record<AxisKey, number>>;
  seedAxisExplanations?: Partial<Record<AxisKey, string>>;
  metrics: Partial<Omit<MapMetrics, 'sizeScore' | 'renderRadius'>>;
  relations: Array<{
    target: string;
    relation: MapRelation;
    weight: number;
    confidence: number;
    evidence?: string;
  }>;
}

export interface ScoringWeights {
  importance: number;
  popularity: number;
  evidence: number;
  centrality: number;
  complexity: number;
  freshness: number;
}

export interface CompileResult {
  definition: Omit<MapDefinition, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
  categories: Omit<CategoryDef, 'mapId'>[];
  axes: Omit<AxisDef, 'mapId'>[];
  nodes: Array<Omit<MapNode, 'mapId'>>;
  edges: Array<Omit<MapEdge, 'id' | 'mapId'>>;
  aliases: Array<Omit<MapAlias, 'mapId'>>;
  snapshot: Omit<MapLayoutSnapshot, 'id' | 'mapId' | 'createdAt'>;
  profile: TopicProfile;
  sourcePlan: SourcePlan;
  logs: Array<Omit<MapJobLog, 'id' | 'jobId' | 'createdAt'>>;
}

export interface MapCompileRequest {
  topic: string;
  mode: MapCompileMode;
}

export interface MapListFilters {
  status?: MapStatus;
  query?: string;
}

export interface CategoryView {
  category: CategoryDef;
  nodes: MapNode[];
}

export interface MapEntityIndexEntry {
  id: string;
  label: string;
  categoryKey?: string;
  tags: string[];
  importance: number;
  evidence: number;
  confidence: number;
}

export interface MapSeedImportPreview {
  topicKey: string;
  title: string;
  archetype: MapArchetype;
  nodeCount: number;
  edgeCount: number;
  categoryCount: number;
  axisCount: number;
  aliasCount: number;
  sepLinkedNodeCount: number;
  relationBreakdown: Record<MapRelation, number>;
  warnings: string[];
}

export interface MapSeedImportPersistResult {
  map: MapResource;
  jobCreated: boolean;
  idempotentReuse: boolean;
  checksum: string;
  preview: MapSeedImportPreview;
}

export interface MapImportActivityEntry {
  id: string;
  tenantId: string;
  topicKey: string;
  mapId: string;
  importType: string;
  importSource: string;
  importMode: MapCompileMode;
  importChecksum: string;
  nodeCount: number;
  edgeCount: number;
  sepLinkedNodeCount: number;
  importNote?: string;
  importedByActorId?: string;
  importedByExternalAuthId?: string;
  recordedAt: string;
}
