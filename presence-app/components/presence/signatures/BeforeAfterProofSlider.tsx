"use client";

// Signature: BeforeAfterProofSlider
//
// Identity move: a draggable before/after slider for trust-led service
// rooms (e.g. local carpenter, tradie, renovator, restorer). Pairs are
// derived from works whose titles or descriptions include a Before/After
// signal, or from explicit pair props.

import { useRef, useState } from "react";
import TreatedImage from "@/components/presence/TreatedImage";
import type { PresenceWork } from "@/lib/api/types";

export interface BeforeAfterPair {
  id: string;
  label: string;
  caption?: string | null;
  beforeUrl: string | null;
  afterUrl: string | null;
}

interface BeforeAfterProofSliderProps {
  pairs?: BeforeAfterPair[];
  works?: PresenceWork[];
}

function derivePairsFromWorks(works: PresenceWork[]): BeforeAfterPair[] {
  // Group works whose title starts with "Before" or "After" (or contains
  // those tokens) by their stripped base title.
  const grouped: Record<string, { before?: PresenceWork; after?: PresenceWork; key: string }> = {};
  for (const w of works) {
    if (w.is_visible === false) continue;
    const t = (w.title ?? "").trim();
    const lower = t.toLowerCase();
    let role: "before" | "after" | null = null;
    let base = t;
    if (lower.startsWith("before")) {
      role = "before";
      base = t.replace(/^before[\s:-]*/i, "").trim();
    } else if (lower.startsWith("after")) {
      role = "after";
      base = t.replace(/^after[\s:-]*/i, "").trim();
    } else if (/(before)/i.test(lower)) {
      role = "before";
    } else if (/(after)/i.test(lower)) {
      role = "after";
    }
    if (!role) continue;
    const key = base || t;
    if (!grouped[key]) grouped[key] = { key };
    grouped[key][role] = w;
  }
  return Object.values(grouped)
    .filter((g) => g.before && g.after)
    .slice(0, 4)
    .map((g) => ({
      id: g.key,
      label: g.key,
      caption: g.after?.description ?? g.before?.description ?? null,
      beforeUrl: g.before?.thumbnail_url ?? g.before?.image_url ?? null,
      afterUrl: g.after?.thumbnail_url ?? g.after?.image_url ?? null,
    }));
}

function Slider({ pair }: { pair: BeforeAfterPair }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0.5);
  const onMove = (clientX: number) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setPos(x);
  };
  return (
    <figure className="presence-ba-figure">
      <div
        ref={ref}
        className="presence-ba-window"
        role="slider"
        aria-label={`Before and after for ${pair.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos * 100)}
        tabIndex={0}
        onMouseMove={(e) => onMove(e.clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 0.05));
          if (e.key === "ArrowRight") setPos((p) => Math.min(1, p + 0.05));
        }}
      >
        <div className="ba-layer ba-before">
          <TreatedImage src={pair.beforeUrl} alt={`${pair.label} — before`} treatment="documentary" fill className="object-cover" />
        </div>
        <div className="ba-layer ba-after" style={{ width: `${pos * 100}%` }}>
          <TreatedImage src={pair.afterUrl} alt={`${pair.label} — after`} treatment="documentary" fill className="object-cover" />
        </div>
        <div className="ba-handle" style={{ left: `${pos * 100}%` }} aria-hidden>
          <span />
        </div>
        <div className="ba-tags" aria-hidden>
          <span className="tag tag-before">Before</span>
          <span className="tag tag-after">After</span>
        </div>
      </div>
      <figcaption>
        <p className="label">{pair.label}</p>
        {pair.caption && <p className="caption">{pair.caption}</p>}
      </figcaption>
    </figure>
  );
}

export default function BeforeAfterProofSlider({ pairs, works = [] }: BeforeAfterProofSliderProps) {
  const resolved = pairs && pairs.length > 0 ? pairs : derivePairsFromWorks(works);
  if (resolved.length === 0) {
    return (
      <div className="presence-ba-empty">
        <p>No before/after pairs yet — add works titled "Before: …" and "After: …" to populate this proof panel.</p>
      </div>
    );
  }
  return (
    <div className="presence-signature-ba">
      {resolved.map((p) => (
        <Slider key={p.id} pair={p} />
      ))}
    </div>
  );
}
