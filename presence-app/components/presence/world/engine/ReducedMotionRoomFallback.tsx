"use client";

// ReducedMotionRoomFallback — accessible flat rendering.
//
// When the user has reduced-motion enabled (or chooses the fallback),
// every chamber is rendered top-to-bottom as a normal stack with all
// objects expanded inline. No camera, no portals, no hidden content —
// the room becomes a normal accessible document.

import type {
  ChamberSlotRenderer,
  RoomGraph,
} from "@/lib/presence/world/graph";

interface FallbackProps {
  graph: RoomGraph;
  renderSlot: ChamberSlotRenderer;
  worldLabel: string;
  worldEyebrow: string;
  ctaHref?: string | null;
}

export default function ReducedMotionRoomFallback({
  graph,
  renderSlot,
  worldLabel,
  worldEyebrow,
}: FallbackProps) {
  return (
    <main className="presence-engine-fallback" aria-label={`${worldLabel} — ${worldEyebrow}`}>
      <header className="fallback-threshold">
        <p className="fallback-eyebrow">{worldEyebrow}</p>
        <h1 className="fallback-name">{worldLabel}</h1>
      </header>
      <ol className="fallback-toc" aria-label="Chambers in this room">
        {graph.chambers.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`}>{c.title}</a>
          </li>
        ))}
      </ol>
      {graph.chambers.map((chamber) => (
        <section
          key={chamber.id}
          id={chamber.id}
          className={`fallback-chamber fallback-role-${chamber.role}`}
          aria-label={`${chamber.role}: ${chamber.title}`}
        >
          <header>
            <p className="fallback-role">{chamber.role}</p>
            <h2>{chamber.title}</h2>
            {chamber.caption && <p className="fallback-caption">{chamber.caption}</p>}
          </header>
          <div className="fallback-body">
            {renderSlot({ chamber, inspectingObjectId: null, onInspect: () => {} })}
          </div>
        </section>
      ))}
    </main>
  );
}
