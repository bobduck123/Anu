"use client";

// GGM work index — year filters, grid/list toggle, "serendipity pathway"
// panel. Mirrors C:\Dev\ggm\work\index.html and styles/pages.css.

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { GgmWork } from "@/lib/presence/ggm/source";
import styles from "./ggm.module.css";

interface GgmWorkIndexProps {
  works: GgmWork[];
  hrefForWork: (work: GgmWork) => string;
}

type ViewMode = "grid" | "list";

export function GgmWorkIndex({ works, hrefForWork }: GgmWorkIndexProps) {
  const years = useMemo(() => {
    const list = Array.from(new Set(works.map((w) => w.year))).sort((a, b) => a - b);
    return list;
  }, [works]);

  const [filter, setFilter] = useState<"all" | number>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [pathway, setPathway] = useState<GgmWork[] | null>(null);
  const [pathwayNote, setPathwayNote] = useState<string>("No pathway generated yet.");

  const visible = useMemo(() => {
    if (filter === "all") return works;
    return works.filter((w) => w.year === filter);
  }, [works, filter]);

  const generatePathway = useCallback(() => {
    if (works.length < 2) {
      setPathway(null);
      setPathwayNote("Add more works to surface a pathway.");
      return;
    }
    const pool = [...works];
    const picks: GgmWork[] = [];
    const n = Math.min(4, pool.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    setPathway(picks);
    const moods = picks.flatMap((w) => w.moodTags).slice(0, 3);
    setPathwayNote(
      moods.length
        ? `Pathway threads ${moods.join(" · ")} across ${picks.length} works.`
        : `Pathway across ${picks.length} works.`,
    );
  }, [works]);

  return (
    <>
      <div className={styles.workControls}>
        <div className={styles.workFilterGroup} role="group" aria-label="Filter by year">
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={`${styles.filterBtn} ${filter === year ? styles.filterBtnActive : ""}`}
              onClick={() => setFilter(year)}
            >
              {year}
            </button>
          ))}
        </div>
        <div className={styles.workViewGroup} role="group" aria-label="Toggle view mode">
          <button
            type="button"
            className={`${styles.viewBtn} ${view === "grid" ? styles.viewBtnActive : ""}`}
            onClick={() => setView("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${view === "list" ? styles.viewBtnActive : ""}`}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>

      <aside className={styles.serendipityPanel}>
        <div className={styles.serendipityHead}>
          <p>
            Serendipity pathway discovers non-linear artwork pairings to deepen
            interpretation.
          </p>
          <button type="button" className={styles.btn} onClick={generatePathway}>
            Generate pathway
          </button>
        </div>
        {pathway && (
          <div className={styles.serendipityPath}>
            {pathway.map((w) => (
              <Link key={w.id} href={hrefForWork(w)} className={styles.serendipityChip}>
                {w.title} <small style={{ opacity: 0.6 }}>{w.year}</small>
              </Link>
            ))}
          </div>
        )}
        <p className={styles.serendipityNote}>{pathwayNote}</p>
      </aside>

      <div
        className={`${styles.workGrid} ${view === "list" ? styles.workGridList : ""}`}
      >
        {visible.map((w) => (
          <Link
            key={w.id}
            href={hrefForWork(w)}
            className={`${styles.workCard} ${view === "list" ? styles.workCardList : ""}`}
          >
            <div style={{ position: "relative", width: "100%" }}>
              <Image
                src={w.thumb}
                alt={w.alt}
                width={800}
                height={600}
                className={styles.workCardImg}
                sizes="(max-width: 920px) 50vw, 33vw"
              />
            </div>
            <div className={styles.workCardMeta}>
              <h3>{w.title}</h3>
              <small>
                {w.year} · {w.dimensions !== "Unknown" ? `${w.dimensions} · ` : ""}
                {w.medium}
              </small>
              <p>{w.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
