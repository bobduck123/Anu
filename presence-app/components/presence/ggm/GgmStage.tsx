"use client";

// GgmStage — minimal scene-state model (v4 UX reset).
//
// What's gone:
//   - Sidebar / left rail
//   - Mobile bottom dock with brand + numbered dots + Motion pill
//   - Visible chapter index
//   - Per-scene right-edge labels
//   - Internal scene scrollbars
//   - Page-level scroll (the document is locked to a single 100svh stage)
//
// What replaces it:
//   - The Room is a single fixed 100svh "viewing frame" that fills the
//     viewport. Inside the frame the active scene composition is
//     rendered; switching scene swaps the composition mechanically
//     while the WebGL liquid morph runs.
//   - A discreet bottom-center scene counter — "01  — ARTWORK FIELD" /
//     "04" — sits in mix-blend-difference so it reads off whatever
//     artwork is showing. Counter and label fade at idle and brighten
//     during a transition or on hover.
//   - Four tiny right-edge tick marks (no labels) — each marks one
//     scene. Clickable, keyboard-focusable, but visually a single hair
//     wider for the active one. No text appears next to them unless
//     hovered.
//   - A subtle bottom-right "→" / "↓ next" affordance that on hover
//     reveals the next scene's name.
//   - Keyboard arrows / number keys / wheel / swipe still work.
//
// Scroll model:
//   - The page itself never scrolls (`overflow: hidden` on body via
//     the Room root). Wheel and touch are treated as discrete
//     gestures: one gesture = one scene advance, with a 320ms cooldown.
//   - Scene content is sized to fit inside the frame; if a scene's
//     composition exceeds the frame on small viewports, the inside
//     of the stage gets a single non-snapping scroll, not the page.
//
// Settings:
//   - The motion-settings trigger is hidden by default. It only
//     renders when the URL has `?preview=1` or `?devmotion=1`, OR
//     the visitor holds Shift+P. This keeps it out of the public
//     visual hierarchy while keeping it accessible to owners /
//     operators / curators who know the gesture.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import type { PresenceNode } from "@/lib/api/types";
import { GgmLiquidCanvas } from "./GgmLiquidCanvas";
import { useGgmMotion } from "./GgmMotionContext";
import { GgmSettingsMenu } from "./GgmSettingsMenu";
import styles from "./ggm.module.css";

export interface SceneDef {
  id: string;
  number: string;
  label: string;
  sub: string;
  backgroundImage: string;
  /** Surface theme: applies the paper background under the scene
   *  composition. `undefined` (field) lets the canvas show through. */
  surface?: "wall" | "studio" | "card";
  content: () => ReactNode;
  overlay?: () => ReactNode;
}

interface GgmStageProps {
  node: PresenceNode;
  scenes: SceneDef[];
  initialScene?: number;
  /** When set, the Room was opened from a RoomKey tap; surfaced as a
   *  tiny provenance mark, not a banner. */
  roomKeySourceLabel?: string | null;
}

const ADVANCE_COOLDOWN_MS = 320;
const WHEEL_THRESHOLD = 32;

export function GgmStage({
  node,
  scenes,
  initialScene = 0,
  roomKeySourceLabel,
}: GgmStageProps) {
  const [active, setActive] = useState(initialScene);
  const [hoverNav, setHoverNav] = useState(false);
  const advanceLockRef = useRef(false);
  const { effective } = useGgmMotion();
  const settingsVisible = useSettingsPreview();

  const total = scenes.length;
  const scene = scenes[active] ?? scenes[0];

  const goTo = useCallback((idx: number) => {
    if (advanceLockRef.current) return;
    const nextIdx = ((idx % total) + total) % total;
    if (nextIdx === active) return;
    advanceLockRef.current = true;
    setActive(nextIdx);
    window.setTimeout(() => {
      advanceLockRef.current = false;
    }, ADVANCE_COOLDOWN_MS);
  }, [active, total]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Lock body scroll while the Room is mounted (the document should
  // not visibly scroll — the scene is the experience).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  // Keyboard: arrows, page keys, number keys for direct scene jumps.
  // Also handle Shift+P to toggle preview mode for the settings menu.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        const editable = e.target.isContentEditable;
        if (editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowUp":
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(total - 1);
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            const i = Number(e.key) - 1;
            if (i < total) {
              e.preventDefault();
              goTo(i);
            }
          }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, goTo, total]);

  // Wheel input. Accumulate small ticks so a single trackpad gesture
  // doesn't blast past multiple scenes.
  useEffect(() => {
    let accum = 0;
    let lastTick = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const now = performance.now();
      accum += e.deltaY;
      if (now - lastTick < 340) return;
      if (Math.abs(accum) < WHEEL_THRESHOLD) return;
      if (accum > 0) next();
      else prev();
      accum = 0;
      lastTick = now;
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [next, prev]);

  // Touch swipe.
  useEffect(() => {
    let startY = 0;
    let startX = 0;
    let active = false;
    function onStart(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      startY = t.clientY;
      startX = t.clientX;
      active = true;
    }
    function onEnd(e: TouchEvent) {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dy = startY - t.clientY;
      const dx = startX - t.clientX;
      // Treat vertical-dominant swipes only.
      if (Math.abs(dy) < 48 || Math.abs(dx) > Math.abs(dy)) return;
      if (dy > 0) next();
      else prev();
    }
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [next, prev]);

  const images = scenes.map((s) => s.backgroundImage);
  const isFinalScene = active === total - 1;
  const nextLabel = isFinalScene ? scenes[0]?.label : scenes[active + 1]?.label;

  return (
    <main className={styles.room} aria-label={`${node.display_name} room`}>
      <Link
        href={`/p/${encodeURIComponent(node.slug)}`}
        className={styles.brandMark}
        data-hover
      >
        {node.display_name}
      </Link>

      {roomKeySourceLabel && (
        <p className={styles.provenanceMark} aria-live="polite">
          ✱ Opened via {roomKeySourceLabel}
        </p>
      )}

      <div className={styles.frame}>
        <div className={styles.frameCanvasLayer}>
          <GgmLiquidCanvas
            images={images}
            activeIndex={active}
            style={effective.liquidStyle}
            transitionMs={effective.liquidDurationMs}
            intensity={effective.liquidIntensity}
            distortion={effective.liquidDistortion}
          />
        </div>

        {/* Stable frame corner marks */}
        <span className={styles.frameCornerTL} aria-hidden />
        <span className={styles.frameCornerTR} aria-hidden />
        <span className={styles.frameCornerBL} aria-hidden />
        <span className={styles.frameCornerBR} aria-hidden />

        {/* Active scene composition */}
        <SceneSurface scene={scene} key={scene.id}>
          {scene.content()}
        </SceneSurface>

        {scene.overlay && (
          <div className={styles.frameOverlay}>
            {scene.overlay()}
          </div>
        )}
      </div>

      {/* Bottom-center scene counter — the only persistent navigation
          label. Reads off the artwork via mix-blend-difference. */}
      <div
        className={styles.sceneCounter}
        aria-live="polite"
        onMouseEnter={() => setHoverNav(true)}
        onMouseLeave={() => setHoverNav(false)}
      >
        <span className={styles.sceneCounterNum}>{scene.number}</span>
        <span className={styles.sceneCounterSep}>—</span>
        <span className={styles.sceneCounterLabel}>{scene.label}</span>
        <span className={styles.sceneCounterTotal}>
          / {String(total).padStart(2, "0")}
        </span>
      </div>

      {/* Edge tick marks — one per scene, no labels. */}
      <nav className={styles.edgeMarks} aria-label="Scenes">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.edgeMark} ${i === active ? styles.edgeMarkActive : ""}`}
            onClick={() => goTo(i)}
            aria-label={`${s.number} ${s.label}`}
            aria-current={i === active ? "true" : undefined}
            data-hover
          />
        ))}
      </nav>

      {/* Bottom-right next affordance. Reveals next scene name on hover. */}
      <button
        type="button"
        className={`${styles.nextAffordance} ${hoverNav ? styles.nextAffordanceHover : ""}`}
        onClick={next}
        onMouseEnter={() => setHoverNav(true)}
        onMouseLeave={() => setHoverNav(false)}
        aria-label={isFinalScene ? "Return to start" : `Next — ${nextLabel}`}
        data-hover
      >
        <span className={styles.nextAffordanceLabel}>
          {isFinalScene ? "Return" : nextLabel}
        </span>
        <span className={styles.nextAffordanceArrow} aria-hidden>→</span>
      </button>

      {/* Preview-gated settings menu */}
      {settingsVisible && (
        <div className={styles.settingsFloat}>
          <GgmSettingsMenu />
        </div>
      )}
    </main>
  );
}

// ── Scene surface ───────────────────────────────────────────────────────────

function SceneSurface({ scene, children }: { scene: SceneDef; children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(id);
  }, [scene.id]);

  const surfaceCls = (() => {
    switch (scene.surface) {
      case "wall": return styles.frameSurfaceWall;
      case "studio": return styles.frameSurfaceStudio;
      case "card": return styles.frameSurfaceCard;
      default: return styles.frameSurfaceField;
    }
  })();
  const revealCls = `${styles.blockReveal} ${revealed ? styles.revealed : ""}`;

  return (
    <div className={`${styles.frameScene} ${surfaceCls} ${revealCls}`}>
      {children}
    </div>
  );
}

// ── Settings preview gate ───────────────────────────────────────────────────
//
// The settings menu is only rendered when:
//   - URL has ?preview=1 or ?devmotion=1, OR
//   - The visitor holds Shift+P at any point in the session.
// In both cases the visibility persists for the rest of the session
// (via in-memory state — no localStorage, no cookie).

function useSettingsPreview(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search ?? "";
    if (/[?&](preview|devmotion)=1/.test(search)) {
      setVisible(true);
    }
    function onKey(e: KeyboardEvent) {
      if (e.shiftKey && (e.key === "P" || e.key === "p")) {
        // Only toggle when typed in body, not in an input.
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        setVisible((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return visible;
}
