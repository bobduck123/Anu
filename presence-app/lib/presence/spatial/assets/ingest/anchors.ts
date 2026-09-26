import type { CandidateAnchor, CandidateComponentCategory, CandidatePlacement } from "../types/candidates.ts";
import type { SourceBoundingBox } from "../types/source.ts";

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

const REPEATED_SLOT_CATEGORIES: ReadonlySet<CandidateComponentCategory> = new Set([
  "rack",
  "shelf",
  "counter",
]);

/** Slot pitch in metres for rack/shelf-style repeated anchors. */
const SLOT_PITCH = 0.4;
const MAX_REPEATED_SLOTS = 12;

/**
 * Anchors are expressed in the exported candidate's local space, which uses the
 * floor-centre origin convention already recorded in `SPATIAL_COMPONENT_CATALOG`
 * (`origin: floor-center`, `pivot: floor-contact`, metres, Y-up).
 */
export function generateAnchors(input: {
  bounds: SourceBoundingBox | null;
  category: CandidateComponentCategory;
  placement: CandidatePlacement;
}): readonly CandidateAnchor[] {
  const { bounds, category, placement } = input;
  if (!bounds) {
    return [{ id: "center", type: "reference", position: [0, 0, 0] }];
  }

  const { width, height, depth } = bounds.dimensions;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const midHeight = height / 2;

  const anchors: CandidateAnchor[] = [
    { id: "center", type: "reference", position: [0, round(midHeight), 0] },
    { id: "top-center", type: "surface", position: [0, round(height), 0] },
    { id: "front-center", type: "display", position: [0, round(midHeight), round(halfDepth)] },
    { id: "back-center", type: "display", position: [0, round(midHeight), round(-halfDepth)] },
    { id: "left-center", type: "display", position: [round(-halfWidth), round(midHeight), 0] },
    { id: "right-center", type: "display", position: [round(halfWidth), round(midHeight), 0] },
  ];

  if (placement === "floor" || placement === "surface" || placement === "tabletop") {
    anchors.push({ id: "surface-top", type: "surface", position: [0, round(height), 0] });
  }

  if (placement === "wall" || placement === "projection-wall") {
    anchors.push({ id: "wall-center", type: "mount", position: [0, round(midHeight), 0] });
  }

  if (REPEATED_SLOT_CATEGORIES.has(category) && width >= SLOT_PITCH * 2) {
    const slotCount = Math.min(MAX_REPEATED_SLOTS, Math.floor(width / SLOT_PITCH));
    const slotHeight = category === "rack" ? height * 0.7 : height;
    const span = (slotCount - 1) * SLOT_PITCH;
    for (let index = 0; index < slotCount; index += 1) {
      anchors.push({
        id: `slot-${String(index + 1).padStart(2, "0")}`,
        type: "display",
        position: [round(-span / 2 + index * SLOT_PITCH), round(slotHeight), 0],
      });
    }
  }

  return anchors;
}
