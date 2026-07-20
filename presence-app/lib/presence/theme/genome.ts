// ThemeGenome — assembles a theme from a PresenceDna and exposes it as
// a CSSProperties payload + className map. The genome controls more than
// colour: typography mode, spacing density, grid behaviour, image
// treatment, motion preset, edge style, depth, mobile nav.

import type { CSSProperties } from "react";
import type {
  BehaviourIntensity,
  BehaviourPreset,
  EdgeStyle,
  GridBehaviour,
  PresenceDna,
  SpacingDensity,
  ThemeGenome,
  TypographyMode,
} from "@/lib/presence/dna/types";
import { isHex, paletteFor } from "./palettes";

// ---------------------------------------------------------------------------
// DNA → ThemeGenome
// ---------------------------------------------------------------------------

export function deriveThemeGenome(dna: PresenceDna, accent?: string | null): ThemeGenome {
  const typography_mode = pickTypography(dna);
  const spacing_density = pickSpacing(dna);
  const grid_behaviour = pickGrid(dna);
  const motion = pickMotion(dna);
  const edge_style = pickEdge(dna);
  const depth_model = pickDepth(dna);

  return {
    palette_mode: dna.visual.palette_mode,
    typography_mode,
    spacing_density,
    grid_behaviour,
    image_treatment: dna.visual.image_treatment,
    texture: dna.visual.texture,
    motion_preset: motion.preset,
    motion_intensity: motion.intensity,
    edge_style,
    depth_model,
    navigation_mode: dna.composition.navigation_mode,
    accent_hex: accent ?? null,
  };
}

function pickTypography(dna: PresenceDna): TypographyMode {
  const { temperament, status_signal } = dna.personality;
  if (status_signal === "premium" || temperament === "refined") return "editorial_serif";
  if (status_signal === "expert" || temperament === "precise") return "industrial_sans";
  if (status_signal === "underground" || temperament === "experimental") return "mono_technical";
  if (dna.practice.field === "culture" || dna.practice.field === "community") return "display_serif";
  if (temperament === "warm" || temperament === "spiritual") return "soft_serif";
  return "humanist_sans";
}

function pickSpacing(dna: PresenceDna): SpacingDensity {
  if (dna.personality.energy === "still" || dna.personality.energy === "ceremonial") return "cinematic";
  if (dna.personality.energy === "minimal" || dna.personality.energy === "slow") return "airy";
  if (dna.personality.energy === "dense") return "tight";
  return "comfortable";
}

function pickGrid(dna: PresenceDna): GridBehaviour {
  if (dna.composition.section_rhythm === "collage") return "collage";
  if (dna.composition.section_rhythm === "index_wall") return "broken";
  if (dna.composition.section_rhythm === "editorial_scroll") return "single_column";
  if (dna.composition.section_rhythm === "modular_cards") return "modular";
  return "strict";
}

function pickMotion(dna: PresenceDna): { preset: BehaviourPreset; intensity: BehaviourIntensity } {
  // Map persisted or inferred DNA to motion. Signature modules can force
  // specific behaviours, while older inferred nodes still default sensibly.
  if (dna.visual.image_treatment === "glitch") return { preset: "controlled_glitch", intensity: "high" };
  if (dna.signature.signature_module === "glitch_gallery") return { preset: "controlled_glitch", intensity: "high" };
  if (dna.signature.signature_module === "materials_board") return { preset: "material_reveal", intensity: "featured" };
  if (dna.practice.field === "visual_art") return { preset: "gallery_breath", intensity: "subtle" };
  if (dna.practice.field === "consulting") return { preset: "editorial_snap", intensity: "subtle" };
  if (dna.personality.energy === "kinetic") return { preset: "kinetic_index", intensity: "featured" };
  if (dna.personality.energy === "still") return { preset: "gallery_breath", intensity: "subtle" };
  return { preset: "editorial_snap", intensity: "subtle" };
}

function pickEdge(dna: PresenceDna): EdgeStyle {
  if (dna.visual.image_treatment === "polaroid") return "polaroid";
  if (dna.visual.texture === "paper") return "deckled";
  if (dna.personality.energy === "soft") return "rounded";
  if (dna.personality.temperament === "precise") return "hard";
  return "soft";
}

function pickDepth(dna: PresenceDna): ThemeGenome["depth_model"] {
  if (dna.signature.signature_intensity === "hero_level") return "scenographic";
  if (dna.composition.section_rhythm === "collage") return "dimensional";
  if (dna.personality.energy === "still") return "flat";
  if (dna.personality.status_signal === "premium") return "layered";
  return "elevated";
}

// ---------------------------------------------------------------------------
// ThemeGenome → CSSProperties (scoped variables on the room root)
// ---------------------------------------------------------------------------

const TYPOGRAPHY_STACK: Record<TypographyMode, string> = {
  editorial_serif: 'Georgia, "Times New Roman", serif',
  industrial_sans:
    '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  humanist_sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono_technical:
    '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  display_serif: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
  soft_serif: '"Lora", Georgia, "Times New Roman", serif',
};

const SPACING_SCALE: Record<SpacingDensity, { section: string; gutter: string }> = {
  tight: { section: "2.5rem", gutter: "0.75rem" },
  comfortable: { section: "3.75rem", gutter: "1.25rem" },
  airy: { section: "5.5rem", gutter: "1.75rem" },
  cinematic: { section: "8rem", gutter: "2.25rem" },
};

const EDGE_RADIUS: Record<EdgeStyle, string> = {
  hard: "2px",
  soft: "10px",
  rounded: "22px",
  deckled: "4px",
  polaroid: "2px",
};

export function themeStyle(theme: ThemeGenome): CSSProperties {
  const palette = paletteFor(theme.palette_mode);
  const accent = isHex(theme.accent_hex) ? theme.accent_hex! : palette.accent;
  const spacing = SPACING_SCALE[theme.spacing_density];

  return {
    "--presence-bg": palette.bg,
    "--presence-surface": palette.surface,
    "--presence-elevated": palette.elevated,
    "--presence-text": palette.text,
    "--presence-muted": palette.muted,
    "--presence-border": palette.border,
    "--presence-accent": accent,
    "--presence-accent-text": palette.accent_text,
    "--presence-hero": palette.hero_gradient,
    "--presence-soft": palette.soft,
    "--presence-ink": palette.ink,
    "--presence-font": TYPOGRAPHY_STACK[theme.typography_mode],
    "--presence-section-y": spacing.section,
    "--presence-gutter": spacing.gutter,
    "--presence-radius": EDGE_RADIUS[theme.edge_style],
  } as CSSProperties;
}

// Class hooks for global CSS rules in app/globals.css. These are stable,
// short string keys so Tailwind v4 content scanning isn't needed.
export function themeClasses(theme: ThemeGenome): string {
  return [
    "presence-room",
    `presence-grid-${theme.grid_behaviour}`,
    `presence-depth-${theme.depth_model}`,
    `presence-texture-${theme.texture}`,
    `presence-treatment-${theme.image_treatment}`,
    `presence-typography-${theme.typography_mode}`,
    `presence-density-${theme.spacing_density}`,
  ].join(" ");
}
