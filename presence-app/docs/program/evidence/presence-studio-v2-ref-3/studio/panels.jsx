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

/* Expose */
Object.assign(window, { SkinLabSheet, WorldSwitcher, MoodboardSheet });
