"use client";

// Atmosphere layers for the GGM faithful Room.
//
// The source site uses a Three.js WebGL slideshow with liquid morphology
// between artworks plus a soft dither film grain. We can't ship Three.js
// (license + bundle), so this module composes a Presence-safe substitute
// that still reads as premium:
//
//   - LiquidField : a CSS radial bloom that tracks cursor position.
//   - DitherFilm  : an SVG fractalNoise + halftone composite, applied via
//                   CSS `background-image`. Static, GPU-cheap, screenshot
//                   stable. Reads as film grain because two noise
//                   frequencies are layered with different blend modes.
//   - LiquidMorphDefs : reusable SVG <defs> with a feTurbulence +
//                   feDisplacementMap filter. The hero slideshow applies
//                   this filter to the active artwork while a transition
//                   is in progress, producing genuine wave displacement
//                   without Three.js. See useLiquidMorph().
//
// Every layer respects prefers-reduced-motion: under that media query
// the CSS rules disable visible motion and we also skip rAF loops.

import { useEffect, useRef, useState } from "react";
import styles from "./ggm.module.css";

// ── Liquid field (cursor-tracked radial bloom) ──────────────────────────────

export function GgmLiquidField() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    let mx = 50;
    let my = 50;
    let tx = 50;
    let ty = 50;
    let frame = 0;
    let running = false;

    function step() {
      const dx = tx - mx;
      const dy = ty - my;
      mx += dx * 0.08;
      my += dy * 0.08;
      el!.style.setProperty("--mx", `${mx}%`);
      el!.style.setProperty("--my", `${my}%`);
      if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
        running = false;
        return;
      }
      frame = window.requestAnimationFrame(step);
    }

    function onMove(e: PointerEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(1, rect.width);
      const y = (e.clientY - rect.top) / Math.max(1, rect.height);
      tx = Math.max(0, Math.min(1, x)) * 100;
      ty = Math.max(0, Math.min(1, y)) * 100;
      if (!running) {
        running = true;
        frame = window.requestAnimationFrame(step);
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} className={styles.liquidField} aria-hidden />;
}

// ── Dither film (SVG turbulence + halftone composite) ───────────────────────
//
// Layered noise: a fine 0.85 baseFrequency fractalNoise (the film grain)
// and a coarser 0.32 baseFrequency turbulence (the halftone macro
// pattern). Both are encoded as data: URIs inside the CSS module, so
// they have zero runtime overhead and screenshot cleanly. Strength
// parameter is preserved for compatibility with existing callers.

interface DitherFilmProps {
  strength?: number;
}

export function GgmDitherLayer({ strength = 1 }: DitherFilmProps) {
  // The strength prop maps to overall opacity. The CSS module already
  // sets a sensible baseline; we just modulate it.
  const opacity = Math.max(0, Math.min(1, strength)) * 0.6 + 0.18;
  return (
    <div
      className={styles.ditherFilm}
      style={{ opacity }}
      aria-hidden
    />
  );
}

// ── Liquid morph SVG defs (reusable filter for the hero slideshow) ──────────

interface LiquidMorphDefsProps {
  /** The hook's morph value; 0 = rest, 1 = peak distortion. */
  morph: number;
  /** Filter id — must be unique per defs instance. */
  id?: string;
}

/**
 * Inline SVG <defs> that other elements can reference via
 * `filter: url(#ggm-liquid-morph)`. Animates the feDisplacementMap
 * `scale` between 0 and ~110 driven by React state on the hero
 * slideshow, producing a real wave distortion between slides.
 */
export function GgmLiquidMorphDefs({ morph, id = "ggm-liquid-morph" }: LiquidMorphDefsProps) {
  const scale = Math.max(0, Math.min(1, morph)) * 90;
  // Seed nudges so successive transitions feel different rather than
  // playing the exact same wave each time.
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.024"
            numOctaves="2"
            seed={Math.floor(scale * 13) % 97}
            result="t"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="t"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

// ── Liquid morph hook — animates the morph value across a transition ────────

interface UseLiquidMorphResult {
  morph: number;
  trigger: () => void;
}

/**
 * Returns a `morph` value (0–1) that follows an asymmetric easing curve
 * each time `trigger()` is called. Used by GgmHero to animate the
 * feDisplacementMap scale across a slide transition. Under reduced
 * motion it stays at 0 and the trigger is a no-op.
 */
export function useLiquidMorph(durationMs = 1100): UseLiquidMorphResult {
  const [morph, setMorph] = useState(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function trigger() {
    if (reducedMotionRef.current) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // Asymmetric curve: rises fast to ~0.85, then settles back to 0.
      const peak = t < 0.45
        ? Math.sin((t / 0.45) * (Math.PI / 2)) * 0.92
        : Math.cos(((t - 0.45) / 0.55) * (Math.PI / 2)) * 0.92;
      setMorph(Math.max(0, peak));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setMorph(0);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }

  return { morph, trigger };
}
