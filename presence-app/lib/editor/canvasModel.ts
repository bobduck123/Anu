import type { CSSProperties } from "react";
import type {
  PresenceEditableConfig,
  PresenceEditorAsset,
  PresenceNode,
} from "@/lib/api/types";
import type { CanonicalAssetBundle } from "./canonicalAssets";
import type { ReadinessIssue } from "./readiness";
import { validateAssetUrl } from "./assetValidator.ts";
import type { PresenceRenderModel, Provenance, WidgetInstance } from "../presence/render/model.ts";

export type CanvasSceneId = "artwork" | "wall" | "practice" | "invitation";
export type CanvasElementKind = "text" | "image" | "work-wall";
export type CanvasControl = "edit" | "style" | "image" | "alt-text" | "reorder";

export interface CanvasElement {
  canvasId: string;
  label: string;
  kind: CanvasElementKind;
  scene: CanvasSceneId;
  controls: CanvasControl[];
  multiline?: boolean;
  draftPath: string;
  readinessIds: string[];
  workSlug?: string;
  rendererVisible: boolean;
  provenance?: Provenance;
}

export type CanvasTextSize = "small" | "medium" | "large" | "feature";
export type CanvasTextWeight = "light" | "regular" | "bold";
export type CanvasTextColor = "ink" | "muted" | "paper" | "accent";
export type CanvasTextAlign = "left" | "center" | "right";
export type CanvasFontMood = "editorial" | "display" | "soft" | "mono" | "handwritten";

export interface CanvasTextStyle {
  size?: CanvasTextSize;
  weight?: CanvasTextWeight;
  color?: CanvasTextColor;
  align?: CanvasTextAlign;
  fontMood?: CanvasFontMood;
  italic?: boolean;
  underline?: boolean;
}

export interface CanvasImageCandidate {
  id: string;
  label: string;
  url: string;
  altText: string;
  sourceLabel: string;
  mediaId?: string;
  visibility?: string;
}

export interface CanvasWork {
  slug: string;
  title: string;
  caption: string;
  imageUrl: string;
  altText: string;
  isVisible: boolean;
  source: Record<string, unknown>;
}

export interface CanvasMoodPreset {
  id: string;
  label: string;
  description: string;
  swatch: string;
  palette: Record<string, string>;
  motion: Record<string, unknown>;
}

export interface CanvasMotionPreset {
  id: string;
  label: string;
  description: string;
  motion: Record<string, unknown>;
}

export const CANVAS_MOOD_PRESETS: CanvasMoodPreset[] = [
  {
    id: "paper",
    label: "Paper",
    description: "Quiet paper and gallery ink.",
    swatch: "linear-gradient(135deg,#f4f4f4,#e7e1d7)",
    palette: {
      bg: "#f4f4f4",
      paper: "#eceae7",
      paper_warm: "#e7e1d7",
      ink: "#111111",
      muted: "#6a6a6a",
      line: "#d7d2c8",
      hero_stage_bg: "#eaeaea",
      accent: "#b87938",
    },
    motion: {
      liquid_style: "ripple",
      liquid_intensity: 0.3,
      morph_speed_ms: 1250,
      scene_transition_duration_ms: 1100,
      distortion_scale: 0.35,
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
  {
    id: "ink",
    label: "Ink",
    description: "Dark ground and warm type.",
    swatch: "linear-gradient(135deg,#141414,#3c362e)",
    palette: {
      bg: "#141414",
      paper: "#23211d",
      paper_warm: "#2f2a23",
      ink: "#f7f1e7",
      muted: "#b7aa98",
      line: "#51483c",
      hero_stage_bg: "#191919",
      accent: "#dba963",
    },
    motion: {
      liquid_style: "glass",
      liquid_intensity: 0.22,
      morph_speed_ms: 1450,
      scene_transition_duration_ms: 1350,
      distortion_scale: 0.25,
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
  {
    id: "warm",
    label: "Warm",
    description: "Ochre paper and softer contrast.",
    swatch: "linear-gradient(135deg,#f3e6d2,#c08a58)",
    palette: {
      bg: "#efe4d4",
      paper: "#f4eadc",
      paper_warm: "#e6d2b9",
      ink: "#2c2119",
      muted: "#806754",
      line: "#d4b898",
      hero_stage_bg: "#eadbc7",
      accent: "#b56b38",
    },
    motion: {
      liquid_style: "ripple",
      liquid_intensity: 0.2,
      morph_speed_ms: 1350,
      scene_transition_duration_ms: 1250,
      distortion_scale: 0.22,
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
  {
    id: "liquid",
    label: "Liquid",
    description: "Cool water tones with gentle flow.",
    swatch: "linear-gradient(135deg,#e7efee,#95aca7)",
    palette: {
      bg: "#e8ece9",
      paper: "#dfe4df",
      paper_warm: "#d7ddd4",
      ink: "#111714",
      muted: "#5c6b63",
      line: "#b8c4bd",
      hero_stage_bg: "#dce6e2",
      accent: "#557f76",
    },
    motion: {
      liquid_style: "ripple",
      liquid_intensity: 0.45,
      morph_speed_ms: 1050,
      scene_transition_duration_ms: 1000,
      distortion_scale: 0.48,
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
];

export const CANVAS_MOTION_PRESETS: CanvasMotionPreset[] = [
  {
    id: "still",
    label: "Still",
    description: "Almost motionless.",
    motion: {
      liquid_intensity: 0,
      distortion_scale: 0,
      morph_speed_ms: 1500,
      scene_transition_duration_ms: 250,
      transition_style: "cut",
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
  {
    id: "gentle",
    label: "Gentle",
    description: "Soft transitions.",
    motion: {
      liquid_style: "ripple",
      liquid_intensity: 0.22,
      distortion_scale: 0.22,
      morph_speed_ms: 1350,
      scene_transition_duration_ms: 1200,
      transition_style: "liquid_crossfade",
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
  {
    id: "living",
    label: "Living",
    description: "More presence, still comfortable.",
    motion: {
      liquid_style: "ripple",
      liquid_intensity: 0.48,
      distortion_scale: 0.52,
      morph_speed_ms: 1000,
      scene_transition_duration_ms: 950,
      transition_style: "liquid_crossfade",
      heavy_motion_enabled: false,
      reduced_motion_fallback: true,
    },
  },
];

const FIXED_ELEMENTS: CanvasElement[] = [
  textElement("hero-title", "Room title", "artwork", "scene_config.scenes[artwork_field].title", ["missing-title"], false),
  textElement("hero-caption", "Room caption", "artwork", "scene_config.scenes[artwork_field].statement", [], false),
  textElement("main-statement", "Statement", "practice", "content_config.about.artist_statement", [], true),
  imageElement("hero-image", "Cover image", "artwork", "asset_config.hero_image", ["missing-primary-image", "missing-hero-alt"]),
  {
    canvasId: "work-wall",
    label: "Work wall",
    kind: "work-wall",
    scene: "wall",
    controls: ["reorder"],
    draftPath: "asset_config.artworks + scene_config.scenes[work_wall].artwork_order",
    readinessIds: ["empty-work-wall"],
    rendererVisible: true,
  },
  textElement("practice-title", "About title", "practice", "scene_config.scenes[practice_studio].about_title", [], false),
  textElement("biography", "Biography", "practice", "content_config.about.biography", [], true),
  textElement("process-notes", "Process notes", "practice", "content_config.about.process_notes", [], true),
  textElement("calling-title", "Invitation title", "invitation", "content_config.contact.contact_title", [], false),
  textElement("calling-body", "Invitation body", "invitation", "content_config.contact.contact_copy", [], true),
  textElement("invitation-cta", "Invitation button", "invitation", "enquiry_config.cta_label", ["missing-primary-cta"], false),
];

export function buildCanvasRegistry(config: PresenceEditableConfig, node: PresenceNode): CanvasElement[] {
  const works = getCanvasWorks(config, node);
  const dynamic = works.flatMap((work) => [
    {
      canvasId: `work-image:${work.slug}`,
      label: `${work.title || "Work"} image`,
      kind: "image" as const,
      scene: "wall" as const,
      controls: ["image", "alt-text", "reorder"] as CanvasControl[],
      draftPath: `asset_config.artworks[${work.slug}].url`,
      readinessIds: [`missing-alt-${work.slug}`],
      workSlug: work.slug,
      rendererVisible: true,
    },
    {
      canvasId: `work-title:${work.slug}`,
      label: `${work.title || "Work"} title`,
      kind: "text" as const,
      scene: "wall" as const,
      controls: ["edit", "reorder"] as CanvasControl[],
      draftPath: `asset_config.artworks[${work.slug}].title`,
      readinessIds: [],
      workSlug: work.slug,
      rendererVisible: true,
    },
    {
      canvasId: `work-caption:${work.slug}`,
      label: `${work.title || "Work"} caption`,
      kind: "text" as const,
      scene: "wall" as const,
      controls: ["edit"] as CanvasControl[],
      multiline: true,
      draftPath: `asset_config.artworks[${work.slug}].caption`,
      readinessIds: [],
      workSlug: work.slug,
      rendererVisible: true,
    },
  ]);
  return [...FIXED_ELEMENTS, ...dynamic];
}

export function buildCanvasRegistryFromRenderModel(model: PresenceRenderModel): CanvasElement[] {
  const widgets = model.scenes.flatMap((scene) => scene.widgets);
  const fixed = FIXED_ELEMENTS.map((element) => ({
    ...element,
    provenance: widgets.find((widget) => widget.id === element.canvasId)?.provenance ?? "canonical",
  }));
  const dynamic = model.works.filter((work) => work.visible).flatMap((work) => [
    {
      canvasId: `work-image:${work.slug}`,
      label: `${work.title || "Work"} image`,
      kind: "image" as const,
      scene: "wall" as const,
      controls: ["image", "alt-text", "reorder"] as CanvasControl[],
      draftPath: `asset_config.artworks[${work.slug}].url`,
      readinessIds: [`missing-alt-${work.slug}`],
      workSlug: work.slug,
      rendererVisible: true,
    },
    {
      canvasId: `work-title:${work.slug}`,
      label: `${work.title || "Work"} title`,
      kind: "text" as const,
      scene: "wall" as const,
      controls: ["edit", "style", "reorder"] as CanvasControl[],
      draftPath: `asset_config.artworks[${work.slug}].title`,
      readinessIds: [],
      workSlug: work.slug,
      rendererVisible: true,
    },
    {
      canvasId: `work-caption:${work.slug}`,
      label: `${work.title || "Work"} caption`,
      kind: "text" as const,
      scene: "wall" as const,
      controls: ["edit", "style"] as CanvasControl[],
      multiline: true,
      draftPath: `asset_config.artworks[${work.slug}].caption`,
      readinessIds: [],
      workSlug: work.slug,
      rendererVisible: true,
    },
  ]);
  return [...fixed, ...dynamic];
}

export function getResolvedCanvasText(model: PresenceRenderModel, canvasId: string): string {
  const dynamic = splitDynamicId(canvasId);
  if (dynamic) {
    const work = model.works.find((item) => item.slug === dynamic.slug);
    return dynamic.kind === "work-title" ? work?.title ?? "" : dynamic.kind === "work-caption" ? work?.description ?? "" : "";
  }
  const widget = widgetById(model, canvasId);
  const config = record(widget?.config);
  if (canvasId === "calling-body") return text(config.copy);
  if (canvasId === "invitation-cta") return text(config.label);
  return text(config.text);
}

export function getResolvedCanvasImage(model: PresenceRenderModel, canvasId: string): { url: string; altText: string } {
  if (canvasId === "hero-image") {
    const asset = record(record(widgetById(model, canvasId)?.config).asset);
    return { url: text(asset.url), altText: text(asset.altText) };
  }
  const dynamic = splitDynamicId(canvasId);
  const work = dynamic?.kind === "work-image" ? model.works.find((item) => item.slug === dynamic.slug) : null;
  return { url: work?.asset.url ?? "", altText: work?.asset.altText ?? "" };
}

export function getResolvedCanvasWorks(model: PresenceRenderModel): CanvasWork[] {
  return model.works.map((work) => ({
    slug: work.slug,
    title: work.title,
    caption: work.description,
    imageUrl: work.asset.url,
    altText: work.asset.altText,
    isVisible: work.visible,
    source: {},
  }));
}

export function resolvedCanvasTextCss(model: PresenceRenderModel, canvasId: string): CSSProperties {
  const palette = Object.fromEntries(
    Object.entries(model.palette).map(([key, value]) => [key === "stage" ? "hero_stage_bg" : key, value.value]),
  );
  const heading = canvasId === "hero-title" || canvasId === "practice-title" || canvasId === "calling-title" ||
    canvasId === "invitation-cta" || canvasId.startsWith("work-title:");
  const elementStyle = textStyleCss(model.elementStyles[canvasId] ?? {}, palette);
  return {
    ...elementStyle,
    fontFamily: elementStyle.fontFamily ?? (heading ? model.typography.headingFamily.value : model.typography.bodyFamily.value),
  };
}

function widgetById(model: PresenceRenderModel, id: string): WidgetInstance | undefined {
  return model.scenes.flatMap((scene) => scene.widgets).find((widget) => widget.id === id);
}

export function getCanvasText(config: PresenceEditableConfig, node: PresenceNode, canvasId: string): string {
  switch (canvasId) {
    case "hero-title":
      return sceneText(config, "artwork_field", "title") || node.hero_title || node.display_name;
    case "hero-caption":
      return sceneText(config, "artwork_field", "statement") || node.headline || "";
    case "main-statement":
      return contentText(config, ["about", "artist_statement"]) || node.practice_statement || "";
    case "practice-title":
      return sceneText(config, "practice_studio", "about_title") || "Practice Studio";
    case "biography":
      return contentText(config, ["about", "biography"]) || node.bio || node.short_bio || "";
    case "process-notes":
      return contentText(config, ["about", "process_notes"]) || node.long_story || "";
    case "calling-title":
      return contentText(config, ["contact", "contact_title"]) || "Calling Card";
    case "calling-body":
      return contentText(config, ["contact", "contact_copy"]) || "";
    case "invitation-cta":
      return text(record(config.enquiry_config).cta_label) || node.primary_cta_label || "Begin a conversation";
    default: {
      const workId = splitDynamicId(canvasId);
      const work = workId ? getCanvasWorks(config, node).find((item) => item.slug === workId.slug) : null;
      if (!work || !workId) return "";
      return workId.kind === "work-title" ? work.title : workId.kind === "work-caption" ? work.caption : "";
    }
  }
}

export function updateCanvasText(config: PresenceEditableConfig, canvasId: string, value: string): PresenceEditableConfig {
  const nextValue = value.trim();
  switch (canvasId) {
    case "hero-title":
      return setSceneText(config, "artwork_field", "title", nextValue);
    case "hero-caption":
      return setSceneText(config, "artwork_field", "statement", nextValue);
    case "main-statement":
      return setContentText(config, ["about", "artist_statement"], nextValue);
    case "practice-title":
      return setSceneText(config, "practice_studio", "about_title", nextValue);
    case "biography":
      return setContentText(config, ["about", "biography"], nextValue);
    case "process-notes":
      return setContentText(config, ["about", "process_notes"], nextValue);
    case "calling-title":
      return setContentText(config, ["contact", "contact_title"], nextValue);
    case "calling-body":
      return setContentText(config, ["contact", "contact_copy"], nextValue);
    case "invitation-cta":
      return {
        ...config,
        enquiry_config: { ...record(config.enquiry_config), cta_label: nextValue },
      };
    default: {
      const target = splitDynamicId(canvasId);
      if (!target || (target.kind !== "work-title" && target.kind !== "work-caption")) return config;
      return updateWork(config, target.slug, target.kind === "work-title" ? "title" : "caption", nextValue);
    }
  }
}

export function getCanvasImage(
  config: PresenceEditableConfig,
  node: PresenceNode,
  canvasId: string,
): { url: string; altText: string } {
  if (canvasId === "hero-image") {
    const hero = record(record(config.asset_config).hero_image);
    return {
      url: text(hero.url) || node.hero_image_url || node.cover_image_url || "",
      altText: text(hero.alt_text),
    };
  }
  const target = splitDynamicId(canvasId);
  const work = target?.kind === "work-image"
    ? getCanvasWorks(config, node).find((item) => item.slug === target.slug)
    : null;
  return { url: work?.imageUrl ?? "", altText: work?.altText ?? "" };
}

export function replaceCanvasImage(
  config: PresenceEditableConfig,
  canvasId: string,
  url: string,
  altText: string,
  mediaId?: string,
): PresenceEditableConfig {
  if (canvasId === "hero-image") {
    const current = record(record(config.asset_config).hero_image);
    const { media_id: _previousMediaId, visibility: _previousVisibility, status: _previousStatus, ...rest } = current;
    return {
      ...config,
      asset_config: {
        ...record(config.asset_config),
        hero_image: {
          ...rest,
          url,
          alt_text: altText.trim(),
          ...(mediaId ? { media_id: mediaId } : {}),
        },
      },
    };
  }
  const target = splitDynamicId(canvasId);
  if (!target || target.kind !== "work-image") return config;
  return updateWork(config, target.slug, "media", {
    url,
    alt_text: altText.trim(),
    ...(mediaId ? { media_id: mediaId } : {}),
  });
}

export function updateCanvasAltText(
  config: PresenceEditableConfig,
  canvasId: string,
  altText: string,
): PresenceEditableConfig {
  if (canvasId === "hero-image") {
    const hero = record(record(config.asset_config).hero_image);
    return {
      ...config,
      asset_config: {
        ...record(config.asset_config),
        hero_image: { ...hero, alt_text: altText.trim() },
      },
    };
  }
  const target = splitDynamicId(canvasId);
  return target?.kind === "work-image"
    ? updateWork(config, target.slug, "alt_text", altText.trim())
    : config;
}

export function getCanvasWorks(config: PresenceEditableConfig, node: PresenceNode): CanvasWork[] {
  const assetWorks = records(record(config.asset_config).artworks);
  const contentWorks = records(record(config.content_config).works);
  const source: Record<string, unknown>[] = assetWorks.length > 0
    ? assetWorks
    : contentWorks.length > 0
      ? contentWorks
      : (node.works ?? []).map((work) => ({ ...work }) as unknown as Record<string, unknown>);
  return source.map((row, index) => ({
    slug: text(row.slug) || String(row.id ?? `work-${index + 1}`),
    title: text(row.title) || "Untitled work",
    caption: text(row.caption) || text(row.description),
    imageUrl: text(row.url) || text(row.image_url) || text(row.thumbnail_url),
    altText: text(row.alt_text) || text(row.alt),
    isVisible: row.is_visible !== false,
    source: { ...row },
  }));
}

export function reorderCanvasWorks(
  config: PresenceEditableConfig,
  node: PresenceNode,
  orderedSlugs: string[],
): PresenceEditableConfig {
  const works = getCanvasWorks(config, node);
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  const seen = new Set<string>();
  const ordered: CanvasWork[] = [];
  for (const slug of orderedSlugs) {
    const work = bySlug.get(slug);
    if (work && !seen.has(slug)) {
      ordered.push(work);
      seen.add(slug);
    }
  }
  for (const work of works) {
    if (!seen.has(work.slug)) ordered.push(work);
  }
  return writeWorks(config, ordered);
}

export function getCanvasTextStyle(config: PresenceEditableConfig, canvasId: string): CanvasTextStyle {
  const styles = record(record(config.style_dna).element_styles);
  const style = record(styles[canvasId]);
  return {
    size: valid(style.size, ["small", "medium", "large", "feature"]),
    weight: valid(style.weight, ["light", "regular", "bold"]),
    color: valid(style.color, ["ink", "muted", "paper", "accent"]),
    align: valid(style.align, ["left", "center", "right"]),
    fontMood: valid(style.font_mood, ["editorial", "display", "soft", "mono"]),
    italic: style.italic === true,
    underline: style.underline === true,
  };
}

export function updateCanvasTextStyle(
  config: PresenceEditableConfig,
  canvasId: string,
  partial: Partial<CanvasTextStyle>,
): PresenceEditableConfig {
  const styleDna = record(config.style_dna);
  const elementStyles = record(styleDna.element_styles);
  const current = record(elementStyles[canvasId]);
  const serialised: Record<string, unknown> = { ...current };
  const artworkOverlay = canvasId === "hero-title" || canvasId === "hero-caption";
  if (partial.size) serialised.size = partial.size;
  if (partial.weight) serialised.weight = partial.weight;
  if (artworkOverlay) delete serialised.color;
  else if (partial.color) serialised.color = partial.color;
  if (partial.align) serialised.align = partial.align;
  if (partial.fontMood) serialised.font_mood = partial.fontMood;
  if (typeof partial.italic === "boolean") serialised.italic = partial.italic;
  if (typeof partial.underline === "boolean") serialised.underline = partial.underline;
  return {
    ...config,
    style_dna: {
      ...styleDna,
      element_styles: { ...elementStyles, [canvasId]: serialised },
    },
  };
}

export function canvasTextCss(config: PresenceEditableConfig, canvasId: string): CSSProperties {
  return textStyleCss(getCanvasTextStyle(config, canvasId), record(record(config.style_dna).palette));
}

export function textStyleCss(style: CanvasTextStyle, palette: Record<string, unknown>): CSSProperties {
  const size = style.size ? {
    small: "0.9rem",
    medium: "1.05rem",
    large: "1.45rem",
    feature: "clamp(2.4rem, 4.5vw, 5rem)",
  }[style.size] : undefined;
  const weight = style.weight ? { light: 300, regular: 400, bold: 700 }[style.weight] : undefined;
  const color = style.color ? {
    ink: text(palette.ink) || "#111111",
    muted: text(palette.muted) || "#6a6a6a",
    paper: text(palette.paper) || "#eceae7",
    accent: text(palette.accent) || "#b87938",
  }[style.color] : undefined;
  const fontFamily = style.fontMood ? {
    editorial: "Georgia, 'Times New Roman', serif",
    display: "'Helvetica Neue', Arial, sans-serif",
    soft: "Georgia, 'Times New Roman', serif",
    mono: "'Cascadia Mono', 'Courier New', monospace",
    handwritten: "'Segoe Print', 'Bradley Hand', cursive",
  }[style.fontMood] : undefined;
  return {
    fontSize: size,
    fontWeight: weight,
    color,
    textAlign: style.align,
    fontFamily,
    fontStyle: style.italic ? "italic" : undefined,
    textDecoration: style.underline ? "underline" : undefined,
  };
}

export function applyCanvasMood(config: PresenceEditableConfig, preset: CanvasMoodPreset): PresenceEditableConfig {
  const styleDna = record(config.style_dna);
  return {
    ...config,
    style_dna: {
      ...styleDna,
      canvas_mood: preset.id,
      palette: { ...record(styleDna.palette), ...preset.palette },
    },
    motion_config: { ...record(config.motion_config), ...preset.motion },
  };
}

export function applyCanvasMotion(config: PresenceEditableConfig, preset: CanvasMotionPreset): PresenceEditableConfig {
  return { ...config, motion_config: { ...record(config.motion_config), ...preset.motion } };
}

export function activeMoodId(config: PresenceEditableConfig): string {
  return text(record(config.style_dna).canvas_mood) || "paper";
}

export function activeMotionId(config: PresenceEditableConfig): string {
  const intensity = Number(record(config.motion_config).liquid_intensity ?? 0);
  return intensity <= 0.05 ? "still" : intensity <= 0.32 ? "gentle" : "living";
}

export function canvasTargetForIssue(issue: ReadinessIssue, config: PresenceEditableConfig, node: PresenceNode): string | null {
  const direct: Record<string, string> = {
    "missing-title": "hero-title",
    "missing-primary-image": "hero-image",
    "missing-primary-cta": "invitation-cta",
    "missing-hero-alt": "hero-image",
    "empty-work-wall": "work-wall",
    "heavy-motion-enabled": "motion",
  };
  if (direct[issue.id]) return direct[issue.id];
  if (issue.id.startsWith("missing-alt-")) {
    const missing = getCanvasWorks(config, node).find((work) => work.imageUrl && !work.altText);
    return missing ? `work-image:${missing.slug}` : "work-wall";
  }
  if (issue.id.startsWith("unsafe-asset-")) {
    const hero = getCanvasImage(config, node, "hero-image");
    if (hero.url && !validateAssetUrl(hero.url).isValid) return "hero-image";
    const unsafeWork = getCanvasWorks(config, node).find(
      (work) => work.imageUrl && !validateAssetUrl(work.imageUrl).isValid,
    );
    return unsafeWork ? `work-image:${unsafeWork.slug}` : "hero-image";
  }
  return null;
}

export function buildCanvasImageCandidates(
  config: PresenceEditableConfig,
  node: PresenceNode,
  assets: PresenceEditorAsset[],
  canonical: CanonicalAssetBundle | null,
): CanvasImageCandidate[] {
  const candidates: CanvasImageCandidate[] = [];
  const hero = getCanvasImage(config, node, "hero-image");
  add(hero.url, hero.altText || "Current cover", "This room");
  for (const work of getCanvasWorks(config, node)) add(work.imageUrl, work.altText || work.title, "This room");
  for (const asset of assets) {
    add(asset.url, asset.alt_text || "Attached image", "Attached images", asset.media_id ?? undefined, asset.visibility ?? undefined);
  }
  if (canonical) {
    if (canonical.hero) add(canonical.hero.url, canonical.hero.alt_text, "Live room images");
    for (const work of canonical.artworks) add(work.url, work.alt_text, "Live room images");
  }
  return candidates;

  function add(url: string, label: string, sourceLabel: string, mediaId?: string, visibility?: string) {
    const cleanUrl = text(url);
    if (!cleanUrl || !validateAssetUrl(cleanUrl).isValid || candidates.some((candidate) => candidate.url === cleanUrl)) return;
    candidates.push({
      id: `candidate-${candidates.length + 1}`,
      label: label || "Room image",
      url: cleanUrl,
      altText: label || "",
      sourceLabel,
      mediaId,
      visibility,
    });
  }
}

function textElement(
  canvasId: string,
  label: string,
  scene: CanvasSceneId,
  draftPath: string,
  readinessIds: string[],
  multiline: boolean,
): CanvasElement {
  return {
    canvasId,
    label,
    kind: "text",
    scene,
    controls: ["edit", "style"],
    multiline,
    draftPath,
    readinessIds,
    rendererVisible: true,
  };
}

function imageElement(canvasId: string, label: string, scene: CanvasSceneId, draftPath: string, readinessIds: string[]): CanvasElement {
  return {
    canvasId,
    label,
    kind: "image",
    scene,
    controls: ["image", "alt-text"],
    draftPath,
    readinessIds,
    rendererVisible: true,
  };
}

function updateWork(config: PresenceEditableConfig, slug: string, field: string, value: unknown): PresenceEditableConfig {
  const rawWorks = records(record(config.asset_config).artworks).length > 0
    ? records(record(config.asset_config).artworks)
    : records(record(config.content_config).works);
  const next = rawWorks.map((work) => {
    if (text(work.slug) !== slug) return work;
    if (field === "media") {
      const media = value as { url: string; alt_text: string };
      return { ...work, url: media.url, image_url: media.url, thumbnail_url: media.url, alt_text: media.alt_text };
    }
    return { ...work, [field]: value };
  });
  return writeRawWorks(config, next);
}

function writeWorks(config: PresenceEditableConfig, works: CanvasWork[]): PresenceEditableConfig {
  return writeRawWorks(
    config,
    works.map((work, index) => ({ ...work.source, slug: work.slug, sort_order: index + 1 })),
  );
}

function writeRawWorks(config: PresenceEditableConfig, works: Record<string, unknown>[]): PresenceEditableConfig {
  const sceneConfig = record(config.scene_config);
  const scenes = records(sceneConfig.scenes).map((scene) =>
    text(scene.id) === "work_wall"
      ? { ...scene, artwork_order: works.map((work) => text(work.slug)).filter(Boolean) }
      : scene,
  );
  return {
    ...config,
    asset_config: { ...record(config.asset_config), artworks: works },
    content_config: { ...record(config.content_config), works },
    scene_config: { ...sceneConfig, scenes },
  };
}

function setSceneText(config: PresenceEditableConfig, sceneId: string, field: string, value: string): PresenceEditableConfig {
  const sceneConfig = record(config.scene_config);
  const scenes = records(sceneConfig.scenes);
  const index = scenes.findIndex((scene) => text(scene.id) === sceneId);
  const next = scenes.slice();
  if (index >= 0) next[index] = { ...next[index], [field]: value };
  else next.push({ id: sceneId, [field]: value });
  return { ...config, scene_config: { ...sceneConfig, scenes: next } };
}

function setContentText(config: PresenceEditableConfig, path: string[], value: string): PresenceEditableConfig {
  const next = { ...record(config.content_config) };
  let current = next;
  for (const key of path.slice(0, -1)) {
    const child = { ...record(current[key]) };
    current[key] = child;
    current = child;
  }
  current[path[path.length - 1]] = value;
  return { ...config, content_config: next };
}

function sceneText(config: PresenceEditableConfig, sceneId: string, field: string): string {
  return text(records(record(config.scene_config).scenes).find((scene) => text(scene.id) === sceneId)?.[field]);
}

function contentText(config: PresenceEditableConfig, path: string[]): string {
  let current: unknown = config.content_config;
  for (const key of path) current = record(current)[key];
  return text(current);
}

function splitDynamicId(canvasId: string): { kind: string; slug: string } | null {
  const separator = canvasId.indexOf(":");
  if (separator < 0) return null;
  return { kind: canvasId.slice(0, separator), slug: canvasId.slice(separator + 1) };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function valid<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.includes(value as T) ? value as T : undefined;
}
