"use client";

// editorial_snap — crisp, fast fade-in on element entry. Used by
// editorial/consulting rooms where motion should feel intentional but
// never theatrical.

import { useEffect, useRef, type ReactNode } from "react";
import type { BehaviourIntensity } from "@/lib/presence/dna/types";

interface EditorialSnapProps {
  intensity?: BehaviourIntensity;
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "header";
  id?: string;
}

const DURATION: Record<BehaviourIntensity, number> = {
  off: 0,
  subtle: 240,
  featured: 320,
  high: 420,
};

export default function EditorialSnap({
  intensity = "subtle",
  children,
  className,
  as = "section",
  id,
}: EditorialSnapProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || intensity === "off") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      node.classList.add("is-revealed");
      return;
    }
    node.style.setProperty("--snap-duration", `${DURATION[intensity]}ms`);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add("is-revealed");
            observer.unobserve(node);
          }
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [intensity]);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement | null>}
      id={id}
      className={`presence-behaviour-snap ${className ?? ""}`}
    >
      {children}
    </Tag>
  );
}
