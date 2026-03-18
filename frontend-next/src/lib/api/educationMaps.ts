import { getImpactApiBase } from '@/lib/runtime';
import { getFalakRequestTenantId, isFalakMapSandbox } from '@/lib/maps/sandbox';

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
  archetype: string;
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

export interface MapCategory {
  id: string;
  mapId: string;
  key: string;
  label: string;
  colorToken: string;
  parentKey?: string;
  description?: string;
  order: number;
}

export interface MapAxis {
  id: string;
  mapId: string;
  key: 'x' | 'y' | 'z';
  label: string;
  minLabel: string;
  maxLabel: string;
  description?: string;
  scoringMethod: 'curated' | 'rubric' | 'derived';
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
  sources: Array<{
    id: string;
    nodeId: string;
    url: string;
    title?: string;
    domain?: string;
    snippet?: string;
    extractedAt?: string;
  }>;
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
    position: { x: number; y: number; z: number };
    confidence: number;
    pinned: boolean;
    clusterId?: string;
  }>;
  createdAt: string;
  createdBy?: string | null;
}

export interface MapResource {
  definition: MapDefinition;
  categories: MapCategory[];
  axes: MapAxis[];
  nodes: MapNode[];
  edges: MapEdge[];
  aliases: Array<{ id: string; mapId: string; nodeId: string; alias: string; canonicalLabel: string }>;
  snapshots: MapLayoutSnapshot[];
  jobs?: Array<{
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
  }>;
}

export interface MapResolveResponse {
  map: MapResource;
  jobCreated: boolean;
}

export interface EducationMapNodePatch {
  categoryKey?: string;
  summary?: string;
  longDescription?: string;
  pinned?: boolean;
  position?: { x: number; y: number; z: number };
}

export interface EducationMapCategoryPatch {
  label?: string;
  colorToken?: string;
  parentKey?: string | null;
  description?: string | null;
  order?: number;
}

export interface EducationMapEdgePatch {
  relation?: MapRelation;
  weight?: number;
  confidence?: number;
  evidence?: string;
}

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function educationMapFetch<T>(path: string, options: RequestInit = {}, actorId: string | null = null): Promise<T> {
  const base = getImpactApiBase();
  const tenantId = getFalakRequestTenantId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }

  if (actorId && isFalakMapSandbox()) {
    headers['X-Actor-Id'] = actorId;
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `Education maps request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export function listEducationMaps(filters: { q?: string; status?: MapStatus } = {}, actorId: string | null = null) {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set('q', filters.q);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }

  const qs = params.toString();
  return educationMapFetch<MapDefinition[]>(`/v1/education/maps${qs ? `?${qs}` : ''}`, {}, actorId);
}

export function getEducationMap(topicKey: string, actorId: string | null = null) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}`, {}, actorId);
}

export function resolveEducationMap(
  body: { topic: string; mode?: MapCompileMode },
  actorId: string | null = null,
) {
  return educationMapFetch<MapResolveResponse>('/v1/education/maps/resolve', {
    method: 'POST',
    body: JSON.stringify({
      topic: body.topic,
      mode: body.mode ?? 'auto_seed',
    }),
  }, actorId);
}

export function updateEducationMapStatus(topicKey: string, status: MapStatus, actorId: string) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, actorId);
}

export function updateEducationMapCategory(topicKey: string, categoryKey: string, patch: EducationMapCategoryPatch, actorId: string) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/categories/${encodeURIComponent(categoryKey)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }, actorId);
}

export function updateEducationMapNode(topicKey: string, nodeId: string, patch: EducationMapNodePatch, actorId: string) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }, actorId);
}

export function updateEducationMapEdge(topicKey: string, edgeId: string, patch: EducationMapEdgePatch, actorId: string) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/edges/${encodeURIComponent(edgeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }, actorId);
}

export function rerunEducationMapLayout(topicKey: string, actorId: string) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/layout/rerun`, {
    method: 'POST',
  }, actorId);
}

export function restoreEducationMapSnapshot(topicKey: string, snapshotId: string, actorId: string) {
  return educationMapFetch<MapResource>(`/v1/education/maps/${encodeURIComponent(topicKey)}/layout/restore`, {
    method: 'POST',
    body: JSON.stringify({ snapshotId }),
  }, actorId);
}
