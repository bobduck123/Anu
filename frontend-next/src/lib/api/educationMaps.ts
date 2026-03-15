import { getImpactApiBase } from '@/lib/runtime';

const IMPACT_API_BASE = getImpactApiBase();
const DEFAULT_TENANT_ID = '11111111-1111-4111-8111-111111111111';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getFalakTenantId(): string {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('falak_tenant_id');
    if (fromStorage) {
      return fromStorage;
    }
  }

  return process.env.NEXT_PUBLIC_FALAK_TENANT_ID || DEFAULT_TENANT_ID;
}

async function mapFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${IMPACT_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getFalakTenantId(),
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.error?.message || payload?.message || 'Education map request failed';
    throw new Error(message);
  }

  return payload as T;
}

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
export type MapRelation =
  | 'influences'
  | 'contradicts'
  | 'extends'
  | 'belongs_to'
  | 'derived_from'
  | 'similar_to'
  | 'co_occurs_with';

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
  confidence: {
    coverage: number;
    taxonomy: number;
    positions: number;
    dedupe: number;
    relationships: number;
  };
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
  key: 'x' | 'y' | 'z';
  label: string;
  minLabel: string;
  maxLabel: string;
  description?: string;
  scoringMethod: 'curated' | 'rubric' | 'derived';
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
  metadata: Record<string, unknown>;
  axisScores: { x: number; y: number; z: number };
  axisMeta: Array<{ key: 'x' | 'y' | 'z'; explanation: string; confidence: number }>;
  metrics: {
    importance: number;
    popularity: number;
    evidence: number;
    centrality: number;
    complexity: number;
    controversy: number;
    freshness: number;
    sizeScore: number;
    renderRadius: number;
  };
  position: { x: number; y: number; z: number };
  confidence: {
    extraction: number;
    classification: number;
    positioning: number;
  };
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

export interface MapAlias {
  id: string;
  mapId: string;
  nodeId: string;
  alias: string;
  canonicalLabel: string;
}

export interface MapLayoutSnapshot {
  id: string;
  mapId: string;
  version: number;
  name: string;
  nodes: Array<{
    nodeId: string;
    position: { x: number; y: number; z: number };
    confidence: number;
    pinned: boolean;
    clusterId?: string;
  }>;
  createdAt: string;
  createdBy?: string | null;
}

export interface MapJob {
  id: string;
  tenantId: string;
  topicKey: string;
  requestedTopic: string;
  mode: MapCompileMode;
  status: 'queued' | 'running' | 'completed' | 'failed';
  mapId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
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

export interface MapEntityIndexEntry {
  id: string;
  label: string;
  categoryKey?: string;
  tags: string[];
  importance: number;
  evidence: number;
  confidence: number;
}

export const educationMapsApi = {
  listMaps: (params: { q?: string; status?: MapStatus } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return mapFetch<MapDefinition[]>(`/v1/education/maps${suffix}`);
  },

  resolveMap: (payload: { topic: string; mode: MapCompileMode }) =>
    mapFetch<{ map: MapResource; jobCreated: boolean }>('/v1/education/maps/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMap: (topicKey: string) => mapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}`),

  getCategoryView: (topicKey: string, categoryKey: string) =>
    mapFetch<{ category: CategoryDef; nodes: MapNode[] }>(
      `/v1/education/maps/${encodeURIComponent(topicKey)}/categories/${encodeURIComponent(categoryKey)}`,
    ),

  listEntities: (topicKey: string) =>
    mapFetch<MapEntityIndexEntry[]>(`/v1/education/maps/${encodeURIComponent(topicKey)}/entities`),

  updateStatus: (topicKey: string, status: MapStatus) =>
    mapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  updateNode: (
    topicKey: string,
    nodeId: string,
    payload: Partial<Pick<MapNode, 'categoryKey' | 'summary' | 'longDescription' | 'pinned' | 'position'>>,
  ) =>
    mapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/nodes/${encodeURIComponent(nodeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateEdge: (
    topicKey: string,
    edgeId: string,
    payload: Partial<Pick<MapEdge, 'relation' | 'weight' | 'confidence' | 'evidence'>>,
  ) =>
    mapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/edges/${encodeURIComponent(edgeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  rerunLayout: (topicKey: string) =>
    mapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/layout/rerun`, {
      method: 'POST',
    }),
};
