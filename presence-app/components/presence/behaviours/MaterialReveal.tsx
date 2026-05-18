"use client";

// material_reveal — slow on-scroll reveal with vertical parallax.
// Triggered once per element via IntersectionObserver. Reduced-motion
// users see content immediately with no parallax.

import { useEffect, useRef, type ReactNode } from "react";
import type { BehaviourIntensity } from "@/lib/presence/dna/types";

interface MaterialRevealProps {
  intensity?: BehaviourIntensity;
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  id?: string;
}

const INTENSITY: Record<BehaviourIntensity, { lift: number; duration: number }> = {
  off: { lift: 0, duration: 0 },
  subtle: { lift: 14, duration: 540 },
  featured: { lift: 28, duration: 720 },
  high: { lift: 48, duration: 900 },
};

export default function MaterialReveal({
  intensity = "featured",
  children,
  className,
  as = "section",
  id,
}: MaterialRevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || intensity === "off") return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      node.classList.add("is-revealed");
      return;
    }

    const { lift, duration } = INTENSITY[intensity];
    node.style.setProperty("--reveal-lift", `${lift}px`);
    node.style.setProperty("--reveal-duration", `${duration}ms`);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add("is-revealed");
            observer.unobserve(node);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [intensity]);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement | null>}
      id={id}
      className={`presence-behaviour-reveal ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
