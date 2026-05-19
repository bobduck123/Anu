"use client";

// Signature: GalleryWall
//
// Identity move: a quiet, museum-curated hanging. Pieces are spaced
// generously, the wall is white, captions are small museum labels with
// a thin rule. Subtle breath motion on focus. Built for the gallery
// painter and any editorial_identity room whose DNA prefers a calm
// gallery-flow rhythm.

import Link from "next/link";
import GalleryBreath from "@/components/presence/behaviours/GalleryBreath";
import TreatedImage from "@/components/presence/TreatedImage";
import type { PresenceWork } from "@/lib/api/types";
import type { BehaviourIntensity, ImageTreatment, Texture } from "@/lib/presence/dna/types";

interface GalleryWallProps {
  works: PresenceWork[];
  slug: string;
  treatment?: ImageTreatment;
  texture?: Texture;
  intensity?: BehaviourIntensity;
  // The blueprint may want to skip a hero-piece that already appears at the top.
  skipFirst?: boolean;
}

export default function GalleryWall({
  works,
  slug,
  treatment = "gallery_matte",
  texture = "paper",
  intensity = "subtle",
  skipFirst = false,
}: GalleryWallProps) {
  const visible = works.filter((w) => w.is_visible !== false);
  const pieces = (skipFirst ? visible.slice(1) : visible).slice(0, 8);

  if (pieces.length === 0) {
    return (
      <div className="presence-gallery-wall-empty">
        <p>The wall is being prepared.</p>
      </div>
    );
  }

  return (
    <div className="presence-signature-gallery-wall">
      <div className="wall-rule" aria-hidden />
      <ul className="wall-grid">
        {pieces.map((work, i) => {
          const src = work.thumbnail_url ?? work.image_url ?? null;
          const span = i % 5 === 0 ? "wide" : "standard";
          return (
            <li key={work.id ?? work.slug ?? `${work.title}-${i}`} data-span={span}>
              <Link href={`/p/${slug}/works/${work.id ?? work.slug ?? i}`} className="piece">
                <GalleryBreath intensity={intensity}>
                  <div className="piece-frame">
                    <TreatedImage
                      src={src}
                      alt={work.title}
                      treatment={treatment}
                      texture={texture}
                      fill
                    />
                  </div>
                </GalleryBreath>
                <figcaption className="museum-label">
                  <span className="catalog">{String(i + 1).padStart(2, "0")}</span>
                  <span className="title">{work.title}</span>
                  {(work.year || work.medium) && (
                    <span className="meta">{[work.year, work.medium].filter(Boolean).join(" · ")}</span>
                  )}
                  {work.dimensions && <span className="meta">{work.dimensions}</span>}
                  {work.availability_status && (
                    <span className="availability">{work.availability_status}</span>
                  )}
                </figcaption>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
