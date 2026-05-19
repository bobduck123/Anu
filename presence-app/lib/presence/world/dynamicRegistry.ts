// Engagement Dynamic registry — Pass 6.
//
// A dynamic is HOW a presence world is navigated. The DNA + RoomWorld
// resolver chooses one. Today the registry is:
//
//   - chamber_walk         (the existing RoomGraph engine)
//   - orbit_constellation  (new, Pass 6) — central mark + orbiting satellites
//   - object_tableau       (new, Pass 6) — tactile surface with clustered objects
//   - portal_cascade       (new, Pass 6) — layered portals in depth
//
// Each entry includes the metadata the chooser needs to render a live
// micro-preview without spinning up the full dynamic.

export type DynamicId =
  | "chamber_walk"
  | "orbit_constellation"
  | "object_tableau"
  | "portal_cascade";

export type DynamicFeeling = "calm" | "tactile" | "cinematic" | "kinetic" | "ceremonial" | "editorial";

export type SuitedFor =
  | "painter"
  | "consultant"
  | "performer"
  | "maker"
  | "tradie"
  | "healer"
  | "organisation"
  | "venue"
  | "collective"
  | "venue_or_collective";

export interface DynamicEntry {
  id: DynamicId;
  label: string;
  summary: string;
  feeling: DynamicFeeling;
  suitedFor: SuitedFor[];
  implemented: boolean;
  /** Which DNA traits the chooser should highlight as a match. */
  matchSignals: string[];
  /** Demo slug that already uses this dynamic, if any. */
  demoSlug?: string;
}

export const DYNAMIC_REGISTRY: Record<DynamicId, DynamicEntry> = {
  chamber_walk: {
    id: "chamber_walk",
    label: "Chamber walk",
    summary: "Move through named rooms — turn, enter, retreat, inspect. Calm and inhabitable.",
    feeling: "calm",
    suitedFor: ["painter", "maker", "tradie", "healer", "consultant", "organisation"],
    implemented: true,
    matchSignals: ["practice_mode = portfolio", "practice_mode = craft", "energy = still"],
    demoSlug: "rooms-gallery-painter",
  },
  orbit_constellation: {
    id: "orbit_constellation",
    label: "Orbit constellation",
    summary: "A central identity with works, services, and proof orbiting as satellites. Relational and networked.",
    feeling: "cinematic",
    suitedFor: ["consultant", "performer", "organisation", "venue_or_collective"],
    implemented: true,
    matchSignals: ["practice_mode = advisory", "field = music", "field = consulting"],
  },
  object_tableau: {
    id: "object_tableau",
    label: "Object tableau",
    summary: "A working surface — desk, shelf, altar — with objects in clusters. Tactile and grounded.",
    feeling: "tactile",
    suitedFor: ["maker", "healer", "tradie", "painter"],
    implemented: true,
    matchSignals: ["practice_mode = craft", "practice_mode = care", "energy = slow"],
  },
  portal_cascade: {
    id: "portal_cascade",
    label: "Portal cascade",
    summary: "Layered portals in depth — fold forward to enter, fold back to retreat. Theatrical and editorial.",
    feeling: "cinematic",
    suitedFor: ["performer", "venue", "organisation", "collective"],
    implemented: true,
    matchSignals: ["practice_mode = performance", "energy = kinetic", "primary_goal = event_attendance"],
  },
};

export function dynamicEntries(): DynamicEntry[] {
  return Object.values(DYNAMIC_REGISTRY);
}

export function isImplementedDynamic(id: DynamicId): boolean {
  return Boolean(DYNAMIC_REGISTRY[id]?.implemented);
}
