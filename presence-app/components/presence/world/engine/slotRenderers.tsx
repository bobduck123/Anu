"use client";

// Slot renderers — how each room arranges its chamber objects.
//
// Same ChamberSlotProps shape for all three rooms; different visual
// arrangement so each world reads as itself even though the engine is
// shared.

import type { ChamberSlotProps } from "@/lib/presence/world/graph";
import { AudioObjectCard, ObjectCard } from "./objectRenderers";

// ---------------------------------------------------------------------------
// Gallery slot — works hang on left/right walls, statement centred,
// services and notes laid out as portal cards.
// ---------------------------------------------------------------------------
export function GallerySlot({ chamber, onInspect }: ChamberSlotProps) {
  if (chamber.role === "threshold") {
    return (
      <div className="chamber-threshold-stage">
        <p className="threshold-instruction">Step into the gallery.</p>
        <p className="threshold-keyhint">Press ↑ or tap forward to enter.</p>
      </div>
    );
  }
  if (chamber.role === "gallery") {
    return (
      <div className="slot-wall-arrangement">
        <div className="wall-side wall-left">
          {chamber.objects.filter((_, i) => i % 2 === 0).map((o) => (
            <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="frame" />
          ))}
        </div>
        <div className="wall-side wall-right">
          {chamber.objects.filter((_, i) => i % 2 === 1).map((o) => (
            <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="frame" />
          ))}
        </div>
      </div>
    );
  }
  if (chamber.role === "statement") {
    return (
      <div className="slot-statement">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="card" />
        ))}
      </div>
    );
  }
  if (chamber.role === "services" || chamber.role === "booking") {
    return (
      <div className="slot-cards">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="card" />
        ))}
      </div>
    );
  }
  if (chamber.role === "archive") {
    return (
      <div className="slot-pinboard">
        {chamber.objects.map((o, i) => (
          <div key={o.id} className="pinboard-pin" style={{ ["--tilt" as string]: `${(i % 2 === 0 ? -1.2 : 1) * (0.6 + (i % 3) * 0.4)}deg` }}>
            <ObjectCard object={o} onInspect={onInspect} variant="card" />
          </div>
        ))}
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sound slot — booth decks, signal wall tiles, archive prose, booking portal.
// ---------------------------------------------------------------------------
export function SoundSlot({ chamber, onInspect }: ChamberSlotProps) {
  if (chamber.role === "threshold") {
    return (
      <div className="chamber-threshold-stage sound">
        <p className="threshold-instruction">// signal — booking — room</p>
        <p className="threshold-keyhint">Press ↑ or tap forward to enter the booth.</p>
      </div>
    );
  }
  if (chamber.role === "booth") {
    return (
      <div className="slot-booth-rack">
        {chamber.objects.map((o) => (
          <AudioObjectCard key={o.id} object={o} onInspect={onInspect} />
        ))}
      </div>
    );
  }
  if (chamber.role === "gallery") {
    return (
      <div className="slot-signal-wall">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="tile" />
        ))}
      </div>
    );
  }
  if (chamber.role === "archive") {
    return (
      <div className="slot-archive-board">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="card" />
        ))}
      </div>
    );
  }
  if (chamber.role === "booking") {
    return (
      <div className="slot-portal-door">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="card" />
        ))}
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Studio slot — workbench (cta), shelf row, pathway list, appreciation deck.
// ---------------------------------------------------------------------------
export function StudioSlot({ chamber, onInspect }: ChamberSlotProps) {
  if (chamber.role === "studio") {
    return (
      <div className="chamber-threshold-stage studio">
        <p className="threshold-instruction">A working studio surface.</p>
        <p className="threshold-keyhint">Press ↑ or tap forward to step around to the bench.</p>
      </div>
    );
  }
  if (chamber.role === "gallery") {
    return (
      <div className="slot-shelf-row">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="card" />
        ))}
      </div>
    );
  }
  if (chamber.role === "services") {
    return (
      <ol className="slot-pathway">
        {chamber.objects.map((o, i) => (
          <li key={o.id} className="pathway-li">
            <span className="pathway-num">{String(i + 1).padStart(2, "0")}</span>
            <ObjectCard object={o} onInspect={onInspect} variant="card" />
          </li>
        ))}
      </ol>
    );
  }
  if (chamber.role === "archive") {
    return (
      <div className="slot-appreciation-deck">
        {chamber.objects.map((o, i) => (
          <div key={o.id} className="appreciation-pin" style={{ ["--tilt" as string]: `${(i % 2 === 0 ? -1.2 : 1) * (0.6 + (i % 3) * 0.4)}deg` }}>
            <ObjectCard object={o} onInspect={onInspect} variant="card" />
          </div>
        ))}
      </div>
    );
  }
  if (chamber.role === "booking") {
    return (
      <div className="slot-portal-door studio">
        {chamber.objects.map((o) => (
          <ObjectCard key={o.id} object={o} onInspect={onInspect} variant="card" />
        ))}
      </div>
    );
  }
  return null;
}
