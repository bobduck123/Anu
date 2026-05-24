// Option Pack registry — bundled palette + typography + motion +
// layout + button-style tokens that an owner can apply with one
// click in the Canvas and then keep tuning.
//
// Packs are starting points, NOT final styling. After applying a
// pack, the owner can still override any individual token through the
// inspector. The renderer reads only the final token values from
// editable_config — packs are an editor concept.

import type { LiquidStyle } from "@/components/presence/ggm/GgmLiquidCanvas";

export type OptionPackCategory = "room" | "scene" | "widget" | "gallery" | "transition" | "font" | "colour" | "action";

export interface OptionPackPalette {
  bg: string;
  paper: string;
  paperWarm: string;
  ink: string;
  muted: string;
  line: string;
  stage: string;
  accent: string;
}

export interface OptionPackTypography {
  headingStack: string;
  bodyStack: string;
  headingFontId: string;
  bodyFontId: string;
  fontPackId: string;
}

export interface OptionPackMotion {
  intensity: "still" | "gentle" | "living" | "immersive";
  liquidStyle: LiquidStyle;
  liquidIntensity: number;
  liquidDistortion: number;
  morphSpeedMs: number;
  ditherStrength: number;
  filmGrainStrength: number;
  blurAmount: number;
  heavyMotionEnabled: boolean;
}

export interface OptionPackLayout {
  /** Scene id → layout token. */
  scenes: Record<string, string>;
  /** Widget type → layout token (e.g. work-wall → gallery-wall). */
  widgets: Record<string, string>;
}

export interface OptionPackActions {
  invitationStyle: "soft-pill" | "framed-card" | "underlined-link" | "floating-tag";
}

export interface OptionPack {
  id: string;
  name: string;
  description: string;
  category: OptionPackCategory;
  appliesTo: "room";
  /** Visible thumbnail mood line — CSS gradient or hex. */
  swatch: string;
  palette: OptionPackPalette;
  typography: OptionPackTypography;
  motion: OptionPackMotion;
  layout: OptionPackLayout;
  actions: OptionPackActions;
  /** Pilot visibility — pilots default to packs marked `true`. */
  pilotSafe: boolean;
  /** Public renderer support. Packs that map to renderer-visible tokens
   *  return `true`; packs that require unwired renderer branches return
   *  `false` and are hidden from pilots. */
  publicRendererSupport: boolean;
  /** Dependencies that must exist for the pack to render correctly. */
  dependencies: { fontPackId: string };
  /** When true, this pack is hidden from non-staff owners. */
  advancedOnly: boolean;
}

// ── Starter packs ──────────────────────────────────────────────────

export const OPTION_PACKS: OptionPack[] = [
  {
    id: "paper-gallery",
    name: "Paper Gallery",
    description: "Quiet paper field, gallery ink, scroll-paced viewing tray.",
    category: "room",
    appliesTo: "room",
    swatch: "linear-gradient(135deg,#f4f4f4,#e7e1d7)",
    palette: {
      bg: "#f4f4f4",
      paper: "#eceae7",
      paperWarm: "#e7e1d7",
      ink: "#111111",
      muted: "#6a6a6a",
      line: "#d7d2c8",
      stage: "#eaeaea",
      accent: "#b87938",
    },
    typography: {
      headingStack: "Inter Tight, Inter, system-ui, sans-serif",
      bodyStack: "Inter, system-ui, sans-serif",
      headingFontId: "inter-tight",
      bodyFontId: "inter",
      fontPackId: "editorial-gallery",
    },
    motion: {
      intensity: "gentle",
      liquidStyle: "ripple",
      liquidIntensity: 0.55,
      liquidDistortion: 0.5,
      morphSpeedMs: 1100,
      ditherStrength: 0.34,
      filmGrainStrength: 0.28,
      blurAmount: 0.22,
      heavyMotionEnabled: false,
    },
    layout: {
      scenes: { field: "hero-liquid-slideshow", wall: "gallery-wall", studio: "studio-workbench", card: "calling-paper" },
      widgets: { "work-wall": "gallery-wall" },
    },
    actions: { invitationStyle: "soft-pill" },
    pilotSafe: true,
    publicRendererSupport: true,
    dependencies: { fontPackId: "editorial-gallery" },
    advancedOnly: false,
  },
  {
    id: "ink-room",
    name: "Ink Room",
    description: "Dark stage, warm type, slower glass morph between artworks.",
    category: "room",
    appliesTo: "room",
    swatch: "linear-gradient(135deg,#141414,#3c362e)",
    palette: {
      bg: "#141414",
      paper: "#23211d",
      paperWarm: "#2f2a23",
      ink: "#f7f1e7",
      muted: "#b7aa98",
      line: "#51483c",
      stage: "#191919",
      accent: "#dba963",
    },
    typography: {
      headingStack: "Instrument Serif, Georgia, serif",
      bodyStack: "Inter, system-ui, sans-serif",
      headingFontId: "instrument-serif",
      bodyFontId: "inter",
      fontPackId: "soft-studio",
    },
    motion: {
      intensity: "gentle",
      liquidStyle: "glass",
      liquidIntensity: 0.45,
      liquidDistortion: 0.4,
      morphSpeedMs: 1400,
      ditherStrength: 0.28,
      filmGrainStrength: 0.32,
      blurAmount: 0.16,
      heavyMotionEnabled: false,
    },
    layout: {
      scenes: { field: "hero-liquid-slideshow", wall: "gallery-wall", studio: "studio-workbench", card: "calling-paper" },
      widgets: { "work-wall": "gallery-wall" },
    },
    actions: { invitationStyle: "framed-card" },
    pilotSafe: true,
    publicRendererSupport: true,
    dependencies: { fontPackId: "soft-studio" },
    advancedOnly: false,
  },
  {
    id: "warm-archive",
    name: "Warm Archive",
    description: "Ochre paper, mono captions, archive-drawer wall layout.",
    category: "room",
    appliesTo: "room",
    swatch: "linear-gradient(135deg,#f3e6d2,#c08a58)",
    palette: {
      bg: "#efe4d4",
      paper: "#f4eadc",
      paperWarm: "#e6d2b9",
      ink: "#2c2119",
      muted: "#806754",
      line: "#d4b898",
      stage: "#eadbc7",
      accent: "#b56b38",
    },
    typography: {
      headingStack: "Fraunces, Georgia, serif",
      bodyStack: "IBM Plex Mono, Menlo, monospace",
      headingFontId: "fraunces",
      bodyFontId: "ibm-plex-mono",
      fontPackId: "mono-archive",
    },
    motion: {
      intensity: "gentle",
      liquidStyle: "ripple",
      liquidIntensity: 0.45,
      liquidDistortion: 0.4,
      morphSpeedMs: 1300,
      ditherStrength: 0.38,
      filmGrainStrength: 0.32,
      blurAmount: 0.18,
      heavyMotionEnabled: false,
    },
    layout: {
      scenes: { field: "hero-liquid-slideshow", wall: "archive-drawer", studio: "studio-workbench", card: "calling-paper" },
      widgets: { "work-wall": "archive-drawer" },
    },
    actions: { invitationStyle: "underlined-link" },
    pilotSafe: true,
    publicRendererSupport: false, // archive-drawer layout token isn't wired yet — pack hidden from pilots
    dependencies: { fontPackId: "mono-archive" },
    advancedOnly: true,
  },
  {
    id: "liquid-signal",
    name: "Liquid Signal",
    description: "Higher liquid presence, immersive transitions. Advanced — heavy motion explicit.",
    category: "room",
    appliesTo: "room",
    swatch: "linear-gradient(135deg,#dde8ed,#7f958f)",
    palette: {
      bg: "#e8ece9",
      paper: "#dfe4df",
      paperWarm: "#d7ddd4",
      ink: "#111714",
      muted: "#5c6b63",
      line: "#b8c4bd",
      stage: "#dce6e2",
      accent: "#3d6354",
    },
    typography: {
      headingStack: "Space Grotesk, system-ui, sans-serif",
      bodyStack: "Inter, system-ui, sans-serif",
      headingFontId: "space-grotesk",
      bodyFontId: "inter",
      fontPackId: "brutalist-poster",
    },
    motion: {
      intensity: "immersive",
      liquidStyle: "ripple",
      liquidIntensity: 0.95,
      liquidDistortion: 0.92,
      morphSpeedMs: 900,
      ditherStrength: 0.62,
      filmGrainStrength: 0.42,
      blurAmount: 0.5,
      heavyMotionEnabled: true,
    },
    layout: {
      scenes: { field: "hero-liquid-slideshow", wall: "magazine-spread", studio: "studio-workbench", card: "calling-studio-desk" },
      widgets: { "work-wall": "magazine-spread" },
    },
    actions: { invitationStyle: "floating-tag" },
    pilotSafe: false, // immersive — advanced only
    publicRendererSupport: false, // magazine-spread + studio-desk not wired yet
    dependencies: { fontPackId: "brutalist-poster" },
    advancedOnly: true,
  },
];

// ── Helpers ────────────────────────────────────────────────────────

export function getOptionPack(id: string): OptionPack | undefined {
  return OPTION_PACKS.find((p) => p.id === id);
}

export function optionPacksForPilot(): OptionPack[] {
  return OPTION_PACKS.filter((p) => p.pilotSafe && p.publicRendererSupport);
}

export function allOptionPacks(): OptionPack[] {
  return OPTION_PACKS.slice();
}

/**
 * Convert a live Option Pack into the controlled draft tokens used by
 * both Canvas and the visitor room. The pilot picker exposes only
 * packs whose visible layout tokens are already supported.
 */
export function optionPackToConfigPatch(pack: OptionPack): {
  style_dna: Record<string, unknown>;
  motion_config: Record<string, unknown>;
  scene_config: Record<string, unknown>;
} {
  const palette = {
    bg: pack.palette.bg,
    paper: pack.palette.paper,
    paper_warm: pack.palette.paperWarm,
    ink: pack.palette.ink,
    muted: pack.palette.muted,
    line: pack.palette.line,
    hero_stage_bg: pack.palette.stage,
    accent: pack.palette.accent,
  };
  return {
    style_dna: {
      palette,
      typography: {
        heading_stack: pack.typography.headingStack,
        body_stack: pack.typography.bodyStack,
        heading_font_id: pack.typography.headingFontId,
        body_font_id: pack.typography.bodyFontId,
        font_pack_id: pack.typography.fontPackId,
      },
      invitation_style: pack.actions.invitationStyle,
    },
    motion_config: {
      intensity: pack.motion.intensity,
      liquid_style: pack.motion.liquidStyle,
      liquid_intensity: pack.motion.liquidIntensity,
      distortion_scale: pack.motion.liquidDistortion,
      morph_speed_ms: pack.motion.morphSpeedMs,
      dither_strength: pack.motion.ditherStrength,
      film_grain_strength: pack.motion.filmGrainStrength,
      blur_amount: pack.motion.blurAmount,
      heavy_motion_enabled: pack.motion.heavyMotionEnabled,
      reduced_motion_fallback: true,
    },
    scene_config: {
      // Scene layout tokens are merged at apply-time by the Canvas
      // — this is the patch shape the resolver expects.
      layouts: pack.layout.scenes,
    },
  };
}
