"use client";

// GGM hero — full-viewport artwork stage with parallax cover image,
// atmospheric layers, prev/next + dot track + counter UI, and source-
// faithful top notes. This is the first viewport visitors see; it must
// load and render correctly even when JS is slow.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { GgmWork } from "@/lib/presence/ggm/source";
import { GgmDitherLayer, GgmLiquidField } from "./GgmAtmosphere";
import styles from "./ggm.module.css";

interface GgmHeroProps {
  slides: GgmWork[];
  brand: string;
  caption: string;
  topNoteLeft?: string;
  topNoteRight?: string;
  interval?: number;
}

export function GgmHero({
  slides,
  brand,
  caption,
  topNoteLeft = "Serendipity pathway · liquid morphology",
  topNoteRight = "Scroll to dither in · scroll-snap to morph",
  interval = 7000,
}: GgmHeroProps) {
  const [index, setIndex] = useState(0);
  const reducedMotionRef = useRef(false);
  const total = slides.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mql.matches;
  }, []);

  // Auto-advance, paused under reduced motion.
  useEffect(() => {
    if (reducedMotionRef.current) return;
    if (total <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, interval);
    return () => window.clearInterval(id);
  }, [total, interval]);

  const goto = useCallback((i: number) => {
    setIndex(((i % total) + total) % total);
  }, [total]);

  const next = useCallback(() => goto(index + 1), [goto, index]);
  const prev = useCallback(() => goto(index - 1), [goto, index]);

  const current = slides[index];

  const counter = useMemo(() => ({
    n: String(index + 1).padStart(2, "0"),
    t: String(total).padStart(2, "0"),
  }), [index, total]);

  // Keyboard support — left / right move the slideshow.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <section className={styles.hero} aria-label={`${brand} — featured works`}>
      <div className={styles.heroSlider} aria-hidden={total === 0}>
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`${styles.heroSlide} ${i === index ? styles.heroSlideActive : ""}`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              sizes="100vw"
              priority={i === 0}
              className={styles.heroSlideImage}
            />
          </div>
        ))}
      </div>

      <div className={styles.heroAtmosphere}>
        <GgmLiquidField />
        <GgmDitherLayer strength={0.34} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.heroTop}>
          <p className={styles.heroTopNote}>{topNoteLeft}</p>
          <p className={styles.heroTopNote}>{topNoteRight}</p>
        </div>

        <div className={styles.heroBottom}>
          {current && (
            <p className={styles.heroWorkTitle} aria-live="polite">
              {current.title} <span aria-hidden> · </span>
              <small style={{ opacity: 0.8, fontSize: "0.6em", letterSpacing: "0.18em" }}>{current.year}</small>
            </p>
          )}
          <p className={styles.heroP}>{caption}</p>
        </div>
      </div>

      <div className={styles.heroLiquidUi} aria-label="Slide controls">
        <button
          type="button"
          className={styles.heroArrow}
          onClick={prev}
          aria-label="Previous work"
        >
          ←
        </button>
        <div className={styles.heroTrack} role="tablist">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${slide.title}`}
              className={`${styles.heroDot} ${i === index ? styles.heroDotActive : ""}`}
              onClick={() => goto(i)}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.heroArrow}
          onClick={next}
          aria-label="Next work"
        >
          →
        </button>
      </div>

      <div className={styles.heroCounter} aria-hidden>
        <span>{counter.n}</span>
        <span>/</span>
        <span>{counter.t}</span>
      </div>
    </section>
  );
}
