import { compileSpatialRoom } from "./compile.ts";
import { CANDIDATE_ARRANGER_COMPONENT_OPTIONS } from "./candidateOptions.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import {
  resolvePresencePlacementOption,
  resolvePresenceRoomKit,
} from "./optionAliases.ts";
import type {
  SpatialAnchorDefinition,
  SpatialAnchorKind,
  SpatialActionRef,
  SpatialArrangementKind,
  SpatialArrangementOverflowPolicy,
  SpatialContentBinding,
  SpatialMaterialPresetId,
  SpatialMaterialSlotId,
  SpatialMediaRef,
  PieceType,
  SpatialPieceLibraryItem,
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
import { SPATIAL_GARMENT_ASPECT_RANGE } from "./model.ts";
import type { SpatialGarmentArticleType } from "./model.ts";
import { spatialComponent } from "./registry.ts";

export type ArrangerComponentId = string;

export interface ArrangerComponentOption {
  componentId: ArrangerComponentId;
  version: string;
  label: string;
  anchorKind: "floor" | "wall" | "free";
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
  optionRef?: SpatialPlacement["optionRef"];
}

export type ArrangerCapabilityTag =
  | "floor-placeable"
  | "wall-placeable"
  | "free-placeable"
  | "surface-host"
  | "media-capable"
  | "skin-capable"
  | "material-slots"
  | "action-capable"
  | "glb-optional"
  | "proxy-only"
  | "fallback-safe";

export const ARRANGER_CORE_COMPONENT_OPTIONS = [
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

export const ARRANGER_COMPONENT_OPTIONS = [
  ...ARRANGER_CORE_COMPONENT_OPTIONS,
  ...CANDIDATE_ARRANGER_COMPONENT_OPTIONS,
] as const satisfies readonly ArrangerComponentOption[];

const CAPABILITY_TAG_ORDER: readonly ArrangerCapabilityTag[] = [
  "floor-placeable",
  "wall-placeable",
  "free-placeable",
  "surface-host",
  "media-capable",
  "skin-capable",
  "material-slots",
  "action-capable",
  "glb-optional",
  "proxy-only",
  "fallback-safe",
];

export type ArrangerMutationResult =
  | { ok: true; room: SpatialRoomDefinition; issues: readonly [] }
  | { ok: false; room: SpatialRoomDefinition; issues: readonly SpatialValidationIssue[] };

export type ArrangerRoomKitResult =
  | { ok: true; room: SpatialRoomDefinition; issues: readonly [] }
  | { ok: false; issues: readonly SpatialValidationIssue[] };

const MOVABLE_FLOOR_COMPONENTS = new Set<ArrangerComponentId>(
  ARRANGER_COMPONENT_OPTIONS
    .filter((option) => option.anchorKind === "floor" || option.anchorKind === "free")
    .map((option) => option.componentId),
);
const MOVABLE_WALL_COMPONENTS = new Set<ArrangerComponentId>(
  ARRANGER_COMPONENT_OPTIONS
    .filter((option) => option.anchorKind === "wall")
    .map((option) => option.componentId),
);

const PIECE_PARENT_ANCHOR_KINDS = new Set<SpatialAnchorKind>(["wall", "surface", "rack", "projection"]);
const NON_STACKING_WALL_COMPONENTS = new Set(["presence.wall-panel", "presence.projection-wall"]);
const MAX_ARRANGER_SEARCH_ATTEMPTS = 20_000;
const PIECE_LIBRARY_TIMESTAMP = "2026-08-18T00:00:00.000Z";
const PIECE_TYPES: readonly PieceType[] = [
  "image",
  "video",
  "audio",
  "garment",
  "product",
  "event",
  "flyer",
  "text",
  "link",
  "gallery",
  "collection",
  "archive-item",
];
const GARMENT_DISPLAY_COMPONENTS = new Set<string>([
  "presence.display-bay",
  "presence.display-plinth",
  "presence.display-shelf",
  "presence.product-display-block",
  "presence.rounded-island",
  "presence.candidate-display-island",
  "presence.garment-hanger",
]);

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

export function arrangerComponentCapabilityTags(
  option: Pick<ArrangerComponentOption, "componentId" | "version" | "anchorKind">,
): readonly ArrangerCapabilityTag[] {
  const definition = spatialComponent(option);
  const tags = new Set<ArrangerCapabilityTag>();
  tags.add(`${option.anchorKind}-placeable` as ArrangerCapabilityTag);
  if (definition) {
    if (definition.anchors.some((anchor) => (
      PIECE_PARENT_ANCHOR_KINDS.has(anchor.kind) && anchor.accepts.includes("piece")
    ))) {
      tags.add("surface-host");
      tags.add("media-capable");
    }
    if (definition.category === "piece" || definition.category === "projection") {
      tags.add("media-capable");
    }
    if (definition.materialSlots.length > 0) tags.add("material-slots");
    if (definition.renderGeometry?.kind === "glb") tags.add("glb-optional");
    else tags.add("proxy-only");
    tags.add("fallback-safe");
  }
  tags.add("skin-capable");
  tags.add("action-capable");
  return CAPABILITY_TAG_ORDER.filter((tag) => tags.has(tag));
}

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
    assets: [
      ...MOBSTAR_SPATIAL_ROOM_FIXTURE.assets.map((asset) => ({ ...asset })),
      {
        id: "presence-sample-audio",
        kind: "audio",
        locator: "public:presence-spatial/samples/audio-placeholder",
        safety: "public-safe",
        compressedBytes: 0,
        eager: false,
        attribution: "Public-safe operator sample reference; no playback proof claimed.",
      },
      {
        id: "presence-sample-video",
        kind: "video",
        locator: "public:presence-spatial/samples/video-placeholder",
        safety: "public-safe",
        compressedBytes: 0,
        eager: false,
        attribution: "Public-safe operator sample reference; no playback proof claimed.",
      },
    ],
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
    media: [
      ...MOBSTAR_SPATIAL_ROOM_FIXTURE.media.map((media) => ({ ...media })),
      { id: "presence-sample-audio", kind: "audio", assetId: "presence-sample-audio", alt: "Public-safe audio sample reference", safety: "public-safe" },
      { id: "presence-sample-video", kind: "video", assetId: "presence-sample-video", alt: "Public-safe video sample reference", safety: "public-safe" },
    ],
    pieceLibrary: defaultArrangerPieceLibrary(),
    actions: [],
    placements: foundationPlacements,
    contentBindings: [],
    states: overviewStates,
    semanticFallback: [],
  };
}

export function createRoomFromPresenceRoomKitOption(optionId: string, version = "0.1.0"): ArrangerRoomKitResult {
  const kit = resolvePresenceRoomKit({ optionId, version });
  if (!kit) {
    return { ok: false, issues: [issue(`options.${optionId}`, "unknown-room-kit-option", `Room kit option ${optionId}@${version} does not exist.`)] };
  }
  if (!kit.status.startsWith("available-now")) {
    return { ok: false, issues: [issue(`options.${optionId}`, "room-kit-deferred", `${kit.name} is ${kit.status} and cannot be loaded as an active room.`)] };
  }

  const base = createBlankMobstarSpatialRoom();
  const shellDefinition = spatialComponent(kit.shellComponentRef);
  const floorDefinition = spatialComponent(kit.floorComponentRef);
  if (!shellDefinition || !floorDefinition) {
    return { ok: false, issues: [issue(`options.${optionId}`, "unknown-component", "Room kit shell or floor component is not registered.")] };
  }

  const roomKitRef = { optionId: kit.optionId, version: kit.version };
  const foundation: SpatialPlacement[] = [
    {
      id: "room-shell",
      order: 0,
      componentId: kit.shellComponentRef.componentId,
      version: kit.shellComponentRef.version,
      optionRef: roomKitRef,
      transform: { position: [0, shellDefinition.dimensions.height / 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      anchor: { kind: "free" },
      materialSlotOverrides: { wall: "wall-charcoal" },
      actionRefs: [],
      visible: true,
      semanticLabel: `${kit.name} shell`,
    },
    {
      id: "floor",
      order: 1,
      componentId: kit.floorComponentRef.componentId,
      version: kit.floorComponentRef.version,
      optionRef: roomKitRef,
      transform: { position: [0, floorDefinition.dimensions.height / 2, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      anchor: { kind: "floor" },
      materialSlotOverrides: { floor: materialPresetForRoomKitFloor(kit.optionId) },
      actionRefs: [],
      visible: true,
      semanticLabel: `${kit.name} floor`,
    },
  ];
  const starters: SpatialPlacement[] = kit.starterComponentPlacements.map((starter, index) => ({
    id: nextStableId(`roomkit-${starter.id}`, [...foundation.map((placement) => placement.id), ...kit.starterComponentPlacements.slice(0, index).map((placement) => `roomkit-${placement.id}`)]),
    order: index + foundation.length,
    componentId: starter.componentRef.componentId,
    version: starter.componentRef.version,
    optionRef: { ...starter.optionRef },
    transform: starter.transform,
    anchor: { kind: starter.anchorKind },
    materialSlotOverrides: { ...starter.materialSlotOverrides },
    actionRefs: [],
    visible: true,
    semanticLabel: starter.semanticLabel,
  }));
  const placements = [...foundation, ...starters];
  const room: SpatialRoomDefinition = {
    ...base,
    id: kit.optionId.replace(/^presence\./, "presence-option-").replaceAll(".", "-"),
    label: kit.name,
    fixtureKind: "generic-proof",
    revision: 1,
    seed: `${kit.optionId}@${kit.version}`,
    bounds: kit.dimensions,
    lightingProfileId: kit.lightingProfile,
    placements,
    actions: [],
    pieceLibrary: base.pieceLibrary?.map((piece) => ({ ...piece, mediaRefs: [...piece.mediaRefs], actionRefs: [...piece.actionRefs], tags: [...piece.tags], collectionRefs: [...piece.collectionRefs] })) ?? [],
    contentBindings: [],
    semanticFallback: placements.map((placement) => ({ placementId: placement.id, label: placement.semanticLabel, actionRefs: [] })),
    states: base.states.map((state) => ({
      ...state,
      visiblePlacementIds: state.visiblePlacementIds ? placements.map((placement) => placement.id) : undefined,
    })),
  };
  const compiled = compileSpatialRoom(room);
  return compiled.ok ? { ok: true, room: compiled.room, issues: [] } : { ok: false, issues: compiled.issues };
}

/** Adds one registered arranger fixture at the first deterministic valid grid point. */
export function addArrangerComponent(room: SpatialRoomDefinition, componentId: string): ArrangerMutationResult {
  const option = ARRANGER_COMPONENT_OPTIONS.find((candidate) => candidate.componentId === componentId);
  if (!option) {
    return reject(room, "placements", "arranger-component", `Component ${componentId} is not available in the internal arranger.`);
  }
  return addResolvedArrangerComponent(room, option);
}

/** Adds a stable Presence option alias while retaining the resolved component ref for rendering. */
export function addArrangerOption(room: SpatialRoomDefinition, optionId: string, version = "0.1.0"): ArrangerMutationResult {
  const resolved = resolvePresencePlacementOption({ optionId, version });
  if (!resolved.ok) {
    return reject(room, `options.${optionId}`, "option-unavailable", resolved.reason);
  }
  return addResolvedArrangerComponent(room, {
    componentId: resolved.componentRef.componentId,
    version: resolved.componentRef.version,
    label: resolved.label,
    anchorKind: resolved.anchorKind,
    materialSlotOverrides: resolved.materialSlotOverrides,
    optionRef: resolved.optionRef,
  });
}

function addResolvedArrangerComponent(
  room: SpatialRoomDefinition,
  option: ArrangerComponentOption,
): ArrangerMutationResult {
  const definition = spatialComponent({ componentId: option.componentId, version: option.version });
  if (!definition) {
    return reject(room, "placements", "unknown-component", `Component ${option.componentId}@${option.version} is not registered.`);
  }

  const placementId = nextStableId(
    `arranger-${option.componentId.replace(/^(presence|candidate)\./, "").replaceAll(".", "-")}`,
    room.placements.map((item) => item.id),
  );
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
      ...(option.optionRef ? { optionRef: { ...option.optionRef } } : {}),
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
  const option = arrangerOptionForPlacement(placement);
  if (option) {
    return (placement.anchor.kind === "floor" || placement.anchor.kind === "free")
      ? option.anchorKind === "floor" || option.anchorKind === "free"
      : placement.anchor.kind === "wall" && option.anchorKind === "wall";
  }
  if (placement.anchor.kind === "floor") return MOVABLE_FLOOR_COMPONENTS.has(placement.componentId as ArrangerComponentId);
  return placement.anchor.kind === "wall" && MOVABLE_WALL_COMPONENTS.has(placement.componentId as ArrangerComponentId);
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

export type ArrangerBindingActionKind = "open-link" | "listen" | "watch" | "enquire";

export interface ArrangerPieceLibraryInput {
  pieceType: PieceType;
  label: string;
  caption?: string;
  mediaId?: string;
  actionKind?: ArrangerBindingActionKind;
  actionLabel?: string;
  href?: string;
  tags?: readonly string[];
  collectionRefs?: readonly string[];
  safety?: SpatialPieceLibraryItem["safety"];
}

export interface ArrangerPieceBindingInput {
  pieceId: string;
  arrangementKind: SpatialArrangementKind;
  overflowPolicy?: SpatialArrangementOverflowPolicy;
}

export interface ArrangerContentBindingInput {
  mediaId: string;
  arrangementKind: SpatialArrangementKind;
  overflowPolicy?: SpatialArrangementOverflowPolicy;
  actionKind?: ArrangerBindingActionKind;
  actionLabel?: string;
  href?: string;
  caption?: string;
}

export function bindArrangerContentToHost(
  room: SpatialRoomDefinition,
  hostPlacementId: string,
  input: ArrangerContentBindingInput,
): ArrangerMutationResult {
  const host = room.placements.find((candidate) => candidate.id === hostPlacementId);
  if (!host) return missingPlacement(room, hostPlacementId);
  const media = room.media.find((candidate) => candidate.id === input.mediaId);
  if (!media) return reject(room, `media.${input.mediaId}`, "missing-media", `Media ${input.mediaId} does not exist in this room.`);
  const definition = spatialComponent(host);
  if (!definition) return reject(room, `placements.${hostPlacementId}`, "unknown-component", "Selected host component is not registered.");
  const hostCapacity = hostBindingCapacity(host);
  if (hostCapacity < 1) {
    return reject(room, `placements.${hostPlacementId}`, "anchor-type", "This object cannot host bound owner content.");
  }
  const existingBindings = listArrangerContentBindings(room, hostPlacementId);
  const overflowPolicy = input.overflowPolicy ?? host.contentArrangement?.overflowPolicy ?? "overflow-list";
  if (overflowPolicy === "reject-over-capacity" && existingBindings.length >= hostCapacity) {
    return reject(room, `placements.${hostPlacementId}.contentArrangement`, "anchor-capacity", "This host is at capacity and reject-over-capacity is active.");
  }
  const actionKind = input.actionKind ?? defaultBindingActionKind(media);
  if (actionKind === "listen" && media.kind !== "audio") {
    return reject(room, `media.${media.id}.kind`, "media-kind", "Listen actions require audio media.");
  }
  if (actionKind === "watch" && media.kind !== "video") {
    return reject(room, `media.${media.id}.kind`, "media-kind", "Watch actions require video media.");
  }
  const href = input.href?.trim();
  const actionLabel = boundedText((input.actionLabel || defaultBindingActionLabel(actionKind, media.alt)).trim(), 160);
  if (!href || !isSafeArrangerHref(href)) {
    return reject(room, `contentBindings.${hostPlacementId}.actionRefs`, "unsafe-link", "Bound content actions require a credential-free HTTPS URL.");
  }
  if (!actionLabel) {
    return reject(room, `contentBindings.${hostPlacementId}.actionRefs`, "action-label", "Bound content actions require a non-empty label.");
  }

  const bindingId = nextStableId(`binding-${media.id}`, [
    ...(room.contentBindings ?? []).map((binding) => binding.id),
  ]);
  const actionId = nextStableId(`${actionKind}-${bindingId}`, room.actions.map((action) => action.id));
  const nextOrder = existingBindings.reduce((maximum, binding) => Math.max(maximum, binding.order), -1) + 1;
  const binding: SpatialContentBinding = {
    id: bindingId,
    hostPlacementId,
    pieceRef: `piece:${bindingId}`,
    pieceType: pieceTypeForMedia(media),
    label: boundedText(media.alt, 200),
    ...(input.caption ? { caption: boundedText(input.caption, 500) } : {}),
    mediaRefs: [media.id],
    actionRefs: [actionId],
    order: nextOrder,
    arrangementRole: nextOrder === 0 ? "primary" : "supporting",
  };
  const contentArrangement = {
    kind: input.arrangementKind,
    overflowPolicy,
    capacity: host.contentArrangement?.capacity ?? hostCapacity,
    ...(host.contentArrangement?.pageSize ? { pageSize: host.contentArrangement.pageSize } : {}),
    seed: host.contentArrangement?.seed ?? `${host.componentId}@${host.version}:${host.id}`,
  };
  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    actions: [...room.actions, { id: actionId, kind: actionKind, label: actionLabel, href }],
    placements: room.placements.map((placement) => placement.id === hostPlacementId
      ? { ...placement, contentArrangement }
      : placement),
    contentBindings: [...(room.contentBindings ?? []), binding],
  };
  return acceptCandidate(room, candidate);
}

export function createArrangerPieceLibraryItem(
  room: SpatialRoomDefinition,
  input: ArrangerPieceLibraryInput,
): ArrangerMutationResult {
  if (!PIECE_TYPES.includes(input.pieceType)) {
    return reject(room, "pieceLibrary.pieceType", "piece-type", "Unsupported piece type.");
  }
  const label = boundedText(input.label.trim(), 200);
  if (!label) return reject(room, "pieceLibrary.label", "piece-label", "Piece title is required.");
  const media = input.mediaId ? room.media.find((candidate) => candidate.id === input.mediaId) : undefined;
  if (input.mediaId && !media) return reject(room, `media.${input.mediaId}`, "missing-media", `Media ${input.mediaId} does not exist in this room.`);
  if (media && !pieceMediaCompatible(input.pieceType, media)) {
    return reject(room, `pieceLibrary.${input.pieceType}.mediaRefs`, "piece-media-kind", `Piece type ${input.pieceType} cannot use ${media.kind} media.`);
  }

  const actionKind = input.actionKind ?? defaultPieceActionKind(input.pieceType, media);
  const href = input.href?.trim();
  const actionLabel = boundedText((input.actionLabel || defaultPieceActionLabel(actionKind, label)).trim(), 160);
  if ((href || input.actionLabel?.trim()) && !href) {
    return reject(room, "pieceLibrary.actionRefs", "unsafe-link", "Piece actions require a credential-free HTTPS URL.");
  }
  if (href && !isSafeArrangerHref(href)) {
    return reject(room, "pieceLibrary.actionRefs", "unsafe-link", "Piece actions require a credential-free HTTPS URL.");
  }
  if (href && !pieceActionCompatible(input.pieceType, actionKind)) {
    return reject(room, "pieceLibrary.actionRefs", "piece-action-kind", `${actionKind} actions are incompatible with ${input.pieceType} pieces.`);
  }
  if (href && !actionLabel) {
    return reject(room, "pieceLibrary.actionRefs", "action-label", "Piece actions require a non-empty label.");
  }

  const pieceId = nextStableId(`piece-${label}`, (room.pieceLibrary ?? []).map((piece) => piece.id));
  const actionId = href ? nextStableId(`${actionKind}-${pieceId}`, room.actions.map((action) => action.id)) : undefined;
  const piece: SpatialPieceLibraryItem = {
    id: pieceId,
    pieceType: input.pieceType,
    label,
    ...(input.caption?.trim() ? { caption: boundedText(input.caption.trim(), 500) } : {}),
    mediaRefs: media ? [media.id] : [],
    actionRefs: actionId ? [actionId] : [],
    tags: normalizeTagRefs(input.tags ?? []),
    collectionRefs: normalizeTagRefs(input.collectionRefs ?? []),
    safety: input.safety ?? (media?.safety === "public-safe" ? "public-safe" : "internal-fixture"),
    createdAt: PIECE_LIBRARY_TIMESTAMP,
    updatedAt: PIECE_LIBRARY_TIMESTAMP,
  };
  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    ...(actionId && href ? { actions: [...room.actions, { id: actionId, kind: actionKind, label: actionLabel, href }] } : {}),
    pieceLibrary: [...(room.pieceLibrary ?? []), piece],
  };
  return acceptCandidate(room, candidate);
}

export function bindArrangerPieceToHost(
  room: SpatialRoomDefinition,
  hostPlacementId: string,
  input: ArrangerPieceBindingInput,
): ArrangerMutationResult {
  const host = room.placements.find((candidate) => candidate.id === hostPlacementId);
  if (!host) return missingPlacement(room, hostPlacementId);
  const piece = (room.pieceLibrary ?? []).find((candidate) => candidate.id === input.pieceId);
  if (!piece) return reject(room, `pieceLibrary.${input.pieceId}`, "missing-piece", `Piece ${input.pieceId} does not exist in the internal Piece Library.`);
  const definition = spatialComponent(host);
  if (!definition) return reject(room, `placements.${hostPlacementId}`, "unknown-component", "Selected host component is not registered.");
  if (!hostSupportsPieceType(host, piece.pieceType)) {
    return reject(room, `pieceLibrary.${piece.id}.pieceType`, "piece-host-compatibility", hostPieceCompatibilityMessage(host, definition.label, piece.pieceType));
  }
  const hostCapacity = hostBindingCapacity(host);
  if (hostCapacity < 1) {
    return reject(room, `placements.${hostPlacementId}`, "anchor-type", "This object cannot host bound owner content.");
  }
  const existingBindings = listArrangerContentBindings(room, hostPlacementId);
  const overflowPolicy = input.overflowPolicy ?? host.contentArrangement?.overflowPolicy ?? "overflow-list";
  if (overflowPolicy === "reject-over-capacity" && existingBindings.length >= hostCapacity) {
    return reject(room, `placements.${hostPlacementId}.contentArrangement`, "anchor-capacity", "This host is at capacity and reject-over-capacity is active.");
  }
  const missingMedia = piece.mediaRefs.find((mediaId) => !room.media.some((media) => media.id === mediaId));
  if (missingMedia) return reject(room, `pieceLibrary.${piece.id}.mediaRefs`, "missing-media", `Piece media ${missingMedia} does not exist.`);
  const missingAction = piece.actionRefs.find((actionId) => !room.actions.some((action) => action.id === actionId));
  if (missingAction) return reject(room, `pieceLibrary.${piece.id}.actionRefs`, "missing-action", `Piece action ${missingAction} does not exist.`);

  const bindingId = nextStableId(`binding-${piece.id}`, [
    ...(room.contentBindings ?? []).map((binding) => binding.id),
  ]);
  const nextOrder = existingBindings.reduce((maximum, binding) => Math.max(maximum, binding.order), -1) + 1;
  const binding: SpatialContentBinding = {
    id: bindingId,
    hostPlacementId,
    pieceRef: `piece-library:${piece.id}`,
    pieceType: piece.pieceType,
    label: piece.label,
    ...(piece.caption ? { caption: piece.caption } : {}),
    mediaRefs: piece.mediaRefs,
    actionRefs: piece.actionRefs,
    order: nextOrder,
    arrangementRole: nextOrder === 0 ? "primary" : "supporting",
    ...(piece.pieceType === "garment"
      ? {
        garmentArticleType: piece.garmentArticleType ?? "generic",
        // All five artwork channels, not just front/back. Copying only
        // front/back meant a shoe — whose artwork lives in the display,
        // outer-side and top channels — lost its artwork the moment it was
        // bound, and was then reported as missing artwork despite the operator
        // having assigned it. `setArrangerPieceGarmentArtwork` already mirrors
        // all five onto existing bindings, so binding was the odd one out.
        ...(piece.frontImageRef ? { frontImageRef: piece.frontImageRef } : {}),
        ...(piece.backImageRef ? { backImageRef: piece.backImageRef } : {}),
        ...(piece.displayImageRef ? { displayImageRef: piece.displayImageRef } : {}),
        ...(piece.outerSideImageRef ? { outerSideImageRef: piece.outerSideImageRef } : {}),
        ...(piece.topImageRef ? { topImageRef: piece.topImageRef } : {}),
        ...(piece.artworkAspect !== undefined ? { artworkAspect: piece.artworkAspect } : {}),
      }
      : {}),
  };
  const contentArrangement = {
    kind: input.arrangementKind,
    overflowPolicy,
    capacity: host.contentArrangement?.capacity ?? hostCapacity,
    ...(host.contentArrangement?.pageSize ? { pageSize: host.contentArrangement.pageSize } : {}),
    seed: host.contentArrangement?.seed ?? `${host.componentId}@${host.version}:${host.id}`,
  };
  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    placements: room.placements.map((placement) => placement.id === hostPlacementId
      ? { ...placement, contentArrangement }
      : placement),
    contentBindings: [...(room.contentBindings ?? []), binding],
  };
  return acceptCandidate(room, candidate);
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

export function listArrangerContentBindings(
  room: Pick<SpatialRoomDefinition, "contentBindings">,
  hostPlacementId: string,
): readonly SpatialContentBinding[] {
  return (room.contentBindings ?? [])
    .filter((binding) => binding.hostPlacementId === hostPlacementId)
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

/**
 * Rack slot state for the authoring UI.
 *
 * Capacity comes from the arrangement spec where present, falling back to the
 * host's anchor capacity, so slot count follows content rather than baked anchors.
 */
export interface ArrangerRackSlotState {
  hostPlacementId: string;
  capacity: number;
  occupied: number;
  open: number;
  overflow: number;
  slots: readonly {
    index: number;
    bindingId?: string;
    label?: string;
    pieceType?: PieceType;
    overflowed: boolean;
    missingArtwork: boolean;
  }[];
}

/**
 * Default arrangement for a host.
 *
 * Rack-anchored hosts hang their content on a rail; wall-anchored hosts use a
 * wall grid. Picking this from the host's own anchor contract keeps operators
 * from having to know the arrangement vocabulary.
 */
export function defaultArrangementKindForHost(host: SpatialPlacement): SpatialArrangementKind {
  const definition = spatialComponent(host);
  if (definition?.geometry.kind === "primitive" && definition.geometry.primitive === "spherical-gallery") return "spherical";
  const anchors = definition?.anchors ?? [];
  if (anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece"))) return "rack-row";
  if (anchors.some((anchor) => anchor.kind === "wall" && anchor.accepts.includes("piece"))) return "wall-grid";
  if (definition?.category === "projection") return "grid";
  return "grid";
}

export function arrangerRackSlotState(
  room: SpatialRoomDefinition,
  hostPlacementId: string,
): ArrangerRackSlotState | undefined {
  const host = room.placements.find((candidate) => candidate.id === hostPlacementId);
  if (!host) return undefined;
  const capacity = Math.max(1, host.contentArrangement?.capacity ?? hostBindingCapacity(host));
  const bindings = listArrangerContentBindings(room, hostPlacementId);
  const slots = Array.from({ length: Math.max(capacity, bindings.length) }, (_, index) => {
    const binding = bindings[index];
    const missingArtwork = binding?.pieceType === "garment"
      && !binding.frontImageRef
      && !binding.backImageRef
      && binding.mediaRefs.length === 0;
    return {
      index,
      ...(binding ? { bindingId: binding.id, label: binding.label, pieceType: binding.pieceType } : {}),
      overflowed: index >= capacity,
      missingArtwork: Boolean(missingArtwork),
    };
  });
  return {
    hostPlacementId,
    capacity,
    occupied: bindings.length,
    open: Math.max(0, capacity - bindings.length),
    overflow: Math.max(0, bindings.length - capacity),
    slots,
  };
}

/**
 * Moves a bound piece one slot left or right.
 *
 * Order is rewritten densely from zero so slot order, binding order and semantic
 * fallback order stay identical after every move.
 */
export function moveArrangerContentBinding(
  room: SpatialRoomDefinition,
  hostPlacementId: string,
  bindingId: string,
  direction: -1 | 1,
): ArrangerMutationResult {
  const host = room.placements.find((candidate) => candidate.id === hostPlacementId);
  if (!host) return missingPlacement(room, hostPlacementId);
  if (direction !== -1 && direction !== 1) {
    return reject(room, `contentBindings.${bindingId}.order`, "reorder-direction", "Reorder direction must be -1 or 1.");
  }
  const bindings = listArrangerContentBindings(room, hostPlacementId).slice();
  const index = bindings.findIndex((binding) => binding.id === bindingId);
  if (index < 0) return reject(room, `contentBindings.${bindingId}`, "missing-binding", `Binding ${bindingId} is not bound to this host.`);
  const target = index + direction;
  if (target < 0 || target >= bindings.length) {
    return reject(room, `contentBindings.${bindingId}.order`, "reorder-bounds", "This garment is already at the end of the rack.");
  }
  const swapped = bindings[index];
  bindings[index] = bindings[target];
  bindings[target] = swapped;
  return acceptCandidate(room, withDenseBindingOrder(room, hostPlacementId, bindings));
}

/** Removes a bound piece from a host, keeping the remaining order dense and stable. */
export function removeArrangerContentBinding(
  room: SpatialRoomDefinition,
  hostPlacementId: string,
  bindingId: string,
): ArrangerMutationResult {
  const host = room.placements.find((candidate) => candidate.id === hostPlacementId);
  if (!host) return missingPlacement(room, hostPlacementId);
  const bindings = listArrangerContentBindings(room, hostPlacementId);
  if (!bindings.some((binding) => binding.id === bindingId)) {
    return reject(room, `contentBindings.${bindingId}`, "missing-binding", `Binding ${bindingId} is not bound to this host.`);
  }
  const remaining = bindings.filter((binding) => binding.id !== bindingId);
  return acceptCandidate(room, withDenseBindingOrder(room, hostPlacementId, remaining));
}

function withDenseBindingOrder(
  room: SpatialRoomDefinition,
  hostPlacementId: string,
  ordered: readonly SpatialContentBinding[],
): SpatialRoomDefinition {
  const reordered = ordered.map((binding, index) => ({
    ...binding,
    order: index,
    arrangementRole: index === 0 ? "primary" as const : "supporting" as const,
  }));
  const others = (room.contentBindings ?? []).filter((binding) => binding.hostPlacementId !== hostPlacementId);
  return {
    ...room,
    revision: room.revision + 1,
    contentBindings: [...others, ...reordered],
  };
}

export interface ArrangerGarmentArtworkInput {
  garmentArticleType?: SpatialGarmentArticleType;
  frontImageRef?: string | null;
  backImageRef?: string | null;
  displayImageRef?: string | null;
  outerSideImageRef?: string | null;
  topImageRef?: string | null;
  artworkAspect?: number | null;
}

/**
 * Assigns garment article and artwork refs to a Piece Library item, and mirrors
 * them onto that piece's existing bindings so a garment already on a rack picks
 * up the change without being rebound.
 *
 * Only media ids are stored. Passing `null` clears a ref.
 */
export function setArrangerPieceGarmentArtwork(
  room: SpatialRoomDefinition,
  pieceId: string,
  input: ArrangerGarmentArtworkInput,
): ArrangerMutationResult {
  const piece = (room.pieceLibrary ?? []).find((candidate) => candidate.id === pieceId);
  if (!piece) return reject(room, `pieceLibrary.${pieceId}`, "missing-piece", `Piece ${pieceId} does not exist in the internal Piece Library.`);
  if (piece.pieceType !== "garment") {
    return reject(room, `pieceLibrary.${pieceId}.pieceType`, "garment-artwork-ref", "Only garment pieces carry garment artwork refs.");
  }
  const refKeys = ["frontImageRef", "backImageRef", "displayImageRef", "outerSideImageRef", "topImageRef"] as const;
  for (const key of refKeys) {
    const value = input[key];
    if (value && !room.media.some((media) => media.id === value)) {
      return reject(room, `pieceLibrary.${pieceId}.${key}`, "missing-media", `Garment artwork media ${value} does not exist in this room.`);
    }
  }
  if (input.artworkAspect !== undefined && input.artworkAspect !== null) {
    const aspect = input.artworkAspect;
    if (!Number.isFinite(aspect) || aspect < SPATIAL_GARMENT_ASPECT_RANGE.min || aspect > SPATIAL_GARMENT_ASPECT_RANGE.max) {
      return reject(room, `pieceLibrary.${pieceId}.artworkAspect`, "garment-aspect", `Artwork aspect must be between ${SPATIAL_GARMENT_ASPECT_RANGE.min} and ${SPATIAL_GARMENT_ASPECT_RANGE.max}.`);
    }
  }

  const applyRefs = <T extends object>(target: T): T => {
    const next = { ...target } as Record<string, unknown>;
    if (input.garmentArticleType) next.garmentArticleType = input.garmentArticleType;
    for (const key of refKeys) {
      const value = input[key];
      if (value === undefined) continue;
      if (value === null) delete next[key];
      else next[key] = value;
    }
    if (input.artworkAspect === null) delete next.artworkAspect;
    else if (input.artworkAspect !== undefined) next.artworkAspect = input.artworkAspect;
    return next as T;
  };

  const candidate: SpatialRoomDefinition = {
    ...room,
    revision: room.revision + 1,
    pieceLibrary: (room.pieceLibrary ?? []).map((item) => (item.id === pieceId
      ? applyRefs({ ...item, updatedAt: item.updatedAt })
      : item)),
    contentBindings: (room.contentBindings ?? []).map((binding) => (binding.pieceRef === `piece-library:${pieceId}`
      ? applyRefs(binding)
      : binding)),
  };
  return acceptCandidate(room, candidate);
}

export function listArrangerPieceLibrary(
  room: Pick<SpatialRoomDefinition, "pieceLibrary">,
): readonly SpatialPieceLibraryItem[] {
  return (room.pieceLibrary ?? [])
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
}

export function listArrangerHostSupportedPieceTypes(host?: SpatialPlacement): readonly PieceType[] {
  if (!host) return [];
  return PIECE_TYPES.filter((pieceType) => hostSupportsPieceType(host, pieceType));
}

export function listArrangerCompatibleMedia(
  room: SpatialRoomDefinition,
  parentPlacementId: string,
): readonly SpatialMediaRef[] {
  const parent = room.placements.find((candidate) => candidate.id === parentPlacementId);
  if (!parent) return [];
  const bindingCapacity = hostBindingCapacity(parent);
  const bindingCount = listArrangerContentBindings(room, parentPlacementId).length;
  const bindingPolicy = parent.contentArrangement?.overflowPolicy ?? "overflow-list";
  const hasCapacity = compatiblePieceAnchors(parent).some((anchor) => (
    anchorOccupancy(room, parentPlacementId, anchor.id) < anchor.capacity
  )) || (bindingCapacity > 0 && (bindingCount < bindingCapacity || bindingPolicy !== "reject-over-capacity"));
  return hasCapacity ? room.media : [];
}

export function isArrangerMediaParent(placement: SpatialPlacement): boolean {
  return compatiblePieceAnchors(placement).length > 0 || hostBindingCapacity(placement) > 0;
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
  const registered = ARRANGER_COMPONENT_OPTIONS.find((option) => (
    option.componentId === placement.componentId && option.version === placement.version
  ));
  if (registered) return registered;
  if (!placement.optionRef) return undefined;
  const resolved = resolvePresencePlacementOption(placement.optionRef);
  if (!resolved.ok) return undefined;
  return {
    componentId: resolved.componentRef.componentId,
    version: resolved.componentRef.version,
    label: resolved.label,
    anchorKind: resolved.anchorKind,
    materialSlotOverrides: resolved.materialSlotOverrides,
    optionRef: resolved.optionRef,
  };
}

function materialPresetForRoomKitFloor(optionId: string): SpatialMaterialPresetId {
  if (optionId.includes("white-cube")) return "floor-gallery-white";
  if (optionId.includes("ribbed")) return "floor-polished-charcoal";
  return "floor-dark-stone";
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
    case "listen":
    case "watch":
    case "enquire":
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

function hostBindingCapacity(parent: SpatialPlacement): number {
  const definition = spatialComponent(parent);
  if (!definition) return 0;
  const anchorCapacity = compatiblePieceAnchors(parent).reduce((sum, anchor) => sum + anchor.capacity, 0);
  if (definition.geometry.kind === "primitive" && definition.geometry.primitive === "spherical-gallery") {
    return Math.max(anchorCapacity, 40);
  }
  if (anchorCapacity > 0) return anchorCapacity;
  return definition.category === "piece" || definition.category === "projection" ? 1 : 0;
}

function defaultBindingActionKind(media: SpatialMediaRef): ArrangerBindingActionKind {
  if (media.kind === "audio") return "listen";
  if (media.kind === "video") return "watch";
  return "open-link";
}

function defaultBindingActionLabel(kind: ArrangerBindingActionKind, mediaAlt: string): string {
  if (kind === "listen") return `Listen to ${mediaAlt}`;
  if (kind === "watch") return `Watch ${mediaAlt}`;
  if (kind === "enquire") return `Enquire about ${mediaAlt}`;
  return `Open ${mediaAlt}`;
}

function pieceTypeForMedia(media: SpatialMediaRef): PieceType {
  if (media.kind === "audio") return "audio";
  if (media.kind === "video") return "video";
  if (media.kind === "poster") return "archive-item";
  return "image";
}

function defaultArrangerPieceLibrary(): readonly SpatialPieceLibraryItem[] {
  return [
    {
      id: "piece-library-garment-image",
      pieceType: "image",
      label: "Library image work",
      caption: "Internal fixture piece using a generated placeholder image.",
      mediaRefs: ["mobstar-media-a"],
      actionRefs: [],
      tags: ["sample", "image"],
      collectionRefs: ["sample-collection"],
      safety: "internal-fixture",
      createdAt: PIECE_LIBRARY_TIMESTAMP,
      updatedAt: PIECE_LIBRARY_TIMESTAMP,
    },
    {
      id: "piece-library-archive-poster",
      pieceType: "archive-item",
      label: "Library archive poster",
      caption: "Internal fixture archive item for host-binding QA.",
      mediaRefs: ["mobstar-media-poster"],
      actionRefs: [],
      tags: ["sample", "archive"],
      collectionRefs: ["sample-collection"],
      safety: "internal-fixture",
      createdAt: PIECE_LIBRARY_TIMESTAMP,
      updatedAt: PIECE_LIBRARY_TIMESTAMP,
    },
    {
      id: "piece-library-audio-sample",
      pieceType: "audio",
      label: "Library audio sample",
      caption: "Public-safe audio reference. No playback proof is claimed.",
      mediaRefs: ["presence-sample-audio"],
      actionRefs: [],
      tags: ["sample", "audio"],
      collectionRefs: ["sample-collection"],
      safety: "public-safe",
      createdAt: PIECE_LIBRARY_TIMESTAMP,
      updatedAt: PIECE_LIBRARY_TIMESTAMP,
    },
  ];
}

function defaultPieceActionKind(pieceType: PieceType, media?: SpatialMediaRef): ArrangerBindingActionKind {
  if (pieceType === "audio" || media?.kind === "audio") return "listen";
  if (pieceType === "video" || media?.kind === "video") return "watch";
  return "open-link";
}

function defaultPieceActionLabel(kind: ArrangerBindingActionKind, label: string): string {
  if (kind === "listen") return `Listen to ${label}`;
  if (kind === "watch") return `Watch ${label}`;
  if (kind === "enquire") return `Enquire about ${label}`;
  return `Open ${label}`;
}

function pieceMediaCompatible(pieceType: PieceType, media: SpatialMediaRef): boolean {
  if (pieceType === "audio") return media.kind === "audio";
  if (pieceType === "video") return media.kind === "video";
  if (pieceType === "archive-item" || pieceType === "flyer") return media.kind === "poster" || media.kind === "image";
  if (pieceType === "image" || pieceType === "gallery" || pieceType === "collection" || pieceType === "product" || pieceType === "garment") {
    return media.kind === "image" || media.kind === "poster" || media.kind === "logo";
  }
  return true;
}

function pieceActionCompatible(pieceType: PieceType, actionKind: ArrangerBindingActionKind): boolean {
  if (actionKind === "listen") return pieceType === "audio";
  if (actionKind === "watch") return pieceType === "video" || pieceType === "gallery";
  return true;
}

function hostSupportsPieceType(host: SpatialPlacement, pieceType: PieceType): boolean {
  if (host.componentId === "presence.framed-media" || host.componentId === "presence.piece-plane") {
    return ["image", "video", "text", "link", "archive-item", "flyer"].includes(pieceType);
  }
  if (host.componentId === "presence.archive-wall") {
    return ["archive-item", "image", "text", "flyer", "event", "link", "gallery", "collection"].includes(pieceType);
  }
  if (host.componentId === "presence.listening-station") {
    return ["audio", "link", "text", "collection"].includes(pieceType);
  }
  if (host.componentId === "presence.spherical-gallery") {
    return ["image", "video", "text", "link", "gallery", "collection"].includes(pieceType);
  }
  const definition = spatialComponent(host);
  if (pieceType === "garment") {
    if (definition?.category === "rack") return definition.anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece"));
    return GARMENT_DISPLAY_COMPONENTS.has(host.componentId);
  }
  if (definition?.category === "projection") return ["image", "video", "gallery", "collection"].includes(pieceType);
  if (definition?.category === "piece") return ["image", "text", "link", "archive-item", "flyer"].includes(pieceType);
  if (definition?.anchors.some((anchor) => anchor.kind === "projection" && anchor.accepts.includes("piece"))) {
    return ["image", "video", "gallery", "collection"].includes(pieceType);
  }
  if (definition?.anchors.some((anchor) => (anchor.kind === "wall" || anchor.kind === "surface") && anchor.accepts.includes("piece"))) {
    return ["image", "text", "link", "product", "event", "flyer", "archive-item", "gallery", "collection"].includes(pieceType);
  }
  return false;
}

function hostPieceCompatibilityMessage(host: SpatialPlacement, hostLabel: string, rejectedPieceType: PieceType): string {
  const supported = listArrangerHostSupportedPieceTypes(host);
  if (rejectedPieceType === "garment") {
    const hasRackAnchor = spatialComponent(host)?.anchors.some((anchor) => anchor.kind === "rack" && anchor.accepts.includes("piece")) ?? false;
    if (!hasRackAnchor && !GARMENT_DISPLAY_COMPONENTS.has(host.componentId)) {
      return "This host cannot accept garment pieces. Rack binding requires a rack anchor or a garment-capable display surface.";
    }
  }
  if (supported.length > 0) {
    return `${hostLabel} accepts ${supported.join(", ")} pieces, but not ${rejectedPieceType}.`;
  }
  return `${hostLabel} cannot host ${rejectedPieceType} pieces because it has no compatible Piece binding contract.`;
}

function normalizeTagRefs(values: readonly string[]): readonly string[] {
  return values
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/[-.:]+$/g, ""))
    .filter((value, index, items) => value.length > 0 && ID_PATTERN_COMPAT.test(value) && items.indexOf(value) === index)
    .slice(0, 16);
}

const ID_PATTERN_COMPAT = /^[a-z0-9][a-z0-9._:-]{0,119}$/;

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
