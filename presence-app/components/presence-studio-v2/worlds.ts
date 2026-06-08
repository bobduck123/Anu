import type { StudioV2PublicStylePreset, StudioV2WorldId } from "@/lib/presence/studio-v2";

export interface WorldKit {
  id: StudioV2WorldId;
  name: string;
  surface: string;
  verb: string;
  feel: string;
}

export const WORLD_KITS: WorldKit[] = [
  { id: "gallery", name: "Gallery Wall", surface: "Exhibition wall / release archive", verb: "The room recedes", feel: "Museum-quiet, editorial, delicate" },
  { id: "zine", name: "Zine Board", surface: "Bedroom wall / gig board", verb: "The room shouts", feel: "DIY, chaotic, alive, loud" },
  { id: "dj", name: "DJ Booth", surface: "Club booth / dark stage", verb: "The room pulses", feel: "Club, nocturnal, vibrant, dense" },
  { id: "healing", name: "Healing Altar", surface: "Soft chamber / care altar", verb: "The room holds", feel: "Calm, held, slow breath, sanctuary" },
  { id: "market", name: "Market Stall", surface: "Table of offerings / order board", verb: "The room sells", feel: "Bazaar, abundant, warm, direct" },
  { id: "archive", name: "Evidence Archive", surface: "Filing cabinet / public proof room", verb: "The room documents", feel: "Documentary, organised, evidential, civic" },
  { id: "carpenter", name: "Carpenter Workbench", surface: "Workshop bench / proof wall", verb: "The room proves", feel: "Sturdy, raw, proof-first, tradesman" },
  { id: "consultant", name: "Consultant Desk", surface: "Advisory desk / memorandum stack", verb: "The room presents", feel: "Professional, precise, calm, partner-desk authority" },
];

export interface PublicStylePresetOption {
  id: StudioV2PublicStylePreset;
  label: string;
  description: string;
}

export const PUBLIC_STYLE_PRESET_OPTIONS: PublicStylePresetOption[] = [
  {
    id: "gallery-p2",
    label: "Gallery P2",
    description: "Quiet gallery threshold, chamber placards, wall labels, and public-safe artwork focus.",
  },
  {
    id: "christina-liquid-gallery",
    label: "Christina / Liquid Gallery",
    description: "Selected-works sequence, minimal art-site chrome, liquid atmosphere, and practice pathway.",
  },
  {
    id: "bbbvision-threshold-gallery",
    label: "bbb.vision / Threshold Gallery",
    description: "Image ritual threshold, enter transition, black-and-gold gallery field, and restrained image focus.",
  },
];

export const SKIN_CONTROLS = [
  { id: "background", label: "Background", type: "swatch" as const, cat: "ground" },
  { id: "texture", label: "Texture", type: "choice" as const, options: ["none", "paper", "grain", "scan", "linen", "timber", "ledger"], cat: "ground" },
  { id: "auraIntensity", label: "Aura Intensity", type: "slider" as const, min: 0, max: 100, cat: "atmosphere" },
  { id: "motionIntensity", label: "Motion", type: "choice" as const, options: ["still", "gentle", "living"], cat: "atmosphere" },
  { id: "displayFont", label: "Display Type", type: "choice" as const, options: ["system", "serif", "mono", "handwritten"], cat: "type" },
  { id: "headingWeight", label: "Weight", type: "slider" as const, min: 300, max: 900, step: 100, cat: "type" },
  { id: "objectRadius", label: "Object Shape", type: "slider" as const, min: 0, max: 40, cat: "objects" },
  { id: "borderStyle", label: "Borders", type: "choice" as const, options: ["none", "hairline", "framed", "taped", "ledger"], cat: "objects" },
  { id: "shadowDepth", label: "Shadow", type: "slider" as const, min: 0, max: 100, cat: "objects" },
  { id: "accentColor", label: "Accent", type: "swatch" as const, cat: "action" },
];

export const MOODBOARD_TYPES = [
  { id: "image", label: "Image", icon: "image" },
  { id: "link", label: "Link", icon: "link" },
  { id: "room", label: "Presence Room", icon: "doorOpen" },
  { id: "song", label: "Song", icon: "music" },
  { id: "place", label: "Place", icon: "mapPin" },
  { id: "quote", label: "Quote", icon: "quote" },
  { id: "material", label: "Material", icon: "palette" },
  { id: "inspiration", label: "Inspiration", icon: "sparkle" },
];

export const ADD_OBJECT_TYPES = [
  { id: "text", label: "Text note", type: "text" as const, title: "New note", meta: "Add context or a short room note." },
  { id: "image", label: "Image", type: "image" as const, title: "New image", meta: "Image caption" },
  { id: "portal", label: "Link / portal", type: "portal" as const, title: "New portal", meta: "Link to another room or page" },
  { id: "cta", label: "CTA", type: "cta" as const, title: "New call to action", meta: "Invite visitors to act" },
  { id: "testimonial", label: "Proof", type: "testimonial" as const, title: '"A useful proof point"', meta: "Add source or context" },
  { id: "note", label: "Note", type: "note" as const, title: "New note", meta: "A short annotation" },
  { id: "event", label: "Event beacon", type: "event" as const, title: "New event beacon", meta: "Date / time / place" },
];
