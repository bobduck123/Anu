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
import Image from "next/image";
import Link from "next/link";
import type { PresenceNode, PresenceWork } from "@/lib/api/types";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";
import {
  GGM_ARTIST,
  GGM_HERO_SEQUENCE,
  GGM_INSPIRE,
  GGM_LIVE_DEMO_URL,
  GGM_STRANDS,
  GGM_WORKS,
  type GgmWork,
} from "@/lib/presence/ggm/source";
import { GgmStage, type SceneDef } from "./GgmStage";
import { GgmMotionProvider } from "./GgmMotionContext";
import { GgmStudioScene } from "./GgmStudioScene";
import { GgmCallingCard } from "./GgmCallingCard";
import { GgmReveal } from "./GgmReveal";
import { GgmWorkDetail } from "./GgmWorkDetail";
import styles from "./ggm.module.css";

interface GgmFaithfulRoomProps {
  node: PresenceNode;
  roomKeySourceLabel?: string | null;
  focusWorkSlug?: string | null;
}

function buildWorks(node: PresenceNode): GgmWork[] {
  const backendWorks = (node.works ?? []).filter((w) => w.is_visible !== false);
  if (backendWorks.length === 0) return GGM_WORKS;
  return backendWorks.map((w, idx) => coerceWork(w, idx));
}

function coerceWork(w: PresenceWork, idx: number): GgmWork {
  const matched = GGM_WORKS.find(
    (c) => c.title.toLowerCase() === (w.title ?? "").toLowerCase(),
  );
  if (matched) {
    return {
      ...matched,
      title: w.title ?? matched.title,
      year: typeof w.year === "number" ? w.year : matched.year,
      image: w.image_url ?? matched.image,
      thumb: w.thumbnail_url ?? w.image_url ?? matched.thumb,
      description: w.description ?? matched.description,
    };
  }
  const slug = String(w.id ?? idx);
  return {
    id: slug,
    slug,
    title: w.title ?? "Untitled",
    year: typeof w.year === "number" ? w.year : Number(w.year) || 0,
    medium: w.medium ?? "Watercolour on paper",
    dimensions: "Unknown",
    image: w.image_url ?? w.thumbnail_url ?? "/ggm/works/willow-of-port-arthur-2019.webp",
    thumb: w.thumbnail_url ?? w.image_url ?? "/ggm/thumbs/willow-of-port-arthur-2019.webp",
    alt: w.title ?? "Watercolour work",
    description: w.description ?? "",
    context: "",
    process: "",
    memory: "",
    moodTags: [],
  };
}

export default function GgmFaithfulRoom(props: GgmFaithfulRoomProps) {
  return (
    <GgmMotionProvider>
      <Room {...props} />
    </GgmMotionProvider>
  );
}

function Room({ node, roomKeySourceLabel, focusWorkSlug }: GgmFaithfulRoomProps) {
  const works = useMemo(() => buildWorks(node), [node]);

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
        <div className={styles.ggm}>
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
              statementQuote={node.practice_statement ?? GGM_ARTIST.statementQuote}
              hrefForWork={hrefForWork}
              backHref={`/p/${encodeURIComponent(node.slug)}`}
            />
          </GgmReveal>
        </div>
      );
    }
  }

  const brand = node.display_name ?? GGM_ARTIST.name;
  const caption = node.headline ?? GGM_ARTIST.heroCaption;
  const aboutIntro = node.bio ?? node.short_bio ?? GGM_ARTIST.aboutIntro;
  const aboutBody = node.long_story ?? GGM_ARTIST.aboutBody;
  const externalPortfolio = pickExternalPortfolio(node);

  // Scene 01 cycles through the FULL ordered hero sequence (all 8
  // works, ordered as in source GGM_HERO_SEQUENCE + the rest).
  const heroSlides = useMemo<GgmWork[]>(() => {
    const orderedFromSequence = GGM_HERO_SEQUENCE.map((h) => works.find((w) => w.slug === h.slug)).filter(
      (w): w is GgmWork => Boolean(w),
    );
    const seen = new Set(orderedFromSequence.map((w) => w.slug));
    const rest = works.filter((w) => !seen.has(w.slug));
    const combined = [...orderedFromSequence, ...rest];
    return combined.length > 0 ? combined : works;
  }, [works]);

  // Scene 02 wall shows ALL works in a varied, scrollable composition.
  const wallWorks = useMemo<GgmWork[]>(() => works, [works]);

  const heroImages = useMemo(() => heroSlides.map((w) => w.image), [heroSlides]);

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
          caption={caption}
          onAdvance={ctx.slideAdvance}
        />
      ),
    },
    {
      id: "wall",
      number: "02",
      label: "Work Wall",
      sub: "selected watercolours",
      images: [wallWorks[1]?.image ?? GGM_WORKS[1].image],
      surface: "wall",
      content: () => (
        <WorkWallSurface
          works={wallWorks}
          hrefForWork={hrefForWork}
        />
      ),
    },
    {
      id: "studio",
      number: "03",
      label: "Practice Studio",
      sub: "workbench, notes, references",
      images: [wallWorks[2]?.image ?? GGM_WORKS[2].image],
      surface: "studio",
      content: () => (
        <GgmStudioScene
          artist={GGM_ARTIST}
          aboutIntro={aboutIntro}
          aboutBody={aboutBody}
          strands={GGM_STRANDS}
          inspire={GGM_INSPIRE}
        />
      ),
    },
    {
      id: "card",
      number: "04",
      label: "Calling Card",
      sub: "an invitation",
      images: [wallWorks[3]?.image ?? GGM_WORKS[3].image],
      surface: "card",
      content: () => (
        <GgmCallingCard
          artist={GGM_ARTIST}
          externalLink={externalPortfolio}
          enquiryAction={
            <PublicEnquiryDialog
              slug={node.slug}
              displayName={brand}
              nodeType={node.node_type}
              triggerLabel="Begin a conversation"
            />
          }
        />
      ),
    },
  ], [
    heroImages, heroSlides, wallWorks, brand, caption, aboutIntro, aboutBody,
    externalPortfolio, node.slug, node.node_type,
    hrefForWork,
  ]);

  return (
    <div className={styles.ggm}>
      <GgmStage
        node={node}
        scenes={scenes}
        roomKeySourceLabel={roomKeySourceLabel}
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
  caption: string;
  onAdvance: () => void;
}

function ArtworkFieldContent({
  slides,
  slideIndex,
  caption,
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
          <span className={styles.fieldWorkTitle}>
            {slide.title}
            <span className={styles.fieldWorkYear}>{slide.year}</span>
          </span>
        )}
        <span className={styles.fieldCaption}>
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
}

function WorkWallSurface({ works, hrefForWork }: WorkWallSurfaceProps) {
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
          <h2 className={styles.wallV2Title}>
            A viewing tray of selected watercolour works.
          </h2>
          <p className={styles.wallV2Lead}>
            Hung in chronological pockets. Scroll the tray to walk the wall.
            Tap any plate for the work's room.
          </p>
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
            <p className={styles.wallV2FeatureDesc}>{feature.description}</p>
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
                  <span className={styles.wallV2PlateTitle}>{w.title}</span>
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
