// Widget registry — the single source of truth for "what can live in a
// Presence Room, what can edit it, and what can render it."
//
// Both the public renderer and the Studio Canvas read this registry.
// The Canvas widget-library drawer lists everything with
// `pilotVisibility === "pilot"` (or "all" / "advanced" / "staff").
// The renderer reads the widget instance config and renders it through
// its declared renderer component.
//
// Widget support state:
//   - "live"            — fully wired in both Canvas + public renderer
//   - "canvas-draft"    — usable in Canvas, public renderer not yet
//   - "coming-soon"     — visible in library but disabled
//   - "staff"           — hidden from pilots; for operators only
//   - "experimental"    — hidden from pilots; for design exploration
//
// Pilot visibility:
//   - "pilot"     — visible in the default Canvas library
//   - "advanced"  — visible only after "Show advanced widgets"
//   - "hidden"    — never shown in Canvas (still consumable if config carries it)

import type { WidgetType } from "@/lib/presence/render/model";

export type WidgetSupportState = "live" | "canvas-draft" | "coming-soon" | "staff" | "experimental";
export type WidgetPilotVisibility = "pilot" | "advanced" | "hidden";

export type WidgetCategory =
  | "identity"
  | "gallery"
  | "media"
  | "action"
  | "story"
  | "spatial"
  | "decorative"
  | "scene-frame";

export interface WidgetDefinition<TConfig = unknown> {
  type: WidgetType;
  category: WidgetCategory;
  label: string;
  description: string;
  /** A short hint shown in the library drawer next to the thumbnail. */
  hint: string;
  /** Renderer support state. Determines whether public visitors see it. */
  support: WidgetSupportState;
  /** Visibility in the Canvas widget library. */
  pilotVisibility: WidgetPilotVisibility;
  /** Scenes this widget is allowed in. `null` = anywhere. */
  allowedScenes: string[] | null;
  /** Whether more than one of this widget can live in the same scene. */
  cardinality: "single" | "many";
  /** Sample/default config used when the widget is added from the library. */
  defaultConfig: TConfig;
  /** Renderer key(s) this widget is wired to today. Empty = unbound. */
  renderers: string[];
  /** Inspector capability flags — which control groups should the
   *  Canvas inspector show for this widget when selected. */
  inspector: {
    content: boolean;
    style: boolean;
    layout: boolean;
    motion: boolean;
    actions: boolean;
  };
}

// ── Widget definitions ─────────────────────────────────────────────

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  // ── Identity ──────────────────────────────────────────────────────
  {
    type: "hero-title",
    category: "identity",
    label: "Room title",
    description: "Large display title for the active scene.",
    hint: "Click to rename — the artist's name, scene title, or invitation line.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: null,
    cardinality: "single",
    defaultConfig: { text: "Untitled room" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: false },
  },
  {
    type: "hero-caption",
    category: "identity",
    label: "Room caption",
    description: "Sub-line under the title (subtitle, tagline, location).",
    hint: "A quiet line that frames the room.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: null,
    cardinality: "single",
    defaultConfig: { text: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: false },
  },
  {
    type: "hero-image",
    category: "identity",
    label: "Cover image",
    description: "Single hero image for the active scene.",
    hint: "Replace with any artwork or photograph.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["field"],
    cardinality: "single",
    defaultConfig: { url: "", altText: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: false, layout: true, motion: false, actions: false },
  },
  {
    type: "hero-slideshow",
    category: "identity",
    label: "Liquid slideshow",
    description: "Click-to-advance hero slideshow with WebGL liquid morph between artworks.",
    hint: "The Scene-1 default — cycles your selected works.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["field"],
    cardinality: "single",
    defaultConfig: { slides: [], primarySlug: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: false, layout: true, motion: true, actions: false },
  },

  // ── Story ─────────────────────────────────────────────────────────
  {
    type: "statement",
    category: "story",
    label: "Statement",
    description: "Short artist or practice statement.",
    hint: "A quote-style statement, typically centred and italic.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["studio", "card"],
    cardinality: "single",
    defaultConfig: { text: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: false },
  },
  {
    type: "biography",
    category: "story",
    label: "Biography",
    description: "Multi-paragraph biography of the owner.",
    hint: "A few sentences about your practice.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["studio"],
    cardinality: "single",
    defaultConfig: { text: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: false },
  },
  {
    type: "process-notes",
    category: "story",
    label: "Process notes",
    description: "Behind-the-work notes (how the practice is made).",
    hint: "Optional — short bench notes.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["studio"],
    cardinality: "single",
    defaultConfig: { text: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: false },
  },
  {
    type: "studio-fragments",
    category: "story",
    label: "Studio fragments",
    description: "Pinned strand cards (Memory colours, Life-cycles, etc.).",
    hint: "Up to 6 short cards — themes you keep returning to.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["studio"],
    cardinality: "single",
    defaultConfig: { fragments: [] },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: false, layout: true, motion: false, actions: false },
  },
  {
    type: "inspire-board",
    category: "story",
    label: "Inspiration board",
    description: "Marquee of pinned reference images.",
    hint: "Things that inspire you, gliding across the wall.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["studio"],
    cardinality: "single",
    defaultConfig: { cards: [] },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: false, layout: true, motion: true, actions: false },
  },

  // ── Gallery ───────────────────────────────────────────────────────
  {
    type: "work-wall",
    category: "gallery",
    label: "Work wall",
    description: "The main gallery view for all works.",
    hint: "Pick a layout: gallery wall, stack, film strip, archive drawer.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["wall"],
    cardinality: "single",
    defaultConfig: { works: [], layout: "gallery-wall" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: true, motion: true, actions: false },
  },
  {
    type: "work-feature",
    category: "gallery",
    label: "Feature work",
    description: "One large featured artwork at the top of the work wall.",
    hint: "Choose the work that anchors the wall.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["wall"],
    cardinality: "single",
    defaultConfig: { workSlug: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: true, motion: false, actions: false },
  },

  // ── Action ────────────────────────────────────────────────────────
  {
    type: "calling-card",
    category: "action",
    label: "Calling card",
    description: "Paper-card invitation with contact lines + enquiry CTA.",
    hint: "Your invitation. Edit each line directly.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["card"],
    cardinality: "single",
    defaultConfig: { copy: "", externalLinks: [], availability: null },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: true, motion: false, actions: true },
  },
  {
    type: "invitation",
    category: "action",
    label: "Invitation button",
    description: "Primary call-to-action (begin a conversation, book, enquire).",
    hint: "Pick a button style — soft pill, framed card, underlined link.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["card", "studio"],
    cardinality: "many",
    defaultConfig: { label: "Begin a conversation", action: "enquiry" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: true },
  },
  {
    type: "external-link",
    category: "action",
    label: "External link",
    description: "Link to an external portfolio, residency, or article.",
    hint: "A quiet underlined link inside the calling card.",
    support: "live",
    pilotVisibility: "pilot",
    allowedScenes: ["card", "studio"],
    cardinality: "many",
    defaultConfig: { label: "", url: "" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: true, layout: false, motion: false, actions: true },
  },

  // ── Spatial ───────────────────────────────────────────────────────
  {
    type: "roomkey-chip",
    category: "spatial",
    label: "RoomKey chip",
    description: "Tiny provenance chip shown when a visitor opens the room via NFC/QR.",
    hint: "Owners can rewrite the label — visitors arriving via a tap see this.",
    support: "live",
    pilotVisibility: "advanced",
    allowedScenes: ["field"],
    cardinality: "single",
    defaultConfig: { text: "Opened via RoomKey" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: true, style: false, layout: false, motion: false, actions: false },
  },

  // ── Decorative (mostly coming-soon for GGM v1) ────────────────────
  {
    type: "divider",
    category: "decorative",
    label: "Hairline divider",
    description: "Single 1px hairline between scenes.",
    hint: "A quiet rule. Choose colour + thickness.",
    support: "coming-soon",
    pilotVisibility: "advanced",
    allowedScenes: null,
    cardinality: "many",
    defaultConfig: { thickness: 1, color: "line" },
    renderers: [],
    inspector: { content: false, style: true, layout: false, motion: false, actions: false },
  },
  {
    type: "decorative-frame",
    category: "decorative",
    label: "Frame mark",
    description: "Corner brackets framing the active scene like a lightbox.",
    hint: "Currently locked to the GGM renderer chrome.",
    support: "staff",
    pilotVisibility: "hidden",
    allowedScenes: ["field", "wall", "studio", "card"],
    cardinality: "single",
    defaultConfig: { color: "ink" },
    renderers: ["ggm-faithful-room-v1"],
    inspector: { content: false, style: true, layout: false, motion: false, actions: false },
  },
];

// ── Registry helpers ────────────────────────────────────────────────

export function getWidgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return WIDGET_DEFINITIONS.find((def) => def.type === type);
}

export function listWidgetsForPilot(includeAdvanced = false): WidgetDefinition[] {
  return WIDGET_DEFINITIONS.filter((def) =>
    def.support === "live" &&
    (def.pilotVisibility === "pilot" || (includeAdvanced && def.pilotVisibility === "advanced")),
  );
}

export function listWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return WIDGET_DEFINITIONS.filter((def) => def.category === category);
}

export function widgetIsLive(type: WidgetType): boolean {
  return getWidgetDefinition(type)?.support === "live";
}

export function widgetAllowedInScene(type: WidgetType, sceneId: string): boolean {
  const def = getWidgetDefinition(type);
  if (!def) return false;
  return def.allowedScenes === null || def.allowedScenes.includes(sceneId);
}
