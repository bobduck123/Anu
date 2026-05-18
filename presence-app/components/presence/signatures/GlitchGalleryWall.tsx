"use client";

// Signature: GlitchGalleryWall
//
// Identity move: an asymmetric grid of work thumbnails that pulses with
// controlled glitch — scanline displacement, chromatic aberration on
// captions, and a random-tile "shimmer" once every several seconds.
// Designed for nocturnal/sonic/underground rooms.

import { useEffect, useRef } from "react";
import type { PresenceWork } from "@/lib/api/types";
import TreatedImage from "@/components/presence/TreatedImage";
import type { BehaviourIntensity, ImageTreatment, Texture } from "@/lib/presence/dna/types";

interface GlitchGalleryWallProps {
  works: PresenceWork[];
  intensity?: BehaviourIntensity;
  treatment?: ImageTreatment;
  texture?: Texture;
}

export default function GlitchGalleryWall({
  works,
  intensity = "high",
  treatment = "glitch",
  texture = "scanline",
}: GlitchGalleryWallProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = works.filter((w) => w.is_visible !== false).slice(0, 9);

  useEffect(() => {
    if (intensity === "off") return;
    const node = ref.current;
    if (!node) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const tiles = Array.from(node.querySelectorAll<HTMLElement>("[data-glitch-tile]"));
    if (tiles.length === 0) return;
    const period = intensity === "high" ? 1800 : intensity === "featured" ? 3200 : 5400;

    let cancelled = false;
    let timeout: number | null = null;

    const shimmer = () => {
      if (cancelled) return;
      const tile = tiles[Math.floor(Math.random() * tiles.length)];
      tile.classList.add("is-shimmering");
      window.setTimeout(() => tile.classList.remove("is-shimmering"), 220);
      timeout = window.setTimeout(shimmer, period + (Math.random() - 0.5) * period * 0.5);
    };
    timeout = window.setTimeout(shimmer, period);
    return () => {
      cancelled = true;
      if (timeout) window.clearTimeout(timeout);
    };
  }, [intensity]);

  if (visible.length === 0) {
    return (
      <div className="presence-glitch-empty">
        <p>No works yet. The wall is dark.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="presence-signature-glitch-wall" data-intensity={intensity}>
      {visible.map((work, i) => {
        const src = work.thumbnail_url ?? work.image_url ?? null;
        const span = i === 0 ? "lg" : i === 2 || i === 5 ? "md" : "sm";
        return (
          <figure key={work.id ?? work.slug ?? `${work.title}-${i}`} data-glitch-tile data-span={span}>
            <div className="tile-img">
              <TreatedImage
                src={src}
                alt={work.title}
                treatment={treatment}
                texture={texture}
                fill
                priority={i === 0}
                className="object-cover"
              />
              <span className="tile-scan" aria-hidden />
            </div>
            <figcaption>
              <span className="idx">[{String(i + 1).padStart(2, "0")}]</span>
              <span className="title">{work.title}</span>
              {(work.year || work.medium) && (
                <span className="meta">{[work.year, work.medium].filter(Boolean).join(" / ")}</span>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
