"use client";

// GGM work detail — paper hero with contained artwork + atmospheric layers,
// head with title/meta/description/pager, memory prompt overlay (mood /
// place / time / reflection), Context / Process / Memory triptych,
// statement quote, related works. Used by the GGM faithful renderer in
// "single page" mode (where work selection happens in-place) and by the
// /p/[slug]/works/[id] dedicated detail route.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { GgmWork } from "@/lib/presence/ggm/source";
import { GgmDitherLayer, GgmLiquidField } from "./GgmAtmosphere";
import { GgmReveal } from "./GgmReveal";
import styles from "./ggm.module.css";

const MOODS = ["Wonder", "Stillness", "Tension", "Nostalgia", "Melancholy", "Hope"];
const PLACES = ["Forest", "Road / Journey", "Home / Domestic", "Water edge", "Unknown / Dream"];
const TIMES = ["Dawn", "Noon", "Dusk", "Night", "Timeless"];

interface GgmWorkDetailProps {
  work: GgmWork;
  prev?: GgmWork | null;
  next?: GgmWork | null;
  related: GgmWork[];
  statementQuote: string;
  hrefForWork: (work: GgmWork) => string;
  backHref: string;
}

interface MemoryEntry {
  mood: string;
  place: string;
  time: string;
  reflection: string;
}

function storageKey(slug: string) {
  return `ggm:memory:${slug}`;
}

export function GgmWorkDetail({
  work,
  prev,
  next,
  related,
  statementQuote,
  hrefForWork,
  backHref,
}: GgmWorkDetailProps) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState(MOODS[0]);
  const [place, setPlace] = useState(PLACES[0]);
  const [time, setTime] = useState(TIMES[0]);
  const [reflection, setReflection] = useState("");
  const [entries, setEntries] = useState<MemoryEntry[]>([]);

  // Memory entries are stored locally only — no network call. This mirrors
  // the source's anonymous memory-prompt behaviour and avoids any PII risk.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey(work.slug));
      if (raw) setEntries(JSON.parse(raw) as MemoryEntry[]);
    } catch {
      // ignore — corrupted local storage is non-fatal.
    }
  }, [work.slug]);

  function saveEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entry: MemoryEntry = { mood, place, time, reflection };
    const updated = [...entries, entry].slice(-12);
    setEntries(updated);
    setReflection("");
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey(work.slug), JSON.stringify(updated));
      } catch {
        // ignore quota errors — entries still live in state.
      }
    }
  }

  function clearEntries() {
    setEntries([]);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey(work.slug));
      } catch {
        // ignore.
      }
    }
  }

  const resonance = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const key of [e.mood, e.place, e.time]) {
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries]);

  return (
    <main className={styles.workDetailRoot}>
      <div className={styles.shell}>
        <p className={styles.workDetailCrumb}>
          <Link href={backHref}>← Back to works</Link>
        </p>
      </div>

      <GgmReveal as="section" className={styles.section}>
        <div className={styles.shell}>
          <article className={styles.workDetailHero}>
            <div className={styles.workDetailAtmosphere} aria-hidden>
              <GgmLiquidField />
              <GgmDitherLayer strength={0.22} />
            </div>
            <Image
              src={work.image}
              alt={work.alt}
              width={1600}
              height={1200}
              className={styles.workDetailHeroImage}
              priority
            />
            <div className={styles.workDetailHead}>
              <div>
                <h1>{work.title}</h1>
                <p className={styles.workDetailMeta}>
                  {work.year}
                  {work.dimensions !== "Unknown" ? ` · ${work.dimensions}` : ""}
                  {" · "}
                  {work.medium}
                </p>
                <p className={styles.workDetailDescription}>{work.description}</p>
              </div>
              <nav className={styles.workDetailPager} aria-label="Artwork navigation">
                {prev && (
                  <Link href={hrefForWork(prev)} className={styles.pagerLink}>
                    Prev
                  </Link>
                )}
                {next && (
                  <Link href={hrefForWork(next)} className={styles.pagerLink}>
                    Next
                  </Link>
                )}
              </nav>
            </div>
          </article>
        </div>
      </GgmReveal>

      <GgmReveal as="section" className={styles.section}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Memory prompt overlay</p>
          <div className={styles.memoryOverlay}>
            <div className={styles.memoryTop}>
              <p>
                Reflect on what this work evokes. Your anonymous response stays
                on this device and shapes resonance tags for repeat visits.
              </p>
              <button
                type="button"
                className={styles.btn}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
              >
                {open ? "Close memory prompt" : "Open memory prompt"}
              </button>
            </div>

            {open && (
              <form className={styles.memoryForm} onSubmit={saveEntry}>
                <div className={styles.memoryFields}>
                  <label>
                    Mood
                    <select value={mood} onChange={(e) => setMood(e.target.value)}>
                      {MOODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Place memory
                    <select value={place} onChange={(e) => setPlace(e.target.value)}>
                      {PLACES.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Time feeling
                    <select value={time} onChange={(e) => setTime(e.target.value)}>
                      {TIMES.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Short reflection
                  <textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What does this surface remind you of?"
                  />
                </label>
                <div className={styles.memoryActions}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnMuted}`}
                    onClick={clearEntries}
                  >
                    Clear this work&apos;s responses
                  </button>
                  <button type="submit" className={styles.btn}>
                    Save reflection
                  </button>
                </div>
              </form>
            )}

            {resonance.length > 0 && (
              <div className={styles.memoryResonance}>
                {resonance.map(([label, count]) => (
                  <span key={label} className={styles.resonanceChip}>
                    {label}
                    <small style={{ marginLeft: 6, color: "#6a6a6a" }}>×{count}</small>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </GgmReveal>

      <GgmReveal as="section" className={styles.section}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Project notes</p>
          <div className={styles.workStory}>
            <article className={styles.workStoryBlock}>
              <h3>Context</h3>
              <p>{work.context}</p>
            </article>
            <article className={styles.workStoryBlock}>
              <h3>Process</h3>
              <p>{work.process}</p>
            </article>
            <article className={styles.workStoryBlock}>
              <h3>Memory</h3>
              <p>{work.memory}</p>
            </article>
          </div>
        </div>
      </GgmReveal>

      {statementQuote && (
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <p className={styles.eyebrow}>From the artist statement</p>
            <h2 className={styles.workStatement}>{statementQuote}</h2>
          </div>
        </GgmReveal>
      )}

      {related.length > 0 && (
        <GgmReveal as="section" className={styles.section}>
          <div className={styles.shell}>
            <p className={styles.eyebrow}>Related works</p>
            <div className={styles.relatedGrid}>
              {related.map((w) => (
                <Link key={w.id} href={hrefForWork(w)} className={styles.workCard}>
                  <Image
                    src={w.thumb}
                    alt={w.alt}
                    width={800}
                    height={600}
                    className={styles.workCardImg}
                    sizes="(max-width: 920px) 50vw, 25vw"
                  />
                  <div className={styles.workCardMeta}>
                    <h3>{w.title}</h3>
                    <small>{w.year}</small>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </GgmReveal>
      )}
    </main>
  );
}
