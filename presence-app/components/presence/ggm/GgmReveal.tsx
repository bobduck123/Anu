"use client";

// Reveal-on-scroll wrapper. Mirrors the source's [data-reveal] behaviour:
// opacity 0 + 24px Y translation, fading to 1 + 0 when the section first
// intersects the viewport. Reduced-motion is short-circuited (the CSS
// already overrides the rule to opaque, but we also skip the observer so
// no work is done).

import { useEffect, useRef, useState, createElement, type ReactNode } from "react";
import styles from "./ggm.module.css";

type GgmRevealTag = "div" | "section" | "article" | "header" | "footer" | "main";

interface RevealProps {
  children: ReactNode;
  as?: GgmRevealTag;
  className?: string;
  id?: string;
}

export function GgmReveal({ children, as = "div", className, id }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cls = [styles.reveal, shown ? styles.revealed : "", className]
    .filter(Boolean)
    .join(" ");

  return createElement(
    as,
    { ref, className: cls, id },
    children,
  );
}
