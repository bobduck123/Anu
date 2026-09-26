import { CANDIDATE_COMPONENT_OPTIONS, CANDIDATE_ROOM_KIT_OPTIONS } from "./candidateOptions.ts";
import type {
  SpatialComponentRef,
  SpatialDimensions,
  SpatialLightingProfileId,
  SpatialMaterialPresetId,
  SpatialMaterialSlotId,
  SpatialMaterialStylePresetId,
  SpatialOptionRef,
  SpatialPlacement,
  SpatialRenderGeometry,
  SpatialTransform,
} from "./model.ts";

export type PresenceOptionKind =
  | "room-kit"
  | "object"
  | "display-primitive"
  | "media-surface"
  | "material-preset"
  | "lighting-profile"
  | "candidate-component"
  | "future-primitive";

export type PresenceOptionStatus =
  | "available-now-procedural"
  | "available-now-candidate"
  | "deferred"
  | "needs-art-pass"
  | "needs-scale-review"
  | "needs-implementation"
  | "future-primitive"
  | "internal-experimental";

export type PresenceOptionImplementationStrategy =
  | "procedural-component"
  | "procedural-room-kit"
  | "candidate-component"
  | "candidate-room-kit"
  | "profile-bundle"
  | "future-primitive";

export type PresenceOptionAdmissionStatus =
  | "not-evaluated"
  | "candidate-review-required"
  | "candidate-cleared-for-internal-use"
  | "not-admitted";

export interface PresenceOptionSourceRef {
  kind: "component" | "candidate-component" | "candidate-room-kit" | "material-preset" | "lighting-profile" | "room-kit-container";
  ref: string;
  status?: string;
}

export interface PresenceOptionAlias extends SpatialOptionRef {
  name: string;
  internalSourceRefs: readonly PresenceOptionSourceRef[];
  kind: PresenceOptionKind;
  category: string;
  status: PresenceOptionStatus;
  implementationStrategy: PresenceOptionImplementationStrategy;
  supportedCustomisations: readonly string[];
  placementType: "room-kit" | "floor" | "wall" | "surface" | "rack" | "free" | "none";
  fallbackBehaviour: string;
  reviewStatus: PresenceOptionAdmissionStatus;
  admissionStatus: "not-admitted";
  warnings: readonly string[];
  componentRef?: SpatialComponentRef;
  materialSlotOverrides?: SpatialPlacement["materialSlotOverrides"];
  roomKitRef?: SpatialOptionRef;
}

export interface PresenceRoomKitStarterPlacement {
  id: string;
  optionRef: SpatialOptionRef;
  componentRef: SpatialComponentRef;
  transform: SpatialTransform;
  anchorKind: "floor" | "wall" | "free";
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
  semanticLabel: string;
}

export interface PresenceRoomKitContainer extends SpatialOptionRef {
  roomKitId: string;
  name: string;
  category: string;
  dimensions: SpatialDimensions;
  materialPreset: SpatialMaterialStylePresetId;
  lightingProfile: SpatialLightingProfileId;
  shellComponentRef: SpatialComponentRef;
  floorComponentRef: SpatialComponentRef;
  starterComponentPlacements: readonly PresenceRoomKitStarterPlacement[];
  optionalRenderGeometryRef?: SpatialRenderGeometry;
  fallbackMode: "semantic-room-list" | "proxy-shell" | "deferred-review-card";
  payloadEstimate: {
    layoutJsonBytes: number;
    eagerRuntimeBytes: number;
    lazyRuntimeBytes: number;
    notes: readonly string[];
  };
  status: PresenceOptionStatus;
  warnings: readonly string[];
  sourceRefs: readonly PresenceOptionSourceRef[];
}

export interface PresenceResolvedPlacementOption {
  ok: true;
  option: PresenceOptionAlias;
  componentRef: SpatialComponentRef;
  label: string;
  anchorKind: "floor" | "wall" | "free";
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
  optionRef: SpatialOptionRef;
}

export type PresenceOptionResolution =
  | { ok: true; option: PresenceOptionAlias }
  | { ok: false; option?: PresenceOptionAlias; reason: string };

export const PRESENCE_ROOM_KIT_CONTAINERS = [
  roomKitContainer({
    optionId: "presence.roomkit.dark-boutique",
    name: "Dark Gallery Room",
    category: "rooms",
    dimensions: { width: 20, height: 6, depth: 36 },
    materialPreset: "warm-nocturnal-boutique",
    lightingProfile: "boutique-product-warm",
    shellComponentRef: { componentId: "presence.boutique-shell", version: "1.0.0" },
    floorComponentRef: { componentId: "presence.floor-slab", version: "2.0.0" },
    starterComponentPlacements: [
      starter("ribbed-wall", "presence.object.ribbed-showroom-wall", "presence.ribbed-wall", "Ribbed feature wall", [0, 2.7, -17.7], "wall", { wall: "wall-warm-sculptural", "logo-accent": "accent-signal" }),
      starter("display-island", "presence.surface.display-island", "presence.rounded-island", "Display island", [0, 0.39, -2.5], "floor", { tabletop: "tabletop-pale-sculptural", "rack-metal": "rack-boutique-blackened" }),
      starter("suspended-rack", "presence.object.suspended-rack", "presence.suspended-rack", "Suspended garment rack", [5.25, 2, 2.5], "floor", { "rack-metal": "rack-boutique-blackened", tabletop: "tabletop-pale-sculptural" }),
      starter("projection-wall", "presence.display.projection-wall", "presence.projection-wall", "Projection wall", [-4.5, 2.5, -17.7], "wall", { projection: "projection-emissive", wall: "wall-boutique-charcoal" }),
    ],
    payloadEstimate: { layoutJsonBytes: 12_000, eagerRuntimeBytes: 0, lazyRuntimeBytes: 0, notes: ["Procedural shell plus starter components; no room-kit GLB."] },
    status: "available-now-procedural",
    warnings: ["internal authoring option only", "not admitted"],
  }),
  roomKitContainer({
    optionId: "presence.roomkit.white-cube-gallery",
    name: "White Cube Gallery",
    category: "rooms",
    dimensions: { width: 18, height: 6, depth: 30 },
    materialPreset: "white-gallery",
    lightingProfile: "gallery-soft",
    shellComponentRef: { componentId: "presence.room-shell", version: "1.0.0" },
    floorComponentRef: { componentId: "presence.floor-slab", version: "1.0.0" },
    starterComponentPlacements: [
      starter("gallery-wall", "presence.object.gallery-wall", "presence.wall-panel", "Gallery wall", [-4.5, 2.5, -14.7], "wall", { wall: "wall-gallery-white" }),
      starter("product-plinth", "presence.surface.product-plinth", "presence.display-plinth", "Display plinth", [0, 0.36, -3], "floor", { tabletop: "tabletop-gallery-white" }),
      starter("framed-media", "presence.media.framed-media-surface", "presence.framed-media", "Framed work", [4.5, 1.3, -14.7], "wall", { "poster-decal": "poster-satin", "rack-metal": "rack-matte-black" }),
      starter("text-card", "presence.media.text-sign-card", "presence.text-sign-card", "Text panel", [-2.25, 0.45, 2.5], "floor", { paper: "paper-uncoated", "poster-decal": "poster-satin" }),
    ],
    payloadEstimate: { layoutJsonBytes: 11_000, eagerRuntimeBytes: 0, lazyRuntimeBytes: 0, notes: ["Procedural gallery starter layout; no candidate assets."] },
    status: "available-now-procedural",
    warnings: ["internal authoring option only", "not admitted"],
  }),
  roomKitContainer({
    optionId: "presence.roomkit.ribbed-concrete",
    name: "Ribbed Concrete Room",
    category: "candidate-interior",
    dimensions: { width: 10.7, height: 4.2229, depth: 6.7854 },
    materialPreset: "industrial-concrete",
    lightingProfile: "gallery-soft",
    shellComponentRef: { componentId: "presence.room-shell", version: "1.0.0" },
    floorComponentRef: { componentId: "presence.floor-slab", version: "1.0.0" },
    starterComponentPlacements: [],
    payloadEstimate: { layoutJsonBytes: 3_000, eagerRuntimeBytes: 0, lazyRuntimeBytes: 684_237, notes: ["Candidate room-kit remains deferred; no GLB is copied into saved layout JSON."] },
    status: "needs-art-pass",
    warnings: ["candidate-review-required", "candidate room kit", "deferred", "not admitted", "not production-ready"],
    sourceRefs: [{ kind: "candidate-room-kit", ref: "candidate.roomkit.warehouse-17b3@0.1.0", status: "candidate-review-required" }],
  }),
] as const satisfies readonly PresenceRoomKitContainer[];

export const PRESENCE_OPTION_ALIASES = [
  aliasRoomKit("presence.roomkit.dark-boutique", "Dark Gallery Room", "rooms", "available-now-procedural"),
  aliasRoomKit("presence.roomkit.white-cube-gallery", "White Cube Gallery", "rooms", "available-now-procedural"),
  aliasRoomKit("presence.roomkit.ribbed-concrete", "Ribbed Concrete Room", "candidate-interior", "needs-art-pass", {
    implementationStrategy: "candidate-room-kit",
    reviewStatus: "candidate-review-required",
    sourceRefs: [{ kind: "candidate-room-kit", ref: "candidate.roomkit.warehouse-17b3@0.1.0", status: "candidate-review-required" }],
    warnings: ["candidate-review-required", "needs art pass", "deferred", "not admitted"],
  }),
  aliasComponent("presence.object.gallery-wall", "Gallery Wall", "object", "walls-dividers", "presence.wall-panel", "wall", { wall: "wall-gallery-white" }),
  aliasComponent("presence.object.divider-wall", "Divider Wall", "object", "walls-dividers", "presence.divider-wall", "floor", { wall: "wall-charcoal", "logo-accent": "accent-signal" }),
  aliasComponent("presence.object.ribbed-showroom-wall", "Ribbed Feature Wall", "object", "walls-dividers", "presence.ribbed-wall", "wall", { wall: "wall-warm-sculptural", "logo-accent": "accent-signal" }),
  aliasComponent("presence.object.soft-divider-drape", "Soft Drape Divider", "object", "walls-dividers", "presence.drape-divider", "floor", { fabric: "fabric-nocturnal", "rack-metal": "rack-matte-black" }),
  aliasComponent("presence.object.light-fixture", "Light Fixture", "object", "lighting-atmosphere", "presence.light-fixture", "floor", { "rack-metal": "rack-matte-black", "logo-accent": "accent-signal" }),
  aliasComponent("presence.object.garment-rack", "Garment Rack", "object", "display-furniture", "presence.retail-rack", "floor", { "rack-metal": "rack-matte-black" }),
  aliasComponent("presence.object.suspended-rack", "Suspended Garment Rack", "object", "display-furniture", "presence.suspended-rack", "floor", { "rack-metal": "rack-boutique-blackened", tabletop: "tabletop-pale-sculptural" }),
  aliasComponent("presence.surface.display-table", "Display Table", "object", "display-furniture", "presence.display-table", "floor", { tabletop: "tabletop-warm-stone" }),
  aliasComponent("presence.surface.display-island", "Display Island", "display-primitive", "display-furniture", "presence.rounded-island", "floor", { tabletop: "tabletop-pale-sculptural", "rack-metal": "rack-boutique-blackened" }),
  aliasComponent("presence.surface.display-plinth", "Display Plinth", "object", "display-furniture", "presence.display-plinth", "floor", { tabletop: "tabletop-gallery-white" }),
  aliasComponent("presence.surface.product-plinth", "Display Plinth", "object", "display-furniture", "presence.display-plinth", "floor", { tabletop: "tabletop-gallery-white" }, {
    warnings: ["legacy option ID; prefer label Display Plinth", "internal authoring option only", "not admitted"],
  }),
  aliasComponent("presence.surface.display-block", "Display Block", "object", "display-furniture", "presence.product-display-block", "floor", { tabletop: "tabletop-gallery-white", "logo-accent": "accent-signal" }),
  aliasComponent("presence.surface.product-block", "Display Block", "object", "display-furniture", "presence.product-display-block", "floor", { tabletop: "tabletop-gallery-white", "logo-accent": "accent-signal" }, {
    warnings: ["legacy option ID; prefer label Display Block", "internal authoring option only", "not admitted"],
  }),
  aliasComponent("presence.surface.display-shelf", "Display Shelf", "object", "display-furniture", "presence.display-shelf", "floor", { tabletop: "tabletop-warm-stone", "rack-metal": "rack-matte-black" }),
  aliasComponent("presence.surface.display-bay", "Display Bay", "object", "display-furniture", "presence.display-bay", "floor", { wall: "wall-soft-paper", tabletop: "tabletop-pale-sculptural", "rack-metal": "rack-matte-black" }),
  aliasComponent("presence.display.projection-wall", "Projection Wall", "media-surface", "works-media", "presence.projection-wall", "wall", { projection: "projection-emissive", wall: "wall-charcoal" }),
  aliasComponent("presence.display.projection-grid", "Projection Grid", "media-surface", "works-media", "presence.projection-wall", "wall", { projection: "projection-emissive", wall: "wall-charcoal", "rack-metal": "rack-matte-black" }, {
    componentVersion: "2.0.0",
  }),
  aliasComponent("presence.media.framed-media-surface", "Framed Work", "media-surface", "works-media", "presence.framed-media", "wall", { "poster-decal": "poster-satin", "rack-metal": "rack-matte-black" }),
  aliasComponent("presence.media.text-sign-card", "Text Panel", "media-surface", "text-labels", "presence.text-sign-card", "floor", { paper: "paper-uncoated", "poster-decal": "poster-satin" }),
  aliasComponent("presence.work.media-plane", "Work / Media Plane", "media-surface", "works-media", "presence.piece-plane", "surface", { paper: "paper-uncoated", "poster-decal": "poster-satin" }, {
    status: "needs-implementation",
    supportedCustomisations: ["host selection", "media refs", "material preset", "actions"],
    fallbackBehaviour: "Basic work/media plane is generated today through media assignment; direct palette placement needs host selection first.",
    warnings: ["planned option", "requires an existing wall, surface, rack or projection host", "not admitted", "not production-ready"],
  }),
  aliasComponent("presence.object.garment-hanger", "Garment on Hanger", "object", "works-media", "presence.garment-hanger", "rack", { fabric: "fabric-neutral", "rack-metal": "rack-matte-black" }, {
    status: "needs-implementation",
    supportedCustomisations: ["rack slot selection", "media refs", "material preset", "actions"],
    fallbackBehaviour: "Garment hanger is supported in fixtures; direct palette placement needs rack-slot targeting first.",
    warnings: ["planned option", "requires an existing rack slot host", "not admitted", "not production-ready"],
  }),
  aliasComponent("presence.object.archive-wall", "Archive Wall", "media-surface", "works-media", "presence.archive-wall", "wall", { wall: "wall-soft-paper", paper: "paper-archive", "poster-decal": "poster-archive", "rack-metal": "rack-matte-black" }, {
    supportedCustomisations: ["material preset", "skin", "multiple media/text/archive Pieces", "ordered rows", "actions"],
    fallbackBehaviour: "Archive Pieces degrade to an ordered semantic list with assigned actions.",
    warnings: ["internal authoring option only", "not admitted", "not production-ready"],
  }),
  aliasComponent("presence.object.listening-station", "Listening Station", "object", "works-media", "presence.listening-station", "floor", { tabletop: "tabletop-warm-timber", "rack-metal": "rack-matte-black", "logo-accent": "accent-signal" }, {
    supportedCustomisations: ["material preset", "skin", "audio/media Piece refs", "listen/open-link actions"],
    fallbackBehaviour: "Audio/media intent degrades to semantic listen/open-link rows; no audio playback is claimed.",
    warnings: ["internal authoring option only", "not admitted", "not production-ready", "no audio playback in this pass"],
  }),
  aliasComponent("presence.display.spherical-gallery", "Spherical Gallery", "display-primitive", "future-display-systems", "presence.spherical-gallery", "free", { projection: "projection-emissive", "rack-metal": "rack-matte-black", "logo-accent": "accent-signal" }, {
    status: "internal-experimental",
    supportedCustomisations: ["material preset", "skin", "orbiting image/media Pieces", "actions"],
    fallbackBehaviour: "Impossible display degrades to an ordered gallery/card list with the same media and actions.",
    warnings: ["internal experimental", "not admitted", "not production-ready", "impossible-display primitive"],
  }),
  aliasCandidate("presence.candidate.stone-plinth", "Stone Display Plinth", "candidate-objects", "candidate.table.old-church-modeling-interior-sce-ffd7-017", { tabletop: "tabletop-gallery-white", "rack-metal": "rack-matte-black" }),
  aliasCandidate("presence.candidate.stacked-risers", "Stacked Display Risers", "candidate-objects", "candidate.chair.interior-7-3bc1-013", { "rack-metal": "rack-matte-black", fabric: "fabric-neutral" }),
  aliasCandidate("presence.candidate.wire-chair", "Wire Chair", "candidate-objects", "candidate.decorative-prop.interior-7-3bc1-009", { wall: "wall-charcoal", floor: "floor-dark-stone", "logo-accent": "accent-signal" }),
  aliasCandidate("presence.candidate.tripod-light", "Tripod Light Stand", "candidate-objects", "candidate.chair.interior-7-3bc1-000", { "rack-metal": "rack-matte-black", fabric: "fabric-neutral" }),
  aliasCandidate("presence.candidate.fabric-drape", "Fabric Drape Divider", "candidate-objects", "candidate.shelf.retopo-g-555780-0ae2-013", { tabletop: "tabletop-warm-stone", "rack-metal": "rack-matte-black" }),
  aliasDeferred("presence.display.orbital-carousel", "Orbital Carousel", "future-primitive", "future-display-systems", "future-primitive", "Impossible display primitive; resolver intentionally has no component backing.", "future"),
] as const satisfies readonly PresenceOptionAlias[];

export const PRESENCE_OPTION_ALIAS_HIDDEN_COMPONENTS = [
  hiddenComponent("presence.room-shell", "1.0.0", "Foundation shell; exposed through room options, not as a standalone palette object."),
  hiddenComponent("presence.floor-slab", "1.0.0", "Foundation floor; created with rooms and intentionally not added as a loose object."),
  hiddenComponent("presence.boutique-shell", "1.0.0", "Room shell for Dark Gallery Room; exposed through the room option only."),
  hiddenComponent("presence.floor-slab", "2.0.0", "Dark Gallery Room floor variant; exposed through the room option only."),
  hiddenComponent("presence.candidate-display-island", "1.0.0", "Draco runtime proof component; use the stable candidate object alias instead of exposing duplicate proof plumbing."),
] as const satisfies readonly { componentId: string; version: string; reason: string }[];

const OPTION_MAP = new Map(PRESENCE_OPTION_ALIASES.map((option) => [optionKey(option), option]));
const ROOM_KIT_MAP = new Map(PRESENCE_ROOM_KIT_CONTAINERS.map((kit) => [optionKey(kit), kit]));

export function resolvePresenceOption(ref: SpatialOptionRef): PresenceOptionResolution {
  const option = OPTION_MAP.get(optionKey(ref));
  if (!option) return { ok: false, reason: `Unknown Presence option alias ${optionKey(ref)}.` };
  return { ok: true, option };
}

export function resolvePresencePlacementOption(ref: SpatialOptionRef): PresenceResolvedPlacementOption | { ok: false; option?: PresenceOptionAlias; reason: string } {
  const resolved = resolvePresenceOption(ref);
  if (!resolved.ok) return resolved;
  const { option } = resolved;
  if (!option.componentRef || !option.materialSlotOverrides) {
    return { ok: false, option, reason: `${option.name} is ${option.status} and cannot be added as an active placement.` };
  }
  if (!option.status.startsWith("available-now") && option.status !== "internal-experimental") {
    return { ok: false, option, reason: `${option.name} is ${option.status} and cannot be added as an active placement.` };
  }
  return {
    ok: true,
    option,
    componentRef: option.componentRef,
    label: option.name,
    anchorKind: option.placementType === "wall" ? "wall" : option.placementType === "free" ? "free" : "floor",
    materialSlotOverrides: option.materialSlotOverrides,
    optionRef: { optionId: option.optionId, version: option.version },
  };
}

export function resolvePresenceRoomKit(ref: SpatialOptionRef): PresenceRoomKitContainer | undefined {
  return ROOM_KIT_MAP.get(optionKey(ref));
}

export function presenceOptionPaletteGroups(): readonly { label: string; options: readonly PresenceOptionAlias[] }[] {
  const groups = [
    { label: "Walls & Dividers", matches: (option: PresenceOptionAlias) => option.category === "walls-dividers" && option.status.startsWith("available-now") },
    { label: "Display Furniture", matches: (option: PresenceOptionAlias) => option.category === "display-furniture" && option.status.startsWith("available-now") },
    { label: "Works & Media", matches: (option: PresenceOptionAlias) => option.category === "works-media" && (option.status.startsWith("available-now") || option.status === "internal-experimental") },
    { label: "Text & Labels", matches: (option: PresenceOptionAlias) => option.category === "text-labels" && option.status.startsWith("available-now") },
    { label: "Lighting & Atmosphere", matches: (option: PresenceOptionAlias) => option.category === "lighting-atmosphere" && option.status.startsWith("available-now") },
    { label: "Candidate Objects", matches: (option: PresenceOptionAlias) => option.kind === "candidate-component" },
    { label: "Planned Options", matches: (option: PresenceOptionAlias) => option.status === "needs-implementation" || option.status === "deferred" || option.status === "needs-art-pass" || option.status === "needs-scale-review" },
    { label: "Future Display Systems", matches: (option: PresenceOptionAlias) => option.status === "future-primitive" || option.category === "future-display-systems" },
  ];
  return groups.map((group) => ({
    label: group.label,
    options: PRESENCE_OPTION_ALIASES.filter((option) => option.kind !== "room-kit" && group.matches(option)),
  })).filter((group) => group.options.length > 0);
}

export function optionKey(ref: SpatialOptionRef): string {
  return `${ref.optionId}@${ref.version}`;
}

export function validatePresenceOptionAliases(): readonly string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const option of PRESENCE_OPTION_ALIASES) {
    const key = optionKey(option);
    if (seen.has(key)) issues.push(`Duplicate option alias ${key}.`);
    seen.add(key);
    if (!/^presence\.[a-z0-9][a-z0-9.-]{1,110}$/.test(option.optionId)) issues.push(`Invalid option id ${option.optionId}.`);
    if (!/^(?:future|[0-9][0-9]{0,3}(?:\.[0-9]{1,4}){0,2})$/.test(option.version)) issues.push(`Invalid option version ${key}.`);
    if (option.admissionStatus !== "not-admitted") issues.push(`${key} must not be admitted.`);
    if (JSON.stringify(option.internalSourceRefs).match(/\.(?:blend|glb|gltf)(?:["?#]|$)/i)) issues.push(`${key} exposes a raw model path.`);
    if (option.componentRef && !option.status.startsWith("available-now") && option.status !== "internal-experimental" && option.status !== "needs-implementation") {
      issues.push(`${key} has a component ref but unavailable status ${option.status}.`);
    }
  }
  for (const kit of PRESENCE_ROOM_KIT_CONTAINERS) {
    if (!OPTION_MAP.has(optionKey(kit))) issues.push(`Room kit ${optionKey(kit)} has no matching option alias.`);
    if (JSON.stringify(kit.sourceRefs).match(/\.(?:blend|glb|gltf)(?:["?#]|$)/i)) issues.push(`${optionKey(kit)} exposes a raw model path.`);
  }
  return issues;
}

function aliasRoomKit(
  optionId: string,
  name: string,
  category: string,
  status: PresenceOptionStatus,
  overrides: Partial<Pick<PresenceOptionAlias, "implementationStrategy" | "reviewStatus" | "internalSourceRefs" | "warnings">> & { sourceRefs?: readonly PresenceOptionSourceRef[] } = {},
): PresenceOptionAlias {
  return {
    optionId,
    version: "0.1.0",
    name,
    internalSourceRefs: overrides.sourceRefs ?? [{ kind: "room-kit-container", ref: `${optionId}@0.1.0` }],
    kind: "room-kit",
    category,
    status,
    implementationStrategy: overrides.implementationStrategy ?? "procedural-room-kit",
    supportedCustomisations: ["material preset", "lighting profile", "starter objects", "semantic fallback"],
    placementType: "room-kit",
    fallbackBehaviour: status.startsWith("available-now") ? "Procedural shell and starter placements degrade to semantic room list." : "Deferred review card only.",
    reviewStatus: overrides.reviewStatus ?? "not-evaluated",
    admissionStatus: "not-admitted",
    warnings: overrides.warnings ?? ["internal authoring option only", "not admitted"],
    roomKitRef: { optionId, version: "0.1.0" },
  };
}

function aliasComponent(
  optionId: string,
  name: string,
  kind: PresenceOptionKind,
  category: string,
  componentId: string,
  placementType: PresenceOptionAlias["placementType"],
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"],
  overrides: Partial<Pick<PresenceOptionAlias, "status" | "implementationStrategy" | "supportedCustomisations" | "fallbackBehaviour" | "warnings">> & { componentVersion?: string } = {},
): PresenceOptionAlias {
  const componentVersion = overrides.componentVersion ?? "1.0.0";
  return {
    optionId,
    version: "0.1.0",
    name,
    internalSourceRefs: [{ kind: "component", ref: `${componentId}@${componentVersion}`, status: "not-evaluated" }],
    kind,
    category,
    status: overrides.status ?? "available-now-procedural",
    implementationStrategy: overrides.implementationStrategy ?? "procedural-component",
    supportedCustomisations: overrides.supportedCustomisations ?? ["material preset", "skin", "media refs where anchors support Pieces", "actions"],
    placementType,
    fallbackBehaviour: overrides.fallbackBehaviour ?? "Procedural proxy and semantic fallback preserve option meaning.",
    reviewStatus: "not-evaluated",
    admissionStatus: "not-admitted",
    warnings: overrides.warnings ?? ["internal authoring option only", "not admitted"],
    componentRef: { componentId, version: componentVersion },
    materialSlotOverrides,
  };
}

function aliasCandidate(
  optionId: string,
  name: string,
  category: string,
  componentId: string,
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"],
): PresenceOptionAlias {
  const candidate = CANDIDATE_COMPONENT_OPTIONS.find((option) => option.componentId === componentId);
  return {
    optionId,
    version: "0.1.0",
    name,
    internalSourceRefs: [
      { kind: "candidate-component", ref: `${componentId}@0.1.0`, status: candidate?.reviewStatus ?? "candidate-cleared-for-internal-use" },
      ...(candidate ? [{ kind: "candidate-component" as const, ref: candidate.sourceAssetId, status: candidate.clearanceStatus }] : []),
    ],
    kind: "candidate-component",
    category,
    status: "available-now-candidate",
    implementationStrategy: "candidate-component",
    supportedCustomisations: ["material preset", "skin", "media refs where anchors support Pieces", "actions"],
    placementType: candidate?.placementType ?? "floor",
    fallbackBehaviour: "Candidate GLB is optional; proxy geometry and semantic fallback remain authoritative.",
    reviewStatus: "candidate-cleared-for-internal-use",
    admissionStatus: "not-admitted",
    warnings: ["candidate", "internal-use only", "not admitted", "not production-ready", ...(candidate?.warningFlags ?? [])],
    componentRef: { componentId, version: "1.0.0" },
    materialSlotOverrides,
  };
}

function hiddenComponent(componentId: string, version: string, reason: string): { componentId: string; version: string; reason: string } {
  return { componentId, version, reason };
}

function aliasDeferred(
  optionId: string,
  name: string,
  kind: PresenceOptionKind,
  category: string,
  status: PresenceOptionStatus,
  warning: string,
  version = "0.1.0",
): PresenceOptionAlias {
  return {
    optionId,
    version,
    name,
    internalSourceRefs: [],
    kind,
    category,
    status,
    implementationStrategy: status === "future-primitive" ? "future-primitive" : "profile-bundle",
    supportedCustomisations: [],
    placementType: "none",
    fallbackBehaviour: "Visible as an honest option intent only; cannot create active placements.",
    reviewStatus: "not-evaluated",
    admissionStatus: "not-admitted",
    warnings: [warning, "not admitted", "not production-ready"],
  };
}

function roomKitContainer(input: Omit<PresenceRoomKitContainer, "version" | "roomKitId" | "fallbackMode" | "sourceRefs"> & { sourceRefs?: readonly PresenceOptionSourceRef[] }): PresenceRoomKitContainer {
  return {
    ...input,
    version: "0.1.0",
    roomKitId: input.optionId,
    fallbackMode: input.status.startsWith("available-now") ? "proxy-shell" : "deferred-review-card",
    sourceRefs: input.sourceRefs ?? [
      { kind: "component", ref: `${input.shellComponentRef.componentId}@${input.shellComponentRef.version}` },
      { kind: "material-preset", ref: input.materialPreset },
      { kind: "lighting-profile", ref: input.lightingProfile },
    ],
  };
}

function starter(
  id: string,
  optionId: string,
  componentId: string,
  semanticLabel: string,
  position: readonly [number, number, number],
  anchorKind: "floor" | "wall" | "free",
  materialSlotOverrides: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>,
): PresenceRoomKitStarterPlacement {
  return {
    id,
    optionRef: { optionId, version: "0.1.0" },
    componentRef: { componentId, version: "1.0.0" },
    transform: { position, rotation: [0, anchorKind === "wall" && position[2] > 0 ? Math.PI : 0, 0], scale: [1, 1, 1] },
    anchorKind,
    materialSlotOverrides,
    semanticLabel,
  };
}

void CANDIDATE_ROOM_KIT_OPTIONS;
