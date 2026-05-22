"use client";

// GGM Faithful Room — the renderer activated by `ggm-faithful-room-v1`.
// Mirrors the source site (https://christina-goddard.vercel.app/ and
// C:\Dev\ggm) inside a Presence Room without contaminating any other
// Room. Presence-native actions (enquiry, save, mood-board, signal) are
// integrated quietly via PresenceGraphActions at the bottom of the page,
// re-themed to the GGM paper palette.

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
import { GgmWorkIndex } from "./GgmWorkIndex";
import styles from "./ggm.module.css";

interface GgmFaithfulRoomProps {
  node: PresenceNode;
  // When set, the renderer surfaces an "Opened via …" chip at the top
  // (used by the /r/[token] RoomKey entry path).
  roomKeySourceLabel?: string | null;
  // Optional: when set, the renderer renders a single work-detail view
  // instead of the home + index. Used by /p/[slug]/works/[id] routing.
  focusWorkSlug?: string | null;
}

// Map backend PresenceWork → GgmWork shape for the renderer. Falls back to
// canonical GGM_WORKS when the backend lacks works.
function buildWorks(node: PresenceNode): GgmWork[] {
  const backendWorks = (node.works ?? []).filter((w) => w.is_visible !== false);
  if (backendWorks.length === 0) return GGM_WORKS;
  return backendWorks.map((w, idx) => coerceWork(w, idx));
}

function coerceWork(w: PresenceWork, idx: number): GgmWork {
  // Try to match a canonical entry by title / id; otherwise use the
  // backend record verbatim.
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
  const featured = useMemo(() => {
    const filtered = GGM_FEATURED.map((f) => works.find((w) => w.slug === f.slug)).filter(
      (w): w is GgmWork => Boolean(w),
    );
    return filtered.length >= 4 ? filtered : works.slice(0, 4);
  }, [works]);

  const heroSlides = useMemo(() => {
    const ordered = GGM_HERO_SEQUENCE.map((h) => works.find((w) => w.slug === h.slug)).filter(
      (w): w is GgmWork => Boolean(w),
    );
    return ordered.length > 0 ? ordered : works.slice(0, 5);
  }, [works]);

  const brand = node.display_name ?? GGM_ARTIST.name;
  const caption = node.headline ?? GGM_ARTIST.heroCaption;
  const aboutIntro = node.bio ?? node.short_bio ?? GGM_ARTIST.aboutIntro;
  const aboutBody = node.long_story ?? GGM_ARTIST.aboutBody;
  const statementQuote = node.practice_statement ?? GGM_ARTIST.statementQuote;
  const portfolioHref = node.public_url ?? GGM_ARTIST.contactWebsite;
  const enquirable = Boolean(node.public_url || node.slug);

  const hrefForWork = (w: GgmWork) =>
    `/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(w.slug)}`;

  // Focused work-detail mode short-circuits before rendering the home flow.
  if (focusWorkSlug) {
    // We dynamically import here is not strictly necessary because the
    // detail component is client-side; we just render it directly.
    const focus = works.find((w) => w.slug === focusWorkSlug);
    if (focus) {
      const idx = works.findIndex((w) => w.slug === focus.slug);
      const prev = idx > 0 ? works[idx - 1] : works[works.length - 1];
      const next = idx < works.length - 1 ? works[idx + 1] : works[0];
      const related = works.filter((w) => w.slug !== focus.slug).slice(0, 3);
      return (
        <FaithfulRoomShell node={node} roomKeySourceLabel={roomKeySourceLabel}>
          {/* lazy load via simple require to avoid forcing the detail in
              hero bundle; React handles tree-shaking, this is fine */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <GgmDetailLazy
            work={focus}
            prev={prev}
            next={next}
            related={related}
            statementQuote={statementQuote}
            hrefForWork={hrefForWork}
            backHref={`/p/${encodeURIComponent(node.slug)}#works`}
          />
        </FaithfulRoomShell>
      );
    }
  }

  return (
    <FaithfulRoomShell node={node} roomKeySourceLabel={roomKeySourceLabel}>
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
      />

      <main>
        {/* Home intro */}
        <GgmReveal as="section" className={styles.section}>
          <div className={`${styles.shell} ${styles.homeIntro}`}>
            <div>
              <p className={styles.eyebrow}>Practice</p>
              <h2>Watercolour as site, memory, and connective atmosphere.</h2>
            </div>
            <div>
              <p>{aboutIntro}</p>
              <div className={styles.homeIntroActions}>
                <a className={styles.btn} href="#works">
                  View all works
                </a>
                <a className={`${styles.btn} ${styles.btnMuted}`} href="#about">
                  About the artist
                </a>
              </div>
            </div>
          </div>
        </GgmReveal>

        {/* Featured strip */}
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.featuredStrip}>
              {featured.map((w) => (
                <Link key={w.id} href={hrefForWork(w)} className={styles.featuredCard}>
                  <Image
                    src={w.thumb}
                    alt={w.alt}
                    width={800}
                    height={640}
                    sizes="(max-width: 920px) 50vw, 25vw"
                  />
                  <div className={styles.featuredCardMeta}>
                    {w.title}
                    <small>{w.year}</small>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </GgmReveal>

        {/* Work index */}
        <GgmReveal as="section" id="works" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.pageHead}>
              <p className={styles.eyebrow}>Work</p>
              <h1>Selected portfolio</h1>
              <p>
                Browse by year, switch between layouts, or enter a serendipity
                pathway generated from tags across the work.
              </p>
            </div>
            <GgmWorkIndex works={works} hrefForWork={hrefForWork} />
          </div>
        </GgmReveal>

        {/* About: practice note */}
        <GgmReveal as="section" id="about" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.pageHead}>
              <p className={styles.eyebrow}>About</p>
              <h1>Who is {brand.split(" ")[0] || "Christina"}</h1>
              <p>{aboutIntro}</p>
            </div>
            <div className={styles.aboutWho}>
              <p className={styles.aboutWhoLabel}>Practice note</p>
              <div className={styles.aboutWhoContent}>
                <p>{aboutIntro}</p>
                {aboutBody && <p>{aboutBody}</p>}
              </div>
            </div>
          </div>
        </GgmReveal>

        {/* About: working path */}
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.aboutWay}>
              <div className={styles.aboutWayHead}>
                <p className={styles.eyebrow}>My way</p>
                <h2>Working path</h2>
              </div>
              <div className={styles.aboutWayTimeline}>
                {GGM_ARTIST.timeline.map((item) => (
                  <article key={item.when} className={styles.aboutWayItem}>
                    <small>{item.when}</small>
                    <p>{item.what}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </GgmReveal>

        {/* About: working concerns */}
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <p className={styles.eyebrow}>Working concerns</p>
            <div className={styles.strandsGrid}>
              {GGM_STRANDS.map((s) => (
                <article key={s.title} className={styles.strandCard}>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </article>
              ))}
            </div>
          </div>
        </GgmReveal>

        {/* About: inspiration board (animated marquee) */}
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.aboutInspire}>
              <p className={styles.eyebrow}>Culture</p>
              <h2>(*) Things that inspire me</h2>
              <div
                className={styles.inspireBoard}
                aria-label="Things that inspire me"
              >
                <div className={styles.inspireTrack}>
                  {[...GGM_INSPIRE, ...GGM_INSPIRE].map((card, idx) => (
                    <article
                      key={`${card.pin}-${idx}`}
                      className={`${styles.inspireCard} ${variantClass(card.variant)}`}
                    >
                      <Image
                        src={card.image}
                        alt={card.caption}
                        width={400}
                        height={300}
                      />
                      <p>{card.caption}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GgmReveal>

        {/* Statement quote */}
        {statementQuote && (
          <GgmReveal as="section" className={styles.section}>
            <div className={styles.shell}>
              <p className={styles.eyebrow}>From the artist statement</p>
              <h2 className={styles.workStatement}>{statementQuote}</h2>
            </div>
          </GgmReveal>
        )}

        {/* Contact + external portfolio + Presence-native enquiry */}
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.aboutContact}>
              <div>
                <p className={styles.eyebrow}>(*)</p>
                <h3>Interested in exhibitions, projects, or commissions?</h3>
                <p>
                  Reach out and Christina can share available works, exhibition
                  history, and current studio directions.
                </p>
              </div>
              <div className={styles.aboutContactLinks}>
                {enquirable && (
                  <PublicEnquiryDialog
                    slug={node.slug}
                    displayName={brand}
                    nodeType={node.node_type}
                    triggerLabel="Begin a conversation"
                  />
                )}
                {GGM_ARTIST.contactEmail && (
                  <a href={`mailto:${GGM_ARTIST.contactEmail}`}>
                    {GGM_ARTIST.contactEmail}
                  </a>
                )}
                {portfolioHref && (
                  <a
                    href={portfolioHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {prettyHost(portfolioHref) ?? "External portfolio"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </GgmReveal>

        {/* Presence-native action layer — saves, signals, mood boards,
            field notes. Quiet, paper-themed. */}
        <section
          className={styles.presenceActionLayer}
          aria-label="Presence actions"
        >
          <div className={styles.shell} style={{ padding: "2.5rem 0" }}>
            <PresenceGraphActions node={node} captureOnMount={false} />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© {brand}</p>
        <p>
          Reference profile:{" "}
          <a
            href={GGM_ARTIST.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Art Scene Today
          </a>
          {" · "}
          <a href={GGM_LIVE_DEMO_URL} target="_blank" rel="noopener noreferrer">
            Source portfolio
          </a>
        </p>
      </footer>
    </FaithfulRoomShell>
  );
}

function variantClass(variant: GgmInspireVariant) {
  switch (variant) {
    case "tall":
      return styles.variantTall;
    case "wide":
      return styles.variantWide;
    case "mid":
      return styles.variantMid;
    case "poster":
      return styles.variantPoster;
    case "portrait":
      return styles.variantPortrait;
    default:
      return styles.variantTall;
  }
}

type GgmInspireVariant = (typeof GGM_INSPIRE)[number]["variant"];

function prettyHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function FaithfulRoomShell({
  node,
  roomKeySourceLabel,
  children,
}: {
  node: PresenceNode;
  roomKeySourceLabel?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.ggm}>
      <nav className={styles.nav} aria-label="Primary">
        <Link className={styles.navBrand} href={`/p/${encodeURIComponent(node.slug)}`}>
          {node.display_name}
        </Link>
        <div className={styles.navLinks}>
          <a href="#works">Work</a>
          <a href="#about">About</a>
          {GGM_ARTIST.contactEmail && (
            <a href={`mailto:${GGM_ARTIST.contactEmail}`}>Contact</a>
          )}
        </div>
      </nav>
      {roomKeySourceLabel && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span className={styles.roomKeyChip}>
            Opened via {roomKeySourceLabel}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// Eagerly imported detail surface — keeping the bundle simple. (Avoids
// chasing dynamic imports for a Pilot Room.)
import { GgmWorkDetail } from "./GgmWorkDetail";
function GgmDetailLazy(props: React.ComponentProps<typeof GgmWorkDetail>) {
  return <GgmWorkDetail {...props} />;
}
