import { SPATIAL_GARMENT_HANG_PROFILES } from "./model.ts";
import type {
  SpatialAnchorKind,
  SpatialCompiledContentArrangement,
  SpatialContentArrangement,
  SpatialContentBinding,
  SpatialContentOverflowState,
  SpatialDimensions,
  SpatialGarmentArticleType,
  SpatialSemanticItem,
  SpatialTransform,
} from "./model.ts";

export interface SpatialArrangementInput {
  hostPlacementId: string;
  arrangement: SpatialContentArrangement;
  bindings: readonly SpatialContentBinding[];
  hostDimensions: SpatialDimensions;
  anchorKind: SpatialAnchorKind;
}

export function arrangeSpatialContentBindings(input: SpatialArrangementInput): SpatialCompiledContentArrangement {
  const orderedBindings = input.bindings
    .slice()
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const capacity = Math.max(1, Math.floor(input.arrangement.capacity));
  const visibleCount = visibleBindingCount(orderedBindings.length, capacity, input.arrangement.overflowPolicy);
  const overflow = overflowState(input.hostPlacementId, input.arrangement, orderedBindings.length, visibleCount);
  const slots = orderedBindings.map((binding, index) => {
    const visible = index < visibleCount;
    return {
      bindingId: binding.id,
      hostPlacementId: input.hostPlacementId,
      placementId: contentBindingPlacementId(input.hostPlacementId, binding.id),
      order: binding.order,
      visible,
      overflowed: !visible,
      transform: slotTransform(input.arrangement.kind, index, Math.min(visibleCount, orderedBindings.length), input.hostDimensions, input.arrangement.seed, binding),
      anchorKind: input.anchorKind,
    };
  });
  const fallbackRows: SpatialSemanticItem[] = orderedBindings.map((binding, index) => {
    const description = [
      `Piece type: ${binding.pieceType}.`,
      binding.caption,
      index >= visibleCount ? `Overflow item ${index - visibleCount + 1} of ${overflow.overflowCount}.` : undefined,
    ].filter((item): item is string => Boolean(item)).join(" ");
    return {
      placementId: contentBindingPlacementId(input.hostPlacementId, binding.id),
      label: binding.label,
      ...(description ? { description } : {}),
      actionRefs: binding.actionRefs,
    };
  });

  return {
    hostPlacementId: input.hostPlacementId,
    kind: input.arrangement.kind,
    policy: input.arrangement.overflowPolicy,
    slots,
    overflow,
    fallbackRows,
  };
}

/** Clearance kept at each end of the rail so garments never overhang the frame. */
const RACK_ROW_END_MARGIN = 0.45;
/** Distance from the top of the host volume down to the hanging rail. */
const RACK_ROW_RAIL_INSET = 0.35;
const RACK_ROW_MIN_DROP = 0.42;
const RACK_ROW_MAX_DROP = 0.95;
/** Pitch at which a garment renders at full scale; tighter pitches scale down. */
const RACK_ROW_REFERENCE_PITCH = 0.72;

export function contentBindingPlacementId(hostPlacementId: string, bindingId: string): string {
  return `binding-${hostPlacementId}-${bindingId}`
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .slice(0, 120);
}

function visibleBindingCount(total: number, capacity: number, policy: SpatialContentArrangement["overflowPolicy"]): number {
  if (total <= capacity) return total;
  if (policy === "show-all-if-possible") return capacity;
  if (policy === "reject-over-capacity") return capacity;
  return capacity;
}

function overflowState(
  hostPlacementId: string,
  arrangement: SpatialContentArrangement,
  totalCount: number,
  visibleCount: number,
): SpatialContentOverflowState {
  const overflowCount = Math.max(0, totalCount - visibleCount);
  const pageSize = Math.max(1, arrangement.pageSize ?? arrangement.capacity);
  return {
    hostPlacementId,
    kind: arrangement.kind,
    policy: arrangement.overflowPolicy,
    totalCount,
    visibleCount,
    overflowCount,
    pageCount: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
    rejected: arrangement.overflowPolicy === "reject-over-capacity" && overflowCount > 0,
  };
}

function slotTransform(
  kind: SpatialContentArrangement["kind"],
  index: number,
  visibleCount: number,
  dimensions: SpatialDimensions,
  seed?: string,
  binding?: SpatialContentBinding,
): SpatialTransform {
  if (kind === "rack-row") {
    return rackRowSlotTransform(index, visibleCount, dimensions, binding?.garmentArticleType);
  }

  if (kind === "row") {
    const count = Math.max(1, visibleCount);
    const span = Math.min(Math.max(0, dimensions.width - 0.8), Math.max(0, count - 1) * 0.72);
    const x = count <= 1 ? 0 : -span / 2 + index * span / (count - 1);
    return { position: [x, dimensions.height / 2 + 0.08, 0], rotation: [-Math.PI / 2, 0, 0], scale: [0.58, 0.58, 0.58] };
  }

  if (kind === "spherical") {
    return sphericalSlotTransform(index, visibleCount, dimensions, seed);
  }

  const count = Math.max(1, visibleCount);
  const columns = Math.max(1, Math.min(kind === "wall-grid" ? 4 : 5, Math.ceil(Math.sqrt(count * dimensions.width / Math.max(dimensions.height, 0.1)))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const cellWidth = dimensions.width / columns;
  const cellHeight = Math.max(dimensions.height, 1) / rows;
  const scale = Math.min(kind === "wall-grid" ? 1.35 : 1, cellWidth * 0.72 / 1.1, cellHeight * 0.72 / 1.5);
  return {
    position: [
      (column - (columns - 1) / 2) * cellWidth * 0.9,
      ((rows - 1) / 2 - row) * cellHeight * 0.9,
      dimensions.depth / 2 + 0.04,
    ],
    rotation: [0, 0, 0],
    scale: [scale, scale, 1],
  };
}

/**
 * Hanging rail layout.
 *
 * Garments hang upright and face outward, below the rail rather than laid across
 * the top of the host. Pitch is derived from the usable rail width and the
 * visible count, so a part-full rack spreads across the rail instead of bunching
 * in the middle at a fixed pitch.
 */
function rackRowSlotTransform(
  index: number,
  visibleCount: number,
  dimensions: SpatialDimensions,
  articleType?: SpatialGarmentArticleType,
): SpatialTransform {
  // Per-article hang: a pant hangs lower than a shirt, and a shoe sits low and
  // slightly forward rather than hanging at all.
  const profile = SPATIAL_GARMENT_HANG_PROFILES[articleType ?? "generic"];
  const count = Math.max(1, visibleCount);
  const usableWidth = Math.max(0.2, dimensions.width - RACK_ROW_END_MARGIN * 2);
  const pitch = count <= 1 ? 0 : usableWidth / (count - 1);
  const x = count <= 1 ? 0 : -usableWidth / 2 + index * pitch;
  // Hang below the rail: the rail sits near the top of the host volume.
  const railY = dimensions.height / 2 - RACK_ROW_RAIL_INSET;
  const drop = Math.min(RACK_ROW_MAX_DROP, Math.max(RACK_ROW_MIN_DROP, dimensions.height * 0.42));
  const fitScale = Math.max(0.4, Math.min(1, pitch === 0 ? 1 : pitch / RACK_ROW_REFERENCE_PITCH));
  const scale = fitScale * profile.rackScale;
  return {
    position: [roundSpatial(x), roundSpatial(railY - drop + profile.railDrop), roundSpatial(profile.forwardOffset)],
    // Upright and facing outward. No -PI/2 tilt: garments hang, they do not lie flat.
    rotation: [0, 0, 0],
    scale: [roundSpatial(scale), roundSpatial(scale), 1],
  };
}

function sphericalSlotTransform(
  index: number,
  visibleCount: number,
  dimensions: SpatialDimensions,
  seed?: string,
): SpatialTransform {
  const count = Math.max(1, visibleCount);
  const diameter = Math.max(1, Math.min(dimensions.width, dimensions.height, dimensions.depth));
  const radius = diameter * 0.36;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const yRatio = count === 1 ? 0 : 1 - 2 * ((index + 0.5) / count);
  const ringRadius = Math.sqrt(Math.max(0, 1 - yRatio * yRatio));
  const angle = index * goldenAngle + seedAngleOffset(seed);
  const x = Math.cos(angle) * ringRadius * radius;
  const y = yRatio * radius;
  const z = Math.sin(angle) * ringRadius * radius;
  const scale = Math.max(0.34, Math.min(0.78, 2.9 / Math.sqrt(count)));
  return {
    position: [roundSpatial(x), roundSpatial(y), roundSpatial(z)],
    rotation: [roundSpatial(-Math.asin(Math.max(-1, Math.min(1, yRatio))) * 0.18), roundSpatial(-angle + Math.PI / 2), 0],
    scale: [roundSpatial(scale), roundSpatial(scale), 1],
  };
}

function seedAngleOffset(seed?: string): number {
  if (!seed) return 0;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff * Math.PI * 2;
}

function roundSpatial(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
