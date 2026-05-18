"use client";

// gallery_breath — subtle scale + opacity rhythm on hero / image cards.
// Quiet, premium, slow. Disabled under reduced-motion.

import { useEffect, useRef, type ReactNode } from "react";
import type { BehaviourIntensity } from "@/lib/presence/dna/types";

interface GalleryBreathProps {
  intensity?: BehaviourIntensity;
  children: ReactNode;
  className?: string;
}

const INTENSITY: Record<BehaviourIntensity, number> = {
  off: 0,
  subtle: 0.008,
  featured: 0.014,
  high: 0.022,
};

export default function GalleryBreath({ intensity = "subtle", children, className }: GalleryBreathProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (intensity === "off") return;
    const node = ref.current;
    if (!node) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      node.style.removeProperty("transform");
      return;
    }

    const amplitude = INTENSITY[intensity];
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const phase = (t - t0) / 5600;
      const scale = 1 + Math.sin(phase * Math.PI * 2) * amplitude;
      const opacity = 1 - Math.abs(Math.sin(phase * Math.PI * 2)) * 0.02;
      node.style.transform = `scale(${scale.toFixed(4)})`;
      node.style.opacity = opacity.toFixed(3);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      node.style.removeProperty("transform");
      node.style.removeProperty("opacity");
    };
  }, [intensity]);

  return (
    <div ref={ref} className={`presence-behaviour-breath ${className ?? ""}`}>
      {children}
    </div>
  );
}
