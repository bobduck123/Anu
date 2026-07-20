// Typography registry — curated, license-safe font families exposed to
// the Studio Canvas + public renderer.
//
// Policy:
//   - Always-on: web-safe families that need no @font-face. These cost
//     zero bytes and render identically across browsers.
//   - Curated Google Fonts: families that are clearly redistributable
//     under the Open Font License (or similar) and that the project
//     has explicitly allow-listed. The loader is added at the renderer
//     shell when one of these is selected in the published config.
//   - Hosted-or-not: families that exist as tokens for advanced packs
//     but require an upload step before the renderer can use them.
//     These are visible in the Canvas font drawer with a "Bring your
//     own file" badge.
//
// Important: no font BINARIES are bundled in this file or in this
// repository. The renderer either loads from Google Fonts CDN (for
// the approved list) or expects the owner to ship a self-hosted file
// path via the editable config.

export type FontSource = "system" | "google" | "self-hosted";
export type FontLicense = "system" | "open-font-license" | "byo";
export type FontMoodTag = "editorial" | "display" | "soft" | "mono" | "handwritten" | "industrial" | "luxury" | "playful";

export interface FontFamily {
  id: string;
  label: string;
  /** Full CSS font-family stack. */
  stack: string;
  /** Source of the font. `system` requires no loader. */
  source: FontSource;
  /** Google Fonts family name when source === "google". */
  googleFamily?: string;
  /** Mood tags so the drawer can group choices. */
  moods: FontMoodTag[];
  license: FontLicense;
  /** Visible in the default Canvas font drawer. */
  pilotSafe: boolean;
}

/** Always-on, system-safe families. */
export const SYSTEM_FONTS: FontFamily[] = [
  {
    id: "system-sans",
    label: "System sans",
    stack: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    source: "system",
    moods: ["editorial", "industrial"],
    license: "system",
    pilotSafe: true,
  },
  {
    id: "helvetica-neue",
    label: "Helvetica Neue",
    stack: "Helvetica Neue, Arial, sans-serif",
    source: "system",
    moods: ["editorial", "industrial"],
    license: "system",
    pilotSafe: true,
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: "Georgia, Times New Roman, serif",
    source: "system",
    moods: ["editorial", "luxury"],
    license: "system",
    pilotSafe: true,
  },
  {
    id: "courier",
    label: "Courier",
    stack: "ui-monospace, Menlo, Consolas, Courier New, monospace",
    source: "system",
    moods: ["mono", "industrial"],
    license: "system",
    pilotSafe: true,
  },
];

/** Curated Google Fonts (OFL) — loaded only when selected. */
export const GOOGLE_FONTS: FontFamily[] = [
  {
    id: "inter",
    label: "Inter",
    stack: "Inter, system-ui, sans-serif",
    source: "google",
    googleFamily: "Inter:wght@400;500;700",
    moods: ["editorial", "industrial"],
    license: "open-font-license",
    pilotSafe: true,
  },
  {
    id: "inter-tight",
    label: "Inter Tight",
    stack: "Inter Tight, Inter, system-ui, sans-serif",
    source: "google",
    googleFamily: "Inter+Tight:wght@400;500;700",
    moods: ["editorial", "display"],
    license: "open-font-license",
    pilotSafe: true,
  },
  {
    id: "fraunces",
    label: "Fraunces",
    stack: "Fraunces, Georgia, serif",
    source: "google",
    googleFamily: "Fraunces:opsz,wght@9..144,400;9..144,700",
    moods: ["display", "luxury", "editorial"],
    license: "open-font-license",
    pilotSafe: true,
  },
  {
    id: "instrument-serif",
    label: "Instrument Serif",
    stack: "Instrument Serif, Georgia, serif",
    source: "google",
    googleFamily: "Instrument+Serif:ital@0;1",
    moods: ["editorial", "soft", "luxury"],
    license: "open-font-license",
    pilotSafe: true,
  },
  {
    id: "playfair",
    label: "Playfair Display",
    stack: "Playfair Display, Georgia, serif",
    source: "google",
    googleFamily: "Playfair+Display:wght@400;700",
    moods: ["display", "luxury"],
    license: "open-font-license",
    pilotSafe: true,
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    stack: "IBM Plex Mono, Menlo, monospace",
    source: "google",
    googleFamily: "IBM+Plex+Mono:wght@400;500;700",
    moods: ["mono", "industrial"],
    license: "open-font-license",
    pilotSafe: true,
  },
  {
    id: "caveat",
    label: "Caveat",
    stack: "Caveat, Comic Sans MS, cursive",
    source: "google",
    googleFamily: "Caveat:wght@400;700",
    moods: ["handwritten", "playful"],
    license: "open-font-license",
    pilotSafe: false,
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    stack: "Space Grotesk, system-ui, sans-serif",
    source: "google",
    googleFamily: "Space+Grotesk:wght@400;500;700",
    moods: ["display", "industrial"],
    license: "open-font-license",
    pilotSafe: true,
  },
];

export const ALL_FONTS: FontFamily[] = [...SYSTEM_FONTS, ...GOOGLE_FONTS];

// ── Font packs — curated pairings ──────────────────────────────────

export interface FontPack {
  id: string;
  label: string;
  description: string;
  headingFontId: string;
  bodyFontId: string;
  moods: FontMoodTag[];
  pilotSafe: boolean;
}

export const FONT_PACKS: FontPack[] = [
  {
    id: "editorial-gallery",
    label: "Editorial Gallery",
    description: "Quiet sans throughout — a contemporary art-fair voice.",
    headingFontId: "inter-tight",
    bodyFontId: "inter",
    moods: ["editorial"],
    pilotSafe: true,
  },
  {
    id: "soft-studio",
    label: "Soft Studio",
    description: "Serif headings + sans body — warm and intimate.",
    headingFontId: "instrument-serif",
    bodyFontId: "inter",
    moods: ["soft", "luxury", "editorial"],
    pilotSafe: true,
  },
  {
    id: "luxury-serif",
    label: "Luxury Serif",
    description: "Playfair Display + Georgia body. High contrast.",
    headingFontId: "playfair",
    bodyFontId: "georgia",
    moods: ["luxury", "editorial"],
    pilotSafe: true,
  },
  {
    id: "mono-archive",
    label: "Mono Archive",
    description: "All mono. Reads as catalogue, archive, or technical note.",
    headingFontId: "ibm-plex-mono",
    bodyFontId: "ibm-plex-mono",
    moods: ["mono", "industrial"],
    pilotSafe: true,
  },
  {
    id: "brutalist-poster",
    label: "Brutalist Poster",
    description: "Space Grotesk display + sans body. Bold and graphic.",
    headingFontId: "space-grotesk",
    bodyFontId: "inter",
    moods: ["display", "industrial"],
    pilotSafe: true,
  },
  {
    id: "handwritten-notes",
    label: "Handwritten Notes",
    description: "Caveat headings + Georgia body. Studio-journal voice. Advanced.",
    headingFontId: "caveat",
    bodyFontId: "georgia",
    moods: ["handwritten", "soft"],
    pilotSafe: false,
  },
];

// ── Helpers ────────────────────────────────────────────────────────

export function getFont(id: string): FontFamily | undefined {
  return ALL_FONTS.find((f) => f.id === id);
}

export function getFontPack(id: string): FontPack | undefined {
  return FONT_PACKS.find((p) => p.id === id);
}

export function fontsForPilot(): FontFamily[] {
  return ALL_FONTS.filter((f) => f.pilotSafe);
}

export function fontPacksForPilot(): FontPack[] {
  return FONT_PACKS.filter((p) => p.pilotSafe);
}

/**
 * Returns the Google Fonts CSS URL needed to load all non-system fonts
 * currently referenced by a render model's typography tokens, or null
 * when nothing needs to be loaded.
 */
export function fontLoaderHref(headingFontId: string | null, bodyFontId: string | null): string | null {
  const families = new Set<string>();
  for (const id of [headingFontId, bodyFontId]) {
    if (!id) continue;
    const font = getFont(id);
    if (font?.source === "google" && font.googleFamily) families.add(font.googleFamily);
  }
  if (families.size === 0) return null;
  const param = Array.from(families).map((family) => `family=${family}`).join("&");
  return `https://fonts.googleapis.com/css2?${param}&display=swap`;
}
