// PresenceRenderModel — the single shared render contract.
//
// Both the public renderer and the Studio Canvas must read this exact
// model. If Canvas and public differ, this file is the only thing they
// disagree on. Public GGM, draft preview, RoomKey and Canvas v2 all
// resolve visible authored values through `resolveRenderModel()`.
//
// Identity terminology:
//   - "node" — the backend PresenceNode (room identity + published data).
//   - "config" — node.editable_config; nested PresenceEditableConfig.
//   - "render mode" — `"published"` (visitor view, only when
//     config.status === "published") or `"draft"` (Studio Canvas view,
//     uses the draft config in place even though it isn't live).
//
// Field-level provenance:
//   Every editable token in the model carries a `provenance` flag —
//   "authored" (the owner has set it), "node" (filled from node-level
//   data), or "canonical" (filled from a renderer constant). Canvas
//   shows a tiny canonical-default badge when it surfaces a value the
//   owner has not authored — eliminating the "I saved biography and
//   visitors still see Christina's default" confusion.

import type { PresenceNode } from "../../api/types.ts";
import type { LiquidStyle } from "../../../components/presence/ggm/GgmLiquidCanvas.tsx";

export type RenderMode = "published" | "draft";

export type Provenance = "authored" | "node" | "canonical";

export interface ProvenanceValue<T> {
  value: T;
  provenance: Provenance;
}

// ── Style tokens ────────────────────────────────────────────────────

export interface PaletteTokens {
  bg: ProvenanceValue<string>;
  paper: ProvenanceValue<string>;
  paperWarm: ProvenanceValue<string>;
  ink: ProvenanceValue<string>;
  muted: ProvenanceValue<string>;
  line: ProvenanceValue<string>;
  stage: ProvenanceValue<string>;
  accent: ProvenanceValue<string>;
}

export interface TypographyTokens {
  headingFamily: ProvenanceValue<string>;
  bodyFamily: ProvenanceValue<string>;
  headingFontId: ProvenanceValue<string | null>;
  bodyFontId: ProvenanceValue<string | null>;
  /** Curated font-pack id this room was last styled with, if any. */
  fontPackId: ProvenanceValue<string | null>;
}

export type TextSize = "small" | "medium" | "large" | "feature";
export type TextWeight = "light" | "regular" | "bold";
export type TextColorToken = "ink" | "muted" | "paper" | "accent";
export type TextAlign = "left" | "center" | "right";
export type FontMood = "editorial" | "display" | "soft" | "mono" | "handwritten";

export interface TextStyle {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColorToken;
  align?: TextAlign;
  fontMood?: FontMood;
  italic?: boolean;
  underline?: boolean;
}

// ── Motion tokens ───────────────────────────────────────────────────

export type MotionIntensity = "still" | "gentle" | "living" | "immersive";

export interface MotionTokens {
  intensity: ProvenanceValue<MotionIntensity>;
  liquidStyle: ProvenanceValue<LiquidStyle>;
  liquidIntensity: ProvenanceValue<number>;
  liquidDistortion: ProvenanceValue<number>;
  liquidDurationMs: ProvenanceValue<number>;
  ditherStrength: ProvenanceValue<number>;
  filmGrainStrength: ProvenanceValue<number>;
  blurAmount: ProvenanceValue<number>;
  parallaxDepth: ProvenanceValue<number>;
  customCursor: ProvenanceValue<boolean>;
  heavyMotion: ProvenanceValue<boolean>;
  reducedMotionFallback: ProvenanceValue<boolean>;
  /** True when the authored request exceeds the pilot-safe ceiling. */
  safetyCapApplied: boolean;
  requestedLiquidIntensity: number;
}

// ── Widget instance ────────────────────────────────────────────────
//
// Every renderable thing on the room is a Widget. A Widget has a
// `type` that maps to a renderer component (see lib/presence/widgets/
// registry.ts). Widgets are grouped into Scenes; scenes are ordered.

export type WidgetType =
  | "hero-title"
  | "hero-caption"
  | "hero-image"
  | "hero-slideshow"
  | "statement"
  | "biography"
  | "process-notes"
  | "calling-card"
  | "invitation"
  | "work-wall"
  | "work-feature"
  | "studio-fragment"
  | "studio-fragments"
  | "inspire-board"
  | "external-link"
  | "roomkey-chip"
  // gallery layout variants — all surface as work-wall WidgetType but
  // carry a different `config.layout` value
  | "divider"
  | "decorative-frame";

export type WidgetSceneId = "field" | "wall" | "studio" | "card" | string;

export interface WidgetInstance<T = unknown> {
  id: string;
  type: WidgetType;
  scene: WidgetSceneId;
  /** 0-based ordering within the scene. */
  order: number;
  /** Owner-authored content + style + asset references. */
  config: T;
  textStyle?: TextStyle;
  /** True when the widget is hidden from the public render but kept in
   *  draft for the owner to restore. */
  hidden?: boolean;
  provenance: Provenance;
}

// ── Scene tokens ────────────────────────────────────────────────────

export type SceneLayout =
  // Hero
  | "hero-liquid-slideshow"
  | "hero-still"
  // Work wall
  | "gallery-wall"
  | "stack"
  | "film-strip"
  | "archive-drawer"
  | "magazine-spread"
  | "carousel"
  | "polaroid-wall"
  | "masonry"
  // Studio
  | "studio-workbench"
  | "studio-letter"
  | "studio-transcript"
  // Calling card
  | "calling-paper"
  | "calling-business-card"
  | "calling-studio-desk"
  | "calling-footer";

export interface SceneInstance {
  id: WidgetSceneId;
  number: string;
  label: string;
  sub: string;
  layout: ProvenanceValue<SceneLayout>;
  background: ProvenanceValue<"paper" | "paper-warm" | "stage" | "ink" | "custom">;
  hidden?: boolean;
  widgets: WidgetInstance[];
}

// ── Asset + work shape (renderer-facing) ───────────────────────────

export interface RenderAsset {
  id: string;
  slug: string;
  url: string;
  thumbnailUrl: string;
  altText: string;
  focalPoint?: { x: number; y: number };
}

export interface RenderWork {
  slug: string;
  title: string;
  year: string | number | null;
  medium: string;
  dimensions: string;
  description: string;
  asset: RenderAsset;
  visible: boolean;
  textStyle?: TextStyle;
}

// ── RoomKey + identity ─────────────────────────────────────────────

export interface RoomIdentity {
  slug: string;
  displayName: ProvenanceValue<string>;
  headline: ProvenanceValue<string>;
  rendererKey: string;
  publicUrl: string;
}

export interface RoomKeyTokens {
  provenanceChipText: ProvenanceValue<string | null>;
  guestEntryCopy: ProvenanceValue<string | null>;
  invalidCopy: ProvenanceValue<string | null>;
  revokedCopy: ProvenanceValue<string | null>;
}

// ── Top-level model ────────────────────────────────────────────────

export interface PresenceRenderModel {
  mode: RenderMode;
  /** True when the model is rendering an empty / not-yet-published room
   *  and is drawn entirely from renderer canonicals + node fallbacks.
   *  Canvas surfaces this state so the owner understands the room is
   *  not yet live. */
  empty: boolean;
  identity: RoomIdentity;
  palette: PaletteTokens;
  typography: TypographyTokens;
  motion: MotionTokens;
  scenes: SceneInstance[];
  works: RenderWork[];
  hero: { primaryWorkSlug: string; slides: RenderWork[] };
  roomKey: RoomKeyTokens;
  // Element-level text style overrides (e.g. hero-title font scale).
  elementStyles: Record<string, TextStyle>;
  // Provenance summary — counts of authored / node / canonical fields
  // so Canvas can show a single completeness number.
  provenanceSummary: { authored: number; node: number; canonical: number };
}

// ── Helpers ────────────────────────────────────────────────────────

export function authored<T>(value: T): ProvenanceValue<T> {
  return { value, provenance: "authored" };
}

export function nodeValue<T>(value: T): ProvenanceValue<T> {
  return { value, provenance: "node" };
}

export function canonical<T>(value: T): ProvenanceValue<T> {
  return { value, provenance: "canonical" };
}

export function pickProvenance<T>(
  authored: T | null | undefined,
  node: T | null | undefined,
  canonical: T,
): ProvenanceValue<T> {
  if (isMeaningful(authored)) return { value: authored as T, provenance: "authored" };
  if (isMeaningful(node)) return { value: node as T, provenance: "node" };
  return { value: canonical, provenance: "canonical" };
}

function isMeaningful<T>(value: T | null | undefined): value is T {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

// The renderer never reads these directly; Canvas does (to dim badge etc.).
export function takeValues<T>(record: Record<string, ProvenanceValue<T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v.value]));
}

export type { PresenceNode };
