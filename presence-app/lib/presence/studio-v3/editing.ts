import type { PresenceEditorAsset } from "../../api/types.ts";
import {
  defaultStudioV2Composition,
  normalizeStudioV2Composition,
  placementMoveError,
  studioV2Layout,
  type StudioV2ChamberComposition,
  type StudioV2ObjectPlacement,
  type StudioV2PlacementSize,
  type StudioV2PlacementTreatment,
} from "../studio-v2/layouts.ts";
import {
  DEFAULT_STUDIO_V2_TRANSFORM,
  STUDIO_V2_PUBLIC_STYLE_PRESETS,
  type StudioV2Object,
  type StudioV2State,
} from "../studio-v2/model.ts";
import { containsForbiddenStudioV3Text } from "./safety.ts";
import type {
  StudioV3Document,
  StudioV3Layer,
  StudioV3LayerOverride,
  StudioV3LayerOverrideValue,
  StudioV3MediaAsset,
  StudioV3ObjectEdit,
  StudioV3Piece,
  StudioV3Placement,
  StudioV3ScopeKind,
} from "./model.ts";
import { studioV3RoomStyleDefinition } from "./p1Catalog.ts";
import { remapStudioV3RoomForCurrentStyle } from "./p1State.ts";
import {
  findStudioV3LegacyPiece,
  findStudioV3Piece,
  makeStudioV3ObjectEditId,
  type StudioV3SourceRef,
} from "./sourceRefs.ts";

export interface StudioV3ObjectContext {
  roomId: string;
  objectId: string;
  sourceRef: StudioV3SourceRef;
  piece: StudioV3Piece;
  placement?: StudioV3Placement;
  edit?: StudioV3ObjectEdit;
}

export interface StudioV3EditingResult {
  document: StudioV3Document;
  error?: string;
}

export function studioV3ObjectEditId(roomId: string, objectId: string): string {
  return makeStudioV3ObjectEditId(roomId, objectId);
}

export function findStudioV3ObjectContext(
  document: StudioV3Document,
  roomId: string,
  objectId: string,
): StudioV3ObjectContext | null {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return null;
  const placement = room.placements.find((candidate) => candidate.id === objectId);
  if (placement) {
    const piece = findStudioV3Piece(document.pieces, placement.sourceRef, roomId);
    if (!piece) return null;
    return {
      roomId,
      objectId,
      sourceRef: placement.sourceRef,
      piece,
      placement,
      edit: document.objectEdits[studioV3ObjectEditId(roomId, objectId)],
    };
  }
  if (!room.baseObjectIds.includes(objectId)) return null;
  const piece = findStudioV3LegacyPiece(document.pieces, roomId, objectId);
  if (!piece) return null;
  return {
    roomId,
    objectId,
    sourceRef: piece.sourceRef,
    piece,
    edit: document.objectEdits[studioV3ObjectEditId(roomId, objectId)],
  };
}

export function updateStudioV3ObjectCopy(
  document: StudioV3Document,
  input: { roomId: string; objectId: string; title?: string; body?: string; caption?: string },
): StudioV3Document {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  if (!context) return document;
  if (!canUpsertObjectEdit(document, context)) return document;
  if (isStudioV3RequiredCta(document, context) && input.title !== undefined && !input.title.trim()) return document;
  if (!validOptionalCopy(input.title, 180) || !validOptionalCopy(input.body, 4000)
    || !validOptionalCopy(input.caption, 500)) return document;
  const patch: Partial<StudioV3ObjectEdit> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.caption !== undefined) patch.caption = input.caption;
  if (Object.keys(patch).length === 0) return document;
  return upsertObjectEdit(document, context, patch);
}

export function replaceStudioV3ObjectMedia(
  document: StudioV3Document,
  input: { roomId: string; objectId: string; mediaSourceRef?: StudioV3SourceRef; mediaId?: string; mediaAlt?: string },
): StudioV3Document {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  if (!context || Boolean(input.mediaSourceRef) === Boolean(input.mediaId)) return document;
  if (!canUpsertObjectEdit(document, context)) return document;
  if (!validOptionalCopy(input.mediaAlt, 240)) return document;
  if (input.mediaSourceRef) {
    const source = findStudioV3Piece(document.pieces, input.mediaSourceRef, input.roomId);
    if (!source || source.sourceStatus !== "current" || !source.media?.src) return document;
    return upsertObjectEdit(document, context, {
      mediaSourceRef: input.mediaSourceRef,
      mediaId: undefined,
      ...(input.mediaAlt !== undefined ? { mediaAlt: input.mediaAlt.trim() } : {}),
    }, ["mediaId"]);
  }
  const mediaId = input.mediaId!;
  const asset = document.mediaAssets[mediaId];
  if (!asset || asset.sourceStatus !== "current" || asset.mediaType !== "image") return document;
  return upsertObjectEdit(document, context, {
    mediaId,
    mediaSourceRef: undefined,
    ...(input.mediaAlt !== undefined ? { mediaAlt: input.mediaAlt.trim() } : {}),
  }, ["mediaSourceRef"]);
}

export function moveStudioV3ObjectToZone(
  document: StudioV3Document,
  baseState: StudioV2State,
  input: { roomId: string; objectId: string; zoneId: string },
): StudioV3EditingResult {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  if (!context) return { document, error: "This object is not available in the current Room." };
  if (!canUpsertObjectEdit(document, context)) {
    return { document, error: "Private edit capacity is full. Remove a retained edit before moving this Piece." };
  }
  if (context.piece.sourceStatus !== "current" || context.edit?.visibility === "hidden") {
    return { document, error: "Hidden or unavailable objects cannot be moved." };
  }
  const prepared = prepareComposition(document, baseState, input.roomId);
  if (!prepared) return { document, error: "This Room has no registered composition." };
  const object = prepared.objects.find((candidate) => candidate.id === input.objectId);
  if (!object) return { document, error: "This object is not available in the current Room." };
  const error = placementMoveError(prepared.composition, object, input.zoneId);
  if (error) return { document, error };
  const zone = studioV2Layout(prepared.composition.layoutId).zones.find((candidate) => candidate.id === input.zoneId)!;
  const current = prepared.composition.placements.find((candidate) => candidate.objectId === input.objectId);
  const otherPlacements = prepared.composition.placements.filter((candidate) => candidate.objectId !== input.objectId);
  const size = current && zone.allowedSizes.includes(current.size) ? current.size : zone.defaultSize;
  const treatment = current?.treatment && zone.allowedTreatments?.includes(current.treatment)
    ? current.treatment
    : zone.allowedTreatments?.[0];
  const order = otherPlacements.filter((candidate) => candidate.zoneId === zone.id).length;
  const nextPlacement: StudioV2ObjectPlacement = {
    objectId: input.objectId,
    chamberId: input.roomId,
    layoutId: prepared.composition.layoutId,
    zoneId: zone.id,
    order,
    size,
    ...(treatment ? { treatment } : {}),
  };
  const nextComposition = { ...prepared.composition, placements: [...otherPlacements, nextPlacement] };
  const withComposition = updateRoomComposition(document, input.roomId, nextComposition, nextPlacement);
  return {
    document: upsertObjectEdit(withComposition, context, {
      zoneId: zone.id,
      order,
      size,
    ...(treatment ? { treatment } : {}),
    featured: size === "feature",
  }),
  };
}

export function reorderStudioV3Object(
  document: StudioV3Document,
  baseState: StudioV2State,
  input: { roomId: string; objectId: string; direction: "earlier" | "later" },
): StudioV3EditingResult {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  const prepared = prepareComposition(document, baseState, input.roomId);
  if (!context || !prepared) return { document, error: "This object is not available in the current Room." };
  if (!canUpsertObjectEdit(document, context)) {
    return { document, error: "Private edit capacity is full. Remove a retained edit before reordering." };
  }
  const target = prepared.composition.placements.find((candidate) => candidate.objectId === input.objectId);
  if (!target) return { document, error: "This object does not have a safe position in this Room." };
  const siblings = prepared.composition.placements
    .filter((candidate) => candidate.zoneId === target.zoneId)
    .sort((left, right) => left.order - right.order || left.objectId.localeCompare(right.objectId));
  const currentIndex = siblings.findIndex((candidate) => candidate.objectId === input.objectId);
  const swapIndex = input.direction === "earlier" ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return { document };
  const reorderedSiblings = [...siblings];
  [reorderedSiblings[currentIndex], reorderedSiblings[swapIndex]] = [reorderedSiblings[swapIndex]!, reorderedSiblings[currentIndex]!];
  const missingEditCount = reorderedSiblings.filter((placement) => (
    !document.objectEdits[studioV3ObjectEditId(input.roomId, placement.objectId)]
  )).length;
  if (Object.keys(document.objectEdits).length + missingEditCount > 160) {
    return { document, error: "Private edit capacity is full. Remove a retained edit before reordering." };
  }
  const orderByObjectId = new Map(reorderedSiblings.map((placement, index) => [placement.objectId, index]));
  const placements = prepared.composition.placements.map((candidate) => {
    const order = orderByObjectId.get(candidate.objectId);
    return order === undefined ? candidate : { ...candidate, order };
  });
  let next = updateRoomComposition(document, input.roomId, { ...prepared.composition, placements });
  for (const sibling of reorderedSiblings) {
    const siblingContext = findStudioV3ObjectContext(next, input.roomId, sibling.objectId);
    if (!siblingContext) continue;
    next = upsertObjectEdit(next, siblingContext, {
      order: orderByObjectId.get(sibling.objectId)!,
      zoneId: sibling.zoneId,
      size: sibling.size,
      ...(sibling.treatment ? { treatment: sibling.treatment } : {}),
    });
  }
  return { document: next };
}

export function toggleStudioV3ObjectFeatured(
  document: StudioV3Document,
  baseState: StudioV2State,
  input: { roomId: string; objectId: string },
): StudioV3EditingResult {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  const prepared = prepareComposition(document, baseState, input.roomId);
  if (!context || !prepared) return { document, error: "This object is not available in the current Room." };
  if (!canUpsertObjectEdit(document, context)) {
    return { document, error: "Private edit capacity is full. Remove a retained edit before changing feature size." };
  }
  const object = prepared.objects.find((candidate) => candidate.id === input.objectId);
  const current = prepared.composition.placements.find((candidate) => candidate.objectId === input.objectId);
  if (!object || !current) return { document, error: "This object does not have a safe position in this Room." };
  const layout = studioV2Layout(prepared.composition.layoutId);
  const currentZone = layout.zones.find((candidate) => candidate.id === current.zoneId)!;
  const isFeatured = context.edit?.featured === true || current.size === "feature";
  if (isFeatured) {
    const size = currentZone.allowedSizes.find((candidate) => candidate !== "feature");
    if (!size) return { document, error: "This position only supports a featured object." };
    return { document: setCompositionAppearance(document, context, prepared.composition, current, { size, featured: false }) };
  }
  const featureZone = layout.zones.find((zone) => {
    if (!zone.accepts.includes(object.type) || !zone.allowedSizes.includes("feature")) return false;
    const occupants = prepared.composition.placements.filter((candidate) => candidate.zoneId === zone.id && candidate.objectId !== object.id);
    return zone.maxObjects === undefined || occupants.length < zone.maxObjects;
  });
  if (!featureZone) return { document, error: "No featured position is available for this object in the current Room." };
  const moved = moveStudioV3ObjectToZone(document, baseState, { ...input, zoneId: featureZone.id });
  if (moved.error) return moved;
  const movedContext = findStudioV3ObjectContext(moved.document, input.roomId, input.objectId)!;
  const movedPrepared = prepareComposition(moved.document, baseState, input.roomId)!;
  const movedPlacement = movedPrepared.composition.placements.find((candidate) => candidate.objectId === input.objectId)!;
  return {
    document: setCompositionAppearance(moved.document, movedContext, movedPrepared.composition, movedPlacement, {
      size: "feature",
      featured: true,
    }),
  };
}

export function setStudioV3ObjectSize(
  document: StudioV3Document,
  baseState: StudioV2State,
  input: { roomId: string; objectId: string; size: StudioV2PlacementSize },
): StudioV3EditingResult {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  const prepared = prepareComposition(document, baseState, input.roomId);
  if (!context || !prepared) return { document, error: "This object is not available in the current Room." };
  if (!canUpsertObjectEdit(document, context)) {
    return { document, error: "Private edit capacity is full. Remove a retained edit before changing Piece size." };
  }
  const current = prepared.composition.placements.find((candidate) => candidate.objectId === input.objectId);
  if (!current) return { document, error: "This object does not have a safe position in this Room." };
  const zone = studioV2Layout(prepared.composition.layoutId).zones.find((candidate) => candidate.id === current.zoneId);
  if (!zone?.allowedSizes.includes(input.size)) {
    return { document, error: "That size is not registered for this Piece's current zone." };
  }
  if (current.size === input.size) return { document };
  return {
    document: setCompositionAppearance(document, context, prepared.composition, current, {
      size: input.size,
      featured: input.size === "feature",
      treatment: current.treatment,
    }),
  };
}

export function setStudioV3ObjectTreatment(
  document: StudioV3Document,
  baseState: StudioV2State,
  input: { roomId: string; objectId: string; treatment: StudioV2PlacementTreatment },
): StudioV3EditingResult {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  const prepared = prepareComposition(document, baseState, input.roomId);
  if (!context || !prepared) return { document, error: "This object is not available in the current Room." };
  if (!canUpsertObjectEdit(document, context)) {
    return { document, error: "Private edit capacity is full. Remove a retained edit before changing Piece treatment." };
  }
  const current = prepared.composition.placements.find((candidate) => candidate.objectId === input.objectId);
  if (!current) return { document, error: "This object does not have a safe position in this Room." };
  const zone = studioV2Layout(prepared.composition.layoutId).zones.find((candidate) => candidate.id === current.zoneId);
  if (!zone?.allowedTreatments?.includes(input.treatment)) {
    return { document, error: "That treatment is not registered for this Piece's current zone." };
  }
  if (current.treatment === input.treatment) return { document };
  return {
    document: setCompositionAppearance(document, context, prepared.composition, current, {
      size: current.size,
      featured: current.size === "feature",
      treatment: input.treatment,
    }),
  };
}

export function setStudioV3ObjectVisibility(
  document: StudioV3Document,
  input: { roomId: string; objectId: string; visibility: "visible" | "hidden" },
): StudioV3Document {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  if (!context || (input.visibility !== "visible" && input.visibility !== "hidden")) return document;
  if (input.visibility === "hidden" && isStudioV3RequiredCta(document, context)) return document;
  if (input.visibility === "visible" && context.placement?.visibility === "hidden") {
    if (context.piece.sourceStatus !== "current") return document;
    let next: StudioV3Document = {
      ...document,
      rooms: document.rooms.map((room) => room.id !== input.roomId ? room : {
        ...room,
        placements: room.placements.map((placement) => {
          if (placement.id !== input.objectId) return placement;
          const restored: StudioV3Placement = { ...placement, status: "placed" };
          delete restored.visibility;
          delete restored.reason;
          return restored;
        }),
      }),
    };
    const restoredContext = findStudioV3ObjectContext(next, input.roomId, input.objectId);
    if (restoredContext && canUpsertObjectEdit(next, restoredContext)) {
      next = upsertObjectEdit(next, restoredContext, { visibility: "visible" });
    }
    return remapStudioV3RoomForCurrentStyle(next, input.roomId);
  }
  if (!canUpsertObjectEdit(document, context)) return document;
  return upsertObjectEdit(document, context, { visibility: input.visibility });
}

export function isStudioV3RequiredCta(
  document: StudioV3Document,
  context: Pick<StudioV3ObjectContext, "sourceRef">
    & Partial<Pick<StudioV3ObjectContext, "roomId" | "objectId" | "piece">>
    | null
    | undefined,
): boolean {
  const requiredPiece = Object.values(document.pieces).find((piece) => (
    piece.snapshotType === "cta" && piece.sourceRef === document.navigation.requiredCta.sourceRef
  ));
  const requiredPlacement = requiredPiece ? undefined : document.rooms.flatMap((room) => (
    room.placements.map((placement) => ({ roomId: room.id, placement }))
  )).find(({ placement }) => placement.sourceRef === document.navigation.requiredCta.sourceRef);
  const matchesConcreteIdentity = requiredPiece
    ? context?.piece?.snapshotType === "cta"
      && context.roomId === requiredPiece.roomId
      && context.objectId === requiredPiece.id
    : requiredPlacement
      ? context?.roomId === requiredPlacement.roomId
        && context.objectId === requiredPlacement.placement.id
      : true;
  return Boolean(
    context &&
    document.navigation.requiredCta.visible &&
    document.navigation.requiredCta.sourceRef === context.sourceRef &&
    matchesConcreteIdentity,
  );
}

export function unplaceStudioV3Object(
  document: StudioV3Document,
  input: { roomId: string; objectId: string },
): StudioV3Document {
  const context = findStudioV3ObjectContext(document, input.roomId, input.objectId);
  if (!context?.placement || isStudioV3RequiredCta(document, context)) return document;
  const editId = studioV3ObjectEditId(input.roomId, input.objectId);
  const objectEdits = { ...document.objectEdits };
  delete objectEdits[editId];
  return {
    ...document,
    objectEdits,
    rooms: document.rooms.map((room) => room.id !== input.roomId ? room : {
      ...room,
      placements: room.placements.filter((placement) => placement.id !== input.objectId),
      ...(room.composition ? {
        composition: {
          ...room.composition,
          placements: room.composition.placements.filter((placement) => placement.objectId !== input.objectId),
        },
      } : {}),
    }),
  };
}

export function applyStudioV3LayerOverride(
  document: StudioV3Document,
  input: {
    scopeKind: StudioV3ScopeKind;
    scopeId: string;
    layer: StudioV3Layer;
    value: StudioV3LayerOverrideValue;
    provenance: string;
  },
): StudioV3Document {
  if (!isStableReference(input.scopeId) || !isStableReference(input.provenance) || !isSafeLayerValue(input.value)) return document;
  if (!scopeExists(document, input.scopeKind, input.scopeId)) return document;
  const blocked = document.locks.some((lock) => lock.layer === input.layer && (
    (lock.scopeKind === input.scopeKind && lock.scopeId === input.scopeId) || lock.scopeKind === "presence"
  ));
  if (blocked) return document;
  const id = `${input.scopeKind}:${input.scopeId}:${input.layer}`;
  const current = document.layerOverrides.find((candidate) => candidate.id === id);
  if (!current && document.layerOverrides.length >= 160) return document;
  const override: StudioV3LayerOverride = {
    id,
    ...input,
    value: structuredClone({ ...(current?.value ?? {}), ...input.value }),
  };
  return {
    ...document,
    layerOverrides: [...document.layerOverrides.filter((candidate) => candidate.id !== id), override],
  };
}

export function upsertStudioV3MediaAsset(document: StudioV3Document, asset: PresenceEditorAsset): StudioV3Document {
  const mediaId = asset.media_id;
  if (!mediaId || !isStableReference(mediaId) || !isSafeRuntimeMediaUrl(asset.url)) return document;
  const mediaType = asset.asset_type === "image" || asset.mime_type?.startsWith("image/") ? "image" : "unknown";
  const sourceStatus = mediaType === "image" && isAvailableRuntimeAsset(asset) ? "current" : "unavailable";
  const mediaAsset: StudioV3MediaAsset = {
    mediaId,
    src: asset.url,
    alt: typeof asset.alt_text === "string" ? asset.alt_text.slice(0, 240) : "",
    mediaType,
    sourceStatus,
    fromAsset: structuredClone(asset),
  };
  return { ...document, mediaAssets: { ...document.mediaAssets, [mediaId]: mediaAsset } };
}

function upsertObjectEdit(
  document: StudioV3Document,
  context: StudioV3ObjectContext,
  patch: Partial<StudioV3ObjectEdit>,
  deleteKeys: Array<"mediaId" | "mediaSourceRef"> = [],
): StudioV3Document {
  const id = studioV3ObjectEditId(context.roomId, context.objectId);
  if (!document.objectEdits[id] && Object.keys(document.objectEdits).length >= 160) return document;
  const current: StudioV3ObjectEdit = document.objectEdits[id] ?? {
    id,
    roomId: context.roomId,
    objectId: context.objectId,
    sourceRef: context.sourceRef,
  };
  const next = { ...current, ...patch } as StudioV3ObjectEdit;
  for (const key of deleteKeys) delete next[key];
  return { ...document, objectEdits: { ...document.objectEdits, [id]: next } };
}

function canUpsertObjectEdit(document: StudioV3Document, context: StudioV3ObjectContext): boolean {
  const id = studioV3ObjectEditId(context.roomId, context.objectId);
  return Boolean(document.objectEdits[id]) || Object.keys(document.objectEdits).length < 160;
}

function prepareComposition(document: StudioV3Document, baseState: StudioV2State, roomId: string): {
  composition: StudioV2ChamberComposition;
  objects: StudioV2Object[];
} | null {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  const chamber = baseState.chambers.find((candidate) => candidate.id === roomId);
  if (!room || !chamber) return null;
  const objects = [
    ...chamber.objects.filter((object) => {
      if (!room.baseObjectIds.includes(object.id)) return false;
      const context = findStudioV3ObjectContext(document, roomId, object.id);
      return context?.edit?.visibility !== "hidden" || isStudioV3RequiredCta(document, context);
    }),
    ...room.placements.flatMap((placement): StudioV2Object[] => {
      const piece = findStudioV3Piece(document.pieces, placement.sourceRef, roomId);
      const context = findStudioV3ObjectContext(document, roomId, placement.id);
      if (!piece || piece.sourceStatus !== "current" || placement.status !== "placed" || placement.visibility === "hidden"
        || (context?.edit?.visibility === "hidden" && !isStudioV3RequiredCta(document, context))) return [];
      return [{
        id: placement.id,
        type: piece.snapshotType,
        title: piece.title,
        visibility: { public: true, mobile: true },
        transform: { ...DEFAULT_STUDIO_V2_TRANSFORM },
        locked: false,
        pinned: false,
      }];
    }),
  ];
  const layoutId = studioV3RoomStyleDefinition(room.styleId).v2LayoutId;
  const composition = room.composition?.layoutId === layoutId
    ? normalizeStudioV2Composition(room.composition, roomId, objects)
    : defaultStudioV2Composition(roomId, objects, layoutId);
  return { composition, objects };
}

function updateRoomComposition(
  document: StudioV3Document,
  roomId: string,
  composition: StudioV2ChamberComposition,
  placementUpdate?: StudioV2ObjectPlacement,
): StudioV3Document {
  return {
    ...document,
    rooms: document.rooms.map((room) => room.id !== roomId ? room : {
      ...room,
      composition,
      placements: placementUpdate ? room.placements.map((placement) => placement.id !== placementUpdate.objectId ? placement : {
        ...placement,
        order: placementUpdate.order,
      }) : room.placements,
    }),
  };
}

function setCompositionAppearance(
  document: StudioV3Document,
  context: StudioV3ObjectContext,
  composition: StudioV2ChamberComposition,
  placement: StudioV2ObjectPlacement,
  input: { size: StudioV2PlacementSize; featured: boolean; treatment?: StudioV2PlacementTreatment },
): StudioV3Document {
  const nextPlacement = {
    ...placement,
    size: input.size,
    ...(input.treatment ? { treatment: input.treatment } : {}),
  };
  const nextComposition = {
    ...composition,
    placements: composition.placements.map((candidate) => candidate.objectId === placement.objectId ? nextPlacement : candidate),
  };
  const withComposition = updateRoomComposition(document, context.roomId, nextComposition, nextPlacement);
  return upsertObjectEdit(withComposition, context, {
    zoneId: nextPlacement.zoneId,
    order: nextPlacement.order,
    size: input.size,
    ...(nextPlacement.treatment ? { treatment: nextPlacement.treatment } : {}),
    featured: input.featured,
  });
}

function validOptionalCopy(value: string | undefined, maxLength: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maxLength && !containsForbiddenStudioV3Text(value));
}

function isStableReference(value: string): boolean {
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

function scopeExists(document: StudioV3Document, scopeKind: StudioV3ScopeKind, scopeId: string): boolean {
  if (scopeKind === "presence") return scopeId === String(document.nodeId);
  if (scopeKind === "room") return document.rooms.some((room) => room.id === scopeId);
  if (scopeKind === "collection") return Boolean(document.collections[scopeId]);
  return Boolean(document.pieces[scopeId]) || document.rooms.some((room) => Boolean(findStudioV3ObjectContext(document, room.id, scopeId)));
}

function isSafeLayerValue(value: StudioV3LayerOverrideValue): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value) as Array<keyof StudioV3LayerOverrideValue>;
  if (keys.length === 0 || keys.some((key) => !LAYER_VALUE_KEYS.has(key))) return false;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "background" || key === "accentColor") && (typeof child !== "string" || !/^#[0-9a-f]{6}$/i.test(child))) return false;
    if (key === "texture" && !["none", "paper", "grain", "scan", "linen", "timber", "ledger"].includes(String(child))) return false;
    if (key === "borderStyle" && !["none", "hairline", "framed", "taped", "ledger"].includes(String(child))) return false;
    if (key === "objectRadius" && !finiteRange(child, 0, 40)) return false;
    if (key === "shadowDepth" && !finiteRange(child, 0, 1)) return false;
    if (key === "headingWeight" && (!finiteRange(child, 300, 900) || !Number.isInteger(child))) return false;
    if (key === "motionIntensity" && !["still", "gentle", "living"].includes(String(child))) return false;
    if (key === "publicStylePreset" && !(STUDIO_V2_PUBLIC_STYLE_PRESETS as readonly string[]).includes(String(child))) return false;
    if (key === "roomStyleId" && !["threshold-portal", "gallery-wall", "film-strip-selected-works"].includes(String(child))) return false;
    if (key === "worldId" && !["gallery", "zine", "dj", "healing", "market", "archive", "carpenter", "consultant"].includes(String(child))) return false;
    if (key === "collectionPresentationId" && !["wall", "selected-sequence", "threshold-feature"].includes(String(child))) return false;
    if (key === "density" && !["spacious", "focused", "dense"].includes(String(child))) return false;
    if (key === "pieceTreatment" && !["quiet-framed", "luminous-depth", "captioned-ledger"].includes(String(child))) return false;
    if (key === "atmosphere" && !["paper-light", "nocturnal-depth", "ledger-scan"].includes(String(child))) return false;
    if (key === "journey" && !["editorial-browse", "threshold-reveal", "archive-index"].includes(String(child))) return false;
  }
  return true;
}

const LAYER_VALUE_KEYS = new Set<keyof StudioV3LayerOverrideValue>([
  "background", "accentColor", "texture", "borderStyle", "objectRadius", "shadowDepth", "headingWeight",
  "motionIntensity", "publicStylePreset", "roomStyleId", "worldId", "collectionPresentationId", "density",
  "pieceTreatment", "atmosphere", "journey",
]);

function finiteRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
