"use client";

// RoomDock — mobile bottom dock for chamber navigation. Uses room
// language ("Wall", "Desk", "Booth", "Archive", "Invitation") instead
// of generic web nav ("About", "Contact"). Each dock item shows a
// glyph and the chamber label.

import type { RoomChamber } from "@/lib/presence/world/types";

interface RoomDockProps {
  chambers: RoomChamber[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function RoomDock({ chambers, activeId, onSelect }: RoomDockProps) {
  if (chambers.length === 0) return null;
  return (
    <nav className="presence-room-dock" aria-label="Room destinations">
      <ul>
        {chambers.map((chamber) => {
          const isActive = chamber.id === activeId;
          return (
            <li key={chamber.id}>
              <button
                type="button"
                onClick={() => onSelect(chamber.id)}
                aria-current={isActive ? "true" : undefined}
                data-active={isActive ? "true" : "false"}
                className="room-dock-button"
              >
                <span className="dock-glyph" aria-hidden>{chamber.glyph ?? "•"}</span>
                <span className="dock-label">{chamber.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
