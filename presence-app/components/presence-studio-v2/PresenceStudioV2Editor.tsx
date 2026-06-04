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
import { SkinLabSheet, AddObjectSheet, MoodboardSheet, WorldSwitcher } from "./PresenceStudioV2Panels";
import { WORLD_KITS } from "./worlds";
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
  const [surfaceTab, setSurfaceTab] = useState<"threshold" | "chamber" | "archive">("chamber");
  const [inspectorTab, setInspectorTab] = useState<"content" | "style" | "motion">("content");
  const [activeChamberId, setActiveChamberId] = useState<string | null>(null);
  const [expandedChambers, setExpandedChambers] = useState<Set<string>>(() => new Set());
  const [shareNotice, setShareNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!v2State) return;
    setActiveChamberId((current) => current ?? v2State.chambers[0]?.id ?? null);
    setExpandedChambers((current) => {
      const next = new Set(current);
      if (next.size === 0) {
        v2State.chambers.forEach((chamber) => next.add(chamber.id));
      }
      return next;
    });
  }, [v2State]);

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
        setNotice(hasDraft ? "Saved - just now" : "Draft room created - saved just now");
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

  function updateRoom(patch: Partial<StudioV2State>) {
    updateState((prev) => ({ ...prev, ...patch }));
  }

  function updateCta(patch: Partial<StudioV2State["cta"]>) {
    updateState((prev) => ({ ...prev, cta: { ...prev.cta, ...patch } }));
  }

  function scrollToObject(id: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(`presence-v2-object-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function scrollToChamber(id: string) {
    setActiveChamberId(id);
    setSurfaceTab("chamber");
    window.requestAnimationFrame(() => {
      document.getElementById(`presence-v2-chamber-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function selectObject(id: string) {
    setSelectedId(id);
    setSurfaceTab("chamber");
    setInspectorTab("content");
    setActivePanel("none");
    const chamber = v2State?.chambers.find((ch) => ch.objects.some((obj) => obj.id === id));
    if (chamber) setActiveChamberId(chamber.id);
    scrollToObject(id);
  }

  function toggleChamberExpanded(id: string) {
    setExpandedChambers((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleShare() {
    const slug = v2State?.slug || node.slug || String(nodeId);
    const path = `/presence/${slug}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(url);
      setShareNotice("Copied public URL");
    } catch {
      setShareNotice(url);
    }
    window.setTimeout(() => setShareNotice(null), 2600);
  }

  function goToPreview() {
    window.location.href = `/studio/${nodeId}/editor/preview`;
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
    setInspectorTab("content");
    setActivePanel("none");
    scrollToObject(newObj.id);
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
        setInspectorTab("content");
        scrollToObject(dup.id);
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
        setInspectorTab("content");
        setActivePanel("none");
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

  const sheetOpen = activePanel === "skin" || activePanel === "add" || activePanel === "moodboard";
  const world = WORLD_KITS.find((kit) => kit.id === v2State.worldId);
  const activeChamber = v2State.chambers.find((chamber) => chamber.id === activeChamberId) ?? v2State.chambers[0] ?? null;
  const saveStatus = saving ? "Saving" : dirty ? "Unsaved changes" : notice ?? "Saved";

  return (
    <div data-testid="presence-studio-v2-root" className="presence-studio-v2 v2-cockpit">
      {/* Top chrome */}
      <header data-testid="presence-studio-v2-top-chrome" className="v2-toolbar v2-top-chrome">
        <div className="v2-toolbar-group">
          <span className="v2-brand-glyph" aria-hidden="true">P</span>
          <span className="font-semibold text-sm">Presence Studio</span>
          <span data-testid="presence-studio-v2-breadcrumb" className="v2-breadcrumb">
            My rooms &gt; {v2State.title || `Room ${nodeId}`} &gt; Editor
          </span>
          <span data-testid="presence-studio-v2-save-status" className={`v2-save-status${dirty ? " dirty" : ""}`}>
            {saveStatus}
          </span>
          {dirty && <span data-testid="presence-studio-v2-dirty" className="v2-badge">Unsaved</span>}
          {saving && <span className="text-xs opacity-60">Saving…</span>}
          {notice && <span data-testid="presence-studio-v2-saved" className="v2-badge saved">{notice}</span>}
          {actionError && <span data-testid="presence-studio-v2-error" className="v2-badge error">{actionError}</span>}
          {shareNotice && <span className="v2-share-notice">{shareNotice}</span>}
        </div>

        <div className="v2-toolbar-spacer" />

        <nav className="v2-surface-tabs" aria-label="Studio surface">
          <button
            data-testid="presence-studio-v2-tab-threshold"
            className={`v2-tab${surfaceTab === "threshold" ? " active" : ""}`}
            onClick={() => setSurfaceTab("threshold")}
          >
            Threshold
          </button>
          <button
            data-testid="presence-studio-v2-tab-chamber"
            className={`v2-tab${surfaceTab === "chamber" ? " active" : ""}`}
            onClick={() => setSurfaceTab("chamber")}
          >
            Chamber
          </button>
          <button
            data-testid="presence-studio-v2-tab-archive"
            className={`v2-tab${surfaceTab === "archive" ? " active" : ""}`}
            onClick={() => setSurfaceTab("archive")}
          >
            Studio Archive
          </button>
        </nav>

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
          <button data-testid="studio-v2-open-worlds" className="v2-btn" onClick={() => setActivePanel(activePanel === "worlds" ? "none" : "worlds")}>World</button>
          <button data-testid="studio-v2-open-skin" className="v2-btn" onClick={() => setActivePanel(activePanel === "skin" ? "none" : "skin")}>Skin</button>
          <button data-testid="studio-v2-open-moodboard" className="v2-btn" onClick={() => setActivePanel(activePanel === "moodboard" ? "none" : "moodboard")}>Mood</button>
          <button data-testid="studio-v2-open-add" className="v2-btn" onClick={() => { setSelectedId(null); setActivePanel(activePanel === "add" ? "none" : "add"); }}>+ Add</button>
        </div>

        <div className="v2-toolbar-group">
          <button data-testid="presence-studio-v2-share-action" className="v2-btn" onClick={() => void handleShare()}>Share</button>
          <button data-testid="presence-studio-v2-preview-action" className="v2-btn" onClick={goToPreview}>Preview</button>
          <button data-testid="presence-studio-v2-publish-action" className="v2-btn" onClick={goToPreview}>Publish</button>
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
      </header>

      <div className="v2-studio-layout">
        <StudioOutlinePanel
          state={v2State}
          selectedId={selectedId}
          activeChamberId={activeChamber?.id ?? null}
          expandedChambers={expandedChambers}
          onToggleChamber={toggleChamberExpanded}
          onSelectObject={selectObject}
          onSelectChamber={scrollToChamber}
        />

        {/* Room stage */}
        <main ref={roomRef} className="v2-stage-shell">
          <div data-testid="presence-studio-v2-chamber-tabs" className="v2-chamber-tabs">
            {v2State.chambers.map((chamber) => (
              <button
                key={chamber.id}
                data-testid="presence-studio-v2-chamber-tab"
                className={`v2-chamber-tab${activeChamber?.id === chamber.id ? " active" : ""}`}
                onClick={() => scrollToChamber(chamber.id)}
              >
                {chamber.label}
              </button>
            ))}
          </div>

          {surfaceTab === "threshold" ? (
            <ThresholdWorkbench state={v2State} worldName={world?.name ?? v2State.worldId} />
          ) : surfaceTab === "archive" ? (
            <ArchiveWorkbench state={v2State} hasDraft={hasDraft} dirty={dirty} />
          ) : (
            <div className="v2-stage-frame">
              <div className="v2-stage-frame-head">
                <span>{world?.name ?? v2State.worldId}</span>
                <strong>{activeChamber?.label ?? "Room"}</strong>
              </div>
              <PresenceStudioV2Room
                state={v2State}
                selectedId={selectedId}
                mode={mode}
                viewport={viewport}
                onSelectObject={(id) => {
                  if (id) selectObject(id);
                  else setSelectedId(null);
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
          )}
        </main>

        <StudioInspectorPanel
          state={v2State}
          selectedObject={selectedObject}
          inspectorTab={inspectorTab}
          mode={mode}
          dirty={dirty}
          saving={saving}
          onSetInspectorTab={setInspectorTab}
          onUpdateRoom={updateRoom}
          onUpdateCta={updateCta}
          onUpdateObject={(obj) => updateObject(obj.id, obj)}
          onOpenWorlds={() => setActivePanel("worlds")}
          onOpenSkin={() => setActivePanel("skin")}
          onDuplicate={handleDuplicateObject}
          onDelete={handleDeleteObject}
        />
      </div>

      {/* Panels */}
      {sheetOpen && (
        <div className="v2-panel-backdrop" onClick={() => setActivePanel("none")} />
      )}

      <SkinLabSheet
        skin={v2State.skin}
        open={activePanel === "skin"}
        onClose={() => setActivePanel("none")}
        onChange={(skin) => updateState((prev) => ({ ...prev, skin }))}
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

const OBJECT_TYPES: StudioV2Object["type"][] = [
  "text",
  "note",
  "image",
  "link",
  "portal",
  "cta",
  "testimonial",
  "proof",
  "event",
  "service",
  "shop",
  "media",
  "credential",
  "moodboard",
];

function objectGlyph(type: StudioV2Object["type"]): string {
  const glyphs: Partial<Record<StudioV2Object["type"], string>> = {
    image: "IMG",
    proof: "DOC",
    event: "EVT",
    media: "MIX",
    cta: "CTA",
    portal: "GO",
    testimonial: "QTE",
    shop: "BUY",
    service: "SVC",
    moodboard: "REF",
  };
  return glyphs[type] ?? type.slice(0, 3).toUpperCase();
}

function StudioOutlinePanel({
  state,
  selectedId,
  activeChamberId,
  expandedChambers,
  onToggleChamber,
  onSelectObject,
  onSelectChamber,
}: {
  state: StudioV2State;
  selectedId: string | null;
  activeChamberId: string | null;
  expandedChambers: Set<string>;
  onToggleChamber: (id: string) => void;
  onSelectObject: (id: string) => void;
  onSelectChamber: (id: string) => void;
}) {
  const assets = state.chambers.flatMap((chamber) =>
    chamber.objects
      .filter((object) => object.image?.src)
      .map((object) => ({ chamberId: chamber.id, object })),
  );

  return (
    <aside data-testid="presence-studio-v2-outline" className="v2-left-rail">
      <section className="v2-rail-section">
        <div className="v2-rail-title">
          <span>Room outline</span>
          <strong>{state.chambers.length}</strong>
        </div>
        <div className="v2-outline-tree">
          {state.chambers.map((chamber) => {
            const expanded = expandedChambers.has(chamber.id);
            const active = activeChamberId === chamber.id;
            return (
              <div
                key={chamber.id}
                data-testid="presence-studio-v2-outline-chamber"
                className={`v2-outline-chamber${active ? " active" : ""}`}
              >
                <div className="v2-outline-chamber-row">
                  <button
                    type="button"
                    className="v2-outline-toggle"
                    onClick={() => onToggleChamber(chamber.id)}
                    aria-label={expanded ? "Collapse chamber" : "Expand chamber"}
                  >
                    {expanded ? "-" : "+"}
                  </button>
                  <button type="button" className="v2-outline-chamber-name" onClick={() => onSelectChamber(chamber.id)}>
                    {chamber.label}
                  </button>
                  <span>{chamber.objects.length}</span>
                </div>
                {expanded && (
                  <div className="v2-outline-objects">
                    {chamber.objects.map((object) => (
                      <button
                        key={object.id}
                        type="button"
                        data-testid="presence-studio-v2-outline-object"
                        className={`v2-outline-object${selectedId === object.id ? " active" : ""}`}
                        onClick={() => onSelectObject(object.id)}
                      >
                        <span className="v2-object-glyph">{objectGlyph(object.type)}</span>
                        <span className="v2-outline-object-copy">
                          <strong>{object.title || "Untitled object"}</strong>
                          {(object.meta || object.type) && <em>{object.meta || object.type}</em>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section data-testid="presence-studio-v2-assets" className="v2-rail-section v2-assets">
        <div className="v2-rail-title">
          <span>Existing room images</span>
          <strong>{assets.length}</strong>
        </div>
        {assets.length === 0 ? (
          <p className="v2-quiet-copy">No image objects in this draft yet. Add image URLs through object content fields.</p>
        ) : (
          <div className="v2-assets-grid">
            {assets.map(({ object }) => (
              <button
                key={object.id}
                type="button"
                data-testid="presence-studio-v2-asset"
                className={`v2-asset${selectedId === object.id ? " active" : ""}`}
                onClick={() => onSelectObject(object.id)}
              >
                <img src={object.image?.src} alt={object.image?.alt || object.title} />
                <span>{object.title}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

function StudioInspectorPanel({
  state,
  selectedObject,
  inspectorTab,
  mode,
  dirty,
  saving,
  onSetInspectorTab,
  onUpdateRoom,
  onUpdateCta,
  onUpdateObject,
  onOpenWorlds,
  onOpenSkin,
  onDuplicate,
  onDelete,
}: {
  state: StudioV2State;
  selectedObject: StudioV2Object | null;
  inspectorTab: "content" | "style" | "motion";
  mode: "guided" | "wild";
  dirty: boolean;
  saving: boolean;
  onSetInspectorTab: (tab: "content" | "style" | "motion") => void;
  onUpdateRoom: (patch: Partial<StudioV2State>) => void;
  onUpdateCta: (patch: Partial<StudioV2State["cta"]>) => void;
  onUpdateObject: (object: StudioV2Object) => void;
  onOpenWorlds: () => void;
  onOpenSkin: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const object = selectedObject;
  const world = WORLD_KITS.find((kit) => kit.id === state.worldId);
  const locked = Boolean(object?.locked);

  const updateObject = (patch: Partial<StudioV2Object>) => {
    if (!object) return;
    onUpdateObject({ ...object, ...patch });
  };

  const updateTransform = (patch: Partial<StudioV2Object["transform"]>) => {
    if (!object) return;
    updateObject({ transform: { ...object.transform, ...patch } });
  };

  return (
    <aside data-testid="presence-studio-v2-inspector" className="v2-inspector">
      <div className="v2-inspector-head">
        <span>{object ? "Object inspector" : "Room inspector"}</span>
        <strong>{object?.title || state.title}</strong>
      </div>

      {!object ? (
        <div className="v2-inspector-body">
          <div className="v2-inspector-section">
            <div className="v2-inspector-section-title">Room identity</div>
            <label data-testid="presence-studio-v2-field-title" className="v2-field">
              <span>Room title</span>
              <input value={state.title} onChange={(event) => onUpdateRoom({ title: event.target.value })} />
            </label>
            <label className="v2-field">
              <span>Tagline / intro</span>
              <textarea value={state.tagline || ""} onChange={(event) => onUpdateRoom({ tagline: event.target.value })} />
            </label>
            <div className="v2-inspector-row">
              <span>World</span>
              <strong>{world?.name ?? state.worldId}</strong>
              <button type="button" className="v2-btn" onClick={onOpenWorlds}>Change</button>
            </div>
          </div>

          <div className="v2-inspector-section">
            <div className="v2-inspector-section-title">Public path</div>
            <label className="v2-field">
              <span>CTA label</span>
              <input value={state.cta.label} onChange={(event) => onUpdateCta({ label: event.target.value })} />
            </label>
            <label className="v2-field">
              <span>CTA / enquiry URL</span>
              <input value={state.cta.href || ""} onChange={(event) => onUpdateCta({ href: event.target.value })} />
            </label>
          </div>

          <div className="v2-inspector-section">
            <div className="v2-inspector-section-title">Draft state</div>
            <div className="v2-inspector-row">
              <span>Status</span>
              <strong>{saving ? "Saving" : dirty ? "Unsaved changes" : "Saved"}</strong>
            </div>
            <button type="button" className="v2-btn" onClick={onOpenSkin}>Open Skin Lab</button>
          </div>
        </div>
      ) : (
        <>
          <div className="v2-inspector-tabs" role="tablist" aria-label="Object inspector sections">
            <button
              data-testid="presence-studio-v2-inspector-tab-content"
              className={`v2-inspector-tab${inspectorTab === "content" ? " active" : ""}`}
              onClick={() => onSetInspectorTab("content")}
            >
              Content
            </button>
            <button
              data-testid="presence-studio-v2-inspector-tab-style"
              className={`v2-inspector-tab${inspectorTab === "style" ? " active" : ""}`}
              onClick={() => onSetInspectorTab("style")}
            >
              Style
            </button>
            <button
              data-testid="presence-studio-v2-inspector-tab-motion"
              className={`v2-inspector-tab${inspectorTab === "motion" ? " active" : ""}`}
              onClick={() => onSetInspectorTab("motion")}
            >
              Motion
            </button>
          </div>

          <div className="v2-inspector-body">
            {locked && inspectorTab !== "style" && (
              <div className="v2-honest-note">This object is locked. Unlock it in Style before editing content or transforms.</div>
            )}

            {inspectorTab === "content" && (
              <div className="v2-inspector-section">
                <div className="v2-inspector-section-title">Object content</div>
                <label data-testid="presence-studio-v2-field-title" className="v2-field">
                  <span>Title</span>
                  <input
                    data-testid="studio-v2-object-title"
                    value={object.title}
                    disabled={locked}
                    onChange={(event) => updateObject({ title: event.target.value })}
                  />
                </label>
                <label className="v2-field">
                  <span>Type</span>
                  <select
                    data-testid="studio-v2-object-type"
                    value={object.type}
                    disabled={locked}
                    onChange={(event) => updateObject({ type: event.target.value as StudioV2Object["type"] })}
                  >
                    {OBJECT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label data-testid="presence-studio-v2-field-meta" className="v2-field">
                  <span>Meta / subtitle</span>
                  <input
                    data-testid="studio-v2-object-meta"
                    value={object.meta || ""}
                    disabled={locked}
                    onChange={(event) => updateObject({ meta: event.target.value })}
                  />
                </label>
                <label data-testid="presence-studio-v2-field-detail" className="v2-field">
                  <span>Detail</span>
                  <textarea
                    data-testid="studio-v2-object-detail"
                    value={object.detail || ""}
                    disabled={locked}
                    onChange={(event) => updateObject({ detail: event.target.value })}
                  />
                </label>
                <label data-testid="presence-studio-v2-field-link" className="v2-field">
                  <span>Link / portal target</span>
                  <input
                    data-testid="studio-v2-object-link"
                    value={object.link || ""}
                    disabled={locked}
                    onChange={(event) => updateObject({ link: event.target.value })}
                  />
                </label>
                <label data-testid="presence-studio-v2-field-image" className="v2-field">
                  <span>Image URL</span>
                  <input
                    data-testid="studio-v2-object-image"
                    value={object.image?.src || ""}
                    disabled={locked}
                    onChange={(event) => {
                      const src = event.target.value.trim();
                      updateObject({ image: src ? { src, alt: object.image?.alt || object.title } : undefined });
                    }}
                  />
                </label>
                <label className="v2-check-row">
                  <input
                    type="checkbox"
                    checked={object.visibility.public}
                    disabled={locked}
                    onChange={(event) => updateObject({ visibility: { ...object.visibility, public: event.target.checked } })}
                  />
                  <span>Visible publicly</span>
                </label>
                <label className="v2-check-row">
                  <input
                    type="checkbox"
                    checked={object.visibility.mobile}
                    disabled={locked}
                    onChange={(event) => updateObject({ visibility: { ...object.visibility, mobile: event.target.checked } })}
                  />
                  <span>Visible on mobile</span>
                </label>
              </div>
            )}

            {inspectorTab === "style" && (
              <div className="v2-inspector-section">
                <div className="v2-inspector-section-title">Object state</div>
                <label className="v2-check-row">
                  <input type="checkbox" checked={object.locked} onChange={(event) => updateObject({ locked: event.target.checked })} />
                  <span>Locked</span>
                </label>
                <label className="v2-check-row">
                  <input type="checkbox" checked={object.pinned} onChange={(event) => updateObject({ pinned: event.target.checked })} />
                  <span>Pinned / fixed in room</span>
                </label>
                <div className="v2-inspector-grid">
                  <button type="button" className="v2-btn" onClick={() => updateTransform({ zIndex: Math.max(0, object.transform.zIndex - 1) })}>
                    Layer down
                  </button>
                  <button type="button" className="v2-btn" onClick={() => updateTransform({ zIndex: Math.min(999, object.transform.zIndex + 1) })}>
                    Layer up
                  </button>
                  <button type="button" className="v2-btn" onClick={() => onDuplicate(object.id)}>Duplicate</button>
                  <button type="button" className="v2-btn danger" onClick={() => onDelete(object.id)}>Delete</button>
                </div>
                <button type="button" className="v2-btn" onClick={onOpenSkin}>Room Skin Lab controls object material</button>
              </div>
            )}

            {inspectorTab === "motion" && (
              <div className="v2-inspector-section">
                <div className="v2-inspector-section-title">Transform</div>
                <div className="v2-honest-note">
                  Direct drag and handles arrive in S2. These transform values persist now and activate visually in Wild Mode.
                </div>
                <div className="v2-motion-grid">
                  <label className="v2-field">
                    <span>X</span>
                    <input
                      data-testid="presence-studio-v2-transform-x"
                      type="number"
                      value={object.transform.x}
                      disabled={locked}
                      onChange={(event) => updateTransform({ x: Number(event.target.value) })}
                    />
                  </label>
                  <label className="v2-field">
                    <span>Y</span>
                    <input
                      data-testid="presence-studio-v2-transform-y"
                      type="number"
                      value={object.transform.y}
                      disabled={locked}
                      onChange={(event) => updateTransform({ y: Number(event.target.value) })}
                    />
                  </label>
                  <label className="v2-field">
                    <span>Scale</span>
                    <input
                      data-testid="presence-studio-v2-transform-scale"
                      type="number"
                      min="0.2"
                      max="4"
                      step="0.05"
                      value={object.transform.scale}
                      disabled={locked}
                      onChange={(event) => updateTransform({ scale: Number(event.target.value) })}
                    />
                  </label>
                  <label className="v2-field">
                    <span>Rotation</span>
                    <input
                      data-testid="presence-studio-v2-transform-rotation"
                      type="number"
                      step="1"
                      value={object.transform.rotation}
                      disabled={locked}
                      onChange={(event) => updateTransform({ rotation: Number(event.target.value) })}
                    />
                  </label>
                  <label className="v2-field">
                    <span>Z index</span>
                    <input
                      type="number"
                      value={object.transform.zIndex}
                      disabled={locked}
                      onChange={(event) => updateTransform({ zIndex: Number(event.target.value) })}
                    />
                  </label>
                  <div className="v2-motion-mode">
                    <span>Current mode</span>
                    <strong>{mode === "wild" ? "Wild transform preview" : "Guided layout protection"}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="v2-btn"
                  disabled={locked}
                  onClick={() => updateTransform({ x: 0, y: 0, scale: 1, rotation: 0 })}
                >
                  Reset transform
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function ThresholdWorkbench({ state, worldName }: { state: StudioV2State; worldName: string }) {
  const firstImage = state.chambers.flatMap((chamber) => chamber.objects).find((object) => object.image?.src);
  const objectCount = state.chambers.reduce((total, chamber) => total + chamber.objects.length, 0);

  return (
    <section className="v2-threshold-workbench">
      <div className="v2-threshold-card">
        <span className="v2-threshold-eyebrow">{worldName}</span>
        <h2>{state.title}</h2>
        {state.tagline && <p>{state.tagline}</p>}
        <div className="v2-threshold-facts">
          <span>{state.chambers.length} chambers</span>
          <span>{objectCount} room objects</span>
          <span>{state.moodboardRefs.length} influences</span>
        </div>
        {state.cta.label && <strong className="v2-threshold-cta">{state.cta.label}</strong>}
      </div>
      <div className="v2-threshold-artifact">
        {firstImage?.image?.src ? (
          <img src={firstImage.image.src} alt={firstImage.image.alt || firstImage.title} />
        ) : (
          <div className="v2-threshold-empty">Threshold preview uses current room title, world, CTA, and first public image object.</div>
        )}
      </div>
    </section>
  );
}

function ArchiveWorkbench({ state, hasDraft, dirty }: { state: StudioV2State; hasDraft: boolean; dirty: boolean }) {
  return (
    <section className="v2-archive-workbench">
      <div className="v2-archive-panel">
        <span>Studio Archive</span>
        <h2>Operator archive is not enabled in this build.</h2>
        <p>
          This view is intentionally read-only for S1. Draft save, owner preview, and publish still run through the real Presence flow.
        </p>
        <dl>
          <div><dt>Room ID</dt><dd>{state.roomId}</dd></div>
          <div><dt>Slug</dt><dd>{state.slug}</dd></div>
          <div><dt>Draft</dt><dd>{hasDraft ? "Existing draft" : "New draft on save"}</dd></div>
          <div><dt>State</dt><dd>{dirty ? "Unsaved changes" : "Saved"}</dd></div>
        </dl>
      </div>
    </section>
  );
}

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
