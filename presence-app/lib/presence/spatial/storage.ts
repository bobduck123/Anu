import { compileSpatialRoom } from "./compile.ts";
import {
  ID_PATTERN,
  SPATIAL_DRAFT_SCHEMA_VERSION,
  type SpatialDraftEnvelope,
  type SpatialRoomDefinition,
  type SpatialValidationIssue,
  type SpatialValidationResult,
} from "./model.ts";
import { utf8Bytes, validateSpatialRoomDefinition } from "./validate.ts";

export interface SpatialStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SPATIAL_DRAFT_STORAGE_PREFIX = "presence-spatial:internal-draft:v1";
export const SPATIAL_DRAFT_ENCODED_BUDGET_BYTES = 256 * 1024;

export function spatialDraftStorageKey(roomId: string): string {
  if (!ID_PATTERN.test(roomId)) throw new Error("Invalid spatial room ID.");
  return `${SPATIAL_DRAFT_STORAGE_PREFIX}:${encodeURIComponent(roomId)}`;
}

export function spatialDraftPreviousStorageKey(roomId: string): string {
  return `${spatialDraftStorageKey(roomId)}:previous`;
}

export function createSpatialDraftEnvelope(
  room: SpatialRoomDefinition,
  savedAt = new Date().toISOString(),
): SpatialDraftEnvelope {
  const compiled = compileSpatialRoom(room);
  if (!compiled.ok) throw new Error(`Cannot save invalid spatial room: ${compiled.issues[0]?.message ?? "unknown validation error"}`);
  return {
    schemaVersion: SPATIAL_DRAFT_SCHEMA_VERSION,
    roomId: room.id,
    fixtureRevision: room.revision,
    roomFingerprint: compiled.plan.fingerprint,
    savedAt,
    room,
  };
}

export function encodeSpatialDraftEnvelope(envelope: SpatialDraftEnvelope): string {
  const validation = validateSpatialDraftEnvelope(envelope);
  if (!validation.ok) throw new Error(`Cannot encode invalid spatial draft: ${validation.issues[0]?.message ?? "unknown validation error"}`);
  return JSON.stringify(envelope);
}

export function decodeSpatialDraftEnvelope(value: string): SpatialValidationResult<SpatialDraftEnvelope> {
  if (utf8Bytes(value) > SPATIAL_DRAFT_ENCODED_BUDGET_BYTES) {
    return { ok: false, issues: [{ path: "$", code: "draft-budget", message: "Spatial draft exceeds the 256 KB encoded limit." }] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, issues: [{ path: "$", code: "json", message: "Spatial draft is not valid JSON." }] };
  }
  return validateSpatialDraftEnvelope(parsed);
}

export function validateSpatialDraftEnvelope(value: unknown): SpatialValidationResult<SpatialDraftEnvelope> {
  const issues: SpatialValidationIssue[] = [];
  if (!isPlainRecord(value)) return { ok: false, issues: [{ path: "$", code: "object", message: "Spatial draft must be a plain object." }] };
  const allowed = new Set(["schemaVersion", "roomId", "fixtureRevision", "roomFingerprint", "savedAt", "room"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push({ path: `$.${key}`, code: "unknown-key", message: "Unknown draft fields are rejected." });
  for (const key of allowed) if (!(key in value)) issues.push({ path: `$.${key}`, code: "missing-key", message: "Required draft field is missing." });
  if (value.schemaVersion !== SPATIAL_DRAFT_SCHEMA_VERSION) issues.push({ path: "schemaVersion", code: "schema", message: "Unsupported spatial draft schema." });
  if (typeof value.roomId !== "string" || !ID_PATTERN.test(value.roomId)) issues.push({ path: "roomId", code: "id", message: "Invalid room ID." });
  if (typeof value.fixtureRevision !== "number" || !Number.isInteger(value.fixtureRevision) || value.fixtureRevision < 1) issues.push({ path: "fixtureRevision", code: "revision", message: "Invalid fixture revision." });
  if (typeof value.roomFingerprint !== "string" || !/^fnv1a-[0-9a-f]{8}$/.test(value.roomFingerprint)) issues.push({ path: "roomFingerprint", code: "fingerprint", message: "Invalid room fingerprint." });
  if (typeof value.savedAt !== "string" || !Number.isFinite(Date.parse(value.savedAt))) issues.push({ path: "savedAt", code: "date", message: "Invalid saved timestamp." });
  const roomValidation = validateSpatialRoomDefinition(value.room);
  if (!roomValidation.ok) issues.push(...roomValidation.issues.map((item) => ({ ...item, path: `room.${item.path}` })));
  if (issues.length > 0 || !roomValidation.ok) return { ok: false, issues };
  const envelope = value as unknown as SpatialDraftEnvelope;
  const compiled = compileSpatialRoom(envelope.room);
  if (!compiled.ok) return compiled;
  if (envelope.roomId !== envelope.room.id || envelope.fixtureRevision !== envelope.room.revision) {
    return { ok: false, issues: [{ path: "$", code: "identity", message: "Draft envelope identity must match its room." }] };
  }
  if (envelope.roomFingerprint !== compiled.plan.fingerprint) {
    return { ok: false, issues: [{ path: "roomFingerprint", code: "fingerprint-mismatch", message: "Draft fingerprint does not match room contents." }] };
  }
  return { ok: true, value: envelope, issues: [] };
}

export class SpatialDraftStorage {
  constructor(private readonly storage: SpatialStorageLike) {}

  save(room: SpatialRoomDefinition, savedAt?: string): SpatialDraftEnvelope {
    const envelope = createSpatialDraftEnvelope(room, savedAt);
    const activeKey = spatialDraftStorageKey(room.id);
    const previousKey = spatialDraftPreviousStorageKey(room.id);
    const encoded = encodeSpatialDraftEnvelope(envelope);
    const active = this.storage.getItem(activeKey);
    const previous = this.storage.getItem(previousKey);
    withStorageRollback(
      this.storage,
      [
        { key: previousKey, value: previous },
        { key: activeKey, value: active },
      ],
      () => {
        if (active !== null && decodeSpatialDraftEnvelope(active).ok) this.storage.setItem(previousKey, active);
        this.storage.setItem(activeKey, encoded);
      },
    );
    return envelope;
  }

  load(roomId: string): SpatialValidationResult<SpatialDraftEnvelope> | null {
    const value = this.storage.getItem(spatialDraftStorageKey(roomId));
    return value === null ? null : decodeSpatialDraftEnvelope(value);
  }

  loadPrevious(roomId: string): SpatialValidationResult<SpatialDraftEnvelope> | null {
    const value = this.storage.getItem(spatialDraftPreviousStorageKey(roomId));
    return value === null ? null : decodeSpatialDraftEnvelope(value);
  }

  revert(roomId: string): SpatialValidationResult<SpatialDraftEnvelope> | null {
    const activeKey = spatialDraftStorageKey(roomId);
    const previousKey = spatialDraftPreviousStorageKey(roomId);
    const previousRaw = this.storage.getItem(previousKey);
    if (previousRaw === null) return null;
    const previous = decodeSpatialDraftEnvelope(previousRaw);
    if (!previous.ok) return previous;
    const activeRaw = this.storage.getItem(activeKey);
    const active = activeRaw === null ? null : decodeSpatialDraftEnvelope(activeRaw);
    withStorageRollback(
      this.storage,
      [
        { key: activeKey, value: activeRaw },
        { key: previousKey, value: previousRaw },
      ],
      () => {
        this.storage.setItem(activeKey, previousRaw);
        if (activeRaw !== null && active?.ok) this.storage.setItem(previousKey, activeRaw);
        else this.storage.removeItem(previousKey);
      },
    );
    return previous;
  }

  remove(roomId: string): void {
    const activeKey = spatialDraftStorageKey(roomId);
    const previousKey = spatialDraftPreviousStorageKey(roomId);
    const active = this.storage.getItem(activeKey);
    const previous = this.storage.getItem(previousKey);
    withStorageRollback(
      this.storage,
      [
        { key: activeKey, value: active },
        { key: previousKey, value: previous },
      ],
      () => {
        this.storage.removeItem(activeKey);
        this.storage.removeItem(previousKey);
      },
    );
  }
}

interface SpatialStorageSnapshot {
  key: string;
  value: string | null;
}

function withStorageRollback(
  storage: SpatialStorageLike,
  snapshotsInMutationOrder: readonly SpatialStorageSnapshot[],
  mutate: () => void,
): void {
  try {
    mutate();
  } catch (error) {
    for (let index = snapshotsInMutationOrder.length - 1; index >= 0; index -= 1) {
      const snapshot = snapshotsInMutationOrder[index];
      try {
        if (snapshot.value === null) storage.removeItem(snapshot.key);
        else storage.setItem(snapshot.key, snapshot.value);
      } catch {
        // Continue restoring the other key; rollback failures must not mask the original storage error.
      }
    }
    throw error;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
