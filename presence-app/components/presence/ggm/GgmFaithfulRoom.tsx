"use client";

// GGM Faithful Room — v5 (slideshow + scrollable wall + arrows nav).
//
// Scene 01 is a click-to-advance slideshow: clicking the artwork (or
// the on-stage "advance" affordance) cycles through ALL hero artworks
// via the WebGL liquid morph.
// Scene 02 is the creatively scrollable Work Wall — varied tile sizes,
// year markers, hidden internal scrollbars.
// Scene 03 is the Practice Studio (workbench composition).
// Scene 04 is the Calling Card object.
//
// Scenes are navigated only by the on-screen ← / → arrows and the
// keyboard arrows. Wheel + touch belong to scene-internal scroll.

import { useMemo } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PresenceNode } from "@/lib/api/types";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";
import {
  GGM_ARTIST,
  GGM_INSPIRE,
  GGM_LIVE_DEMO_URL,
  GGM_STRANDS,
  type GgmArtist,
  type GgmWork,
  type InspireCard,
} from "@/lib/presence/ggm/source";
import { GgmStage, type SceneDef } from "./GgmStage";
import { GgmMotionProvider } from "./GgmMotionContext";
import { GgmStudioScene } from "./GgmStudioScene";
import { GgmCallingCard } from "./GgmCallingCard";
import { GgmReveal } from "./GgmReveal";
import { GgmWorkDetail } from "./GgmWorkDetail";
import { resolveRenderModel } from "@/lib/presence/render/resolver";
import type { PresenceRenderModel, RenderWork, TextStyle } from "@/lib/presence/render/model";
import { fontLoaderHref } from "@/lib/presence/typography/registry";
import { textStyleCss } from "@/lib/editor/canvasModel";
import styles from "./ggm.module.css";

interface GgmFaithfulRoomProps {
  node: PresenceNode;
  roomKeySourceLabel?: string | null;
  focusWorkSlug?: string | null;
  model?: PresenceRenderModel;
}

export default function GgmFaithfulRoom(props: GgmFaithfulRoomProps) {
  const renderModel = useMemo(
    () => props.model ?? resolveRenderModel(props.node, "published"),
    [props.model, props.node],
  );
  const model = useMemo(() => ggmViewFromRenderModel(props.node, renderModel), [props.node, renderModel]);
  const fontHref = fontLoaderHref(
    renderModel.typography.headingFontId.value,
    renderModel.typography.bodyFontId.value,
  );
  const { model: _suppliedModel, ...roomProps } = props;
  return (
    <GgmMotionProvider initialSettings={model.motion} localStorageEnabled={false}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <Room {...roomProps} model={model} />
    </GgmMotionProvider>
  );
}

interface GgmResolvedView {
  artist: GgmArtist;
  works: GgmWork[];
  heroSlides: GgmWork[];
  copy: {
    brand: string;
    artworkTitle: string;
    artworkCaption: string;
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
  };
  motion: Partial<import("./GgmMotionContext").GgmMotionSettings>;
  styleVars: CSSProperties;
  elementStyles: Record<string, CSSProperties>;
}

function ggmViewFromRenderModel(node: PresenceNode, model: PresenceRenderModel): GgmResolvedView {
  const works = model.works.filter((work) => work.visible).map(toGgmWork);
  const heroSlides = model.hero.slides.filter((work) => work.visible).map(toGgmWork);
  const biography = widgetText(model, "biography");
  const statement = widgetText(model, "main-statement");
  const calling = widgetRecord(model, "calling-body");
  const palette = {
    ink: model.palette.ink.value,
    muted: model.palette.muted.value,
    paper: model.palette.paper.value,
    accent: model.palette.accent.value,
  };

  return {
    artist: {
      ...GGM_ARTIST,
      name: model.identity.displayName.value,
      subtitle: model.identity.headline.value,
      location: node.location_label || GGM_ARTIST.location,
      aboutIntro: biography || GGM_ARTIST.aboutIntro,
      aboutBody: statement || GGM_ARTIST.aboutBody,
      statementQuote: statement || GGM_ARTIST.statementQuote,
    },
    works,
    heroSlides: heroSlides.length > 0 ? heroSlides : works,
    copy: {
      brand: model.identity.displayName.value,
      artworkTitle: widgetText(model, "hero-title"),
      artworkCaption: widgetText(model, "hero-caption"),
      wallTitle: widgetText(model, "work-wall-title"),
      wallLead: textValue(widgetRecord(model, "work-wall").lead),
      aboutIntro: biography,
      aboutBody: statement,
      processNotes: widgetText(model, "process-notes"),
      practiceTitle: widgetText(model, "practice-title"),
      callingTitle: widgetText(model, "calling-title"),
      callingCopy: textValue(calling.copy),
      enquiryCta: textValue(widgetRecord(model, "invitation-cta").label),
    },
    practice: {
      strands: readStrands(widgetRecord(model, "studio-fragments").fragments),
      inspire: GGM_INSPIRE,
    },
    contact: {
      externalLink: readExternalLink(calling.externalLinks),
      availability: textValue(calling.availability) || null,
      showDirectEmail: calling.showDirectEmail === true,
    },
    roomKey: {
      provenanceChipText: model.roomKey.provenanceChipText.value,
    },
    motion: {
      liquidStyle: model.motion.liquidStyle.value,
      liquidIntensity: model.motion.liquidIntensity.value,
      liquidDistortion: model.motion.liquidDistortion.value,
      liquidDurationMs: model.motion.liquidDurationMs.value,
      ditherStrength: model.motion.ditherStrength.value,
      filmGrainStrength: model.motion.filmGrainStrength.value,
      blurAmount: model.motion.blurAmount.value,
      parallaxDepth: model.motion.parallaxDepth.value,
      customCursor: model.motion.customCursor.value,
      heavyMotion: model.motion.heavyMotion.value,
    },
    styleVars: {
      "--ggm-bg": model.palette.bg.value,
      "--ggm-paper": model.palette.paper.value,
      "--ggm-paper-soft": model.palette.paper.value,
      "--ggm-paper-warm": model.palette.paperWarm.value,
      "--ggm-ink": model.palette.ink.value,
      "--ggm-muted": model.palette.muted.value,
      "--ggm-line": model.palette.line.value,
      "--ggm-stage": model.palette.stage.value,
      "--ggm-display-family": model.typography.headingFamily.value,
      "--ggm-body-family": model.typography.bodyFamily.value,
    } as CSSProperties,
    elementStyles: Object.fromEntries(
      Object.entries(model.elementStyles).map(([id, style]) => [
        id,
        textStyleCss(
          id === "hero-title" || id === "hero-caption" ? { ...style, color: undefined } : style as TextStyle,
          palette,
        ),
      ]),
    ),
  };
}

function toGgmWork(work: RenderWork): GgmWork {
  return {
    id: work.slug,
    slug: work.slug,
    title: work.title,
    year: Number(work.year) || 0,
    medium: work.medium,
    dimensions: work.dimensions,
    image: work.asset.url,
    thumb: work.asset.thumbnailUrl,
    alt: work.asset.altText,
    description: work.description,
    context: "",
    process: "",
    memory: "",
    moodTags: [],
  };
}

function widgetRecord(model: PresenceRenderModel, id: string): Record<string, unknown> {
  const widget = model.scenes.flatMap((scene) => scene.widgets).find((item) => item.id === id);
  return widget && widget.config && typeof widget.config === "object"
    ? widget.config as Record<string, unknown>
    : {};
}

function widgetText(model: PresenceRenderModel, id: string): string {
  return textValue(widgetRecord(model, id).text);
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStrands(value: unknown): Array<{ title: string; body: string }> {
  return Array.isArray(value)
    ? value.flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const item = row as Record<string, unknown>;
        return [{ title: textValue(item.title), body: textValue(item.body) }];
      })
    : GGM_STRANDS;
}

function readExternalLink(value: unknown): { label: string; href: string } | null {
  if (!Array.isArray(value)) return null;
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const href = textValue(item.url);
    if (/^https?:\/\//i.test(href) && !/localhost|127\.0\.0\.1|\.local|\.internal/i.test(href)) {
      return { href, label: textValue(item.label) || "External" };
    }
  }
  return null;
}

function Room({ node, roomKeySourceLabel, focusWorkSlug, model }: Omit<GgmFaithfulRoomProps, "model"> & { model: GgmResolvedView }) {
  const works = model.works;

  const hrefForWork = (w: GgmWork) =>
    `/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(w.slug)}`;

  // Focused work-detail mode.
  if (focusWorkSlug) {
    const focus = works.find((w) => w.slug === focusWorkSlug);
    if (focus) {
      const idx = works.findIndex((w) => w.slug === focus.slug);
      const prev = idx > 0 ? works[idx - 1] : works[works.length - 1];
      const next = idx < works.length - 1 ? works[idx + 1] : works[0];
      const related = works.filter((w) => w.slug !== focus.slug).slice(0, 3);
      return (
        <div className={styles.ggm} style={model.styleVars}>
          <nav className={styles.nav} aria-label="Primary">
            <Link className={styles.navBrand} href={`/p/${encodeURIComponent(node.slug)}`}>
              {node.display_name}
            </Link>
            <div className={styles.navLinks}>
              <Link href={`/p/${encodeURIComponent(node.slug)}`} data-hover>← Back to room</Link>
            </div>
          </nav>
          <GgmReveal>
            <GgmWorkDetail
              work={focus}
              prev={prev}
              next={next}
              related={related}
              statementQuote={model.artist.statementQuote}
              hrefForWork={hrefForWork}
              backHref={`/p/${encodeURIComponent(node.slug)}`}
            />
          </GgmReveal>
        </div>
      );
    }
  }

  const brand = model.copy.brand;
  const caption = model.copy.artworkCaption;
  const aboutIntro = model.copy.aboutIntro;
  const aboutBody = model.copy.aboutBody;
  const processNotes = model.copy.processNotes;
  const externalPortfolio = model.contact.externalLink ?? pickExternalPortfolio(node);

  // Scene 01 cycles through the FULL ordered hero sequence (all 8
  // works, ordered by the shared room model).
  const heroSlides = useMemo<GgmWork[]>(() => {
    return model.heroSlides.length > 0 ? model.heroSlides : works;
  }, [model.heroSlides, works]);

  // Scene 02 wall shows ALL works in a varied, scrollable composition.
  const wallWorks = useMemo<GgmWork[]>(() => works, [works]);

  const heroImages = useMemo(() => heroSlides.map((w) => w.image), [heroSlides]);
  const roomKeyLabel = roomKeySourceLabel && model.roomKey.provenanceChipText
    ? model.roomKey.provenanceChipText.replace(/^opened via\s*/i, "")
    : roomKeySourceLabel;

  const scenes: SceneDef[] = useMemo<SceneDef[]>(() => [
    {
      id: "field",
      number: "01",
      label: "Artwork Field",
      sub: "liquid slideshow",
      images: heroImages,
      surface: undefined,
      content: (ctx) => (
        <ArtworkFieldContent
          slides={heroSlides}
          slideIndex={ctx.slideIndex}
          title={model.copy.artworkTitle}
          caption={caption}
          titleStyle={model.elementStyles["hero-title"]}
          captionStyle={model.elementStyles["hero-caption"]}
          onAdvance={ctx.slideAdvance}
        />
      ),
    },
    {
      id: "wall",
      number: "02",
      label: "Work Wall",
      sub: "selected watercolours",
      images: [wallWorks[1]?.image ?? heroSlides[0]?.image ?? ""],
      surface: "wall",
      content: () => (
        <WorkWallSurface
          works={wallWorks}
          hrefForWork={hrefForWork}
          title={model.copy.wallTitle}
          lead={model.copy.wallLead}
          elementStyles={model.elementStyles}
        />
      ),
    },
    {
      id: "studio",
      number: "03",
      label: "Practice Studio",
      sub: "workbench, notes, references",
      images: [wallWorks[2]?.image ?? heroSlides[0]?.image ?? ""],
      surface: "studio",
      content: () => (
        <GgmStudioScene
          artist={model.artist}
          practiceTitle={model.copy.practiceTitle}
          aboutIntro={aboutIntro}
          aboutBody={aboutBody}
          processNotes={processNotes}
          strands={model.practice.strands}
          inspire={model.practice.inspire}
          elementStyles={model.elementStyles}
        />
      ),
    },
    {
      id: "card",
      number: "04",
      label: "Calling Card",
      sub: "an invitation",
      images: [wallWorks[3]?.image ?? heroSlides[0]?.image ?? ""],
      surface: "card",
      content: () => (
        <GgmCallingCard
          artist={model.artist}
          externalLink={externalPortfolio}
          contactTitle={model.copy.callingTitle}
          contactCopy={model.copy.callingCopy}
          availability={model.contact.availability}
          showDirectEmail={model.contact.showDirectEmail}
          elementStyles={model.elementStyles}
          enquiryAction={
            <PublicEnquiryDialog
              slug={node.slug}
              displayName={brand}
              nodeType={node.node_type}
              triggerLabel={model.copy.enquiryCta}
            />
          }
        />
      ),
    },
  ], [
    heroImages, heroSlides, wallWorks, brand, caption, aboutIntro, aboutBody, processNotes,
    externalPortfolio, node.slug, node.node_type,
    hrefForWork,
  ]);

  return (
    <div className={styles.ggm} style={model.styleVars}>
      <h1 className={styles.srOnly}>{brand}</h1>
      <GgmStage
        node={{ ...node, display_name: brand }}
        scenes={scenes}
        roomKeySourceLabel={roomKeyLabel}
        roomKeyProvenanceText={model.roomKey.provenanceChipText}
      />
      <span className={styles.srOnly}>
        <a href={GGM_LIVE_DEMO_URL}>Source portfolio: christina-goddard.vercel.app</a>
      </span>
    </div>
  );
}

// ── Scene 01 — Artwork Field (click-to-advance slideshow overlay) ──────────

interface ArtworkFieldContentProps {
  slides: GgmWork[];
  slideIndex: number;
  title: string;
  caption: string;
  titleStyle?: CSSProperties;
  captionStyle?: CSSProperties;
  onAdvance: () => void;
}

function ArtworkFieldContent({
  slides,
  slideIndex,
  title,
  caption,
  titleStyle,
  captionStyle,
  onAdvance,
}: ArtworkFieldContentProps) {
  const slide = slides[slideIndex] ?? slides[0] ?? null;
  return (
    <button
      type="button"
      className={styles.fieldClickPlate}
      onClick={onAdvance}
      aria-label={
        slide
          ? `Show next artwork — currently ${slide.title}`
          : "Advance artwork"
      }
      data-hover
    >
      <span className={styles.fieldContent}>
        {slide && (
          <span className={styles.fieldWorkTitle} style={titleStyle}>
            {title || slide.title}
            <span className={styles.fieldWorkYear}>{slide.year}</span>
          </span>
        )}
        <span className={styles.fieldCaption} style={captionStyle}>
          {caption}
        </span>
        <span className={styles.fieldClickHint} aria-hidden>
          ✱ Click anywhere — {String(slideIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </span>
    </button>
  );
}

// ── Scene 02 — Creatively scrollable Work Wall ────────────────────────────
//
// Composition: a "viewing tray" with one large featured plate at top,
// followed by varied paired rows + occasional full-bleed wide plates +
// year markers between sections. Scroll lives inside the frame; the
// page itself never scrolls.

interface WorkWallSurfaceProps {
  works: GgmWork[];
  hrefForWork: (w: GgmWork) => string;
  title: string;
  lead: string;
  elementStyles?: Record<string, CSSProperties>;
}

function WorkWallSurface({ works, hrefForWork, title, lead, elementStyles = {} }: WorkWallSurfaceProps) {
  // Group works by year so we can drop year-marker rules between
  // sections — reads like a hung gallery walk-through.
  const grouped = useMemo(() => {
    const map = new Map<number, GgmWork[]>();
    for (const w of works) {
      const arr = map.get(w.year) ?? [];
      arr.push(w);
      map.set(w.year, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [works]);

  // Pick a feature work for the top of the wall (last hero in the
  // ordered sequence — Willow of Port Arthur is the strongest).
  const feature = works[works.length - 1] ?? works[0];

  return (
    <div className={styles.wallV2Shell}>
      <header className={styles.wallV2Head}>
        <div>
          <p className={styles.blockEyebrow}>
            <span className={styles.blockEyebrowNumber}>02</span>
            Work Wall
          </p>
          <h2 className={styles.wallV2Title}>{title}</h2>
          <p className={styles.wallV2Lead}>{lead}</p>
        </div>
        <p className={styles.wallV2Meta}>
          {String(works.length).padStart(2, "0")} works · {grouped[0]?.[0]} — {grouped[grouped.length - 1]?.[0]}
        </p>
      </header>

      {feature && (
        <Link
          href={hrefForWork(feature)}
          className={styles.wallV2Feature}
          data-hover
          aria-label={`${feature.title} (${feature.year}) — open work`}
        >
          <Image
            src={feature.image}
            alt={feature.alt}
            fill
            sizes="(max-width: 920px) 100vw, 1100px"
            priority
          />
          <div className={styles.wallV2FeatureMeta}>
            <span className={styles.wallV2FeatureBadge}>Feature plate</span>
            <h3>{feature.title}</h3>
            <p>
              {feature.year} · {feature.dimensions !== "Unknown" ? `${feature.dimensions} · ` : ""}{feature.medium}
            </p>
            <p className={styles.wallV2FeatureDesc} style={elementStyles[`work-caption:${feature.slug}`]}>{feature.description}</p>
          </div>
        </Link>
      )}

      {grouped.map(([year, list], yearIdx) => (
        <section key={year} className={styles.wallV2Year}>
          <header className={styles.wallV2YearHead}>
            <span className={styles.wallV2YearMark} aria-hidden />
            <h3 className={styles.wallV2YearLabel}>{year}</h3>
            <span className={styles.wallV2YearCount}>
              {list.length === 1 ? "1 work" : `${list.length} works`}
            </span>
          </header>
          <div
            className={`${styles.wallV2Row} ${rowVariantFor(yearIdx, list.length)}`}
          >
            {list.map((w, i) => (
              <Link
                key={w.id}
                href={hrefForWork(w)}
                className={`${styles.wallV2Plate} ${plateSizeFor(yearIdx, i, list.length)}`}
                data-hover
              >
                <Image
                  src={w.image}
                  alt={w.alt}
                  fill
                  sizes="(max-width: 920px) 100vw, 50vw"
                />
                <div className={styles.wallV2PlateMeta}>
                  <span className={styles.wallV2PlateTitle} style={elementStyles[`work-title:${w.slug}`]}>{w.title}</span>
                  <span className={styles.wallV2PlateDims}>
                    {w.dimensions !== "Unknown" ? w.dimensions : w.medium}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <footer className={styles.wallV2Foot}>
        <p>End of tray — use the arrows to leave the wall.</p>
      </footer>
    </div>
  );
}

// Variation helper — different row dispositions per year group so the
// wall doesn't read as a grid.
function rowVariantFor(yearIdx: number, count: number): string {
  if (count === 1) return styles.wallV2RowSingle;
  switch (yearIdx % 4) {
    case 0: return styles.wallV2RowPairLR;
    case 1: return styles.wallV2RowPairRL;
    case 2: return styles.wallV2RowTrio;
    default: return styles.wallV2RowOffset;
  }
}

function plateSizeFor(yearIdx: number, i: number, _count: number): string {
  // Alternate large + small within a row for visual interest.
  const k = (yearIdx + i) % 3;
  if (k === 0) return styles.wallV2PlateLg;
  if (k === 1) return styles.wallV2PlateMd;
  return styles.wallV2PlateSm;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function prettyHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function pickExternalPortfolio(node: PresenceNode): { label: string; href: string } {
  const visibleLinks = (node.links ?? []).filter((l) => l.is_visible !== false);
  const portfolioLink = visibleLinks.find((l) => {
    const label = (l.label ?? "").toLowerCase();
    return label.includes("portfolio") || label.includes("website") || label.includes("source");
  });
  if (portfolioLink?.url) {
    return { label: prettyHost(portfolioLink.url) ?? portfolioLink.label, href: portfolioLink.url };
  }
  if (node.public_url) {
    let isSelfLink = false;
    try {
      const u = new URL(node.public_url, "http://x");
      if (u.pathname.endsWith(`/p/${node.slug}`) || u.pathname.endsWith(`/presence/${node.slug}`)) {
        isSelfLink = true;
      }
    } catch {
      // ignore — treat as not a self-link
    }
    if (!isSelfLink && /^https?:/i.test(node.public_url) && !/localhost|127\.0\.0\.1/i.test(node.public_url)) {
      const host = prettyHost(node.public_url);
      if (host) return { label: host, href: node.public_url };
    }
  }
  return { label: prettyHost(GGM_ARTIST.contactWebsite) ?? "ckgoddard.com.au", href: GGM_ARTIST.contactWebsite };
}
