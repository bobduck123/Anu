/* Presence Studio — Room Renderer + Social Traces + Floating Tools
   VISUAL ART DIRECTION PASS: traces as spatial marks, premium interactions */
const { useState, useRef, useCallback, useMemo, useEffect } = React;

/* ─── Lucide icon helper ─── */
function Lu({ d, size = 14, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}

const ICONS = {
  move: "M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20",
  copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  rotateCw: "M21 2v6h-6M21 13a9 9 0 1 1-3-7.7L21 8",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  pin: "M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 2-2V3H6v1a2 2 0 0 0 2 2 1 1 0 0 1 1 1v3.76z",
  group: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2",
  resize: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
  x: "M18 6L6 18M6 6l12 12",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
  footprints: [<path key="a" d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5 10 7.89 8 10 8 12h-.5" />,<path key="b" d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 2.39 2 4.51 2 6.51H15.5" />,<path key="c" d="M6 18h1M18 22h1" />],
  book: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20",
  doorOpen: [<path key="a" d="M13 4h3a2 2 0 0 1 2 2v14" />,<path key="b" d="M2 20h3" />,<path key="c" d="M13 20h7" />,<path key="d" d="M10 12v.01" />,<path key="e" d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561z" />],
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  sparkle: "M12 3v1m0 16v1m-8-9H3m18 0h-1M5.6 5.6l.7.7m12.1 12.1l.7.7M5.6 18.4l.7-.7m12.1-12.1l.7-.7",
  image: "M21 15l-5-5L5 21M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5",
  music: "M9 18V5l12-2v13",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z",
  quote: "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z",
  palette: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
  plus: "M12 5v14M5 12h14",
  phone: [<rect key="a" x="5" y="2" width="14" height="20" rx="2" ry="2" />,<line key="b" x1="12" y1="18" x2="12" y2="18" />],
  monitor: [<rect key="a" x="2" y="3" width="20" height="14" rx="2" ry="2" />,<line key="b" x1="8" y1="21" x2="16" y2="21" />,<line key="c" x1="12" y1="17" x2="12" y2="21" />],
  maximize: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  globe: [<circle key="a" cx="12" cy="12" r="10" />,<path key="b" d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />,<path key="c" d="M2 12h20" />],
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  layout: "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM3 9h18M9 21V9",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  arrowUp: "M12 19V5M5 12l7-7 7 7",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  wand: "M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM3 21l9-9",
  radio: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
};

/* ─── Floating toolbar for selected object ─── */
function FloatingTools({ rect, mode, onAction }) {
  if (!rect) return null;
  const style = {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - 52,
    transform: "translateX(-50%)",
    zIndex: 100,
  };

  const tools = [
    { id: "edit", icon: ICONS.edit, tip: "Edit content" },
    { id: "move", icon: ICONS.move, tip: "Move" },
    { id: "copy", icon: ICONS.copy, tip: "Duplicate" },
    { id: "hide", icon: ICONS.eyeOff, tip: "Hide on mobile" },
  ];
  if (mode === "wild") {
    tools.push(
      { id: "sep1" },
      { id: "resize", icon: ICONS.resize, tip: "Resize" },
      { id: "rotate", icon: ICONS.rotateCw, tip: "Rotate" },
      { id: "layer", icon: ICONS.layers, tip: "Layer" },
      { id: "pin", icon: ICONS.pin, tip: "Pin" },
      { id: "lock", icon: ICONS.lock, tip: "Lock" },
      { id: "group", icon: ICONS.group, tip: "Group" },
    );
  }
  tools.push({ id: "sep2" }, { id: "delete", icon: ICONS.trash, tip: "Delete", danger: true });

  return (
    <div className="imm-float" style={style}>
      {tools.map((t, i) => t.id.startsWith("sep") ? (
        <div className="imm-float-sep" key={i}></div>
      ) : (
        <button className={"imm-float-btn" + (t.danger ? " danger" : "")} key={t.id}
          title={t.tip} onClick={(e) => { e.stopPropagation(); onAction(t.id); }}>
          <Lu d={t.icon} size={14} />
        </button>
      ))}
    </div>
  );
}

/* ─── Wild mode resize/rotate handles ─── */
function WildHandles({ visible, kitGlow }) {
  if (!visible) return null;
  return (
    <>
      <span className="wild-handle tl" style={{"--kit-glow": kitGlow}}></span>
      <span className="wild-handle tr" style={{"--kit-glow": kitGlow}}></span>
      <span className="wild-handle bl" style={{"--kit-glow": kitGlow}}></span>
      <span className="wild-handle br" style={{"--kit-glow": kitGlow}}></span>
      <span className="wild-rotate" style={{"--kit-glow": kitGlow}}>
        <Lu d={ICONS.rotateCw} size={11} />
      </span>
    </>
  );
}

/* ─── Social Traces — spatial marks, not metrics ─── */
function SocialTraces({ kit, showTraces }) {
  if (!showTraces) return null;
  const t = kit.traces || {};
  const tc = kit.tokens.text;
  const accent = kit.tokens.accent;
  const isDark = kit.tokens.bg.startsWith("#0") || kit.tokens.bg.startsWith("rgba");
  const dotShadow = isDark ? `0 0 8px -1px ${accent}` : `0 0 6px -1px ${accent}60`;

  return (
    <div style={{ marginTop: 12, paddingBottom: 8 }}>
      {/* Trace strip — subtle room evidence */}
      <div className="trace-strip" style={{ color: tc }}>
        <span className="t-item">
          <Lu d={ICONS.footprints} size={12} />
          <span>{t.entries || 0} entered</span>
        </span>
        <span className="t-item">
          <Lu d={ICONS.star} size={12} />
          <span>{t.seeds || 0} seeds</span>
        </span>
        <span className="t-item">
          <Lu d={ICONS.book} size={12} />
          <span>{t.guestbook || 0} signed</span>
        </span>
      </div>

      {/* Guestbook — a physical social object in the room */}
      {(t.guestbook || 0) > 0 && (
        <div className="trace-guestbook" style={{ color: tc,
          margin: "8px 18px", padding: "16px 18px",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        }}>
          <p className="gb-title" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Lu d={ICONS.book} size={10} />
            Guestbook
          </p>
          <div className="trace-gb-entry">
            <span className="gb-dot" style={{ background: accent, boxShadow: dotShadow }}></span>
            <span className="gb-text">"This space moved me. Coming back."</span>
          </div>
          <div className="trace-gb-entry">
            <span className="gb-dot" style={{ background: accent, opacity: 0.4, boxShadow: dotShadow }}></span>
            <span className="gb-text">"Found exactly what I needed."</span>
          </div>
        </div>
      )}

      {/* Portal — a doorway to another room */}
      <div className="trace-portal" style={{ color: tc, "--kit-glow": accent }}>
        <span className="trace-portal-icon" style={{ background: accent + "15", color: accent }}>
          <Lu d={ICONS.doorOpen} size={13} />
        </span>
        <span>
          <span className="trace-portal-text">Portal → </span>
          <span className="trace-portal-name">The Listening Room</span>
        </span>
      </div>

      {/* Event beacon */}
      <div style={{ margin: "8px 18px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
        borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
        background: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent,
          boxShadow: dotShadow, animation: "dot-glow 2s ease-in-out infinite", flexShrink: 0 }}></span>
        <span style={{ fontFamily: "var(--p-f-mono)", fontSize: 9, letterSpacing: "0.1em",
          textTransform: "uppercase", opacity: 0.25 }}>
          Event beacon · active
        </span>
      </div>
    </div>
  );
}

/* ─── Main Room Renderer ─── */
function RoomRenderer({ kit, selectedId, onSelect, mode, skinOverrides, showTraces, objectTransforms }) {
  const worldClass = `room-world-${kit.id}`;
  const texture = skinOverrides.texture || "none";
  const textureClass = texture !== "none" ? `room-texture-${texture}` : "";

  /* Compute inline skin overrides */
  const skinStyle = {};
  if (skinOverrides.bg) skinStyle.background = skinOverrides.bg;
  if (skinOverrides.displayFont) skinStyle.fontFamily = `"${skinOverrides.displayFont}", serif`;
  if (skinOverrides.objectRadius !== undefined) skinStyle["--skin-radius"] = skinOverrides.objectRadius + "px";
  if (skinOverrides.accent) skinStyle["--skin-accent"] = skinOverrides.accent;

  return (
    <div className={`room-inner ${worldClass} ${textureClass}`} style={skinStyle}>
      {/* Room header */}
      <div className="room-header">
        <div className="rh-eyebrow">{kit.surface}</div>
        <div className="rh-name" style={skinOverrides.headingWeight ? { fontWeight: skinOverrides.headingWeight } : undefined}>
          {kit.persona.name}
        </div>
        <div className="rh-tagline">{kit.persona.tagline}</div>
      </div>

      {/* Chambers */}
      {kit.chambers.map(chamber => (
        <div className="room-chamber" key={chamber.id}>
          <div className="room-chamber-label">{chamber.label}</div>
          <div className="room-objects">
            {chamber.objects.map(obj => {
              const isSelected = selectedId === obj.id;
              const tf = objectTransforms[obj.id];
              const objStyle = { "--kit-glow": kit.tokens.glow };
              if (tf && mode === "wild") {
                objStyle.transform = `translate(${tf.x||0}px, ${tf.y||0}px) rotate(${tf.r||0}deg)`;
                if (tf.s) objStyle.transform += ` scale(${tf.s})`;
                objStyle.zIndex = tf.z || "auto";
              }
              if (skinOverrides.objectRadius !== undefined) {
                objStyle.borderRadius = skinOverrides.objectRadius + "px";
              }

              return (
                <div
                  key={obj.id}
                  className={`room-obj${isSelected ? " selected" : ""}`}
                  data-role={obj.role}
                  style={objStyle}
                  onClick={(e) => { e.stopPropagation(); onSelect(obj.id, e.currentTarget); }}
                >
                  {obj.img && (
                    <img className="obj-image" src={obj.img} alt={obj.title} loading="lazy"
                      draggable={false} />
                  )}
                  <div className="obj-title">{obj.title}</div>
                  <div className="obj-meta">{obj.meta}</div>
                  {obj.detail && <div className="obj-detail">{obj.detail}</div>}
                  {isSelected && mode === "wild" && <WildHandles visible={true} kitGlow={kit.tokens.glow} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Social traces */}
      <SocialTraces kit={kit} showTraces={showTraces} />

      {/* Mobile CTA dock */}
      <div className="mobile-cta-dock" style={{
        background: `color-mix(in oklab, ${kit.tokens.bg} 88%, transparent)`,
        borderColor: kit.tokens.text + "08",
      }}>
        <button className="dock-btn dock-primary" style={{
          background: skinOverrides.accent || kit.tokens.accent,
          color: kit.tokens.bg,
          borderRadius: (skinOverrides.objectRadius !== undefined ? skinOverrides.objectRadius : kit.tokens.radius) + "px",
          boxShadow: `0 4px 16px -6px ${skinOverrides.accent || kit.tokens.accent}50`,
        }}>{kit.cta.text}</button>
      </div>
    </div>
  );
}

/* Expose */
Object.assign(window, { Lu, ICONS, FloatingTools, WildHandles, SocialTraces, RoomRenderer });
