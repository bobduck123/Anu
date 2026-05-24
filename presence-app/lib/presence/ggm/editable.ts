import type { CSSProperties } from "react";
import type { PresenceEditableConfig, PresenceNode, PresenceWork } from "@/lib/api/types";
import type { GgmMotionSettings } from "@/components/presence/ggm/GgmMotionContext";
import type { LiquidStyle } from "@/components/presence/ggm/GgmLiquidCanvas";
import {
  GGM_ARTIST,
  GGM_HERO_SEQUENCE,
  GGM_INSPIRE,
  GGM_STRANDS,
  GGM_WORKS,
  type GgmArtist,
  type GgmWork,
  type InspireCard,
} from "./source";
import { textStyleCss } from "@/lib/editor/canvasModel";

export interface GgmEditableModel {
  config: PresenceEditableConfig | null;
  artist: GgmArtist;
  works: GgmWork[];
  heroSlides: GgmWork[];
  wallWorks: GgmWork[];
  copy: {
    brand: string;
    artworkTitle: string;
    artworkCaption: string;
    artworkIntro: string;
    artworkAdvanceLabel: string;
    wallTitle: string;
    wallLead: string;
    aboutIntro: string;
    aboutBody: string;
    processNotes: string;
    practiceTitle: string;
    callingTitle: string;
    callingCopy: string;
    enquiryCta: string;
  };
  practice: {
    strands: Array<{ title: string; body: string }>;
    inspire: InspireCard[];
  };
  contact: {
    externalLink: { label: string; href: string } | null;
    availability: string | null;
    showDirectEmail: boolean;
  };
  roomKey: {
    provenanceChipText: string | null;
    guestEntryCopy: string | null;
  };
  motion: Partial<GgmMotionSettings>;
  styleVars: CSSProperties;
  elementStyles: Record<string, CSSProperties>;
}

export function buildGgmEditableModel(node: PresenceNode): GgmEditableModel {
  const config = publicEditableConfig(node);
  const content = record(config?.content_config);
  const about = record(content.about);
  const contact = record(content.contact);
  const sceneConfig = record(config?.scene_config);
  const styleDna = record(config?.style_dna);
  const roomkey = record(config?.roomkey_config);
  const enquiry = record(config?.enquiry_config);
  const scenes = arrayRecords(sceneConfig.scenes);
  const artworkScene = sceneById(scenes, "artwork_field");
  const wallScene = sceneById(scenes, "work_wall");
  const practiceScene = sceneById(scenes, "practice_studio");
  const callingScene = sceneById(scenes, "calling_card");
  const works = buildWorks(node, config);
  const heroSlides = applyHeroImage(buildHeroSlides(works, artworkScene), record(config?.asset_config));
  const artist = buildArtist(node, content, about);
  const contactPosture = text(contact.contact_posture) || "legacy_public_email";

  return {
    config,
    artist,
    works,
    heroSlides,
    wallWorks: works,
    copy: {
      brand: text(content.display_name) || node.display_name || GGM_ARTIST.name,
      artworkTitle: text(artworkScene.title) || text(content.hero_title) || GGM_ARTIST.heroTitle,
      artworkCaption:
        text(artworkScene.statement) ||
        text(content.headline) ||
        node.headline ||
        GGM_ARTIST.heroCaption,
      artworkIntro:
        text(artworkScene.intro_copy) ||
        text(content.hero_subtitle) ||
        node.short_bio ||
        node.bio ||
        GGM_ARTIST.aboutIntro,
      artworkAdvanceLabel: text(record(artworkScene.action_labels).work_advance) || "Show next artwork",
      wallTitle: text(wallScene.title) || "A viewing tray of selected watercolour works.",
      wallLead:
        text(wallScene.lead) ||
        "Hung in chronological pockets. Scroll the tray to walk the wall. Tap any plate for the work's room.",
      aboutIntro:
        text(about.biography) ||
        text(about.bio) ||
        node.bio ||
        node.short_bio ||
        GGM_ARTIST.aboutIntro,
      aboutBody:
        text(about.artist_statement) ||
        text(about.practice_statement) ||
        node.long_story ||
        GGM_ARTIST.aboutBody,
      processNotes: text(about.process_notes),
      practiceTitle: text(practiceScene.about_title) || "Practice Studio",
      callingTitle: text(contact.contact_title) || text(callingScene.contact_title) || "Calling Card",
      callingCopy: text(contact.contact_copy) || "Use the Presence enquiry form to begin a conversation.",
      enquiryCta:
        text(enquiry.cta_label) ||
        text(callingScene.enquiry_cta) ||
        text(record(artworkScene.action_labels).primary) ||
        node.primary_cta_label ||
        "Begin a conversation",
    },
    practice: {
      strands: buildStrands(about),
      inspire: GGM_INSPIRE,
    },
    contact: {
      externalLink: pickEditableExternalLink(contact),
      availability: text(contact.availability_status) || text(enquiry.availability_status) || node.availability_status || null,
      showDirectEmail: !config || contactPosture === "legacy_public_email" || contactPosture === "direct_email_public",
    },
    roomKey: {
      provenanceChipText:
        text(roomkey.provenance_chip_text) ||
        text(artworkScene.roomkey_provenance_text) ||
        null,
      guestEntryCopy: text(roomkey.guest_entry_copy) || null,
    },
    motion: buildMotion(config),
    styleVars: buildStyleVars(styleDna),
    elementStyles: buildElementStyles(styleDna, works),
  };
}

export function publicEditableConfig(node: PresenceNode): PresenceEditableConfig | null {
  const config = node.editable_config;
  if (!config || config.status !== "published") return null;
  return config;
}

function buildWorks(node: PresenceNode, config: PresenceEditableConfig | null): GgmWork[] {
  const content = record(config?.content_config);
  const assetConfig = record(config?.asset_config);
  const wallScene = sceneById(arrayRecords(record(config?.scene_config).scenes), "work_wall");
  const editableRows = arrayRecords(assetConfig.artworks).length > 0
    ? arrayRecords(assetConfig.artworks)
    : arrayRecords(content.works);
  const backendWorks = (node.works ?? []).filter((work) => work.is_visible !== false);
  const source = editableRows.length > 0
    ? editableRows.filter((row) => row.is_visible !== false)
    : backendWorks.length > 0
      ? backendWorks.map((work, idx) => workToRecord(work, idx))
      : GGM_WORKS.map((work, idx) => ({ ...work, sort_order: idx + 1 }));
  const works = source.map((row, idx) => coerceWork(row, idx));
  return orderWorks(works, arrayStrings(wallScene.artwork_order));
}

function workToRecord(work: PresenceWork, index: number): Record<string, unknown> {
  return {
    id: work.id,
    slug: work.slug ?? String(work.id ?? index + 1),
    title: work.title,
    year: work.year,
    medium: work.medium,
    dimensions: work.dimensions,
    description: work.description,
    image_url: work.image_url,
    thumbnail_url: work.thumbnail_url,
    alt_text: work.title,
    sort_order: work.sort_order ?? index + 1,
    is_visible: work.is_visible !== false,
  };
}

function coerceWork(row: Record<string, unknown>, idx: number): GgmWork {
  const slug = text(row.slug) || slugify(text(row.title) || `work-${idx + 1}`);
  const matched = GGM_WORKS.find((work) => work.slug === slug || work.title.toLowerCase() === text(row.title).toLowerCase());
  const title = text(row.title) || matched?.title || "Untitled";
  const image = text(row.url) || text(row.image_url) || matched?.image || "/ggm/works/willow-of-port-arthur-2019.webp";
  const thumb = text(row.thumbnail_url) || text(row.thumb) || image || matched?.thumb || "/ggm/thumbs/willow-of-port-arthur-2019.webp";
  return {
    id: text(row.id) || matched?.id || slug,
    slug,
    title,
    year: Number(row.year ?? matched?.year ?? 0) || 0,
    medium: text(row.medium) || matched?.medium || "Watercolour on paper",
    dimensions: text(row.dimensions) || matched?.dimensions || "Unknown",
    image,
    thumb,
    alt: text(row.alt_text) || text(row.alt) || matched?.alt || title,
    description: text(row.caption) || text(row.description) || matched?.description || "",
    context: text(row.context) || matched?.context || "",
    process: text(row.process) || matched?.process || "",
    memory: text(row.memory) || matched?.memory || "",
    moodTags: Array.isArray(row.moodTags) ? row.moodTags.map(text).filter(Boolean) : matched?.moodTags ?? [],
  };
}

function orderWorks(works: GgmWork[], order: string[]): GgmWork[] {
  if (order.length === 0) return works;
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  const ordered = order.map((slug) => bySlug.get(slug)).filter((work): work is GgmWork => Boolean(work));
  const seen = new Set(ordered.map((work) => work.slug));
  return [...ordered, ...works.filter((work) => !seen.has(work.slug))];
}

function buildHeroSlides(works: GgmWork[], artworkScene: Record<string, unknown>): GgmWork[] {
  const sequence = arrayStrings(artworkScene.hero_sequence);
  const primary = text(artworkScene.primary_artwork_slug);
  const requested = primary ? [primary, ...sequence.filter((slug) => slug !== primary)] : sequence;
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  const ordered = requested.map((slug) => bySlug.get(slug)).filter((work): work is GgmWork => Boolean(work));
  if (ordered.length > 0) {
    const seen = new Set(ordered.map((work) => work.slug));
    return [...ordered, ...works.filter((work) => !seen.has(work.slug))];
  }
  const defaultOrder = GGM_HERO_SEQUENCE.map((hero) => works.find((work) => work.slug === hero.slug)).filter((work): work is GgmWork => Boolean(work));
  const seen = new Set(defaultOrder.map((work) => work.slug));
  return [...defaultOrder, ...works.filter((work) => !seen.has(work.slug))];
}

function applyHeroImage(slides: GgmWork[], assetConfig: Record<string, unknown>): GgmWork[] {
  const hero = record(assetConfig.hero_image);
  const url = text(hero.url);
  if (!url || slides.length === 0) return slides;
  return [
    {
      ...slides[0],
      image: url,
      thumb: url,
      alt: text(hero.alt_text) || slides[0].alt,
    },
    ...slides.slice(1),
  ];
}

function buildArtist(node: PresenceNode, content: Record<string, unknown>, about: Record<string, unknown>): GgmArtist {
  const timeline = arrayRecords(about.timeline)
    .map((item) => ({ when: text(item.when), what: text(item.what) }))
    .filter((item) => item.when || item.what);
  return {
    ...GGM_ARTIST,
    name: text(content.display_name) || node.display_name || GGM_ARTIST.name,
    subtitle: text(content.headline) || node.headline || GGM_ARTIST.subtitle,
    location: text(record(content.contact).location_label) || node.location_label || GGM_ARTIST.location,
    heroTitle: text(content.hero_title) || GGM_ARTIST.heroTitle,
    heroCaption: text(content.hero_subtitle) || node.headline || GGM_ARTIST.heroCaption,
    aboutIntro: text(about.biography) || node.bio || GGM_ARTIST.aboutIntro,
    aboutBody: text(about.artist_statement) || text(about.process_notes) || node.long_story || GGM_ARTIST.aboutBody,
    statementQuote: text(about.artist_statement) || node.practice_statement || GGM_ARTIST.statementQuote,
    timeline: timeline.length > 0 ? timeline : GGM_ARTIST.timeline,
  };
}

function buildStrands(about: Record<string, unknown>) {
  const strands = arrayRecords(about.strands)
    .map((item) => ({ title: text(item.title), body: text(item.body) }))
    .filter((item) => item.title || item.body);
  if (strands.length > 0) return strands;
  const fragments = Array.isArray(about.studio_fragments) ? about.studio_fragments.map(text).filter(Boolean) : [];
  if (fragments.length > 0) return fragments.map((fragment) => ({ title: fragment, body: "" }));
  return GGM_STRANDS;
}

function pickEditableExternalLink(contact: Record<string, unknown>): { label: string; href: string } | null {
  const links = arrayRecords(contact.external_links);
  const link = links.find((item) => {
    const url = text(item.url);
    return /^https?:\/\//i.test(url) && !/localhost|127\.0\.0\.1|\.local|\.internal/i.test(url);
  });
  if (!link) return null;
  return { label: text(link.label) || prettyHost(text(link.url)) || "External", href: text(link.url) };
}

function buildMotion(config: PresenceEditableConfig | null): Partial<GgmMotionSettings> {
  const motion = record(config?.motion_config);
  const style = text(motion.liquid_style) || text(motion.transition_style);
  const liquidStyle: LiquidStyle = style === "glass" || style === "dissolve" || style === "cut" ? style : "ripple";
  return {
    liquidStyle,
    liquidIntensity: numberOr(motion.liquid_intensity, undefined),
    liquidDistortion: numberOr(motion.distortion_scale, undefined),
    liquidDurationMs: numberOr(motion.morph_speed_ms ?? motion.scene_transition_duration_ms, undefined),
    ditherStrength: numberOr(motion.dither_strength, undefined),
    filmGrainStrength: numberOr(motion.film_grain_strength, undefined),
    blurAmount: numberOr(motion.blur_amount, undefined),
    parallaxDepth: numberOr(motion.parallax_depth, undefined),
    customCursor: booleanOr(motion.custom_cursor_enabled, undefined),
    heavyMotion: booleanOr(motion.heavy_motion_enabled, undefined),
  };
}

function buildStyleVars(styleDna: Record<string, unknown>): CSSProperties {
  const palette = record(styleDna.palette);
  const typography = record(styleDna.typography);
  const vars: Record<string, string> = {};
  setVar(vars, "--ggm-bg", text(palette.bg));
  setVar(vars, "--ggm-paper", text(palette.paper));
  setVar(vars, "--ggm-paper-soft", text(palette.paper_soft));
  setVar(vars, "--ggm-paper-warm", text(palette.paper_warm));
  setVar(vars, "--ggm-ink", text(palette.ink));
  setVar(vars, "--ggm-muted", text(palette.muted));
  setVar(vars, "--ggm-line", text(palette.line));
  setVar(vars, "--ggm-stage", text(palette.hero_stage_bg));
  setVar(vars, "--ggm-display-family", text(typography.heading_stack));
  setVar(vars, "--ggm-body-family", text(typography.body_stack));
  return vars as CSSProperties;
}

function buildElementStyles(styleDna: Record<string, unknown>, works: GgmWork[]): Record<string, CSSProperties> {
  const configured = record(styleDna.element_styles);
  const palette = record(styleDna.palette);
  const ids = [
    "hero-title",
    "hero-caption",
    "main-statement",
    "practice-title",
    "biography",
    "process-notes",
    "calling-title",
    "calling-body",
    "invitation-cta",
    ...works.flatMap((work) => [`work-title:${work.slug}`, `work-caption:${work.slug}`]),
  ];
  return Object.fromEntries(ids.map((id) => {
    const style = readStyle(configured[id]);
    const visibleStyle = id === "hero-title" || id === "hero-caption" ? { ...style, color: undefined } : style;
    return [id, textStyleCss(visibleStyle, palette)];
  }));
}

function readStyle(value: unknown) {
  const style = record(value);
  return {
    size: pick(style.size, ["small", "medium", "large", "feature"]),
    weight: pick(style.weight, ["light", "regular", "bold"]),
    color: pick(style.color, ["ink", "muted", "paper", "accent"]),
    align: pick(style.align, ["left", "center", "right"]),
    fontMood: pick(style.font_mood, ["editorial", "display", "soft", "mono"]),
    italic: style.italic === true,
    underline: style.underline === true,
  };
}

function pick<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.includes(value as T) ? value as T : undefined;
}

function setVar(vars: Record<string, string>, key: string, value: string) {
  if (value) vars[key] = value;
}

function sceneById(scenes: Record<string, unknown>[], id: string) {
  return scenes.find((scene) => text(scene.id) === id) ?? {};
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function arrayStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function numberOr(value: unknown, fallback: number | undefined): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function booleanOr(value: unknown, fallback: boolean | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}

function prettyHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
