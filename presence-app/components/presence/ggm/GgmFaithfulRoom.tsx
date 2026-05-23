"use client";

// GGM Faithful Room — the renderer activated by `ggm-faithful-room-v1`.
//
// Architecture: this is NOT a long scrolling page. It is a sequence of
// four spatial blocks (scene plates) that the visitor moves between:
//
//   01 — Artwork Field   (full-viewport slideshow, liquid morph, dither)
//   02 — Work Wall       (asymmetric 12-col wall hang of selected works)
//   03 — Practice Studio (about composed as a workbench)
//   04 — Calling Card    (contact composed as a paper object)
//
// Each block:
//   - is at least 100dvh tall
//   - has its own atmosphere (ghost word + film grain)
//   - has its own reveal choreography on enter
//   - shows up in the right-edge sticky chapter index
//
// Presence-native actions (PublicEnquiryDialog + PresenceGraphActions)
// are folded into the calling card and into a discreet bottom action
// strip so they feel embedded into the world rather than bolted on.
//
// Single Room — the same component handles both home and focused work
// detail. /r/[token] also dispatches here for GGM, with a
// `roomKeySourceLabel` prop surfacing the "Opened via NFC" chip on the
// hero.

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
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
import { GgmHero } from "./GgmHero";
import { GgmReveal } from "./GgmReveal";
import { GgmStudioScene } from "./GgmStudioScene";
import { GgmCallingCard } from "./GgmCallingCard";
import {
  GgmChapterIndex,
  GgmCursor,
  GgmScrollBar,
  useActiveBlock,
  type ChapterDef,
} from "./GgmChrome";
import { GgmWorkDetail } from "./GgmWorkDetail";
import styles from "./ggm.module.css";

interface GgmFaithfulRoomProps {
  node: PresenceNode;
  roomKeySourceLabel?: string | null;
  focusWorkSlug?: string | null;
}

const CHAPTERS: ChapterDef[] = [
  { id: "ggm-block-field",   number: "01", label: "Artwork Field" },
  { id: "ggm-block-wall",    number: "02", label: "Work Wall" },
  { id: "ggm-block-studio",  number: "03", label: "Practice Studio" },
  { id: "ggm-block-card",    number: "04", label: "Calling Card" },
];

// Wall layout sizes — repeat to cover any number of works gracefully.
const WALL_VARIANTS = [
  styles.wallTile1, styles.wallTile2, styles.wallTile3, styles.wallTile4,
  styles.wallTile5, styles.wallTile6, styles.wallTile7, styles.wallTile8,
];

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

export default function GgmFaithfulRoom({
  node,
  roomKeySourceLabel,
  focusWorkSlug,
}: GgmFaithfulRoomProps) {
  const works = useMemo(() => buildWorks(node), [node]);

  const heroSlides = useMemo(() => {
    const ordered = GGM_HERO_SEQUENCE.map((h) => works.find((w) => w.slug === h.slug)).filter(
      (w): w is GgmWork => Boolean(w),
    );
    return ordered.length > 0 ? ordered : works.slice(0, 5);
  }, [works]);

  const wallWorks = useMemo(() => {
    // Preserve source featured order at the top of the wall, then any
    // remaining works after.
    const featuredSlugs = GGM_FEATURED.map((f) => f.slug);
    const featured = featuredSlugs
      .map((s) => works.find((w) => w.slug === s))
      .filter((w): w is GgmWork => Boolean(w));
    const rest = works.filter((w) => !featuredSlugs.includes(w.slug));
    return [...featured, ...rest];
  }, [works]);

  const brand = node.display_name ?? GGM_ARTIST.name;
  const caption = node.headline ?? GGM_ARTIST.heroCaption;
  const aboutIntro = node.bio ?? node.short_bio ?? GGM_ARTIST.aboutIntro;
  const aboutBody = node.long_story ?? GGM_ARTIST.aboutBody;
  const statementQuote = node.practice_statement ?? GGM_ARTIST.statementQuote;
  const externalPortfolio = pickExternalPortfolio(node);

  const hrefForWork = (w: GgmWork) =>
    `/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(w.slug)}`;

  // Focused work-detail mode — short-circuits to the dedicated detail
  // surface, preserving the room shell (cursor + scroll progress) but
  // skipping the block-navigation.
  if (focusWorkSlug) {
    const focus = works.find((w) => w.slug === focusWorkSlug);
    if (focus) {
      const idx = works.findIndex((w) => w.slug === focus.slug);
      const prev = idx > 0 ? works[idx - 1] : works[works.length - 1];
      const next = idx < works.length - 1 ? works[idx + 1] : works[0];
      const related = works.filter((w) => w.slug !== focus.slug).slice(0, 3);
      return (
        <RoomShell node={node}>
          <GgmReveal>
            <GgmWorkDetail
              work={focus}
              prev={prev}
              next={next}
              related={related}
              statementQuote={statementQuote}
              hrefForWork={hrefForWork}
              backHref={`/p/${encodeURIComponent(node.slug)}#ggm-block-wall`}
            />
          </GgmReveal>
        </RoomShell>
      );
    }
  }

  return (
    <RoomShell node={node}>
      <RoomBlocks
        node={node}
        brand={brand}
        caption={caption}
        heroSlides={heroSlides}
        roomKeySourceLabel={roomKeySourceLabel}
        wallWorks={wallWorks}
        aboutIntro={aboutIntro}
        aboutBody={aboutBody}
        statementQuote={statementQuote}
        externalPortfolio={externalPortfolio}
        hrefForWork={hrefForWork}
      />
    </RoomShell>
  );
}

// ── Room shell ──────────────────────────────────────────────────────────────

function RoomShell({ node, children }: { node: PresenceNode; children: React.ReactNode }) {
  return (
    <div className={`${styles.ggm} ${styles.ggmRoot}`}>
      <GgmScrollBar />
      <GgmCursor />
      <nav className={styles.nav} aria-label="Primary">
        <Link className={styles.navBrand} href={`/p/${encodeURIComponent(node.slug)}`}>
          {node.display_name}
        </Link>
        <div className={styles.navLinks}>
          <a href="#ggm-block-wall" data-hover>Work</a>
          <a href="#ggm-block-studio" data-hover>Studio</a>
          <a href="#ggm-block-card" data-hover>Contact</a>
        </div>
      </nav>
      {children}
    </div>
  );
}

// ── Room blocks (active-block tracking lives here so we don't run hooks
//    inside the focused-detail branch above) ───────────────────────────────

interface RoomBlocksProps {
  node: PresenceNode;
  brand: string;
  caption: string;
  heroSlides: GgmWork[];
  roomKeySourceLabel?: string | null;
  wallWorks: GgmWork[];
  aboutIntro: string;
  aboutBody: string;
  statementQuote: string;
  externalPortfolio: { label: string; href: string };
  hrefForWork: (w: GgmWork) => string;
}

function RoomBlocks({
  node,
  brand,
  caption,
  heroSlides,
  roomKeySourceLabel,
  wallWorks,
  aboutIntro,
  aboutBody,
  statementQuote,
  externalPortfolio,
  hrefForWork,
}: RoomBlocksProps) {
  const activeBlock = useActiveBlock({ ids: CHAPTERS.map((c) => c.id) });

  function jump(id: string) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <GgmChapterIndex chapters={CHAPTERS} activeId={activeBlock} onJump={jump} />

      <main className={styles.blocks}>
        {/* ── 01 ARTWORK FIELD ───────────────────────────────────────── */}
        <section
          id="ggm-block-field"
          className={styles.block}
          aria-label="Artwork field"
        >
          <GgmHero
            slides={heroSlides}
            brand={brand}
            caption={caption}
            topNoteLeft={
              roomKeySourceLabel
                ? `Opened via ${roomKeySourceLabel} · selected watercolour works`
                : "Serendipity pathway · liquid morphology"
            }
            topNoteRight="Scroll to dither in · paper gallery rhythm"
            roomKeySourceLabel={roomKeySourceLabel}
          />
        </section>

        {/* ── 02 WORK WALL ───────────────────────────────────────────── */}
        <BlockReveal
          tag="section"
          id="ggm-block-wall"
          className={`${styles.block} ${styles.wallBlock}`}
          ariaLabel="Work wall"
        >
          <span className={`${styles.blockGhost} ${styles.blockGhostBottomRight}`} aria-hidden>
            wall
          </span>
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
                {wallWorks.length.toString().padStart(2, "0")} works · 2005 — 2019
              </p>
            </header>

            <div className={styles.wallGrid}>
              {wallWorks.map((w, i) => (
                <Link
                  key={w.id}
                  href={hrefForWork(w)}
                  className={`${styles.wallTile} ${WALL_VARIANTS[i % WALL_VARIANTS.length]} ${styles.blockRevealChild}`}
                  style={{ ["--i" as never]: Math.min(i, 8) }}
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
        </BlockReveal>

        {/* ── 03 PRACTICE STUDIO ─────────────────────────────────────── */}
        <BlockReveal
          tag="section"
          id="ggm-block-studio"
          className={`${styles.block} ${styles.studioBlock}`}
          ariaLabel="Practice studio"
        >
          <span className={`${styles.blockGhost} ${styles.blockGhostTopLeft}`} aria-hidden>
            studio
          </span>
          <GgmStudioScene
            artist={GGM_ARTIST}
            aboutIntro={aboutIntro}
            aboutBody={aboutBody}
            strands={GGM_STRANDS}
            inspire={GGM_INSPIRE}
          />
        </BlockReveal>

        {/* ── 04 CALLING CARD ────────────────────────────────────────── */}
        <BlockReveal
          tag="section"
          id="ggm-block-card"
          className={`${styles.block} ${styles.callingBlock}`}
          ariaLabel="Calling card"
        >
          <span className={`${styles.blockGhost} ${styles.blockGhostCenter}`} aria-hidden>
            invite
          </span>
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
        </BlockReveal>
      </main>

      {/* Presence-native action layer — quiet, paper-themed, lives
          outside the 4 blocks so it doesn't disturb the scene rhythm. */}
      <section
        className={styles.presenceActionLayer}
        aria-label="Presence actions"
      >
        <div className={styles.shell} style={{ padding: "2.5rem 0" }}>
          <PresenceGraphActions node={node} captureOnMount={false} />
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© {brand}</p>
        <p>
          Reference profile:{" "}
          <a
            href={GGM_ARTIST.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-hover
          >
            Art Scene Today
          </a>
          {" · "}
          <a href={GGM_LIVE_DEMO_URL} target="_blank" rel="noopener noreferrer" data-hover>
            Source portfolio
          </a>
          {statementQuote ? null : null /* keep statement quote reachable via Studio */}
        </p>
      </footer>
    </>
  );
}

// ── Reveal wrapper specialised for blocks (uses .blockReveal class so
//    children with .blockRevealChild get a staggered animation). ──────────

function BlockReveal({
  tag = "section",
  id,
  className = "",
  ariaLabel,
  children,
}: {
  tag?: "section" | "div" | "article" | "main";
  id?: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <GgmReveal
      as={tag}
      id={id}
      className={`${styles.blockReveal} ${className}`}
      ariaLabel={ariaLabel}
    >
      {children}
    </GgmReveal>
  );
}

function prettyHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Pick the external portfolio link to surface on the Calling Card. Skips
// the node's own public_url when it points back at this Room (which is
// what fetchDemoOrPublicNode does on local), and prefers a backend-
// supplied visible link labelled "portfolio" / "website" if one exists.
// Falls back to the canonical GGM artist website.
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
