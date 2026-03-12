import { apiFetch, apiFetchWithMeta } from './client';

export interface FusedEvent {
  id: number;
  event_type: string;
  canonical_title: string;
  summary?: string | null;
  occurred_at?: string | null;
  region?: string | null;
  cluster_key?: string | null;
  source_count: number;
  confidence: number;
  novelty_score: number;
  proximity_score: number;
  importance_score: number;
  total_score: number;
  fused_payload?: Record<string, unknown>;
}

export interface StoryCluster {
  id: number;
  cluster_key: string;
  label: string;
  entity_anchor?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  centroid_lat?: number | null;
  centroid_lng?: number | null;
  event_count: number;
  score: number;
}

export interface LearningModule {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  content?: Record<string, unknown>;
  linked_entity_id?: number | null;
  linked_cluster_id?: number | null;
  status: string;
}

export interface GuidedJourney {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  status: string;
  modules?: LearningModule[];
}

export interface QuestTemplate {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  trigger_event_type?: string | null;
  trigger_entity_type?: string | null;
  min_cluster_score: number;
  reward_points: number;
  commitment_type?: string | null;
  status: string;
}

export interface QuestInstance {
  id: number;
  quest_template_id: number;
  user_id: number;
  cluster_id?: number | null;
  linked_module_id?: number | null;
  status: string;
  progress_percent: number;
  started_at?: string | null;
  completed_at?: string | null;
  template?: QuestTemplate;
  commitment_ids?: number[];
}

export interface WorldSnapshotPayload {
  world_id: string;
  version: number;
  manifest: {
    world_id: string;
    version: number;
    asset_list: Array<Record<string, unknown>>;
    scene_graph: Record<string, unknown>;
    semantic_map: Record<string, unknown>;
    layers: Record<string, unknown>;
    permissions_manifest: Record<string, unknown>;
    education_links: Record<string, unknown>;
    meta?: Record<string, unknown>;
  };
  manifest_hash?: string;
  signature: string;
  signature_key_id: string;
  public_key_raw_b64: string;
  verified: boolean;
  verification?: {
    signature_valid?: boolean;
    manifest_hash_valid?: boolean;
    artifact_valid?: boolean;
    artifact_path?: string | null;
    artifact_manifest_hash?: string | null;
    reasons?: string[];
  };
  created_at?: string | null;
}

export interface WorldSnapshotIntegrityResult {
  ok: boolean;
  signatureValid: boolean;
  trustedKeyValid: boolean;
  manifestHashValid: boolean;
  serverVerified: boolean;
  reasons: string[];
}

export interface VerifyWorldSnapshotOptions {
  requireServerVerified?: boolean;
  requireManifestHash?: boolean;
  validateAssetList?: boolean;
}

type CacheEnvelope<T> = {
  etag?: string;
  data: T;
};

function readCached<T>(key: string): CacheEnvelope<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function writeCached<T>(key: string, value: CacheEnvelope<T>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors.
  }
}

export async function fetchFusedEvents(params: {
  eventType?: string;
  region?: string;
  limit?: number;
} = {}) {
  const search = new URLSearchParams();
  if (params.eventType) search.set('event_type', params.eventType);
  if (params.region) search.set('region', params.region);
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  const path = `/api/public/intel/events${qs ? `?${qs}` : ''}`;
  const cacheKey = `ci:${path}`;
  const cached = readCached<FusedEvent[]>(cacheKey);
  const headers: HeadersInit = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const response = await apiFetchWithMeta<FusedEvent[]>(path, { headers });
  if (response.notModified && cached) return cached.data;
  const data = response.data || [];
  if (response.etag) writeCached(cacheKey, { etag: response.etag, data });
  return data;
}

export async function fetchStoryClusters(params: { minScore?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (typeof params.minScore === 'number') search.set('min_score', String(params.minScore));
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  const path = `/api/public/intel/clusters${qs ? `?${qs}` : ''}`;
  const cacheKey = `ci:${path}`;
  const cached = readCached<StoryCluster[]>(cacheKey);
  const headers: HeadersInit = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const response = await apiFetchWithMeta<StoryCluster[]>(path, { headers });
  if (response.notModified && cached) return cached.data;
  const data = response.data || [];
  if (response.etag) writeCached(cacheKey, { etag: response.etag, data });
  return data;
}

export function fetchLearningModules() {
  return apiFetch<LearningModule[]>('/api/public/learn/modules');
}

export function fetchGuidedJourneys() {
  return apiFetch<GuidedJourney[]>('/api/public/learn/journeys');
}

export function fetchQuestTemplates() {
  return apiFetch<QuestTemplate[]>('/api/public/quests/templates');
}

export function startQuest(questTemplateId: number, clusterId?: number) {
  return apiFetch<QuestInstance>('/api/public/quests/start', {
    method: 'POST',
    body: JSON.stringify({
      quest_template_id: questTemplateId,
      ...(typeof clusterId === 'number' ? { cluster_id: clusterId } : {}),
    }),
  });
}

export function listMyQuests() {
  return apiFetch<QuestInstance[]>('/api/public/quests');
}

export function updateQuestProgress(questId: number, progressPercent: number, notes?: string) {
  return apiFetch<QuestInstance>(`/api/public/quests/${questId}/progress`, {
    method: 'POST',
    body: JSON.stringify({
      progress_percent: progressPercent,
      step_key: progressPercent >= 100 ? 'complete' : 'progress',
      notes,
    }),
  });
}

export async function fetchWorldSnapshot(worldId: string, version?: number) {
  const qs = typeof version === 'number' ? `?version=${version}` : '';
  const path = `/api/public/worlds/${encodeURIComponent(worldId)}/snapshot${qs}`;
  const cacheKey = `ci:${path}`;
  const cached = readCached<WorldSnapshotPayload>(cacheKey);
  const headers: HeadersInit = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const response = await apiFetchWithMeta<WorldSnapshotPayload>(path, { headers });
  if (response.notModified && cached) return cached.data;
  const data = response.data;
  if (!data) {
    throw new Error('Snapshot payload missing');
  }
  if (response.etag) writeCached(cacheKey, { etag: response.etag, data });
  return data;
}

export function fetchWorldPatches(worldId: string, sinceVersion?: number) {
  const qs = typeof sinceVersion === 'number' ? `?since_version=${sinceVersion}` : '';
  return apiFetch<Array<Record<string, unknown>>>(`/api/public/worlds/${encodeURIComponent(worldId)}/patches${qs}`);
}

function decodeBase64(input: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const bufferCtor = (globalThis as { Buffer?: { from: (value: string, encoding: string) => Uint8Array } }).Buffer;
  if (bufferCtor) {
    return Uint8Array.from(bufferCtor.from(input, 'base64'));
  }
  throw new Error('No base64 decoder available');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    Object.keys(record)
      .sort()
      .forEach((key) => {
        sorted[key] = canonicalize(record[key]);
      });
    return sorted;
  }
  return value;
}

function canonicalManifestJson(manifest: WorldSnapshotPayload['manifest']): string {
  return JSON.stringify(canonicalize(manifest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: Uint8Array): Promise<string | null> {
  if (!globalThis.crypto?.subtle) {
    return null;
  }
  try {
    const buffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return toHex(new Uint8Array(digest));
  } catch {
    return null;
  }
}

function readEnv(name: string): string | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }
  return process.env?.[name];
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = readEnv(name);
  if (!raw) {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function trustedWorldKeys(): Record<string, string> {
  const raw = readEnv('NEXT_PUBLIC_WORLD_TRUSTED_KEYS_JSON');
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' &&
          entry[0].trim().length > 0 &&
          typeof entry[1] === 'string' &&
          entry[1].trim().length > 0,
      ),
    );
  } catch {
    return {};
  }
}

function isSha256Hex(value: string): boolean {
  return /^[a-f0-9]{64}$/iu.test(value);
}

function assetListValidationReasons(assetList: unknown): string[] {
  if (!Array.isArray(assetList)) {
    return ['asset_list_invalid'];
  }
  const reasons: string[] = [];
  const seenPaths = new Set<string>();
  for (const entry of assetList) {
    if (!entry || typeof entry !== 'object') {
      reasons.push('asset_entry_invalid');
      continue;
    }
    const record = entry as Record<string, unknown>;
    const pathCandidate =
      (typeof record.path === 'string' && record.path) ||
      (typeof record.asset_path === 'string' && record.asset_path) ||
      '';
    if (pathCandidate) {
      if (pathCandidate.includes('..') || pathCandidate.startsWith('/') || /^[a-z]+:\/\//iu.test(pathCandidate)) {
        reasons.push('asset_path_unsafe');
      }
      if (seenPaths.has(pathCandidate)) {
        reasons.push('asset_path_duplicate');
      }
      seenPaths.add(pathCandidate);
    }
    const checksumCandidate =
      (typeof record.checksum === 'string' && record.checksum) ||
      (typeof record.sha256 === 'string' && record.sha256) ||
      '';
    if (checksumCandidate && !isSha256Hex(checksumCandidate)) {
      reasons.push('asset_checksum_invalid');
    }
  }
  return [...new Set(reasons)];
}

async function verifyEd25519(
  message: Uint8Array,
  signature: Uint8Array,
  publicKeyRaw: Uint8Array,
) {
  if (globalThis.crypto?.subtle) {
    try {
      const publicKeyBuffer = publicKeyRaw.buffer.slice(
        publicKeyRaw.byteOffset,
        publicKeyRaw.byteOffset + publicKeyRaw.byteLength,
      ) as ArrayBuffer;
      const signatureBuffer = signature.buffer.slice(
        signature.byteOffset,
        signature.byteOffset + signature.byteLength,
      ) as ArrayBuffer;
      const messageBuffer = message.buffer.slice(
        message.byteOffset,
        message.byteOffset + message.byteLength,
      ) as ArrayBuffer;
      const key = await crypto.subtle.importKey(
        'raw',
        publicKeyBuffer,
        { name: 'Ed25519' },
        false,
        ['verify'],
      );
      return crypto.subtle.verify(
        { name: 'Ed25519' },
        key,
        signatureBuffer,
        messageBuffer,
      );
    } catch {
      // Fall through to pure JS verifier.
    }
  }
  try {
    const ed = await import('@noble/ed25519');
    return ed.verifyAsync(signature, message, publicKeyRaw);
  } catch {
    return false;
  }
}

export async function verifyWorldSnapshotIntegrity(
  snapshot: WorldSnapshotPayload,
  options: VerifyWorldSnapshotOptions = {},
): Promise<WorldSnapshotIntegrityResult> {
  const requireServerVerified =
    options.requireServerVerified ?? readBooleanEnv('NEXT_PUBLIC_WORLD_REQUIRE_SERVER_VERIFIED', true);
  const requireManifestHash =
    options.requireManifestHash ?? readBooleanEnv('NEXT_PUBLIC_WORLD_REQUIRE_MANIFEST_HASH', true);
  const validateAssetList = options.validateAssetList ?? true;

  const reasons: string[] = [];
  const trustedKeys = trustedWorldKeys();
  const hasTrustedKeys = Object.keys(trustedKeys).length > 0;

  if (!snapshot.manifest || typeof snapshot.manifest !== 'object') {
    return {
      ok: false,
      signatureValid: false,
      trustedKeyValid: false,
      manifestHashValid: false,
      serverVerified: false,
      reasons: ['manifest_missing'],
    };
  }

  if (snapshot.manifest.world_id !== snapshot.world_id) {
    reasons.push('world_id_mismatch');
  }
  if (snapshot.manifest.version !== snapshot.version) {
    reasons.push('version_mismatch');
  }

  let trustedKeyValid = true;
  if (hasTrustedKeys) {
    const expectedPublicKey = trustedKeys[snapshot.signature_key_id];
    if (!expectedPublicKey) {
      trustedKeyValid = false;
      reasons.push('signature_key_untrusted');
    } else if (expectedPublicKey !== snapshot.public_key_raw_b64) {
      trustedKeyValid = false;
      reasons.push('signature_key_material_mismatch');
    }
  }

  const manifestCanonical = canonicalManifestJson(snapshot.manifest);
  const messageBytes = new TextEncoder().encode(manifestCanonical);
  let signatureValid = false;
  try {
    const signature = decodeBase64(snapshot.signature);
    const publicKeyRaw = decodeBase64(snapshot.public_key_raw_b64);
    signatureValid = await verifyEd25519(messageBytes, signature, publicKeyRaw);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    reasons.push('signature_invalid');
  }

  let manifestHashValid = true;
  const computedManifestHash = await sha256Hex(messageBytes);
  if (snapshot.manifest_hash) {
    if (!isSha256Hex(snapshot.manifest_hash)) {
      manifestHashValid = false;
      reasons.push('manifest_hash_format_invalid');
    } else if (!computedManifestHash) {
      manifestHashValid = false;
      reasons.push('manifest_hash_unavailable');
    } else if (computedManifestHash !== snapshot.manifest_hash.toLowerCase()) {
      manifestHashValid = false;
      reasons.push('manifest_hash_mismatch');
    }
  } else if (requireManifestHash) {
    manifestHashValid = false;
    reasons.push('manifest_hash_missing');
  }

  if (validateAssetList) {
    reasons.push(...assetListValidationReasons(snapshot.manifest.asset_list));
  }

  let serverVerified = true;
  if (requireServerVerified) {
    if (!snapshot.verified) {
      serverVerified = false;
      reasons.push('server_verification_failed');
    }
    if (snapshot.verification) {
      if (snapshot.verification.signature_valid === false) {
        serverVerified = false;
        reasons.push('server_signature_invalid');
      }
      if (snapshot.verification.manifest_hash_valid === false) {
        serverVerified = false;
        reasons.push('server_manifest_hash_invalid');
      }
      if (snapshot.verification.artifact_valid === false) {
        serverVerified = false;
        reasons.push('server_artifact_invalid');
      }
      if (Array.isArray(snapshot.verification.reasons)) {
        for (const reason of snapshot.verification.reasons) {
          if (typeof reason === 'string' && reason.trim().length > 0) {
            reasons.push(`server:${reason}`);
          }
        }
      }
    }
  }

  const normalizedReasons = [...new Set(reasons)];
  return {
    ok: signatureValid && trustedKeyValid && manifestHashValid && serverVerified && normalizedReasons.length === 0,
    signatureValid,
    trustedKeyValid,
    manifestHashValid,
    serverVerified,
    reasons: normalizedReasons,
  };
}

export async function verifyWorldSnapshotSignature(snapshot: WorldSnapshotPayload) {
  const integrity = await verifyWorldSnapshotIntegrity(snapshot, {
    requireServerVerified: false,
    requireManifestHash: false,
    validateAssetList: false,
  });
  return integrity.signatureValid && integrity.trustedKeyValid;
}
