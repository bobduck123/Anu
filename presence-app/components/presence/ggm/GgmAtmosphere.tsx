"use client";

// Atmosphere layers that sit behind / in front of the GGM artwork:
//  - LiquidField: a CSS radial blob that tracks cursor position (purely
//    decorative). Reads cursor coords via a pointermove listener on the
//    parent and writes them as --mx / --my custom properties.
//  - DitherLayer: a low-frame-rate canvas that paints a soft monochrome
//    dither pattern, blended on top via mix-blend-mode: soft-light.
//
// Both layers respect prefers-reduced-motion (the CSS rules already hide
// them; the canvas is also short-circuited to avoid spinning rAF).
//
// This is a deliberate Presence-safe substitute for the source's Three.js
// liquid morph: it preserves the source visual signal (warm + cool radial
// bloom, soft dither film grain) without bundling Three.js.

import { useEffect, useRef } from "react";
import styles from "./ggm.module.css";

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
        // Reached steady state — stop the rAF until the next pointer move.
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

interface DitherProps {
  strength?: number;
}

export function GgmDitherLayer({ strength = 0.34 }: DitherProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The source's dither effect reads as static film grain when blended
    // with soft-light at low opacity — the human eye does not need it to
    // animate. We paint a single noise field per mount + resize. This
    // keeps the page screenshot-stable (no rAF spin), matches the
    // perceived source signal, and uses ~constant CPU instead of a
    // 12.5fps full-screen pixel write.
    function paint() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = canvas!.clientWidth | 0;
      const h = canvas!.clientHeight | 0;
      if (w <= 0 || h <= 0) return;
      // Render to a smaller internal buffer; the soft-light blend hides
      // the upscaling. Cheap, screenshot-friendly.
      const bw = Math.max(1, Math.floor(w * dpr * 0.5));
      const bh = Math.max(1, Math.floor(h * dpr * 0.5));
      canvas!.width = bw;
      canvas!.height = bh;
      const img = ctx!.createImageData(bw, bh);
      const data = img.data;
      const len = data.length;
      const s = Math.max(0, Math.min(1, strength));
      for (let i = 0; i < len; i += 4) {
        const n = (Math.random() - 0.5) * 255 * s;
        const v = Math.max(0, Math.min(255, 128 + n));
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 60 + Math.random() * 30;
      }
      ctx!.putImageData(img, 0, 0);
    }

    paint();

    // Repaint on resize so the noise field still fills the layer. Throttle
    // so a rubber-band drag doesn't spam.
    let timer: number | null = null;
    const ro = new ResizeObserver(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(paint, 120) as unknown as number;
    });
    ro.observe(canvas);

    return () => {
      if (timer) window.clearTimeout(timer);
      ro.disconnect();
    };
  }, [strength]);

  return <canvas ref={ref} className={styles.ditherLayer} aria-hidden />;
}
