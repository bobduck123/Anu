"use client";

import { useState, useEffect } from "react";
import type { StudioV2State, StudioV2Skin, StudioV2MoodboardReference, StudioV2Object, StudioV2WorldId } from "@/lib/presence/studio-v2";
import { WORLD_KITS, SKIN_CONTROLS, MOODBOARD_TYPES, ADD_OBJECT_TYPES } from "./worlds";

function makePanelId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ─── Skin Lab ─── */

interface SkinLabSheetProps {
  skin: StudioV2Skin;
  open: boolean;
  onClose: () => void;
  onChange: (skin: StudioV2Skin) => void;
}

export function SkinLabSheet({ skin, open, onClose, onChange }: SkinLabSheetProps) {
  if (!open) return null;

  const grouped = SKIN_CONTROLS.reduce<Record<string, typeof SKIN_CONTROLS>>((acc, c) => {
    (acc[c.cat] = acc[c.cat] || []).push(c);
    return acc;
  }, {});

  function patch(patch: Partial<StudioV2Skin>) {
    onChange({ ...skin, ...patch });
  }

  const swatchAccent = [skin.accentColor, "#8f6f3f", "#ff6b9d", "#a855f7", "#567d55", "#c4622a", "#8f3a2f", "#2f6df0"];
  const swatchBg = [skin.background, "#f7f3ea", "#0a0a0a", "#e8efe2", "#f2e6d4", "#efe8dc", "#f2eadf", "#ffffff"];

  // Map control id to current skin value
  const getSkinValue = (id: string): number | string => {
    const s = skin as unknown as Record<string, number | string>;
    return s[id];
  };

  return (
    <div className="v2-side-panel">
      <div className="v2-panel-head">
        <span className="v2-panel-title">Room Skin Lab</span>
        <button className="v2-btn" onClick={onClose}>✕</button>
      </div>
      <div className="v2-panel-body">
        {Object.entries(grouped).map(([cat, ctrls]) => (
          <div className="v2-skin-section" key={cat}>
            <div className="v2-skin-section-label">{cat}</div>
            {ctrls.map((ctrl) => {
              if (ctrl.type === "slider") {
                const val = Number(getSkinValue(ctrl.id) ?? ((ctrl.min + ctrl.max) / 2));
                return (
                  <div className="v2-skin-row" key={ctrl.id}>
                    <span className="v2-skin-label">{ctrl.label}</span>
                    <input
                      className="v2-skin-slider"
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step ?? 1}
                      value={val}
                      onChange={(e) => patch({ [ctrl.id]: Number(e.target.value) } as Partial<StudioV2Skin>)}
                    />
                    <span style={{ fontSize: 12, width: 32, textAlign: "right" }}>{val}</span>
                  </div>
                );
              }
              if (ctrl.type === "choice") {
                const val = String(getSkinValue(ctrl.id) ?? ctrl.options[0]);
                return (
                  <div className="v2-skin-row" key={ctrl.id}>
                    <span className="v2-skin-label">{ctrl.label}</span>
                    <div className="v2-skin-choices">
                      {ctrl.options.map((o) => (
                        <button
                          key={o}
                          className={`v2-skin-choice${val === o ? " active" : ""}`}
                          onClick={() => patch({ [ctrl.id]: o } as Partial<StudioV2Skin>)}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              if (ctrl.type === "swatch") {
                const val = ctrl.id === "accentColor" ? skin.accentColor : skin.background;
                const swatches = ctrl.id === "accentColor" ? swatchAccent : swatchBg;
                return (
                  <div className="v2-skin-row" key={ctrl.id}>
                    <span className="v2-skin-label">{ctrl.label}</span>
                    <div className="v2-skin-swatches">
                      {swatches.map((s, i) => (
                        <button
                          key={i}
                          className={`v2-skin-swatch${val === s ? " active" : ""}`}
                          style={{ background: s }}
                          onClick={() => patch({ [ctrl.id]: s } as Partial<StudioV2Skin>)}
                          aria-label={`${ctrl.label} ${s}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Object Editor ─── */

interface ObjectEditorSheetProps {
  object: StudioV2Object | null;
  open: boolean;
  onClose: () => void;
  onChange: (obj: StudioV2Object) => void;
}

export function ObjectEditorSheet({ object, open, onClose, onChange }: ObjectEditorSheetProps) {
  if (!open || !object) return null;

  const update = (patch: Partial<StudioV2Object>) => {
    onChange({ ...object, ...patch });
  };

  return (
    <div className="v2-side-panel">
      <div className="v2-panel-head">
        <span className="v2-panel-title">Object Tuning</span>
        <button className="v2-btn" onClick={onClose}>✕</button>
      </div>
      <div className="v2-panel-body">
        {object.locked && (
          <div className="v2-badge error" style={{ marginBottom: 12 }}>
            This object is locked.
            <button className="v2-btn" onClick={() => update({ locked: false })}>Unlock</button>
          </div>
        )}
        <div className="v2-field">
          <label>Title</label>
          <input value={object.title} onChange={(e) => update({ title: e.target.value })} />
        </div>
        <div className="v2-field">
          <label>Type</label>
          <select value={object.type} onChange={(e) => update({ type: e.target.value as StudioV2Object["type"] })}>
            {["text","note","image","link","portal","cta","testimonial","proof","event","service","shop","media","credential","moodboard"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="v2-field">
          <label>Meta / subtitle</label>
          <input value={object.meta || ""} onChange={(e) => update({ meta: e.target.value })} />
        </div>
        <div className="v2-field">
          <label>Detail</label>
          <textarea value={object.detail || ""} onChange={(e) => update({ detail: e.target.value })} />
        </div>
        <div className="v2-field">
          <label>Link / portal target</label>
          <input value={object.link || ""} onChange={(e) => update({ link: e.target.value })} />
        </div>
        <div className="v2-field">
          <label>Image URL</label>
          <input
            value={object.image?.src || ""}
            onChange={(e) => update({ image: e.target.value ? { src: e.target.value, alt: object.title } : undefined })}
          />
        </div>
        <label className="v2-check-row">
          <input type="checkbox" checked={object.visibility.public} onChange={(e) => update({ visibility: { ...object.visibility, public: e.target.checked } })} />
          <span>Visible in public preview</span>
        </label>
        <label className="v2-check-row">
          <input type="checkbox" checked={object.visibility.mobile} onChange={(e) => update({ visibility: { ...object.visibility, mobile: e.target.checked } })} />
          <span>Visible on mobile</span>
        </label>
        <div className="v2-field">
          <label>Transform</label>
          <div className="v2-transform-controls">
            <button onClick={() => update({ transform: { ...object.transform, x: object.transform.x - 10 } })}>← X</button>
            <button onClick={() => update({ transform: { ...object.transform, x: object.transform.x + 10 } })}>X →</button>
            <button onClick={() => update({ transform: { ...object.transform, y: object.transform.y - 10 } })}>↑ Y</button>
            <button onClick={() => update({ transform: { ...object.transform, y: object.transform.y + 10 } })}>Y ↓</button>
            <button onClick={() => update({ transform: { ...object.transform, rotation: object.transform.rotation - 5 } })}>↺ Rot</button>
            <button onClick={() => update({ transform: { ...object.transform, rotation: object.transform.rotation + 5 } })}>Rot ↻</button>
            <button onClick={() => update({ transform: { ...object.transform, scale: Math.max(0.2, object.transform.scale - 0.1) } })}>− S</button>
            <button onClick={() => update({ transform: { ...object.transform, scale: Math.min(4, object.transform.scale + 0.1) } })}>S +</button>
            <button onClick={() => update({ transform: { ...object.transform, zIndex: Math.max(0, object.transform.zIndex - 1) } })}>↓ Z</button>
            <button onClick={() => update({ transform: { ...object.transform, zIndex: Math.min(999, object.transform.zIndex + 1) } })}>Z ↑</button>
            <button onClick={() => update({ transform: { x: 0, y: 0, scale: 1, rotation: 0, zIndex: object.transform.zIndex } })}>Reset</button>
          </div>
        </div>
        <label className="v2-check-row">
          <input type="checkbox" checked={object.locked} onChange={(e) => update({ locked: e.target.checked })} />
          <span>Locked</span>
        </label>
        <label className="v2-check-row">
          <input type="checkbox" checked={object.pinned} onChange={(e) => update({ pinned: e.target.checked })} />
          <span>Pinned</span>
        </label>
      </div>
    </div>
  );
}

/* ─── Add Object ─── */

interface AddObjectSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (obj: Partial<StudioV2Object>) => void;
}

export function AddObjectSheet({ open, onClose, onAdd }: AddObjectSheetProps) {
  const [draft, setDraft] = useState({ type: "text" as StudioV2Object["type"], title: "", meta: "", detail: "", link: "" });

  useEffect(() => {
    if (open) setDraft({ type: "text", title: "", meta: "", detail: "", link: "" });
  }, [open]);

  if (!open) return null;

  const selectedType = ADD_OBJECT_TYPES.find((t) => t.type === draft.type) || ADD_OBJECT_TYPES[0];

  return (
    <div className="v2-side-panel">
      <div className="v2-panel-head">
        <span className="v2-panel-title">Add Object</span>
        <button className="v2-btn" onClick={onClose}>✕</button>
      </div>
      <div className="v2-panel-body">
        <div className="v2-add-type-grid">
          {ADD_OBJECT_TYPES.map((t) => (
            <button
              key={t.id}
              className={draft.type === t.type ? "active" : ""}
              onClick={() => setDraft((prev) => ({ ...prev, type: t.type }))}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="v2-field">
          <label>Title</label>
          <input value={draft.title} placeholder={selectedType.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="v2-field">
          <label>Meta</label>
          <input value={draft.meta} placeholder={selectedType.meta} onChange={(e) => setDraft((p) => ({ ...p, meta: e.target.value }))} />
        </div>
        <div className="v2-field">
          <label>Detail</label>
          <textarea value={draft.detail} onChange={(e) => setDraft((p) => ({ ...p, detail: e.target.value }))} />
        </div>
        <div className="v2-field">
          <label>Link</label>
          <input value={draft.link} placeholder="Optional URL" onChange={(e) => setDraft((p) => ({ ...p, link: e.target.value }))} />
        </div>
        <button
          className="v2-btn primary"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => {
            onAdd(draft);
            onClose();
          }}
        >
          Add object
        </button>
      </div>
    </div>
  );
}

/* ─── Moodboard ─── */

interface MoodboardSheetProps {
  open: boolean;
  onClose: () => void;
  refs: StudioV2MoodboardReference[];
  accent: string;
  onAdd: (ref: StudioV2MoodboardReference) => void;
  onRemove: (id: string) => void;
}

export function MoodboardSheet({ open, onClose, refs, accent, onAdd, onRemove }: MoodboardSheetProps) {
  const [draft, setDraft] = useState({ type: "image", label: "", url: "", detail: "" });

  useEffect(() => {
    if (open) setDraft({ type: "image", label: "", url: "", detail: "" });
  }, [open]);

  if (!open) return null;

  const canAdd = draft.label.trim().length > 0;

  return (
    <div className="v2-side-panel">
      <div className="v2-panel-head">
        <span className="v2-panel-title">Moodboard / Influences</span>
        <button className="v2-btn" onClick={onClose}>✕</button>
      </div>
      <div className="v2-panel-body">
        <div className="v2-mood-grid">
          {MOODBOARD_TYPES.map((m) => (
            <button
              key={m.id}
              className={`v2-mood-item${draft.type === m.id ? " active" : ""}`}
              onClick={() => setDraft((p) => ({ ...p, type: m.id }))}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="v2-field">
          <label>Title</label>
          <input value={draft.label} placeholder="Reference title" onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))} />
        </div>
        <div className="v2-field">
          <label>URL</label>
          <input value={draft.url} placeholder="Optional link" onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))} />
        </div>
        <div className="v2-field">
          <label>Detail</label>
          <input value={draft.detail} placeholder="Optional detail" onChange={(e) => setDraft((p) => ({ ...p, detail: e.target.value }))} />
        </div>
        <button
          className="v2-btn primary"
          style={{ width: "100%", marginBottom: 16 }}
          disabled={!canAdd}
          onClick={() => {
            if (!canAdd) return;
            onAdd({ id: makePanelId("mood"), type: draft.type, label: draft.label.trim(), url: draft.url, detail: draft.detail, dot: accent });
            setDraft({ type: draft.type, label: "", url: "", detail: "" });
          }}
        >
          Add reference
        </button>

        <div className="v2-skin-section-label">Current References</div>
        {refs.map((r) => (
          <div className="v2-mood-ref" key={r.id}>
            <span className="v2-mood-ref-dot" style={{ background: r.dot || accent }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="v2-mood-ref-text">{r.label}</div>
              <div className="v2-mood-ref-type">{r.type}{r.url ? " / linked" : ""}</div>
            </div>
            <button className="v2-btn danger" onClick={() => onRemove(r.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── World Switcher ─── */

interface WorldSwitcherProps {
  open: boolean;
  activeId: StudioV2WorldId;
  onSelect: (id: StudioV2WorldId) => void;
  onClose: () => void;
}

export function WorldSwitcher({ open, activeId, onSelect, onClose }: WorldSwitcherProps) {
  if (!open) return null;

  return (
    <div className="v2-worlds-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 720 }}>
        <div style={{ color: "#fff", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Choose a room world</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Each world changes how space behaves, not just how it looks.</div>
        </div>
        <div className="v2-worlds-grid">
          {WORLD_KITS.map((kit) => (
            <div
              key={kit.id}
              className={`v2-world-card${kit.id === activeId ? " active" : ""}`}
              onClick={() => { onSelect(kit.id); onClose(); }}
            >
              <div className="wc-name">{kit.name}</div>
              <div className="wc-surface">{kit.surface}</div>
              <div className="wc-feel">{kit.verb}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
