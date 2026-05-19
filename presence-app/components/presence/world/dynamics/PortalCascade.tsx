"use client";

// PortalCascade — Pass 6 engagement dynamic.
//
// Layered portals stacked in depth. Forward unfolds the next layer
// forward; left/right changes the active branch; retreat folds back
// one layer. Each portal can contain its own content cluster (works,
// services, statements) inspectable via the standard portal panel.
//
// Theatrical / editorial / kinetic — the opposite of "calm chamber
// walk". Best for performers, venues, events.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { RoomObjectDef } from "@/lib/presence/world/graph";

export interface CascadeLayer {
  id: string;
  label: string;
  caption?: string;
  objects: RoomObjectDef[];
}

export interface CascadeBranch {
  id: string;
  label: string;
  layers: CascadeLayer[];
}

interface PortalCascadeProps {
  title: string;
  eyebrow?: string;
  branches: CascadeBranch[];
  onInspect: (object: RoomObjectDef) => void;
}

export default function PortalCascade({
  title,
  eyebrow = "Cascade",
  branches,
  onInspect,
}: PortalCascadeProps) {
  const [branchIdx, setBranchIdx] = useState(0);
  const [layerIdx, setLayerIdx] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const branch = branches[branchIdx];
  const layers = branch?.layers ?? [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setBranchIdx((i) => (i - 1 + branches.length) % branches.length);
          setLayerIdx(0);
          break;
        case "ArrowRight":
          e.preventDefault();
          setBranchIdx((i) => (i + 1) % branches.length);
          setLayerIdx(0);
          break;
        case "ArrowUp":
        case "Enter":
          if (e.key === "Enter" && document.activeElement instanceof HTMLButtonElement) return;
          e.preventDefault();
          setLayerIdx((i) => Math.min(i + 1, layers.length - 1));
          break;
        case "ArrowDown":
        case "Escape":
          e.preventDefault();
          setLayerIdx((i) => Math.max(i - 1, 0));
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [branches.length, layers.length]);

  if (reduced) {
    return (
      <div className="presence-dynamic-cascade presence-dynamic-cascade-fallback">
        <header>
          <p className="cascade-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </header>
        {branches.map((b) => (
          <section key={b.id} aria-label={b.label}>
            <h3>{b.label}</h3>
            {b.layers.map((layer) => (
              <article key={layer.id}>
                <h4>{layer.label}</h4>
                {layer.caption && <p>{layer.caption}</p>}
                <ul>
                  {layer.objects.map((o) => (
                    <li key={o.id}>
                      <button type="button" onClick={() => onInspect(o)} data-room-object="true">
                        {o.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ))}
      </div>
    );
  }

  const totalLayers = layers.length;

  return (
    <div className="presence-dynamic-cascade">
      <header className="cascade-head">
        <p className="cascade-eyebrow">{eyebrow}</p>
        <h2 className="cascade-title">{title}</h2>
      </header>

      <div className="cascade-stage" data-branch={branch?.id} data-layer={layerIdx}>
        <div className="cascade-branch-tabs" role="tablist" aria-label="Branch">
          {branches.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === branchIdx}
              onClick={() => { setBranchIdx(i); setLayerIdx(0); }}
              className="cascade-branch-tab"
            >
              <span className="branch-glyph">{String(i + 1).padStart(2, "0")}</span>
              <span className="branch-label">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="cascade-portals">
          {layers.map((layer, i) => {
            const depth = i - layerIdx;
            return (
              <article
                key={layer.id}
                className="cascade-portal"
                data-state={depth === 0 ? "front" : depth > 0 ? "ahead" : "behind"}
                style={{ ["--depth" as string]: depth.toString() } as CSSProperties}
                aria-hidden={depth !== 0}
                {...(depth !== 0 ? { inert: true } : {})}
              >
                <header className="portal-layer-head">
                  <p className="portal-layer-eyebrow">Layer {i + 1} / {totalLayers}</p>
                  <h3>{layer.label}</h3>
                  {layer.caption && <p className="portal-layer-caption">{layer.caption}</p>}
                </header>
                <div className="portal-layer-objects">
                  {layer.objects.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="cascade-object"
                      onClick={() => onInspect(o)}
                      data-room-object="true"
                      aria-label={`${o.kind}: ${o.title}`}
                    >
                      <span className="cascade-object-kind">{o.kind}</span>
                      <span className="cascade-object-title">{o.title}</span>
                      {o.summary && <span className="cascade-object-sub">{o.summary}</span>}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="cascade-hud" role="toolbar" aria-label="Cascade controls">
        <button type="button" onClick={() => { setBranchIdx((i) => (i - 1 + branches.length) % branches.length); setLayerIdx(0); }} aria-label="Previous branch">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setLayerIdx((i) => Math.min(i + 1, totalLayers - 1))} aria-label="Fold forward" disabled={layerIdx >= totalLayers - 1}>
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => { setBranchIdx((i) => (i + 1) % branches.length); setLayerIdx(0); }} aria-label="Next branch">
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setLayerIdx((i) => Math.max(i - 1, 0))} aria-label="Fold back" disabled={layerIdx <= 0}>
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
