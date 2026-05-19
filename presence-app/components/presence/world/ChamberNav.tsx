"use client";

// ChamberNav — desktop nav rail for chamber navigation. Renders as a
// fixed vertical index on the side. Each entry shows a glyph + label
// and updates the active chamber via the parent.

import type { RoomChamber } from "@/lib/presence/world/types";

interface ChamberNavProps {
  chambers: RoomChamber[];
  activeId: string;
  onSelect: (id: string) => void;
  side?: "left" | "right";
}

export default function ChamberNav({ chambers, activeId, onSelect, side = "right" }: ChamberNavProps) {
  if (chambers.length === 0) return null;
  return (
    <nav className={`presence-chamber-nav presence-chamber-nav-${side}`} aria-label="Chambers in this room">
      <ol>
        {chambers.map((chamber) => {
          const isActive = chamber.id === activeId;
          return (
            <li key={chamber.id}>
              <button
                type="button"
                onClick={() => onSelect(chamber.id)}
                aria-current={isActive ? "true" : undefined}
                data-active={isActive ? "true" : "false"}
              >
                <span className="chamber-glyph" aria-hidden>{chamber.glyph ?? "•"}</span>
                <span className="chamber-meta">
                  <span className="chamber-label">{chamber.label}</span>
                  {chamber.summary && <span className="chamber-summary">{chamber.summary}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
