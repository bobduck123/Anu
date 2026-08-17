import { compileSpatialRoom } from "./compile.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import type {
  SpatialAnchorDefinition,
  SpatialAnchorKind,
  SpatialActionRef,
  SpatialMaterialPresetId,
  SpatialMaterialSlotId,
  SpatialMediaRef,
  SpatialPlacement,
  SpatialRoomDefinition,
  SpatialSkinRef,
  SpatialTransform,
  SpatialValidationIssue,
} from "./model.ts";
import { materialPresetMatchesSlot } from "./materials.ts";
import {
  applySpatialPlacementMutation,
  DEFAULT_SPATIAL_SNAP_SETTINGS,
  snapSpatialTransform,
} from "./placement.ts";
import { spatialComponent } from "./registry.ts";

export type ArrangerComponentId =
  | "presence.wall-panel"
  | "presence.divider-wall"
  | "presence.display-table"
  | "presence.retail-rack"
  | "presence.display-plinth"
  | "presence.projection-wall"
  | "presence.rounded-island"
  | "presence.display-shelf"
  | "presence.framed-media"
  | "presence.text-sign-card"
  | "presence.product-display-block"
  | "presence.light-fixture"
  | "presence.drape-divider";

export interface ArrangerComponentOption {
  componentId: ArrangerComponentId;
  version: string;
  label: string;
  anchorKind: "floor" | "wall" | "free";
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
}

export const ARRANGER_COMPONENT_OPTIONS = [
  {
    componentId: "presence.wall-panel",
    version: "1.0.0",
    label: "Wall panel",
    anchorKind: "wall",
    materialSlotOverrides: { wall: "wall-charcoal" },
  },
  {
    componentId: "presence.divider-wall",
    version: "1.0.0",
    label: "Divider wall",
    anchorKind: "floor",
    materialSlotOverrides: { wall: "wall-charcoal", "logo-accent": "accent-signal" },
  },
  {
    componentId: "presence.display-table",
    version: "1.0.0",
    label: "Display table",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-warm-stone" },
  },
  {
    componentId: "presence.retail-rack",
    version: "1.0.0",
    label: "Retail rack",
    anchorKind: "floor",
    materialSlotOverrides: { "rack-metal": "rack-matte-black" },
  },
  {
    componentId: "presence.display-plinth",
    version: "1.0.0",
    label: "Display plinth",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-warm-stone" },
  },
  {
    componentId: "presence.projection-wall",
    version: "1.0.0",
    label: "Projection wall",
    anchorKind: "wall",
    materialSlotOverrides: { projection: "projection-emissive", wall: "wall-charcoal" },
  },
  {
    componentId: "presence.rounded-island",
    version: "1.0.0",
    label: "Display island",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-pale-sculptural", "rack-metal": "rack-boutique-blackened" },
  },
  {
    componentId: "presence.display-shelf",
    version: "1.0.0",
    label: "Display shelf",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-warm-stone", "rack-metal": "rack-matte-black" },
  },
  {
    componentId: "presence.framed-media",
    version: "1.0.0",
    label: "Frame / poster surface",
    anchorKind: "wall",
    materialSlotOverrides: { "poster-decal": "poster-satin", "rack-metal": "rack-matte-black" },
  },
  {
    componentId: "presence.text-sign-card",
    version: "1.0.0",
    label: "Text / sign card",
    anchorKind: "floor",
    materialSlotOverrides: { paper: "paper-uncoated", "poster-decal": "poster-satin" },
  },
  {
    componentId: "presence.product-display-block",
    version: "1.0.0",
    label: "Product display block",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-gallery-white", "logo-accent": "accent-signal" },
  },
  {
    componentId: "presence.light-fixture",
    version: "1.0.0",
    label: "Light fixture",
    anchorKind: "floor",
    materialSlotOverrides: { "rack-metal": "rack-matte-black", "logo-accent": "accent-signal" },
  },
  {
    componentId: "presence.drape-divider",
    version: "1.0.0",
    label: "Drape / soft divider",
    anchorKind: "floor",
    materialSlotOverrides: { fabric: "fabric-nocturnal", "rack-metal": "rack-matte-black" },
  },
] as const satisfies readonly ArrangerComponentOption[];

export type ArrangerMutationResult =
  | { ok: true; room: SpatialRoomDefinition; issues: readonly [] }
  | { ok: false; room: SpatialRoomDefinition; issues: readonly SpatialValidationIssue[] };

const MOVABLE_FLOOR_COMPONENTS = new Set<ArrangerComponentId>([
  "presence.divider-wall",
  "presence.display-table",
  "presence.retail-rack",
  "presence.display-plinth",
  "presence.rounded-island",
  "presence.display-shelf",
  "presence.text-sign-card",
  "presence.product-display-block",
  "presence.light-fixture",
  "presence.drape-divider",
]);
const MOVABLE_WALL_COMPONENTS = new Set<ArrangerComponentId>([
  "presence.wall-panel",
  "presence.projection-wall",
  "presence.framed-media",
]);

const PIECE_PARENT_ANCHOR_KINDS = new Set<SpatialAnchorKind>(["wall", "surface", "rack", "projection"]);
const NON_STACKING_WALL_COMPONENTS = new Set(["presence.wall-panel", "presence.projection-wall"]);
const MAX_ARRANGER_SEARCH_ATTEMPTS = 20_000;

export const AUTHORING_CONTRAST_SKIN_ID = "presence-authoring-contrast-skin";

const AUTHORING_CONTRAST_SKIN: SpatialSkinRef = {
  id: AUTHORING_CONTRAST_SKIN_ID,
  label: "Presence authoring contrast skin",
  materialPresets: {
    "poster-decal": "poster-satin",
    "rack-metal": "rack-matte-black",
  },
  colors: {
    "poster-decal": "#30d5c8",
    "rack-metal": "#f4b942",
  },
  decalAssetIds: [],
};

/**
 * Creates a validation-ready Mobstar arranger draft without carrying the proof
 * fixture's bespoke layout forward. Public-safe/generated catalog references are
 * retained so the operator can assign Pieces without fetching anything.
 */
export function createBlankMobstarSpatialRoom(): SpatialRoomDefinition {
  const overviewStates = MOBSTAR_SPATIAL_ROOM_FIXTURE.states
    .filter((state) => state.id === "overview" || state.id === "overview-static")
    .map((state) => ({ ...state }));
  const foundationPlacements = MOBSTAR_SPATIAL_ROOM_FIXTURE.placements
    .filter((placement) => placement.id === "room-shell" || placement.id === "floor")
    .map((placement) => ({
      ...placement,
      transform: {
        position: placement.transform.position,
        rotation: placement.transform.rotation,
        scale: placement.transform.scale,
      },
      anchor: { ...placement.anchor },
      materialSlotOverrides: { ...placement.materialSlotOverrides },
      actionRefs: [...placement.actionRefs],
    }));

  return {
    ...MOBSTAR_SPATIAL_ROOM_FIXTURE,
    id: "mobstar-internal-arranger-room",
    label: "Mobstar blank spatial arranger draft",
    revision: 1,
    seed: "mobstar-arranger-blank-v1",
    assets: MOBSTAR_SPATIAL_ROOM_FIXTURE.assets.map((asset) => ({ ...asset })),
    skins: [
      ...MOBSTAR_SPATIAL_ROOM_FIXTURE.skins.map((skin) => ({
        ...skin,
        materialPresets: { ...skin.materialPresets },
        colors: { ...skin.colors },
        decalAssetIds: [...skin.decalAssetIds],
      })),
      {
        ...AUTHORING_CONTRAST_SKIN,
        materialPresets: { ...AUTHORING_CONTRAST_SKIN.materialPresets },
        colors: { ...AUTHORING_CONTRAST_SKIN.colors },
        decalAssetIds: [],
      },
    ],
    media: MOBSTAR_SPATIAL_ROOM_FIXTURE.media.map((media) => ({ ...media })),
    actions: [],
    placements: foundationPlacements,
    states: overviewStates,
    semanticFallback: [],
  };
}

/** Adds one registered arranger fixture at the first deterministic valid grid point. */
export function addArrangerComponent(room: SpatialRoomDefinition, componentId: string): ArrangerMutationResult {
  const option = ARRANGER_COMPONENT_OPTIONS.find((candidate) => candidate.componentId === componentId);
  if (!option) {
    return reject(room, "placements", "arranger-component", `Component ${componentId} is not available in the internal arranger.`);
  }
  const definition = spatialComponent({ componentId: option.componentId, version: option.version });
  if (!definition) {
    return reject(room, "placements", "unknown-component", `Component ${componentId}@${option.version} is not registered.`);
  }

  const placementId = nextStableId(`arranger-${componentId.replace(/^presence\./, "").replaceAll(".", "-")}`, room.placements.map((item) => item.id));
  const order = nextPlacementOrder(room);
  const skinRef = room.skins[0]?.id;
  let lastIssues: readonly SpatialValidationIssue[] = [];

  let searchAttempts = 0;
  for (const [x, z] of candidateGridPositions(room, option, definition.dimensions.width, definition.dimensions.depth)) {
    searchAttempts += 1;
    if (searchAttempts > MAX_ARRANGER_SEARCH_ATTEMPTS) break;
    if (
      option.anchorKind === "wall"
      && wallFootprintIsOccupied(room, x, z, definition.dimensions.width, definition.dimensions.depth)
    ) {
      continue;
    }
    const placement: SpatialPlacement = {
      id: placementId,
      order,
      componentId: option.componentId,
      version: option.version,
      transform: {
        position: [x, definition.dimensions.height / 2, z],
        rotation: [0, option.anchorKind === "wall" && z > 0 ? Math.PI : 0, 0],
        scale: [1, 1, 1],
      },
      anchor: { kind: option.anchorKind },
      materialSlotOverrides: { ...option.materialSlotOverrides },
      ...(skinRef ? { skinRef } : {}),
      actionRefs: [],
      visible: true,
      semanticLabel: option.label,
    };
    const mutation = applySpatialPlacementMutation(room, { kind: "add", placement });
    if (!mutation.ok) {
      lastIssues = mutation.issues;
      if (hasPositionIndependentArrangerFailure(lastIssues)) {
        return { ok: false, room, issues: lastIssues };
      }
      continue;
    }
    return acceptCandidate(room, { ...mutation.room, revision: room.revision + 1 });
  }

  return {
    ok: false,
    room,
    issues: [
      issue(
        "placements",
        "no-valid-position",
        searchAttempts > MAX_ARRANGER_SEARCH_ATTEMPTS
          ? `No valid position was found for ${option.label} within the bounded ${MAX_ARRANGER_SEARCH_ATTEMPTS}-candidate search.`
          : `No valid 0.25 m grid position is available for ${option.label}.`,
      ),
      ...lastIssues,
    ],
  };
}

export function isArrangerMovablePlacement(placement: SpatialPlacement): boolean {
  if (placement.anchor.kind === "floor") {
    return MOVABLE_FLOOR_COMPONENTS.has(placement.componentId as ArrangerComponentId);
  }
  return placement.anchor.kind === "wall"
    && MOVABLE_WALL_COMPONENTS.has(placement.componentId as ArrangerComponentId);
}

/** Moves a floor fixture by a delta and snaps x/z to the 0.25 m arranger grid. */
export function moveArrangerPlacement(
  room: SpatialRoomDefinition,
  placementId: string,
  deltaX: number,
  deltaZ: number,
): ArrangerMutationResult {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaZ)) {
    return reject(room, `placements.${placementId}.transform.position`, "invalid-coordinate", "Move deltas must be finite numbers.");
  }
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  return moveArrangerPlacementTo(
    room,
    placementId,
    placement.transform.position[0] + deltaX,
    placement.transform.position[2] + deltaZ,
  );
}

/** Moves a floor fixture to an absolute x/z position on the 0.25 m grid. */
export function moveArrangerPlacementTo(
  room: SpatialRoomDefinition,
  placementId: string,
  x: number,
  z: number,
): ArrangerMutationResult {
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return reject(room, `placements.${placementId}.transform.position`, "invalid-coordinate", "Move coordinates must be finite numbers.");
  }
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  if (!isArrangerMovablePlacement(placement)) {
    return reject(room, `placements.${placementId}`, "not-arranger-movable", "This foundation or anchored Piece cannot be moved in the arranger.");
  }
  const transform = snapSpatialTransform({
    ...placement.transform,
    position: [x, placement.transform.position[1], z],
  });
  return replacePlacement(room, placement, transform);
}

/** Rotates a floor fixture one 15 degree yaw step. */
export function rotateArrangerPlacement(
  room: SpatialRoomDefinition,
  placementId: string,
  direction: -1 | 1,
): ArrangerMutationResult {
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  if (!isArrangerMovablePlacement(placement)) {
    return reject(room, `placements.${placementId}`, "not-arranger-movable", "This foundation or anchored Piece cannot be rotated in the arranger.");
  }
  if (direction !== -1 && direction !== 1) {
    return reject(room, `placements.${placementId}.transform.rotation`, "rotation-direction", "Rotation direction must be -1 or 1.");
  }
  const stepRadians = DEFAULT_SPATIAL_SNAP_SETTINGS.rotationStepDegrees * Math.PI / 180;
  const transform = snapSpatialTransform({
    ...placement.transform,
    rotation: [
      placement.transform.rotation[0],
      placement.transform.rotation[1] + direction * stepRadians,
      placement.transform.rotation[2],
    ],
  });
  return replacePlacement(room, placement, transform);
}

/** Duplicates an editable fixture and its complete anchored Piece subtree. */
export function duplicateArrangerPlacement(
  room: SpatialRoomDefinition,
  placementId: string,
): ArrangerMutationResult {
  const source = room.placements.find((candidate) => candidate.id === placementId);
  if (!source) return missingPlacement(room, placementId);
  if (!isArrangerMovablePlacement(source)) {
    return reject(room, `placements.${placementId}`, "not-arranger-editable", "Foundation and anchored Piece placements cannot be duplicated directly.");
  }

  const subtree = collectPlacementSubtree(room, source.id);
  const idMap = new Map<string, string>();
  const usedPlacementIds = new Set(room.placements.map((placement) => placement.id));
  for (const placement of subtree) {
    const duplicateId = nextStableId(`${placement.id}-copy`, usedPlacementIds);
    usedPlacementIds.add(duplicateId);
    idMap.set(placement.id, duplicateId);
  }

  const actionIds = new Set(subtree.flatMap((placement) => placement.actionRefs));
  const actionIdMap = new Map<string, string>();
  const usedActionIds = new Set(room.actions.map((action) => action.id));
  for (const actionId of actionIds) {
    const duplicateId = nextStableId(`${actionId}-copy`, usedActionIds);
    usedActionIds.add(duplicateId);
    actionIdMap.set(actionId, duplicateId);
  }

  const orderBase = nextPlacementOrder(room);
  const cloneAt = (rootTransform: SpatialTransform): SpatialRoomDefinition => {
    const placements = subtree.map((placement, index): SpatialPlacement => ({
      ...placement,
      id: idMap.get(placement.id)!,
      order: orderBase + index,
      transform: placement.id === source.id ? rootTransform : placement.transform,
      anchor: {
        ...placement.anchor,
        parentPlacementId: placement.anchor.parentPlacementId
          ? idMap.get(placement.anchor.parentPlacementId) ?? placement.anchor.parentPlacementId
          : undefined,
      },
      materialSlotOverrides: { ...placement.materialSlotOverrides },
      actionRefs: placement.actionRefs.map((actionId) => actionIdMap.get(actionId) ?? actionId),
    }));
    const actions: SpatialActionRef[] = room.actions
      .filter((action) => actionIds.has(action.id))
      .map((action) => duplicateSpatialAction(action, actionIdMap, idMap));
    const semanticFallback = room.semanticFallback
      .filter((item) => idMap.has(item.placementId))
      .map((item) => ({
        ...item,
        placementId: idMap.get(item.placementId)!,
        actionRefs: item.actionRefs.map((actionId) => actionIdMap.get(actionId) ?? actionId),
      }));
    return {
      ...room,
      revision: room.revision + 1,
      placements: [...room.placements, ...placements],
      actions: [...room.actions, ...actions],
      semanticFallback: [...room.semanticFallback, ...semanticFallback],
      states: room.states.map((state) => ({
        ...state,
        visiblePlacementIds: state.visiblePlacementIds
          ? [
              ...state.visiblePlacementIds,
              ...state.visiblePlacementIds.flatMap((visibleId) => (
                idMap.has(visibleId) ? [idMap.get(visibleId)!] : []
              )),
            ]
          : undefined,
      })),
    };
  };

  const option = arrangerOptionForPlacement(source);
  if (!option) return reject(room, `placements.${placementId}`, "arranger-component", "This placement is not in the reusable arranger palette.");
  const definition = spatialComponent(source);
  if (!definition) return reject(room, `placements.${placementId}`, "unknown-component", "The source component is not registered.");
  let lastIssues: readonly SpatialValidationIssue[] = [];
  for (const [x, z] of duplicateCandidatePositions(room, source, option, definition.dimensions.width, definition.dimensions.depth)) {
    const candidate = cloneAt(snapSpatialTransform({
      ...source.transform,
      position: [x, source.transform.position[1], z],
    }));
    const accepted = acceptCandidate(room, candidate);
    if (accepted.ok) return accepted;
    lastIssues = accepted.issues;
    if (hasPositionIndependentArrangerFailure(lastIssues)) return accepted;
  }
  return {
    ok: false,
    room,
    issues: [issue(`placements.${placementId}`, "no-valid-duplicate-position", "No valid nearby grid position is available for the duplicate."), ...lastIssues],
  };
}

/** Deletes an editable fixture and its anchored subtree, actions and semantic rows atomically. */
export function deleteArrangerPlacement(
  room: SpatialRoomDefinition,
  placementId: string,
): ArrangerMutationResult {
  const source = room.placements.find((candidate) => candidate.id === placementId);
  if (!source) return missingPlacement(room, placementId);
  if (!isArrangerMovablePlacement(source)) {
    return reject(room, `placements.${placementId}`, "not-arranger-editable", "Foundation placements cannot be deleted, and anchored Pieces are managed through their parent fixture.");
  }
  const removedPlacementIds = new Set(collectPlacementSubtree(room, source.id).map((placement) => placement.id));
  const removedPlacementActionIds = new Set(
    room.placements
      .filter((placement) => removedPlacementIds.has(placement.id))
      .flatMap((placement) => placement.actionRefs),
  );
  const survivingPlacementActionIds = new Set(
    room.placements
      .filter((placement) => !removedPlacementIds.has(placement.id))
      .flatMap((placement) => placement.actionRefs),
  );
  const removedActionIds = new Set(
    room.actions
      .filter((action) => (
        (action.targetPlacementId && removedPlacementIds.has(action.targetPlacementId))
        || (removedPlacementActionIds.has(action.id) && !survivingPlacementActionIds.has(action.id))
      ))
      .map((action) => action.id),
  );
  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    placements: room.placements
      .filter((placement) => !removedPlacementIds.has(placement.id))
      .map((placement) => ({
        ...placement,
        actionRefs: placement.actionRefs.filter((actionId) => !removedActionIds.has(actionId)),
      })),
    actions: room.actions.filter((action) => !removedActionIds.has(action.id)),
    semanticFallback: room.semanticFallback
      .filter((item) => !removedPlacementIds.has(item.placementId))
      .map((item) => ({
        ...item,
        actionRefs: item.actionRefs.filter((actionId) => !removedActionIds.has(actionId)),
      })),
    states: room.states.map((state) => ({
      ...state,
      focusPlacementId: state.focusPlacementId && removedPlacementIds.has(state.focusPlacementId)
        ? undefined
        : state.focusPlacementId,
      visiblePlacementIds: state.visiblePlacementIds?.filter((id) => !removedPlacementIds.has(id)),
    })),
  };
  return acceptCandidate(room, candidate);
}

/** Assigns one material preset to a component-owned slot. */
export function assignArrangerMaterialPreset(
  room: SpatialRoomDefinition,
  placementId: string,
  slot: SpatialMaterialSlotId,
  presetId: SpatialMaterialPresetId,
): ArrangerMutationResult {
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  const definition = spatialComponent(placement);
  if (!definition?.materialSlots.includes(slot)) {
    return reject(room, `placements.${placementId}.materialSlotOverrides.${slot}`, "unsupported-slot", "This component does not expose that material slot.");
  }
  if (!materialPresetMatchesSlot(slot, presetId)) {
    return reject(room, `placements.${placementId}.materialSlotOverrides.${slot}`, "preset-slot", "The material preset does not match the selected slot.");
  }
  return replacePlacementData(room, placement, {
    materialSlotOverrides: { ...placement.materialSlotOverrides, [slot]: presetId },
  });
}

/** Assigns an existing room skin without duplicating geometry or media payloads. */
export function assignArrangerSkin(
  room: SpatialRoomDefinition,
  placementId: string,
  skinId: string,
): ArrangerMutationResult {
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  if (!room.skins.some((skin) => skin.id === skinId)) {
    return reject(room, `placements.${placementId}.skinRef`, "missing-skin", `Skin ${skinId} does not exist in this room.`);
  }
  return replacePlacementData(room, placement, { skinRef: skinId });
}

/** Assigns safe room media directly to a component that exposes a visual media surface. */
export function assignArrangerPlacementMedia(
  room: SpatialRoomDefinition,
  placementId: string,
  mediaId: string,
): ArrangerMutationResult {
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  const media = room.media.find((candidate) => candidate.id === mediaId);
  if (!media) return reject(room, `media.${mediaId}`, "missing-media", `Media ${mediaId} does not exist in this room.`);
  const definition = spatialComponent(placement);
  const supportsDirectMedia = definition?.category === "piece"
    || definition?.category === "projection";
  if (!supportsDirectMedia) {
    return reject(room, `placements.${placementId}.mediaRef`, "media-surface", "This component does not expose a direct media, decal or projection surface.");
  }
  const semanticLabel = boundedText(media.alt, 200);
  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    placements: room.placements.map((item) => item.id === placementId
      ? { ...item, mediaRef: mediaId, semanticLabel }
      : item),
    semanticFallback: upsertSemanticItem(room, placementId, semanticLabel),
  };
  return acceptCandidate(room, candidate);
}

/** Assigns a credential-free HTTPS action and preserves it in semantic fallback. */
export function assignArrangerOpenLink(
  room: SpatialRoomDefinition,
  placementId: string,
  label: string,
  href: string,
): ArrangerMutationResult {
  const placement = room.placements.find((candidate) => candidate.id === placementId);
  if (!placement) return missingPlacement(room, placementId);
  if (!isSafeArrangerHref(href)) {
    return reject(room, `placements.${placementId}.actionRefs`, "unsafe-link", "Only credential-free HTTPS links are supported.");
  }
  const normalizedLabel = boundedText(label.trim(), 160);
  if (!normalizedLabel) {
    return reject(room, `placements.${placementId}.actionRefs`, "action-label", "Link actions require a non-empty label.");
  }
  const actionId = nextStableId(`open-link-${placementId}`, room.actions.map((action) => action.id));
  const nextActionRefs = [...placement.actionRefs.filter((actionId) => (
    room.actions.find((action) => action.id === actionId)?.kind !== "open-link"
  )), actionId];
  const replacedOpenLinkIds = new Set(
    placement.actionRefs.filter((actionId) => room.actions.find((action) => action.id === actionId)?.kind === "open-link"),
  );
  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    actions: [
      ...room.actions.filter((action) => !replacedOpenLinkIds.has(action.id)),
      { id: actionId, kind: "open-link", label: normalizedLabel, href },
    ],
    placements: room.placements.map((item) => item.id === placementId
      ? { ...item, actionRefs: nextActionRefs }
      : item),
    semanticFallback: upsertSemanticItem(room, placementId, placement.semanticLabel, nextActionRefs),
  };
  return acceptCandidate(room, candidate);
}

/**
 * Assigns room media to the first compatible, available surface/rack/projection
 * anchor. The Piece, inspect Action and semantic fallback are one compiled unit.
 */
export function assignArrangerMedia(
  room: SpatialRoomDefinition,
  parentPlacementId: string,
  mediaId: string,
): ArrangerMutationResult {
  const parent = room.placements.find((candidate) => candidate.id === parentPlacementId);
  if (!parent) return missingPlacement(room, parentPlacementId);
  const media = room.media.find((candidate) => candidate.id === mediaId);
  if (!media) return reject(room, `media.${mediaId}`, "missing-media", `Media ${mediaId} does not exist in this room.`);

  const compatibleAnchors = compatiblePieceAnchors(parent);
  if (compatibleAnchors.length === 0) {
    return reject(room, `placements.${parentPlacementId}`, "anchor-type", "This fixture has no compatible surface, rack or projection Piece anchor.");
  }
  const anchor = compatibleAnchors.find((candidate) => anchorOccupancy(room, parentPlacementId, candidate.id) < candidate.capacity);
  if (!anchor) {
    return reject(room, `placements.${parentPlacementId}`, "anchor-capacity", "All compatible Piece anchors on this fixture are full.");
  }

  const pieceId = nextStableId(`arranger-piece-${media.id}`, room.placements.map((item) => item.id));
  const actionId = nextStableId(`inspect-${pieceId}`, room.actions.map((item) => item.id));
  const skinRef = parent.skinRef ?? room.skins[0]?.id;
  const semanticLabel = boundedText(media.alt, 200);
  const placement: SpatialPlacement = {
    id: pieceId,
    order: nextPlacementOrder(room),
    componentId: "presence.piece-plane",
    version: "1.0.0",
    transform: anchoredPieceLayout(anchor, 0, 1, parent),
    anchor: { kind: anchor.kind, parentPlacementId, anchorId: anchor.id },
    materialSlotOverrides: pieceMaterialOverrides(anchor.kind),
    ...(skinRef ? { skinRef } : {}),
    mediaRef: media.id,
    actionRefs: [actionId],
    visible: true,
    semanticLabel,
  };
  const withPiece: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    actions: [
      ...room.actions,
      { id: actionId, kind: "inspect", label: boundedText(`Inspect ${media.alt}`, 160), targetPlacementId: pieceId },
    ],
    placements: [...room.placements, placement],
    semanticFallback: [
      ...room.semanticFallback,
      { placementId: pieceId, label: semanticLabel, actionRefs: [actionId] },
    ],
  };
  const childIds = listArrangerChildPieces(withPiece, parentPlacementId).map((child) => child.id);
  return acceptCandidate(room, reflowArrangerChildren(withPiece, parent, childIds));
}

/** Reorders direct Piece children and remaps deterministic anchor/layout positions. */
export function reorderArrangerPiece(
  room: SpatialRoomDefinition,
  parentPlacementId: string,
  pieceId: string,
  direction: -1 | 1,
): ArrangerMutationResult {
  const parent = room.placements.find((candidate) => candidate.id === parentPlacementId);
  if (!parent) return missingPlacement(room, parentPlacementId);
  if (direction !== -1 && direction !== 1) {
    return reject(room, `placements.${pieceId}.order`, "reorder-direction", "Reorder direction must be -1 or 1.");
  }
  const children = listArrangerChildPieces(room, parentPlacementId);
  const currentIndex = children.findIndex((candidate) => candidate.id === pieceId);
  if (currentIndex < 0) {
    return reject(room, `placements.${pieceId}`, "piece-parent", `Piece ${pieceId} is not assigned to ${parentPlacementId}.`);
  }
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= children.length) {
    return reject(room, `placements.${pieceId}.order`, "reorder-boundary", "The Piece is already at that edge of the fixture.");
  }

  const orderedIds = children.map((child) => child.id);
  [orderedIds[currentIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[currentIndex]];
  const candidate = reflowArrangerChildren(
    { ...room, revision: room.revision + 1 },
    parent,
    orderedIds,
  );
  return acceptCandidate(room, candidate);
}

export function listArrangerChildPieces(
  room: Pick<SpatialRoomDefinition, "placements">,
  parentPlacementId: string,
): readonly SpatialPlacement[] {
  return room.placements
    .filter((placement) => (
      placement.componentId === "presence.piece-plane"
      && placement.anchor.parentPlacementId === parentPlacementId
    ))
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

export function listArrangerCompatibleMedia(
  room: SpatialRoomDefinition,
  parentPlacementId: string,
): readonly SpatialMediaRef[] {
  const parent = room.placements.find((candidate) => candidate.id === parentPlacementId);
  if (!parent) return [];
  const hasCapacity = compatiblePieceAnchors(parent).some((anchor) => (
    anchorOccupancy(room, parentPlacementId, anchor.id) < anchor.capacity
  ));
  return hasCapacity ? room.media : [];
}

export function isArrangerMediaParent(placement: SpatialPlacement): boolean {
  return compatiblePieceAnchors(placement).length > 0;
}

function replacePlacement(
  room: SpatialRoomDefinition,
  placement: SpatialPlacement,
  transform: SpatialTransform,
): ArrangerMutationResult {
  const mutation = applySpatialPlacementMutation(room, {
    kind: "replace",
    placementId: placement.id,
    placement: { ...placement, transform },
  });
  if (!mutation.ok) return { ok: false, room, issues: mutation.issues };
  return acceptCandidate(room, { ...mutation.room, revision: room.revision + 1 });
}

function replacePlacementData(
  room: SpatialRoomDefinition,
  placement: SpatialPlacement,
  changes: Partial<Pick<SpatialPlacement, "materialSlotOverrides" | "skinRef" | "mediaRef" | "actionRefs" | "semanticLabel">>,
): ArrangerMutationResult {
  const candidatePlacement: SpatialPlacement = { ...placement, ...changes };
  const mutation = applySpatialPlacementMutation(room, {
    kind: "replace",
    placementId: placement.id,
    placement: candidatePlacement,
  });
  if (!mutation.ok) return { ok: false, room, issues: mutation.issues };
  return acceptCandidate(room, { ...mutation.room, revision: room.revision + 1 });
}

function arrangerOptionForPlacement(placement: SpatialPlacement): ArrangerComponentOption | undefined {
  return ARRANGER_COMPONENT_OPTIONS.find((option) => (
    option.componentId === placement.componentId && option.version === placement.version
  ));
}

function duplicateSpatialAction(
  action: SpatialActionRef,
  actionIdMap: ReadonlyMap<string, string>,
  placementIdMap: ReadonlyMap<string, string>,
): SpatialActionRef {
  const id = actionIdMap.get(action.id)!;
  switch (action.kind) {
    case "inspect":
      return { ...action, id, targetPlacementId: placementIdMap.get(action.targetPlacementId) ?? action.targetPlacementId };
    case "navigate-state":
    case "sequence-previous":
    case "sequence-next":
    case "open-link":
    case "disabled-placeholder":
      return { ...action, id };
  }
}

function collectPlacementSubtree(
  room: Pick<SpatialRoomDefinition, "placements">,
  rootPlacementId: string,
): SpatialPlacement[] {
  const result: SpatialPlacement[] = [];
  const pending = [rootPlacementId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const currentId = pending.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const current = room.placements.find((placement) => placement.id === currentId);
    if (!current) continue;
    result.push(current);
    pending.push(
      ...room.placements
        .filter((placement) => placement.anchor.parentPlacementId === currentId)
        .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
        .map((placement) => placement.id),
    );
  }
  return result;
}

function* duplicateCandidatePositions(
  room: SpatialRoomDefinition,
  source: SpatialPlacement,
  option: ArrangerComponentOption,
  width: number,
  depth: number,
): Generator<readonly [number, number]> {
  const step = DEFAULT_SPATIAL_SNAP_SETTINGS.gridStep;
  const startX = source.transform.position[0];
  const startZ = source.transform.position[2];
  for (let radius = 2; radius <= 24; radius += 1) {
    const delta = radius * step;
    yield [startX + delta, startZ];
    yield [startX - delta, startZ];
    yield [startX, startZ + delta];
    yield [startX, startZ - delta];
  }
  yield* candidateGridPositions(room, option, width, depth);
}

function upsertSemanticItem(
  room: SpatialRoomDefinition,
  placementId: string,
  label: string,
  actionRefs?: readonly string[],
): SpatialRoomDefinition["semanticFallback"] {
  const existing = room.semanticFallback.find((item) => item.placementId === placementId);
  const placement = room.placements.find((item) => item.id === placementId);
  const item = {
    placementId,
    label,
    ...(existing?.description ? { description: existing.description } : {}),
    actionRefs: actionRefs ?? existing?.actionRefs ?? placement?.actionRefs ?? [],
  };
  return existing
    ? room.semanticFallback.map((candidate) => candidate.placementId === placementId ? item : candidate)
    : [...room.semanticFallback, item];
}

function isSafeArrangerHref(href: string): boolean {
  if (href.length === 0 || href.length > 2_048) return false;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "https:" && parsed.username === "" && parsed.password === "";
  } catch {
    return false;
  }
}

function acceptCandidate(original: SpatialRoomDefinition, candidate: SpatialRoomDefinition): ArrangerMutationResult {
  const compiled = compileSpatialRoom(candidate);
  return compiled.ok
    ? { ok: true, room: compiled.room, issues: [] }
    : { ok: false, room: original, issues: compiled.issues };
}

function compatiblePieceAnchors(parent: SpatialPlacement): readonly SpatialAnchorDefinition[] {
  const definition = spatialComponent(parent);
  if (!definition) return [];
  return definition.anchors.filter((anchor) => (
    PIECE_PARENT_ANCHOR_KINDS.has(anchor.kind) && anchor.accepts.includes("piece")
  ));
}

function anchorOccupancy(room: SpatialRoomDefinition, parentPlacementId: string, anchorId: string): number {
  return room.placements.filter((placement) => (
    placement.anchor.parentPlacementId === parentPlacementId && placement.anchor.anchorId === anchorId
  )).length;
}

function reflowArrangerChildren(
  room: SpatialRoomDefinition,
  parent: SpatialPlacement,
  orderedIds: readonly string[],
): SpatialRoomDefinition {
  const compatibleAnchors = compatiblePieceAnchors(parent);
  if (compatibleAnchors.length === 0) return room;
  const children = listArrangerChildPieces(room, parent.id);
  const byId = new Map(children.map((child) => [child.id, child]));
  const orderSlots = children.map((child) => child.order).sort((left, right) => left - right);
  const uniqueOrders = new Set(orderSlots).size === orderSlots.length;
  const fallbackBase = Math.min(orderSlots[0] ?? 0, 2049 - orderedIds.length);
  const childIndex = new Map(orderedIds.map((id, index) => [id, index]));

  return {
    ...room,
    placements: room.placements.map((placement) => {
      const index = childIndex.get(placement.id);
      if (index === undefined || !byId.has(placement.id)) return placement;
      const anchor = anchorForPieceIndex(compatibleAnchors, index);
      return {
        ...placement,
        order: uniqueOrders ? orderSlots[index] : fallbackBase + index,
        transform: anchoredPieceLayout(anchor, index, orderedIds.length, parent),
        anchor: { kind: anchor.kind, parentPlacementId: parent.id, anchorId: anchor.id },
      };
    }),
  };
}

function anchorForPieceIndex(anchors: readonly SpatialAnchorDefinition[], index: number): SpatialAnchorDefinition {
  const capacitySlots = anchors.flatMap((anchor) => Array.from({ length: anchor.capacity }, () => anchor));
  return capacitySlots[Math.min(index, capacitySlots.length - 1)] ?? anchors[0];
}

function pieceLayout(
  kind: SpatialAnchorKind,
  index: number,
  count: number,
  parent: SpatialPlacement,
): SpatialTransform {
  if (kind === "rack") {
    return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.7, 0.7, 0.7] };
  }
  const parentDimensions = spatialComponent(parent)?.dimensions ?? { width: 4, height: 3, depth: 1 };
  if (kind === "projection") {
    const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(count * parentDimensions.width / parentDimensions.height))));
    const rows = Math.max(1, Math.ceil(count / columns));
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellWidth = parentDimensions.width / columns;
    const cellHeight = parentDimensions.height / rows;
    const scale = Math.min(1.8, cellWidth * 0.72 / 1.1, cellHeight * 0.72 / 1.5);
    return {
      position: [
        (column - (columns - 1) / 2) * cellWidth * 0.9,
        ((rows - 1) / 2 - row) * cellHeight * 0.9,
        0.18,
      ],
      rotation: [0, 0, 0],
      scale: [scale, scale, 1],
    };
  }

  if (kind === "wall") {
    const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(count * parentDimensions.width / parentDimensions.height))));
    const rows = Math.max(1, Math.ceil(count / columns));
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellWidth = parentDimensions.width / columns;
    const cellHeight = parentDimensions.height / rows;
    const scale = Math.min(1.5, cellWidth * 0.72 / 1.1, cellHeight * 0.72 / 1.5);
    return {
      position: [
        (column - (columns - 1) / 2) * cellWidth * 0.9,
        ((rows - 1) / 2 - row) * cellHeight * 0.9,
        parentDimensions.depth / 2 + 0.03,
      ],
      rotation: [0, 0, 0],
      scale: [scale, scale, 1],
    };
  }

  const span = Math.min(Math.max(0, parentDimensions.width - 0.8), Math.max(0, count - 1) * 0.65);
  const x = count <= 1 ? 0 : -span / 2 + index * span / (count - 1);
  return {
    position: [x, 0.55, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [0.65, 0.65, 0.65],
  };
}

function anchoredPieceLayout(anchor: SpatialAnchorDefinition, index: number, count: number, parent: SpatialPlacement): SpatialTransform {
  const hasAuthoredTransform = anchor.transform.position.some((value) => value !== 0)
    || anchor.transform.rotation.some((value) => value !== 0)
    || anchor.transform.scale.some((value) => value !== 1);
  const compatibleAnchors = compatiblePieceAnchors(parent);
  const distinctAnchorTransforms = new Set(compatibleAnchors.map((candidate) => (
    `${candidate.transform.position.join(":")}|${candidate.transform.rotation.join(":")}|${candidate.transform.scale.join(":")}`
  ))).size;
  const usesAuthoredCell = anchor.capacity === 1
    && hasAuthoredTransform
    && (compatibleAnchors.length === 1 || distinctAnchorTransforms > 1);
  if (!usesAuthoredCell) return pieceLayout(anchor.kind, index, count, parent);
  if (anchor.kind === "surface") {
    return { position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], scale: [0.3, 0.3, 0.3] };
  }
  const scale = anchor.kind === "projection" ? 0.9 : anchor.kind === "rack" ? 0.7 : 0.55;
  return { position: [0, 0, 0], rotation: [0, 0, 0], scale: [scale, scale, scale] };
}

function hasPositionIndependentArrangerFailure(issues: readonly SpatialValidationIssue[]): boolean {
  return issues.some((candidate) => [
    "array-size",
    "layout-budget",
    "eager-asset-budget",
    "total-asset-budget",
  ].includes(candidate.code));
}

function pieceMaterialOverrides(kind: SpatialAnchorKind): SpatialPlacement["materialSlotOverrides"] {
  if (kind === "rack") return { fabric: "fabric-neutral" };
  if (kind === "projection") return { projection: "projection-emissive" };
  return { paper: "paper-uncoated" };
}

function* candidateGridPositions(
  room: SpatialRoomDefinition,
  option: ArrangerComponentOption,
  width: number,
  depth: number,
): Generator<readonly [number, number]> {
  const step = DEFAULT_SPATIAL_SNAP_SETTINGS.gridStep;
  const xValues = gridValues(-room.bounds.width / 2 + width / 2, room.bounds.width / 2 - width / 2, step);
  const zValues = gridValues(-room.bounds.depth / 2 + depth / 2, room.bounds.depth / 2 - depth / 2, step);
  if (option.anchorKind === "wall") {
    const back = zValues[0];
    const front = zValues[zValues.length - 1];
    for (const x of xValues) yield [x, back];
    if (front !== back) for (const x of xValues) yield [x, front];
    return;
  }
  const centeredX = [...xValues].sort(centerOut);
  const centeredZ = [...zValues].sort(centerOut);
  for (const z of centeredZ) {
    for (const x of centeredX) yield [x, z];
  }
}

function centerOut(left: number, right: number): number {
  return Math.abs(left) - Math.abs(right) || left - right;
}

function wallFootprintIsOccupied(
  room: SpatialRoomDefinition,
  x: number,
  z: number,
  width: number,
  depth: number,
): boolean {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return room.placements.some((placement) => {
    if (!NON_STACKING_WALL_COMPONENTS.has(placement.componentId)) return false;
    const definition = spatialComponent(placement);
    if (!definition) return false;
    const existingHalfWidth = definition.dimensions.width * Math.abs(placement.transform.scale[0]) / 2;
    const existingHalfDepth = definition.dimensions.depth * Math.abs(placement.transform.scale[2]) / 2;
    return x - halfWidth < placement.transform.position[0] + existingHalfWidth - 0.0001
      && x + halfWidth > placement.transform.position[0] - existingHalfWidth + 0.0001
      && z - halfDepth < placement.transform.position[2] + existingHalfDepth - 0.0001
      && z + halfDepth > placement.transform.position[2] - existingHalfDepth + 0.0001;
  });
}

function gridValues(min: number, max: number, step: number): number[] {
  const first = Math.ceil((min - Number.EPSILON) / step);
  const last = Math.floor((max + Number.EPSILON) / step);
  const values: number[] = [];
  for (let index = first; index <= last; index += 1) values.push(Number((index * step).toFixed(10)));
  return values;
}

function nextPlacementOrder(room: Pick<SpatialRoomDefinition, "placements">): number {
  return room.placements.reduce((maximum, placement) => Math.max(maximum, placement.order), -1) + 1;
}

function nextStableId(baseValue: string, usedValues: Iterable<string>): string {
  const used = new Set(usedValues);
  const normalized = baseValue
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/[-.:]+$/g, "")
    .slice(0, 108) || "arranger-item";
  if (!used.has(normalized)) return normalized;
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${normalized.slice(0, 120 - suffixText.length)}${suffixText}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`Unable to allocate a stable arranger ID for ${normalized}.`);
}

function boundedText(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, maximumLength - 1).trimEnd()}…`;
}

function missingPlacement(room: SpatialRoomDefinition, placementId: string): ArrangerMutationResult {
  return reject(room, `placements.${placementId}`, "missing-placement", `Placement ${placementId} does not exist.`);
}

function reject(
  room: SpatialRoomDefinition,
  path: string,
  code: string,
  message: string,
): ArrangerMutationResult {
  return { ok: false, room, issues: [issue(path, code, message)] };
}

function issue(path: string, code: string, message: string): SpatialValidationIssue {
  return { path, code, message };
}
