"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { PresenceNode } from "@/lib/api/types";
import {
  getPresenceEditor,
  patchPresenceEditorDraft,
  createPresenceEditorDraft,
  type PresenceEditorConfigInput,
} from "@/lib/api/editor";
import { studioV2FromPresenceConfig, presenceConfigFromStudioV2State } from "@/lib/presence/studio-v2";
import type { StudioV2State, StudioV2Object, StudioV2MoodboardReference } from "@/lib/presence/studio-v2";
import PresenceStudioV2Room from "./PresenceStudioV2Room";
import { SkinLabSheet, ObjectEditorSheet, AddObjectSheet, MoodboardSheet, WorldSwitcher } from "./PresenceStudioV2Panels";
import "./presence-studio-v2.css";

interface PresenceStudioV2EditorProps {
  node: PresenceNode;
  nodeId: number;
  token: string;
  onNodeReload?: () => Promise<void> | void;
}

function snapshot(state: StudioV2State): string {
  return JSON.stringify(state);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function PresenceStudioV2Editor({
  node,
  nodeId,
  token,
  onNodeReload,
}: PresenceStudioV2EditorProps) {
  const [v2State, setV2State] = useState<StudioV2State | null>(null);
  const [baseSnapshot, setBaseSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Editor UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"guided" | "wild">("guided");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [activePanel, setActivePanel] = useState<"none" | "skin" | "object" | "add" | "moodboard" | "worlds">("none");
  const [showTraces, setShowTraces] = useState(false);

  const roomRef = useRef<HTMLDivElement | null>(null);

  const dirty = useMemo(
    () => Boolean(v2State && snapshot(v2State) !== baseSnapshot),
    [v2State, baseSnapshot],
  );

  const loadEditor = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const overview = await getPresenceEditor(nodeId, token);
      const config = overview.draft ?? overview.published ?? null;
      const state = studioV2FromPresenceConfig(config, node);
      setV2State(state);
      setBaseSnapshot(snapshot(state));
      setHasDraft(Boolean(overview.draft));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load draft");
    } finally {
      setLoading(false);
    }
  }, [node, nodeId, token]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  async function saveDraft(nextState: StudioV2State | null = v2State): Promise<boolean> {
    if (!nextState) return false;
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const existingConfig = node.editable_config ?? null;
      const payload: PresenceEditorConfigInput = presenceConfigFromStudioV2State(nextState, existingConfig);
      const response = hasDraft
        ? await patchPresenceEditorDraft(nodeId, token, payload)
        : await createPresenceEditorDraft(nodeId, token, payload);
      const savedConfig = response.draft;
      if (savedConfig) {
        const savedState = studioV2FromPresenceConfig(savedConfig, node);
        setV2State(savedState);
        setBaseSnapshot(snapshot(savedState));
        setHasDraft(true);
        setNotice(hasDraft ? "All changes saved to your draft room." : "Draft room created. All changes saved.");
      }
      void onNodeReload?.();
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ── Object helpers ──
  const selectedObject = useMemo(() => {
    if (!v2State || !selectedId) return null;
    for (const ch of v2State.chambers) {
      const obj = ch.objects.find((o) => o.id === selectedId);
      if (obj) return obj;
    }
    return null;
  }, [v2State, selectedId]);

  function updateState(updater: (prev: StudioV2State) => StudioV2State) {
    setV2State((prev) => (prev ? updater(prev) : prev));
    setNotice(null);
    setActionError(null);
  }

  function updateObject(id: string, patch: Partial<StudioV2Object>) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((ch) => ({
        ...ch,
        objects: ch.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })),
    }));
  }

  function handleAddObject(draft: Partial<StudioV2Object>) {
    const newObj: StudioV2Object = {
      id: makeId("obj"),
      type: draft.type || "text",
      title: draft.title || "Untitled",
      meta: draft.meta || "",
      detail: draft.detail || "",
      link: draft.link || "",
      image: draft.image,
      visibility: { public: true, mobile: true },
      transform: { x: 0, y: 0, scale: 1, rotation: 0, zIndex: 1 },
      locked: false,
      pinned: false,
    };
    updateState((prev) => {
      const chambers = prev.chambers.length ? prev.chambers : [{ id: "main", label: "Room", objects: [] }];
      // Add to first chamber
      const updated = [...chambers];
      updated[0] = { ...updated[0], objects: [...updated[0].objects, newObj] };
      return { ...prev, chambers: updated };
    });
    setSelectedId(newObj.id);
    setActivePanel("object");
  }

  function handleDuplicateObject(id: string) {
    if (!v2State) return;
    for (const ch of v2State.chambers) {
      const obj = ch.objects.find((o) => o.id === id);
      if (obj) {
        const dup: StudioV2Object = {
          ...obj,
          id: makeId("obj"),
          title: `${obj.title} (copy)`,
          transform: { ...obj.transform, x: obj.transform.x + 20, y: obj.transform.y + 20 },
        };
        updateState((prev) => ({
          ...prev,
          chambers: prev.chambers.map((c) =>
            c.id === ch.id ? { ...c, objects: [...c.objects, dup] } : c
          ),
        }));
        setSelectedId(dup.id);
        return;
      }
    }
  }

  function handleDeleteObject(id: string) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((ch) => ({
        ...ch,
        objects: ch.objects.filter((o) => o.id !== id),
      })),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  function handleFloatingAction(action: string) {
    if (!selectedId) return;
    switch (action) {
      case "deselect":
        setSelectedId(null);
        break;
      case "edit":
        setActivePanel("object");
        break;
      case "copy":
        handleDuplicateObject(selectedId);
        break;
      case "hide": {
        const obj = selectedObject;
        if (!obj) break;
        // Toggle visibility: cycle through public→mobile→both hidden→both visible
        if (obj.visibility.public && obj.visibility.mobile) {
          updateObject(selectedId, { visibility: { public: false, mobile: true } });
        } else if (!obj.visibility.public && obj.visibility.mobile) {
          updateObject(selectedId, { visibility: { public: false, mobile: false } });
        } else {
          updateObject(selectedId, { visibility: { public: true, mobile: true } });
        }
        break;
      }
      case "delete":
        handleDeleteObject(selectedId);
        break;
      case "lock": {
        const obj = selectedObject;
        if (obj) updateObject(selectedId, { locked: !obj.locked });
        break;
      }
      case "pin": {
        const obj = selectedObject;
        if (obj) updateObject(selectedId, { pinned: !obj.pinned });
        break;
      }
      case "layerUp": {
        const obj = selectedObject;
        if (obj) updateObject(selectedId, { transform: { ...obj.transform, zIndex: Math.min(999, obj.transform.zIndex + 1) } });
        break;
      }
      case "layerDown": {
        const obj = selectedObject;
        if (obj) updateObject(selectedId, { transform: { ...obj.transform, zIndex: Math.max(0, obj.transform.zIndex - 1) } });
        break;
      }
    }
  }

  // ── Render ──
  if (loading) {
    return (
      <div data-testid="presence-studio-v2-root" className="presence-studio-v2 p-8 text-center">
        Loading Studio V2 editor…
      </div>
    );
  }

  if (loadError || !v2State) {
    return (
      <div data-testid="presence-studio-v2-root" className="presence-studio-v2 p-8">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Studio V2 editor failed to load</p>
          <p className="text-sm">{loadError}</p>
          <button onClick={() => void loadEditor()} className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-sm hover:bg-red-200">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const panelOpen = activePanel !== "none";

  return (
    <div data-testid="presence-studio-v2-root" className="presence-studio-v2 v2-cockpit">
      {/* Toolbar */}
      <div className="v2-toolbar">
        <div className="v2-toolbar-group">
          <span className="font-semibold text-sm">Studio V2</span>
          {dirty && <span data-testid="presence-studio-v2-dirty" className="v2-badge">Unsaved</span>}
          {saving && <span className="text-xs opacity-60">Saving…</span>}
          {notice && <span data-testid="presence-studio-v2-saved" className="v2-badge saved">{notice}</span>}
          {actionError && <span data-testid="presence-studio-v2-error" className="v2-badge error">{actionError}</span>}
        </div>

        <div className="v2-toolbar-spacer" />

        <div className="v2-toolbar-group">
          <button
            className={`v2-btn${mode === "guided" ? " active" : ""}`}
            onClick={() => setMode("guided")}
            title="Guided mode"
          >
            Guided
          </button>
          <button
            className={`v2-btn${mode === "wild" ? " active" : ""}`}
            onClick={() => setMode("wild")}
            title="Wild mode"
          >
            Wild
          </button>
        </div>

        <div className="v2-toolbar-group">
          <button className={`v2-btn${viewport === "desktop" ? " active" : ""}`} onClick={() => setViewport("desktop")}>Desktop</button>
          <button className={`v2-btn${viewport === "mobile" ? " active" : ""}`} onClick={() => setViewport("mobile")}>Mobile</button>
        </div>

        <div className="v2-toolbar-group">
          <button className="v2-btn" onClick={() => setActivePanel(activePanel === "worlds" ? "none" : "worlds")}>World</button>
          <button className="v2-btn" onClick={() => setActivePanel(activePanel === "skin" ? "none" : "skin")}>Skin</button>
          <button className="v2-btn" onClick={() => setActivePanel(activePanel === "moodboard" ? "none" : "moodboard")}>Mood</button>
          <button className="v2-btn" onClick={() => { setSelectedId(null); setActivePanel(activePanel === "add" ? "none" : "add"); }}>+ Add</button>
        </div>

        <div className="v2-toolbar-group">
          <button
            data-testid="presence-studio-v2-save"
            className="v2-btn primary"
            onClick={() => void saveDraft()}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>

      {/* Room stage */}
      <div ref={roomRef} style={{ position: "relative", flex: 1 }}>
        <PresenceStudioV2Room
          state={v2State}
          selectedId={selectedId}
          mode={mode}
          viewport={viewport}
          onSelectObject={(id) => {
            setSelectedId(id);
            if (id) setActivePanel("object");
          }}
        />

        {/* Floating toolbar */}
        {selectedId && (
          <FloatingToolbar
            mode={mode}
            selectedObject={selectedObject}
            onAction={handleFloatingAction}
          />
        )}
      </div>

      {/* Panels */}
      {panelOpen && activePanel !== "worlds" && (
        <div className="v2-panel-backdrop" onClick={() => setActivePanel("none")} />
      )}

      <SkinLabSheet
        skin={v2State.skin}
        open={activePanel === "skin"}
        onClose={() => setActivePanel("none")}
        onChange={(skin) => updateState((prev) => ({ ...prev, skin }))}
      />

      <ObjectEditorSheet
        object={selectedObject}
        open={activePanel === "object"}
        onClose={() => setActivePanel("none")}
        onChange={(obj) => updateObject(obj.id, obj)}
      />

      <AddObjectSheet
        open={activePanel === "add"}
        onClose={() => setActivePanel("none")}
        onAdd={handleAddObject}
      />

      <MoodboardSheet
        open={activePanel === "moodboard"}
        onClose={() => setActivePanel("none")}
        refs={v2State.moodboardRefs}
        accent={v2State.skin.accentColor}
        onAdd={(ref) => updateState((prev) => ({ ...prev, moodboardRefs: [...prev.moodboardRefs, ref] }))}
        onRemove={(id) => updateState((prev) => ({ ...prev, moodboardRefs: prev.moodboardRefs.filter((r) => r.id !== id) }))}
      />

      <WorldSwitcher
        open={activePanel === "worlds"}
        activeId={v2State.worldId}
        onSelect={(id) => updateState((prev) => ({ ...prev, worldId: id }))}
        onClose={() => setActivePanel("none")}
      />
    </div>
  );
}

/* ─── Floating Toolbar ─── */

function FloatingToolbar({
  mode,
  selectedObject,
  onAction,
}: {
  mode: "guided" | "wild";
  selectedObject: StudioV2Object | null;
  onAction: (action: string) => void;
}) {
  const tools: Array<{ id: string; label: string; icon: string; danger?: boolean }> = [
    { id: "deselect", label: "Clear", icon: "✕" },
    { id: "edit", label: "Edit", icon: "✎" },
    { id: "copy", label: "Duplicate", icon: "⎘" },
    { id: "hide", label: "Visibility", icon: "👁" },
  ];

  if (mode === "wild") {
    tools.push(
      { id: "layerUp", label: "Layer up", icon: "↑" },
      { id: "layerDown", label: "Layer down", icon: "↓" },
      { id: "pin", label: "Pin", icon: "📌" },
      { id: "lock", label: "Lock", icon: "🔒" },
    );
  }

  tools.push({ id: "delete", label: "Delete", icon: "🗑", danger: true });

  return (
    <div className="v2-float" style={{ bottom: 24, left: "50%", transform: "translateX(-50%)" }}>
      {tools.map((t, i) => (
        <button
          key={t.id}
          className={`v2-float-btn${t.danger ? " danger" : ""}${
            (t.id === "lock" && selectedObject?.locked) || (t.id === "pin" && selectedObject?.pinned)
              ? " active"
              : ""
          }`}
          title={t.label}
          onClick={(e) => {
            e.stopPropagation();
            onAction(t.id);
          }}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
