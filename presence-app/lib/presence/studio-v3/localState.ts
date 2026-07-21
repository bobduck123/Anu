import {
  STUDIO_V3_LOCAL_SCHEMA_VERSION,
  type StudioV3BaseIdentity,
  type StudioV3LayerLock,
  type StudioV3Look,
  type StudioV3LookValues,
  type StudioV3ModePreference,
  type StudioV3Placement,
} from "./model.ts";
import { makeStudioV3ObjectId } from "./sourceRefs.ts";

export interface StudioV3OwnerPartitionResult {
  key: string | null;
  reason?: string;
}

export interface StudioV3PresenceLocalEnvelope {
  schemaVersion: string;
  ownerPartitionKey: string;
  scope: "presence";
  presenceId: number;
  baseIdentity: StudioV3BaseIdentity;
  baseFingerprint: string;
  mode: StudioV3ModePreference;
  activeRoomId?: string;
  activeLookId?: string;
  namedLooks: StudioV3Look[];
  locks: StudioV3LayerLock[];
  updatedAt: string;
}

export interface StudioV3RoomLocalEnvelope {
  schemaVersion: string;
  ownerPartitionKey: string;
  scope: "room";
  presenceId: number;
  roomId: string;
  baseIdentity: StudioV3BaseIdentity;
  baseFingerprint: string;
  placementSourceRefs: Record<string, string>;
  placements?: Array<Pick<StudioV3Placement, "id" | "roomId" | "sourceRef" | "collectionSourceRef" | "order" | "status" | "reason">>;
  locks: StudioV3LayerLock[];
  updatedAt: string;
}

type StudioV3StoredPlacement = NonNullable<StudioV3RoomLocalEnvelope["placements"]>[number];

export interface StudioV3LocalSnapshot {
  schemaVersion: string;
  ownerPartitionKey: string;
  presenceId: number;
  baseIdentity: StudioV3BaseIdentity;
  baseFingerprint: string;
  generation: string;
  presence: StudioV3PresenceLocalEnvelope;
  rooms: StudioV3RoomLocalEnvelope[];
}

interface StudioV3LocalSnapshotManifest {
  schemaVersion: string;
  ownerPartitionKey: string;
  presenceId: number;
  baseIdentity: StudioV3BaseIdentity;
  baseFingerprint: string;
  activeGeneration: string;
  previousGeneration?: string;
}

export interface StudioV3SnapshotExpectation {
  ownerPartitionKey: string;
  presenceId: number;
  baseIdentity: StudioV3BaseIdentity;
  baseFingerprint: string;
  roomIds: string[];
}

export function normalizeStudioV3ModePreference(value: unknown): StudioV3ModePreference {
  return value === "advanced-creative" ? "advanced-creative" : "simple";
}

export async function deriveStudioV3OwnerPartitionKey(input: {
  deploymentScope: string;
  validatedOwnerSubject?: string | number | null;
}): Promise<StudioV3OwnerPartitionResult> {
  const subject = String(input.validatedOwnerSubject ?? "").trim();
  const scope = String(input.deploymentScope || "local").trim();
  if (!subject) return { key: null, reason: "validated owner subject unavailable" };
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return { key: null, reason: "browser crypto unavailable" };
  }
  const material = new TextEncoder().encode(`${scope}\u001f${subject}`);
  try {
    const digest = await crypto.subtle.digest("SHA-256", material);
    return {
      key: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32),
    };
  } catch {
    return { key: null, reason: "browser crypto failed" };
  }
}

export function presenceEnvelopeKey(input: {
  ownerPartitionKey: string;
  presenceId: number;
  baseKind: StudioV3BaseIdentity["sourceKind"];
  configId: number;
  baseFingerprint: string;
}): string {
  return [
    "presence-studio-v3:prototype",
    input.ownerPartitionKey,
    "presence",
    String(input.presenceId),
    input.baseKind,
    String(input.configId),
    input.baseFingerprint,
  ].join(":");
}

export function roomEnvelopeKey(input: {
  ownerPartitionKey: string;
  presenceId: number;
  roomId: string;
  baseKind: StudioV3BaseIdentity["sourceKind"];
  configId: number;
  baseFingerprint: string;
}): string {
  return [
    "presence-studio-v3:prototype",
    input.ownerPartitionKey,
    "room",
    String(input.presenceId),
    input.roomId,
    input.baseKind,
    String(input.configId),
    input.baseFingerprint,
  ].join(":");
}

export function studioV3SnapshotManifestKey(input: Omit<StudioV3SnapshotExpectation, "roomIds">): string {
  return [
    "presence-studio-v3:prototype",
    input.ownerPartitionKey,
    "manifest",
    String(input.presenceId),
    input.baseIdentity.sourceKind,
    String(input.baseIdentity.configId),
    input.baseFingerprint,
  ].join(":");
}

export function studioV3SnapshotKey(input: Omit<StudioV3SnapshotExpectation, "roomIds"> & { generation: string }): string {
  return [
    "presence-studio-v3:prototype",
    input.ownerPartitionKey,
    "snapshot",
    String(input.presenceId),
    input.baseIdentity.sourceKind,
    String(input.baseIdentity.configId),
    input.baseFingerprint,
    input.generation,
  ].join(":");
}

export function writeStudioV3LocalSnapshot(input: {
  storage: Storage;
  expected: StudioV3SnapshotExpectation;
  presence: StudioV3PresenceLocalEnvelope;
  rooms: StudioV3RoomLocalEnvelope[];
  generation?: string;
}): { generation: string } {
  const generation = input.generation ?? createSnapshotGeneration();
  const snapshot: StudioV3LocalSnapshot = {
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    ownerPartitionKey: input.expected.ownerPartitionKey,
    presenceId: input.expected.presenceId,
    baseIdentity: input.expected.baseIdentity,
    baseFingerprint: input.expected.baseFingerprint,
    generation,
    presence: input.presence,
    rooms: input.rooms,
  };
  if (!validateStudioV3LocalSnapshot(snapshot, input.expected)) {
    throw new Error("Refusing to stage an invalid Studio V3 local snapshot.");
  }

  const snapshotKey = studioV3SnapshotKey({ ...input.expected, generation });
  input.storage.setItem(snapshotKey, JSON.stringify(snapshot));
  const staged = readLocalJson(input.storage, snapshotKey);
  if (!validateStudioV3LocalSnapshot(staged, input.expected)) {
    safelyQuarantineSnapshot(input.storage, snapshotKey, "invalid-staging");
    throw new Error("Studio V3 local snapshot staging validation failed.");
  }

  const manifestKey = studioV3SnapshotManifestKey(input.expected);
  const existing = validateStudioV3SnapshotManifest(readLocalJson(input.storage, manifestKey), input.expected);
  const manifest: StudioV3LocalSnapshotManifest = {
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    ownerPartitionKey: input.expected.ownerPartitionKey,
    presenceId: input.expected.presenceId,
    baseIdentity: input.expected.baseIdentity,
    baseFingerprint: input.expected.baseFingerprint,
    activeGeneration: generation,
    previousGeneration: existing?.activeGeneration,
  };
  try {
    input.storage.setItem(manifestKey, JSON.stringify(manifest));
    const promoted = validateStudioV3SnapshotManifest(readLocalJson(input.storage, manifestKey), input.expected);
    if (!promoted || promoted.activeGeneration !== generation) {
      throw new Error("Studio V3 local snapshot promotion failed.");
    }
    pruneUnreferencedSnapshotGenerations(input.storage, input.expected, promoted);
    return { generation };
  } catch (error) {
    safelyQuarantineSnapshot(input.storage, snapshotKey, "failed-promotion");
    throw error;
  }
}

export function readStudioV3LocalSnapshot(input: {
  storage: Storage;
  expected: StudioV3SnapshotExpectation;
}): { snapshot: StudioV3LocalSnapshot | null; source: "active" | "previous" | "none" | "unavailable" } {
  try {
    const manifestKey = studioV3SnapshotManifestKey(input.expected);
    const manifest = validateStudioV3SnapshotManifest(readLocalJson(input.storage, manifestKey), input.expected);
    if (!manifest) {
      if (input.storage.getItem(manifestKey) !== null) safelyQuarantineSnapshot(input.storage, manifestKey, "invalid-manifest");
      return { snapshot: null, source: "none" };
    }
    const active = readAndValidateSnapshot(input.storage, input.expected, manifest.activeGeneration);
    if (active) return { snapshot: active, source: "active" };
    safelyQuarantineSnapshot(input.storage, studioV3SnapshotKey({ ...input.expected, generation: manifest.activeGeneration }), "invalid-active");
    if (!manifest.previousGeneration || manifest.previousGeneration === manifest.activeGeneration) {
      return { snapshot: null, source: "none" };
    }
    const previous = readAndValidateSnapshot(input.storage, input.expected, manifest.previousGeneration);
    if (previous) {
      const repaired: StudioV3LocalSnapshotManifest = {
        ...manifest,
        activeGeneration: manifest.previousGeneration,
        previousGeneration: undefined,
      };
      input.storage.setItem(manifestKey, JSON.stringify(repaired));
      const confirmedRepair = validateStudioV3SnapshotManifest(readLocalJson(input.storage, manifestKey), input.expected);
      if (!confirmedRepair || confirmedRepair.activeGeneration !== previous.generation) {
        throw new Error("Studio V3 previous snapshot recovery could not repair the manifest.");
      }
      return { snapshot: previous, source: "previous" };
    }
    safelyQuarantineSnapshot(input.storage, studioV3SnapshotKey({ ...input.expected, generation: manifest.previousGeneration }), "invalid-previous");
    return { snapshot: null, source: "none" };
  } catch {
    return { snapshot: null, source: "unavailable" };
  }
}

export function clearStudioV3LocalStateForOwnerPartition(input: {
  storage: Storage;
  ownerPartitionKey: string;
}): number {
  const prefix = `presence-studio-v3:prototype:${input.ownerPartitionKey}:`;
  const keys = Array.from({ length: input.storage.length }, (_, index) => input.storage.key(index))
    .filter((key): key is string => Boolean(key && key.startsWith(prefix)));
  for (const key of keys) input.storage.removeItem(key);
  return keys.length;
}

export function pruneStudioV3LocalEnvelopesForOwnerSwitch(input: {
  storage: Storage;
  ownerPartitionKey: string;
  currentPresence?: {
    presenceId: number;
    baseKind: StudioV3BaseIdentity["sourceKind"];
    configId: number;
    baseFingerprint: string;
    roomIds: string[];
  };
}): number {
  const keys = Array.from({ length: input.storage.length }, (_, index) => input.storage.key(index))
    .filter((key): key is string => Boolean(key))
    .filter((key) => key.startsWith("presence-studio-v3:prototype:"));
  let removed = 0;
  for (const key of keys) {
    const parts = key.split(":");
    const ownerPartitionKey = parts[2];
    const scope = parts[3];
    if (scope !== "presence" && scope !== "room" && scope !== "manifest" && scope !== "snapshot" && scope !== "quarantine") continue;
    if (ownerPartitionKey !== input.ownerPartitionKey) continue;
    const isStaleCurrentPresence = input.currentPresence
      ? isStaleCurrentPresenceKey(parts, input.currentPresence)
      : false;
    if (isStaleCurrentPresence) {
      input.storage.removeItem(key);
      removed += 1;
    }
  }
  return removed;
}

function isStaleCurrentPresenceKey(
  parts: string[],
  current: NonNullable<Parameters<typeof pruneStudioV3LocalEnvelopesForOwnerSwitch>[0]["currentPresence"]>,
): boolean {
  const scope = parts[3];
  if (scope === "manifest" || scope === "snapshot" || scope === "quarantine") {
    const presenceId = Number(parts[4]);
    if (presenceId !== current.presenceId) return false;
    return parts[5] !== current.baseKind ||
      Number(parts[6]) !== current.configId ||
      parts[7] !== current.baseFingerprint;
  }
  const presenceId = Number(parts[4]);
  if (presenceId !== current.presenceId) return false;
  if (scope === "presence") {
    return parts[5] !== current.baseKind ||
      Number(parts[6]) !== current.configId ||
      parts[7] !== current.baseFingerprint;
  }
  if (scope === "room") {
    return !current.roomIds.includes(parts[5]) ||
      parts[6] !== current.baseKind ||
      Number(parts[7]) !== current.configId ||
      parts[8] !== current.baseFingerprint;
  }
  return true;
}

function createSnapshotGeneration(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAndValidateSnapshot(
  storage: Storage,
  expected: StudioV3SnapshotExpectation,
  generation: string,
): StudioV3LocalSnapshot | null {
  return validateStudioV3LocalSnapshot(
    readLocalJson(storage, studioV3SnapshotKey({ ...expected, generation })),
    expected,
  );
}

function pruneUnreferencedSnapshotGenerations(
  storage: Storage,
  expected: StudioV3SnapshotExpectation,
  manifest: StudioV3LocalSnapshotManifest,
): void {
  const prefix = `presence-studio-v3:prototype:${expected.ownerPartitionKey}:snapshot:${expected.presenceId}:${expected.baseIdentity.sourceKind}:${expected.baseIdentity.configId}:${expected.baseFingerprint}:`;
  const keep = new Set([manifest.activeGeneration, manifest.previousGeneration].filter((generation): generation is string => Boolean(generation)));
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key && key.startsWith(prefix)));
  for (const key of keys) {
    const generation = key.slice(prefix.length).split(":")[0];
    if (!keep.has(generation)) storage.removeItem(key);
  }
}

function validateStudioV3LocalSnapshot(
  value: unknown,
  expected: StudioV3SnapshotExpectation,
): StudioV3LocalSnapshot | null {
  const snapshot = value && typeof value === "object" ? value as Partial<StudioV3LocalSnapshot> : null;
  if (!snapshot || !hasOnlyKeys(snapshot, ["schemaVersion", "ownerPartitionKey", "presenceId", "baseIdentity", "baseFingerprint", "generation", "presence", "rooms"])) return null;
  if (snapshot.schemaVersion !== STUDIO_V3_LOCAL_SCHEMA_VERSION || typeof snapshot.generation !== "string" || !/^[a-z0-9-]+$/i.test(snapshot.generation)) return null;
  if (snapshot.ownerPartitionKey !== expected.ownerPartitionKey || snapshot.presenceId !== expected.presenceId || snapshot.baseFingerprint !== expected.baseFingerprint) return null;
  if (!sameIdentity(snapshot.baseIdentity, expected.baseIdentity) || containsForbiddenLocalValue(snapshot)) return null;
  const presence = validateStudioV3PresenceEnvelope(snapshot.presence, expected);
  if (!presence || !Array.isArray(snapshot.rooms) || snapshot.rooms.length !== expected.roomIds.length) return null;
  const rooms: StudioV3RoomLocalEnvelope[] = [];
  for (const candidate of snapshot.rooms) {
    const roomId = candidate && typeof candidate === "object" ? (candidate as { roomId?: unknown }).roomId : null;
    if (typeof roomId !== "string") return null;
    const room = validateStudioV3RoomEnvelope(candidate, { ...expected, roomId });
    if (!room) return null;
    rooms.push(room);
  }
  if (new Set(rooms.map((room) => room.roomId)).size !== expected.roomIds.length || !expected.roomIds.every((roomId) => rooms.some((room) => room.roomId === roomId))) return null;
  if (!rooms.every((room) => room.updatedAt === presence.updatedAt)) return null;
  return { ...snapshot, presence, rooms } as StudioV3LocalSnapshot;
}

function validateStudioV3SnapshotManifest(
  value: unknown,
  expected: Omit<StudioV3SnapshotExpectation, "roomIds">,
): StudioV3LocalSnapshotManifest | null {
  const manifest = value && typeof value === "object" ? value as Partial<StudioV3LocalSnapshotManifest> : null;
  if (!manifest || !hasOnlyKeys(manifest, ["schemaVersion", "ownerPartitionKey", "presenceId", "baseIdentity", "baseFingerprint", "activeGeneration", "previousGeneration"])) return null;
  if (manifest.schemaVersion !== STUDIO_V3_LOCAL_SCHEMA_VERSION || typeof manifest.activeGeneration !== "string" || !/^[a-z0-9-]+$/i.test(manifest.activeGeneration)) return null;
  if (manifest.previousGeneration !== undefined && (typeof manifest.previousGeneration !== "string" || !/^[a-z0-9-]+$/i.test(manifest.previousGeneration))) return null;
  if (manifest.ownerPartitionKey !== expected.ownerPartitionKey || manifest.presenceId !== expected.presenceId || manifest.baseFingerprint !== expected.baseFingerprint) return null;
  if (!sameIdentity(manifest.baseIdentity, expected.baseIdentity) || containsForbiddenLocalValue(manifest)) return null;
  return manifest as StudioV3LocalSnapshotManifest;
}

function safelyQuarantineSnapshot(storage: Storage, sourceKey: string, reason: string): void {
  try {
    storage.removeItem(sourceKey);
    storage.setItem(`${sourceKey}:quarantine`, JSON.stringify({ reason, quarantinedAt: new Date().toISOString() }));
  } catch {
    // Read recovery falls back to memory-only if browser storage is unavailable.
  }
}

function readLocalJson(storage: Storage, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function validateStudioV3PresenceEnvelope(
  value: unknown,
  expected: {
    ownerPartitionKey: string;
    presenceId: number;
    baseIdentity: StudioV3BaseIdentity;
    baseFingerprint: string;
  },
): StudioV3PresenceLocalEnvelope | null {
  const envelope = value && typeof value === "object" ? value as Partial<StudioV3PresenceLocalEnvelope> : null;
  if (!envelope || envelope.scope !== "presence") return null;
  if (envelope.schemaVersion !== STUDIO_V3_LOCAL_SCHEMA_VERSION) return null;
  if (envelope.ownerPartitionKey !== expected.ownerPartitionKey) return null;
  if (envelope.presenceId !== expected.presenceId) return null;
  if (envelope.baseFingerprint !== expected.baseFingerprint) return null;
  if (!sameIdentity(envelope.baseIdentity, expected.baseIdentity)) return null;
  if (containsForbiddenLocalValue(envelope)) return null;
  if (!hasOnlyKeys(envelope, ["schemaVersion", "ownerPartitionKey", "scope", "presenceId", "baseIdentity", "baseFingerprint", "mode", "activeRoomId", "activeLookId", "namedLooks", "locks", "updatedAt"])) return null;
  if (envelope.mode !== "simple" && envelope.mode !== "advanced-creative") return null;
  if (envelope.activeRoomId !== undefined && typeof envelope.activeRoomId !== "string") return null;
  if (envelope.activeLookId !== undefined && typeof envelope.activeLookId !== "string") return null;
  if (!Array.isArray(envelope.namedLooks) || !envelope.namedLooks.every(isSafeLook)) return null;
  if (!Array.isArray(envelope.locks) || !envelope.locks.every(isSafeLock)) return null;
  if (!envelope.locks.every((lock) => lock.scopeKind === "presence" && lock.scopeId === String(expected.presenceId))) return null;
  if (typeof envelope.updatedAt !== "string") return null;
  return {
    ...envelope,
    mode: envelope.mode,
    activeRoomId: typeof envelope.activeRoomId === "string" ? envelope.activeRoomId : undefined,
    namedLooks: envelope.namedLooks,
    locks: envelope.locks,
    updatedAt: envelope.updatedAt,
  } as StudioV3PresenceLocalEnvelope;
}

export function validateStudioV3RoomEnvelope(
  value: unknown,
  expected: {
    ownerPartitionKey: string;
    presenceId: number;
    roomId: string;
    baseIdentity: StudioV3BaseIdentity;
    baseFingerprint: string;
  },
): StudioV3RoomLocalEnvelope | null {
  const envelope = value && typeof value === "object" ? value as Partial<StudioV3RoomLocalEnvelope> : null;
  if (!envelope || envelope.scope !== "room") return null;
  if (envelope.schemaVersion !== STUDIO_V3_LOCAL_SCHEMA_VERSION) return null;
  if (envelope.ownerPartitionKey !== expected.ownerPartitionKey) return null;
  if (envelope.presenceId !== expected.presenceId || envelope.roomId !== expected.roomId) return null;
  if (envelope.baseFingerprint !== expected.baseFingerprint) return null;
  if (!sameIdentity(envelope.baseIdentity, expected.baseIdentity)) return null;
  if (containsForbiddenLocalValue(envelope)) return null;
  if (!hasOnlyKeys(envelope, ["schemaVersion", "ownerPartitionKey", "scope", "presenceId", "roomId", "baseIdentity", "baseFingerprint", "placementSourceRefs", "placements", "locks", "updatedAt"])) return null;
  if (!isPlainStringRecord(envelope.placementSourceRefs)) return null;
  if (!Array.isArray(envelope.placements) || !envelope.placements.every(isSafeStoredPlacement)) return null;
  if (!envelope.placements.every((placement) => placement.roomId === expected.roomId)) return null;
  if (!Array.isArray(envelope.locks) || !envelope.locks.every(isSafeLock)) return null;
  if (!envelope.locks.every((lock) => lock.scopeKind === "room" && lock.scopeId === expected.roomId)) return null;
  if (typeof envelope.updatedAt !== "string") return null;
  return {
    ...envelope,
    placementSourceRefs: envelope.placementSourceRefs,
    placements: envelope.placements,
    locks: envelope.locks,
    updatedAt: envelope.updatedAt,
  } as StudioV3RoomLocalEnvelope;
}

function isPlainStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(([key, child]) => (
    typeof key === "string" && typeof child === "string"
  ));
}

function hasOnlyKeys(value: object, allowed: string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function isSafeStoredPlacement(value: unknown): value is StudioV3StoredPlacement {
  const placement = value && typeof value === "object" ? value as Partial<StudioV3Placement> : null;
  if (!placement) return false;
  if (!hasOnlyKeys(placement, ["id", "roomId", "sourceRef", "collectionSourceRef", "order", "status", "reason"])) return false;
  if (
    typeof placement.id !== "string" ||
    typeof placement.roomId !== "string" ||
    typeof placement.sourceRef !== "string" ||
    typeof placement.order !== "number" ||
    !["placed", "duplicate", "incompatible", "shelved"].includes(String(placement.status))
  ) {
    return false;
  }
  if (placement.collectionSourceRef !== undefined && !/^collection:\d+$/.test(String(placement.collectionSourceRef))) return false;
  if (placement.reason !== undefined && typeof placement.reason !== "string") return false;
  if (placement.id !== makeStudioV3ObjectId(placement.roomId, placement.sourceRef)) return false;
  return true;
}

function isSafeLook(value: unknown): value is StudioV3Look {
  const look = value && typeof value === "object" ? value as Partial<StudioV3Look> : null;
  if (!look) return false;
  if (!hasOnlyKeys(look, ["id", "name", "origin", "provenance", "values", "createdAt", "updatedAt"])) return false;
  if (
    typeof look.id !== "string" ||
    typeof look.name !== "string" ||
    typeof look.provenance !== "string" ||
    (look.origin !== "system" && look.origin !== "owner") ||
    !isSafeLookValues(look.values)
  ) {
    return false;
  }
  if (!/^saved-from:[a-z0-9-]+$/i.test(look.provenance)) return false;
  if (look.createdAt !== undefined && typeof look.createdAt !== "string") return false;
  if (look.updatedAt !== undefined && typeof look.updatedAt !== "string") return false;
  return /^named:[a-z0-9-]+$/i.test(look.id);
}

function isSafeLookValues(value: unknown): value is StudioV3LookValues {
  const values = value && typeof value === "object" ? value as Partial<StudioV3LookValues> : null;
  if (!values) return false;
  if (!hasOnlyKeys(values, ["background", "accentColor", "texture", "borderStyle", "objectRadius", "shadowDepth", "headingWeight", "motionIntensity", "publicStylePreset", "roomStyleId"])) return false;
  return (
    typeof values.background === "string" &&
    typeof values.accentColor === "string" &&
    ["paper", "grain", "linen", "none"].includes(String(values.texture)) &&
    ["hairline", "framed", "none"].includes(String(values.borderStyle)) &&
    typeof values.objectRadius === "number" &&
    typeof values.shadowDepth === "number" &&
    typeof values.headingWeight === "number" &&
    ["still", "gentle", "living"].includes(String(values.motionIntensity)) &&
    ["gallery-p2", "bbbvision-threshold-gallery"].includes(String(values.publicStylePreset)) &&
    ["threshold-portal", "gallery-wall"].includes(String(values.roomStyleId))
  );
}

function isSafeLock(value: unknown): value is StudioV3LayerLock {
  const lock = value && typeof value === "object" ? value as Partial<StudioV3LayerLock> : null;
  if (!lock) return false;
  if (!hasOnlyKeys(lock, ["id", "scopeKind", "scopeId", "layer", "value", "reason"])) return false;
  if (containsForbiddenLocalValue(lock.value)) return false;
  if (lock.layer === "motion-atmosphere" && !isSafeMotionAtmosphereLockValue(lock.value)) return false;
  return (
    typeof lock.id === "string" &&
    typeof lock.scopeId === "string" &&
    typeof lock.reason === "string" &&
    ["presence", "room", "collection", "piece"].includes(String(lock.scopeKind)) &&
    ["presence-look", "room-style", "collection-presentation", "piece-treatment", "motion-atmosphere", "navigation-journey"].includes(String(lock.layer)) &&
    lock.value !== null &&
    lock.value !== undefined
  );
}

function isSafeMotionAtmosphereLockValue(value: unknown): value is Pick<StudioV3LookValues, "motionIntensity" | "background"> {
  const payload = value && typeof value === "object" ? value as Partial<Pick<StudioV3LookValues, "motionIntensity" | "background">> : null;
  if (!payload || !hasOnlyKeys(payload, ["motionIntensity", "background"])) return false;
  return typeof payload.background === "string" && ["still", "gentle", "living"].includes(String(payload.motionIntensity));
}

export function containsForbiddenLocalValue(value: unknown): boolean {
  if (typeof value === "string") {
    return /(?:https?|ftp|sftp|file|ws|wss|mailto|javascript):\/?/i.test(value) ||
      /(?:^|["'\s])\/\/[^\s"']+/i.test(value) ||
      /blob:/i.test(value) ||
      /data:/i.test(value) ||
      /(?:url|image-set|cross-fade|element|paint|cursor|src)\s*\(/i.test(value) ||
      /^\/(?!$)/i.test(value) ||
      /preview_expires_at|private_draft|bearer|service_role|access_token/i.test(value);
  }
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenLocalValue);
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => (
    /token|secret|url|blob|base64|preview_expires_at/i.test(key) || containsForbiddenLocalValue(child)
  ));
}

function sameIdentity(a: StudioV3BaseIdentity | undefined, b: StudioV3BaseIdentity): boolean {
  if (!a) return false;
  if (!hasOnlyKeys(a, ["sourceKind", "configId", "roomId", "version", "status", "schemaVersion", "updatedAt"])) return false;
  return (
    a.sourceKind === b.sourceKind &&
    a.configId === b.configId &&
    a.roomId === b.roomId &&
    a.version === b.version &&
    a.status === b.status &&
    a.schemaVersion === b.schemaVersion
  );
}
