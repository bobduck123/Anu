import type {
  PresenceStudioV2LayoutId,
  StudioV2BorderStyle,
  StudioV2MotionIntensity,
  StudioV2PublicStylePreset,
  StudioV2WorldId,
} from "../studio-v2/index.ts";
import type {
  StudioV3Atmosphere,
  StudioV3CollectionPresentationId,
  StudioV3Density,
  StudioV3Journey,
  StudioV3Layer,
  StudioV3Look,
  StudioV3LookId,
  StudioV3LookValues,
  StudioV3PieceTreatment,
  StudioV3RoomStyleId,
} from "./model.ts";

export type PresenceStyleCompatibilityTier = "flagship" | "supported" | "experimental" | "blocked";
export type PresenceStyleEvidenceStatus = "proven" | "scaffolded" | "needs-audit";
export type PresenceStyleRendererSupport = "generic-v2" | "specialized-v2" | "private-preview-only" | "metadata-only";
export type PresenceStyleMotionEngine = "none" | "css" | "canvas";
export type PresenceStyleCandidateSupportStatus = "metadata-only" | "experimental" | "supported" | "flagship" | "blocked";
export type PresenceStyleCandidateEvidenceStatus = "none" | "partial" | "public-proof" | "v3-proof" | "hosted-proof";
export type PresencePublicPresetCandidateKind =
  | "look-room-style-pair"
  | "preset-composed-from-primitives"
  | "metadata-only-candidate";

export interface PresenceLookDefinition {
  id: StudioV3LookId;
  name: string;
  description: string;
  dimensionSummary: string;
  bestFitOwnerTypes: readonly string[];
  badFitOwnerTypes: readonly string[];
  typographyDirection: string;
  paletteLight: string;
  materialLanguage: string;
  imageTreatment: string;
  density: StudioV3Density;
  motionTone: string;
  atmosphereDefaults: readonly StudioV3Atmosphere[];
  compatibleRoomStyles: readonly StudioV3RoomStyleId[];
  recommendedRoomStyleId: StudioV3RoomStyleId;
  lockedElements: readonly StudioV3Layer[];
  safeOwnerControls: readonly string[];
  mobileBehaviour: string;
  reducedMotionBehaviour: string;
  performanceExpectation: string;
  intendedWowMoment: string;
  publicProjection: {
    publicStylePreset: StudioV2PublicStylePreset;
    worldId: StudioV2WorldId;
    rendererSupport: PresenceStyleRendererSupport;
  };
  evidenceStatus: PresenceStyleEvidenceStatus;
  values: StudioV3LookValues;
  systemLook: StudioV3Look;
}

export interface PresenceRoomStyleDefinition {
  id: StudioV3RoomStyleId;
  label: string;
  name: string;
  description: string;
  spatialModel: string;
  navigationModel: string;
  contentEncounterPattern: string;
  supportedContentTypes: readonly string[];
  requiredZones: readonly string[];
  optionalZones: readonly string[];
  defaultPieceTreatments: readonly StudioV3PieceTreatment[];
  compatibleLooks: readonly StudioV3LookId[];
  v2LayoutId: PresenceStudioV2LayoutId;
  collectionPresentationId: StudioV3CollectionPresentationId;
  hierarchy: "dominant-entry" | "paced-wall" | "active-work-sequence";
  interaction: "onward-portal" | "ordered-browse" | "previous-next-index";
  mobileBehaviour: string;
  reducedMotionBehaviour: string;
  performanceExpectation: string;
  intendedWowMoment: string;
  rendererSupport: PresenceStyleRendererSupport;
  evidenceStatus: PresenceStyleEvidenceStatus;
}

export interface PresencePieceTreatmentDefinition {
  id: StudioV3PieceTreatment;
  label: string;
  description: string;
  allowedSourceTypes: readonly string[];
  visualRules: string;
  captionRules: string;
  fallbackTreatmentId: StudioV3PieceTreatment;
  mobileBehaviour: string;
  reducedMotionBehaviour: string;
  performanceExpectation: string;
  intendedWowMoment: string;
  preview: {
    optionId: string;
    background: string;
    color: string;
  };
}

export interface PresenceAtmosphereDefinition {
  id: StudioV3Atmosphere;
  label: string;
  description: string;
  environmentalTokens: readonly string[];
  contrastNote: string;
  fallbackAtmosphereId: StudioV3Atmosphere;
  mobileBehaviour: string;
  reducedMotionBehaviour: string;
  performanceExpectation: string;
  intendedWowMoment: string;
  surfaceValue: Pick<StudioV3LookValues, "background" | "texture" | "atmosphere">;
  preview: {
    optionId: string;
    background: string;
    color: string;
  };
}

export interface PresenceMotionBehaviourDefinition {
  id: StudioV2MotionIntensity;
  label: string;
  description: string;
  eventTriggers: readonly string[];
  animationSurfaces: readonly string[];
  motionEngine: PresenceStyleMotionEngine;
  fallbackMotionId: StudioV2MotionIntensity;
  mobileBehaviour: string;
  reducedMotionBehaviour: string;
  performanceExpectation: string;
  intendedWowMoment: string;
  preview: {
    symbol: string;
    background: string;
    color: string;
  };
}

export interface PresenceLookRoomStyleCompatibilityDefinition {
  lookId: StudioV3LookId;
  roomStyleId: StudioV3RoomStyleId;
  tier: PresenceStyleCompatibilityTier;
  reason: string;
  fallbackRoomStyleId?: StudioV3RoomStyleId;
  ownerWarning?: string;
  evidenceStatus: PresenceStyleEvidenceStatus;
  v2LayoutId: PresenceStudioV2LayoutId;
  publicStylePreset: StudioV2PublicStylePreset;
  worldId: StudioV2WorldId;
  collectionPresentationId: StudioV3CollectionPresentationId;
}

export interface PresenceStyleCompatibilityOwnerCopy {
  tier: PresenceStyleCompatibilityTier;
  tierLabel: string;
  tierSummary: string;
  reason: string;
  warning?: string;
  fallbackRoomStyleName?: string;
}

export interface PresenceStyleGuardrailOptions {
  allowExperimental?: boolean;
}

export interface PresenceStyleCandidateReadiness {
  candidate: PresencePublicPresetCandidateDefinition;
  selectableInV3: boolean;
  status: PresenceStyleCandidateSupportStatus;
  statusLabel: string;
  reason: string;
  warning?: string;
  fallbackLookId?: StudioV3LookId;
  fallbackRoomStyleId?: StudioV3RoomStyleId;
}

export interface PresenceStyleSelectionStatus {
  selectable: boolean;
  tier: PresenceStyleCompatibilityTier | PresenceStyleCandidateSupportStatus;
  label: string;
  summary: string;
  reason: string;
  warning?: string;
  fallbackRoomStyleId?: StudioV3RoomStyleId;
  preventsSelection?: PresenceStyleCompatibilityTier | PresenceStyleCandidateSupportStatus;
}

export interface PresencePublicPresetImpliedPair {
  lookId: StudioV3LookId;
  roomStyleId: StudioV3RoomStyleId;
  tier: PresenceStyleCompatibilityTier;
  reason: string;
  fallbackRoomStyleId?: StudioV3RoomStyleId;
}

export interface PresencePublicPresetCandidateDefinition {
  id: StudioV2PublicStylePreset;
  name: string;
  description: string;
  representedByLookId?: StudioV3LookId;
  representedByRoomStyleId?: StudioV3RoomStyleId;
  migrationStatus: "catalog-candidate" | "v3-native";
  supportStatus: PresenceStyleCandidateSupportStatus;
  candidateEvidenceStatus: PresenceStyleCandidateEvidenceStatus;
  candidateKind: PresencePublicPresetCandidateKind;
  impliedLookRoomStylePair?: PresencePublicPresetImpliedPair;
  rendererSupport: PresenceStyleRendererSupport;
  primitiveRequirements: readonly string[];
  missingContracts: readonly string[];
  currentImplementationRefs: readonly string[];
  publicRendererSpecifics: readonly string[];
  compatibilityRecommendation: string;
  mobileBehaviour: string;
  reducedMotionBehaviour: string;
  performanceExpectation: string;
  intendedWowMoment: string;
  evidenceStatus: PresenceStyleEvidenceStatus;
}

function systemLook(id: StudioV3LookId, name: string, values: StudioV3LookValues): StudioV3Look {
  return {
    id,
    baseLookId: id,
    name,
    origin: "system",
    provenance: "studio-v3-shared-style-catalog",
    values,
  };
}

const softEditorialValues: StudioV3LookValues = {
  background: "#f7f3ea",
  accentColor: "#8f6f3f",
  texture: "linen",
  borderStyle: "hairline",
  objectRadius: 12,
  shadowDepth: 0.24,
  headingWeight: 650,
  motionIntensity: "still",
  publicStylePreset: "gallery-p2",
  roomStyleId: "gallery-wall",
  worldId: "gallery",
  collectionPresentationId: "wall",
  atmosphere: "paper-light",
  density: "spacious",
  pieceTreatment: "quiet-framed",
  journey: "editorial-browse",
};

const nocturnalGalleryValues: StudioV3LookValues = {
  background: "#050505",
  accentColor: "#ffd84d",
  texture: "grain",
  borderStyle: "hairline",
  objectRadius: 2,
  shadowDepth: 0.58,
  headingWeight: 520,
  motionIntensity: "gentle",
  publicStylePreset: "bbbvision-threshold-gallery",
  roomStyleId: "threshold-portal",
  worldId: "gallery",
  collectionPresentationId: "threshold-feature",
  atmosphere: "nocturnal-depth",
  density: "focused",
  pieceTreatment: "luminous-depth",
  journey: "threshold-reveal",
};

const zineArchiveValues: StudioV3LookValues = {
  background: "#2b1118",
  accentColor: "#f1c96a",
  texture: "ledger",
  borderStyle: "ledger",
  objectRadius: 0,
  shadowDepth: 0.12,
  headingWeight: 780,
  motionIntensity: "living",
  publicStylePreset: "gallery-p2",
  roomStyleId: "film-strip-selected-works",
  worldId: "zine",
  collectionPresentationId: "selected-sequence",
  atmosphere: "ledger-scan",
  density: "dense",
  pieceTreatment: "captioned-ledger",
  journey: "archive-index",
};

const brassInlayValues: StudioV3LookValues = {
  background: "#f2ead8",
  accentColor: "#b08a3a",
  texture: "paper",
  borderStyle: "hairline",
  objectRadius: 4,
  shadowDepth: 0.18,
  headingWeight: 650,
  motionIntensity: "living",
  publicStylePreset: "gallery-p2",
  roomStyleId: "refractive-threshold",
  worldId: "gallery",
  collectionPresentationId: "threshold-feature",
  atmosphere: "drawing-sheet",
  density: "focused",
  pieceTreatment: "measured-plate",
  journey: "threshold-reveal",
};

export const PRESENCE_LOOK_DEFINITIONS = [
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    description: "Airy editorial pacing with a light linen field and quiet framing.",
    dimensionSummary: "Spacious hierarchy - restrained treatment - still motion",
    bestFitOwnerTypes: ["artist", "cultural program", "portfolio"],
    badFitOwnerTypes: ["high-signal launch", "dense archive"],
    typographyDirection: "Quiet editorial weight with clear hierarchy.",
    paletteLight: "Warm paper, brown accent, low contrast texture.",
    materialLanguage: "Linen and paper surfaces with hairline edges.",
    imageTreatment: "Quiet framed works with low shadow.",
    density: "spacious",
    motionTone: "Still and composed.",
    atmosphereDefaults: ["paper-light"],
    compatibleRoomStyles: ["gallery-wall", "threshold-portal", "film-strip-selected-works"],
    recommendedRoomStyleId: "gallery-wall",
    lockedElements: [],
    safeOwnerControls: ["background", "accentColor", "texture", "pieceTreatment", "motionIntensity"],
    mobileBehaviour: "Stacks into a paced scroll with the opening work first.",
    reducedMotionBehaviour: "No decorative motion is required.",
    performanceExpectation: "CSS-only and low cost.",
    intendedWowMoment: "The Presence feels edited, calm, and immediately legible.",
    publicProjection: { publicStylePreset: "gallery-p2", worldId: "gallery", rendererSupport: "generic-v2" },
    evidenceStatus: "proven",
    values: softEditorialValues,
    systemLook: systemLook("soft-editorial", "Soft Editorial", softEditorialValues),
  },
  {
    id: "nocturnal-gallery",
    name: "Nocturnal Gallery",
    description: "A near-black threshold with concentrated signal, depth, and cinematic focus.",
    dimensionSummary: "Focused hierarchy - luminous treatment - gentle motion",
    bestFitOwnerTypes: ["artist", "collective", "screen-based practice", "flagship proof"],
    badFitOwnerTypes: ["text-heavy archive", "quiet institutional profile"],
    typographyDirection: "Low, cinematic hierarchy with signal accents.",
    paletteLight: "Black field, gold signal, restrained depth.",
    materialLanguage: "Threshold darkness, luminous edges, canvas atmosphere.",
    imageTreatment: "Luminous depth around selected works.",
    density: "focused",
    motionTone: "Gentle ambient motion with reduced-motion fallback.",
    atmosphereDefaults: ["nocturnal-depth"],
    compatibleRoomStyles: ["threshold-portal", "gallery-wall", "film-strip-selected-works"],
    recommendedRoomStyleId: "threshold-portal",
    lockedElements: [],
    safeOwnerControls: ["background", "accentColor", "texture", "pieceTreatment", "motionIntensity"],
    mobileBehaviour: "Prioritizes threshold entry and focused work navigation.",
    reducedMotionBehaviour: "Canvas and CSS movement collapse to static focus states.",
    performanceExpectation: "Canvas path must stay DPR-capped and interaction-light on mobile.",
    intendedWowMoment: "A visitor crosses a threshold into the work field.",
    publicProjection: { publicStylePreset: "bbbvision-threshold-gallery", worldId: "gallery", rendererSupport: "specialized-v2" },
    evidenceStatus: "proven",
    values: nocturnalGalleryValues,
    systemLook: systemLook("nocturnal-gallery", "Nocturnal Gallery", nocturnalGalleryValues),
  },
  {
    id: "zine-archive",
    name: "Zine Archive",
    description: "A tactile ledger rhythm with assertive labels, clipped frames, and denser sequence.",
    dimensionSummary: "Archive hierarchy - captioned treatment - living motion",
    bestFitOwnerTypes: ["archive", "publication", "campaign record"],
    badFitOwnerTypes: ["minimal artist portfolio", "single flagship work"],
    typographyDirection: "Indexed labels and assertive archive weight.",
    paletteLight: "Burgundy surface, gold label, ledger texture.",
    materialLanguage: "Scanned paper, clipped frames, tactile sequence.",
    imageTreatment: "Captioned ledger works with stronger labels.",
    density: "dense",
    motionTone: "Living but still owner-private until renderer proof grows.",
    atmosphereDefaults: ["ledger-scan"],
    compatibleRoomStyles: ["film-strip-selected-works", "gallery-wall", "threshold-portal"],
    recommendedRoomStyleId: "film-strip-selected-works",
    lockedElements: [],
    safeOwnerControls: ["background", "accentColor", "texture", "pieceTreatment", "motionIntensity"],
    mobileBehaviour: "Collapses to one active work plus sequence/index controls.",
    reducedMotionBehaviour: "Living motion must reduce to static indexed states.",
    performanceExpectation: "CSS-only until a dedicated public renderer exists.",
    intendedWowMoment: "The Presence feels like an active cultural index rather than a flat archive.",
    publicProjection: { publicStylePreset: "gallery-p2", worldId: "zine", rendererSupport: "private-preview-only" },
    evidenceStatus: "scaffolded",
    values: zineArchiveValues,
    systemLook: systemLook("zine-archive", "Zine Archive", zineArchiveValues),
  },
  {
    id: "brass-inlay",
    name: "Brass Inlay",
    description: "Atelier reference Look: warm drawing-office paper, deep ink, and one brass accent.",
    dimensionSummary: "Focused threshold - measured treatment - living motion fallback",
    bestFitOwnerTypes: ["maker", "fabricator", "atelier", "architect", "small practice with bounded capacity"],
    badFitOwnerTypes: ["high-volume commerce", "photography-led owners", "performers", "dense information systems"],
    typographyDirection: "One display serif against one UI sans, with monospace labels for measured information.",
    paletteLight: "Warm paper, deep ink, and a single brass accent.",
    materialLanguage: "Drawing office surface with dithered paper, rule grids, construction arcs, refractive glass, and brass inlay.",
    imageTreatment: "Measured elevations and generated drawings rather than photographic content.",
    density: "focused",
    motionTone: "Atelier names Seventy-Five, Glass Drift, and Approach; M3A collapses them to the existing living V2 bridge value.",
    atmosphereDefaults: ["drawing-sheet", "material-sampler"],
    compatibleRoomStyles: ["refractive-threshold"],
    recommendedRoomStyleId: "refractive-threshold",
    lockedElements: ["presence-look", "piece-treatment", "motion-atmosphere"],
    safeOwnerControls: [
      "material sample metadata only",
      "single brass accent",
      "dither coarseness evidence",
      "rule pitch evidence",
      "refraction parameters evidence",
    ],
    mobileBehaviour: "Portrait becomes a separate six-body descent with visible labels, not a squeezed wide scene.",
    reducedMotionBehaviour: "Drift amplitude settles to zero; the open gesture shortens and all destinations remain reachable.",
    performanceExpectation: "Reference expects one WebGL context, shared cube camera, and 2D fallback; M3A does not import that adapter.",
    intendedWowMoment: "The drawing-sheet rule grid bends under drifting glass.",
    publicProjection: { publicStylePreset: "gallery-p2", worldId: "gallery", rendererSupport: "private-preview-only" },
    evidenceStatus: "scaffolded",
    values: brassInlayValues,
    systemLook: systemLook("brass-inlay", "Brass Inlay", brassInlayValues),
  },
] as const satisfies readonly PresenceLookDefinition[];

export const PRESENCE_ROOM_STYLE_DEFINITIONS = [
  {
    id: "threshold-portal",
    label: "Threshold Portal",
    name: "Threshold Portal",
    description: "One dominant arrival, framing statement, signal, and protected onward path.",
    spatialModel: "Arrival threshold with one dominant work and onward path.",
    navigationModel: "Entry first, then directed progression.",
    contentEncounterPattern: "Dominant work, statement, signal, exit.",
    supportedContentTypes: ["image", "writing", "cta"],
    requiredZones: ["threshold-image", "threshold-statement", "threshold-exit"],
    optionalZones: ["threshold-signal"],
    defaultPieceTreatments: ["luminous-depth", "quiet-framed"],
    compatibleLooks: ["nocturnal-gallery", "soft-editorial", "zine-archive"],
    v2LayoutId: "portal-threshold",
    collectionPresentationId: "threshold-feature",
    hierarchy: "dominant-entry",
    interaction: "onward-portal",
    mobileBehaviour: "Single-column threshold with work and action kept close.",
    reducedMotionBehaviour: "Threshold remains readable without transition motion.",
    performanceExpectation: "Low DOM cost; BBBVision canvas dependency belongs to the Look/preset bridge.",
    intendedWowMoment: "The first object feels like an arrival gate.",
    rendererSupport: "specialized-v2",
    evidenceStatus: "proven",
  },
  {
    id: "gallery-wall",
    label: "Gallery Wall",
    name: "Gallery Wall",
    description: "A paced exhibition wall with an opening work, supporting context, and exit.",
    spatialModel: "Paced wall with feature, supporting works, notes, and exit.",
    navigationModel: "Ordered browse.",
    contentEncounterPattern: "Opening work, main wall, supporting notes, influence layer, CTA.",
    supportedContentTypes: ["image", "writing", "cta"],
    requiredZones: ["opening-work", "main-wall", "cta-exit"],
    optionalZones: ["supporting-notes", "influence-layer"],
    defaultPieceTreatments: ["quiet-framed"],
    compatibleLooks: ["soft-editorial", "nocturnal-gallery", "zine-archive"],
    v2LayoutId: "gallery-wall",
    collectionPresentationId: "wall",
    hierarchy: "paced-wall",
    interaction: "ordered-browse",
    mobileBehaviour: "Stacks in reading order with the opening work first.",
    reducedMotionBehaviour: "Works as a static gallery wall.",
    performanceExpectation: "Generic V2 renderer path, CSS-only.",
    intendedWowMoment: "The owner sees content become a composed wall.",
    rendererSupport: "generic-v2",
    evidenceStatus: "proven",
  },
  {
    id: "film-strip-selected-works",
    label: "Film Strip / Selected Works",
    name: "Film Strip / Selected Works",
    description: "One active Work at a time with previous, next, progress, and direct index movement.",
    spatialModel: "Selected-work stage with sequence index and context.",
    navigationModel: "Previous, next, and direct index movement.",
    contentEncounterPattern: "Active work, sequence index, selected-work context, exit.",
    supportedContentTypes: ["image", "writing", "cta"],
    requiredZones: ["active-work-stage", "sequence-index", "selected-works-exit"],
    optionalZones: ["selected-work-context"],
    defaultPieceTreatments: ["captioned-ledger", "quiet-framed"],
    compatibleLooks: ["zine-archive", "soft-editorial", "nocturnal-gallery"],
    v2LayoutId: "film-strip-selected-works",
    collectionPresentationId: "selected-sequence",
    hierarchy: "active-work-sequence",
    interaction: "previous-next-index",
    mobileBehaviour: "Carousel-like active work with index controls and stacked context.",
    reducedMotionBehaviour: "Index changes must remain readable without motion.",
    performanceExpectation: "Private-preview scaffold until public proof is stronger.",
    intendedWowMoment: "A collection becomes a deliberate sequence.",
    rendererSupport: "private-preview-only",
    evidenceStatus: "scaffolded",
  },
  {
    id: "refractive-threshold",
    label: "Refractive Threshold",
    name: "Refractive Threshold",
    description: "Atelier reference Room Style: six navigable refractive bodies over a drawing sheet.",
    spatialModel: "A single 3D scene with glass bodies, drawing-sheet ground, line-work, and shallow depth.",
    navigationModel: "Bodies act as the interface with a screen-reader-only destination mirror.",
    contentEncounterPattern: "A selected body advances, expands, and becomes the room while content resolves during the gesture.",
    supportedContentTypes: ["short manifesto text", "layered capability", "generated drawings", "ordered sequence", "structured sheet", "one action"],
    requiredZones: ["six navigable destinations", "identity mark", "one visitor action"],
    optionalZones: ["material sampler", "fixture notice"],
    defaultPieceTreatments: ["onion-inspection", "scribe-reveal", "measured-plate"],
    compatibleLooks: ["brass-inlay"],
    v2LayoutId: "portal-threshold",
    collectionPresentationId: "threshold-feature",
    hierarchy: "dominant-entry",
    interaction: "onward-portal",
    mobileBehaviour: "Same six bodies in portrait composition with larger tap targets and visible labels.",
    reducedMotionBehaviour: "Bodies settle to rest pose, drift stops, and every room remains legible.",
    performanceExpectation: "Reference declares full, lean, and flat tiers; M3A does not import the WebGL adapter.",
    intendedWowMoment: "The body the visitor touches becomes the room they enter.",
    rendererSupport: "private-preview-only",
    evidenceStatus: "scaffolded",
  },
] as const satisfies readonly PresenceRoomStyleDefinition[];

export const PRESENCE_PIECE_TREATMENT_DEFINITIONS = [
  {
    id: "quiet-framed",
    label: "Quiet Framed",
    description: "Fine edge, low shadow.",
    allowedSourceTypes: ["image", "writing"],
    visualRules: "Keep the Piece quiet, framed, and subordinate to hierarchy.",
    captionRules: "Use captions sparingly and preserve readable contrast.",
    fallbackTreatmentId: "quiet-framed",
    mobileBehaviour: "Keep frame visible without crowding the work.",
    reducedMotionBehaviour: "No treatment motion required.",
    performanceExpectation: "CSS-only.",
    intendedWowMoment: "A work feels carefully held, not dropped into a grid.",
    preview: { optionId: "quiet", background: "#eee6d6", color: "#594628" },
  },
  {
    id: "luminous-depth",
    label: "Luminous Depth",
    description: "Deep field, radiant edge.",
    allowedSourceTypes: ["image"],
    visualRules: "Use depth, glow, and contrast around focused works.",
    captionRules: "Keep captions minimal so the work leads.",
    fallbackTreatmentId: "quiet-framed",
    mobileBehaviour: "Reduce glow and maintain edge clarity.",
    reducedMotionBehaviour: "Depth remains as static contrast.",
    performanceExpectation: "CSS/canvas-safe on mobile with capped effects.",
    intendedWowMoment: "The focused work appears to emit signal.",
    preview: { optionId: "luminous", background: "#090909", color: "#ffd84d" },
  },
  {
    id: "captioned-ledger",
    label: "Captioned Ledger",
    description: "Indexed, tactile label.",
    allowedSourceTypes: ["image", "writing"],
    visualRules: "Treat the Piece as an indexed cultural record.",
    captionRules: "Labels are part of the composition, not secondary chrome.",
    fallbackTreatmentId: "quiet-framed",
    mobileBehaviour: "Keep captions attached to the active Piece.",
    reducedMotionBehaviour: "Index and label remain static.",
    performanceExpectation: "CSS-only.",
    intendedWowMoment: "The archive becomes tactile and navigable.",
    preview: { optionId: "captioned", background: "#d3b887", color: "#2b1118" },
  },
  {
    id: "onion-inspection",
    label: "Onion Inspection",
    description: "Atelier treatment metadata for layered capability inspection.",
    allowedSourceTypes: ["image", "writing", "generated", "module"],
    visualRules: "Evidence-only in M3A: layered planes, focus bias, and aria-live readout need a later adapter.",
    captionRules: "Fallback captions must remain readable as a flat list.",
    fallbackTreatmentId: "quiet-framed",
    mobileBehaviour: "Reference uses drag-to-scrub and rests at the middle layer.",
    reducedMotionBehaviour: "Flatten to a fully legible vertical list.",
    performanceExpectation: "No runtime layer adapter is imported in M3A.",
    intendedWowMoment: "A capability separates into the operations it is made of.",
    preview: { optionId: "onion", background: "#efe1c4", color: "#21170d" },
  },
  {
    id: "scribe-reveal",
    label: "Scribe Reveal",
    description: "Atelier treatment metadata for directional text reveal.",
    allowedSourceTypes: ["writing", "module"],
    visualRules: "Evidence-only in M3A: clip-path, scribe line, and directional offset need a later adapter.",
    captionRules: "Text must resolve fully and never remain clipped under reduced motion.",
    fallbackTreatmentId: "quiet-framed",
    mobileBehaviour: "Reference keeps the same reveal but shortens stagger.",
    reducedMotionBehaviour: "Resolve instantly with no clip or offset.",
    performanceExpectation: "CSS-only if implemented later; not active in M3A.",
    intendedWowMoment: "Text resolves as if drawn from the selected body.",
    preview: { optionId: "scribe", background: "#f2ead8", color: "#8a6a24" },
  },
  {
    id: "measured-plate",
    label: "Measured Plate",
    description: "Atelier treatment metadata for generated orthographic elevation plates.",
    allowedSourceTypes: ["image", "generated"],
    visualRules: "Evidence-only in M3A: generated form kind and seed are not part of the V3 Piece model yet.",
    captionRules: "Mono title-block language should remain readable.",
    fallbackTreatmentId: "quiet-framed",
    mobileBehaviour: "Screen coarsens and remains drawing-like at small sizes.",
    reducedMotionBehaviour: "Unaffected because the plate is still.",
    performanceExpectation: "Plate rasterisation is deferred to a later private-preview adapter.",
    intendedWowMoment: "A work reads as a measured elevation instead of an uploaded image.",
    preview: { optionId: "plate", background: "#e7d2a8", color: "#17120a" },
  },
] as const satisfies readonly PresencePieceTreatmentDefinition[];

export const PRESENCE_ATMOSPHERE_DEFINITIONS = [
  {
    id: "paper-light",
    label: "Paper Light",
    description: "Warm paper, soft grain.",
    environmentalTokens: ["paper", "linen", "warm light"],
    contrastNote: "Designed for dark text on a warm light field.",
    fallbackAtmosphereId: "paper-light",
    mobileBehaviour: "Preserve the warm surface without heavy texture.",
    reducedMotionBehaviour: "Atmosphere remains static.",
    performanceExpectation: "CSS-only.",
    intendedWowMoment: "The page feels like a handled editorial object.",
    surfaceValue: { background: "#f7f3ea", texture: "paper", atmosphere: "paper-light" },
    preview: { optionId: "paper", background: "#f7f3ea", color: "#17120a" },
  },
  {
    id: "nocturnal-depth",
    label: "Nocturnal Depth",
    description: "Black field, concentrated signal.",
    environmentalTokens: ["black field", "gold signal", "depth"],
    contrastNote: "Requires high contrast text and reduced-motion fallback.",
    fallbackAtmosphereId: "paper-light",
    mobileBehaviour: "Keep signal visible and avoid dark low-contrast controls.",
    reducedMotionBehaviour: "Depth becomes static contrast and focus.",
    performanceExpectation: "Canvas/CSS effects must remain bounded.",
    intendedWowMoment: "The visitor enters a dark gallery field.",
    surfaceValue: { background: "#050505", texture: "grain", atmosphere: "nocturnal-depth" },
    preview: { optionId: "night", background: "#050505", color: "#ffd84d" },
  },
  {
    id: "ledger-scan",
    label: "Ledger Scan",
    description: "Burgundy archive surface.",
    environmentalTokens: ["ledger", "scan", "archive surface"],
    contrastNote: "Labels need strong gold/light contrast.",
    fallbackAtmosphereId: "paper-light",
    mobileBehaviour: "Reduce texture density behind captions.",
    reducedMotionBehaviour: "Scan behaviour becomes a static surface.",
    performanceExpectation: "CSS-only until public renderer proof grows.",
    intendedWowMoment: "The archive has texture and memory.",
    surfaceValue: { background: "#2b1118", texture: "ledger", atmosphere: "ledger-scan" },
    preview: { optionId: "ledger", background: "#2b1118", color: "#f1c96a" },
  },
  {
    id: "drawing-sheet",
    label: "Drawing Sheet",
    description: "Atelier atmosphere metadata for warm paper, rule grid, construction arcs, and dithered light.",
    environmentalTokens: ["warm paper", "rule grid", "construction arcs", "dither screen", "light fold"],
    contrastNote: "Deep ink and brass accents must remain readable on warm paper.",
    fallbackAtmosphereId: "paper-light",
    mobileBehaviour: "Reference makes the screen coarser relative to viewport.",
    reducedMotionBehaviour: "Static composition with no drifting wash.",
    performanceExpectation: "Fragment shader and cube-target sampling are deferred in M3A.",
    intendedWowMoment: "The ground plane gives refraction something visible to bend.",
    surfaceValue: { background: "#f2ead8", texture: "paper", atmosphere: "drawing-sheet" },
    preview: { optionId: "drawing", background: "#f2ead8", color: "#17120a" },
  },
  {
    id: "material-sampler",
    label: "Material Sampler",
    description: "Atelier atmosphere metadata for authored material samples that carry palette and structural tokens.",
    environmentalTokens: ["material sample", "rule pitch", "screen coarseness", "grain", "drift"],
    contrastNote: "Sampler changes must not make content unreadable.",
    fallbackAtmosphereId: "paper-light",
    mobileBehaviour: "Reference uses a fixed sheet below the control.",
    reducedMotionBehaviour: "Tokens apply immediately with no cross-fade.",
    performanceExpectation: "Canvas samples and re-rasterisation are deferred in M3A.",
    intendedWowMoment: "A material sample changes structure rather than just recolouring the room.",
    surfaceValue: { background: "#ead8b8", texture: "paper", atmosphere: "material-sampler" },
    preview: { optionId: "material", background: "#d7bd80", color: "#17120a" },
  },
] as const satisfies readonly PresenceAtmosphereDefinition[];

export const PRESENCE_MOTION_BEHAVIOUR_DEFINITIONS = [
  {
    id: "still",
    label: "Still",
    description: "No decorative movement.",
    eventTriggers: [],
    animationSurfaces: [],
    motionEngine: "none",
    fallbackMotionId: "still",
    mobileBehaviour: "No motion-specific mobile cost.",
    reducedMotionBehaviour: "Already reduced.",
    performanceExpectation: "No decorative animation.",
    intendedWowMoment: "The work holds attention through composition.",
    preview: { symbol: "-", background: "#e5e0d7", color: "#15120f" },
  },
  {
    id: "gentle",
    label: "Gentle",
    description: "Measured ambient movement.",
    eventTriggers: ["idle", "focus"],
    animationSurfaces: ["atmosphere", "selected work"],
    motionEngine: "css",
    fallbackMotionId: "still",
    mobileBehaviour: "Motion must be light and non-blocking on touch devices.",
    reducedMotionBehaviour: "Decorative movement collapses to still.",
    performanceExpectation: "CSS-only unless a style declares canvas support.",
    intendedWowMoment: "The environment feels alive without distracting from content.",
    preview: { symbol: "~", background: "#ccb882", color: "#15120f" },
  },
  {
    id: "living",
    label: "Living",
    description: "Most expressive registered motion.",
    eventTriggers: ["idle", "focus", "navigation"],
    animationSurfaces: ["atmosphere", "sequence", "selected work"],
    motionEngine: "css",
    fallbackMotionId: "still",
    mobileBehaviour: "Must degrade to readable sequence changes.",
    reducedMotionBehaviour: "Navigation stays instant and static.",
    performanceExpectation: "Requires focused proof before public use.",
    intendedWowMoment: "The room feels actively directed by the owner's choices.",
    preview: { symbol: "~", background: "#2b1118", color: "#f1c96a" },
  },
] as const satisfies readonly PresenceMotionBehaviourDefinition[];

export const PRESENCE_PUBLIC_PRESET_CANDIDATES = [
  {
    id: "gallery-p2",
    name: "Gallery P2",
    description: "Generic V2 gallery baseline used by the simple/control style pair.",
    representedByLookId: "soft-editorial",
    representedByRoomStyleId: "gallery-wall",
    migrationStatus: "v3-native",
    supportStatus: "supported",
    candidateEvidenceStatus: "v3-proof",
    candidateKind: "look-room-style-pair",
    impliedLookRoomStylePair: {
      lookId: "soft-editorial",
      roomStyleId: "gallery-wall",
      tier: "flagship",
      reason: "Room 1 control pair maps directly to Soft Editorial plus Gallery Wall.",
    },
    rendererSupport: "generic-v2",
    primitiveRequirements: [
      "Generic V2 gallery-wall projection",
      "Paper Light atmosphere",
      "Quiet Framed piece treatment",
      "Still motion behaviour",
    ],
    missingContracts: [],
    currentImplementationRefs: [
      "lib/presence/studio-v3/styleCatalog.ts: soft-editorial and gallery-wall definitions",
      "components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx: generic gallery branch",
    ],
    publicRendererSpecifics: ["Generic PresenceStudioV2PublicRoom path; no specialized public preset branch."],
    compatibilityRecommendation: "Keep as the room 1 simple/control fallback and baseline.",
    mobileBehaviour: "Generic V2 mobile stack.",
    reducedMotionBehaviour: "Generic reduced-motion CSS path.",
    performanceExpectation: "Low cost generic renderer.",
    intendedWowMoment: "Stable control rather than flagship wow.",
    evidenceStatus: "proven",
  },
  {
    id: "bbbvision-threshold-gallery",
    name: "BBBVision Threshold Gallery",
    description: "Specialized BBBVision public preset that backs the flagship private style bundle.",
    representedByLookId: "nocturnal-gallery",
    representedByRoomStyleId: "threshold-portal",
    migrationStatus: "v3-native",
    supportStatus: "flagship",
    candidateEvidenceStatus: "v3-proof",
    candidateKind: "look-room-style-pair",
    impliedLookRoomStylePair: {
      lookId: "nocturnal-gallery",
      roomStyleId: "threshold-portal",
      tier: "flagship",
      reason: "BBBVision flagship pair maps directly to Nocturnal Gallery plus Threshold Portal.",
    },
    rendererSupport: "specialized-v2",
    primitiveRequirements: [
      "Threshold Portal room style",
      "Nocturnal Depth atmosphere",
      "Luminous Depth piece treatment",
      "Gentle motion behaviour",
      "Specialized BBBVision gallery bridge",
    ],
    missingContracts: ["Public renderer adapter still uses the specialized V2 branch until later Gate 3 proof."],
    currentImplementationRefs: [
      "lib/presence/studio-v3/styleCatalog.ts: nocturnal-gallery and threshold-portal definitions",
      "components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx: bbbvision-threshold-gallery branch",
    ],
    publicRendererSpecifics: ["Specialized public branch with threshold, gallery, practice, and focus behaviour."],
    compatibilityRecommendation: "Keep as the first flagship migrated style pair.",
    mobileBehaviour: "Canvas and threshold behaviours are mobile-capped.",
    reducedMotionBehaviour: "Canvas and CSS movement collapse to static focus.",
    performanceExpectation: "Canvas path must stay bounded.",
    intendedWowMoment: "The visitor enters a threshold gallery.",
    evidenceStatus: "proven",
  },
  {
    id: "christina-liquid-gallery",
    name: "Christina Liquid Gallery",
    description: "Existing Presence proof with a V2 public preset, renderer branch, CSS, and mobile evidence.",
    migrationStatus: "catalog-candidate",
    supportStatus: "metadata-only",
    candidateEvidenceStatus: "public-proof",
    candidateKind: "preset-composed-from-primitives",
    impliedLookRoomStylePair: {
      lookId: "soft-editorial",
      roomStyleId: "film-strip-selected-works",
      tier: "experimental",
      fallbackRoomStyleId: "gallery-wall",
      reason: "Closest existing V3 primitive mapping is a light editorial selected-works sequence, but Christina's liquid surface and treatment are not V3-native yet.",
    },
    rendererSupport: "specialized-v2",
    primitiveRequirements: [
      "Liquid gallery surface field and dither atmosphere",
      "Selected-work stage with previous, next, progress, and dot controls",
      "Watercolour image stage treatment with focus overlay",
      "Practice pathway and reference strip content regions",
      "Reduced-motion contract for liquid field, dither, hover transforms, and smooth scroll",
      "Performance contract for large public artwork images and paint-heavy CSS layers",
    ],
    missingContracts: [
      "No Christina V3 Look ID",
      "No Christina V3 Room Style ID",
      "No liquid atmosphere token",
      "No liquid piece treatment token",
      "No liquid motion behaviour token",
      "No V3 private preview adapter for the Christina renderer branch",
      "No Christina-specific reduced-motion proof",
      "No compatibility matrix row for Christina as a V3-native pair",
    ],
    currentImplementationRefs: [
      "components/presence-studio-v2/worlds.ts: Christina owner-facing V2 public preset option",
      "components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx: christina-liquid-gallery public branch",
      "components/presence-studio-v2/presence-studio-v2-public.css: style-christina-liquid-gallery CSS block",
      "lib/presence/studio-v2/model.ts: StudioV2PublicStylePreset union and options",
      "tests/e2e/presence-studio-v2-public-style-presets.spec.ts: Christina switch/publish/mobile regression",
      "tests/e2e/mock-presence-api.mjs: GGM/Christina editable fixture metadata",
    ],
    publicRendererSpecifics: [
      "Hard-coded specialized React branch behind worldId gallery and publicStylePreset christina-liquid-gallery.",
      "Stateful selected-work sequence is derived from chamber objects with image sources.",
      "CSS owns liquid field, dither, stage, pathway, practice, reference, focus, and mobile layout classes.",
    ],
    compatibilityRecommendation: "Keep hidden from V3 Look controls; if selected later, label experimental and fall back to Soft Editorial plus Gallery Wall until a private V3 preview adapter exists.",
    mobileBehaviour: "Existing V2 public style has mobile CSS evidence.",
    reducedMotionBehaviour: "Needs explicit Gate 3 audit before full V3 support.",
    performanceExpectation: "Do not expose through V3 catalog wiring until mapped into primitives.",
    intendedWowMoment: "Liquid gallery motion makes the work field feel material.",
    evidenceStatus: "needs-audit",
  },
] as const satisfies readonly PresencePublicPresetCandidateDefinition[];

const compatibilitySeeds = [
  ["soft-editorial", "gallery-wall", "flagship", "Room 1 control pair: simple Gallery P2 baseline.", undefined, "proven"],
  ["soft-editorial", "threshold-portal", "supported", "Soft Editorial can use a threshold while remaining generic V2.", "gallery-wall", "scaffolded"],
  ["soft-editorial", "film-strip-selected-works", "experimental", "Sequence layout is available but not the control posture.", "gallery-wall", "scaffolded"],
  ["nocturnal-gallery", "threshold-portal", "flagship", "BBVision flagship pair: Nocturnal Look plus threshold/gallery behaviour.", undefined, "proven"],
  ["nocturnal-gallery", "gallery-wall", "supported", "Nocturnal atmosphere can render on the generic gallery wall.", "threshold-portal", "scaffolded"],
  ["nocturnal-gallery", "film-strip-selected-works", "experimental", "Nocturnal film strip compiles privately but is not public flagship proof.", "threshold-portal", "scaffolded"],
  ["zine-archive", "film-strip-selected-works", "experimental", "Zine Archive scaffold is strongest with selected works, but lacks public preset proof.", undefined, "scaffolded"],
  ["zine-archive", "gallery-wall", "supported", "Zine values can compile through Gallery P2 while public proof remains generic.", "film-strip-selected-works", "scaffolded"],
  ["zine-archive", "threshold-portal", "experimental", "Archive texture can enter a threshold, but it is not a recommended proof pair.", "film-strip-selected-works", "scaffolded"],
  ["brass-inlay", "refractive-threshold", "blocked", "Atelier reference flagship is staged as frontend/private metadata only; public renderer adapter and backend persistence are deferred.", "gallery-wall", "scaffolded"],
] as const satisfies readonly (readonly [
  StudioV3LookId,
  StudioV3RoomStyleId,
  PresenceStyleCompatibilityTier,
  string,
  StudioV3RoomStyleId | undefined,
  PresenceStyleEvidenceStatus,
])[];

export const PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY = compatibilitySeeds.map(([
  lookId,
  roomStyleId,
  tier,
  reason,
  fallbackRoomStyleId,
  evidenceStatus,
]): PresenceLookRoomStyleCompatibilityDefinition => {
  const look = getPresenceLookDefinition(lookId);
  const roomStyle = getPresenceRoomStyleDefinition(roomStyleId);
  return {
    lookId,
    roomStyleId,
    tier,
    reason,
    ...(fallbackRoomStyleId ? { fallbackRoomStyleId } : {}),
    ...(tier === "experimental" ? { ownerWarning: "Internal/dev style pairing; public renderer proof is not complete." } : {}),
    evidenceStatus,
    v2LayoutId: roomStyle.v2LayoutId,
    publicStylePreset: look.values.publicStylePreset,
    worldId: look.values.worldId,
    collectionPresentationId: roomStyle.collectionPresentationId,
  };
});

export const ALL_STUDIO_V3_LOOK_IDS = PRESENCE_LOOK_DEFINITIONS.map((item) => item.id);
export const ALL_STUDIO_V3_ROOM_STYLE_IDS = PRESENCE_ROOM_STYLE_DEFINITIONS.map((item) => item.id);
export const ALL_STUDIO_V3_PIECE_TREATMENT_IDS = PRESENCE_PIECE_TREATMENT_DEFINITIONS.map((item) => item.id);
export const ALL_STUDIO_V3_ATMOSPHERE_IDS = PRESENCE_ATMOSPHERE_DEFINITIONS.map((item) => item.id);
export const ALL_STUDIO_V3_MOTION_BEHAVIOUR_IDS = PRESENCE_MOTION_BEHAVIOUR_DEFINITIONS.map((item) => item.id);
export const ALL_STUDIO_V3_PUBLIC_STYLE_PRESET_IDS = PRESENCE_PUBLIC_PRESET_CANDIDATES.map((item) => item.id);
export const ALL_STUDIO_V3_COLLECTION_PRESENTATION_IDS = ["wall", "selected-sequence", "threshold-feature"] as const;
export const ALL_STUDIO_V3_DENSITY_IDS = ["spacious", "focused", "dense"] as const;
export const ALL_STUDIO_V3_JOURNEY_IDS = ["editorial-browse", "threshold-reveal", "archive-index"] as const;
export const ALL_STUDIO_V3_WORLD_IDS = ["gallery", "zine", "dj", "healing", "market", "archive", "carpenter", "consultant"] as const;
export const PERSISTABLE_STUDIO_V3_ROOM_STYLE_IDS = ["threshold-portal", "gallery-wall", "film-strip-selected-works"] as const satisfies readonly StudioV3RoomStyleId[];
export const PERSISTABLE_STUDIO_V3_PIECE_TREATMENT_IDS = ["quiet-framed", "luminous-depth", "captioned-ledger"] as const satisfies readonly StudioV3PieceTreatment[];
export const PERSISTABLE_STUDIO_V3_ATMOSPHERE_IDS = ["paper-light", "nocturnal-depth", "ledger-scan"] as const satisfies readonly StudioV3Atmosphere[];

export const PRESENCE_OWNER_ACTIVE_PIECE_TREATMENT_DEFINITIONS = PRESENCE_PIECE_TREATMENT_DEFINITIONS.filter((definition) => (
  PERSISTABLE_STUDIO_V3_PIECE_TREATMENT_IDS.includes(definition.id as typeof PERSISTABLE_STUDIO_V3_PIECE_TREATMENT_IDS[number])
));

export const PRESENCE_OWNER_ACTIVE_ATMOSPHERE_DEFINITIONS = PRESENCE_ATMOSPHERE_DEFINITIONS.filter((definition) => (
  PERSISTABLE_STUDIO_V3_ATMOSPHERE_IDS.includes(definition.id as typeof PERSISTABLE_STUDIO_V3_ATMOSPHERE_IDS[number])
));

export function getPresenceLookDefinition(lookId: StudioV3LookId): PresenceLookDefinition {
  return PRESENCE_LOOK_DEFINITIONS.find((item) => item.id === lookId) ?? PRESENCE_LOOK_DEFINITIONS[0];
}

export function getPresenceRoomStyleDefinition(roomStyleId: StudioV3RoomStyleId): PresenceRoomStyleDefinition {
  return PRESENCE_ROOM_STYLE_DEFINITIONS.find((item) => item.id === roomStyleId) ?? PRESENCE_ROOM_STYLE_DEFINITIONS[1];
}

export function getPresencePieceTreatmentDefinition(pieceTreatmentId: StudioV3PieceTreatment): PresencePieceTreatmentDefinition {
  return PRESENCE_PIECE_TREATMENT_DEFINITIONS.find((item) => item.id === pieceTreatmentId) ?? PRESENCE_PIECE_TREATMENT_DEFINITIONS[0];
}

export function getPresenceAtmosphereDefinition(atmosphereId: StudioV3Atmosphere): PresenceAtmosphereDefinition {
  return PRESENCE_ATMOSPHERE_DEFINITIONS.find((item) => item.id === atmosphereId) ?? PRESENCE_ATMOSPHERE_DEFINITIONS[0];
}

export function getPresenceMotionBehaviourDefinition(motionId: StudioV2MotionIntensity): PresenceMotionBehaviourDefinition {
  return PRESENCE_MOTION_BEHAVIOUR_DEFINITIONS.find((item) => item.id === motionId) ?? PRESENCE_MOTION_BEHAVIOUR_DEFINITIONS[0];
}

export function getPresencePublicPresetCandidateDefinition(
  presetId: StudioV2PublicStylePreset,
): PresencePublicPresetCandidateDefinition {
  return PRESENCE_PUBLIC_PRESET_CANDIDATES.find((item) => item.id === presetId) ?? PRESENCE_PUBLIC_PRESET_CANDIDATES[0];
}

const STYLE_CANDIDATE_STATUS_LABELS: Record<PresenceStyleCandidateSupportStatus, string> = {
  flagship: "Flagship candidate",
  supported: "Supported candidate",
  experimental: "Internal review candidate",
  blocked: "Blocked candidate",
  "metadata-only": "Metadata-only candidate",
};

export function getPresenceStyleCandidateReadiness(
  presetId: StudioV2PublicStylePreset,
  options: PresenceStyleGuardrailOptions = {},
): PresenceStyleCandidateReadiness {
  const candidate = getPresencePublicPresetCandidateDefinition(presetId);
  const implied = candidate.impliedLookRoomStylePair;
  const fallbackLookId = candidate.representedByLookId ?? implied?.lookId ?? "soft-editorial";
  const fallbackRoomStyleId = candidate.representedByRoomStyleId ?? implied?.fallbackRoomStyleId ?? implied?.roomStyleId ?? "gallery-wall";
  if (candidate.supportStatus === "metadata-only") {
    return {
      candidate,
      selectableInV3: false,
      status: candidate.supportStatus,
      statusLabel: STYLE_CANDIDATE_STATUS_LABELS[candidate.supportStatus],
      reason: candidate.compatibilityRecommendation,
      warning: "Reference only; missing V3 primitive contracts prevent style selection.",
      fallbackLookId,
      fallbackRoomStyleId,
    };
  }
  if (candidate.supportStatus === "blocked") {
    return {
      candidate,
      selectableInV3: false,
      status: candidate.supportStatus,
      statusLabel: STYLE_CANDIDATE_STATUS_LABELS[candidate.supportStatus],
      reason: candidate.compatibilityRecommendation,
      warning: "Blocked candidates cannot become active V3 style state.",
      fallbackLookId,
      fallbackRoomStyleId,
    };
  }
  if (candidate.supportStatus === "experimental" && !options.allowExperimental) {
    return {
      candidate,
      selectableInV3: false,
      status: candidate.supportStatus,
      statusLabel: STYLE_CANDIDATE_STATUS_LABELS[candidate.supportStatus],
      reason: candidate.compatibilityRecommendation,
      warning: "Experimental candidates require explicit internal review enablement.",
      fallbackLookId,
      fallbackRoomStyleId,
    };
  }
  return {
    candidate,
    selectableInV3: true,
    status: candidate.supportStatus,
    statusLabel: STYLE_CANDIDATE_STATUS_LABELS[candidate.supportStatus],
    reason: candidate.compatibilityRecommendation,
    ...(candidate.supportStatus === "experimental" ? { warning: "Internal/review-only; not launch-ready." } : {}),
    fallbackLookId,
    fallbackRoomStyleId,
  };
}

export function isPresencePublicPresetCandidateMetadataOnly(presetId: StudioV2PublicStylePreset): boolean {
  return getPresencePublicPresetCandidateDefinition(presetId).supportStatus === "metadata-only";
}

export function isPresencePublicPresetCandidateSelectableInV3(
  presetId: StudioV2PublicStylePreset,
  options: PresenceStyleGuardrailOptions = {},
): boolean {
  return getPresenceStyleCandidateReadiness(presetId, options).selectableInV3;
}

export function resolvePresenceLookRoomStyleCompatibility(
  lookId: StudioV3LookId,
  roomStyleId: StudioV3RoomStyleId,
): PresenceLookRoomStyleCompatibilityDefinition {
  const exact = PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY.find((item) => item.lookId === lookId && item.roomStyleId === roomStyleId);
  if (exact) return exact;
  if (!isPresencePersistableRoomStyleId(roomStyleId) || lookId === "brass-inlay") {
    const look = getPresenceLookDefinition(lookId);
    const roomStyle = getPresenceRoomStyleDefinition(roomStyleId);
    return {
      lookId,
      roomStyleId,
      tier: "blocked",
      reason: "No approved Gate 4 M3A compatibility row exists for this private catalog pairing.",
      fallbackRoomStyleId: "gallery-wall",
      ownerWarning: "Private catalog metadata is not owner-selectable until adapter and backend persistence proof are approved.",
      evidenceStatus: "needs-audit",
      v2LayoutId: roomStyle.v2LayoutId,
      publicStylePreset: look.values.publicStylePreset,
      worldId: look.values.worldId,
      collectionPresentationId: roomStyle.collectionPresentationId,
    };
  }
  return PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY.find((item) => item.lookId === "soft-editorial" && item.roomStyleId === roomStyleId)
    ?? PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY[0];
}

export function isPresenceLookRoomStyleCompatible(
  lookId: StudioV3LookId,
  roomStyleId: StudioV3RoomStyleId,
): boolean {
  return getPresenceStylePairingStatus(lookId, roomStyleId, { allowExperimental: true }).selectable;
}

export function presenceLookRoomStyleFallback(
  lookId: StudioV3LookId,
  roomStyleId: StudioV3RoomStyleId,
): StudioV3RoomStyleId {
  const compatibility = resolvePresenceLookRoomStyleCompatibility(lookId, roomStyleId);
  return compatibility.fallbackRoomStyleId ?? roomStyleId;
}

const STYLE_COMPATIBILITY_TIER_LABELS: Record<PresenceStyleCompatibilityTier, string> = {
  flagship: "Flagship pairing",
  supported: "Supported pairing",
  experimental: "Experimental pairing",
  blocked: "Blocked pairing",
};

const STYLE_COMPATIBILITY_TIER_SUMMARIES: Record<PresenceStyleCompatibilityTier, string> = {
  flagship: "Designed for the strongest version of this room.",
  supported: "Safe to use, but not the signature arrangement.",
  experimental: "Available for internal review only.",
  blocked: "Not available because this combination breaks the room experience.",
};

export function presenceStyleCompatibilityTierLabel(tier: PresenceStyleCompatibilityTier): string {
  return STYLE_COMPATIBILITY_TIER_LABELS[tier];
}

export function presenceStyleCompatibilityTierSummary(tier: PresenceStyleCompatibilityTier): string {
  return STYLE_COMPATIBILITY_TIER_SUMMARIES[tier];
}

export function presenceStyleCompatibilityOwnerCopy(
  compatibility: PresenceLookRoomStyleCompatibilityDefinition,
): PresenceStyleCompatibilityOwnerCopy {
  const fallback = compatibility.fallbackRoomStyleId
    ? getPresenceRoomStyleDefinition(compatibility.fallbackRoomStyleId).name
    : undefined;
  return {
    tier: compatibility.tier,
    tierLabel: presenceStyleCompatibilityTierLabel(compatibility.tier),
    tierSummary: presenceStyleCompatibilityTierSummary(compatibility.tier),
    reason: compatibility.reason,
    ...(compatibility.ownerWarning ? { warning: compatibility.ownerWarning } : {}),
    ...(fallback ? { fallbackRoomStyleName: fallback } : {}),
  };
}

export function presenceStylePairingGuardrail(
  compatibility: PresenceLookRoomStyleCompatibilityDefinition,
  options: PresenceStyleGuardrailOptions = {},
): PresenceStyleSelectionStatus {
  const copy = presenceStyleCompatibilityOwnerCopy(compatibility);
  const fallbackRoomStyleId = compatibility.fallbackRoomStyleId ?? compatibility.roomStyleId;
  if (compatibility.tier === "blocked") {
    return {
      selectable: false,
      tier: compatibility.tier,
      label: copy.tierLabel,
      summary: copy.tierSummary,
      reason: compatibility.reason,
      warning: compatibility.ownerWarning ?? "Blocked pairings cannot become active V3 style state.",
      fallbackRoomStyleId,
      preventsSelection: compatibility.tier,
    };
  }
  if (compatibility.tier === "experimental" && !options.allowExperimental) {
    return {
      selectable: false,
      tier: compatibility.tier,
      label: copy.tierLabel,
      summary: copy.tierSummary,
      reason: compatibility.reason,
      warning: compatibility.ownerWarning ?? "Experimental pairings require explicit internal review enablement.",
      fallbackRoomStyleId,
      preventsSelection: compatibility.tier,
    };
  }
  return {
    selectable: true,
    tier: compatibility.tier,
    label: copy.tierLabel,
    summary: copy.tierSummary,
    reason: compatibility.reason,
    ...(compatibility.ownerWarning ? { warning: compatibility.ownerWarning } : {}),
    ...(compatibility.fallbackRoomStyleId ? { fallbackRoomStyleId: compatibility.fallbackRoomStyleId } : {}),
  };
}

export function getPresenceStylePairingStatus(
  lookId: StudioV3LookId,
  roomStyleId: StudioV3RoomStyleId,
  options: PresenceStyleGuardrailOptions = {},
): PresenceStyleSelectionStatus {
  return presenceStylePairingGuardrail(resolvePresenceLookRoomStyleCompatibility(lookId, roomStyleId), options);
}

export function isPresenceStylePairingAllowed(
  lookId: StudioV3LookId,
  roomStyleId: StudioV3RoomStyleId,
  options: PresenceStyleGuardrailOptions = {},
): boolean {
  return getPresenceStylePairingStatus(lookId, roomStyleId, options).selectable;
}

export function getPresenceLookSelectionStatus(
  lookId: StudioV3LookId,
  options: PresenceStyleGuardrailOptions = {},
): PresenceStyleSelectionStatus {
  const look = getPresenceLookDefinition(lookId);
  const candidate = getPresenceStyleCandidateReadiness(look.values.publicStylePreset, options);
  if (!candidate.selectableInV3) {
    return {
      selectable: false,
      tier: candidate.status,
      label: candidate.statusLabel,
      summary: "Reference only; not selectable as active V3 style state.",
      reason: candidate.reason,
      ...(candidate.warning ? { warning: candidate.warning } : {}),
      fallbackRoomStyleId: candidate.fallbackRoomStyleId,
      preventsSelection: candidate.status,
    };
  }
  const pairing = getPresenceStylePairingStatus(look.id, look.recommendedRoomStyleId, options);
  if (!pairing.selectable) return pairing;
  return {
    selectable: true,
    tier: pairing.tier,
    label: pairing.label,
    summary: pairing.summary,
    reason: pairing.reason,
    ...(pairing.warning ? { warning: pairing.warning } : {}),
    ...(pairing.fallbackRoomStyleId ? { fallbackRoomStyleId: pairing.fallbackRoomStyleId } : {}),
  };
}

export function isPresenceLookSelectable(
  lookId: StudioV3LookId,
  options: PresenceStyleGuardrailOptions = {},
): boolean {
  return getPresenceLookSelectionStatus(lookId, options).selectable;
}

export function getPresenceRoomStyleSelectionStatus(
  roomStyleId: StudioV3RoomStyleId,
  options: PresenceStyleGuardrailOptions = {},
): PresenceStyleSelectionStatus {
  const allowedPairing = PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY.find((compatibility) => (
    compatibility.roomStyleId === roomStyleId && presenceStylePairingGuardrail(compatibility, options).selectable
  ));
  if (allowedPairing) {
    const status = presenceStylePairingGuardrail(allowedPairing, options);
    return {
      ...status,
      reason: `Selectable through ${getPresenceLookDefinition(allowedPairing.lookId).name}: ${status.reason}`,
    };
  }
  const fallback = PRESENCE_LOOK_ROOM_STYLE_COMPATIBILITY.find((compatibility) => compatibility.roomStyleId === roomStyleId);
  return {
    selectable: false,
    tier: fallback?.tier ?? "blocked",
    label: fallback ? presenceStyleCompatibilityTierLabel(fallback.tier) : "Blocked pairing",
    summary: fallback ? presenceStyleCompatibilityTierSummary(fallback.tier) : "Not available because this combination breaks the room experience.",
    reason: fallback?.reason ?? "No selectable Look pairing exists for this Room Style.",
    warning: fallback?.ownerWarning ?? "This Room Style is not selectable in normal owner controls.",
    fallbackRoomStyleId: fallback?.fallbackRoomStyleId ?? "gallery-wall",
    preventsSelection: fallback?.tier ?? "blocked",
  };
}

export function isPresenceRoomStyleSelectable(
  roomStyleId: StudioV3RoomStyleId,
  options: PresenceStyleGuardrailOptions = {},
): boolean {
  return getPresenceRoomStyleSelectionStatus(roomStyleId, options).selectable;
}

export function studioV3RoomStyleIdForV2Layout(layoutId: unknown): StudioV3RoomStyleId {
  return PRESENCE_ROOM_STYLE_DEFINITIONS.find((item) => item.v2LayoutId === layoutId)?.id ?? "gallery-wall";
}

export function initialStudioV3LookIdForBridge(input: {
  slug: string;
  publicStylePreset: StudioV2PublicStylePreset;
  worldId: StudioV2WorldId;
}): StudioV3LookId {
  const slug = input.slug.trim().toLowerCase();
  if (slug === "bbbvision" || input.publicStylePreset === "bbbvision-threshold-gallery") return "nocturnal-gallery";
  if (input.worldId === "zine") return "zine-archive";
  return "soft-editorial";
}

export function isStudioV3RoomStyleId(value: unknown): value is StudioV3RoomStyleId {
  return typeof value === "string" && ALL_STUDIO_V3_ROOM_STYLE_IDS.includes(value as StudioV3RoomStyleId);
}

export function isStudioV3LookId(value: unknown): value is StudioV3LookId {
  return typeof value === "string" && ALL_STUDIO_V3_LOOK_IDS.includes(value as StudioV3LookId);
}

export function isStudioV3PieceTreatmentId(value: unknown): value is StudioV3PieceTreatment {
  return typeof value === "string" && ALL_STUDIO_V3_PIECE_TREATMENT_IDS.includes(value as StudioV3PieceTreatment);
}

export function isStudioV3AtmosphereId(value: unknown): value is StudioV3Atmosphere {
  return typeof value === "string" && ALL_STUDIO_V3_ATMOSPHERE_IDS.includes(value as StudioV3Atmosphere);
}

export function isPresencePersistableRoomStyleId(value: unknown): value is StudioV3RoomStyleId {
  return typeof value === "string" && PERSISTABLE_STUDIO_V3_ROOM_STYLE_IDS.includes(value as typeof PERSISTABLE_STUDIO_V3_ROOM_STYLE_IDS[number]);
}

export function isPresencePersistablePieceTreatmentId(value: unknown): value is StudioV3PieceTreatment {
  return typeof value === "string" && PERSISTABLE_STUDIO_V3_PIECE_TREATMENT_IDS.includes(value as typeof PERSISTABLE_STUDIO_V3_PIECE_TREATMENT_IDS[number]);
}

export function isPresencePersistableAtmosphereId(value: unknown): value is StudioV3Atmosphere {
  return typeof value === "string" && PERSISTABLE_STUDIO_V3_ATMOSPHERE_IDS.includes(value as typeof PERSISTABLE_STUDIO_V3_ATMOSPHERE_IDS[number]);
}

export function isStudioV3MotionBehaviourId(value: unknown): value is StudioV2MotionIntensity {
  return typeof value === "string" && ALL_STUDIO_V3_MOTION_BEHAVIOUR_IDS.includes(value as StudioV2MotionIntensity);
}

export function isStudioV3PublicStylePresetId(value: unknown): value is StudioV2PublicStylePreset {
  return typeof value === "string" && ALL_STUDIO_V3_PUBLIC_STYLE_PRESET_IDS.includes(value as StudioV2PublicStylePreset);
}

export function isStudioV3CollectionPresentationId(value: unknown): value is StudioV3CollectionPresentationId {
  return typeof value === "string" && ALL_STUDIO_V3_COLLECTION_PRESENTATION_IDS.includes(value as StudioV3CollectionPresentationId);
}

export function isStudioV3DensityId(value: unknown): value is StudioV3Density {
  return typeof value === "string" && ALL_STUDIO_V3_DENSITY_IDS.includes(value as StudioV3Density);
}

export function isStudioV3JourneyId(value: unknown): value is StudioV3Journey {
  return typeof value === "string" && ALL_STUDIO_V3_JOURNEY_IDS.includes(value as StudioV3Journey);
}

export function isStudioV3WorldId(value: unknown): value is StudioV2WorldId {
  return typeof value === "string" && ALL_STUDIO_V3_WORLD_IDS.includes(value as StudioV2WorldId);
}

export function lookValuesWithSurface(
  atmosphereId: StudioV3Atmosphere,
): Pick<StudioV3LookValues, "background" | "texture" | "atmosphere"> {
  return getPresenceAtmosphereDefinition(atmosphereId).surfaceValue;
}

export function lookValuesWithPieceTreatment(
  pieceTreatmentId: StudioV3PieceTreatment,
): Pick<StudioV3LookValues, "pieceTreatment"> {
  return { pieceTreatment: pieceTreatmentId };
}

export function lookValuesWithMotion(
  motionId: StudioV2MotionIntensity,
): Pick<StudioV3LookValues, "motionIntensity"> {
  return { motionIntensity: motionId };
}

export type PresenceTypographyFacetId = "editorial" | "signal" | "archive";

export const PRESENCE_TYPOGRAPHY_FACET_DEFINITIONS = [
  {
    id: "editorial",
    label: "Editorial",
    description: "Quiet weight, hairline action.",
    value: { headingWeight: 600, borderStyle: "hairline" as StudioV2BorderStyle },
    preview: { background: "#fffaf0", color: "#15120f" },
  },
  {
    id: "signal",
    label: "Signal",
    description: "Strong heading, framed action.",
    value: { headingWeight: 800, borderStyle: "framed" as StudioV2BorderStyle },
    preview: { background: "#17120a", color: "#f3c85d" },
  },
  {
    id: "archive",
    label: "Archive",
    description: "Ledger edge, indexed weight.",
    value: { headingWeight: 700, borderStyle: "ledger" as StudioV2BorderStyle },
    preview: { background: "#ead7a6", color: "#2b1118" },
  },
] as const;
