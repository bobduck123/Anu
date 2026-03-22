import { getImpactApiBase } from '@/lib/runtime';
import { getFalakRequestTenantId, isFalakMapSandbox } from '@/lib/maps/sandbox';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigurationError } from '@/lib/supabase/config';
import { universePresentationTerms } from '@/components/maps/universe/presentationTerms';

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

export interface MapSeedImportSeedCorpus {
  topicKey: string;
  title: string;
  archetype?: string;
  description?: string;
  seedQueries?: string[];
  suppliedUrls?: string[];
  documents: Array<Record<string, unknown>>;
  entities: Array<Record<string, unknown>>;
}

export interface MapSeedImportPreview {
  topicKey: string;
  title: string;
  archetype: string;
  nodeCount: number;
  edgeCount: number;
  categoryCount: number;
  axisCount: number;
  aliasCount: number;
  sepLinkedNodeCount: number;
  relationBreakdown: Record<string, number>;
  warnings: string[];
}

export interface MapSeedImportPersistResponse {
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

export interface FalakSessionStatus {
  status: 'guest' | 'verified' | 'blocked';
  tenant: {
    id: string;
    slug: string | null;
  };
  actor: {
    id: string;
    external_auth_id: string | null;
    email: string | null;
    display_name: string | null;
    roles: Array<{
      id: string;
      role_name: string;
      region_node_id: string | null;
    }>;
  } | null;
  actor_resolution: {
    source: 'none' | 'verified_auth' | 'trusted_header_override';
    verified: boolean;
    authenticated_identity: string | null;
    requested_actor_id: string | null;
  };
  map_access: {
    mode: 'disabled' | 'admin_only' | 'tenant_allowlist' | 'enabled';
    allowed: boolean;
    code: string | null;
    message: string | null;
  };
}

export class EducationMapApiError extends Error {
  status: number;
  code: string | null;
  details: unknown;
  payload: unknown;

  constructor(message: string, status: number, code: string | null, details: unknown, payload: unknown) {
    super(message);
    this.name = 'EducationMapApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.payload = payload;
  }
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

async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    const accessToken = data.session?.access_token?.trim();
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      throw error;
    }
    console.warn('Unable to read Supabase session for education maps auth, falling back to legacy auth token.', error);
  }

  const legacyToken = localStorage.getItem('auth_token')?.trim();
  return legacyToken ? { Authorization: `Bearer ${legacyToken}` } : {};
}

const FALLBACK_ERROR_CODES = new Set([
  'FALAK_MAPS_DISABLED',
  'FALAK_DISABLED',
  'TENANT_HEADER_REQUIRED',
  'TENANT_NOT_FOUND',
  'BETA_DEPENDENCY_MISSING',
  'VERIFIED_ACTOR_REQUIRED',
  'INVALID_AUTH_TOKEN',
  'TOKEN_IDENTITY_MISSING',
  'ACTOR_NOT_FOUND',
  'ACTOR_NOT_ALLOWED',
]);

const AUTH_GUARD_ERROR_CODES = new Set([
  'VERIFIED_ACTOR_REQUIRED',
  'INVALID_AUTH_TOKEN',
  'TOKEN_IDENTITY_MISSING',
  'ACTOR_NOT_FOUND',
  'ACTOR_NOT_ALLOWED',
]);

export function isEducationMapsBlockingAuthError(
  error: unknown,
  options: { authenticated?: boolean } = {},
): boolean {
  if (isSupabaseConfigurationError(error)) {
    return true;
  }

  if (!(error instanceof EducationMapApiError) || !options.authenticated) {
    return false;
  }

  return Boolean(error.code && AUTH_GUARD_ERROR_CODES.has(error.code));
}

export function shouldUseEducationMapsFallback(
  error: unknown,
  options: { authenticated?: boolean } = {},
): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK === 'false') {
    return false;
  }

  if (isEducationMapsBlockingAuthError(error, options)) {
    return false;
  }

  if (error instanceof EducationMapApiError) {
    if (error.code && FALLBACK_ERROR_CODES.has(error.code)) {
      return true;
    }

    return error.status >= 500;
  }

  return error instanceof TypeError;
}

export function getEducationMapsBlockingMessage(error: unknown): string {
  if (isSupabaseConfigurationError(error)) {
    return 'Hosted Supabase auth is not configured. Live universe routes are blocked until the public auth environment is restored.';
  }

  if (!(error instanceof EducationMapApiError)) {
    return 'The live universe route is blocked and cannot safely fall back for this signed-in session.';
  }

  switch (error.code) {
    case 'VERIFIED_ACTOR_REQUIRED':
    case 'INVALID_AUTH_TOKEN':
    case 'TOKEN_IDENTITY_MISSING':
      return 'Your current sign-in session is not being verified by the live Falak service yet, so privileged universe routes remain blocked.';
    case 'ACTOR_NOT_FOUND':
      return 'Your sign-in session is valid, but it is not mapped to a Falak actor in the active tenant yet.';
    case 'ACTOR_NOT_ALLOWED':
      return 'Your sign-in session resolves to a Falak actor, but that actor is not allowlisted for the live admin-only universe routes.';
    default:
      return error.message || 'The live universe route is blocked and cannot safely fall back for this signed-in session.';
  }
}

export function getEducationMapsFallbackMessage(error: unknown): string {
  if (!(error instanceof EducationMapApiError)) {
    return `The hosted universe API is unavailable right now, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
  }

  switch (error.code) {
    case 'TENANT_HEADER_REQUIRED':
      return `The hosted frontend is not sending \`X-Tenant-Id\` yet, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
    case 'FALAK_MAPS_DISABLED':
      return `The live Manara universe API is still dark-launched, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
    case 'FALAK_DISABLED':
      return `The live Manara universe service is still dark-launched, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
    case 'VERIFIED_ACTOR_REQUIRED':
    case 'INVALID_AUTH_TOKEN':
    case 'TOKEN_IDENTITY_MISSING':
    case 'ACTOR_NOT_FOUND':
    case 'ACTOR_NOT_ALLOWED':
      return `Your current login is not yet being accepted by the live Manara admin-only universe service, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
    default:
      break;
  }

  if (error.code) {
    return `The live Manara universe service returned \`${error.code}\`, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
  }

  if (error.status >= 500) {
    return `The live Manara universe service is currently unavailable, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
  }

  return error.message || `The hosted universe API is unavailable right now, so the frontend is using bundled read-only ${universePresentationTerms.universePacket} data.`;
}

async function educationMapFetch<T>(path: string, options: RequestInit = {}, actorId: string | null = null): Promise<T> {
  const base = getImpactApiBase();
  const tenantId = getFalakRequestTenantId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
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
    const errorCode =
      typeof payload?.error?.code === 'string'
        ? payload.error.code
        : typeof payload?.code === 'string'
          ? payload.code
          : null;
    const errorMessage =
      payload?.error?.message ||
      payload?.message ||
      `Education maps request failed with status ${response.status}`;
    const errorDetails =
      payload?.error?.details ??
      payload?.details ??
      null;
    throw new EducationMapApiError(errorMessage, response.status, errorCode, errorDetails, payload);
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

export function getFalakSessionStatus(actorId: string | null = null) {
  return educationMapFetch<FalakSessionStatus>('/v1/falak/session', {}, actorId);
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

export function previewEducationMapSeedImport(
  body: { mode?: MapCompileMode; seed: MapSeedImportSeedCorpus },
  actorId: string,
) {
  return educationMapFetch<{ preview: MapSeedImportPreview }>('/v1/education/maps/import/preview', {
    method: 'POST',
    body: JSON.stringify({
      mode: body.mode ?? 'curated_refine',
      seed: body.seed,
    }),
  }, actorId);
}

export function persistEducationMapSeedImport(
  body: {
    mode?: MapCompileMode;
    status?: MapStatus;
    force?: boolean;
    importNote?: string;
    seed: MapSeedImportSeedCorpus;
  },
  actorId: string,
) {
  return educationMapFetch<MapSeedImportPersistResponse>('/v1/education/maps/import/persist', {
    method: 'POST',
    body: JSON.stringify({
      mode: body.mode ?? 'curated_refine',
      status: body.status ?? 'draft',
      force: body.force ?? false,
      importNote: body.importNote,
      seed: body.seed,
    }),
  }, actorId);
}

export function listEducationMapImportActivity(topicKey: string, actorId: string) {
  return educationMapFetch<MapImportActivityEntry[]>(
    `/v1/education/maps/${encodeURIComponent(topicKey)}/import-activity`,
    {},
    actorId,
  );
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
