"use client";

// LivePreviewStage — the "your direction so far" pane.
// Updates as the user picks. Shows a vignette informed by the current
// world + movement + mood; a small caption strip; and a typed summary
// line. Used by the desktop preview column AND the mobile drawer.

import type { ResolvedSelection } from "@/lib/presence/studio/useStudioState";

export function PreviewStage({ resolved }: { resolved: ResolvedSelection }) {
  const wash = resolved.mood?.wash ?? "linear-gradient(160deg, #1a1814, #06060b)";
  const accent = resolved.world?.accent ?? "#d8a44a";
  const mov = resolved.movement?.id;
  return (
    <div className="presence-studio-stage-mini" data-presence-customisation="live_preview">
      <div className="mini-vignette" style={{ background: wash }}>
        {mov === "rooms" && (
          <div className="mv-rooms">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{
                flex: 1,
                border: `1px solid ${i === 1 ? accent : "rgba(255,250,235,0.18)"}`,
                background: i === 1 ? `color-mix(in oklab, ${accent} 14%, transparent)` : "transparent",
              }} />
            ))}
          </div>
        )}
        {mov === "orbit" && (
          <div className="mv-orbit">
            <span className="mv-orbit-centre" style={{ background: accent, boxShadow: `0 0 14px ${accent}` }} />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2;
              return <span key={i} style={{
                position: "absolute",
                left: `calc(50% + ${Math.cos(a) * 42}%)`,
                top: `calc(50% + ${Math.sin(a) * 30}%)`,
                transform: "translate(-50%, -50%)",
                width: 8, height: 8, borderRadius: 2,
                background: i === 0 ? accent : "rgba(255,250,235,0.5)",
              }} />;
            })}
          </div>
        )}
        {mov === "bench" && (
          <div className="mv-bench" style={{ transform: "perspective(800px) rotateX(28deg)", transformOrigin: "50% 80%" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#6b3f1f,#2e180a)", borderRadius: 2 }} />
            {[{ l: 10, t: 30, w: 18, h: 36, c: "#7a4a26" },
              { l: 36, t: 40, w: 14, h: 20, c: "#c79968", r: "50%" },
              { l: 58, t: 36, w: 12, h: 32, c: "#d8b78a", r: "20% 20% 8% 8%" },
              { l: 78, t: 40, w: 18, h: 28, c: "#efe9da" }].map((o, i) => (
              <div key={i} style={{
                position: "absolute", left: `${o.l}%`, top: `${o.t}%`,
                width: `${o.w}%`, height: `${o.h}%`,
                background: o.c, borderRadius: o.r ?? "2px",
              }} />
            ))}
          </div>
        )}
        {mov === "doors" && (
          <div className="mv-doors">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{
                position: "absolute", left: "50%", top: "50%",
                width: "68%", aspectRatio: "5/3",
                transform: `translate(-50%, -50%) translateZ(${-i * 30}px) scale(${1 - i * 0.07})`,
                background: i === 0 ? `color-mix(in oklab, ${accent} 65%, #000)` : "rgba(20,15,10,0.85)",
                border: "1px solid rgba(255,250,235,0.12)",
                opacity: 1 - i * 0.22,
              }} />
            ))}
          </div>
        )}
        {!mov && <div className="mv-empty">Your preview unfolds as you choose</div>}

        <div className="mini-caption-top">
          <span>{resolved.world?.label ?? "Your place"}</span>
          <span>{resolved.movement?.label ?? "Choose movement"}</span>
        </div>
        <div className="mini-caption-bottom">
          {resolved.identity ? `For ${resolved.identity.label.toLowerCase()}.` : <span style={{ opacity: 0.5 }}>Your place</span>}
        </div>
      </div>
    </div>
  );
}

export function PreviewSummary({ resolved }: { resolved: ResolvedSelection }) {
  const rows: Array<[string, string | undefined]> = [
    ["Practice", resolved.identity?.label],
    ["Place", resolved.world?.label],
    ["Movement", resolved.movement?.label],
    ["Mood", resolved.mood?.label],
    ["Material", resolved.material?.label],
  ];
  return (
    <div className="presence-studio-summary">
      <div className="summary-head">Your direction</div>
      {rows.map(([k, v]) => (
        <div key={k} className="summary-row">
          <span className="summary-k">{k}</span>
          <span className="summary-v" data-set={v ? "true" : "false"}>{v ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
