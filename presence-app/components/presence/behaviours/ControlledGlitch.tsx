"use client";

// controlled_glitch — scanline displacement on a target element.
// Throttled to feel intentional rather than constant. Honours
// prefers-reduced-motion strictly: when set, the glitch is a single
// static offset frame at most, with no animation loop.

import { useEffect, useRef, type ReactNode } from "react";
import type { BehaviourIntensity } from "@/lib/presence/dna/types";

interface ControlledGlitchProps {
  intensity?: BehaviourIntensity;
  children: ReactNode;
  className?: string;
  // RGB displacement for the chromatic aberration layer
  chroma?: boolean;
}

const INTENSITY_TIMINGS: Record<BehaviourIntensity, { period: number; burst: number }> = {
  off: { period: 0, burst: 0 },
  subtle: { period: 9000, burst: 220 },
  featured: { period: 5200, burst: 320 },
  high: { period: 2800, burst: 460 },
};

export default function ControlledGlitch({
  intensity = "featured",
  children,
  className,
  chroma = true,
}: ControlledGlitchProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (intensity === "off") return;
    const node = ref.current;
    if (!node) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      // One subtle frame, then nothing.
      node.classList.add("presence-glitch-reduced");
      return;
    }
    const { period, burst } = INTENSITY_TIMINGS[intensity];
    if (!period) return;

    let cancelled = false;
    let timeout: number | null = null;

    const trigger = () => {
      if (cancelled || !node) return;
      node.classList.add("is-glitching");
      const off = window.setTimeout(() => {
        if (!cancelled && node) node.classList.remove("is-glitching");
      }, burst);
      const next = period + (Math.random() - 0.5) * period * 0.4;
      timeout = window.setTimeout(trigger, Math.max(900, next));
      return () => window.clearTimeout(off);
    };

    timeout = window.setTimeout(trigger, period);
    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
      node.classList.remove("is-glitching");
      node.classList.remove("presence-glitch-reduced");
    };
  }, [intensity]);

  return (
    <div ref={ref} className={`presence-behaviour-glitch ${chroma ? "with-chroma" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
