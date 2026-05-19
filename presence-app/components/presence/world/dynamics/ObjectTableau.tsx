"use client";

// ObjectTableau — Pass 6 engagement dynamic.
//
// A tactile surface (desk, bench, shelf, altar) with objects arranged
// in clusters. Pointer movement gently tilts the surface; forward
// moves "closer" (zooms in) on the focused cluster; left/right pans
// across clusters; retreat returns to the full tableau; inspect opens
// the portal panel.
//
// Substantially different from chamber walking — there is one
// surface, not a series of rooms; movement is over the surface, not
// between rooms.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

export interface TableauCluster {
  id: string;
  label: string;
  caption?: string;
  objects: RoomObjectDef[];
}

interface ObjectTableauProps {
  surfaceLabel: string;
  surfaceEyebrow?: string;
  clusters: TableauCluster[];
  onInspect: (object: RoomObjectDef) => void;
}

export default function ObjectTableau({
  surfaceLabel,
  surfaceEyebrow = "Working surface",
  clusters,
  onInspect,
}: ObjectTableauProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [zoomed, setZoomed] = useState(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Pointer-driven tilt (skip on touch + reduced-motion)
  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = surfaceRef.current;
    if (!el) return;
    function onMove(e: PointerEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setTilt({ x: (x - 0.5) * 8, y: -(y - 0.5) * 6 });
    }
    function onLeave() {
      setTilt({ x: 0, y: 0 });
    }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  // Keyboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((i) => (i - 1 + clusters.length) % clusters.length);
          setZoomed(false);
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((i) => (i + 1) % clusters.length);
          setZoomed(false);
          break;
        case "ArrowUp":
        case "Enter":
          if (e.key === "Enter" && document.activeElement instanceof HTMLButtonElement) return;
          e.preventDefault();
          setZoomed(true);
          break;
        case "ArrowDown":
        case "Escape":
          e.preventDefault();
          setZoomed(false);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clusters.length]);

  const surfaceStyle: CSSProperties = useMemo(() => {
    if (reduced) return {};
    return {
      ["--tableau-tilt-x" as string]: `${tilt.x.toFixed(2)}deg`,
      ["--tableau-tilt-y" as string]: `${tilt.y.toFixed(2)}deg`,
      ["--tableau-cluster-shift" as string]: `${focusedIndex * -22}vw`,
      ["--tableau-zoom" as string]: zoomed ? "1.6" : "1",
    } as CSSProperties;
  }, [tilt, focusedIndex, zoomed, reduced]);

  if (reduced) {
    // Flat accessible fallback
    return (
      <div className="presence-dynamic-tableau presence-dynamic-tableau-fallback">
        <header>
          <p className="tableau-eyebrow">{surfaceEyebrow}</p>
          <h2 className="tableau-surface-label">{surfaceLabel}</h2>
        </header>
        {clusters.map((cluster) => (
          <section key={cluster.id} aria-label={cluster.label}>
            <h3>{cluster.label}</h3>
            {cluster.caption && <p className="tableau-cluster-caption">{cluster.caption}</p>}
            <ul>
              {cluster.objects.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onInspect(o)} data-room-object="true">
                    <span className="tableau-fallback-kind">{o.kind}</span>
                    <span className="tableau-fallback-title">{o.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="presence-dynamic-tableau">
      <header className="tableau-head">
        <p className="tableau-eyebrow">{surfaceEyebrow}</p>
        <h2 className="tableau-surface-label">{surfaceLabel}</h2>
      </header>

      <div className="tableau-stage" ref={surfaceRef}>
        <div className="tableau-surface" style={surfaceStyle}>
          {clusters.map((cluster, idx) => (
            <article
              key={cluster.id}
              className={`tableau-cluster ${idx === focusedIndex ? "is-focused" : ""}`}
              data-index={idx}
            >
              <header>
                <p className="cluster-label">{cluster.label}</p>
                {cluster.caption && <p className="cluster-caption">{cluster.caption}</p>}
              </header>
              <div className="cluster-objects">
                {cluster.objects.map((o, i) => (
                  <button
                    key={o.id}
                    type="button"
                    className="tableau-object"
                    onClick={() => onInspect(o)}
                    data-room-object="true"
                    style={{
                      ["--obj-x" as string]: `${(i % 3) * 30 - 30}px`,
                      ["--obj-y" as string]: `${Math.floor(i / 3) * 22 - 11}px`,
                      ["--obj-rot" as string]: `${(i * 7) % 5 - 2}deg`,
                    } as CSSProperties}
                    aria-label={`${o.kind}: ${o.title}`}
                  >
                    <span className="obj-kind">{o.kind}</span>
                    <span className="obj-title">{o.title}</span>
                    {o.summary && <span className="obj-sub">{o.summary}</span>}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="tableau-hud" role="toolbar" aria-label="Tableau controls">
        <button type="button" onClick={() => { setFocusedIndex((i) => (i - 1 + clusters.length) % clusters.length); setZoomed(false); }} aria-label="Previous cluster">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? "Zoom out" : "Zoom in"} aria-pressed={zoomed}>
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => { setFocusedIndex((i) => (i + 1) % clusters.length); setZoomed(false); }} aria-label="Next cluster">
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => { setZoomed(false); setFocusedIndex(0); }} aria-label="Return to whole surface">
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
