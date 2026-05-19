"use client";

// BioluminescentField — adapted from `bioluminescence` and the canvas
// glow pattern in `cosmos-in-motion-a-3d-particle-study`. A small
// canvas-driven particle field of slow-drifting "spores" with a soft
// halo. Designed as a quiet background atmosphere for nocturnal rooms
// — never a foreground actor.
//
// Reduced-motion: drops to a single static frame with no animation.
// Mobile: lower particle density. Visibility API: pauses when the
// browser tab is hidden.

import { useEffect, useRef } from "react";

interface BioluminescentFieldProps {
  density?: "low" | "moderate" | "high";
  hue?: string; // CSS color
  className?: string;
}

interface Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

const DENSITY_MAP: Record<"low" | "moderate" | "high", number> = {
  low: 24,
  moderate: 44,
  high: 72,
};

export default function BioluminescentField({
  density = "moderate",
  hue = "rgba(255, 216, 77, 1)",
  className,
}: BioluminescentFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    const baseCount = DENSITY_MAP[density];
    const count = Math.max(10, Math.floor(baseCount * (isMobile ? 0.55 : 1)));

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dpr = 1;
    let width = 0;
    let height = 0;
    const spores: Spore[] = [];
    let raf = 0;
    let visible = true;

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      spores.length = 0;
      for (let i = 0; i < count; i += 1) {
        spores.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.14,
          r: 0.6 + Math.random() * 2.4,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const s of spores) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -8) s.x = width + 8;
        if (s.x > width + 8) s.x = -8;
        if (s.y < -8) s.y = height + 8;
        if (s.y > height + 8) s.y = -8;
        const flicker = 0.55 + Math.sin(t * 0.0014 + s.phase) * 0.25;
        ctx.beginPath();
        ctx.fillStyle = hue.replace("1)", `${(0.18 * flicker).toFixed(3)})`);
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = hue.replace("1)", `${(0.7 * flicker).toFixed(3)})`);
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(t: number) {
      if (!visible) return;
      draw(t);
      raf = window.requestAnimationFrame(tick);
    }

    function onVisibility() {
      visible = !document.hidden;
      if (visible) {
        raf = window.requestAnimationFrame(tick);
      } else if (raf) {
        window.cancelAnimationFrame(raf);
      }
    }

    resize();
    seed();
    if (reduce) {
      // Single static frame, no loop.
      draw(0);
    } else {
      raf = window.requestAnimationFrame(tick);
      document.addEventListener("visibilitychange", onVisibility);
    }

    const ro = new ResizeObserver(() => {
      resize();
      seed();
    });
    ro.observe(canvas);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, [density, hue]);

  return <canvas ref={canvasRef} className={`presence-biolum ${className ?? ""}`} aria-hidden />;
}
