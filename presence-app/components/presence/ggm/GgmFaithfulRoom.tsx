"use client";

// GGM Faithful Room — v3 scene-stage edition.
//
// The visitor experiences the Room as a sequence of four scene cards
// living inside a stable frame (chrome + left rail + settings). Scene
// transitions play a WebGL liquid morph (see GgmLiquidCanvas). Settings
// (motion / surface / texture / power saver) are owner-tunable via the
// settings menu in the rail.
//
// One Room, one renderer — this component handles the public page,
// /presence/[slug] alias, /r/[token] dispatch (with roomKey chip in
// Scene 01), and the dedicated /works/[workId] route (single-scene
// detail mode).

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PresenceNode, PresenceWork } from "@/lib/api/types";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";
import { PresenceGraphActions } from "@/components/presence/graph/PresenceGraphActions";
import {
  GGM_ARTIST,
  GGM_FEATURED,
  GGM_HERO_SEQUENCE,
  GGM_INSPIRE,
  GGM_LIVE_DEMO_URL,
  GGM_STRANDS,
  GGM_WORKS,
  type GgmWork,
} from "@/lib/presence/ggm/source";
import { GgmStage, type SceneDef } from "./GgmStage";
import { GgmMotionProvider, useGgmMotion } from "./GgmMotionContext";
import { GgmStudioScene } from "./GgmStudioScene";
import { GgmCallingCard } from "./GgmCallingCard";
import { GgmCursor, GgmScrollBar } from "./GgmChrome";
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

const WALL_VARIANTS = [
  styles.wallTile1, styles.wallTile2, styles.wallTile3, styles.wallTile4,
  styles.wallTile5, styles.wallTile6, styles.wallTile7, styles.wallTile8,
];

export default function GgmFaithfulRoom(props: GgmFaithfulRoomProps) {
  return (
    <GgmMotionProvider>
      <Room {...props} />
    </GgmMotionProvider>
  );
}

function Room({ node, roomKeySourceLabel, focusWorkSlug }: GgmFaithfulRoomProps) {
  const works = useMemo(() => buildWorks(node), [node]);
  const { effective } = useGgmMotion();

  const hrefForWork = (w: GgmWork) =>
    `/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(w.slug)}`;

  // Focused work-detail mode — uses the dedicated detail surface,
  // skipping the stage state machine.
  if (focusWorkSlug) {
    const focus = works.find((w) => w.slug === focusWorkSlug);
    if (focus) {
      const idx = works.findIndex((w) => w.slug === focus.slug);
      const prev = idx > 0 ? works[idx - 1] : works[works.length - 1];
      const next = idx < works.length - 1 ? works[idx + 1] : works[0];
      const related = works.filter((w) => w.slug !== focus.slug).slice(0, 3);
      return (
        <div className={`${styles.ggm}`}>
          {effective.scrollProgress && <GgmScrollBar />}
          {effective.customCursor && <GgmCursor />}
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

  // Build the 4 scenes.
  const brand = node.display_name ?? GGM_ARTIST.name;
  const caption = node.headline ?? GGM_ARTIST.heroCaption;
  const aboutIntro = node.bio ?? node.short_bio ?? GGM_ARTIST.aboutIntro;
  const aboutBody = node.long_story ?? GGM_ARTIST.aboutBody;
  const statementQuote = node.practice_statement ?? GGM_ARTIST.statementQuote;
  const externalPortfolio = pickExternalPortfolio(node);

  const heroSlides = useMemo(() => {
    const ordered = GGM_HERO_SEQUENCE.map((h) => works.find((w) => w.slug === h.slug)).filter(
      (w): w is GgmWork => Boolean(w),
    );
    return ordered.length > 0 ? ordered : works.slice(0, 5);
  }, [works]);

  const wallWorks = useMemo(() => {
    const featuredSlugs = GGM_FEATURED.map((f) => f.slug);
    const featured = featuredSlugs
      .map((s) => works.find((w) => w.slug === s))
      .filter((w): w is GgmWork => Boolean(w));
    const rest = works.filter((w) => !featuredSlugs.includes(w.slug));
    return [...featured, ...rest];
  }, [works]);

  const scenes: SceneDef[] = useMemo<SceneDef[]>(() => [
    {
      id: "field",
      number: "01",
      label: "Artwork Field",
      sub: "liquid surface",
      backgroundImage: heroSlides[0]?.image ?? GGM_WORKS[0].image,
      surface: undefined,
      content: () => null,
      overlay: () => (
        <ArtworkFieldOverlay
          slides={heroSlides}
          brand={brand}
          caption={caption}
          roomKeySourceLabel={roomKeySourceLabel ?? null}
        />
      ),
    },
    {
      id: "wall",
      number: "02",
      label: "Work Wall",
      sub: "selected watercolours",
      backgroundImage: heroSlides[1]?.image ?? GGM_WORKS[1].image,
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
      backgroundImage: heroSlides[2]?.image ?? GGM_WORKS[2].image,
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
      backgroundImage: heroSlides[3]?.image ?? GGM_WORKS[3].image,
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
    heroSlides, wallWorks, brand, caption, aboutIntro, aboutBody,
    externalPortfolio, node.slug, node.node_type, roomKeySourceLabel,
    hrefForWork,
  ]);

  return (
    <div className={styles.ggm}>
      {effective.scrollProgress && <GgmScrollBar />}
      {effective.customCursor && <GgmCursor />}

      <GgmStage node={node} scenes={scenes} />

      {/* Quiet Presence-native action layer pinned to the very bottom
          of the document. The stage holds the visitor's attention; this
          strip is reachable by intentional scroll past the stage. */}
      <section className={styles.presenceActionLayer} aria-label="Presence actions">
        <div className={styles.shell} style={{ padding: "2.2rem 0" }}>
          <PresenceGraphActions node={node} captureOnMount={false} />
          <p style={{ marginTop: "1rem", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ggm-muted)" }}>
            © {brand} · {GGM_ARTIST.location}
            {" · "}
            <a
              href={GGM_ARTIST.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-hover
              style={{ textDecoration: "underline", textUnderlineOffset: "0.14rem" }}
            >
              Art Scene Today
            </a>
            {" · "}
            <a
              href={GGM_LIVE_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-hover
              style={{ textDecoration: "underline", textUnderlineOffset: "0.14rem" }}
            >
              Source portfolio
            </a>
            {statementQuote ? "" : null}
          </p>
        </div>
      </section>
    </div>
  );
}

// ── Scene 01 overlay (Artwork Field) ────────────────────────────────────────

interface ArtworkFieldOverlayProps {
  slides: GgmWork[];
  brand: string;
  caption: string;
  roomKeySourceLabel: string | null;
}

function ArtworkFieldOverlay({
  slides,
  brand,
  caption,
  roomKeySourceLabel,
}: ArtworkFieldOverlayProps) {
  // Internal hero slide rotation. When the active hero slide changes
  // (auto-advance or arrow click), the GgmStage's WebGL canvas morphs
  // between Scene 01's backgroundImage values via the parent. But Scene
  // 01 has its OWN slide track for cycling between the 5 hero
  // artworks — that's distinct from the 4 scenes. Here we expose a UI
  // for it; the actual hero slide management is handled below.
  //
  // For v3 we treat the 4 scenes themselves as the slideshow at the
  // top level — each scene's backgroundImage is one of the hero
  // artworks. The original 5-slide internal cycle is kept as a softer
  // affordance via the dot row at the bottom; clicking a dot calls
  // window.scrollTo and trips the hero slide via a custom event so we
  // don't have to thread a callback through the stage.
  //
  // For simplicity in v3, we only display the work title and caption
  // for the first scene background and let the visitor advance scenes
  // for further artworks. Internal slide auto-advance is intentionally
  // removed to focus the visitor on the scene rhythm; the user can
  // still hit ←/→ via keyboard or click prev/next on the in-scene UI.
  const first = slides[0];

  return (
    <div className={styles.sceneFieldOverlay}>
      <div className={styles.sceneFieldTopNotes}>
        <span>Serendipity pathway · liquid morphology</span>
        <span>Scroll to advance · paper gallery rhythm</span>
      </div>
      <div className={styles.sceneFieldBottom}>
        {roomKeySourceLabel && (
          <span className={styles.sceneFieldChip} aria-live="polite">
            ✱ Opened via {roomKeySourceLabel}
          </span>
        )}
        {first && (
          <p className={styles.sceneFieldWorkTitle}>
            {first.title} <span style={{ opacity: 0.7, fontSize: "0.6em", letterSpacing: "0.18em" }}>· {first.year}</span>
          </p>
        )}
        <p className={styles.sceneFieldCaption}>{caption ?? brand}</p>
      </div>
    </div>
  );
}

// ── Scene 02 surface (Work Wall) ────────────────────────────────────────────

interface WorkWallSurfaceProps {
  works: GgmWork[];
  hrefForWork: (w: GgmWork) => string;
}

function WorkWallSurface({ works, hrefForWork }: WorkWallSurfaceProps) {
  return (
    <div className={styles.wallShell}>
      <header className={styles.wallHead}>
        <div>
          <p className={styles.blockEyebrow}>
            <span className={styles.blockEyebrowNumber}>02</span>
            Work Wall
          </p>
          <h2>Selected watercolour works.</h2>
        </div>
        <p className={styles.wallHeadMeta}>
          {works.length.toString().padStart(2, "0")} works · 2005 — 2019
        </p>
      </header>

      <div className={styles.wallGrid}>
        {works.map((w, i) => (
          <Link
            key={w.id}
            href={hrefForWork(w)}
            className={`${styles.wallTile} ${WALL_VARIANTS[i % WALL_VARIANTS.length]}`}
            data-hover
          >
            <Image
              src={w.thumb}
              alt={w.alt}
              fill
              sizes="(max-width: 920px) 100vw, 50vw"
            />
            <div className={styles.wallTileMeta}>
              <span>{w.title}</span>
              <small>{w.year}</small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
