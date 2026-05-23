"use client";

// GGM Faithful Room — v4 (UX reset).
//
// The Room is a single fixed 100svh viewing frame with four scenes.
// No sidebar. No persistent dock. No system chrome. The brand floats
// top-left in mix-blend-difference (faithful to the source's nav
// signature). Presence-native enquiry and graph actions are folded
// quietly into the Calling Card scene — they no longer hold a
// persistent strip below the stage.
//
// /r/[token] dispatches into this same component with a
// `roomKeySourceLabel` prop; the chip appears as a tiny provenance
// mark, not a banner.

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PresenceNode, PresenceWork } from "@/lib/api/types";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";
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

// Work-wall layout grammar (8 slots, repeats to cover any count).
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

  const hrefForWork = (w: GgmWork) =>
    `/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(w.slug)}`;

  // Focused work-detail mode — no stage, dedicated detail surface.
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
      content: () => (
        <ArtworkFieldContent
          slide={heroSlides[0] ?? null}
          caption={caption}
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
    externalPortfolio, node.slug, node.node_type,
    hrefForWork,
  ]);

  // statementQuote is intentionally read only inside the Calling Card scene
  // and the focus-detail branch above. Suppress lint by referencing it once.
  void statementQuote;

  return (
    <div className={styles.ggm}>
      <GgmStage
        node={node}
        scenes={scenes}
        roomKeySourceLabel={roomKeySourceLabel}
      />
      {/* Source provenance footer is rendered inside the Calling Card
          scene — no persistent footer outside the stage. The live
          source link still lives in the rendered Calling Card. */}
      {/* Render the source URL one final time as a hidden semantic
          landmark so screen readers can reach it even when scene 04
          is not active. */}
      <span className={styles.srOnly}>
        <a href={GGM_LIVE_DEMO_URL}>Source portfolio: christina-goddard.vercel.app</a>
      </span>
    </div>
  );
}

// ── Scene 01 content — Artwork Field ───────────────────────────────────────
//
// The artwork is the WebGL canvas behind the scene; this layer carries
// only the most discreet identifying text (work title + caption) so
// the visitor isn't asked to read.

function ArtworkFieldContent({
  slide,
  caption,
}: {
  slide: GgmWork | null;
  caption: string;
}) {
  return (
    <div className={styles.fieldContent}>
      {slide && (
        <p className={styles.fieldWorkTitle}>
          {slide.title}
          <span className={styles.fieldWorkYear}>{slide.year}</span>
        </p>
      )}
      <p className={styles.fieldCaption}>{caption}</p>
    </div>
  );
}

// ── Scene 02 surface — Work Wall ───────────────────────────────────────────

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
