"use client";

// OrbitConstellation — Pass 6 engagement dynamic.
//
// A central identity mark surrounded by orbiting satellites. Works,
// services, and proof points each carry a satellite at a different
// orbital radius. The constellation rotates with left/right input;
// forward focuses the closest satellite (selection); inspect opens
// the portal panel. Retreat returns to orbit.
//
// Visually it should feel relational and networked — substantially
// different from chamber walking. Keyboard, mobile dock, and
// reduced-motion paths are first-class.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from "lucide-react";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

export interface OrbitConstellationProps {
  /** Centerpiece identity. */
  centerLabel: string;
  centerSublabel?: string;
  /** Satellites — each becomes an orbiting point. */
  satellites: RoomObjectDef[];
  /** Called when a satellite is inspected. */
  onInspect: (object: RoomObjectDef) => void;
  /** Top-of-page eyebrow (world type label). */
  eyebrow?: string;
  /** Optional reduced-motion fallback list label. */
  fallbackLabel?: string;
}

const RADII = [180, 260, 330]; // distance in px (scaled to viewport via CSS calc)
const SATELLITES_PER_RING = 7;

interface PlottedSatellite {
  satellite: RoomObjectDef;
  ringIndex: number;
  indexInRing: number;
  angleDeg: number;
}

function plot(satellites: RoomObjectDef[]): PlottedSatellite[] {
  const plotted: PlottedSatellite[] = [];
  satellites.forEach((sat, i) => {
    const ringIndex = Math.min(Math.floor(i / SATELLITES_PER_RING), RADII.length - 1);
    const indexInRing = i % SATELLITES_PER_RING;
    const ringCount = Math.min(SATELLITES_PER_RING, satellites.length - ringIndex * SATELLITES_PER_RING);
    const step = 360 / Math.max(ringCount, 1);
    const offset = ringIndex * 12; // stagger rings so they don't align
    const angleDeg = (indexInRing * step + offset) % 360;
    plotted.push({ satellite: sat, ringIndex, indexInRing, angleDeg });
  });
  return plotted;
}

export default function OrbitConstellation({
  centerLabel,
  centerSublabel,
  satellites,
  onInspect,
  eyebrow = "Constellation",
  fallbackLabel,
}: OrbitConstellationProps) {
  const [rotation, setRotation] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const plotted = useMemo(() => plot(satellites), [satellites]);

  // Keyboard navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setRotation((r) => r - 45);
          setFocusedIndex(null);
          break;
        case "ArrowRight":
          e.preventDefault();
          setRotation((r) => r + 45);
          setFocusedIndex(null);
          break;
        case "ArrowUp":
        case "Enter": {
          if (e.key === "Enter") {
            // Let focused interactives handle Enter natively
            const focused = document.activeElement;
            if (focused instanceof HTMLButtonElement || focused instanceof HTMLAnchorElement) return;
          }
          e.preventDefault();
          // Focus the satellite currently closest to "north" (top).
          const closest = findClosestToTop(plotted, rotation);
          if (closest !== -1) {
            setFocusedIndex(closest);
            const sat = plotted[closest]?.satellite;
            if (sat) onInspect(sat);
          }
          break;
        }
        case "ArrowDown":
        case "Escape":
          e.preventDefault();
          setFocusedIndex(null);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plotted, rotation, onInspect]);

  // Reduced-motion fallback: render satellites as a list
  if (reduced) {
    return (
      <div className="presence-dynamic-orbit presence-dynamic-orbit-fallback">
        <header className="orbit-fallback-head">
          <p className="orbit-eyebrow">{eyebrow}</p>
          <h2 className="orbit-center-label">{centerLabel}</h2>
          {centerSublabel && <p className="orbit-center-sub">{centerSublabel}</p>}
        </header>
        <ol className="orbit-fallback-list" aria-label={fallbackLabel ?? "Satellites in this constellation"}>
          {plotted.map((p) => (
            <li key={p.satellite.id}>
              <button type="button" onClick={() => onInspect(p.satellite)} className="orbit-fallback-link" data-room-object="true">
                <span className="orbit-fallback-kind">{p.satellite.kind}</span>
                <span className="orbit-fallback-title">{p.satellite.title}</span>
                {p.satellite.summary && <span className="orbit-fallback-sub">{p.satellite.summary}</span>}
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="presence-dynamic-orbit" data-rotation={rotation}>
      <div className="orbit-eyebrow-strip">
        <p className="orbit-eyebrow">{eyebrow}</p>
      </div>

      <div className="orbit-field" style={{ ["--rotation" as string]: `${rotation}deg` } as CSSProperties}>
        <div className="orbit-rings" aria-hidden>
          {RADII.map((r, i) => (
            <span key={i} className="orbit-ring" style={{ ["--ring-radius" as string]: `${r}px` } as CSSProperties} />
          ))}
        </div>
        <button
          type="button"
          className="orbit-center"
          aria-label={`${centerLabel} — central identity`}
        >
          <span className="orbit-center-mark" aria-hidden />
          <span className="orbit-center-text">
            <span className="orbit-center-label">{centerLabel}</span>
            {centerSublabel && <span className="orbit-center-sub">{centerSublabel}</span>}
          </span>
        </button>
        {plotted.map((p, i) => {
          const radius = RADII[p.ringIndex];
          const isFocused = focusedIndex === i;
          return (
            <button
              key={p.satellite.id}
              type="button"
              className={`orbit-satellite ${isFocused ? "is-focused" : ""}`}
              data-ring={p.ringIndex}
              data-kind={p.satellite.kind}
              data-room-object="true"
              style={{
                ["--angle" as string]: `${p.angleDeg}deg`,
                ["--radius" as string]: `${radius}px`,
              } as CSSProperties}
              onClick={() => onInspect(p.satellite)}
              onFocus={() => setFocusedIndex(i)}
              aria-label={`${p.satellite.kind}: ${p.satellite.title}`}
            >
              <span className="sat-dot" aria-hidden />
              <span className="sat-label">
                <span className="sat-title">{p.satellite.title}</span>
                {p.satellite.summary && <span className="sat-sub">{p.satellite.summary}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="orbit-hud" role="toolbar" aria-label="Constellation controls">
        <button type="button" onClick={() => setRotation((r) => r - 45)} aria-label="Rotate left" aria-keyshortcuts="ArrowLeft">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            const closest = findClosestToTop(plotted, rotation);
            if (closest !== -1) onInspect(plotted[closest].satellite);
          }}
          aria-label="Focus closest satellite"
          aria-keyshortcuts="ArrowUp Enter"
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setRotation((r) => r + 45)} aria-label="Rotate right" aria-keyshortcuts="ArrowRight">
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className="orbit-reset"
          onClick={() => { setRotation(0); setFocusedIndex(null); }}
          aria-label="Reset to centre"
          aria-keyshortcuts="ArrowDown Escape"
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function findClosestToTop(plotted: PlottedSatellite[], rotation: number): number {
  if (plotted.length === 0) return -1;
  // The constellation rotates by `rotation`; the satellite whose
  // effective angle is closest to 270° (top of screen) is "north".
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < plotted.length; i += 1) {
    const eff = (plotted[i].angleDeg + rotation) % 360;
    const dist = Math.min(Math.abs(eff - 270), 360 - Math.abs(eff - 270));
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}
