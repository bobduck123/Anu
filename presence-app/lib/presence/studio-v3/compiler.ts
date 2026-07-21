import type { PresenceCollection, PresenceEditableConfig, PresenceNode, PresenceWork } from "../../api/types.ts";
import { presenceConfigFromStudioV2State, publicRoomFromStudioV2State, studioV2FromPresenceConfig } from "../studio-v2/adapters.ts";
import {
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  type StudioV2Object,
  type StudioV2State,
} from "../studio-v2/model.ts";
import { defaultStudioV2Composition, normalizeStudioV2Composition } from "../studio-v2/layouts.ts";
import {
  STUDIO_V3_FINGERPRINT_UNAVAILABLE,
  STUDIO_V3_FINGERPRINT_UNAVAILABLE_REASON,
  comparableConfigFromEditableConfig,
  diffStudioV3OwnedConfig,
  fingerprintStudioV3BaseConfig,
  validateStudioV3BaseIdentity,
} from "./fingerprint.ts";
import { containsForbiddenLocalValue } from "./localState.ts";
import {
  STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON,
  STUDIO_V3_LOCAL_SCHEMA_VERSION,
  type StudioV3BaseSnapshot,
  type StudioV3Collection,
  type StudioV3CompileIssue,
  type StudioV3CompileResult,
  type StudioV3Document,
  type StudioV3HydrateInput,
  type StudioV3Layer,
  type StudioV3LayerLock,
  type StudioV3Look,
  type StudioV3LookId,
  type StudioV3LookValues,
  type StudioV3Piece,
  type StudioV3Placement,
  type StudioV3Room,
  type StudioV3RoomStyleId,
} from "./model.ts";
import {
  STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY,
  STUDIO_V3_NOCTURNAL_GALLERY_LOOK,
  STUDIO_V3_P0_LOOKS,
  STUDIO_V3_P1_LOOKS,
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  STUDIO_V3_ZINE_ARCHIVE_LOOK,
  studioV3RoomStyleDefinition,
} from "./p1Catalog.ts";
import {
  collectionSourceRef,
  legacyObjectSourceRef,
  loadedOwnerLibraryCollectionSourceRef,
  makeStudioV3PlacementId,
  type StudioV3CollectionSourceRef,
  type StudioV3SourceRef,
  workSourceRef,
} from "./sourceRefs.ts";

export {
  STUDIO_V3_LOOK_ROOM_STYLE_COMPATIBILITY,
  STUDIO_V3_NOCTURNAL_GALLERY_LOOK,
  STUDIO_V3_P0_LOOKS,
  STUDIO_V3_P1_LOOKS,
  STUDIO_V3_SOFT_EDITORIAL_LOOK,
  STUDIO_V3_ZINE_ARCHIVE_LOOK,
};

export async function createStudioV3BaseSnapshot(
  config: PresenceEditableConfig,
  sourceKind: "draft" | "published",
): Promise<StudioV3BaseSnapshot> {
  const validatedIdentity = validateStudioV3BaseIdentity(config, sourceKind);
  const identity = validatedIdentity ?? {
    sourceKind,
    configId: -1,
    roomId: Number(config.room_id ?? -1),
    version: Number(config.version ?? -1),
    revision: normalizeStudioV3Revision(config.revision),
    status: String(config.status || sourceKind),
    schemaVersion: String(config.schema_version || ""),
    updatedAt: config.updated_at,
  };
  const comparableConfig = comparableConfigFromEditableConfig(config);
  let fingerprint: string;
  try {
    fingerprint = await fingerprintStudioV3BaseConfig(comparableConfig);
  } catch {
    return {
      identity,
      fingerprint: STUDIO_V3_FINGERPRINT_UNAVAILABLE,
      comparableConfig,
      localPersistence: "memory-only",
      reason: STUDIO_V3_FINGERPRINT_UNAVAILABLE_REASON,
    };
  }
  if (!validatedIdentity) {
    return {
      identity,
      fingerprint,
      comparableConfig,
      localPersistence: "memory-only",
      reason: "immutable base identity unavailable",
    };
  }
  return { identity, fingerprint, comparableConfig, localPersistence: "available" };
}

export function hydrateStudioV3Document(input: StudioV3HydrateInput): StudioV3Document {
  const rooms = input.studioV2State.chambers.map((chamber) => ({
    id: chamber.id,
    label: chamber.label,
    styleId: roomStyleFromV2(chamber.composition?.layoutId),
    composition: chamber.composition,
    collectionPresentationId: studioV3RoomStyleDefinition(roomStyleFromV2(chamber.composition?.layoutId)).collectionPresentationId,
    placements: [],
    baseObjectIds: chamber.objects.map((object) => object.id),
  }));
  const legacyPieces = Object.fromEntries(
    input.studioV2State.chambers.flatMap((chamber) =>
      chamber.objects.map((object): [string, StudioV3Piece] => {
        const sourceRef = legacyObjectSourceRef(object.id);
        return [sourceRef, {
          id: object.id,
          sourceRef,
          title: object.title,
          description: object.detail,
          media: object.image,
          mediaType: object.image?.src ? "image" : "writing",
          compatibleRoomStyles: ["threshold-portal", "gallery-wall", "film-strip-selected-works"],
          sourceStatus: "current",
          snapshotType: object.type,
        }];
      }),
    ),
  );
  const workPieces = Object.fromEntries(
    input.works
      .filter((work) => isPositiveIntegerId(work.id))
      .map((work): [string, StudioV3Piece] => {
        const sourceRef = workSourceRef(work.id as number);
        return [sourceRef, adaptPresenceWorkToStudioV3Piece(work, sourceRef)];
      }),
  );
  const collections = buildCollections(input.collections, input.works);
  const activeRoomId = rooms[0]?.id ?? input.studioV2State.chambers[0]?.id ?? "main";
  const entryRoomId = input.studioV2State.chambers.find((chamber) => chamber.metadata?.isEntry)?.id ?? activeRoomId;
  const requiredCtaSourceRef = Object.values(legacyPieces).find((piece) => piece.snapshotType === "cta")?.sourceRef;
  // The gated V3 seam is currently limited to the BBB pilot. Its published
  // baseline intentionally remains Gallery P2 for public-route invariance,
  // while the editor must retain the proven P0 Nocturnal starting experience.
  const isBbbPilot = input.slug.trim().toLowerCase() === "bbbvision";
  const initialLookId: StudioV3LookId = isBbbPilot || input.studioV2State.publicStylePreset === "bbbvision-threshold-gallery"
    ? "nocturnal-gallery"
    : input.studioV2State.worldId === "zine"
      ? "zine-archive"
      : "soft-editorial";
  return {
    schemaVersion: STUDIO_V3_LOCAL_SCHEMA_VERSION,
    nodeId: input.nodeId,
    slug: input.slug,
    title: input.title,
    activeRoomId,
    activeLookId: initialLookId,
    mode: "simple",
    base: input.base,
    rooms,
    pieces: { ...legacyPieces, ...workPieces },
    collections,
    looks: Object.fromEntries(STUDIO_V3_P1_LOOKS.map((look) => [look.id, look])),
    locks: [],
    layerOverrides: [],
    navigation: {
      entryRoomId,
      roomOrder: rooms.map((room) => room.id),
      requiredCta: {
        ...(requiredCtaSourceRef ? { sourceRef: requiredCtaSourceRef } : {}),
        visible: Boolean(input.studioV2State.cta.label),
        ...(input.studioV2State.cta.href ? { destinationToken: "existing-base" as const } : {}),
      },
    },
    savepoints: [],
    namedLooks: [],
    diagnostics: [],
  };
}

export function hydrateStudioV3FromNode(input: {
  node: PresenceNode;
  baseConfig: PresenceEditableConfig;
  sourceKind: "draft" | "published";
  base: StudioV3BaseSnapshot;
}): StudioV3Document {
  const studioV2State = studioV2FromPresenceConfig(input.baseConfig, input.node);
  return hydrateStudioV3Document({
    nodeId: input.node.id,
    slug: input.node.slug,
    title: input.node.display_name,
    baseConfig: input.baseConfig,
    base: input.base,
    studioV2State,
    works: input.node.works ?? input.node.gallery_items ?? [],
    collections: input.node.collections ?? [],
  });
}

export function placeStudioV3Piece(
  document: StudioV3Document,
  roomId: string,
  sourceRef: StudioV3SourceRef,
): StudioV3Document {
  const piece = document.pieces[sourceRef];
  const room = document.rooms.find((item) => item.id === roomId);
  if (!room || !piece) return withIssue(document, {
    severity: "warning",
    code: "placement-unavailable",
    message: "This Piece cannot be placed in the current Room.",
    sourceRef,
    roomId,
    resolution: "shelved",
  });
  const placementId = nextStudioV3PlacementId(room, sourceRef);
  if (piece.sourceStatus !== "current") {
    return addPlacement(document, roomId, {
      id: placementId,
      roomId,
      sourceRef,
      order: room.placements.length + room.baseObjectIds.length + 1,
      status: "shelved",
      visibility: "hidden",
      reason: STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON,
    });
  }
  const existingPlacement = room.placements.find((placement) => placement.sourceRef === sourceRef && placement.status === "placed");
  if (existingPlacement) {
    return addPlacement(document, roomId, {
      id: placementId,
      roomId,
      sourceRef,
      order: room.placements.length + room.baseObjectIds.length + 1,
      status: "duplicate",
      reason: "Already placed in this Room.",
    });
  }
  if (!piece.compatibleRoomStyles.includes(room.styleId)) {
    return addPlacement(document, roomId, {
      id: placementId,
      roomId,
      sourceRef,
      order: room.placements.length + room.baseObjectIds.length + 1,
      status: "incompatible",
      reason: "This room style cannot place this media yet.",
    });
  }
  return addPlacement(document, roomId, {
    id: placementId,
    roomId,
    sourceRef,
    order: room.placements.length + room.baseObjectIds.length + 1,
    status: "placed",
  });
}

export function placeStudioV3Collection(
  document: StudioV3Document,
  roomId: string,
  collectionRef: StudioV3CollectionSourceRef,
): StudioV3Document {
  const collection = document.collections[collectionRef];
  if (!collection) return withIssue(document, {
    severity: "warning",
    code: "collection-unavailable",
    message: "This Collection is unavailable.",
    sourceRef: collectionRef,
    roomId,
    resolution: "shelved",
  });
  let next = document;
  const seen = new Set(next.rooms.find((room) => room.id === roomId)?.placements.map((placement) => placement.sourceRef));
  for (const sourceRef of collection.memberSourceRefs) {
    if (seen.has(sourceRef)) {
      const room = next.rooms.find((candidate) => candidate.id === roomId);
      if (!room) continue;
      next = addPlacement(next, roomId, {
        id: nextStudioV3PlacementId(room, sourceRef),
        roomId,
        sourceRef,
        collectionSourceRef: collectionRef,
        order: 0,
        status: "duplicate",
        reason: "Already placed in this Room.",
      });
      continue;
    }
    seen.add(sourceRef);
    next = placeStudioV3Piece(next, roomId, sourceRef);
    next = markLatestCollectionPlacement(next, roomId, collectionRef);
  }
  return next;
}

export function applyStudioV3Look(
  document: StudioV3Document,
  lookId: StudioV3LookId | `named:${string}`,
): StudioV3Document {
  const look = document.looks[lookId] ?? document.namedLooks.find((item) => item.id === lookId);
  if (!look) return withIssue(document, {
    severity: "warning",
    code: "look-unavailable",
    message: "This Look is unavailable.",
    resolution: "blocked",
  });
  return {
    ...document,
    activeLookId: look.id,
  };
}

export function lockStudioV3Layer(
  document: StudioV3Document,
  input: { scopeKind: StudioV3LayerLock["scopeKind"]; scopeId: string; layer: StudioV3Layer; value: unknown; reason?: string },
): StudioV3Document {
  if (input.layer !== "motion-atmosphere" || containsForbiddenLocalValue(input.value) || !isSafeMotionAtmosphereLockInput(input.value)) {
    return document;
  }
  const id = `${input.scopeKind}:${input.scopeId}:${input.layer}`;
  const lock: StudioV3LayerLock = {
    id,
    scopeKind: input.scopeKind,
    scopeId: input.scopeId,
    layer: input.layer,
    value: input.value,
    reason: input.reason ?? "Locked in Studio V3 prototype.",
  };
  return {
    ...document,
    locks: [...document.locks.filter((item) => item.id !== id), lock],
  };
}

export function saveStudioV3NamedLook(
  document: StudioV3Document,
  name: string,
  now = new Date().toISOString(),
): StudioV3Document {
  const active = document.looks[document.activeLookId] ?? document.namedLooks.find((look) => look.id === document.activeLookId);
  const safeName = name.trim() && !containsForbiddenLocalValue(name) ? name.trim() : "Named Look";
  const id = `named:${slugify(safeName)}-${stableSmall(`${safeName}:${now}`)}` as const;
  const named: StudioV3Look = {
    id,
    name: safeName,
    origin: "owner",
    baseLookId: active?.baseLookId ?? (active?.origin === "system" ? active.id as StudioV3LookId : "soft-editorial"),
    provenance: `saved-from:${active?.id ?? "unknown"}`,
    values: { ...(active?.values ?? STUDIO_V3_SOFT_EDITORIAL_LOOK.values) },
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...document,
    namedLooks: [...document.namedLooks, named],
    looks: { ...document.looks, [named.id]: named },
  };
}

function isSafeMotionAtmosphereLockInput(value: unknown): value is Pick<StudioV3LookValues, "motionIntensity" | "background"> {
  const payload = value && typeof value === "object" ? value as Partial<Pick<StudioV3LookValues, "motionIntensity" | "background">> : null;
  if (!payload) return false;
  const keys = Object.keys(payload);
  return keys.length === 2 &&
    keys.includes("motionIntensity") &&
    keys.includes("background") &&
    typeof payload.background === "string" &&
    ["still", "gentle", "living"].includes(String(payload.motionIntensity));
}

export function compileStudioV3ToStudioV2(document: StudioV3Document, baseState: StudioV2State): StudioV2State {
  const activeLook = document.looks[document.activeLookId] ?? STUDIO_V3_SOFT_EDITORIAL_LOOK;
  const unlockedLookValues = applyLockedLookValues(document, activeLook.values);
  const nextState: StudioV2State = structuredClone(baseState);
  nextState.rendererKey = PRESENCE_STUDIO_V2_RENDERER_KEY;
  nextState.schemaVersion = PRESENCE_STUDIO_V2_SCHEMA_VERSION;
  // A Presence Look owns global atmosphere/renderer posture. A Room Style only
  // owns the composition of its Room and must never switch unrelated Rooms.
  nextState.publicStylePreset = unlockedLookValues.publicStylePreset;
  nextState.worldId = unlockedLookValues.worldId;
  nextState.skin = {
    ...nextState.skin,
    background: unlockedLookValues.background,
    accentColor: unlockedLookValues.accentColor,
    texture: unlockedLookValues.texture,
    borderStyle: unlockedLookValues.borderStyle,
    objectRadius: unlockedLookValues.objectRadius,
    shadowDepth: unlockedLookValues.shadowDepth,
    headingWeight: unlockedLookValues.headingWeight,
    motionIntensity: unlockedLookValues.motionIntensity,
    experienceDensity: unlockedLookValues.density,
    experienceAtmosphere: unlockedLookValues.atmosphere,
    experiencePieceTreatment: unlockedLookValues.pieceTreatment,
    experienceJourney: unlockedLookValues.journey,
  };
  nextState.chambers = nextState.chambers.map((chamber) => {
    const room = document.rooms.find((item) => item.id === chamber.id);
    const baseObjects = room
      ? chamber.objects.filter((object) => room.baseObjectIds.includes(object.id))
      : chamber.objects;
    const placedObjects = (room?.placements ?? [])
      .filter((placement) => isPublicStudioV3Placement(document, placement))
      .map((placement, index) => objectFromPlacement(document, placement, baseObjects.length + index + 1))
      .filter((object): object is StudioV2Object => Boolean(object));
    const objects = dedupeObjects([...baseObjects, ...placedObjects]);
    const layoutId = studioV3RoomStyleDefinition(room?.styleId ?? roomStyleFromV2(chamber.composition?.layoutId)).v2LayoutId;
    const acceptedComposition = room?.composition ?? chamber.composition;
    const publicObjectIds = new Set(objects.map((object) => object.id));
    const publicComposition = acceptedComposition ? {
      ...acceptedComposition,
      placements: acceptedComposition.placements.filter((placement) => publicObjectIds.has(placement.objectId)),
    } : undefined;
    const composition = publicComposition?.layoutId === layoutId
      ? normalizeStudioV2Composition(publicComposition, chamber.id, objects)
      : defaultStudioV2Composition(chamber.id, objects, layoutId);
    return {
      ...chamber,
      objects,
      composition,
    };
  });
  return nextState;
}

export function compileStudioV3Document(document: StudioV3Document, baseState: StudioV2State): StudioV3CompileResult {
  const studioV2State = compileStudioV3ToStudioV2(document, baseState);
  const nineField = presenceConfigFromStudioV2State(studioV2State, document.base.comparableConfig);
  const comparableConfig = {
    schema_version: document.base.comparableConfig.schema_version,
    renderer_key: nineField.renderer_key ?? null,
    scene_config: nineField.scene_config ?? {},
    style_dna: nineField.style_dna ?? {},
    motion_config: nineField.motion_config ?? {},
    asset_config: nineField.asset_config ?? {},
    content_config: nineField.content_config ?? {},
    roomkey_config: nineField.roomkey_config ?? {},
    enquiry_config: nineField.enquiry_config ?? {},
    locked_fields: nineField.locked_fields ?? {},
  };
  const illegalDiffs = diffStudioV3OwnedConfig(document.base.comparableConfig, comparableConfig);
  const issues: StudioV3CompileIssue[] = [
    ...document.diagnostics,
    ...illegalDiffs.map((path) => ({
      severity: "error" as const,
      code: "unowned-diff",
      message: `Compiler attempted to change an unowned path: ${path}`,
      resolution: "blocked" as const,
    })),
  ];
  return {
    document,
    studioV2State,
    publicRoom: publicRoomFromStudioV2State(studioV2State),
    comparableConfig,
    issues,
    placements: document.rooms.flatMap((room) => room.placements),
  };
}

export function projectStudioV3CanvasRoom(studioV2State: StudioV2State) {
  return publicRoomFromStudioV2State(studioV2State);
}

function adaptPresenceWorkToStudioV3Piece(work: PresenceWork, sourceRef: StudioV3SourceRef): StudioV3Piece {
  const image = work.image_url || work.thumbnail_url || work.gallery_images?.[0] || "";
  return {
    id: sourceRef,
    sourceRef,
    title: work.title || `Work ${work.id}`,
    date: work.year ?? undefined,
    description: work.description ?? undefined,
    media: image ? { src: image, alt: work.title } : undefined,
    mediaType: image ? "image" : "writing",
    compatibleRoomStyles: ["gallery-wall", "threshold-portal", "film-strip-selected-works"],
    sourceStatus: work.is_visible === false ? "unavailable" : "current",
    snapshotType: image ? "image" : "text",
    fromWork: work,
  };
}

function buildCollections(collections: PresenceCollection[], works: PresenceWork[]): Record<string, StudioV3Collection> {
  const byId = new Map(collections.filter((collection) => isPositiveIntegerId(collection.id)).map((collection) => [collection.id as number, collection]));
  const result: Record<string, StudioV3Collection> = {};
  for (const [id, collection] of byId) {
    const sourceRef = collectionSourceRef(id);
    result[sourceRef] = {
      id: sourceRef,
      sourceRef,
      title: collection.title,
      description: collection.description ?? undefined,
      memberSourceRefs: works
        .filter((work) => work.collection_id === id && isPositiveIntegerId(work.id))
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((work) => workSourceRef(work.id as number)),
      fromCollection: collection,
    };
  }
  if (Object.keys(result).length === 0 && works.some((work) => isPositiveIntegerId(work.id))) {
    const sourceRef = loadedOwnerLibraryCollectionSourceRef();
    result[sourceRef] = {
      id: sourceRef,
      sourceRef,
      title: "Current Works",
      description: "Local prototype grouping from the loaded owner Library.",
      memberSourceRefs: works
        .filter((work) => isPositiveIntegerId(work.id))
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((work) => workSourceRef(work.id as number)),
    };
  }
  return result;
}

function objectFromPlacement(document: StudioV3Document, placement: StudioV3Placement, zIndex: number): StudioV2Object | null {
  const piece = document.pieces[placement.sourceRef];
  if (!piece || piece.sourceStatus !== "current" || placement.visibility === "hidden") return null;
  return {
    id: placement.id,
    type: piece.snapshotType,
    role: placement.collectionSourceRef ? "collection-piece" : "piece",
    title: piece.title,
    meta: piece.date,
    detail: piece.description,
    image: piece.media,
    visibility: { public: true, mobile: true },
    transform: {
      ...DEFAULT_STUDIO_V2_TRANSFORM,
      x: (placement.order % 3) * 18,
      y: (placement.order % 2) * 14,
      zIndex,
    },
    locked: false,
    pinned: false,
  };
}

function isPublicStudioV3Placement(document: StudioV3Document, placement: StudioV3Placement): boolean {
  const piece = document.pieces[placement.sourceRef];
  return placement.status === "placed" && placement.visibility !== "hidden" && piece?.sourceStatus === "current";
}

function isPositiveIntegerId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function dedupeObjects(objects: StudioV2Object[]): StudioV2Object[] {
  const seen = new Set<string>();
  return objects.filter((object) => {
    if (seen.has(object.id)) return false;
    seen.add(object.id);
    return true;
  });
}

function roomStyleFromV2(layoutId: unknown): StudioV3RoomStyleId {
  if (layoutId === "portal-threshold") return "threshold-portal";
  if (layoutId === "film-strip-selected-works") return "film-strip-selected-works";
  return "gallery-wall";
}

function addPlacement(document: StudioV3Document, roomId: string, placement: StudioV3Placement): StudioV3Document {
  return {
    ...document,
    rooms: document.rooms.map((room) => (
      room.id === roomId
        ? { ...room, placements: [...room.placements, placement] }
        : room
    )),
  };
}

function nextStudioV3PlacementId(room: StudioV3Room, sourceRef: StudioV3SourceRef): string {
  let occurrence = room.placements.filter((placement) => placement.sourceRef === sourceRef).length;
  let candidate = makeStudioV3PlacementId(room.id, sourceRef, occurrence);
  while (room.placements.some((placement) => placement.id === candidate)) {
    occurrence += 1;
    candidate = makeStudioV3PlacementId(room.id, sourceRef, occurrence);
  }
  return candidate;
}

function markLatestCollectionPlacement(
  document: StudioV3Document,
  roomId: string,
  collectionSourceRef: StudioV3CollectionSourceRef,
): StudioV3Document {
  return {
    ...document,
    rooms: document.rooms.map((room) => {
      if (room.id !== roomId || room.placements.length === 0) return room;
      const placements = [...room.placements];
      const last = placements[placements.length - 1];
      placements[placements.length - 1] = { ...last, collectionSourceRef };
      return { ...room, placements };
    }),
  };
}

function applyLockedLookValues(document: StudioV3Document, values: StudioV3LookValues): StudioV3LookValues {
  const presenceMotionLock = document.locks.find((lock) => lock.layer === "motion-atmosphere" && lock.scopeKind === "presence");
  if (!presenceMotionLock) return values;
  const locked = presenceMotionLock.value as Partial<StudioV3LookValues>;
  return {
    ...values,
    ...(typeof locked.motionIntensity === "string" ? { motionIntensity: locked.motionIntensity } : {}),
    ...(typeof locked.background === "string" ? { background: locked.background } : {}),
  };
}

function normalizeStudioV3Revision(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

function withIssue(document: StudioV3Document, issue: StudioV3CompileIssue): StudioV3Document {
  return { ...document, diagnostics: [...document.diagnostics, issue] };
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "look";
}

function stableSmall(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36).slice(0, 5);
}
