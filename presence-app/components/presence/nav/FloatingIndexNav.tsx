"use client";

// floating_index — mobile-first floating index nav. Treated as a first-
// class identity layer (see Phase 3 spec): the nav shape, glyph style,
// and motion are part of the room's character, not a responsive
// afterthought.
//
// Behaviour: a compact pill sits at the bottom-centre on mobile, expands
// to a vertical glyph index on tap. On desktop it becomes a fixed
// right-edge dot rail.

import { useEffect, useState } from "react";
import { ChevronUp, X } from "lucide-react";

export interface FloatingIndexEntry {
  id: string;
  label: string;
  glyph: string; // 1-2 char label glyph
}

interface FloatingIndexNavProps {
  entries: FloatingIndexEntry[];
  accent?: string;
}

export default function FloatingIndexNav({ entries, accent }: FloatingIndexNavProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;
    const handler = (entriesIn: IntersectionObserverEntry[]) => {
      for (const e of entriesIn) {
        if (e.isIntersecting) setActive((e.target as HTMLElement).id);
      }
    };
    const obs = new IntersectionObserver(handler, { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 });
    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <>
      {/* Desktop: right-edge dot rail */}
      <nav
        aria-label="Room index"
        className="presence-nav-desktop hidden md:flex"
        style={accent ? ({ "--presence-accent": accent } as React.CSSProperties) : undefined}
      >
        <ol>
          {entries.map((entry) => (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                data-active={active === entry.id ? "true" : "false"}
                aria-current={active === entry.id ? "true" : undefined}
              >
                <span className="dot" aria-hidden />
                <span className="label">{entry.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Mobile: floating pill + expanded glyph index */}
      <div className="presence-nav-mobile md:hidden">
        <button
          type="button"
          className="presence-nav-mobile-toggle"
          aria-expanded={open}
          aria-label={open ? "Close room index" : "Open room index"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          <span>{open ? "Close" : entries.find((e) => e.id === active)?.label ?? "Index"}</span>
        </button>
        {open && (
          <ul className="presence-nav-mobile-panel" role="menu">
            {entries.map((entry) => (
              <li key={entry.id} role="none">
                <a
                  href={`#${entry.id}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  data-active={active === entry.id ? "true" : "false"}
                >
                  <span className="glyph" aria-hidden>
                    {entry.glyph}
                  </span>
                  <span className="label">{entry.label}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
