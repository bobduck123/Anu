"use client";

// Chrome layer for the GGM faithful Room:
//   - GgmCursor      : small mix-blend-difference cursor dot, grows on
//                      hover over `data-hover` elements (a-tags, buttons).
//   - GgmScrollBar   : 1px scroll-progress at the very top edge.
//   - GgmChapterIndex: vertical chapter index on the right edge, syncs
//                      active state to whichever block is in view.
//
// All three layers are short-circuited under prefers-reduced-motion and
// hidden on touch devices / narrow viewports (see ggm.module.css).

import { useEffect, useRef, useState } from "react";
import styles from "./ggm.module.css";

export interface ChapterDef {
  id: string;
  label: string;
  number: string;
}

interface GgmChapterIndexProps {
  chapters: ChapterDef[];
  activeId: string | null;
  onJump: (id: string) => void;
}

export function GgmChapterIndex({ chapters, activeId, onJump }: GgmChapterIndexProps) {
  return (
    <nav className={styles.chapterIndex} aria-label="Room chapters">
      {chapters.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            type="button"
            className={`${styles.chapterIndexItem} ${active ? styles.chapterIndexItemActive : ""}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onJump(c.id)}
          >
            <span className={styles.chapterIndexRule} aria-hidden />
            <span className={styles.chapterIndexLabel}>
              {c.number} · {c.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function GgmScrollBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    function tick() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const x = total > 0 ? Math.max(0, Math.min(1, doc.scrollTop / total)) : 0;
      el!.style.transform = `scaleX(${x})`;
    }
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);
  return (
    <div className={styles.scrollProgress} aria-hidden>
      <div ref={ref} className={styles.scrollProgressBar} />
    </div>
  );
}

export function GgmCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [large, setLarge] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Touch / coarse pointer — skip the cursor entirely.
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let raf = 0;
    let running = false;

    function step() {
      x += (tx - x) * 0.32;
      y += (ty - y) * 0.32;
      el!.style.transform = `translate3d(${x}px, ${y}px, 0)${large ? " scale(3.6)" : ""}`;
      if (Math.abs(tx - x) < 0.4 && Math.abs(ty - y) < 0.4) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(step);
    }

    function onMove(e: PointerEvent) {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) setVisible(true);
      if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    }

    function onOver(e: Event) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('a, button, [data-hover], [role="tab"], [role="button"]');
      setLarge(Boolean(interactive));
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerleave", () => setVisible(false));
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible, large]);

  return (
    <div
      ref={ref}
      className={`${styles.fxCursor} ${visible ? styles.fxCursorVisible : ""} ${large ? styles.fxCursorLarge : ""}`}
      aria-hidden
    />
  );
}

interface UseActiveBlockOpts {
  ids: string[];
  // CSS root selector that holds the block sections — needed because the
  // hook uses IntersectionObserver scoped to that root.
  rootSelector?: string;
}

export function useActiveBlock({ ids, rootSelector }: UseActiveBlockOpts): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = rootSelector ? document.querySelector(rootSelector) : null;
    const visibility = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (best && bestRatio > 0.25) setActive(best);
      },
      { root: root as Element | null, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [ids, rootSelector]);
  return active;
}
