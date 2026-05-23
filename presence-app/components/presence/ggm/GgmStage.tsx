"use client";

// GgmStage — the central scene-stage state machine for the GGM Room.
//
// Replaces the v2 scroll-snap block layout with a Maanara-style stable
// frame: the page chrome (left rail, settings, footer action strip)
// stays put while the central stage swaps between scenes via a WebGL
// liquid morph driven by GgmLiquidCanvas.
//
// Interaction model:
//   - wheel / trackpad scroll up/down       → advance / retreat one scene
//   - keyboard ArrowDown / PageDown / Space → advance
//   - keyboard ArrowUp / PageUp             → retreat
//   - touch swipe up/down                   → advance / retreat
//   - left rail / mobile dock buttons       → jump to scene N
//   - native page scroll is kept for accessibility but is hijacked when
//     a scene is currently filling the stage.
//
// Each Scene declares: id, label, sub, backgroundImage (used as the
// WebGL morph texture), render(props) returns the React subtree drawn
// on top of the canvas. Scene 01 (Artwork Field) doesn't render any
// content layer because its visual IS the artwork, with overlay UI.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
/* eslint-disable react-hooks/exhaustive-deps */
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
  /** Optional surface theme applied to the scene content layer. */
  surface?: "wall" | "studio" | "card";
  /** Returns the React subtree rendered above the canvas. May be null
   *  for the artwork-only scene (overlay UI lives in `overlay`). */
  content: () => ReactNode;
  /** Optional fixed overlay drawn on top of the scene content
   *  (used by Scene 01 for the hero overlay UI). */
  overlay?: () => ReactNode;
}

interface GgmStageProps {
  node: PresenceNode;
  scenes: SceneDef[];
  initialScene?: number;
}

const ADVANCE_COOLDOWN_MS = 280;

export function GgmStage({ node, scenes, initialScene = 0 }: GgmStageProps) {
  const [active, setActive] = useState(initialScene);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const advanceLockRef = useRef(false);
  const { effective } = useGgmMotion();

  const total = scenes.length;
  const scene = scenes[active] ?? scenes[0];
  const images = useMemo(() => scenes.map((s) => s.backgroundImage), [scenes]);

  const goTo = useCallback(
    (idx: number) => {
      if (advanceLockRef.current) return;
      const next = ((idx % total) + total) % total;
      if (next === active) return;
      advanceLockRef.current = true;
      setIsTransitioning(true);
      setActive(next);
      window.setTimeout(() => {
        advanceLockRef.current = false;
      }, ADVANCE_COOLDOWN_MS);
    },
    [active, total],
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Keyboard nav.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        const editable = e.target.isContentEditable;
        if (editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      }
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowUp":
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

  // Wheel navigation — only consume the wheel when the scene content
  // is at its scroll boundaries. This lets long scenes (Work Wall,
  // Practice Studio) scroll internally first; once the internal scroll
  // reaches its edge, an extra wheel tick advances the scene.
  const sceneLayerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sceneLayerRef.current;
    if (!el) return;
    let accum = 0;
    let lastTick = 0;
    function onWheel(e: WheelEvent) {
      const layer = sceneLayerRef.current;
      if (!layer) return;
      const atTop = layer.scrollTop <= 1;
      const atBottom = layer.scrollTop + layer.clientHeight >= layer.scrollHeight - 1;
      const advance = e.deltaY > 0 && atBottom;
      const retreat = e.deltaY < 0 && atTop;
      if (!advance && !retreat) return;
      e.preventDefault();
      const now = performance.now();
      accum += e.deltaY;
      if (now - lastTick < 320) return;
      if (Math.abs(accum) < 32) return;
      if (accum > 0) {
        next();
      } else {
        prev();
      }
      accum = 0;
      lastTick = now;
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [next, prev]);

  // Touch swipe.
  useEffect(() => {
    const el = sceneLayerRef.current;
    if (!el) return;
    let startY = 0;
    let startScroll = 0;
    function onStart(e: TouchEvent) {
      startY = e.touches[0]?.clientY ?? 0;
      startScroll = sceneLayerRef.current?.scrollTop ?? 0;
    }
    function onEnd(e: TouchEvent) {
      const layer = sceneLayerRef.current;
      if (!layer) return;
      const endY = e.changedTouches[0]?.clientY ?? startY;
      const dy = startY - endY;
      // Only treat as a scene-advance gesture if the user wasn't
      // scrolling the inner content.
      const atTop = layer.scrollTop <= 1;
      const atBottom = layer.scrollTop + layer.clientHeight >= layer.scrollHeight - 1;
      const scrolledInside = Math.abs(layer.scrollTop - startScroll) > 6;
      if (scrolledInside) return;
      if (Math.abs(dy) < 56) return;
      if (dy > 0 && atBottom) next();
      else if (dy < 0 && atTop) prev();
    }
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [next, prev]);

  // Whenever the active scene changes, scroll the layer to the top.
  useEffect(() => {
    const el = sceneLayerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [active]);

  function onTransitionEnd() {
    setIsTransitioning(false);
  }

  return (
    <>
      <Rail
        node={node}
        scenes={scenes}
        activeIndex={active}
        onJump={goTo}
      />
      <MobileDock
        node={node}
        scenes={scenes}
        activeIndex={active}
        onJump={goTo}
      />
      <main className={styles.stage} aria-label={`${node.display_name} room`}>
        <div className={styles.stageFrame}>
          <div className={styles.stageCanvasLayer}>
            <GgmLiquidCanvas
              images={images}
              activeIndex={active}
              style={effective.liquidStyle}
              transitionMs={effective.liquidDurationMs}
              intensity={effective.liquidIntensity}
              distortion={effective.liquidDistortion}
              onTransitionEnd={onTransitionEnd}
            />
          </div>

          {/* Stage chrome */}
          <span className={styles.stageCornerTL} aria-hidden />
          <span className={styles.stageCornerTR} aria-hidden />
          <span className={styles.stageCornerBL} aria-hidden />
          <span className={styles.stageCornerBR} aria-hidden />

          <p className={styles.stageBadge} aria-hidden>
            {scene.label}
          </p>
          <p className={styles.stageNumber} aria-hidden>
            <span>{scene.number}</span>
            <span className={styles.stageNumberSlash}>
              / {String(total).padStart(2, "0")}
            </span>
          </p>
          <div className={styles.stageHintRow} aria-hidden>
            <span>
              <kbd className={styles.stageHintKey}>↑</kbd>
              <kbd className={styles.stageHintKey} style={{ marginLeft: 4 }}>↓</kbd>
              {" scene"}
            </span>
          </div>

          {/* Active scene content layer */}
          <div
            ref={sceneLayerRef}
            className={styles.stageSceneLayer}
            data-scene={scene.id}
            data-transitioning={isTransitioning ? "true" : "false"}
            tabIndex={-1}
          >
            <SceneSurface scene={scene}>
              {scene.content()}
            </SceneSurface>
          </div>

          {/* Persistent scene overlay (artwork field bottom controls etc.) */}
          {scene.overlay && (
            <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
              {scene.overlay()}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ── Scene surface wrapper — provides the right tinted background and
//    layout depending on the scene's surface kind. ─────────────────────

function SceneSurface({ scene, children }: { scene: SceneDef; children: ReactNode }) {
  // Trigger the .blockReveal entry animation each time this scene
  // becomes active. We mount with .revealed off, then flip to on next
  // frame so the staggered .blockRevealChild children animate in.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(id);
  }, [scene.id]);

  const cls = (() => {
    switch (scene.surface) {
      case "wall": return styles.sceneSurfaceWall;
      case "studio": return styles.sceneSurfaceStudio;
      case "card": return styles.sceneSurfaceCard;
      default: return undefined;
    }
  })();
  const revealCls = `${styles.blockReveal} ${revealed ? styles.revealed : ""}`;
  if (!cls) {
    // Field scene — no surface; the canvas shows through. We still
    // wrap in a reveal so any content scene chooses to put UI on the
    // content layer participates in the staggered entry.
    return (
      <div className={`${styles.sceneContent} ${revealCls}`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`${styles.sceneContent} ${cls} ${revealCls}`}>
      {children}
    </div>
  );
}

// ── Left rail (desktop) ───────────────────────────────────────────────────

interface RailProps {
  node: PresenceNode;
  scenes: SceneDef[];
  activeIndex: number;
  onJump: (i: number) => void;
}

function Rail({ node, scenes, activeIndex, onJump }: RailProps) {
  return (
    <aside className={styles.rail} aria-label="Room navigation">
      <Link href={`/p/${encodeURIComponent(node.slug)}`} className={styles.railBrand}>
        <span className={styles.railBrandMark} aria-hidden>✱</span>
        <span className={styles.railBrandName}>{node.display_name}</span>
        <span className={styles.railBrandSub}>Presence Room</span>
      </Link>

      <nav className={styles.railList} aria-label="Scenes">
        {scenes.map((s, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              className={`${styles.railItem} ${active ? styles.railItemActive : ""}`}
              onClick={() => onJump(i)}
              aria-current={active ? "true" : undefined}
              data-hover
            >
              <span className={styles.railNum}>{s.number}</span>
              <span className={styles.railLabel}>
                <span className={styles.railLabelTitle}>{s.label}</span>
                <span className={styles.railLabelSub}>{s.sub}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.railFoot}>
        <GgmSettingsMenu />
      </div>
    </aside>
  );
}

// ── Mobile bottom dock ──────────────────────────────────────────────────────

function MobileDock({ node, scenes, activeIndex, onJump }: RailProps) {
  return (
    <nav className={styles.mobileDock} aria-label="Room scenes">
      <Link href={`/p/${encodeURIComponent(node.slug)}`} className={styles.mobileDockBrand}>
        {node.display_name.split(" ")[0]}
      </Link>
      <div className={styles.mobileDockDots}>
        {scenes.map((s, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              className={`${styles.mobileDockDot} ${active ? styles.mobileDockDotActive : ""}`}
              onClick={() => onJump(i)}
              aria-current={active ? "true" : undefined}
              aria-label={`${s.number} ${s.label}`}
            >
              {s.number}
            </button>
          );
        })}
      </div>
      <GgmSettingsMenu />
    </nav>
  );
}
