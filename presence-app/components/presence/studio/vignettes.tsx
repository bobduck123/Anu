"use client";

// Studio vignettes — small atmospheric SVG/CSS previews used inside
// the option cards. These are static composites; reduced-motion users
// see exactly the same image. No imagination required to understand
// any choice.

import type { CSSProperties, ReactNode } from "react";

function Layer({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", inset: 0, ...(style ?? {}) }}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Identity vignettes — one per archetype.
// ---------------------------------------------------------------------------
export function IdentityVignette({ id }: { id: string }) {
  if (id === "sound") {
    return (
      <Layer style={{ background: "radial-gradient(circle at 30% 40%, rgba(255,216,77,0.2), transparent 50%), linear-gradient(160deg,#06060b,#131022 70%,#06060b)" }}>
        {Array.from({ length: 28 }).map((_, i) => {
          const x = (i * 47) % 100;
          const y = (i * 79) % 100;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`, top: `${y}%`,
                width: 2, height: 2, borderRadius: "50%",
                background: i % 4 === 0 ? "#ffd84d" : "#7dd0ff",
                opacity: ((i % 6) + 1) / 8,
                boxShadow: i % 4 === 0 ? "0 0 4px #ffd84d" : "0 0 2px #7dd0ff",
              }}
            />
          );
        })}
      </Layer>
    );
  }
  if (id === "maker") {
    return (
      <Layer style={{ background: "radial-gradient(circle at 25% 30%, rgba(224,164,85,0.18), transparent 50%), linear-gradient(160deg,#2d1f12,#1c1109)" }}>
        <Layer style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 1px, transparent 1px 30px)", opacity: 0.5 }} />
        {[{ l: 14, b: 18, w: 8, h: 36, c: "#d8b78a", r: "50% 50% 40% 40%" },
          { l: 28, b: 14, w: 6, h: 50, c: "#c79968", r: "20% 20% 8% 8%" },
          { l: 42, b: 16, w: 14, h: 14, c: "#7a4a26", r: "2px" },
          { l: 62, b: 14, w: 22, h: 18, c: "#6b3f1f" }].map((o, i) => (
          <span key={i} style={{ position: "absolute", left: `${o.l}%`, bottom: `${o.b}%`, width: `${o.w}%`, height: `${o.h}%`, background: o.c, borderRadius: o.r ?? "2px" }} />
        ))}
      </Layer>
    );
  }
  if (id === "practitioner") {
    return (
      <Layer style={{ background: "linear-gradient(180deg,#f6f3ed,#e2dccd)" }}>
        {["01 · INTAKE", "02 · METHOD", "03 · PROOF", "04 · BOOK"].map((label, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${14 + i * 22}%`, top: "30%",
              width: "16%", height: "40%",
              background: "#fbfaf6",
              border: "1px solid #c8bda5",
              padding: 6,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 7,
              color: "#5a5347",
              letterSpacing: "0.16em",
              display: "flex",
              alignItems: "flex-end",
            }}
          >{label}</span>
        ))}
      </Layer>
    );
  }
  if (id === "venue") {
    return (
      <Layer style={{ background: "radial-gradient(circle at 30% 30%, rgba(185,69,34,0.3), transparent 50%), linear-gradient(160deg,#0a0908,#1a0d0a 70%,#060504)", perspective: "600px" }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              position: "absolute", left: "50%", top: "50%",
              width: "60%", aspectRatio: "5/3",
              transform: `translate(-50%,-50%) translateZ(${-i * 24}px) scale(${1 - i * 0.07})`,
              background: i === 0 ? "#c44a26" : "#1a1814",
              border: "1px solid rgba(255,250,235,0.14)",
              opacity: 1 - i * 0.2,
            }}
          />
        ))}
      </Layer>
    );
  }
  // artist (default)
  return (
    <Layer style={{ background: "linear-gradient(180deg,#f8f4ec,#ddd4c1)" }}>
      {[{ l: 20, t: 30, w: 12, h: 44 }, { l: 45, t: 22, w: 16, h: 56 }, { l: 70, t: 32, w: 10, h: 40 }].map((f, i) => (
        <span key={i} style={{
          position: "absolute",
          left: `${f.l}%`, top: `${f.t}%`,
          width: `${f.w}%`, height: `${f.h}%`,
          background: "#1a1814",
          backgroundImage: "repeating-linear-gradient(135deg, rgba(255,250,235,0.08) 0 2px, transparent 2px 12px)",
        }} />
      ))}
    </Layer>
  );
}

// ---------------------------------------------------------------------------
// World vignettes
// ---------------------------------------------------------------------------
export function WorldVignette({ id }: { id: string }) {
  if (id === "sound") {
    return (
      <Layer style={{ background: "radial-gradient(circle at 30% 40%, rgba(255,216,77,0.2), transparent 50%), linear-gradient(160deg,#06060b,#131022 70%,#06060b)" }}>
        {Array.from({ length: 50 }).map((_, i) => {
          const x = (i * 41) % 100;
          const y = (i * 73) % 100;
          return (
            <span key={i} style={{
              position: "absolute", left: `${x}%`, top: `${y}%`,
              width: 2, height: 2, borderRadius: "50%",
              background: i % 4 === 0 ? "#ffd84d" : "#7dd0ff",
              opacity: ((i % 6) + 1) / 8,
              boxShadow: i % 4 === 0 ? "0 0 4px #ffd84d" : "0 0 2px #7dd0ff",
            }} />
          );
        })}
        <Layer style={{
          left: "12%", right: "12%", bottom: "18%", top: "60%",
          background: "repeating-linear-gradient(90deg, #ffd84d 0 1px, transparent 1px 12px)",
          opacity: 0.45,
        }} />
      </Layer>
    );
  }
  if (id === "studio") {
    return (
      <Layer style={{ background: "linear-gradient(160deg,#2d1f12,#1c1109)" }}>
        <Layer style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 1px, transparent 1px 30px)", opacity: 0.6 }} />
        <span style={{ position: "absolute", left: "8%", right: "8%", top: "30%", height: 4, background: "#0e0805", boxShadow: "0 12px 30px rgba(0,0,0,0.6)" }} />
        {[{ l: 22, b: 64, w: 6, h: 18, c: "#d8b78a", r: "50% 50% 40% 40%" },
          { l: 36, b: 64, w: 4, h: 22, c: "#c79968", r: "20% 20% 8% 8%" },
          { l: 50, b: 64, w: 4, h: 14, c: "#a8624a", r: "50%" },
          { l: 62, b: 64, w: 8, h: 12, c: "#7a4a26" }].map((o, i) => (
          <span key={i} style={{
            position: "absolute", left: `${o.l}%`, bottom: `${o.b}%`,
            width: `${o.w}%`, height: `${o.h}%`, background: o.c,
            borderRadius: o.r ?? "2px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
          }} />
        ))}
        <span style={{
          position: "absolute", left: "8%", right: "8%", top: "62%", bottom: "8%",
          background: "linear-gradient(180deg, #6b3f1f, #2e180a)",
          boxShadow: "inset 0 0 0 1px rgba(255,210,160,0.1)",
        }} />
      </Layer>
    );
  }
  // gallery (default)
  return (
    <Layer style={{ background: "linear-gradient(180deg,#ffffff,#ece6d8)" }}>
      {[{ l: 14, t: 30, w: 18, h: 38 }, { l: 42, t: 22, w: 22, h: 50 }, { l: 74, t: 28, w: 14, h: 34 }].map((f, i) => (
        <span key={i} style={{
          position: "absolute", left: `${f.l}%`, top: `${f.t}%`,
          width: `${f.w}%`, height: `${f.h}%`,
          background: "#1a1814",
          backgroundImage: "repeating-linear-gradient(135deg, rgba(255,250,235,0.08) 0 2px, transparent 2px 12px)",
          boxShadow: "0 8px 18px -6px rgba(0,0,0,0.25)",
        }} />
      ))}
      <span style={{ position: "absolute", left: 0, right: 0, bottom: "12%", height: 1, background: "rgba(0,0,0,0.12)" }} />
    </Layer>
  );
}

// ---------------------------------------------------------------------------
// Movement vignettes — static for reduced-motion; animated CSS keyframes
// (in studio.css) drive the small motion otherwise.
// ---------------------------------------------------------------------------
export function MovementVignette({ id, accent = "#d8a44a" }: { id: string; accent?: string }) {
  if (id === "orbit") {
    return (
      <Layer style={{ background: "#0e0d0b", overflow: "hidden" }}>
        <span style={{ position: "absolute", left: "50%", top: "50%", width: 14, height: 14, transform: "translate(-50%,-50%)", borderRadius: "50%", background: accent, boxShadow: `0 0 18px ${accent}` }} />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return <span key={i} style={{
            position: "absolute",
            left: `calc(50% + ${Math.cos(a) * 38}%)`, top: `calc(50% + ${Math.sin(a) * 28}%)`,
            transform: "translate(-50%,-50%)",
            width: 10, height: 10, borderRadius: 2,
            background: i === 0 ? accent : "rgba(255,250,235,0.5)",
          }} />;
        })}
      </Layer>
    );
  }
  if (id === "bench") {
    return (
      <Layer style={{ background: "#1c1109", overflow: "hidden", perspective: "500px" }}>
        <div style={{ position: "absolute", inset: "20% 6% 8% 6%", transform: "rotateX(28deg)", transformOrigin: "50% 80%" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#6b3f1f,#2e180a)", borderRadius: 2 }} />
          {[{ l: 10, t: 30, w: 18, h: 36, c: "#7a4a26" },
            { l: 34, t: 48, w: 12, h: 18, c: "#a8624a", r: "50%" },
            { l: 54, t: 36, w: 10, h: 32, c: "#d8b78a", r: "20% 20% 8% 8%" },
            { l: 74, t: 44, w: 18, h: 24, c: "#efe9da" }].map((o, i) => (
            <div key={i} style={{
              position: "absolute", left: `${o.l}%`, top: `${o.t}%`,
              width: `${o.w}%`, height: `${o.h}%`, background: o.c,
              borderRadius: o.r ?? "2px",
            }} />
          ))}
        </div>
      </Layer>
    );
  }
  if (id === "doors") {
    return (
      <Layer style={{ background: "#0a0908", overflow: "hidden", perspective: "600px" }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{
            position: "absolute", left: "50%", top: "50%",
            width: "70%", aspectRatio: "5/3",
            transform: `translate(-50%, -50%) translateZ(${-i * 30}px) scale(${1 - i * 0.07})`,
            background: i === 0 ? `linear-gradient(160deg, ${accent} 0%, #4a0e00 100%)` : "#1a1814",
            border: "1px solid rgba(255,250,235,0.12)",
            opacity: 1 - i * 0.2,
          }} />
        ))}
      </Layer>
    );
  }
  // rooms (default)
  return (
    <Layer style={{ background: "#1a1814", overflow: "hidden" }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{
          position: "absolute", top: "15%", bottom: "15%",
          left: `${10 + i * 22}%`, width: "18%",
          border: `1px solid ${i === 1 ? accent : "rgba(255,250,235,0.18)"}`,
          background: i === 1 ? `color-mix(in oklab, ${accent} 14%, transparent)` : "transparent",
        }} />
      ))}
    </Layer>
  );
}

// ---------------------------------------------------------------------------
// Material swatch composite
// ---------------------------------------------------------------------------
export function MaterialVignette({ swatches }: { swatches: string[] }) {
  return (
    <Layer style={{ display: "flex" }}>
      {swatches.map((s, i) => (
        <div key={i} style={{ flex: 1, background: s }} />
      ))}
    </Layer>
  );
}

// ---------------------------------------------------------------------------
// Contact preview — illustrates how a visitor will reach you
// ---------------------------------------------------------------------------
export function ContactPreview({ kind, fields }: { kind: string; fields: string[] }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      padding: "10px 12px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 9, color: "#5a5347", letterSpacing: "0.08em",
      display: "grid", gap: 6, alignContent: "start",
    }}>
      <div style={{ fontSize: 7, opacity: 0.7, letterSpacing: "0.18em", textTransform: "uppercase" }}>{kind}</div>
      {fields.map((f, i) => (
        <div key={i} style={{ borderBottom: "1px dashed rgba(0,0,0,0.18)", paddingBottom: 4 }}>
          <span style={{ opacity: 0.6 }}>{i + 1}.</span> {f}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mood / pace previews
// ---------------------------------------------------------------------------
export function MoodSwatch({ wash, swatches }: { wash: string; swatches: string[] }) {
  return (
    <Layer style={{ background: wash }}>
      <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", gap: 2 }}>
        {swatches.map((s, i) => (
          <span key={i} style={{ width: 10, height: 10, background: s, borderRadius: "50%", boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }} />
        ))}
      </div>
    </Layer>
  );
}

export function PaceTrack({ active = false }: { ease?: string; active?: boolean }) {
  return (
    <div style={{
      width: "100%", height: 4, background: "rgba(255,250,235,0.12)", position: "relative", borderRadius: 2,
    }}>
      <span style={{
        position: "absolute", left: 0, top: -3, width: 10, height: 10, borderRadius: "50%",
        background: active ? "var(--studio-copper, #b86737)" : "rgba(255,250,235,0.5)",
      }} />
    </div>
  );
}
