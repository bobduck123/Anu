"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

interface TeleportItem {
  label: string;
  href: string;
  hint?: string;
  kbd?: string;
}

interface TeleportSection {
  label: string;
  items: TeleportItem[];
}

const DEFAULT_SECTIONS: TeleportSection[] = [
  {
    label: "Garden",
    items: [
      { label: "My Garden", href: "/observer/garden", kbd: "G" },
      { label: "Passport", href: "/observer/passport", kbd: "P" },
      { label: "Mood Boards", href: "/observer/mood-boards", kbd: "M" },
    ],
  },
  {
    label: "Gather",
    items: [
      { label: "Halls", href: "/halls", kbd: "H" },
      { label: "Paths", href: "/observer/passport#paths" },
    ],
  },
  {
    label: "Find",
    items: [
      { label: "Saved Rooms", href: "/observer/passport#saved" },
      { label: "Gallery", href: "/gallery" },
      { label: "World", href: "/world", kbd: "W" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Create a Room", href: "/presence-chooser" },
    ],
  },
];

export function TeleportMenu({ sections = DEFAULT_SECTIONS }: { sections?: TeleportSection[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="teleport-menu" ref={wrap}>
      <button
        type="button"
        className="teleport-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        data-testid="teleport-trigger"
      >
        <span>Teleport</span>
        <ArrowUpRight size={12} aria-hidden />
      </button>
      {open && (
        <div className="teleport-sheet" role="menu" data-testid="teleport-sheet">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="teleport-section-label">{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={`${section.label}-${item.label}`}
                  href={item.href}
                  className="teleport-item"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.kbd && <span className="kbd">⌘{item.kbd}</span>}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
