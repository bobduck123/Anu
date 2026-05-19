"use client";

interface MotionProfile {
  id: string;
  label: string;
  description: string;
  /** Speed glyph: how fast the preview animation should pulse. */
  tempo: "slow" | "medium" | "quick" | "kinetic";
}

const PROFILES: MotionProfile[] = [
  { id: "calm",       label: "Calm",       description: "Soft entries, decisive exits, no bounce.",     tempo: "slow" },
  { id: "cinematic",  label: "Cinematic",  description: "Slower, theatrical, with depth and inertia.",   tempo: "medium" },
  { id: "kinetic",    label: "Kinetic",    description: "Snappy, energetic, with sharper response.",      tempo: "kinetic" },
  { id: "minimal",    label: "Minimal",    description: "Almost still — only the essential motion.",      tempo: "slow" },
];

export default function MotionProfilePreview() {
  return (
    <ul className="motion-profile-strip" role="list">
      {PROFILES.map((p) => (
        <li key={p.id}>
          <button type="button" className={`motion-profile motion-tempo-${p.tempo}`} aria-label={p.label}>
            <span className="motion-glyph" aria-hidden>
              <span className="motion-dot" />
              <span className="motion-dot" />
              <span className="motion-dot" />
            </span>
            <span className="motion-meta">
              <span className="motion-label">{p.label}</span>
              <span className="motion-desc">{p.description}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
