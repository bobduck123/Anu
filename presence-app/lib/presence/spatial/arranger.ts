import { compileSpatialRoom } from "./compile.ts";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "./fixtures/mobstar.ts";
import type {
  SpatialAnchorDefinition,
  SpatialAnchorKind,
  SpatialMediaRef,
  SpatialPlacement,
  SpatialRoomDefinition,
  SpatialTransform,
  SpatialValidationIssue,
} from "./model.ts";
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
  | "presence.projection-wall";

export interface ArrangerComponentOption {
  componentId: ArrangerComponentId;
  label: string;
  anchorKind: "floor" | "wall";
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
}

export const ARRANGER_COMPONENT_OPTIONS = [
  {
    componentId: "presence.wall-panel",
    label: "Wall panel",
    anchorKind: "wall",
    materialSlotOverrides: { wall: "wall-charcoal" },
  },
  {
    componentId: "presence.divider-wall",
    label: "Divider wall",
    anchorKind: "floor",
    materialSlotOverrides: { wall: "wall-charcoal", "logo-accent": "accent-signal" },
  },
  {
    componentId: "presence.display-table",
    label: "Display table",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-warm-stone" },
  },
  {
    componentId: "presence.retail-rack",
    label: "Retail rack",
    anchorKind: "floor",
    materialSlotOverrides: { "rack-metal": "rack-matte-black" },
  },
  {
    componentId: "presence.display-plinth",
    label: "Display plinth",
    anchorKind: "floor",
    materialSlotOverrides: { tabletop: "tabletop-warm-stone" },
  },
  {
    componentId: "presence.projection-wall",
    label: "Projection wall",
    anchorKind: "wall",
    materialSlotOverrides: { projection: "projection-emissive", wall: "wall-charcoal" },
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
]);

const PIECE_PARENT_ANCHOR_KINDS = new Set<SpatialAnchorKind>(["surface", "rack", "projection"]);
const NON_STACKING_WALL_COMPONENTS = new Set(["presence.wall-panel", "presence.projection-wall"]);
const MAX_ARRANGER_SEARCH_ATTEMPTS = 20_000;

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
    skins: MOBSTAR_SPATIAL_ROOM_FIXTURE.skins.map((skin) => ({
      ...skin,
      materialPresets: { ...skin.materialPresets },
      colors: { ...skin.colors },
      decalAssetIds: [...skin.decalAssetIds],
    })),
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
  const definition = spatialComponent({ componentId: option.componentId, version: "1.0.0" });
  if (!definition) {
    return reject(room, "placements", "unknown-component", `Component ${componentId}@1.0.0 is not registered.`);
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
      version: "1.0.0",
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
  return placement.anchor.kind === "floor"
    && MOVABLE_FLOOR_COMPONENTS.has(placement.componentId as ArrangerComponentId);
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
    return reject(room, `placements.${placementId}`, "not-floor-movable", "Only supported floor-anchored fixtures can be moved in the arranger.");
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
    return reject(room, `placements.${placementId}`, "not-floor-movable", "Only supported floor-anchored fixtures can be rotated in the arranger.");
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
    transform: pieceLayout(anchor.kind, 0, 1, parent),
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
        transform: pieceLayout(anchor.kind, index, orderedIds.length, parent),
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

  const span = Math.min(Math.max(0, parentDimensions.width - 0.8), Math.max(0, count - 1) * 0.65);
  const x = count <= 1 ? 0 : -span / 2 + index * span / (count - 1);
  return {
    position: [x, 0.55, 0],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [0.65, 0.65, 0.65],
  };
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
