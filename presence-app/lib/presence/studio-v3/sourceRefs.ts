export type StudioV3SourceRef =
  | `work:${number}`
  | `collection:${number}`
  | `legacy-object:${string}`;

export type StudioV3SourceKind = "work" | "collection" | "legacy-object";

export interface ParsedStudioV3SourceRef {
  kind: StudioV3SourceKind;
  id: string;
}

export function workSourceRef(id: number): `work:${number}` {
  if (!Number.isInteger(id) || id < 0) throw new Error("Studio V3 Work source id must be a non-negative integer.");
  return `work:${id}`;
}

export function collectionSourceRef(id: number): `collection:${number}` {
  if (!Number.isInteger(id) || id < 0) {
    throw new Error("Studio V3 Collection source id must be a non-negative integer.");
  }
  return `collection:${id}`;
}

export function legacyObjectSourceRef(id: string): `legacy-object:${string}` {
  const normalized = id.trim();
  if (!normalized) throw new Error("Studio V3 legacy object source id must be non-empty.");
  return `legacy-object:${normalized}`;
}

export function parseStudioV3SourceRef(value: string): ParsedStudioV3SourceRef | null {
  const source = value.trim();
  const numeric = /^(work|collection):(\d+)$/.exec(source);
  if (numeric) return { kind: numeric[1] as "work" | "collection", id: numeric[2] };
  const legacy = /^legacy-object:(.+)$/.exec(source);
  if (!legacy?.[1]?.trim()) return null;
  return { kind: "legacy-object", id: legacy[1].trim() };
}

export function isStudioV3SourceRef(value: string): value is StudioV3SourceRef {
  return Boolean(parseStudioV3SourceRef(value));
}

export function makeStudioV3ObjectId(roomId: string, sourceRef: StudioV3SourceRef): string {
  const normalizedRoom = roomId.trim();
  if (!normalizedRoom) throw new Error("Studio V3 object id requires a Room id.");
  const escapedRoom = normalizedRoom.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "room";
  return `studio-v3:${escapedRoom}:${stableDigest(`${normalizedRoom}\u001f${sourceRef}`)}`;
}

export function containsRawStudioV3SourceRef(value: unknown): boolean {
  if (typeof value === "string") return /\b(?:work|collection):\d+\b|\blegacy-object:[^\s"'<>]+/.test(value);
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsRawStudioV3SourceRef);
  return Object.values(value as Record<string, unknown>).some(containsRawStudioV3SourceRef);
}

function stableDigest(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}
