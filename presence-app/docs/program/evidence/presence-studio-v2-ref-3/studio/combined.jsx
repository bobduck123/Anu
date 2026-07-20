const { useState, useRef, useCallback, useEffect, useMemo } = React;

/* Presence Studio — Room Renderer + Social Traces + Floating Tools
   VISUAL ART DIRECTION PASS: traces as spatial marks, premium interactions */

/* ─── Lucide icon helper ─── */
function Lu({ d, size = 14, className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={size} height={size}
      fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}

/* ICONS loaded from data.js */

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




/* Presence Studio — Panels: Skin Lab, World Switcher, Moodboard
   VISUAL ART DIRECTION PASS: atmospheric, magical, spatial */

/* ─── Skin Lab Bottom Sheet ─── */
function SkinLabSheet({ kit, open, onClose, skinOverrides, setSkinOverride }) {
  const controls = window.SKIN_CONTROLS;
  const cats = {
    ground: { label: "Ground", desc: "The floor and walls of the room" },
    atmosphere: { label: "Atmosphere", desc: "Weather, light, energy" },
    type: { label: "Typography", desc: "Voice and weight of words" },
    objects: { label: "Object Shape", desc: "How things are made" },
    action: { label: "Actions", desc: "Portal colour and energy" },
  };
  const grouped = {};
  controls.forEach(c => { (grouped[c.cat] = grouped[c.cat] || []).push(c); });

  return (
    <div className={"imm-sheet" + (open ? " open" : "")} style={{ "--kit-glow": kit.tokens.glow }}>
      <div className="imm-sheet-handle"></div>
      <div className="imm-sheet-head">
        <span className="imm-sheet-title">Room Skin Lab</span>
        <button className="imm-sheet-close" onClick={onClose}>
          <Lu d={ICONS.x} size={14} />
        </button>
      </div>

      {/* Hero intro — atmospheric */}
      <div style={{ marginBottom: 24, padding: "18px 18px", position: "relative", overflow: "hidden",
        background: "rgba(239,233,218,0.02)", borderRadius: 12,
        border: "1px solid rgba(239,233,218,0.03)" }}>
        {/* ambient glow */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 80% 60% at 20% 30%, ${kit.tokens.accent}08, transparent 60%)` }}></div>
        <p style={{ fontFamily: '"Instrument Serif", serif', fontSize: 20, color: "rgba(239,233,218,0.7)",
          lineHeight: 1.25, marginBottom: 5, position: "relative" }}>
          Mix the <em style={{ color: kit.tokens.accent }}>atmosphere</em>.
        </p>
        <p style={{ fontSize: 11, color: "rgba(239,233,218,0.22)", lineHeight: 1.6, position: "relative" }}>
          Shape the room's weather, material, and mood. Every change is live.
        </p>
      </div>

      {/* Control groups */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>
        {Object.entries(grouped).map(([cat, ctrls]) => (
          <div className="skin-section" key={cat}>
            <p className="skin-section-label">{cats[cat]?.label || cat}</p>
            {ctrls.map(ctrl => (
              <SkinControl key={ctrl.id} ctrl={ctrl} kit={kit}
                value={skinOverrides[ctrl.id]}
                onChange={(v) => setSkinOverride(ctrl.id, v)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkinControl({ ctrl, kit, value, onChange }) {
  if (ctrl.type === "slider") {
    const min = ctrl.min || 0, max = ctrl.max || 100, step = ctrl.step || 1;
    const val = value !== undefined ? value : Math.round((min + max) / 2);
    const pct = ((val - min) / (max - min)) * 100;
    return (
      <div className="skin-row">
        <span className="skin-label">{ctrl.label}</span>
        <div className="skin-track" onClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const raw = min + ((e.clientX - r.left) / r.width) * (max - min);
          onChange(Math.round(raw / step) * step);
        }}>
          <div className="skin-fill" style={{ width: pct + "%", background: kit.tokens.accent,
            boxShadow: `0 0 10px -2px ${kit.tokens.accent}` }}></div>
          <div className="skin-thumb" style={{ left: pct + "%" }}></div>
        </div>
        <span className="skin-val">{val}</span>
      </div>
    );
  }

  if (ctrl.type === "choice") {
    const sel = value || ctrl.options[0];
    return (
      <div className="skin-row" style={{ flexWrap: "wrap" }}>
        <span className="skin-label">{ctrl.label}</span>
        <div className="skin-choices">
          {ctrl.options.map(o => (
            <button key={o} className={"skin-choice" + (sel === o ? " active" : "")}
              style={{ "--kit-accent": kit.tokens.accent }} onClick={() => onChange(o)}>{o}</button>
          ))}
        </div>
      </div>
    );
  }

  if (ctrl.type === "swatch") {
    const swatches = ctrl.id === "accent"
      ? [kit.tokens.accent, "#8f6f3f", "#ff6b9d", "#a855f7", "#567d55", "#c4622a", "#8f3a2f", "#2f6df0"]
      : [kit.tokens.bg, kit.tokens.surface, kit.tokens.text, "#0a0a0a", "#f7f3ea", "#e8efe2", "#f2e6d4", "#ffffff"];
    const sel = value || swatches[0];
    return (
      <div className="skin-row">
        <span className="skin-label">{ctrl.label}</span>
        <div className="skin-swatches">
          {swatches.map((s, i) => (
            <button key={ctrl.id + "-" + i} className={"skin-swatch" + (sel === s ? " active" : "")}
              style={{ background: s }} onClick={() => onChange(s)}></button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ─── World Switcher Overlay — cinematic gallery ─── */
function WorldSwitcher({ kits, activeIdx, onSelect, open, onClose }) {
  if (!open) return null;
  return (
    <div className={"imm-worlds-overlay" + (open ? " open" : "")} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: "95%" }}>
        <div style={{ textAlign: "center", marginBottom: 28, padding: "0 32px" }}>
          <p style={{ fontFamily: '"Instrument Serif", serif', fontSize: 26,
            color: "var(--p-on-stage)", lineHeight: 1.15, marginBottom: 6, letterSpacing: "-0.02em" }}>
            Choose a room <em style={{ color: "var(--p-copper)" }}>world</em>
          </p>
          <p style={{ fontSize: 12, color: "var(--p-on-stage-dim)", lineHeight: 1.5, maxWidth: 360,
            margin: "0 auto" }}>
            Each world changes how space behaves — surfaces, density, movement, feeling. Not just colour.
          </p>
        </div>
        <div className="imm-worlds-grid">
          {kits.map((kit, i) => (
            <div key={kit.id}
              className={"imm-world-card" + (i === activeIdx ? " active" : "")}
              style={{
                background: `linear-gradient(180deg,
                  color-mix(in oklab, ${kit.tokens.bg} 10%, rgba(14,13,11,0.92)) 0%,
                  color-mix(in oklab, ${kit.tokens.bg} 5%, rgba(10,9,7,0.96)) 100%)`,
                "--kit-glow": kit.tokens.glow,
              }}
              onClick={() => { onSelect(i); onClose(); }}>
              <div className="wc-name">{kit.name}</div>
              <div className="wc-surface">{kit.surface}</div>
              <div className="wc-feel">{kit.verb}</div>
              <div className="wc-swatch" style={{
                background: `linear-gradient(90deg, ${kit.tokens.bg}, ${kit.tokens.accent}, ${kit.tokens.glow})`,
                boxShadow: `0 0 16px -4px ${kit.tokens.glow}40`,
              }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Moodboard Bottom Sheet — the influence layer ─── */
function MoodboardSheet({ kit, open, onClose }) {
  const refs = [
    { type: "image", label: "Workshop light, late afternoon", dot: "#c9a84c" },
    { type: "room", label: "The Listening Room · Byron", dot: kit.tokens.accent },
    { type: "song", label: "Nils Frahm — Says", dot: "#6366f1" },
    { type: "quote", label: "\"I paint what remains after memory has finished.\"", dot: "#8f6f3f" },
    { type: "material", label: "Linen, raw cotton, pigment", dot: "#a0856c" },
    { type: "place", label: "Bangalow, Northern Rivers NSW", dot: "#567d55" },
  ];

  return (
    <div className={"imm-sheet" + (open ? " open" : "")} style={{ "--kit-glow": kit.tokens.glow }}>
      <div className="imm-sheet-handle"></div>
      <div className="imm-sheet-head">
        <span className="imm-sheet-title">Moodboard · Influences</span>
        <button className="imm-sheet-close" onClick={onClose}>
          <Lu d={ICONS.x} size={14} />
        </button>
      </div>

      {/* Hero intro */}
      <div style={{ marginBottom: 20, padding: "18px 18px", position: "relative", overflow: "hidden",
        background: "rgba(239,233,218,0.02)", borderRadius: 12,
        border: "1px solid rgba(239,233,218,0.03)" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse 80% 60% at 80% 30%, ${kit.tokens.accent}06, transparent 60%)` }}></div>
        <p style={{ fontFamily: '"Instrument Serif", serif', fontSize: 20, color: "rgba(239,233,218,0.7)",
          lineHeight: 1.25, marginBottom: 5, position: "relative" }}>
          What <em style={{ color: kit.tokens.accent }}>shaped</em> this room?
        </p>
        <p style={{ fontSize: 11, color: "rgba(239,233,218,0.22)", lineHeight: 1.6, position: "relative" }}>
          Add references — images, songs, places, quotes, other Rooms. Visitors discover these in your influence layer.
        </p>
      </div>

      <p className="skin-section-label">Add Reference</p>
      <div className="mood-grid">
        {window.MOODBOARD_TYPES.map(m => (
          <div className="mood-item" key={m.id}>
            <Lu d={ICONS[m.icon] || ICONS.star} size={18} />
            <p className="mood-item-label">{m.label}</p>
          </div>
        ))}
      </div>

      <p className="skin-section-label" style={{ marginTop: 8 }}>Current References</p>
      <div className="mood-refs">
        {refs.map((r, i) => (
          <div className="mood-ref" key={i}>
            <span className="mood-ref-dot" style={{ background: r.dot,
              boxShadow: `0 0 12px -3px ${r.dot}60` }}></span>
            <div>
              <p className="mood-ref-text">{r.label}</p>
              <p className="mood-ref-type">{r.type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




/* Presence Studio V2 — Main App
   Immersive cockpit: room IS the workspace. Chrome is floating + minimal.
   Features: kit switching, mode toggle, live skin lab, direct object editing,
   wild mode drag, social traces, moodboard. */

/* ─── Top Status Bar ─── */
function TopBar({ kit, status, panel, setPanel }) {
  return (
    <nav className="imm-topbar">
      <div className="imm-brand">
        <span className="imm-brand-glyph">P</span>
        <span className="imm-brand-name">Studio</span>
      </div>
      <div className="imm-sep"></div>
      <span className={"imm-status " + status}>
        <span className="dot"></span>
        {status === "draft" ? "Private draft" : "Live"}
      </span>
      <div className="imm-sep"></div>
      <span className="imm-room-name">{kit.persona.name}</span>

      <div className="imm-topbar-right">
        <button className={"imm-btn" + (panel === "mood" ? " active" : "")}
          onClick={() => setPanel(panel === "mood" ? null : "mood")}>
          <Lu d={ICONS.image} size={13} />
          <span>Moodboard</span>
        </button>
        <div className="imm-sep"></div>
        <button className="imm-btn" style={{ opacity: 0.5 }}>
          <Lu d={ICONS.eye} size={13} />
          <span>Preview</span>
        </button>
        <button className="imm-btn-publish">Publish</button>
      </div>
    </nav>
  );
}

/* ─── Floating Command Dock ─── */
function CommandDock({ mode, setMode, viewport, setViewport, panel, setPanel, kit }) {
  return (
    <div className="imm-dock" style={{ "--kit-glow": kit.tokens.glow }}>
      {/* Mode toggle */}
      <div className="imm-mode">
        <button className={"imm-mode-btn" + (mode === "guided" ? " active" : "")}
          onClick={() => setMode("guided")}>Guided</button>
        <button className={"imm-mode-btn wild" + (mode === "wild" ? " active" : "")}
          onClick={() => setMode("wild")}>Wild</button>
      </div>

      <div className="imm-dock-sep"></div>

      {/* Viewport switches */}
      <div className="imm-vp">
        <button className={"imm-vp-btn" + (viewport === "immersive" ? " active" : "")}
          onClick={() => setViewport("immersive")} title="Immersive">
          <Lu d={ICONS.maximize} size={14} />
        </button>
        <button className={"imm-vp-btn" + (viewport === "mobile" ? " active" : "")}
          onClick={() => setViewport("mobile")} title="Mobile preview">
          <Lu d={ICONS.phone} size={14} />
        </button>
        <button className={"imm-vp-btn" + (viewport === "desktop" ? " active" : "")}
          onClick={() => setViewport("desktop")} title="Desktop preview">
          <Lu d={ICONS.monitor} size={14} />
        </button>
      </div>

      <div className="imm-dock-sep"></div>

      {/* Tools */}
      <button className={"imm-dock-btn" + (panel === "skin" ? " active" : "")}
        onClick={() => setPanel(panel === "skin" ? null : "skin")}>
        <Lu d={ICONS.sliders} size={14} />
        Skin Lab
      </button>

      <button className={"imm-dock-btn" + (panel === "worlds" ? " active" : "")}
        onClick={() => setPanel(panel === "worlds" ? null : "worlds")}>
        <Lu d={ICONS.globe} size={14} />
        Worlds
      </button>

      <button className="imm-dock-btn" onClick={() => {}}>
        <Lu d={ICONS.plus} size={14} />
        Add
      </button>
    </div>
  );
}

/* ─── Mode Badge ─── */
function ModeBadge({ mode, kit }) {
  if (mode === "guided") {
    return (
      <div className="imm-mode-badge" style={{ color: "var(--p-moss)" }}>
        <Lu d={ICONS.shield} size={12} />
        Guided · layout and mobile view kept safe
      </div>
    );
  }
  return (
    <div className="imm-mode-badge" style={{ color: kit.tokens.accent }}>
      <Lu d={ICONS.wand} size={12} />
      Wild Mode · freeform canvas
    </div>
  );
}

/* ─── Mobile Recovery Dialog ─── */
function MobileRecovery({ kit, visible, onClose }) {
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center",
      justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0e0d0b", borderRadius: 14, padding: 28, maxWidth: 400, width: "90%",
        border: "1px solid rgba(239,233,218,0.06)", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.6)"
      }}>
        <p style={{ fontFamily: 'var(--p-f-mono)', fontSize: 9, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(239,233,218,0.25)", marginBottom: 12 }}>Safe Mobile Recovery</p>
        <p style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, color: "#efe9da",
          lineHeight: 1.25, marginBottom: 8 }}>
          Your wild layout will be simplified for mobile.
        </p>
        <p style={{ fontSize: 13, color: "rgba(239,233,218,0.4)", lineHeight: 1.55, marginBottom: 20 }}>
          Objects stack vertically in chamber order. Rotations, overlaps, and freeform positions are removed.
          The CTA dock stays reachable. Your desktop layout is preserved.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 16px", border: "none", borderRadius: 6,
            background: "rgba(239,233,218,0.06)", color: "#efe9da", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: '"Inter", sans-serif' }}>Keep wild layout</button>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 16px", border: "none", borderRadius: 6,
            background: "#efe9da", color: "#0e0d0b", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: '"Inter", sans-serif' }}>Apply safe recovery</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Wild Mode Drag Handler ─── */
function useWildDrag(mode, objectTransforms, setObjectTransforms) {
  const dragging = useRef(null);

  const onDragStart = useCallback((objId, e) => {
    if (mode !== "wild") return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX || (e.touches && e.touches[0].clientX);
    const startY = e.clientY || (e.touches && e.touches[0].clientY);
    const tf = objectTransforms[objId] || { x: 0, y: 0, r: 0, s: 1, z: 10 };
    dragging.current = { objId, startX, startY, origX: tf.x || 0, origY: tf.y || 0 };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const cx = ev.clientX || (ev.touches && ev.touches[0].clientX);
      const cy = ev.clientY || (ev.touches && ev.touches[0].clientY);
      const dx = cx - dragging.current.startX;
      const dy = cy - dragging.current.startY;
      setObjectTransforms(prev => ({
        ...prev,
        [dragging.current.objId]: {
          ...(prev[dragging.current.objId] || {}),
          x: dragging.current.origX + dx,
          y: dragging.current.origY + dy,
          z: 20,
        }
      }));
    };

    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }, [mode, objectTransforms, setObjectTransforms]);

  return onDragStart;
}

/* ═══ MAIN APP ═══ */
function StudioApp() {
  const kits = window.STUDIO_KITS;
  const [kitIdx, setKitIdx] = useState(0);
  const [mode, setMode] = useState("guided");
  const [viewport, setViewport] = useState("immersive");
  const [panel, setPanel] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRect, setSelectedRect] = useState(null);
  const [status] = useState("draft");
  const [showRecovery, setShowRecovery] = useState(false);
  const [skinOverrides, setSkinOverrides] = useState({});
  const [objectTransforms, setObjectTransforms] = useState({});
  const [showTraces, setShowTraces] = useState(true);
  const stageRef = useRef(null);

  const kit = kits[kitIdx];

  /* Tweaks integration */
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{ "showTraces": true, "skinTexture": "none" }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  useEffect(() => { setShowTraces(tweaks.showTraces); }, [tweaks.showTraces]);
  useEffect(() => {
    if (tweaks.skinTexture && tweaks.skinTexture !== "none") {
      setSkinOverrides(prev => ({ ...prev, texture: tweaks.skinTexture }));
    }
  }, [tweaks.skinTexture]);

  /* Reset on kit switch */
  useEffect(() => {
    setSelectedId(null); setSelectedRect(null);
    setSkinOverrides({}); setObjectTransforms({});
  }, [kitIdx]);

  /* Wild mode on mobile → recovery dialog */
  useEffect(() => {
    if (mode === "wild" && viewport === "mobile") setShowRecovery(true);
  }, [mode, viewport]);

  /* Clear selection on mode change */
  useEffect(() => { setSelectedId(null); setSelectedRect(null); }, [mode]);

  const handleSelect = useCallback((id, el) => {
    if (selectedId === id) { setSelectedId(null); setSelectedRect(null); return; }
    setSelectedId(id);
    if (el) setSelectedRect(el.getBoundingClientRect());
  }, [selectedId]);

  const handleDeselect = useCallback(() => {
    setSelectedId(null); setSelectedRect(null);
  }, []);

  const handleFloatAction = useCallback((action) => {
    if (action === "delete") {
      /* visual feedback only in prototype */
      setSelectedId(null); setSelectedRect(null);
    }
  }, []);

  const setSkinOverride = useCallback((key, val) => {
    setSkinOverrides(prev => ({ ...prev, [key]: val }));
  }, []);

  /* Wild drag */
  const onDragStart = useWildDrag(mode, objectTransforms, setObjectTransforms);

  /* Override onSelect for wild mode to also start drag */
  const handleObjClick = useCallback((id, el) => {
    handleSelect(id, el);
  }, [handleSelect]);

  /* Room render props */
  const roomProps = {
    kit, selectedId, onSelect: handleObjClick, mode, skinOverrides,
    showTraces, objectTransforms,
  };

  /* Aurora colours from kit */
  const auroraColors = [kit.tokens.glow, kit.tokens.accent, kit.tokens.glow];

  return (
    <>
      {/* Aurora — always visible, tinted by kit */}
      <div className="imm-aurora" style={{ opacity: viewport === "immersive" ? 0.08 : 0.18 }}>
        {auroraColors.map((c, i) => <div className="blob" key={i} style={{ background: c }}></div>)}
      </div>

      {/* ─── VIEWPORT MODES ─── */}
      {viewport === "immersive" && (
        <div className="imm-stage" ref={stageRef} style={{ "--kit-glow": kit.tokens.glow }}
          onClick={handleDeselect}
          onMouseDown={(e) => {
            if (mode === "wild" && selectedId && e.target.closest(".room-obj.selected")) {
              onDragStart(selectedId, e);
            }
          }}>
          <div className="room-scroll">
            <div style={{ paddingTop: 44, paddingBottom: 80 }}>
              <RoomRenderer {...roomProps} />
            </div>
          </div>
        </div>
      )}

      {viewport === "mobile" && (
        <div className="imm-phone-wrap" onClick={handleDeselect}>
          <div className="imm-phone" onClick={e => e.stopPropagation()}
            onMouseDown={(e) => {
              if (mode === "wild" && selectedId && e.target.closest(".room-obj.selected")) {
                onDragStart(selectedId, e);
              }
            }}>
            <div className="room-scroll" style={{ paddingTop: 28 }}>
              <RoomRenderer {...roomProps} />
            </div>
          </div>
        </div>
      )}

      {viewport === "desktop" && (
        <div className="imm-desktop-wrap" onClick={handleDeselect}>
          <div className="imm-desktop" onClick={e => e.stopPropagation()}
            onMouseDown={(e) => {
              if (mode === "wild" && selectedId && e.target.closest(".room-obj.selected")) {
                onDragStart(selectedId, e);
              }
            }}>
            <div className="room-scroll">
              <RoomRenderer {...roomProps} />
            </div>
          </div>
        </div>
      )}

      {/* ─── FLOATING TOOLS ─── */}
      {selectedId && selectedRect && (
        <FloatingTools rect={selectedRect} mode={mode} onAction={handleFloatAction} />
      )}

      {/* ─── MODE BADGE ─── */}
      <ModeBadge mode={mode} kit={kit} />

      {/* ─── TOP BAR ─── */}
      <TopBar kit={kit} status={status} panel={panel} setPanel={setPanel} />

      {/* ─── COMMAND DOCK ─── */}
      <CommandDock mode={mode} setMode={setMode} viewport={viewport} setViewport={setViewport}
        panel={panel} setPanel={setPanel} kit={kit} />

      {/* ─── PANELS ─── */}
      <SkinLabSheet kit={kit} open={panel === "skin"} onClose={() => setPanel(null)}
        skinOverrides={skinOverrides} setSkinOverride={setSkinOverride} />
      <MoodboardSheet kit={kit} open={panel === "mood"} onClose={() => setPanel(null)} />
      <WorldSwitcher kits={kits} activeIdx={kitIdx} onSelect={setKitIdx}
        open={panel === "worlds"} onClose={() => setPanel(null)} />

      {/* ─── MOBILE RECOVERY ─── */}
      <MobileRecovery kit={kit} visible={showRecovery} onClose={() => setShowRecovery(false)} />

      {/* ─── TWEAKS PANEL ─── */}
      <TweaksPanel>
        <TweakSection label="Social" />
        <TweakToggle label="Social traces" value={tweaks.showTraces}
          onChange={(v) => setTweak("showTraces", v)} />
        <TweakSection label="Skin Lab" />
        <TweakRadio label="Texture" value={tweaks.skinTexture}
          options={["none", "grain", "paper", "concrete", "cloth"]}
          onChange={(v) => setTweak("skinTexture", v)} />
      </TweaksPanel>
    </>
  );
}

/* Mount */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StudioApp />);
