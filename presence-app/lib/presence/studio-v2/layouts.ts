import type { StudioV2Object, StudioV2ObjectType } from "./model.ts";

export type PresenceStudioV2LayoutId = "gallery-wall" | "portal-threshold" | "film-strip-selected-works";
export type StudioV2PlacementSize = "small" | "medium" | "large" | "feature";
export type StudioV2PlacementTreatment = "quiet" | "framed" | "captioned" | "signal";

export interface StudioV2LayoutZone {
  id: string;
  label: string;
  description: string;
  accepts: readonly StudioV2ObjectType[];
  maxObjects?: number;
  allowedSizes: readonly StudioV2PlacementSize[];
  defaultSize: StudioV2PlacementSize;
  allowedTreatments?: readonly StudioV2PlacementTreatment[];
  mobileBehaviour: "stack" | "feature" | "carousel" | "hide-if-secondary";
}

export interface StudioV2LayoutDefinition {
  id: PresenceStudioV2LayoutId;
  label: string;
  description: string;
  ownerEditorVisible: boolean;
  zones: readonly StudioV2LayoutZone[];
}

export interface StudioV2ObjectPlacement {
  objectId: string;
  chamberId: string;
  layoutId: PresenceStudioV2LayoutId;
  zoneId: string;
  order: number;
  size: StudioV2PlacementSize;
  treatment?: StudioV2PlacementTreatment;
}

export interface StudioV2ChamberComposition {
  layoutId: PresenceStudioV2LayoutId;
  placements: StudioV2ObjectPlacement[];
}

const VISUAL = ["image", "media"] as const satisfies readonly StudioV2ObjectType[];
const TEXTUAL = ["text", "note", "proof", "credential", "testimonial", "event", "service"] as const satisfies readonly StudioV2ObjectType[];

export const STUDIO_V2_LAYOUTS: readonly StudioV2LayoutDefinition[] = [
  {
    id: "gallery-wall", label: "Gallery wall", description: "A paced exhibition wall for current work, notes, and a clear exit.", ownerEditorVisible: true,
    zones: [
      { id: "opening-work", label: "Opening work", description: "One work that sets the room’s first impression.", accepts: VISUAL, maxObjects: 1, allowedSizes: ["feature", "large"], defaultSize: "feature", allowedTreatments: ["framed", "quiet"], mobileBehaviour: "feature" },
      { id: "main-wall", label: "Main wall", description: "The primary works in this chamber.", accepts: VISUAL, allowedSizes: ["small", "medium", "large"], defaultSize: "medium", allowedTreatments: ["framed", "captioned", "quiet"], mobileBehaviour: "stack" },
      { id: "supporting-notes", label: "Supporting notes", description: "Context, proof, and exhibition material.", accepts: TEXTUAL, allowedSizes: ["small", "medium"], defaultSize: "small", allowedTreatments: ["quiet", "captioned"], mobileBehaviour: "stack" },
      { id: "cta-exit", label: "Exit", description: "The invitation after the wall.", accepts: ["cta", "link", "portal"], maxObjects: 1, allowedSizes: ["medium", "large"], defaultSize: "medium", allowedTreatments: ["signal", "quiet"], mobileBehaviour: "feature" },
      { id: "influence-layer", label: "Influence layer", description: "References that sit behind the main wall.", accepts: ["moodboard", "note", "proof"], allowedSizes: ["small"], defaultSize: "small", allowedTreatments: ["quiet"], mobileBehaviour: "hide-if-secondary" },
    ],
  },
  {
    id: "portal-threshold", label: "Portal threshold", description: "A threshold, statement, signal, and onward path.", ownerEditorVisible: true,
    zones: [
      { id: "threshold-image", label: "Threshold image", description: "One visual entry point.", accepts: VISUAL, maxObjects: 1, allowedSizes: ["feature", "large"], defaultSize: "feature", allowedTreatments: ["framed", "quiet"], mobileBehaviour: "feature" },
      { id: "threshold-statement", label: "Threshold statement", description: "Words that frame the entry.", accepts: ["text", "note", "testimonial"], maxObjects: 2, allowedSizes: ["medium", "large"], defaultSize: "large", allowedTreatments: ["quiet", "captioned"], mobileBehaviour: "stack" },
      { id: "threshold-signal", label: "Signal", description: "A small proof or invitation to continue.", accepts: ["proof", "credential", "event", "service"], allowedSizes: ["small", "medium"], defaultSize: "small", allowedTreatments: ["signal", "quiet"], mobileBehaviour: "stack" },
      { id: "threshold-exit", label: "Portal", description: "One clear onward path.", accepts: ["cta", "link", "portal"], maxObjects: 1, allowedSizes: ["medium", "large"], defaultSize: "medium", allowedTreatments: ["signal"], mobileBehaviour: "feature" },
    ],
  },
];

export const STUDIO_V2_FILM_STRIP_SELECTED_WORKS_LAYOUT: StudioV2LayoutDefinition = {
  id: "film-strip-selected-works",
  label: "Film strip / selected works",
  description: "A bounded selected-work stage with an ordered index, context, and protected onward path.",
  ownerEditorVisible: false,
  zones: [
    { id: "active-work-stage", label: "Active work stage", description: "The first selected visual receives the active stage.", accepts: VISUAL, maxObjects: 1, allowedSizes: ["feature", "large"], defaultSize: "feature", allowedTreatments: ["framed", "captioned"], mobileBehaviour: "feature" },
    { id: "sequence-index", label: "Sequence index", description: "Ordered previous, next, and direct-index works.", accepts: VISUAL, allowedSizes: ["small", "medium"], defaultSize: "small", allowedTreatments: ["captioned", "quiet"], mobileBehaviour: "carousel" },
    { id: "selected-work-context", label: "Selected work context", description: "Caption and contextual material for the selected sequence.", accepts: TEXTUAL, allowedSizes: ["small", "medium"], defaultSize: "small", allowedTreatments: ["captioned", "quiet"], mobileBehaviour: "stack" },
    { id: "selected-works-exit", label: "Exit", description: "One protected onward action after the sequence.", accepts: ["cta", "link", "portal"], maxObjects: 1, allowedSizes: ["medium", "large"], defaultSize: "medium", allowedTreatments: ["signal", "quiet"], mobileBehaviour: "feature" },
  ],
};

/** All compiler/public projection layouts. STUDIO_V2_LAYOUTS intentionally remains the legacy owner-editor subset. */
export const STUDIO_V2_REGISTERED_LAYOUTS: readonly StudioV2LayoutDefinition[] = [
  ...STUDIO_V2_LAYOUTS,
  STUDIO_V2_FILM_STRIP_SELECTED_WORKS_LAYOUT,
];

export function studioV2Layout(id: unknown): StudioV2LayoutDefinition {
  return STUDIO_V2_REGISTERED_LAYOUTS.find((layout) => layout.id === id) ?? STUDIO_V2_LAYOUTS[0];
}

export function defaultStudioV2Composition(chamberId: string, objects: readonly StudioV2Object[], layoutId: PresenceStudioV2LayoutId = "gallery-wall"): StudioV2ChamberComposition {
  const layout = studioV2Layout(layoutId);
  const placements: StudioV2ObjectPlacement[] = [];
  for (const object of objects) {
    const zone = layout.zones.find((candidate) => candidate.accepts.includes(object.type) && (candidate.maxObjects === undefined || !placements.some((placement) => placement.zoneId === candidate.id)))
      ?? layout.zones.find((candidate) => candidate.accepts.includes(object.type));
    if (!zone) continue;
    placements.push({ objectId: object.id, chamberId, layoutId: layout.id, zoneId: zone.id, order: placements.filter((placement) => placement.zoneId === zone.id).length, size: zone.defaultSize, treatment: zone.allowedTreatments?.[0] });
  }
  return { layoutId: layout.id, placements };
}

export function normalizeStudioV2Composition(value: unknown, chamberId: string, objects: readonly StudioV2Object[]): StudioV2ChamberComposition {
  const raw = value && typeof value === "object" ? value as { layoutId?: unknown; placements?: unknown } : {};
  const layout = studioV2Layout(raw.layoutId);
  const byId = new Map(objects.map((object) => [object.id, object]));
  const used = new Set<string>();
  const placements: StudioV2ObjectPlacement[] = [];
  if (Array.isArray(raw.placements)) for (const entry of raw.placements) {
    const source = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const object = byId.get(typeof source.objectId === "string" ? source.objectId : "");
    const zone = layout.zones.find((candidate) => candidate.id === source.zoneId);
    if (!object || !zone || used.has(object.id) || !zone.accepts.includes(object.type) || (zone.maxObjects !== undefined && placements.filter((placement) => placement.zoneId === zone.id).length >= zone.maxObjects)) continue;
    const size = zone.allowedSizes.includes(source.size as StudioV2PlacementSize) ? source.size as StudioV2PlacementSize : zone.defaultSize;
    const treatment = zone.allowedTreatments?.includes(source.treatment as StudioV2PlacementTreatment) ? source.treatment as StudioV2PlacementTreatment : zone.allowedTreatments?.[0];
    const order = typeof source.order === "number" && Number.isFinite(source.order) ? Math.max(0, source.order) : placements.length;
    used.add(object.id); placements.push({ objectId: object.id, chamberId, layoutId: layout.id, zoneId: zone.id, order, size, treatment });
  }
  const fallback = defaultStudioV2Composition(chamberId, objects.filter((object) => !used.has(object.id)), layout.id);
  return { layoutId: layout.id, placements: [...placements, ...fallback.placements.map((placement) => ({ ...placement, order: placements.filter((item) => item.zoneId === placement.zoneId).length + placement.order }))] };
}

export function placementMoveError(composition: StudioV2ChamberComposition, object: StudioV2Object, zoneId: string): string | null {
  const zone = studioV2Layout(composition.layoutId).zones.find((item) => item.id === zoneId);
  if (!zone) return "This part of the room is not available in the current layout.";
  if (!zone.accepts.includes(object.type)) return object.type === "cta" ? "CTA objects can sit at the exit or below the main wall." : "This object belongs in a different part of this chamber.";
  if (zone.maxObjects !== undefined && composition.placements.some((placement) => placement.zoneId === zoneId && placement.objectId !== object.id) && composition.placements.filter((placement) => placement.zoneId === zoneId && placement.objectId !== object.id).length >= zone.maxObjects) return `This layout only supports ${zone.maxObjects} ${zone.label.toLowerCase()}.`;
  return null;
}
