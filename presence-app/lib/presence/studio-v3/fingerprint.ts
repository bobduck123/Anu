import type { PresenceEditableConfig } from "../../api/types.ts";
import {
  STUDIO_V3_COMPARABLE_KEYS,
  STUDIO_V3_POST_KEYS,
  type StudioV3BaseIdentity,
  type StudioV3ComparableConfig,
  type StudioV3PostPayload,
} from "./model.ts";

export const STUDIO_V3_COMPILER_OWNED_PATHS = [
  "$.renderer_key",
  "$.scene_config.studio_v2",
  "$.style_dna.studio_v2",
  "$.motion_config.studio_v2",
  "$.asset_config.studio_v2",
  "$.content_config.studio_v2",
  "$.roomkey_config.studio_v2",
  "$.enquiry_config.studio_v2",
] as const;

export function validateStudioV3BaseIdentity(
  config: PresenceEditableConfig | null | undefined,
  sourceKind: "draft" | "published",
): StudioV3BaseIdentity | null {
  if (!config) return null;
  const configId = config.id;
  const roomId = config.room_id;
  const version = config.version;
  if (
    typeof configId !== "number" ||
    typeof roomId !== "number" ||
    typeof version !== "number" ||
    !Number.isInteger(configId) ||
    !Number.isInteger(roomId) ||
    !Number.isInteger(version)
  ) return null;
  if (!config.schema_version?.trim()) return null;
  return {
    sourceKind,
    configId,
    roomId,
    version,
    status: String(config.status || sourceKind),
    schemaVersion: config.schema_version,
    updatedAt: config.updated_at,
  };
}

export function comparableConfigFromEditableConfig(config: PresenceEditableConfig): StudioV3ComparableConfig {
  if (!config.schema_version) throw new Error("Studio V3 comparable config requires schema_version.");
  return {
    schema_version: config.schema_version,
    renderer_key: config.renderer_key ?? null,
    scene_config: plainRecord(config.scene_config),
    style_dna: plainRecord(config.style_dna),
    motion_config: plainRecord(config.motion_config),
    asset_config: plainRecord(config.asset_config),
    content_config: plainRecord(config.content_config),
    roomkey_config: plainRecord(config.roomkey_config),
    enquiry_config: plainRecord(config.enquiry_config),
    locked_fields: plainRecord(config.locked_fields),
  };
}

export function projectStudioV3WireJson<T>(value: T): T {
  assertJsonSafe(value, "$", new Set());
  return JSON.parse(JSON.stringify(value)) as T;
}

export function studioV3PostPayloadFromComparable(comparable: StudioV3ComparableConfig): StudioV3PostPayload {
  const projected = projectStudioV3WireJson(comparable);
  for (const key of STUDIO_V3_COMPARABLE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(projected, key)) {
      throw new Error(`Studio V3 comparable config lost required field ${key}.`);
    }
  }
  const payload = Object.fromEntries(STUDIO_V3_POST_KEYS.map((key) => [key, projected[key]])) as StudioV3PostPayload;
  const projectedPayload = projectStudioV3WireJson(payload);
  const keys = Object.keys(projectedPayload).sort();
  const expected = [...STUDIO_V3_POST_KEYS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error("Studio V3 POST payload must contain exactly the nine transport fields after JSON projection.");
  }
  return projectedPayload;
}

export function projectStudioV3StoredSemanticConfig(input: StudioV3ComparableConfig): StudioV3ComparableConfig {
  const projected = projectStudioV3WireJson(input);
  return {
    schema_version: projected.schema_version,
    renderer_key: projected.renderer_key,
    scene_config: stripPrivateDraftTransport(projected.scene_config),
    style_dna: projected.style_dna,
    motion_config: projected.motion_config,
    asset_config: stripPrivateDraftTransport(projected.asset_config),
    content_config: stripPrivateDraftTransport(projected.content_config),
    roomkey_config: projected.roomkey_config,
    enquiry_config: projected.enquiry_config,
    locked_fields: projected.locked_fields,
  };
}

export function canonicalizeStudioV3BaseConfig(input: StudioV3ComparableConfig): string {
  return JSON.stringify(canonicalValue(input));
}

export async function fingerprintStudioV3BaseConfig(input: StudioV3ComparableConfig): Promise<string> {
  const canonical = canonicalizeStudioV3BaseConfig(projectStudioV3StoredSemanticConfig(input));
  const bytes = new TextEncoder().encode(canonical);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", bytes);
    return hex(new Uint8Array(digest));
  }
  return stableBrowserSafeDigest(canonical);
}

export function diffStudioV3OwnedConfig(
  base: StudioV3ComparableConfig,
  candidate: StudioV3ComparableConfig,
): string[] {
  const projectedBase = projectStudioV3StoredSemanticConfig(projectStudioV3WireJson(base));
  const projectedCandidate = projectStudioV3StoredSemanticConfig(projectStudioV3WireJson(candidate));
  const changed = diffPaths(projectedBase, projectedCandidate, "$");
  return changed.filter((path) => !isOwnedPath(path));
}

function isOwnedPath(path: string): boolean {
  if (path === "$.renderer_key") return true;
  return STUDIO_V3_COMPILER_OWNED_PATHS.some((owned) => path === owned || path.startsWith(`${owned}.`) || path.startsWith(`${owned}[`));
}

function stripPrivateDraftTransport(value: unknown): Record<string, unknown> {
  return visit(value) as Record<string, unknown>;

  function visit(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(visit);
    if (!item || typeof item !== "object") return item;
    const record = item as Record<string, unknown>;
    const qualifies = typeof record.media_id === "string" &&
      record.media_id.trim().length > 0 &&
      record.visibility === "private_draft";
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      if (qualifies && (key === "url" || key === "preview_expires_at")) continue;
      next[key] = visit(child);
    }
    return next;
  }
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonicalValue(child)]),
  );
}

function diffPaths(a: unknown, b: unknown, path: string): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!isContainer(a) || !isContainer(b) || Array.isArray(a) !== Array.isArray(b)) return [path];
  if (Array.isArray(a) && Array.isArray(b)) {
    const length = Math.max(a.length, b.length);
    return Array.from({ length }, (_, index) => diffPaths(a[index], b[index], `${path}[${index}]`)).flat();
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aRecord), ...Object.keys(bRecord)]);
  return [...keys].flatMap((key) => diffPaths(aRecord[key], bRecord[key], `${path}.${key}`));
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return Boolean(value && typeof value === "object");
}

function assertJsonSafe(value: unknown, path: string, seen: Set<object>) {
  if (value === undefined) {
    if (path === "$") throw new Error("Studio V3 JSON projection rejects root undefined.");
    return;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Studio V3 JSON projection rejects non-finite number at ${path}.`);
    return;
  }
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    throw new Error(`Studio V3 JSON projection rejects unsafe value at ${path}.`);
  }
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw new Error(`Studio V3 JSON projection rejects cycle at ${path}.`);
  if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
    throw new Error(`Studio V3 JSON projection rejects custom object at ${path}.`);
  }
  if (typeof (value as { toJSON?: unknown }).toJSON === "function") {
    throw new Error(`Studio V3 JSON projection rejects toJSON transformation at ${path}.`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index) || value[index] === undefined) {
        throw new Error(`Studio V3 JSON projection rejects sparse or undefined array entry at ${path}[${index}].`);
      }
      assertJsonSafe(value[index], `${path}[${index}]`, seen);
    }
  } else {
    for (const key of Object.keys(value)) assertJsonSafe((value as Record<string, unknown>)[key], `${path}.${key}`, seen);
  }
  seen.delete(value);
}

function plainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableBrowserSafeDigest(value: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    a ^= code;
    a = Math.imul(a, 0x01000193) >>> 0;
    b ^= code + index;
    b = Math.imul(b, 0x85ebca6b) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`.repeat(4).slice(0, 64);
}
