"use client";

// Signature: QuoteOracle
//
// Identity move: a single large editorial quote that cycles slowly
// through the proof items. The current quote is hero-sized; the
// remaining quotes sit as a strip of attributions below, like an oracle
// you can scroll. Built for consultant rooms (Heron Strategy and
// similar) where one perfectly-placed quote is worth more than a wall
// of testimonials.
//
// Cycle is intentional — every ~9 seconds, with a 5-second pause on
// hover/focus. Reduced-motion shows the first quote statically and
// the strip is keyboard-clickable to switch.

import { useEffect, useRef, useState } from "react";
import { Quote as QuoteIcon } from "lucide-react";

export interface OracleQuote {
  id?: string | number;
  testimonial: string;
  client_label?: string | null;
  outcome?: string | null;
}

interface QuoteOracleProps {
  quotes: OracleQuote[];
  cycleMs?: number;
}

export default function QuoteOracle({ quotes, cycleMs = 9000 }: QuoteOracleProps) {
  const items = (quotes ?? []).filter((q) => q && (q.testimonial || "").trim().length > 0);
  const [index, setIndex] = useState(0);
  const hoverRef = useRef(false);

  useEffect(() => {
    if (items.length <= 1) return;
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const interval = window.setInterval(() => {
      if (hoverRef.current) return;
      setIndex((prev) => (prev + 1) % items.length);
    }, cycleMs);
    return () => window.clearInterval(interval);
  }, [items.length, cycleMs]);

  if (items.length === 0) {
    return (
      <div className="presence-quote-oracle-empty">
        <p>The oracle has no quotes yet.</p>
      </div>
    );
  }

  const active = items[index] ?? items[0];

  return (
    <div
      className="presence-signature-quote-oracle"
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
      onFocus={() => {
        hoverRef.current = true;
      }}
      onBlur={() => {
        hoverRef.current = false;
      }}
    >
      <QuoteIcon className="oracle-mark" aria-hidden />
      <blockquote className="oracle-active" key={active.id ?? index}>
        <p className="oracle-quote">"{active.testimonial}"</p>
        {(active.client_label || active.outcome) && (
          <footer>
            {active.client_label && <span className="who">{active.client_label}</span>}
            {active.outcome && <span className="outcome"> · {active.outcome}</span>}
          </footer>
        )}
      </blockquote>
      {items.length > 1 && (
        <ol className="oracle-strip" role="tablist">
          {items.map((q, i) => (
            <li key={q.id ?? i}>
              <button
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-current={i === index ? "true" : undefined}
                aria-label={q.client_label || `Quote ${i + 1}`}
                onClick={() => setIndex(i)}
                className={i === index ? "is-active" : ""}
              >
                <span className="dot" aria-hidden />
                <span className="label">{q.client_label ?? `${String(i + 1).padStart(2, "0")}`}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
