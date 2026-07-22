export const STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF = "collection:loaded-owner-library" as const;

export type StudioV3CollectionSourceRef =
  | `collection:${number}`
  | typeof STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF;

export type StudioV3SourceRef =
  | `work:${number}`
  | StudioV3CollectionSourceRef
  | `legacy-object:${string}`;

export type StudioV3SourceKind = "work" | "collection" | "legacy-object";

export interface ParsedStudioV3SourceRef {
  kind: StudioV3SourceKind;
  id: string;
}

const STUDIO_V3_MAX_DATABASE_INTEGER_ID = 2_147_483_647;

interface StudioV3PieceLookupValue {
  id: string;
  sourceRef: StudioV3SourceRef;
  roomId?: string;
}

export function workSourceRef(id: number): `work:${number}` {
  if (!Number.isSafeInteger(id) || id < 1 || id > STUDIO_V3_MAX_DATABASE_INTEGER_ID) {
    throw new Error("Studio V3 Work source id must be a supported positive integer.");
  }
  return `work:${id}`;
}

export function collectionSourceRef(id: number): `collection:${number}` {
  if (!Number.isSafeInteger(id) || id < 1 || id > STUDIO_V3_MAX_DATABASE_INTEGER_ID) {
    throw new Error("Studio V3 Collection source id must be a supported positive integer.");
  }
  return `collection:${id}`;
}

export function loadedOwnerLibraryCollectionSourceRef(): typeof STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF {
  return STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF;
}

export function legacyObjectSourceRef(id: string): `legacy-object:${string}` {
  const normalized = id.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(normalized)) {
    throw new Error("Studio V3 legacy object source id must use the bounded stable-id grammar.");
  }
  return `legacy-object:${normalized}`;
}

/**
 * Runtime-only key for indexing Room-native Pieces. It must never replace the
 * durable `legacy-object:<object-id>` source reference projected to P1 state.
 */
export function makeStudioV3LegacyPieceMapKey(roomId: string, objectId: string): string {
  const normalizedRoom = roomId.trim();
  const normalizedObject = objectId.trim();
  if (!normalizedRoom || !normalizedObject) {
    throw new Error("Studio V3 legacy Piece map key requires Room and object ids.");
  }
  const material = `${normalizedRoom}\u001f${normalizedObject}`;
  return `legacy-piece:${stableDigest(material)}:${stableDigest([...material].reverse().join(""))}`;
}

/** Resolve a Piece without assuming that the runtime map is keyed by sourceRef. */
export function findStudioV3Piece<T extends StudioV3PieceLookupValue>(
  pieces: Record<string, T>,
  sourceRef: StudioV3SourceRef,
  roomId?: string,
): T | undefined {
  const parsed = parseStudioV3SourceRef(sourceRef);
  if (parsed?.kind === "legacy-object" && roomId) {
    const indexed = pieces[makeStudioV3LegacyPieceMapKey(roomId, parsed.id)];
    if (indexed?.sourceRef === sourceRef && (indexed.roomId === undefined || indexed.roomId === roomId)) {
      return indexed;
    }
  }

  const directlyIndexed = pieces[sourceRef];
  if (directlyIndexed?.sourceRef === sourceRef
    && (!roomId || directlyIndexed.roomId === undefined || directlyIndexed.roomId === roomId)) {
    return directlyIndexed;
  }
  return Object.values(pieces).find((piece) => (
    piece.sourceRef === sourceRef
    && (!roomId || piece.roomId === undefined || piece.roomId === roomId)
  ));
}

export function findStudioV3LegacyPiece<T extends StudioV3PieceLookupValue>(
  pieces: Record<string, T>,
  roomId: string,
  objectId: string,
): T | undefined {
  const sourceRef = legacyObjectSourceRef(objectId);
  const indexed = pieces[makeStudioV3LegacyPieceMapKey(roomId, objectId)];
  if (indexed?.id === objectId && indexed.sourceRef === sourceRef
    && (indexed.roomId === undefined || indexed.roomId === roomId)) {
    return indexed;
  }
  return Object.values(pieces).find((piece) => (
    piece.id === objectId
    && piece.sourceRef === sourceRef
    && (piece.roomId === undefined || piece.roomId === roomId)
  ));
}

export function makeStudioV3ObjectEditId(roomId: string, objectId: string): string {
  const normalizedRoom = roomId.trim();
  const normalizedObject = objectId.trim();
  if (!normalizedRoom || !normalizedObject) throw new Error("Studio V3 object edit id requires Room and object ids.");
  const material = `${normalizedRoom}\u001f${normalizedObject}`;
  return `object-edit:${stableDigest(material)}:${stableDigest([...material].reverse().join(""))}`;
}

export function parseStudioV3SourceRef(value: string): ParsedStudioV3SourceRef | null {
  const source = value.trim();
  if (source.length < 1 || source.length > 160) return null;
  if (source === STUDIO_V3_LOADED_OWNER_LIBRARY_SOURCE_REF) {
    return { kind: "collection", id: "loaded-owner-library" };
  }
  const numeric = /^(work|collection):([1-9]\d*)$/.exec(source);
  if (numeric) {
    const numericId = Number(numeric[2]);
    if (!Number.isSafeInteger(numericId) || numericId > STUDIO_V3_MAX_DATABASE_INTEGER_ID) return null;
    return { kind: numeric[1] as "work" | "collection", id: numeric[2] };
  }
  const legacy = /^legacy-object:([A-Za-z0-9][A-Za-z0-9_.:-]{0,127})$/.exec(source);
  return legacy ? { kind: "legacy-object", id: legacy[1] } : null;
}

export function isStudioV3SourceRef(value: string): value is StudioV3SourceRef {
  return Boolean(parseStudioV3SourceRef(value));
}

export function isStudioV3CollectionSourceRef(value: string): value is StudioV3CollectionSourceRef {
  return parseStudioV3SourceRef(value)?.kind === "collection";
}

export function makeStudioV3ObjectId(roomId: string, sourceRef: StudioV3SourceRef): string {
  const normalizedRoom = roomId.trim();
  if (!normalizedRoom) throw new Error("Studio V3 object id requires a Room id.");
  const escapedRoom = normalizedRoom.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "room";
  return `studio-v3:${escapedRoom}:${stableDigest(`${normalizedRoom}\u001f${sourceRef}`)}`;
}

export function makeStudioV3PlacementId(
  roomId: string,
  sourceRef: StudioV3SourceRef,
  occurrence = 0,
): string {
  if (!Number.isInteger(occurrence) || occurrence < 0) {
    throw new Error("Studio V3 placement occurrence must be a non-negative integer.");
  }
  const objectId = makeStudioV3ObjectId(roomId, sourceRef);
  return occurrence === 0 ? objectId : `${objectId}:attempt-${occurrence}`;
}

export function isStudioV3PlacementId(
  value: string,
  roomId: string,
  sourceRef: StudioV3SourceRef,
): boolean {
  const objectId = makeStudioV3ObjectId(roomId, sourceRef);
  return value === objectId || new RegExp(`^${escapeRegExp(objectId)}:attempt-[1-9]\\d*$`).test(value);
}

export function containsRawStudioV3SourceRef(value: unknown): boolean {
  if (typeof value === "string") {
    return /\b(?:work|collection):\d+\b|\bcollection:loaded-owner-library\b|\blegacy-object:[^\s"'<>]+/.test(value);
  }
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
