import type { SpatialMaterialSlotId } from "../../model.ts";
import type {
  CandidateComponentCategory,
  CandidateMaterialSlot,
  CandidatePlacement,
  CandidateRoomKitCategory,
} from "../types/candidates.ts";
import type { SourceBoundingBox } from "../types/source.ts";
import { isGenericName } from "./ids.ts";

export interface CategoryGuess<T> {
  category: T;
  confidence: "keyword-match" | "dimension-heuristic" | "unknown";
  matchedKeywords: readonly string[];
}

interface KeywordRule<T> {
  category: T;
  keywords: readonly string[];
}

/**
 * Keyword rules are ordered most-specific first; the first rule with a hit wins.
 * Source node names are frequently generic (`Object_12`), so a miss is expected
 * and downgrades to a dimension heuristic rather than a confident guess.
 */
const COMPONENT_RULES: ReadonlyArray<KeywordRule<CandidateComponentCategory>> = [
  { category: "projection-surface", keywords: ["projection", "projector", "screen", "monitor", "tv", "display-screen"] },
  { category: "poster", keywords: ["poster", "banner", "signage", "billboard", "artwork", "painting", "canvas"] },
  { category: "frame", keywords: ["frame", "picture", "photoframe", "mirror"] },
  { category: "rack", keywords: ["rack", "clothing", "garment", "hanger", "rail", "wardrobe-rail"] },
  { category: "shelf", keywords: ["shelf", "shelves", "shelving", "bookshelf", "bookcase", "etagere"] },
  { category: "cabinet", keywords: ["cabinet", "cupboard", "dresser", "sideboard", "drawer", "wardrobe", "locker", "credenza"] },
  { category: "counter", keywords: ["counter", "bar", "reception", "checkout", "till", "kitchen-island"] },
  { category: "plinth", keywords: ["plinth", "pedestal", "podium", "riser", "dais", "base-block"] },
  { category: "sofa", keywords: ["sofa", "couch", "settee", "loveseat", "chesterfield", "ottoman", "bench-seat"] },
  { category: "chair", keywords: ["chair", "stool", "seat", "armchair", "bench", "pew"] },
  { category: "bed", keywords: ["bed", "mattress", "bunk"] },
  { category: "table", keywords: ["table", "desk", "coffeetable", "nightstand", "sidetable", "worktop"] },
  { category: "lamp", keywords: ["lamp", "light", "sconce", "chandelier", "lantern", "luminaire", "pendant", "candle"] },
  { category: "rug", keywords: ["rug", "carpet", "mat", "runner"] },
  { category: "plant", keywords: ["plant", "tree", "flower", "pot", "fern", "foliage", "bonsai", "ivy"] },
  { category: "stair", keywords: ["stair", "steps", "staircase", "ladder"] },
  { category: "column", keywords: ["column", "pillar", "pilaster", "beam", "post"] },
  { category: "door", keywords: ["door", "doorway", "gate", "entrance"] },
  { category: "window", keywords: ["window", "glazing", "pane", "skylight"] },
  { category: "ceiling", keywords: ["ceiling", "roof", "soffit"] },
  { category: "floor", keywords: ["floor", "ground", "flooring", "tile-floor"] },
  { category: "wall", keywords: ["wall", "partition", "divider", "panel-wall", "facade"] },
  { category: "room-shell", keywords: ["room", "interior", "shell", "environment", "scene", "building"] },
  { category: "display-block", keywords: ["block", "box", "crate", "case", "vitrine", "showcase"] },
  { category: "decorative-prop", keywords: ["prop", "vase", "book", "bottle", "cup", "mug", "bowl", "cushion", "pillow", "sculpture", "statue", "ornament", "clock", "basket", "tray", "candlestick"] },
];

const ROOMKIT_RULES: ReadonlyArray<KeywordRule<CandidateRoomKitCategory>> = [
  { category: "living-room", keywords: ["living-room", "livingroom", "living", "drawing-room", "drawingroom", "lounge", "sitting-room", "family-room"] },
  { category: "bedroom", keywords: ["bedroom", "bed-room", "sleeping"] },
  { category: "gallery", keywords: ["gallery", "museum", "exhibition", "exhibit"] },
  { category: "boutique", keywords: ["boutique", "shop", "store", "retail", "coffee", "cafe", "bakery", "salon"] },
  { category: "studio", keywords: ["studio", "atelier", "workshop", "office", "workspace"] },
  { category: "warehouse", keywords: ["warehouse", "factory", "industrial", "hangar", "depot", "brutalist"] },
  { category: "showroom", keywords: ["showroom", "shopfront", "display-room"] },
  { category: "archive", keywords: ["archive", "library", "storage", "vault", "records"] },
  { category: "performance-room", keywords: ["theatre", "theater", "stage", "concert", "auditorium", "cinema", "hall"] },
  { category: "listening-room", keywords: ["listening", "audio-room", "record-room", "hi-fi", "hifi"] },
];

function normaliseTokens(values: readonly string[]): string {
  return values
    .join(" ")
    .toLowerCase()
    .replace(/[_.]+/g, "-")
    .replace(/[^a-z0-9-]+/g, " ");
}

/**
 * Whole-token matching.
 *
 * Substring matching is unusable here: `mat` matches `material`, `light`
 * matches `WallLight`, and a single noisy token miscategorises dozens of
 * candidates at once. Keywords must sit on a token boundary.
 */
function matchesToken(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[\\s-])${escaped}($|[\\s-])`).test(haystack);
}

function matchRules<T>(haystack: string, rules: ReadonlyArray<KeywordRule<T>>): { category: T; keywords: string[] } | null {
  for (const rule of rules) {
    const hits = rule.keywords.filter((keyword) => matchesToken(haystack, keyword));
    if (hits.length > 0) return { category: rule.category, keywords: hits };
  }
  return null;
}

/** Rough size classes used when names carry no usable signal. */
function dimensionGuess(bounds: SourceBoundingBox | null): CandidateComponentCategory {
  if (!bounds) return "unknown-object";
  const { width, height, depth } = bounds.dimensions;
  const footprint = Math.max(width, depth);
  const thinnestHorizontal = Math.min(width, depth);

  if (footprint >= 6 && height >= 2.2) return "room-shell";
  // A thin horizontal slab is far more often a floor plate than a rug, and a rug
  // is not recoverable from dimensions alone, so `rug` stays keyword-only.
  if (height <= 0.08 && footprint >= 0.8) return "floor";
  // Rods, poles and stems: narrow on both horizontal axes but tall.
  if (footprint <= 0.25 && height >= 0.5) return "column";
  if (height >= 1.8 && thinnestHorizontal <= 0.4 && Math.max(width, depth) >= 1.2) return "wall";
  if (height >= 1.4 && footprint <= 1.4) return "shelf";
  if (height >= 0.6 && height <= 1.25 && footprint >= 0.7) return "table";
  if (height >= 0.35 && height <= 1.35 && footprint >= 0.3 && footprint <= 0.9) return "chair";
  if (height <= 0.45 && footprint <= 0.6) return "decorative-prop";
  return "unknown-object";
}

/**
 * Categorises one separable object.
 *
 * Only the object and mesh names are used. Material names are recorded on the
 * candidate for reviewers but deliberately excluded here: a material called
 * `light` or `Procedural Glass` describes a surface, not what the object is.
 */
export function guessComponentCategory(input: {
  nodeName: string;
  meshNames: readonly string[];
  materialNames: readonly string[];
  bounds: SourceBoundingBox | null;
}): CategoryGuess<CandidateComponentCategory> {
  const names = [input.nodeName, ...input.meshNames].filter((name) => !isGenericName(name));
  const haystack = normaliseTokens(names);
  const matched = matchRules(haystack, COMPONENT_RULES);
  if (matched) return { category: matched.category, confidence: "keyword-match", matchedKeywords: matched.keywords };

  const guessed = dimensionGuess(input.bounds);
  if (guessed !== "unknown-object") return { category: guessed, confidence: "dimension-heuristic", matchedKeywords: [] };
  return { category: "unknown-object", confidence: "unknown", matchedKeywords: [] };
}

export function guessRoomKitCategory(input: {
  filename: string;
  sceneName: string;
  nodeNames: readonly string[];
  bounds: SourceBoundingBox | null;
}): CategoryGuess<CandidateRoomKitCategory> {
  const filenameHaystack = normaliseTokens([input.filename, input.sceneName]);
  const filenameMatch = matchRules(filenameHaystack, ROOMKIT_RULES);
  if (filenameMatch) return { category: filenameMatch.category, confidence: "keyword-match", matchedKeywords: filenameMatch.keywords };

  const nodeMatch = matchRules(normaliseTokens(input.nodeNames), ROOMKIT_RULES);
  if (nodeMatch) return { category: nodeMatch.category, confidence: "keyword-match", matchedKeywords: nodeMatch.keywords };

  return { category: "unknown-interior", confidence: "unknown", matchedKeywords: [] };
}

const PLACEMENT_BY_CATEGORY: Readonly<Record<CandidateComponentCategory, CandidatePlacement>> = {
  table: "floor",
  chair: "floor",
  sofa: "floor",
  bed: "floor",
  rack: "floor",
  shelf: "floor",
  cabinet: "floor",
  plinth: "floor",
  frame: "wall",
  poster: "wall",
  lamp: "floor",
  rug: "floor",
  plant: "floor",
  wall: "floor",
  floor: "floor",
  ceiling: "ceiling",
  door: "wall",
  window: "wall",
  stair: "floor",
  column: "floor",
  counter: "floor",
  "display-block": "floor",
  "projection-surface": "projection-wall",
  "decorative-prop": "surface",
  "room-shell": "floor",
  "unknown-object": "unknown",
};

export function guessPlacement(category: CandidateComponentCategory, bounds: SourceBoundingBox | null): CandidatePlacement {
  const base = PLACEMENT_BY_CATEGORY[category];
  if (base !== "unknown" || !bounds) return base;

  const { width, height, depth } = bounds.dimensions;
  const footprint = Math.max(width, depth);
  if (height <= 0.4 && footprint <= 0.6) return "surface";
  if (Math.min(width, depth) <= 0.25 && height >= 1.2) return "wall";
  if (footprint >= 0.6) return "floor";
  return "unknown";
}

const SLOTS_BY_CATEGORY: Readonly<Record<CandidateComponentCategory, readonly CandidateMaterialSlot[]>> = {
  table: ["top", "legs", "base"],
  chair: ["frame", "fabric", "legs"],
  sofa: ["fabric", "base", "legs"],
  bed: ["fabric", "frame", "base"],
  rack: ["metal", "frame", "base"],
  shelf: ["wood", "frame", "base"],
  cabinet: ["wood", "top", "metal"],
  plinth: ["top", "base"],
  frame: ["frame", "poster-decal", "glass"],
  poster: ["poster-decal", "paper"],
  lamp: ["metal", "glass", "accent"],
  rug: ["fabric", "accent"],
  plant: ["primary", "base"],
  wall: ["primary", "poster-decal", "logo-accent"],
  floor: ["primary", "secondary"],
  ceiling: ["primary", "secondary"],
  door: ["wood", "metal"],
  window: ["glass", "frame"],
  stair: ["primary", "metal"],
  column: ["primary", "accent"],
  counter: ["top", "base", "logo-accent"],
  "display-block": ["primary", "top", "logo-accent"],
  "projection-surface": ["projection", "frame"],
  "decorative-prop": ["primary", "secondary", "accent"],
  "room-shell": ["primary", "secondary", "accent"],
  "unknown-object": ["primary", "secondary", "accent"],
};

export function candidateMaterialSlots(category: CandidateComponentCategory): readonly CandidateMaterialSlot[] {
  return SLOTS_BY_CATEGORY[category];
}

/**
 * Maps descriptive candidate slots onto the nine approved Presence material
 * slots so a promoted candidate plugs straight into the existing skin system.
 */
const PRESENCE_SLOT_BY_CANDIDATE_SLOT: Readonly<Record<CandidateMaterialSlot, SpatialMaterialSlotId>> = {
  base: "tabletop",
  top: "tabletop",
  legs: "rack-metal",
  frame: "rack-metal",
  metal: "rack-metal",
  fabric: "fabric",
  paper: "paper",
  wood: "tabletop",
  glass: "projection",
  projection: "projection",
  "poster-decal": "poster-decal",
  "logo-accent": "logo-accent",
  primary: "wall",
  secondary: "floor",
  accent: "logo-accent",
};

export function presenceMaterialSlots(
  slots: readonly CandidateMaterialSlot[],
  category: CandidateComponentCategory,
): readonly SpatialMaterialSlotId[] {
  const mapped = new Set<SpatialMaterialSlotId>();
  for (const slot of slots) mapped.add(PRESENCE_SLOT_BY_CANDIDATE_SLOT[slot]);
  if (category === "wall" || category === "room-shell") mapped.add("wall");
  if (category === "floor" || category === "rug") mapped.add("floor");
  if (category === "projection-surface") mapped.add("projection");
  return [...mapped];
}

export function roomKitMaterialSlots(): readonly CandidateMaterialSlot[] {
  return ["primary", "secondary", "accent", "projection", "poster-decal", "logo-accent"];
}
