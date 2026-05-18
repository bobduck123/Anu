// Palette definitions for ThemeGenome. Each PaletteMode resolves to a
// concrete set of CSS custom property values that the room renderer
// pushes into a scoped style. Accent colour is overridable per-room
// via PresenceNode.accent_color (validated hex).

import type { PaletteMode } from "@/lib/presence/dna/types";

export interface Palette {
  bg: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accent_text: string;
  hero_gradient: string;
  soft: string;
  ink: string;
}

export const PALETTES: Record<PaletteMode, Palette> = {
  earth: {
    bg: "#f2eadf",
    surface: "#fff9f0",
    elevated: "#ead9c5",
    text: "#33251d",
    muted: "#735d4b",
    border: "#d8c4ad",
    accent: "#9a4f2e",
    accent_text: "#ffffff",
    hero_gradient: "linear-gradient(135deg,#fbf2e5,#dfc1a2)",
    soft: "#f7e6d4",
    ink: "#1f160f",
  },
  nocturnal: {
    bg: "#07070b",
    surface: "#0f1018",
    elevated: "#161824",
    text: "#f3f1ec",
    muted: "#9aa2b4",
    border: "#262a3a",
    accent: "#ffd84d",
    accent_text: "#0a0a10",
    hero_gradient:
      "radial-gradient(circle at 18% 20%,rgba(255,216,77,0.18),transparent 36%),radial-gradient(circle at 82% 12%,rgba(34,211,238,0.10),transparent 40%),linear-gradient(160deg,#06060b,#0e0f1a 55%,#07070b)",
    soft: "#10121d",
    ink: "#03030a",
  },
  gallery_white: {
    bg: "#fbfbf8",
    surface: "#ffffff",
    elevated: "#f3f2ed",
    text: "#1a1a17",
    muted: "#6b6b62",
    border: "#e6e3d8",
    accent: "#1a1a17",
    accent_text: "#ffffff",
    hero_gradient: "linear-gradient(180deg,#ffffff,#f4f2ea)",
    soft: "#f6f4ed",
    ink: "#0c0c0a",
  },
  warm_neutral: {
    bg: "#f7f3ec",
    surface: "#ffffff",
    elevated: "#ece4d4",
    text: "#1e1a14",
    muted: "#6f6557",
    border: "#dccfb8",
    accent: "#a14215",
    accent_text: "#ffffff",
    hero_gradient: "linear-gradient(135deg,#fbf6ec,#e3d2b6)",
    soft: "#f1e6d2",
    ink: "#181410",
  },
  high_contrast: {
    bg: "#fafafa",
    surface: "#ffffff",
    elevated: "#ededeb",
    text: "#000000",
    muted: "#5a5a5a",
    border: "#000000",
    accent: "#ff3b00",
    accent_text: "#ffffff",
    hero_gradient: "linear-gradient(120deg,#ffffff,#f0f0f0)",
    soft: "#f5f5f4",
    ink: "#000000",
  },
  soft_gradient: {
    bg: "#f4f2eb",
    surface: "#ffffff",
    elevated: "#e7ecdf",
    text: "#2a2d27",
    muted: "#5e6657",
    border: "#d4dac9",
    accent: "#527a52",
    accent_text: "#ffffff",
    hero_gradient:
      "radial-gradient(circle at 18% 16%,rgba(204,226,198,0.85),transparent 38%),radial-gradient(circle at 82% 84%,rgba(242,216,191,0.78),transparent 32%),linear-gradient(180deg,#faf7ee,#e8ecdd)",
    soft: "#edf2e3",
    ink: "#1f231d",
  },
  monochrome: {
    bg: "#fbfbfb",
    surface: "#ffffff",
    elevated: "#f1f1f1",
    text: "#0d0d0d",
    muted: "#6b6b6b",
    border: "#dcdcdc",
    accent: "#0d0d0d",
    accent_text: "#ffffff",
    hero_gradient: "linear-gradient(160deg,#ffffff 0%,#f3f3f3 100%)",
    soft: "#f3f3f3",
    ink: "#0d0d0d",
  },
  material_based: {
    bg: "#23170d",
    surface: "#2d1f12",
    elevated: "#3a2818",
    text: "#f3e6cf",
    muted: "#c5a880",
    border: "#5a4127",
    accent: "#e0a455",
    accent_text: "#1a110a",
    hero_gradient:
      "radial-gradient(circle at 22% 28%,rgba(224,164,85,0.16),transparent 42%),linear-gradient(135deg,#1c1109,#2d1f12 55%,#23170d)",
    soft: "#2a1d11",
    ink: "#13090a",
  },
  cultural: {
    bg: "#f5f1ea",
    surface: "#fffaf2",
    elevated: "#eadfce",
    text: "#241f1a",
    muted: "#66594d",
    border: "#d8cabc",
    accent: "#b91c1c",
    accent_text: "#ffffff",
    hero_gradient: "linear-gradient(135deg,#fff8ec,#ead6c2)",
    soft: "#f1e4d4",
    ink: "#1a1410",
  },
  cinematic: {
    bg: "#0e0e10",
    surface: "#17171b",
    elevated: "#1f1f25",
    text: "#f0eee9",
    muted: "#b6b3aa",
    border: "#2c2c33",
    accent: "#d8a44a",
    accent_text: "#0c0c0e",
    hero_gradient:
      "radial-gradient(circle at 30% 18%,rgba(216,164,74,0.18),transparent 40%),linear-gradient(140deg,#08080a,#181820 60%,#0e0e10)",
    soft: "#15151a",
    ink: "#06060a",
  },
};

export function paletteFor(mode: PaletteMode): Palette {
  return PALETTES[mode] ?? PALETTES.warm_neutral;
}

export function isHex(value: string | null | undefined): value is string {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
}
