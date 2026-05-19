"use client";

// PortalSheet — mobile bottom sheet that presents the room as
// destinations rather than menu links. Each entry is a portal card
// with chamber summary. Designed for wall_panels and archive_drawers
// rooms where you want to "step into" a place.

import { useState } from "react";
import { ChevronUp, X } from "lucide-react";
import type { RoomChamber } from "@/lib/presence/world/types";

interface PortalSheetProps {
  chambers: RoomChamber[];
  activeId: string;
  onSelect: (id: string) => void;
  triggerLabel?: string;
}

export default function PortalSheet({
  chambers,
  activeId,
  onSelect,
  triggerLabel = "Room",
}: PortalSheetProps) {
  const [open, setOpen] = useState(false);
  if (chambers.length === 0) return null;
  const active = chambers.find((c) => c.id === activeId);

  return (
    <>
      <button
        type="button"
        className="presence-portal-trigger"
        aria-expanded={open}
        aria-label={open ? "Close room destinations" : "Open room destinations"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
        <span>{open ? "Close" : active?.label ?? triggerLabel}</span>
      </button>

      {open && (
        <div className="presence-portal-sheet-backdrop" onClick={() => setOpen(false)} aria-hidden />
      )}
      <aside
        className={`presence-portal-sheet ${open ? "is-open" : ""}`}
        aria-label="Room destinations"
        aria-hidden={!open}
      >
        <header>
          <p className="sheet-eyebrow">Destinations in this room</p>
          <h2>{triggerLabel}</h2>
        </header>
        <ul className="sheet-list">
          {chambers.map((chamber) => {
            const isActive = chamber.id === activeId;
            return (
              <li key={chamber.id}>
                <button
                  type="button"
                  className="sheet-portal"
                  onClick={() => {
                    onSelect(chamber.id);
                    setOpen(false);
                  }}
                  data-active={isActive ? "true" : "false"}
                >
                  <span className="portal-glyph" aria-hidden>{chamber.glyph ?? "•"}</span>
                  <span className="portal-body">
                    <span className="portal-label">{chamber.label}</span>
                    {chamber.summary && <span className="portal-summary">{chamber.summary}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
