/* Presence Studio V2 — Main App
   Immersive cockpit: room IS the workspace. Chrome is floating + minimal.
   Features: kit switching, mode toggle, live skin lab, direct object editing,
   wild mode drag, social traces, moodboard. */
const { useState, useRef, useCallback, useEffect, useMemo } = React;

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
  const [tweaks, setTweak] = typeof useTweaks !== "undefined" ? useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];
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
