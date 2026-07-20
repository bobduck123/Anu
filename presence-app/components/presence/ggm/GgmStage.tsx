"use client";

// GgmStage — v5 (arrows-only + internal slideshow).
//
// Navigation model (per the explicit UX direction):
//   - On-screen arrows (← / →) at the bottom-left / bottom-right of
//     the viewing frame switch the active scene.
//   - Arrow keys (← / → / ↑ / ↓) on the keyboard switch the scene.
//   - Number keys 1–4 jump to a scene directly.
//   - Wheel / trackpad: NOT bound to scene navigation. Wheel events
//     belong to the active scene's internal scroll only.
//   - Touch swipe: also NOT bound to scene navigation; visitors on
//     phones use the on-screen arrows or the edge ticks.
//   - Edge ticks remain available for direct jumps (visual scene
//     index).
//
// Internal slideshow:
//   - A scene can declare an `images: string[]` array (1+ entries).
//   - The stage maintains a per-scene image index. When the active
//     scene's images.length > 1, the scene receives a `slideAdvance()`
//     callback it can wire to a click target (Scene 01 uses this to
//     advance through the hero artworks via the WebGL liquid morph).
//   - The flat WebGL canvas image list is computed across all scenes
//     so morphs play between consecutive textures.

import {
  useCallback,
  useEffect,
  useMemo,
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
  /** One or more background images. Scene 01 has the full hero
   *  sequence; other scenes typically have one image. */
  images: string[];
  /** Surface theme that wraps the scene content. `undefined` = the
   *  field (canvas-only) scene. */
  surface?: "wall" | "studio" | "card";
  /** Renderer for the scene content. Receives the per-scene slide
   *  index + an advance callback (only meaningful when images.length>1). */
  content: (ctx: SceneRenderContext) => ReactNode;
  /** Optional overlay rendered above the scene content. */
  overlay?: (ctx: SceneRenderContext) => ReactNode;
}

export interface SceneRenderContext {
  slideIndex: number;
  slideCount: number;
  slideAdvance: () => void;
  slideGoTo: (i: number) => void;
}

interface GgmStageProps {
  node: PresenceNode;
  scenes: SceneDef[];
  initialScene?: number;
  /** When set, the Room was opened from a RoomKey tap; surfaced as a
   *  tiny provenance mark, not a banner. */
  roomKeySourceLabel?: string | null;
  roomKeyProvenanceText?: string | null;
}

const ADVANCE_COOLDOWN_MS = 280;

export function GgmStage({
  node,
  scenes,
  initialScene = 0,
  roomKeySourceLabel,
  roomKeyProvenanceText,
}: GgmStageProps) {
  const [active, setActive] = useState(initialScene);
  // Per-scene slide index. Resets to 0 when the active scene changes.
  const [slideIndices, setSlideIndices] = useState<number[]>(() => scenes.map(() => 0));
  const [hoverNext, setHoverNext] = useState(false);
  const [hoverPrev, setHoverPrev] = useState(false);
  const advanceLockRef = useRef(false);
  const { effective } = useGgmMotion();
  const settingsVisible = useSettingsPreview();

  const total = scenes.length;
  const scene = scenes[active] ?? scenes[0];
  const canvasBlurPx = Math.round(effective.blurAmount * 5 * 100) / 100;
  const canvasStyle = canvasBlurPx > 0
    ? { filter: `blur(${canvasBlurPx}px)`, transform: "scale(1.015)" }
    : undefined;
  const grainOpacity = Math.min(0.62, Math.max(0, effective.ditherStrength * 0.34 + effective.filmGrainStrength * 0.28));
  const slideIndex = slideIndices[active] ?? 0;

  // Flat image list — one entry per scene-image pair, in scene order.
  // The WebGL canvas activeIndex picks one of these.
  const { flatImages, sceneRanges } = useMemo(() => {
    const flat: string[] = [];
    const ranges: Array<{ start: number; count: number }> = [];
    for (const s of scenes) {
      ranges.push({ start: flat.length, count: s.images.length });
      flat.push(...s.images);
    }
    return { flatImages: flat, sceneRanges: ranges };
  }, [scenes]);

  const range = sceneRanges[active] ?? { start: 0, count: 1 };
  const canvasActiveIndex = range.start + slideIndex;

  const goToScene = useCallback((idx: number) => {
    if (advanceLockRef.current) return;
    const nextIdx = ((idx % total) + total) % total;
    if (nextIdx === active) return;
    advanceLockRef.current = true;
    setActive(nextIdx);
    // Reset incoming scene's slide to 0 so each scene re-enters at
    // its first image. (Outgoing scene's slide index is preserved in
    // case the visitor returns and we want to revisit later.)
    setSlideIndices((prev) => {
      const next = [...prev];
      next[nextIdx] = 0;
      return next;
    });
    window.setTimeout(() => {
      advanceLockRef.current = false;
    }, ADVANCE_COOLDOWN_MS);
  }, [active, total]);

  const nextScene = useCallback(() => goToScene(active + 1), [active, goToScene]);
  const prevScene = useCallback(() => goToScene(active - 1), [active, goToScene]);

  const slideAdvance = useCallback(() => {
    setSlideIndices((prev) => {
      const next = [...prev];
      const count = scenes[active]?.images.length ?? 1;
      next[active] = (next[active] + 1) % count;
      return next;
    });
  }, [active, scenes]);

  const slideGoTo = useCallback((i: number) => {
    setSlideIndices((prev) => {
      const next = [...prev];
      const count = scenes[active]?.images.length ?? 1;
      next[active] = ((i % count) + count) % count;
      return next;
    });
  }, [active, scenes]);

  // Lock body scroll while the Room is mounted.
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

  // Keyboard navigation.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        const editable = e.target.isContentEditable;
        if (editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          nextScene();
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          prevScene();
          break;
        case "Home":
          e.preventDefault();
          goToScene(0);
          break;
        case "End":
          e.preventDefault();
          goToScene(total - 1);
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            const i = Number(e.key) - 1;
            if (i < total) {
              e.preventDefault();
              goToScene(i);
            }
          }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextScene, prevScene, goToScene, total]);

  const isLastScene = active === total - 1;
  const isFirstScene = active === 0;
  const nextLabel = isLastScene ? scenes[0]?.label : scenes[active + 1]?.label;
  const prevLabel = isFirstScene ? scenes[total - 1]?.label : scenes[active - 1]?.label;

  const ctx: SceneRenderContext = useMemo(
    () => ({
      slideIndex,
      slideCount: scene?.images.length ?? 1,
      slideAdvance,
      slideGoTo,
    }),
    [slideIndex, scene, slideAdvance, slideGoTo],
  );

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
        <div className={styles.frameCanvasLayer} style={canvasStyle}>
          <GgmLiquidCanvas
            images={flatImages}
            activeIndex={canvasActiveIndex}
            style={effective.liquidStyle}
            transitionMs={effective.liquidDurationMs}
            intensity={effective.liquidIntensity}
            distortion={effective.liquidDistortion}
          />
        </div>

        <span className={styles.frameGrainLayer} style={{ opacity: grainOpacity }} aria-hidden />

        <span className={styles.frameCornerTL} aria-hidden />
        <span className={styles.frameCornerTR} aria-hidden />
        <span className={styles.frameCornerBL} aria-hidden />
        <span className={styles.frameCornerBR} aria-hidden />

        <SceneSurface scene={scene} ctx={ctx} key={scene.id}>
          {scene.content(ctx)}
        </SceneSurface>

        {scene.overlay && (
          <div className={styles.frameOverlay}>
            {scene.overlay(ctx)}
          </div>
        )}
      </div>

      {/* Bottom-center scene counter. */}
      <div className={styles.sceneCounter} aria-live="polite">
        <span className={styles.sceneCounterNum}>{scene.number}</span>
        <span className={styles.sceneCounterSep}>—</span>
        <span className={styles.sceneCounterLabel}>{scene.label}</span>
        <span className={styles.sceneCounterTotal}>
          / {String(total).padStart(2, "0")}
        </span>
        {scene.images.length > 1 && (
          <span className={styles.sceneCounterSlide}>
            ✱ {String(slideIndex + 1).padStart(2, "0")} / {String(scene.images.length).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Right-edge tick marks. */}
      <nav className={styles.edgeMarks} aria-label="Scenes">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.edgeMark} ${i === active ? styles.edgeMarkActive : ""}`}
            onClick={() => goToScene(i)}
            aria-label={`${s.number} ${s.label}`}
            aria-current={i === active ? "true" : undefined}
            data-hover
          />
        ))}
      </nav>

      {/* Left "previous" arrow. */}
      <button
        type="button"
        className={`${styles.prevAffordance} ${hoverPrev ? styles.affordanceHover : ""}`}
        onClick={prevScene}
        onMouseEnter={() => setHoverPrev(true)}
        onMouseLeave={() => setHoverPrev(false)}
        aria-label={isFirstScene ? `Previous — ${prevLabel} (wraps)` : `Previous — ${prevLabel}`}
        data-hover
      >
        <span className={styles.affordanceArrow} aria-hidden>←</span>
        <span className={styles.affordanceLabel}>
          {isFirstScene ? "Last" : prevLabel}
        </span>
      </button>

      {/* Right "next" arrow. */}
      <button
        type="button"
        className={`${styles.nextAffordance} ${hoverNext ? styles.affordanceHover : ""}`}
        onClick={nextScene}
        onMouseEnter={() => setHoverNext(true)}
        onMouseLeave={() => setHoverNext(false)}
        aria-label={isLastScene ? "Return to start" : `Next — ${nextLabel}`}
        data-hover
      >
        <span className={styles.affordanceLabel}>
          {isLastScene ? "Return" : nextLabel}
        </span>
        <span className={styles.affordanceArrow} aria-hidden>→</span>
      </button>

      {settingsVisible && (
        <div className={styles.settingsFloat}>
          <GgmSettingsMenu />
        </div>
      )}
    </main>
  );
}

// ── Scene surface ──────────────────────────────────────────────────────────

function SceneSurface({ scene, children }: { scene: SceneDef; ctx: SceneRenderContext; children: ReactNode }) {
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
