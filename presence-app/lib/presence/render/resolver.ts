// Shared render resolver.
//
// Both the public renderer (PortfolioRenderer / GgmFaithfulRoom) and
// the Studio Canvas (PresenceCanvasMode) consume the model returned by
// `resolveRenderModel(node, mode)`. There is exactly one place where
// "what visitors will see" is computed; Canvas reflects that exactly.
//
// GGM public rendering, authenticated draft preview, RoomKey and
// Canvas all read authored values through this contract.

import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import { GGM_ARTIST, GGM_HERO_SEQUENCE, GGM_STRANDS, GGM_WORKS, type GgmWork } from "../ggm/source.ts";
import {
  canonical,
  nodeValue,
  authored,
  pickProvenance,
  type FontMood,
  type MotionIntensity,
  type PresenceRenderModel,
  type RenderAsset,
  type RenderMode,
  type RenderWork,
  type SceneInstance,
  type TextStyle,
  type WidgetInstance,
} from "./model.ts";

export function resolveRenderModel(node: PresenceNode, mode: RenderMode = "published"): PresenceRenderModel {
  const config = pickConfigForMode(node, mode);
  const rendererKey = config?.renderer_key ?? node.renderer_key ?? "ggm-faithful-room-v1";
  switch (rendererKey) {
    case "ggm-faithful-room-v1":
      return resolveGgmModel(node, config, mode);
    default:
      return resolveGenericModel(node, config, mode);
  }
}

function pickConfigForMode(node: PresenceNode, mode: RenderMode): PresenceEditableConfig | null {
  const config = node.editable_config;
  if (!config) return null;
  if (mode === "published") {
    return config.status === "published" ? config : null;
  }
  // Draft mode — the Studio Canvas may pass either status; render whatever exists.
  return config;
}

// ── GGM resolver ────────────────────────────────────────────────────

function resolveGgmModel(
  node: PresenceNode,
  config: PresenceEditableConfig | null,
  mode: RenderMode,
): PresenceRenderModel {
  const content = record(config?.content_config);
  const about = record(content.about);
  const contact = record(content.contact);
  const sceneConfig = record(config?.scene_config);
  const styleDna = record(config?.style_dna);
  const motion = record(config?.motion_config);
  const roomkey = record(config?.roomkey_config);
  const enquiry = record(config?.enquiry_config);
  const scenes = arrayRecords(sceneConfig.scenes);
  const sceneArtwork = sceneById(scenes, "artwork_field");
  const sceneWall = sceneById(scenes, "work_wall");
  const sceneStudio = sceneById(scenes, "practice_studio");
  const sceneCalling = sceneById(scenes, "calling_card");

  const palette = record(styleDna.palette);
  const typography = record(styleDna.typography);

  // ── Tokens ────────────────────────────────────────────────────────
  const paletteTokens = {
    bg: pickProvenance(text(palette.bg), null, "#f4f4f4"),
    paper: pickProvenance(text(palette.paper), null, "#eceae7"),
    paperWarm: pickProvenance(text(palette.paper_warm), null, "#e7e1d7"),
    ink: pickProvenance(text(palette.ink), null, "#111111"),
    muted: pickProvenance(text(palette.muted), null, "#6a6a6a"),
    line: pickProvenance(text(palette.line), null, "#d7d2c8"),
    stage: pickProvenance(text(palette.hero_stage_bg), null, "#eaeaea"),
    accent: pickProvenance(text(palette.accent), null, "#b87938"),
  };

  const typographyTokens = {
    headingFamily: pickProvenance(
      text(typography.heading_stack),
      null,
      "Inter, Helvetica Neue, Arial, sans-serif",
    ),
    bodyFamily: pickProvenance(
      text(typography.body_stack),
      null,
      "Inter, Helvetica Neue, Arial, sans-serif",
    ),
    headingFontId: pickProvenance(text(typography.heading_font_id) || null, null, null),
    bodyFontId: pickProvenance(text(typography.body_font_id) || null, null, null),
    fontPackId: pickProvenance(text(typography.font_pack_id) || null, null, null),
  };

  // Motion: intensity-token shaped, with the underlying values as
  // provenance fields. Canvas exposes a single "Still/Gentle/Living/
  // Immersive" choice; renderer reads liquidIntensity etc.
  const intensity = pickMotionIntensity(motion);
  const heavyMotion = boolOf(motion.heavy_motion_enabled) ?? false;
  const requestedMotion = {
    liquidIntensity: numberOf(motion.liquid_intensity) ?? 0.55,
    liquidDistortion: numberOf(motion.distortion_scale) ?? 0.5,
    liquidDurationMs: numberOf(motion.morph_speed_ms ?? motion.scene_transition_duration_ms) ?? 1100,
    ditherStrength: numberOf(motion.dither_strength) ?? 0.34,
    filmGrainStrength: numberOf(motion.film_grain_strength) ?? 0.28,
    blurAmount: numberOf(motion.blur_amount) ?? 0.22,
  };
  const effectiveMotion = heavyMotion ? requestedMotion : {
    liquidIntensity: Math.min(requestedMotion.liquidIntensity, 0.58),
    liquidDistortion: Math.min(requestedMotion.liquidDistortion, 0.55),
    liquidDurationMs: Math.max(requestedMotion.liquidDurationMs, 1150),
    ditherStrength: Math.min(requestedMotion.ditherStrength, 0.38),
    filmGrainStrength: Math.min(requestedMotion.filmGrainStrength, 0.32),
    blurAmount: Math.min(requestedMotion.blurAmount, 0.28),
  };
  const safetyCapApplied = Object.keys(requestedMotion).some((key) =>
    requestedMotion[key as keyof typeof requestedMotion] !== effectiveMotion[key as keyof typeof effectiveMotion],
  );
  const motionTokens = {
    intensity: pickProvenance<MotionIntensity>(text(motion.intensity) as MotionIntensity, null, intensity),
    liquidStyle: pickProvenance(
      (text(motion.liquid_style) || text(motion.transition_style)) as never,
      null,
      "ripple" as never,
    ),
    liquidIntensity: pickProvenance(numberOf(motion.liquid_intensity) == null ? null : effectiveMotion.liquidIntensity, null, effectiveMotion.liquidIntensity),
    liquidDistortion: pickProvenance(numberOf(motion.distortion_scale) == null ? null : effectiveMotion.liquidDistortion, null, effectiveMotion.liquidDistortion),
    liquidDurationMs: pickProvenance(numberOf(motion.morph_speed_ms ?? motion.scene_transition_duration_ms) == null ? null : effectiveMotion.liquidDurationMs, null, effectiveMotion.liquidDurationMs),
    ditherStrength: pickProvenance(numberOf(motion.dither_strength) == null ? null : effectiveMotion.ditherStrength, null, effectiveMotion.ditherStrength),
    filmGrainStrength: pickProvenance(numberOf(motion.film_grain_strength) == null ? null : effectiveMotion.filmGrainStrength, null, effectiveMotion.filmGrainStrength),
    blurAmount: pickProvenance(numberOf(motion.blur_amount) == null ? null : effectiveMotion.blurAmount, null, effectiveMotion.blurAmount),
    parallaxDepth: pickProvenance(numberOf(motion.parallax_depth), null, 0.5),
    customCursor: pickProvenance(boolOf(motion.custom_cursor_enabled), null, false),
    heavyMotion: pickProvenance(boolOf(motion.heavy_motion_enabled), null, false),
    reducedMotionFallback: pickProvenance(boolOf(motion.reduced_motion_fallback), null, true),
    safetyCapApplied,
    requestedLiquidIntensity: requestedMotion.liquidIntensity,
  };

  // ── Identity ──────────────────────────────────────────────────────
  const displayName = pickProvenance(
    text(content.display_name),
    text(node.display_name),
    GGM_ARTIST.name,
  );
  const headline = pickProvenance(
    text(content.headline),
    text(node.headline),
    GGM_ARTIST.subtitle,
  );

  const identity = {
    slug: node.slug,
    displayName,
    headline,
    rendererKey: node.renderer_key ?? "ggm-faithful-room-v1",
    publicUrl: `/p/${node.slug}`,
  };

  // ── Works ────────────────────────────────────────────────────────
  const works = buildGgmWorks(node, config);
  const renderWorks: RenderWork[] = works.map((work) => ({
    slug: work.slug,
    title: work.title,
    year: work.year,
    medium: work.medium,
    dimensions: work.dimensions,
    description: work.description,
    asset: buildAsset(work),
    visible: true,
  }));

  // ── Hero slides ──────────────────────────────────────────────────
  const hero = applyHeroImage(buildHeroSlides(works, sceneArtwork), record(config?.asset_config));

  // ── Scenes (4 fixed for GGM, ordered) ────────────────────────────
  const sceneInstances: SceneInstance[] = [
    {
      id: "field",
      number: "01",
      label: text(sceneArtwork.label) || "Artwork Field",
      sub: text(sceneArtwork.sub) || "liquid slideshow",
      layout: pickLayout(sceneArtwork.layout, ["hero-liquid-slideshow", "hero-still"], "hero-liquid-slideshow"),
      background: pickProvenance(text(sceneArtwork.background) as never, null, "stage" as never),
      hidden: boolOf(sceneArtwork.hidden) === true,
      widgets: buildFieldWidgets(content, sceneArtwork, hero, node),
    },
    {
      id: "wall",
      number: "02",
      label: text(sceneWall.label) || "Work Wall",
      sub: text(sceneWall.sub) || "selected watercolours",
      layout: pickLayout(sceneWall.layout, ["gallery-wall"], "gallery-wall"),
      background: pickProvenance(text(sceneWall.background) as never, null, "paper" as never),
      hidden: boolOf(sceneWall.hidden) === true,
      widgets: buildWallWidgets(sceneWall, renderWorks),
    },
    {
      id: "studio",
      number: "03",
      label: text(sceneStudio.label) || "Practice Studio",
      sub: text(sceneStudio.sub) || "workbench, notes, references",
      layout: pickLayout(sceneStudio.layout, ["studio-workbench"], "studio-workbench"),
      background: pickProvenance(text(sceneStudio.background) as never, null, "paper-warm" as never),
      hidden: boolOf(sceneStudio.hidden) === true,
      widgets: buildStudioWidgets(content, about, sceneStudio, node),
    },
    {
      id: "card",
      number: "04",
      label: text(sceneCalling.label) || "Calling Card",
      sub: text(sceneCalling.sub) || "an invitation",
      layout: pickLayout(sceneCalling.layout, ["calling-paper"], "calling-paper"),
      background: pickProvenance(text(sceneCalling.background) as never, null, "paper" as never),
      hidden: boolOf(sceneCalling.hidden) === true,
      widgets: buildCallingWidgets(content, contact, sceneCalling, enquiry, node),
    },
  ];

  // ── RoomKey ──────────────────────────────────────────────────────
  const roomKey = {
    provenanceChipText: pickProvenance(
      text(roomkey.provenance_chip_text) || text(sceneArtwork.roomkey_provenance_text),
      null,
      "Opened via RoomKey",
    ),
    guestEntryCopy: pickProvenance(text(roomkey.guest_entry_copy), null, "You have entered this Presence Room."),
    invalidCopy: pickProvenance(text(roomkey.invalid_copy), null, "This Room Key is not available."),
    revokedCopy: pickProvenance(text(roomkey.revoked_copy), null, "This Room Key has been revoked."),
  };

  // ── Element styles (per-element typographic override) ────────────
  const elementStyles = buildElementStyles(styleDna);

  // ── Provenance summary ───────────────────────────────────────────
  const summary = summarise([
    paletteTokens.bg, paletteTokens.paper, paletteTokens.paperWarm,
    paletteTokens.ink, paletteTokens.muted, paletteTokens.line,
    paletteTokens.stage, paletteTokens.accent,
    typographyTokens.headingFamily, typographyTokens.bodyFamily,
    identity.displayName, identity.headline,
    roomKey.provenanceChipText, roomKey.guestEntryCopy,
    motionTokens.intensity, motionTokens.liquidStyle,
  ]);

  return {
    mode,
    empty: !config,
    identity,
    palette: paletteTokens,
    typography: typographyTokens,
    motion: motionTokens,
    scenes: sceneInstances,
    works: renderWorks,
    hero: { primaryWorkSlug: hero[0]?.slug ?? renderWorks[0]?.slug ?? "", slides: hero.map((w) => mapToRenderWork(w)) },
    roomKey,
    elementStyles,
    provenanceSummary: summary,
  };
}

function resolveGenericModel(
  node: PresenceNode,
  config: PresenceEditableConfig | null,
  mode: RenderMode,
): PresenceRenderModel {
  // Generic renderer fallback — uses node-level fields and renders a
  // minimal one-scene model. Sufficient to keep non-GGM rooms working
  // through the same model; per-renderer adapters can register here as
  // they're authored.
  const identity = {
    slug: node.slug,
    displayName: pickProvenance(text(record(config?.content_config).display_name), text(node.display_name), node.display_name || node.slug),
    headline: pickProvenance(text(record(config?.content_config).headline), text(node.headline), ""),
    rendererKey: node.renderer_key ?? "generic",
    publicUrl: `/p/${node.slug}`,
  };
  return {
    mode,
    empty: !config,
    identity,
    palette: {
      bg: canonical("#f4f4f4"), paper: canonical("#eceae7"), paperWarm: canonical("#e7e1d7"),
      ink: canonical("#111111"), muted: canonical("#6a6a6a"), line: canonical("#d7d2c8"),
      stage: canonical("#eaeaea"), accent: canonical("#b87938"),
    },
    typography: {
      headingFamily: canonical("Inter, Helvetica Neue, Arial, sans-serif"),
      bodyFamily: canonical("Inter, Helvetica Neue, Arial, sans-serif"),
      headingFontId: canonical(null),
      bodyFontId: canonical(null),
      fontPackId: canonical(null),
    },
    motion: {
      intensity: canonical<MotionIntensity>("gentle"),
      liquidStyle: canonical<never>("ripple" as never),
      liquidIntensity: canonical(0.4), liquidDistortion: canonical(0.4),
      liquidDurationMs: canonical(1100),
      ditherStrength: canonical(0.34), filmGrainStrength: canonical(0.28),
      blurAmount: canonical(0.22), parallaxDepth: canonical(0.5),
      customCursor: canonical(false), heavyMotion: canonical(false),
      reducedMotionFallback: canonical(true),
      safetyCapApplied: false,
      requestedLiquidIntensity: 0.4,
    },
    scenes: [],
    works: [],
    hero: { primaryWorkSlug: "", slides: [] },
    roomKey: {
      provenanceChipText: canonical("Opened via RoomKey"),
      guestEntryCopy: canonical("You have entered this Presence Room."),
      invalidCopy: canonical("This Room Key is not available."),
      revokedCopy: canonical("This Room Key has been revoked."),
    },
    elementStyles: {},
    // Generic renderer fills nearly every token with canonical
    // defaults — count those so the Canvas badge accurately reads
    // "Mostly room defaults" rather than "Nothing set".
    provenanceSummary: { authored: 0, node: 0, canonical: 16 },
  };
}

// ── GGM helpers ─────────────────────────────────────────────────────

function buildGgmWorks(node: PresenceNode, config: PresenceEditableConfig | null): GgmWork[] {
  const assetCfg = record(config?.asset_config);
  const contentCfg = record(config?.content_config);
  const wallScene = sceneById(arrayRecords(record(config?.scene_config).scenes), "work_wall");
  const editableRows = arrayRecords(assetCfg.artworks).length > 0
    ? arrayRecords(assetCfg.artworks)
    : arrayRecords(contentCfg.works);
  const backendWorks = (node.works ?? []).filter((w) => w.is_visible !== false);
  const source = editableRows.length > 0
    ? editableRows.filter((row) => row.is_visible !== false)
    : backendWorks.length > 0
      ? backendWorks.map((work, idx) => ({
          id: work.id,
          slug: work.slug ?? String(work.id ?? idx + 1),
          title: work.title,
          year: work.year,
          medium: work.medium,
          dimensions: work.dimensions,
          description: work.description,
          image_url: work.image_url,
          thumbnail_url: work.thumbnail_url,
          alt_text: work.title,
          sort_order: work.sort_order ?? idx + 1,
          is_visible: true,
        }))
      : GGM_WORKS.map((work, idx) => ({ ...work, sort_order: idx + 1 }));
  const works = source.map((row, idx) => coerceWork(row as Record<string, unknown>, idx));
  return orderBySlug(works, arrayStrings(wallScene.artwork_order));
}

function coerceWork(row: Record<string, unknown>, idx: number): GgmWork {
  const slug = text(row.slug) || slugify(text(row.title) || `work-${idx + 1}`);
  const matched = GGM_WORKS.find((work) => work.slug === slug || work.title.toLowerCase() === text(row.title).toLowerCase());
  const title = text(row.title) || matched?.title || "Untitled";
  const image = text(row.url) || text(row.image_url) || matched?.image || "/ggm/works/willow-of-port-arthur-2019.webp";
  const thumb = text(row.thumbnail_url) || text(row.thumb) || image;
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

function orderBySlug(works: GgmWork[], order: string[]): GgmWork[] {
  if (order.length === 0) return works;
  const bySlug = new Map(works.map((work) => [work.slug, work]));
  const ordered = order.map((slug) => bySlug.get(slug)).filter((w): w is GgmWork => Boolean(w));
  const seen = new Set(ordered.map((w) => w.slug));
  return [...ordered, ...works.filter((w) => !seen.has(w.slug))];
}

function buildHeroSlides(works: GgmWork[], artworkScene: Record<string, unknown>): GgmWork[] {
  const sequence = arrayStrings(artworkScene.hero_sequence);
  const primary = text(artworkScene.primary_artwork_slug);
  const requested = primary ? [primary, ...sequence.filter((s) => s !== primary)] : sequence;
  const bySlug = new Map(works.map((w) => [w.slug, w]));
  const ordered = requested.map((slug) => bySlug.get(slug)).filter((w): w is GgmWork => Boolean(w));
  if (ordered.length > 0) {
    const seen = new Set(ordered.map((w) => w.slug));
    return [...ordered, ...works.filter((w) => !seen.has(w.slug))];
  }
  const defaultOrder = GGM_HERO_SEQUENCE.map((hero) => works.find((w) => w.slug === hero.slug)).filter((w): w is GgmWork => Boolean(w));
  const seen = new Set(defaultOrder.map((w) => w.slug));
  return [...defaultOrder, ...works.filter((w) => !seen.has(w.slug))];
}

function applyHeroImage(slides: GgmWork[], assetConfig: Record<string, unknown>): GgmWork[] {
  const hero = record(assetConfig.hero_image);
  const url = text(hero.url);
  if (!url || slides.length === 0) return slides;
  return [
    { ...slides[0], image: url, thumb: url, alt: text(hero.alt_text) || slides[0].alt },
    ...slides.slice(1),
  ];
}

function buildAsset(work: GgmWork): RenderAsset {
  return {
    id: work.id,
    slug: work.slug,
    url: work.image,
    thumbnailUrl: work.thumb,
    altText: work.alt,
  };
}

function mapToRenderWork(work: GgmWork): RenderWork {
  return {
    slug: work.slug,
    title: work.title,
    year: work.year,
    medium: work.medium,
    dimensions: work.dimensions,
    description: work.description,
    asset: buildAsset(work),
    visible: true,
  };
}

function buildFieldWidgets(content: Record<string, unknown>, scene: Record<string, unknown>, hero: GgmWork[], node: PresenceNode): WidgetInstance[] {
  return [
    {
      id: "hero-image",
      type: "hero-image",
      scene: "field",
      order: 0,
      config: {
        asset: hero[0] ? buildAsset(hero[0]) : null,
        slides: hero.map(mapToRenderWork),
      },
      provenance: hero.length > 0 ? "authored" : "canonical",
    },
    {
      id: "hero-title",
      type: "hero-title",
      scene: "field",
      order: 1,
      config: { text: text(scene.title) || text(content.hero_title) || GGM_ARTIST.heroTitle },
      provenance: text(scene.title) ? "authored" : text(content.hero_title) ? "node" : "canonical",
    },
    {
      id: "hero-caption",
      type: "hero-caption",
      scene: "field",
      order: 2,
      config: { text: text(scene.statement) || text(content.headline) || text(node.headline) || GGM_ARTIST.heroCaption },
      provenance: text(scene.statement) || text(content.headline) ? "authored" : text(node.headline) ? "node" : "canonical",
    },
  ];
}

function buildWallWidgets(scene: Record<string, unknown>, works: RenderWork[]): WidgetInstance[] {
  return [
    {
      id: "work-wall-title",
      type: "hero-title",
      scene: "wall",
      order: 0,
      config: { text: text(scene.title) || "A viewing tray of selected watercolour works." },
      provenance: text(scene.title) ? "authored" : "canonical",
    },
    {
      id: "work-feature",
      type: "work-feature",
      scene: "wall",
      order: 1,
      config: { workSlug: text(scene.featured_work_slug) || works[works.length - 1]?.slug || works[0]?.slug || "" },
      provenance: text(scene.featured_work_slug) ? "authored" : "canonical",
    },
    {
      id: "work-wall",
      type: "work-wall",
      scene: "wall",
      order: 2,
      config: {
        works,
        layout: "gallery-wall",
        lead: text(scene.lead) || "Hung in chronological pockets. Scroll the tray to walk the wall. Tap any plate for the work's room.",
      },
      provenance: works.length > 0 ? "authored" : "canonical",
    },
  ];
}

function buildStudioWidgets(content: Record<string, unknown>, about: Record<string, unknown>, scene: Record<string, unknown>, node: PresenceNode): WidgetInstance[] {
  return [
    {
      id: "practice-title",
      type: "hero-title",
      scene: "studio",
      order: 0,
      config: { text: text(scene.about_title) || "Practice Studio" },
      provenance: text(scene.about_title) ? "authored" : "canonical",
    },
    {
      id: "biography",
      type: "biography",
      scene: "studio",
      order: 1,
      config: { text: text(about.biography) || text(content.bio) || text(node.bio) || text(node.short_bio) || GGM_ARTIST.aboutIntro },
      provenance: text(about.biography) || text(content.bio) ? "authored" : text(node.bio) || text(node.short_bio) ? "node" : "canonical",
    },
    {
      id: "main-statement",
      type: "statement",
      scene: "studio",
      order: 2,
      config: { text: text(about.artist_statement) || text(node.practice_statement) || GGM_ARTIST.statementQuote },
      provenance: text(about.artist_statement) ? "authored" : text(node.practice_statement) ? "node" : "canonical",
    },
    {
      id: "process-notes",
      type: "process-notes",
      scene: "studio",
      order: 3,
      config: { text: text(about.process_notes) || "" },
      provenance: text(about.process_notes) ? "authored" : "canonical",
    },
    {
      id: "studio-fragments",
      type: "studio-fragments",
      scene: "studio",
      order: 4,
      config: { fragments: arrayRecords(about.strands).length > 0 ? arrayRecords(about.strands) : GGM_STRANDS },
      provenance: arrayRecords(about.strands).length > 0 ? "authored" : "canonical",
    },
  ];
}

function buildCallingWidgets(content: Record<string, unknown>, contact: Record<string, unknown>, scene: Record<string, unknown>, enquiry: Record<string, unknown>, node: PresenceNode): WidgetInstance[] {
  return [
    {
      id: "calling-title",
      type: "hero-title",
      scene: "card",
      order: 0,
      config: { text: text(contact.contact_title) || text(scene.contact_title) || "Calling Card" },
      provenance: text(contact.contact_title) ? "authored" : "canonical",
    },
    {
      id: "calling-body",
      type: "calling-card",
      scene: "card",
      order: 1,
      config: {
        copy: text(contact.contact_copy) || "Use the Presence enquiry form to begin a conversation.",
        externalLinks: arrayRecords(contact.external_links),
        availability: text(contact.availability_status) || text(enquiry.availability_status) || node.availability_status || null,
        showDirectEmail: text(contact.contact_posture) === "direct_email_public",
      },
      provenance: text(contact.contact_copy) ? "authored" : "canonical",
    },
    {
      id: "invitation-cta",
      type: "invitation",
      scene: "card",
      order: 2,
      config: {
        label: text(enquiry.cta_label) || text(scene.enquiry_cta) || node.primary_cta_label || "Begin a conversation",
      },
      provenance: text(enquiry.cta_label) ? "authored" : text(node.primary_cta_label) ? "node" : "canonical",
    },
  ];
}

function buildElementStyles(styleDna: Record<string, unknown>): Record<string, TextStyle> {
  const stored = record(styleDna.element_styles);
  const out: Record<string, TextStyle> = {};
  for (const [id, raw] of Object.entries(stored)) {
    const r = record(raw);
    out[id] = {
      size: pickStyle(r.size, ["small", "medium", "large", "feature"] as const),
      weight: pickStyle(r.weight, ["light", "regular", "bold"] as const),
      color: pickStyle(r.color, ["ink", "muted", "paper", "accent"] as const),
      align: pickStyle(r.align, ["left", "center", "right"] as const),
      fontMood: pickStyle(r.font_mood, ["editorial", "display", "soft", "mono", "handwritten"] as const) as FontMood | undefined,
      italic: r.italic === true,
      underline: r.underline === true,
    };
  }
  return out;
}

function pickStyle<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.includes(value as T) ? (value as T) : undefined;
}

function pickMotionIntensity(motion: Record<string, unknown>): MotionIntensity {
  const explicit = text(motion.intensity);
  if (explicit === "still" || explicit === "gentle" || explicit === "living" || explicit === "immersive") return explicit;
  const heavy = boolOf(motion.heavy_motion_enabled);
  if (heavy === true) return "immersive";
  const intensity = numberOf(motion.liquid_intensity);
  if (intensity != null && intensity >= 0.9) return "living";
  if (intensity != null && intensity >= 0.5) return "gentle";
  return "still";
}

function pickLayout<T extends string>(value: unknown, supported: readonly T[], defaultValue: T) {
  const candidate = text(value);
  return supported.includes(candidate as T) ? authored(candidate as T) : canonical(defaultValue);
}

function summarise(values: Array<{ provenance: string }>): { authored: number; node: number; canonical: number } {
  const summary = { authored: 0, node: 0, canonical: 0 };
  for (const v of values) {
    if (v.provenance === "authored") summary.authored++;
    else if (v.provenance === "node") summary.node++;
    else summary.canonical++;
  }
  return summary;
}

// ── Generic helpers ─────────────────────────────────────────────────

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

function sceneById(scenes: Record<string, unknown>[], id: string): Record<string, unknown> {
  return scenes.find((scene) => text(scene.id) === id) ?? {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function numberOf(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function boolOf(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

// Suppress unused-warning for the `authored` import (kept for callers).
void authored;
void nodeValue;
