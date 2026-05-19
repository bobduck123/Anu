"use client";

// EngagementDynamicPreviewCard — Pass 6 visual chooser primitive.
//
// A card representing a single dynamic. Shows a live animated mini-
// preview, the label, the feeling, who it's best for, and an
// "enter demo" action. Users see what they're picking before they
// pick it.

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { DynamicEntry } from "@/lib/presence/world/dynamicRegistry";
import DynamicMiniPreview from "./DynamicMiniPreview";

interface Props {
  entry: DynamicEntry;
  demoHref?: string;
  selected?: boolean;
  onSelect?: (id: DynamicEntry["id"]) => void;
}

export default function EngagementDynamicPreviewCard({
  entry,
  demoHref,
  selected = false,
  onSelect,
}: Props) {
  return (
    <article
      className={`engagement-card ${selected ? "is-selected" : ""}`}
      data-feeling={entry.feeling}
      data-id={entry.id}
    >
      <DynamicMiniPreview id={entry.id} />
      <header className="engagement-card-head">
        <p className="engagement-card-feeling">
          <Sparkles className="h-3 w-3" aria-hidden /> {entry.feeling}
        </p>
        <h3 className="engagement-card-title">{entry.label}</h3>
        <p className="engagement-card-summary">{entry.summary}</p>
      </header>
      <ul className="engagement-card-suited">
        {entry.suitedFor.slice(0, 4).map((s) => (
          <li key={s}>{s.replaceAll("_", " ")}</li>
        ))}
      </ul>
      <footer className="engagement-card-actions">
        {onSelect && (
          <button
            type="button"
            className="engagement-card-select"
            aria-pressed={selected}
            onClick={() => onSelect(entry.id)}
          >
            {selected ? "Selected" : "Select"}
          </button>
        )}
        {demoHref && (
          <Link href={demoHref} className="engagement-card-demo">
            Enter demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
        {!entry.implemented && <span className="engagement-card-tag">Scaffolded</span>}
      </footer>
    </article>
  );
}
