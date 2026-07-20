"use client";

// Practice Studio block — composes the source's About content into a
// workbench-like destination rather than a flat list of paragraphs.
//
// Layout (desktop):
//   [ left column: heading + studio note (pinned paper) + 4 strand cards ]
//   [ right column: timeline (sticky paper) + inspire-board rail ]
//
// On mobile the columns stack and the rail remains scrollable.

import Image from "next/image";
import type { CSSProperties } from "react";
import type { GgmArtist, InspireCard } from "@/lib/presence/ggm/source";
import styles from "./ggm.module.css";

interface GgmStudioSceneProps {
  artist: GgmArtist;
  practiceTitle?: string;
  aboutIntro: string;
  aboutBody: string;
  processNotes?: string;
  strands: Array<{ title: string; body: string }>;
  inspire: InspireCard[];
  elementStyles?: Record<string, CSSProperties>;
}

export function GgmStudioScene({ artist, practiceTitle, aboutIntro, aboutBody, processNotes, strands, inspire, elementStyles = {} }: GgmStudioSceneProps) {
  return (
    <div className={styles.studioShell}>
      <div className={styles.studioLeft}>
        <p className={styles.blockEyebrow}>
          <span className={styles.blockEyebrowNumber}>03</span>
          Practice Studio
        </p>
        <h2 className={styles.blockRevealChild} style={{ ...elementStyles["practice-title"], ["--i" as never]: 0 }}>
          {practiceTitle || `Who is ${firstName(artist.name)}.`}
        </h2>

        <article
          className={`${styles.studioNote} ${styles.blockRevealChild}`}
          style={{ ["--i" as never]: 1 }}
        >
          <p style={elementStyles.biography}>{aboutIntro}</p>
          {aboutBody && <p style={{ marginTop: "0.7rem", ...elementStyles["main-statement"] }}>{aboutBody}</p>}
          {processNotes && <p style={{ marginTop: "0.7rem", ...elementStyles["process-notes"] }}>{processNotes}</p>}
        </article>

        <div className={styles.studioStrands}>
          {strands.map((s, i) => (
            <article
              key={s.title}
              className={`${styles.studioStrand} ${styles.blockRevealChild}`}
              style={{ ["--i" as never]: 2 + i }}
            >
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.studioRight}>
        <section
          className={`${styles.studioTimeline} ${styles.blockRevealChild}`}
          style={{ ["--i" as never]: 1 }}
          aria-label="Working path"
        >
          <header className={styles.studioTimelineHead}>
            <h3>Working path</h3>
            <small>— bench notes</small>
          </header>
          <div className={styles.studioTimelineList}>
            {artist.timeline.map((item) => (
              <div key={item.when} className={styles.studioTimelineItem}>
                <small>{item.when}</small>
                <p>{item.what}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={`${styles.studioInspire} ${styles.blockRevealChild}`}
          style={{ ["--i" as never]: 2 }}
          aria-label="Things that inspire me"
        >
          <header className={styles.studioInspireHead}>
            <h3>(*) Things that inspire me</h3>
            <small>pinned fragments</small>
          </header>
          <div className={styles.studioInspireRail}>
            <div className={styles.timelineRail}>
              {[...inspire, ...inspire].map((card, idx) => (
                <article key={`${card.pin}-${idx}`} className={styles.studioInspireTile}>
                  <Image src={card.image} alt={card.caption} width={300} height={220} />
                  <p>{card.caption}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name;
}
