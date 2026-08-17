import type {
  SpatialMaterialPresetId,
  SpatialMaterialStylePresetId,
  SpatialMaterialSlotId,
  SpatialResolvedMaterial,
  SpatialSkinRef,
} from "./model.ts";

export interface SpatialMaterialPreset {
  id: SpatialMaterialPresetId;
  slot: SpatialMaterialSlotId;
  label: string;
  baseColor: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface SpatialMaterialStylePreset {
  id: SpatialMaterialStylePresetId;
  label: string;
  description: string;
  slotPresets: Readonly<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>;
}

export const SPATIAL_MATERIAL_SLOTS = [
  "wall",
  "floor",
  "tabletop",
  "rack-metal",
  "fabric",
  "paper",
  "projection",
  "poster-decal",
  "logo-accent",
] as const satisfies readonly SpatialMaterialSlotId[];

export const SPATIAL_MATERIAL_PRESETS: Readonly<Record<SpatialMaterialPresetId, SpatialMaterialPreset>> = {
  "wall-plaster": { id: "wall-plaster", slot: "wall", label: "Warm plaster", baseColor: "#c9c4b8", roughness: 0.88, metalness: 0.01 },
  "wall-charcoal": { id: "wall-charcoal", slot: "wall", label: "Charcoal wall", baseColor: "#111214", roughness: 0.76, metalness: 0.05 },
  "wall-gallery-white": { id: "wall-gallery-white", slot: "wall", label: "Gallery white", baseColor: "#f0efe9", roughness: 0.82, metalness: 0.01 },
  "wall-soft-paper": { id: "wall-soft-paper", slot: "wall", label: "Soft paper wall", baseColor: "#ddd5c8", roughness: 0.94, metalness: 0 },
  "wall-industrial-concrete": { id: "wall-industrial-concrete", slot: "wall", label: "Industrial concrete wall", baseColor: "#73736f", roughness: 0.9, metalness: 0.02 },
  "wall-projection-blackout": { id: "wall-projection-blackout", slot: "wall", label: "Projection blackout wall", baseColor: "#08090a", roughness: 0.98, metalness: 0 },
  "floor-dark-stone": { id: "floor-dark-stone", slot: "floor", label: "Dark stone floor", baseColor: "#17181a", roughness: 0.36, metalness: 0.16 },
  "floor-gallery-white": { id: "floor-gallery-white", slot: "floor", label: "Gallery white floor", baseColor: "#d8d8d3", roughness: 0.45, metalness: 0.04 },
  "floor-polished-charcoal": { id: "floor-polished-charcoal", slot: "floor", label: "Polished charcoal tile", baseColor: "#252629", roughness: 0.22, metalness: 0.18 },
  "floor-warm-timber": { id: "floor-warm-timber", slot: "floor", label: "Warm timber floor", baseColor: "#7e5839", roughness: 0.58, metalness: 0 },
  "tabletop-warm-stone": { id: "tabletop-warm-stone", slot: "tabletop", label: "Warm stone surface", baseColor: "#bdb7aa", roughness: 0.58, metalness: 0.02 },
  "tabletop-gallery-white": { id: "tabletop-gallery-white", slot: "tabletop", label: "Gallery white surface", baseColor: "#e7e5de", roughness: 0.56, metalness: 0.02 },
  "tabletop-industrial-concrete": { id: "tabletop-industrial-concrete", slot: "tabletop", label: "Industrial concrete surface", baseColor: "#686966", roughness: 0.82, metalness: 0.03 },
  "tabletop-warm-timber": { id: "tabletop-warm-timber", slot: "tabletop", label: "Warm timber surface", baseColor: "#956a45", roughness: 0.54, metalness: 0 },
  "rack-matte-black": { id: "rack-matte-black", slot: "rack-metal", label: "Matte black metal", baseColor: "#101114", roughness: 0.32, metalness: 0.86 },
  "rack-boutique-chrome": { id: "rack-boutique-chrome", slot: "rack-metal", label: "Boutique chrome", baseColor: "#c5c9ca", roughness: 0.16, metalness: 0.96 },
  "fabric-neutral": { id: "fabric-neutral", slot: "fabric", label: "Neutral fabric", baseColor: "#6b6258", roughness: 0.9, metalness: 0 },
  "fabric-nocturnal": { id: "fabric-nocturnal", slot: "fabric", label: "Nocturnal fabric", baseColor: "#1c1b1f", roughness: 0.94, metalness: 0 },
  "paper-uncoated": { id: "paper-uncoated", slot: "paper", label: "Uncoated paper", baseColor: "#e6e0d4", roughness: 0.96, metalness: 0 },
  "paper-archive": { id: "paper-archive", slot: "paper", label: "Archive paper", baseColor: "#c8b996", roughness: 0.98, metalness: 0 },
  "projection-emissive": { id: "projection-emissive", slot: "projection", label: "Projection light", baseColor: "#f6f2df", roughness: 0.18, metalness: 0, emissive: "#fff5c2", emissiveIntensity: 1.8 },
  "projection-blackout": { id: "projection-blackout", slot: "projection", label: "Blackout projection field", baseColor: "#050506", roughness: 0.08, metalness: 0, emissive: "#d7ddff", emissiveIntensity: 0.35 },
  "poster-satin": { id: "poster-satin", slot: "poster-decal", label: "Satin poster", baseColor: "#d8d3c8", roughness: 0.48, metalness: 0 },
  "poster-archive": { id: "poster-archive", slot: "poster-decal", label: "Archive poster stock", baseColor: "#b9a984", roughness: 0.9, metalness: 0 },
  "accent-signal": { id: "accent-signal", slot: "logo-accent", label: "Signal accent", baseColor: "#f2c52e", roughness: 0.4, metalness: 0.08, emissive: "#8c260f", emissiveIntensity: 0.2 },
};

export const DEFAULT_PRESET_BY_SLOT: Readonly<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>> = {
  wall: "wall-plaster",
  floor: "floor-dark-stone",
  tabletop: "tabletop-warm-stone",
  "rack-metal": "rack-matte-black",
  fabric: "fabric-neutral",
  paper: "paper-uncoated",
  projection: "projection-emissive",
  "poster-decal": "poster-satin",
  "logo-accent": "accent-signal",
};

const styleSlots = (
  overrides: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>,
): Readonly<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>> => ({
  ...DEFAULT_PRESET_BY_SLOT,
  ...overrides,
});

export const SPATIAL_MATERIAL_STYLE_PRESETS: Readonly<Record<SpatialMaterialStylePresetId, SpatialMaterialStylePreset>> = {
  "white-gallery": {
    id: "white-gallery",
    label: "White gallery",
    description: "Quiet white architecture with neutral exhibition surfaces.",
    slotPresets: styleSlots({ wall: "wall-gallery-white", floor: "floor-gallery-white", tabletop: "tabletop-gallery-white" }),
  },
  "nocturnal-black-gallery": {
    id: "nocturnal-black-gallery",
    label: "Nocturnal black gallery",
    description: "Low-reflectance gallery architecture with dark textile support.",
    slotPresets: styleSlots({ wall: "wall-charcoal", floor: "floor-dark-stone", fabric: "fabric-nocturnal" }),
  },
  "soft-paper-room": {
    id: "soft-paper-room",
    label: "Soft paper room",
    description: "Warm, tactile paper-led room treatment for editorial work.",
    slotPresets: styleSlots({ wall: "wall-soft-paper", paper: "paper-uncoated", "poster-decal": "poster-archive" }),
  },
  "industrial-concrete": {
    id: "industrial-concrete",
    label: "Industrial concrete",
    description: "Concrete walls and surfaces balanced by dark metal fixtures.",
    slotPresets: styleSlots({ wall: "wall-industrial-concrete", floor: "floor-polished-charcoal", tabletop: "tabletop-industrial-concrete" }),
  },
  "polished-charcoal-tile": {
    id: "polished-charcoal-tile",
    label: "Polished charcoal tile",
    description: "Charcoal tiled floor with restrained dark architecture.",
    slotPresets: styleSlots({ wall: "wall-charcoal", floor: "floor-polished-charcoal" }),
  },
  "warm-timber-studio": {
    id: "warm-timber-studio",
    label: "Warm timber studio",
    description: "Timber floor and work surfaces for a warmer studio character.",
    slotPresets: styleSlots({ floor: "floor-warm-timber", tabletop: "tabletop-warm-timber" }),
  },
  "archive-paper": {
    id: "archive-paper",
    label: "Archive paper",
    description: "Low-glare paper and poster stocks for archival material.",
    slotPresets: styleSlots({ wall: "wall-soft-paper", paper: "paper-archive", "poster-decal": "poster-archive" }),
  },
  "boutique-chrome": {
    id: "boutique-chrome",
    label: "Boutique chrome",
    description: "Polished chrome retail fixtures over dark stone.",
    slotPresets: styleSlots({ floor: "floor-dark-stone", "rack-metal": "rack-boutique-chrome", tabletop: "tabletop-warm-stone" }),
  },
  "projection-blackout": {
    id: "projection-blackout",
    label: "Projection blackout",
    description: "Blackout architecture with a bounded emissive projection field.",
    slotPresets: styleSlots({ wall: "wall-projection-blackout", floor: "floor-dark-stone", projection: "projection-blackout", fabric: "fabric-nocturnal" }),
  },
};

export const SPATIAL_MATERIAL_STYLES = SPATIAL_MATERIAL_STYLE_PRESETS;

export function materialPresetMatchesSlot(slot: SpatialMaterialSlotId, presetId: SpatialMaterialPresetId): boolean {
  return SPATIAL_MATERIAL_PRESETS[presetId]?.slot === slot;
}

export function resolveSpatialMaterials(input: {
  slots: readonly SpatialMaterialSlotId[];
  skin?: SpatialSkinRef;
  overrides: Partial<Record<SpatialMaterialSlotId, SpatialMaterialPresetId>>;
}): SpatialResolvedMaterial[] {
  return input.slots.map((slot) => {
    const presetId = input.overrides[slot] ?? input.skin?.materialPresets[slot] ?? DEFAULT_PRESET_BY_SLOT[slot];
    return {
      slot,
      presetId,
      color: input.skin?.colors[slot],
    };
  });
}
