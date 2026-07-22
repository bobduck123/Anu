import type { PresenceCollection, PresenceEditableConfig, PresenceEditorAsset, PresenceNode, PresenceWork } from "../../api/types.ts";
import { presenceConfigFromStudioV2State, publicRoomFromStudioV2State, studioV2FromPresenceConfig } from "../studio-v2/adapters.ts";
import {
  DEFAULT_STUDIO_V2_TRANSFORM,
  PRESENCE_STUDIO_V2_RENDERER_KEY,
  PRESENCE_STUDIO_V2_SCHEMA_VERSION,
  type StudioV2Object,
  type StudioV2State,
} from "../studio-v2/model.ts";
import {
  defaultStudioV2Composition,
  normalizeStudioV2Composition,
  studioV2Layout,
  type StudioV2ObjectPlacement,
} from "../studio-v2/layouts.ts";
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
  type StudioV3MediaAsset,
  type StudioV3ObjectEdit,
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
  findStudioV3LegacyPiece,
  findStudioV3Piece,
  legacyObjectSourceRef,
  makeStudioV3LegacyPieceMapKey,
  makeStudioV3ObjectEditId,
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
        return [makeStudioV3LegacyPieceMapKey(chamber.id, object.id), {
          id: object.id,
          sourceRef,
          roomId: chamber.id,
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
  const mediaAssets = buildMediaAssets(input.assets ?? []);
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
    objectEdits: {},
    mediaAssets,
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
  const piece = findStudioV3Piece(document.pieces, sourceRef, roomId);
  const room = document.rooms.find((item) => item.id === roomId);
  if (!room || !piece) return withIssue(document, {
    severity: "warning",
    code: "placement-unavailable",
    message: "This Piece cannot be placed in the current Room.",
    sourceRef,
    roomId,
    resolution: "shelved",
  });
  if (piece.roomId === roomId && room.baseObjectIds.includes(piece.id)) return document;
  const compatibilityIdentity = `${sourceRef}\u001f${roomId}\u001f${room.styleId}`;
  const compatibilityIdentities = new Set(projectCompatibilityIdentityRows(document));
  const placementCount = document.rooms.reduce((count, candidate) => count + candidate.placements.length, 0);
  if (placementCount >= 160
    || (!compatibilityIdentities.has(compatibilityIdentity) && compatibilityIdentities.size >= 160)) {
    return document;
  }
  const placementId = nextStudioV3PlacementId(room, sourceRef);
  if (piece.sourceStatus !== "current") {
    if (room.placements.some((placement) => placement.sourceRef === sourceRef && placement.status === "shelved" && !placement.collectionSourceRef)) {
      return document;
    }
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
    if (room.placements.some((placement) => placement.sourceRef === sourceRef && placement.status === "duplicate" && !placement.collectionSourceRef)) {
      return document;
    }
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
    if (room.placements.some((placement) => placement.sourceRef === sourceRef && placement.status === "incompatible" && !placement.collectionSourceRef)) {
      return document;
    }
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
  if (!collection || collection.sourceStatus !== "current") return withIssue(document, {
    severity: "warning",
    code: "collection-unavailable",
    message: "This Collection is unavailable.",
    sourceRef: collectionRef,
    roomId,
    resolution: "shelved",
  });
  const targetRoom = document.rooms.find((room) => room.id === roomId);
  if (!targetRoom) return document;
  const newMemberRefs = collection.memberSourceRefs.filter((sourceRef) => !targetRoom.placements.some((placement) => (
    placement.sourceRef === sourceRef && placement.collectionSourceRef === collectionRef
  )));
  const placementCount = document.rooms.reduce((count, room) => count + room.placements.length, 0);
  const compatibilityIdentities = new Set(projectCompatibilityIdentityRows(document));
  for (const sourceRef of newMemberRefs) {
    compatibilityIdentities.add(`${sourceRef}\u001f${roomId}\u001f${targetRoom.styleId}`);
  }
  if (placementCount + newMemberRefs.length > 160 || compatibilityIdentities.size > 160) {
    return withIssue(document, {
      severity: "warning",
      code: "collection-capacity",
      message: "This Collection would exceed the bounded private placement registry.",
      sourceRef: collectionRef,
      roomId,
      resolution: "blocked",
    });
  }
  let next = document;
  const seen = new Set(next.rooms.find((room) => room.id === roomId)?.placements
    .filter((placement) => placement.status === "placed" && placement.visibility !== "hidden")
    .map((placement) => placement.sourceRef));
  for (const sourceRef of collection.memberSourceRefs) {
    const existingRoom = next.rooms.find((candidate) => candidate.id === roomId);
    if (existingRoom?.placements.some((placement) => (
      placement.sourceRef === sourceRef && placement.collectionSourceRef === collectionRef
    ))) continue;
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
    const beforePlacement = next;
    next = placeStudioV3Piece(next, roomId, sourceRef);
    if (next !== beforePlacement) next = markLatestCollectionPlacement(next, roomId, collectionRef);
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
  if (!studioV3ScopeExists(document, input.scopeKind, input.scopeId)
    || input.layer !== "motion-atmosphere"
    || containsForbiddenLocalValue(input.value)
    || !isSafeMotionAtmosphereLockInput(input.value)) {
    return document;
  }
  const id = `${input.scopeKind}:${input.scopeId}:${input.layer}`;
  if (!document.locks.some((item) => item.id === id) && document.locks.length >= 160) return document;
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

function studioV3ScopeExists(
  document: StudioV3Document,
  scopeKind: StudioV3LayerLock["scopeKind"],
  scopeId: string,
): boolean {
  if (scopeKind === "presence") return scopeId === String(document.nodeId);
  if (scopeKind === "room") return document.rooms.some((room) => room.id === scopeId);
  if (scopeKind === "collection") return Boolean(document.collections[scopeId]);
  return Boolean(document.pieces[scopeId])
    || Object.values(document.pieces).some((piece) => piece.id === scopeId)
    || document.rooms.some((room) => room.placements.some((placement) => placement.id === scopeId));
}

export function saveStudioV3NamedLook(
  document: StudioV3Document,
  name: string,
  now = new Date().toISOString(),
): StudioV3Document {
  if (document.namedLooks.length >= 160) return document;
  const active = document.looks[document.activeLookId] ?? document.namedLooks.find((look) => look.id === document.activeLookId);
  const requestedName = name.trim();
  const safeName = requestedName && requestedName.length <= 80 && !containsForbiddenLocalValue(requestedName)
    ? requestedName
    : "Named Look";
  const id = `named:${slugify(safeName)}-${stableSmall(`${safeName}:${now}`)}` as const;
  const named: StudioV3Look = {
    id,
    name: safeName,
    origin: "owner",
    baseLookId: active?.baseLookId ?? (active?.origin === "system" ? active.id as StudioV3LookId : "soft-editorial"),
    provenance: `saved-from:${active?.id ?? "unknown"}`,
    values: applyLockedLookValues(document, active?.values ?? STUDIO_V3_SOFT_EDITORIAL_LOOK.values),
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...document,
    namedLooks: [...document.namedLooks, named],
    looks: { ...document.looks, [named.id]: named },
  };
}

function isSafeMotionAtmosphereLockInput(value: unknown): value is Pick<StudioV3LookValues, "motionIntensity"> & Partial<Pick<StudioV3LookValues, "background">> {
  const payload = value && typeof value === "object" ? value as Partial<Pick<StudioV3LookValues, "motionIntensity" | "background">> : null;
  if (!payload) return false;
  const keys = Object.keys(payload);
  return keys.length >= 1 && keys.length <= 2 &&
    keys.includes("motionIntensity") && keys.every((key) => key === "motionIntensity" || key === "background") &&
    (payload.background === undefined || typeof payload.background === "string") &&
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
      ? chamber.objects
        .filter((object) => room.baseObjectIds.includes(object.id))
        .map((object) => applyStudioV3ObjectEdit(document, chamber.id, object))
        .filter((object): object is StudioV2Object => Boolean(object))
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
    const normalizedComposition = publicComposition?.layoutId === layoutId
      ? normalizeStudioV2Composition(publicComposition, chamber.id, objects)
      : defaultStudioV2Composition(chamber.id, objects, layoutId);
    const composition = applyStudioV3CompositionEdits(document, chamber.id, objects, normalizedComposition);
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

function buildMediaAssets(assets: PresenceEditorAsset[]): Record<string, StudioV3MediaAsset> {
  const result: Record<string, StudioV3MediaAsset> = {};
  for (const asset of assets) {
    const mediaId = asset.media_id;
    if (!mediaId || !isStableRuntimeReference(mediaId) || !isSafeRuntimeMediaUrl(asset.url)) continue;
    const mediaType = asset.asset_type === "image" || asset.mime_type?.startsWith("image/") ? "image" : "unknown";
    result[mediaId] = {
      mediaId,
      src: asset.url,
      alt: typeof asset.alt_text === "string" ? asset.alt_text.slice(0, 240) : "",
      mediaType,
      sourceStatus: mediaType === "image" && isAvailableRuntimeAsset(asset) ? "current" : "unavailable",
      fromAsset: structuredClone(asset),
    };
  }
  return result;
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
      sourceStatus: collection.is_visible === false ? "unavailable" : "current",
      fromCollection: collection,
    };
  }
  return result;
}

function objectFromPlacement(document: StudioV3Document, placement: StudioV3Placement, zIndex: number): StudioV2Object | null {
  const piece = findStudioV3Piece(document.pieces, placement.sourceRef, placement.roomId);
  const requiredCta = isRequiredStudioV3CtaSource(document, placement.sourceRef, placement.roomId, placement.id);
  if (!piece || piece.sourceStatus !== "current" || (placement.visibility === "hidden" && !requiredCta)) return null;
  const object: StudioV2Object = {
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
  return applyStudioV3ObjectEdit(document, placement.roomId, object);
}

function applyStudioV3ObjectEdit(
  document: StudioV3Document,
  roomId: string,
  object: StudioV2Object,
): StudioV2Object | null {
  const edit = document.objectEdits[makeStudioV3ObjectEditId(roomId, object.id)];
  if (!edit || edit.roomId !== roomId || edit.objectId !== object.id || !objectEditMatchesSource(document, roomId, object.id, edit)) return object;
  const requiredCta = isRequiredStudioV3CtaSource(document, edit.sourceRef, roomId, object.id);
  if (edit.visibility === "hidden" && !requiredCta) return null;
  let image = object.image;
  if (edit.mediaSourceRef) {
    const source = findStudioV3Piece(document.pieces, edit.mediaSourceRef, roomId);
    if (source?.sourceStatus === "current" && source.media?.src) {
      image = { src: source.media.src, alt: edit.mediaAlt ?? source.media.alt };
    }
  } else if (edit.mediaId) {
    const source = document.mediaAssets[edit.mediaId];
    if (source?.sourceStatus === "current" && source.mediaType === "image" && source.src) {
      image = { src: source.src, alt: edit.mediaAlt ?? source.alt };
    }
  } else if (image && edit.mediaAlt !== undefined) {
    image = { ...image, alt: edit.mediaAlt };
  }
  return {
    ...object,
    ...(edit.title !== undefined && (!requiredCta || edit.title.trim()) ? { title: edit.title } : {}),
    ...(edit.body !== undefined ? { detail: edit.body } : {}),
    ...(edit.caption !== undefined ? { meta: edit.caption } : {}),
    ...(image ? { image } : {}),
  };
}

function applyStudioV3CompositionEdits(
  document: StudioV3Document,
  roomId: string,
  objects: StudioV2Object[],
  composition: NonNullable<StudioV3Room["composition"]>,
): NonNullable<StudioV3Room["composition"]> {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return composition;
  const layout = studioV2Layout(composition.layoutId);
  const byObjectId = new Map(objects.map((object) => [object.id, object]));
  const edits = Object.values(document.objectEdits)
    .filter((edit) => edit.roomId === roomId && byObjectId.has(edit.objectId) && objectEditMatchesSource(document, roomId, edit.objectId, edit))
    .sort((left, right) => left.id.localeCompare(right.id));
  const candidates = new Map<string, { edit: StudioV3ObjectEdit; placement: StudioV2ObjectPlacement }>();
  for (const edit of edits) {
    if (edit.zoneId === undefined && edit.order === undefined && edit.size === undefined && edit.treatment === undefined && edit.featured === undefined) continue;
    const object = byObjectId.get(edit.objectId)!;
    const current = composition.placements.find((placement) => placement.objectId === edit.objectId);
    if (!current) continue;
    const zone = layout.zones.find((candidate) => candidate.id === (edit.zoneId ?? current.zoneId));
    if (!zone || !zone.accepts.includes(object.type)) continue;
    let size = edit.size && zone.allowedSizes.includes(edit.size) ? edit.size : current.size;
    if (edit.featured === true && zone.allowedSizes.includes("feature")) size = "feature";
    if (edit.featured === false && size === "feature") size = zone.allowedSizes.find((candidate) => candidate !== "feature") ?? zone.defaultSize;
    if (!zone.allowedSizes.includes(size)) size = zone.defaultSize;
    let treatment = edit.treatment && zone.allowedTreatments?.includes(edit.treatment) ? edit.treatment : current.treatment;
    if (treatment && !zone.allowedTreatments?.includes(treatment)) treatment = zone.allowedTreatments?.[0];
    const order = edit.order === undefined ? current.order : Math.max(0, Math.min(10000, edit.order));
    candidates.set(edit.objectId, {
      edit,
      placement: {
        objectId: edit.objectId,
        chamberId: roomId,
        layoutId: layout.id,
        zoneId: zone.id,
        order,
        size,
        ...(treatment ? { treatment } : {}),
      },
    });
  }

  const rejected = new Set<string>();
  while (true) {
    const desired = composition.placements.map((current) => ({
      current,
      candidate: candidates.get(current.objectId),
      placement: rejected.has(current.objectId)
        ? current
        : candidates.get(current.objectId)?.placement ?? current,
    }));
    let changed = false;
    for (const zone of layout.zones) {
      if (zone.maxObjects === undefined) continue;
      const occupants = desired.filter(({ placement }) => placement.zoneId === zone.id);
      if (occupants.length <= zone.maxObjects) continue;
      const residents = occupants.filter(({ current }) => current.zoneId === zone.id);
      const availableForMoves = Math.max(0, zone.maxObjects - residents.length);
      const incoming = occupants
        .filter(({ current, candidate }) => current.zoneId !== zone.id && Boolean(candidate))
        .sort((left, right) => left.candidate!.edit.id.localeCompare(right.candidate!.edit.id));
      for (const entry of incoming.slice(availableForMoves)) {
        if (!rejected.has(entry.current.objectId)) {
          rejected.add(entry.current.objectId);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const placements = composition.placements.map((current) => (
    rejected.has(current.objectId) ? current : candidates.get(current.objectId)?.placement ?? current
  ));
  return normalizeStudioV2Composition({ layoutId: layout.id, placements }, roomId, objects);
}

function objectEditMatchesSource(
  document: StudioV3Document,
  roomId: string,
  objectId: string,
  edit: StudioV3ObjectEdit,
): boolean {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  const placement = room?.placements.find((candidate) => candidate.id === objectId);
  const sourceRef = placement?.sourceRef
    ?? findStudioV3LegacyPiece(document.pieces, roomId, objectId)?.sourceRef;
  return sourceRef === edit.sourceRef
    && findStudioV3Piece(document.pieces, edit.sourceRef, roomId)?.sourceStatus === "current";
}

function isPublicStudioV3Placement(document: StudioV3Document, placement: StudioV3Placement): boolean {
  const piece = findStudioV3Piece(document.pieces, placement.sourceRef, placement.roomId);
  const requiredCta = isRequiredStudioV3CtaSource(document, placement.sourceRef, placement.roomId, placement.id);
  return piece?.sourceStatus === "current" && (
    requiredCta || (placement.status === "placed" && placement.visibility !== "hidden")
  );
}

function isRequiredStudioV3CtaSource(
  document: StudioV3Document,
  sourceRef: StudioV3SourceRef,
  roomId: string,
  objectId: string,
): boolean {
  const requiredPiece = Object.values(document.pieces).find((piece) => (
    piece.snapshotType === "cta" && piece.sourceRef === document.navigation.requiredCta.sourceRef
  ));
  const requiredPlacement = requiredPiece ? undefined : document.rooms.flatMap((room) => (
    room.placements.map((placement) => ({ roomId: room.id, placement }))
  )).find(({ placement }) => placement.sourceRef === document.navigation.requiredCta.sourceRef);
  return Boolean(
    document.navigation.requiredCta.visible
    && document.navigation.requiredCta.sourceRef === sourceRef
    && (requiredPiece
      ? requiredPiece.roomId === roomId && requiredPiece.id === objectId
      : requiredPlacement
        ? requiredPlacement.roomId === roomId && requiredPlacement.placement.id === objectId
        : true)
  );
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
  if (document.rooms.reduce((count, room) => count + room.placements.length, 0) >= 160) return document;
  return {
    ...document,
    rooms: document.rooms.map((room) => (
      room.id === roomId
        ? { ...room, placements: [...room.placements, placement] }
        : room
    )),
  };
}

function projectCompatibilityIdentityRows(document: StudioV3Document): string[] {
  return document.rooms.flatMap((room) => [
    ...room.baseObjectIds.flatMap((objectId) => {
      const piece = findStudioV3LegacyPiece(document.pieces, room.id, objectId);
      return piece ? [`${piece.sourceRef}\u001f${room.id}\u001f${room.styleId}`] : [];
    }),
    ...room.placements.map((placement) => `${placement.sourceRef}\u001f${room.id}\u001f${room.styleId}`),
  ]);
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
  const presenceOverrides = document.layerOverrides
    .filter((override) => override.scopeKind === "presence" && override.scopeId === String(document.nodeId))
    .reduce((current, override) => ({ ...current, ...override.value }), {} as Partial<StudioV3LookValues>);
  const overridden = { ...values, ...presenceOverrides } as StudioV3LookValues;
  const presenceMotionLock = document.locks.find((lock) => (
    lock.layer === "motion-atmosphere" && lock.scopeKind === "presence" && lock.scopeId === String(document.nodeId)
  ));
  if (!presenceMotionLock) return overridden;
  const locked = presenceMotionLock.value as Partial<StudioV3LookValues>;
  return {
    ...overridden,
    ...(typeof locked.motionIntensity === "string" ? { motionIntensity: locked.motionIntensity } : {}),
    ...(typeof locked.background === "string" ? { background: locked.background } : {}),
  };
}

function isStableRuntimeReference(value: string): boolean {
  return value.length > 0 && value.length <= 160 && /^[A-Za-z0-9_.:-]+$/.test(value);
}

function isSafeRuntimeMediaUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) return false;
  if (/^(?:data|blob|javascript|file):/i.test(value) || value.startsWith("//")) return false;
  return value.startsWith("/") || /^https:\/\//i.test(value)
    || /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//i.test(value);
}

function isAvailableRuntimeAsset(asset: PresenceEditorAsset): boolean {
  const validStatus = asset.status === undefined || ["draft_uploaded", "draft_attached", "ready", "published"].includes(asset.status);
  const validVisibility = asset.visibility === undefined || ["private_draft", "public_unlisted", "public_published"].includes(asset.visibility);
  return validStatus && validVisibility;
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
