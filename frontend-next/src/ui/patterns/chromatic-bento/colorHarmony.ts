/**
 * Color harmony utilities adapted from the Chromatic Bento skill pack.
 * Generates harmonious palettes using HSL color space transformations.
 */

export type HarmonyMode = 'analogous' | 'complementary' | 'triadic';

export interface BentoPalette {
  base: string;     // Primary brand color
  warm: string;     // Warm accent
  bright: string;   // Bright accent
  light: string;    // Light neutral background
  muted: string;    // Muted secondary
  dark: string;     // Dark anchor
}

// --- Color space conversions ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hn = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs(hn % 2 - 1));
  let r1 = 0, g1 = 0, b1 = 0;

  if (hn < 1) { r1 = c; g1 = x; }
  else if (hn < 2) { r1 = x; g1 = c; }
  else if (hn < 3) { g1 = c; b1 = x; }
  else if (hn < 4) { g1 = x; b1 = c; }
  else if (hn < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }

  const m = ln - c / 2;
  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

// --- Palette generation ---

const HARMONY_OFFSETS: Record<HarmonyMode, { warm: number; accent: number }> = {
  analogous:     { warm: 30,  accent: 60  },
  complementary: { warm: 180, accent: 210 },
  triadic:       { warm: 120, accent: 240 },
};

export function buildPalette(baseHex: string, mode: HarmonyMode = 'analogous'): BentoPalette {
  const { h } = hexToHsl(baseHex);
  const offsets = HARMONY_OFFSETS[mode];

  return {
    base:   baseHex,
    warm:   hslToHex(h + offsets.warm, 64, 52),
    bright: hslToHex(h + offsets.accent, 82, 60),
    light:  hslToHex(h + 18, 55, 92),
    muted:  hslToHex(h - 22, 24, 66),
    dark:   hslToHex(h + 200, 22, 18),
  };
}

/** WCAG relative luminance */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/** WCAG contrast ratio between two colors */
export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns readable text color (white or dark) for a given background */
export function readableText(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#1F2B2D') ? '#FFFFFF' : '#1F2B2D';
}
