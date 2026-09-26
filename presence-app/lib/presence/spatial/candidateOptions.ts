import type {
  SpatialAnchorDefinition,
  SpatialAnchorKind,
  SpatialComponentDefinition,
  SpatialMaterialPresetId,
  SpatialMaterialSlotId,
  SpatialPlacement,
  SpatialPrimitiveKind,
} from "./model.ts";

export type CandidateReviewStatus = "candidate-review-required" | "candidate-cleared-for-internal-use";
export type CandidatePayloadStatus = "within-budget" | "over-budget";
export type CandidateRuntimeAssetStatus = "public-runtime-glb" | "candidate-runtime-asset" | "manifest-only";
export type CandidateUsability = "selectable-internal" | "deferred-internal" | "disabled";
export type CandidateRenderMode = "draco-visual-geometry" | "proxy-preview";

export interface CandidateRoomKitOption {
  roomKitId: string;
  version: string;
  sourceAssetId: string;
  sourceName: string;
  category: string;
  status: CandidateReviewStatus;
  thumbnail: string;
  dimensions: readonly [number, number, number];
  runtimeAsset: string;
  runtimeSizeKb: number;
  runtimeAssetStatus: CandidateRuntimeAssetStatus;
  payloadStatus: CandidatePayloadStatus;
  clearanceStatus: "needs-review";
  usability: CandidateUsability;
  disabledReasons: readonly string[];
  warningFlags: readonly string[];
  statusLabels: readonly string[];
}

export interface CandidateComponentOption {
  componentId: string;
  version: string;
  sourceCandidateVersion: string;
  sourceAssetId: string;
  observedAs: string;
  role: string;
  group: string;
  categoryGuess: string;
  thumbnail: string;
  dimensions: readonly [number, number, number];
  runtimeAsset: string;
  runtimeSizeKb: number;
  runtimeAssetStatus: CandidateRuntimeAssetStatus;
  payloadStatus: CandidatePayloadStatus;
  reviewStatus: CandidateReviewStatus;
  clearanceStatus: "internal-use-owner-declared";
  usability: CandidateUsability;
  disabledReasons: readonly string[];
  placementType: "floor" | "surface" | "wall";
  anchorKind: "floor" | "wall" | "free";
  materialSlots: readonly string[];
  presenceMaterialSlots: readonly SpatialMaterialSlotId[];
  anchors: readonly string[];
  anchorDefinitions: readonly CandidateAnchorDefinition[];
  warningFlags: readonly string[];
  statusLabels: readonly string[];
  renderMode: CandidateRenderMode;
  materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
}

interface CandidateAnchorDefinition {
  id: string;
  type: "surface" | "display";
  position: readonly [number, number, number];
}

const CANDIDATE_COMPONENT_VERSION = "1.0.0";
const DRACO_DECODER_SIZE_KB = 244.99609375;

export const CANDIDATE_ROOM_KIT_OPTIONS = [
  roomKit({
    roomKitId: "candidate.roomkit.boutique-0ae2",
    sourceAssetId: "source.coffee-shop-gld-coffee-shop",
    sourceName: "coffee-shop-gld-coffee-shop",
    category: "boutique",
    dimensions: [20.9151, 5.2193, 11.938],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.boutique-0ae2.glb",
    runtimeSizeKb: 8538.7,
    payloadStatus: "over-budget",
    warningFlags: ["duplicates-collapsed", "export-cap-reached"],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.living-room-06d0",
    sourceAssetId: "source.living-room-interior-free",
    sourceName: "living-room-interior-free",
    category: "living-room",
    dimensions: [37.8143, 25.1166, 55.7247],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.living-room-06d0.glb",
    runtimeSizeKb: 1475.9,
    payloadStatus: "within-budget",
    warningFlags: ["duplicates-collapsed", "scale-check-required"],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.living-room-c197",
    sourceAssetId: "source.the-great-drawing-room",
    sourceName: "the-great-drawing-room",
    category: "living-room",
    dimensions: [14.2918, 5.7097, 13.994],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.living-room-c197.glb",
    runtimeSizeKb: 6225.3,
    payloadStatus: "over-budget",
    warningFlags: [],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.unknown-interior-3bc1",
    sourceAssetId: "source.interior-7",
    sourceName: "interior-7",
    category: "unknown-interior",
    dimensions: [26.3202, 10.9458, 26.0336],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-3bc1.glb",
    runtimeSizeKb: 2794,
    payloadStatus: "within-budget",
    warningFlags: ["duplicates-collapsed"],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.unknown-interior-a5e1",
    sourceAssetId: "source.urban-interior-moody-vr-room-baked-source-untitled",
    sourceName: "urban-interior-moody-vr-room-baked-source-untitled",
    category: "unknown-interior",
    dimensions: [53.7249, 12.2922, 12.4029],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-a5e1.glb",
    runtimeSizeKb: 159.3,
    payloadStatus: "within-budget",
    warningFlags: ["scale-check-required"],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.unknown-interior-b562",
    sourceAssetId: "source.star-wars-the-clone-wars-venator-prefab",
    sourceName: "star-wars-the-clone-wars-venator-prefab",
    category: "unknown-interior",
    dimensions: [31.1588, 2.7532, 15.7479],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-b562.glb",
    runtimeSizeKb: 2097.2,
    payloadStatus: "within-budget",
    warningFlags: ["duplicates-collapsed"],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.unknown-interior-ffd7",
    sourceAssetId: "source.old-church-modeling-interior-scene",
    sourceName: "old-church-modeling-interior-scene",
    category: "unknown-interior",
    dimensions: [40.4179, 21.445, 23.3469],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.unknown-interior-ffd7.glb",
    runtimeSizeKb: 3819.2,
    payloadStatus: "over-budget",
    warningFlags: ["duplicates-collapsed", "scale-check-required"],
  }),
  roomKit({
    roomKitId: "candidate.roomkit.warehouse-17b3",
    sourceAssetId: "source.brutalist-interior-vr-room-baked-source-untitled",
    sourceName: "brutalist-interior-vr-room-baked-source-untitled",
    category: "warehouse",
    dimensions: [10.7, 4.2229, 6.7854],
    runtimeAsset: "assets/presence-spatial/candidates/roomkits/candidate.roomkit.warehouse-17b3.glb",
    runtimeSizeKb: 668.2,
    payloadStatus: "within-budget",
    warningFlags: [],
  }),
] as const satisfies readonly CandidateRoomKitOption[];

export const CANDIDATE_COMPONENT_OPTIONS = [
  component({
    componentId: "candidate.table.old-church-modeling-interior-sce-ffd7-017",
    sourceAssetId: "source.old-church-modeling-interior-scene",
    role: "display-island",
    observedAs: "Clean rectangular stone slab on a recessed stepped base; reads as a sculptural plinth, not a table",
    group: "display",
    categoryGuess: "table",
    dimensions: [1.5713, 0.7784, 2.5598],
    runtimeAsset: "assets/presence-spatial/candidates/components/candidate.table.old-church-modeling-interior-sce-ffd7-017.glb",
    runtimeSizeKb: 7.8,
    materialSlots: ["top", "legs", "base"],
    presenceMaterialSlots: ["tabletop", "rack-metal"],
    placementType: "floor",
    renderMode: "draco-visual-geometry",
    anchorDefinitions: standardCandidateAnchors(0.778, 1.28, 0.786),
    warningFlags: [],
  }),
  component({
    componentId: "candidate.chair.interior-7-3bc1-013",
    sourceAssetId: "source.interior-7",
    role: "product-riser",
    observedAs: "Three stacked chunky sculptural blocks forming a stepped riser; not a chair",
    group: "display",
    categoryGuess: "chair",
    dimensions: [0.3508, 0.4931, 0.4219],
    runtimeAsset: "assets/presence-spatial/candidates/components/candidate.chair.interior-7-3bc1-013.glb",
    runtimeSizeKb: 11.6,
    materialSlots: ["frame", "fabric", "legs"],
    presenceMaterialSlots: ["rack-metal", "fabric"],
    placementType: "floor",
    renderMode: "proxy-preview",
    anchorDefinitions: standardCandidateAnchors(0.493, 0.211, 0.175),
    warningFlags: ["needs-3d-review", "needs-scale-review"],
  }),
  component({
    componentId: "candidate.decorative-prop.interior-7-3bc1-009",
    sourceAssetId: "source.interior-7",
    role: "showroom-seating",
    observedAs: "Wire-frame tub armchair with a thin seat pad",
    group: "furniture",
    categoryGuess: "decorative-prop",
    dimensions: [0.3848, 0.323, 0.3844],
    runtimeAsset: "assets/presence-spatial/candidates/components/candidate.decorative-prop.interior-7-3bc1-009.glb",
    runtimeSizeKb: 51.8,
    materialSlots: ["primary", "secondary", "accent"],
    presenceMaterialSlots: ["wall", "floor", "logo-accent"],
    placementType: "surface",
    renderMode: "proxy-preview",
    anchorDefinitions: standardCandidateAnchors(0.323, 0.192, 0.192),
    warningFlags: ["needs-3d-review", "needs-scale-review"],
  }),
  component({
    componentId: "candidate.chair.interior-7-3bc1-000",
    sourceAssetId: "source.interior-7",
    role: "display-lighting-fixture",
    observedAs: "Studio light head on a collapsible tripod stand; a lighting fixture, not a chair",
    group: "lighting",
    categoryGuess: "chair",
    dimensions: [0.4114, 0.857, 0.4266],
    runtimeAsset: "assets/presence-spatial/candidates/components/candidate.chair.interior-7-3bc1-000.glb",
    runtimeSizeKb: 323.8,
    materialSlots: ["frame", "fabric", "legs"],
    presenceMaterialSlots: ["rack-metal", "fabric"],
    placementType: "floor",
    renderMode: "proxy-preview",
    anchorDefinitions: standardCandidateAnchors(0.857, 0.213, 0.206),
    warningFlags: ["needs-3d-review", "needs-scale-review"],
  }),
  component({
    componentId: "candidate.shelf.retopo-g-555780-0ae2-013",
    sourceAssetId: "source.coffee-shop-gld-coffee-shop",
    role: "soft-division-drape",
    observedAs: "Full-height gathered fabric curtain / drape; not a shelf",
    group: "soft-architecture",
    categoryGuess: "shelf",
    dimensions: [0.2888, 2.0739, 1.1302],
    runtimeAsset: "assets/presence-spatial/candidates/components/candidate.shelf.retopo-g-555780-0ae2-013.glb",
    runtimeSizeKb: 127,
    materialSlots: ["wood", "frame", "base"],
    presenceMaterialSlots: ["tabletop", "rack-metal"],
    placementType: "floor",
    renderMode: "proxy-preview",
    anchorDefinitions: standardCandidateAnchors(2.074, 0.565, 0.144),
    warningFlags: [],
  }),
] as const satisfies readonly CandidateComponentOption[];

export const CANDIDATE_ARRANGER_COMPONENT_OPTIONS = CANDIDATE_COMPONENT_OPTIONS
  .filter((option) => option.usability === "selectable-internal")
  .map((option) => ({
    componentId: option.componentId,
    version: option.version,
    label: option.role,
    anchorKind: option.anchorKind,
    materialSlotOverrides: option.materialSlotOverrides,
  })) satisfies readonly {
    componentId: string;
    version: string;
    label: string;
    anchorKind: "floor" | "wall" | "free";
    materialSlotOverrides: SpatialPlacement["materialSlotOverrides"];
  }[];

export const CANDIDATE_COMPONENT_DEFINITIONS: readonly SpatialComponentDefinition[] = CANDIDATE_COMPONENT_OPTIONS
  .filter((option) => option.usability === "selectable-internal")
  .map((option) => ({
    componentId: option.componentId,
    version: option.version,
    label: `Candidate ${option.role}`,
    category: candidateComponentCategory(option),
    dimensions: {
      width: option.dimensions[0],
      height: option.dimensions[1],
      depth: option.dimensions[2],
    },
    geometry: { kind: "primitive", primitive: primitiveForCandidate(option) },
    ...(option.renderMode === "draco-visual-geometry" ? {
      renderGeometry: {
        kind: "glb" as const,
        url: `/${option.runtimeAsset.replace(/^assets\//, "")}`,
        compression: "draco" as const,
        decoderPath: "/presence-spatial/draco/gltf/",
        fallbackPrimitive: primitiveForCandidate(option),
        runtimeSizeKb: option.runtimeSizeKb,
        decoderSizeKb: DRACO_DECODER_SIZE_KB,
      },
    } : {}),
    placement: {
      allowedAnchorKinds: [option.anchorKind],
      collision: option.role.includes("lighting") ? "overlap-allowed" : "solid",
      requiresParent: false,
      blocksCameraPath: !option.role.includes("lighting"),
      floorClearance: 0,
    },
    anchors: option.anchorDefinitions.map(toSpatialAnchorDefinition),
    materialSlots: option.presenceMaterialSlots,
    license: {
      licenseId: "presence-internal-use-candidate-asset-v1",
      sourceKind: "third-party",
      source: "presence-spatial-candidate-internal-use",
      attribution: "Optimized candidate asset cleared for internal runtime proof only; not admitted",
      internalOnly: true,
    },
    runtime: {
      compressedBytes: option.renderMode === "draco-visual-geometry"
        ? Math.ceil(option.runtimeSizeKb * 1024)
        : 0,
      sourceBytes: option.renderMode === "draco-visual-geometry"
        ? Math.ceil(option.runtimeSizeKb * 1024)
        : 0,
      eager: false,
      performanceTier: option.runtimeSizeKb > 128 ? "enhanced" : "core",
    },
    mobileFallback: {
      strategy: "semantic-only",
      note: option.renderMode === "draco-visual-geometry"
        ? "Use proxy component and semantic rows if GLB, Draco or WebGL is unavailable."
        : "Use proxy component and semantic rows while the candidate GLB remains deferred.",
    },
  }));

export function candidateComponentGroups(): readonly { group: string; options: readonly CandidateComponentOption[] }[] {
  const groups = new Map<string, CandidateComponentOption[]>();
  for (const option of CANDIDATE_COMPONENT_OPTIONS) {
    const entries = groups.get(option.group) ?? [];
    entries.push(option);
    groups.set(option.group, entries);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([group, options]) => ({ group, options }));
}

function roomKit(input: Omit<CandidateRoomKitOption, "version" | "status" | "thumbnail" | "runtimeAssetStatus" | "clearanceStatus" | "usability" | "disabledReasons" | "statusLabels">): CandidateRoomKitOption {
  const disabledReasons = [
    "room kit only",
    "needs 3D review",
    "needs licence review",
    "not selectable as component",
    ...(input.payloadStatus === "over-budget" ? ["over-budget"] : []),
    ...(input.warningFlags.includes("scale-check-required") ? ["needs scale review"] : []),
    "runtime GLB not copied to public candidate runtime path",
  ];
  return {
    ...input,
    version: "0.1.0",
    status: "candidate-review-required",
    thumbnail: `assets/presence-spatial/candidates/thumbnails/${input.roomKitId}.webp`,
    runtimeAssetStatus: "candidate-runtime-asset",
    clearanceStatus: "needs-review",
    usability: input.payloadStatus === "over-budget" ? "disabled" : "deferred-internal",
    disabledReasons,
    statusLabels: [
      "candidate",
      "candidate-review-required",
      "not admitted",
      "not production-ready",
      "room kit only",
      ...(input.payloadStatus === "over-budget" ? ["over-budget"] : ["deferred"]),
    ],
  };
}

function component(input: Omit<CandidateComponentOption, "version" | "sourceCandidateVersion" | "thumbnail" | "runtimeAssetStatus" | "payloadStatus" | "reviewStatus" | "clearanceStatus" | "usability" | "disabledReasons" | "anchorKind" | "anchors" | "statusLabels" | "materialSlotOverrides">): CandidateComponentOption {
  const anchorKind = input.placementType === "wall" ? "wall" : "floor";
  const runtimeAssetStatus = input.renderMode === "draco-visual-geometry"
    ? "public-runtime-glb"
    : "candidate-runtime-asset";
  const disabledReasons = input.warningFlags;
  return {
    ...input,
    version: CANDIDATE_COMPONENT_VERSION,
    sourceCandidateVersion: "0.1.0",
    thumbnail: `assets/presence-spatial/candidates/thumbnails/${input.componentId}.webp`,
    runtimeAssetStatus,
    payloadStatus: "within-budget",
    reviewStatus: "candidate-cleared-for-internal-use",
    clearanceStatus: "internal-use-owner-declared",
    usability: "selectable-internal",
    disabledReasons,
    anchorKind,
    anchors: input.anchorDefinitions.map((anchor) => anchor.id),
    statusLabels: [
      "candidate",
      "candidate-cleared-for-internal-use",
      "internal-use only",
      "not admitted",
      "not production-ready",
      input.renderMode === "draco-visual-geometry" ? "Draco visual geometry" : "proxy preview",
      ...(input.warningFlags.includes("needs-3d-review") ? ["needs 3D review"] : []),
      ...(input.warningFlags.includes("needs-scale-review") ? ["needs scale review"] : []),
    ],
    materialSlotOverrides: Object.fromEntries(
      input.presenceMaterialSlots.map((slot) => [slot, defaultMaterialPresetForSlot(slot)]),
    ) as SpatialPlacement["materialSlotOverrides"],
  };
}

function standardCandidateAnchors(
  top: number,
  halfDepth: number,
  halfWidth: number,
): readonly CandidateAnchorDefinition[] {
  const mid = top / 2;
  return [
    { id: "top-center", type: "surface", position: [0, top, 0] },
    { id: "front-center", type: "display", position: [0, mid, halfDepth] },
    { id: "back-center", type: "display", position: [0, mid, -halfDepth] },
    { id: "left-center", type: "display", position: [-halfWidth, mid, 0] },
    { id: "right-center", type: "display", position: [halfWidth, mid, 0] },
    { id: "surface-top", type: "surface", position: [0, top, 0] },
  ];
}

function toSpatialAnchorDefinition(anchor: CandidateAnchorDefinition): SpatialAnchorDefinition {
  const kind: SpatialAnchorKind = anchor.type === "surface" ? "surface" : "wall";
  return {
    id: anchor.id,
    kind,
    transform: { position: anchor.position, rotation: [0, 0, 0], scale: [1, 1, 1] },
    accepts: ["piece"],
    capacity: 1,
  };
}

function candidateComponentCategory(option: CandidateComponentOption): SpatialComponentDefinition["category"] {
  if (option.role.includes("lighting")) return "light";
  if (option.role.includes("drape")) return "wall";
  return "surface";
}

function primitiveForCandidate(option: CandidateComponentOption): SpatialPrimitiveKind {
  if (option.role.includes("lighting")) return "light-fixture";
  if (option.role.includes("drape")) return "drape-divider";
  if (option.role.includes("island")) return "product-block";
  return "product-block";
}

function defaultMaterialPresetForSlot(slot: SpatialMaterialSlotId): SpatialMaterialPresetId {
  const presets: Record<SpatialMaterialSlotId, SpatialMaterialPresetId> = {
    wall: "wall-charcoal",
    floor: "floor-dark-stone",
    tabletop: "tabletop-warm-stone",
    "rack-metal": "rack-matte-black",
    fabric: "fabric-neutral",
    paper: "paper-uncoated",
    projection: "projection-emissive",
    "poster-decal": "poster-satin",
    "logo-accent": "accent-signal",
  };
  return presets[slot];
}
