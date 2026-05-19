"use client";

import type { CSSProperties } from "react";

interface Atmosphere {
  id: string;
  label: string;
  /** Background gradient used for the preview tile. */
  bg: string;
  accent: string;
  texture?: string;
}

const ATMOSPHERES: Atmosphere[] = [
  { id: "quiet_gallery",       label: "Quiet gallery",       bg: "radial-gradient(circle at 50% 35%, #fbfaf6 0%, #f3f1ea 100%)", accent: "#1a1a17" },
  { id: "nocturnal",           label: "Nocturnal signal",    bg: "radial-gradient(circle at 50% 40%, #0d1018 0%, #06070d 80%)", accent: "#ffd84d", texture: "repeating-linear-gradient(180deg, rgba(255,216,77,0.06) 0 1px, transparent 1px 4px)" },
  { id: "warm_material",       label: "Warm material",       bg: "linear-gradient(160deg, #1c1109 0%, #2d1f12 45%, #221708 100%)", accent: "#e0a455" },
  { id: "paper_archive",       label: "Paper archive",       bg: "linear-gradient(180deg, #f1ead9 0%, #d8c8a3 100%)", accent: "#7b5d38" },
  { id: "soft_care",           label: "Soft care",           bg: "radial-gradient(circle at 50% 30%, #f4f1e6 0%, #e2dfbf 100%)", accent: "#527a52" },
  { id: "industrial_editorial",label: "Industrial editorial",bg: "linear-gradient(160deg, #fafafa 0%, #e8e8e8 100%)", accent: "#0d0d0d" },
  { id: "civic_field",         label: "Civic field",         bg: "linear-gradient(180deg, #f5f1ea 0%, #eadfce 100%)", accent: "#b91c1c" },
  { id: "ritual",              label: "Ritual",              bg: "radial-gradient(circle at 30% 30%, #f8e3c4 0%, #c19355 100%)", accent: "#7b3a1c" },
  { id: "cinematic",           label: "Cinematic",           bg: "linear-gradient(180deg, #08080a 0%, #181820 100%)", accent: "#d8a44a" },
];

export default function AtmospherePreviewStrip() {
  return (
    <ul className="atmosphere-strip" role="list">
      {ATMOSPHERES.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            className="atmosphere-tile"
            style={{
              ["--atmo-bg" as string]: a.bg,
              ["--atmo-accent" as string]: a.accent,
            } as CSSProperties}
            aria-label={a.label}
          >
            <span className="atmo-swatch">
              {a.texture && <span className="atmo-texture" style={{ background: a.texture } as CSSProperties} />}
              <span className="atmo-dot" />
            </span>
            <span className="atmo-label">{a.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
