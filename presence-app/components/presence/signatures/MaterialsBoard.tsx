"use client";

// Signature: MaterialsBoard
//
// Identity move: a material library presented as a tactile pinboard.
// Each material card lists the substrate, finish, source/region, and
// a slow-reveal close-up image. Built for craft rooms (furniture
// makers, joiners, ceramicists) — the room IS the workshop.

import TreatedImage from "@/components/presence/TreatedImage";
import type { PresenceWork } from "@/lib/api/types";

interface MaterialCard {
  label: string;
  source?: string | null;
  finish?: string | null;
  origin?: string | null;
  imageUrl?: string | null;
}

interface MaterialsBoardProps {
  // The board derives material cards primarily from `works` metadata —
  // `medium`, `dimensions`, optional thumbnail. This keeps it data-driven
  // and avoids any fabricated content.
  works: PresenceWork[];
  // Optional explicit material list, provided by backend or fixture metadata.
  materials?: MaterialCard[];
}

function deriveFromWorks(works: PresenceWork[]): MaterialCard[] {
  const out: MaterialCard[] = [];
  const seen = new Set<string>();
  for (const work of works) {
    const medium = (work.medium ?? "").trim();
    if (!medium) continue;
    if (seen.has(medium.toLowerCase())) continue;
    seen.add(medium.toLowerCase());
    out.push({
      label: medium,
      source: work.exhibition_history ?? null,
      finish: work.dimensions ?? null,
      imageUrl: work.thumbnail_url ?? work.image_url ?? null,
    });
    if (out.length >= 6) break;
  }
  return out;
}

export default function MaterialsBoard({ works, materials }: MaterialsBoardProps) {
  const cards = (materials && materials.length > 0 ? materials : deriveFromWorks(works)).slice(0, 6);

  if (cards.length === 0) {
    return (
      <div className="presence-materials-empty">
        <p>Materials library is being assembled.</p>
      </div>
    );
  }

  return (
    <div className="presence-signature-materials-board">
      <div className="board-grain" aria-hidden />
      <ul className="board-grid">
        {cards.map((card, i) => (
          <li key={`${card.label}-${i}`} className="material-card" style={{ ["--card-tilt" as string]: `${(i % 2 === 0 ? -1 : 1) * (0.6 + (i % 3) * 0.4)}deg` }}>
            <div className="card-pin" aria-hidden />
            <div className="card-img">
              <TreatedImage
                src={card.imageUrl ?? null}
                alt={card.label}
                treatment="warm_portrait"
                texture="timber"
                fill
                className="object-cover"
              />
            </div>
            <div className="card-meta">
              <p className="label">{card.label}</p>
              {(card.finish || card.origin || card.source) && (
                <p className="line">
                  {[card.finish, card.origin, card.source].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
