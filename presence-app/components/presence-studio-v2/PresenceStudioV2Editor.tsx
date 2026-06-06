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

const EDITOR_MIN_SCALE = 0.45;
const EDITOR_MAX_SCALE = 2.5;
const EDITOR_MIN_POSITION = -1200;
const EDITOR_MAX_POSITION = 1200;

type CanvasInteractionKind = "drag" | "resize" | "rotate";
type ResizeCorner = "tl" | "tr" | "bl" | "br";

interface CanvasInteraction {
  kind: CanvasInteractionKind;
  objectId: string;
  startX: number;
  startY: number;
  startTransform: StudioV2Object["transform"];
  maxX: number;
  maxY: number;
  centerX?: number;
  centerY?: number;
  startDistance?: number;
  startAngle?: number;
}

interface TransformReadout {
  kind: CanvasInteractionKind | "nudge";
  objectId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function angleFromCenter(clientX: number, clientY: number, centerX: number, centerY: number): number {
  return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
}

function distanceFromCenter(clientX: number, clientY: number, centerX: number, centerY: number): number {
  return Math.hypot(clientX - centerX, clientY - centerY);
}

function isFormTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
}

function hasMeaningfulTransform(transform: StudioV2Object["transform"]): boolean {
  return transform.x !== 0 || transform.y !== 0 || transform.scale !== 1 || transform.rotation !== 0;
}

function countPublicObjects(state: StudioV2State): number {
  return state.chambers.reduce(
    (total, chamber) => total + chamber.objects.filter((object) => object.visibility.public).length,
    0,
  );
}

function safeHost(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.host;
  } catch {
    return value.startsWith("/") ? "Internal Presence path" : "Link format needs review";
  }
}

function objectStateBadges(object: StudioV2Object, dirty: boolean): string[] {
  const badges: string[] = [];
  if (object.locked) badges.push("Locked");
  if (object.pinned) badges.push("Pinned");
  if (!object.visibility.public) badges.push("Hidden from public");
  if (!object.visibility.mobile) badges.push("Hidden on mobile");
  if (hasMeaningfulTransform(object.transform)) badges.push("Transformed");
  if (dirty) badges.push("Unsaved draft");
  return badges.length > 0 ? badges : ["Public-ready"];
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
  const [interactionReadout, setInteractionReadout] = useState<TransformReadout | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const roomRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);

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

  useEffect(() => {
    setDeleteConfirmId(null);
  }, [selectedId]);

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

  function findObject(id: string | null): StudioV2Object | null {
    if (!v2State || !id) return null;
    for (const chamber of v2State.chambers) {
      const object = chamber.objects.find((candidate) => candidate.id === id);
      if (object) return object;
    }
    return null;
  }

  function setObjectTransform(id: string, transform: StudioV2Object["transform"]) {
    setV2State((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chambers: prev.chambers.map((chamber) => ({
          ...chamber,
          objects: chamber.objects.map((object) =>
            object.id === id ? { ...object, transform: { ...object.transform, ...transform } } : object,
          ),
        })),
      };
    });
    setNotice(null);
    setActionError(null);
  }

  function stageBounds() {
    const rect = roomRef.current?.getBoundingClientRect();
    return {
      maxX: clampNumber(Math.round((rect?.width ?? 900) * 0.62), 180, EDITOR_MAX_POSITION),
      maxY: clampNumber(Math.round((rect?.height ?? 700) * 0.62), 180, EDITOR_MAX_POSITION),
    };
  }

  function transformReadout(kind: TransformReadout["kind"], objectId: string, transform: StudioV2Object["transform"]) {
    setInteractionReadout({
      kind,
      objectId,
      x: Math.round(transform.x),
      y: Math.round(transform.y),
      scale: roundTo(transform.scale, 2),
      rotation: Math.round(transform.rotation),
    });
  }

  function endCanvasInteraction(onMove: (event: PointerEvent) => void, onUp: (event: PointerEvent) => void) {
    interactionRef.current = null;
    document.body.classList.remove("v2-is-manipulating");
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.setTimeout(() => setInteractionReadout(null), 1800);
  }

  function beginCanvasInteraction(
    kind: CanvasInteractionKind,
    objectId: string,
    event: React.PointerEvent<HTMLElement>,
  ) {
    const object = findObject(objectId);
    if (!object || mode !== "wild" || object.locked) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (kind === "drag" && isFormTarget(event.target)) return;

    const objectEl = (event.currentTarget as HTMLElement).closest("[data-v2-object-id]") as HTMLElement | null;
    const objectRect = objectEl?.getBoundingClientRect();
    if (!objectRect) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const { maxX, maxY } = stageBounds();
    const centerX = objectRect.left + objectRect.width / 2;
    const centerY = objectRect.top + objectRect.height / 2;
    interactionRef.current = {
      kind,
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      startTransform: { ...object.transform },
      maxX,
      maxY,
      centerX,
      centerY,
      startDistance: distanceFromCenter(event.clientX, event.clientY, centerX, centerY),
      startAngle: angleFromCenter(event.clientX, event.clientY, centerX, centerY),
    };
    document.body.classList.add("v2-is-manipulating");
    transformReadout(kind, objectId, object.transform);

    const onMove = (moveEvent: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.objectId !== objectId) return;
      moveEvent.preventDefault();

      const next = { ...interaction.startTransform };
      if (interaction.kind === "drag") {
        const dx = moveEvent.clientX - interaction.startX;
        const dy = moveEvent.clientY - interaction.startY;
        next.x = clampNumber(Math.round(interaction.startTransform.x + dx), -interaction.maxX, interaction.maxX);
        next.y = clampNumber(Math.round(interaction.startTransform.y + dy), -interaction.maxY, interaction.maxY);
      }

      if (interaction.kind === "resize") {
        const centerXValue = interaction.centerX ?? moveEvent.clientX;
        const centerYValue = interaction.centerY ?? moveEvent.clientY;
        const startDistance = Math.max(1, interaction.startDistance ?? 1);
        const distance = distanceFromCenter(moveEvent.clientX, moveEvent.clientY, centerXValue, centerYValue);
        next.scale = clampNumber(
          roundTo(interaction.startTransform.scale * (distance / startDistance), 2),
          EDITOR_MIN_SCALE,
          EDITOR_MAX_SCALE,
        );
      }

      if (interaction.kind === "rotate") {
        const centerXValue = interaction.centerX ?? moveEvent.clientX;
        const centerYValue = interaction.centerY ?? moveEvent.clientY;
        const startAngle = interaction.startAngle ?? 0;
        const currentAngle = angleFromCenter(moveEvent.clientX, moveEvent.clientY, centerXValue, centerYValue);
        const angleDelta = currentAngle - startAngle;
        const pointerDelta = (moveEvent.clientX - interaction.startX) * 0.65 + (moveEvent.clientY - interaction.startY) * 0.35;
        const rotationDelta = Math.abs(angleDelta) >= 1 ? angleDelta : pointerDelta;
        next.rotation = clampNumber(Math.round(interaction.startTransform.rotation + rotationDelta), -360, 360);
      }

      setObjectTransform(objectId, next);
      transformReadout(interaction.kind, objectId, next);
    };

    const onUp = (upEvent: PointerEvent) => {
      upEvent.preventDefault();
      endCanvasInteraction(onMove, onUp);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function beginObjectDrag(objectId: string, event: React.PointerEvent<HTMLElement>) {
    beginCanvasInteraction("drag", objectId, event);
  }

  function beginObjectResize(objectId: string, _corner: ResizeCorner, event: React.PointerEvent<HTMLElement>) {
    beginCanvasInteraction("resize", objectId, event);
  }

  function beginObjectRotate(objectId: string, event: React.PointerEvent<HTMLElement>) {
    beginCanvasInteraction("rotate", objectId, event);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedId) {
        setSelectedId(null);
        setInteractionReadout(null);
        return;
      }

      if (!selectedId || !selectedObject || mode !== "wild" || selectedObject.locked || isFormTarget(event.target)) return;
      const step = event.shiftKey ? 10 : 1;
      const patch: Partial<StudioV2Object["transform"]> = {};
      if (event.key === "ArrowLeft") patch.x = selectedObject.transform.x - step;
      if (event.key === "ArrowRight") patch.x = selectedObject.transform.x + step;
      if (event.key === "ArrowUp") patch.y = selectedObject.transform.y - step;
      if (event.key === "ArrowDown") patch.y = selectedObject.transform.y + step;
      if (patch.x === undefined && patch.y === undefined) return;

      event.preventDefault();
      const { maxX, maxY } = stageBounds();
      const next = {
        ...selectedObject.transform,
        x: clampNumber(patch.x ?? selectedObject.transform.x, -maxX, maxX),
        y: clampNumber(patch.y ?? selectedObject.transform.y, -maxY, maxY),
      };
      setObjectTransform(selectedId, next);
      transformReadout("nudge", selectedId, next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

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
    const isAlreadySelected = selectedId === id;
    setSelectedId(id);
    setSurfaceTab("chamber");
    if (!isAlreadySelected) setInspectorTab("content");
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
      setShareNotice(dirty ? "Copied public URL. Save draft before sharing new edits." : "Copied public URL");
    } catch {
      setShareNotice(url);
    }
    window.setTimeout(() => setShareNotice(null), 3400);
  }

  function goToPreview() {
    if (dirty) {
      setShareNotice("Unsaved changes are local until Save draft. Preview opens the last saved draft.");
      window.setTimeout(() => setShareNotice(null), 3400);
    }
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
    setDeleteConfirmId(null);
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
        setDeleteConfirmId(selectedId);
        setInspectorTab("style");
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
  const publicUrlPath = `/presence/${v2State.slug || node.slug || String(nodeId)}`;
  const publicObjects = countPublicObjects(v2State);

  return (
    <div
      data-testid="presence-studio-v2-root"
      className={`presence-studio-v2 v2-cockpit${railOpen ? " rail-open" : " rail-closed"}${inspectorOpen ? " inspector-open" : " inspector-closed"}`}
    >
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

        <div className="v2-toolbar-group v2-drawer-actions">
          <button
            type="button"
            data-testid="presence-studio-v2-outline-toggle"
            className={`v2-btn${railOpen ? " active" : ""}`}
            aria-expanded={railOpen}
            aria-controls="presence-studio-v2-outline-panel"
            onClick={() => setRailOpen((current) => !current)}
          >
            Outline
          </button>
          <button
            type="button"
            data-testid="presence-studio-v2-inspector-toggle"
            className={`v2-btn${inspectorOpen ? " active" : ""}`}
            aria-expanded={inspectorOpen}
            aria-controls="presence-studio-v2-inspector-panel"
            onClick={() => setInspectorOpen((current) => !current)}
          >
            Inspector
          </button>
        </div>

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
          <button
            type="button"
            data-testid="presence-studio-v2-viewport-desktop"
            className={`v2-btn${viewport === "desktop" ? " active" : ""}`}
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            data-testid="presence-studio-v2-viewport-mobile"
            className={`v2-btn${viewport === "mobile" ? " active" : ""}`}
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            Mobile
          </button>
        </div>

        <div className="v2-toolbar-group">
          <button data-testid="studio-v2-open-worlds" className="v2-btn" onClick={() => setActivePanel(activePanel === "worlds" ? "none" : "worlds")}>World</button>
          <button data-testid="studio-v2-open-skin" className="v2-btn" onClick={() => setActivePanel(activePanel === "skin" ? "none" : "skin")}>Skin</button>
          <button data-testid="studio-v2-open-moodboard" className="v2-btn" onClick={() => setActivePanel(activePanel === "moodboard" ? "none" : "moodboard")}>Mood</button>
          <button data-testid="studio-v2-open-add" className="v2-btn" onClick={() => { setSelectedId(null); setActivePanel(activePanel === "add" ? "none" : "add"); }}>+ Add</button>
        </div>

        <div className="v2-toolbar-group">
          <button data-testid="presence-studio-v2-share-action" className="v2-btn" onClick={() => void handleShare()} title={publicUrlPath}>Share</button>
          <button data-testid="presence-studio-v2-preview-action" className="v2-btn" onClick={goToPreview}>Preview visitor view</button>
          <button data-testid="presence-studio-v2-publish-action" className="v2-btn" onClick={goToPreview}>Publish from preview</button>
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
          open={railOpen}
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
            <div className={`v2-stage-frame v2-device-${viewport}`}>
              <div className="v2-stage-frame-head">
                <span>{world?.name ?? v2State.worldId}</span>
                <strong>{activeChamber?.label ?? "Room"}</strong>
              </div>
              {interactionReadout && (
                <div data-testid="presence-studio-v2-drag-readout" className="v2-drag-readout">
                  <span>{interactionReadout.kind}</span>
                  <strong>
                    X {interactionReadout.x} / Y {interactionReadout.y} / {Math.round(interactionReadout.scale * 100)}% / {interactionReadout.rotation} deg
                  </strong>
                </div>
              )}
              <div
                data-testid="presence-studio-v2-device-frame"
                className={`v2-device-frame v2-device-frame-${viewport}`}
              >
                <div className="v2-device-chrome" aria-hidden="true">
                  <span className="v2-device-dots"><i /><i /><i /></span>
                  <span data-testid="presence-studio-v2-device-label" className="v2-device-label">
                    {viewport === "mobile" ? "Mobile public room preview" : "Desktop public room preview"}
                  </span>
                  <span className="v2-device-path">{publicUrlPath}</span>
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
                  onBeginDrag={beginObjectDrag}
                  onBeginResize={beginObjectResize}
                  onBeginRotate={beginObjectRotate}
                />
              </div>

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
          open={inspectorOpen}
          publicUrlPath={publicUrlPath}
          publicObjects={publicObjects}
          deleteConfirmId={deleteConfirmId}
          onRequestDelete={(id) => setDeleteConfirmId(id)}
          onCancelDelete={() => setDeleteConfirmId(null)}
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
  open,
  onToggleChamber,
  onSelectObject,
  onSelectChamber,
}: {
  state: StudioV2State;
  selectedId: string | null;
  activeChamberId: string | null;
  expandedChambers: Set<string>;
  open: boolean;
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
    <aside
      id="presence-studio-v2-outline-panel"
      data-testid="presence-studio-v2-outline"
      className={`v2-left-rail${open ? " is-open" : " is-collapsed"}`}
    >
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
  open,
  publicUrlPath,
  publicObjects,
  deleteConfirmId,
  onRequestDelete,
  onCancelDelete,
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
  open: boolean;
  publicUrlPath: string;
  publicObjects: number;
  deleteConfirmId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
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
  const linkHost = safeHost(object?.link);
  const deletePending = Boolean(object && deleteConfirmId === object.id);
  const objectBadges = object ? objectStateBadges(object, dirty) : [];
  const checklist = [
    { label: "Room title", ok: Boolean(state.title.trim()) },
    { label: "Public objects", ok: publicObjects > 0 },
    { label: "CTA path", ok: Boolean(state.cta.label || state.cta.href) },
    { label: "Mobile preview", ok: true },
  ];

  const updateObject = (patch: Partial<StudioV2Object>) => {
    if (!object) return;
    onUpdateObject({ ...object, ...patch });
  };

  const updateTransform = (patch: Partial<StudioV2Object["transform"]>) => {
    if (!object) return;
    updateObject({ transform: { ...object.transform, ...patch } });
  };

  return (
    <aside
      id="presence-studio-v2-inspector-panel"
      data-testid="presence-studio-v2-inspector"
      className={`v2-inspector${open ? " is-open" : " is-collapsed"}`}
    >
      <div className="v2-inspector-head">
        <span>{object ? "Object inspector" : "Room inspector"}</span>
        <strong>{object?.title || state.title}</strong>
      </div>

      {!object ? (
        <div className="v2-inspector-body">
          <div data-testid="presence-studio-v2-preview-confidence" className="v2-preview-confidence">
            <div>
              <span>Visitor confidence</span>
              <strong>{dirty ? "Save before sharing" : "Ready to preview"}</strong>
            </div>
            <p>
              Preview opens the owner-only visitor view. Publishing still happens through the real preview and publish flow.
            </p>
            <div className="v2-confidence-list">
              {checklist.map((item) => (
                <span key={item.label} className={item.ok ? "ok" : "warn"}>
                  {item.ok ? "Ready" : "Needs"}: {item.label}
                </span>
              ))}
            </div>
            <code>{publicUrlPath}</code>
          </div>

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
            {dirty && (
              <div className="v2-honest-note">
                Unsaved Studio changes are not in the backend draft until Save draft completes.
              </div>
            )}
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
              <div className="v2-inspector-section v2-object-content-panel">
                <div className="v2-inspector-section-title">
                  <span>Object content</span>
                  <strong className="v2-type-badge">{object.type}</strong>
                </div>
                <div data-testid="presence-studio-v2-object-state-summary" className="v2-object-state-summary">
                  {objectBadges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
                <div className="v2-object-preview-card">
                  {object.image?.src ? (
                    <img
                      data-testid="presence-studio-v2-inspector-image-preview"
                      src={object.image.src}
                      alt={object.image.alt || object.title}
                    />
                  ) : (
                    <div data-testid="presence-studio-v2-inspector-image-empty" className="v2-object-preview-empty">
                      No image URL assigned. This object will render as text/proof/CTA content.
                    </div>
                  )}
                  <div className="v2-object-preview-copy">
                    <span>{object.type}</span>
                    <strong>{object.title || "Untitled object"}</strong>
                    <p>
                      {object.visibility.public
                        ? "Visible in the public room."
                        : "Hidden from public visitors until visibility is enabled."}
                      {" "}
                      {object.visibility.mobile ? "Included on mobile." : "Hidden on mobile public view."}
                    </p>
                  </div>
                </div>
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
                <div data-testid="presence-studio-v2-inspector-link-status" className="v2-link-status">
                  <span>Link status</span>
                  <strong>{linkHost ? linkHost : "No link target set"}</strong>
                </div>
                <label className="v2-check-row">
                  <input
                    type="checkbox"
                    checked={object.visibility.public}
                    disabled={locked}
                    onChange={(event) => updateObject({ visibility: { ...object.visibility, public: event.target.checked } })}
                  />
                  <span>Shown in public room</span>
                </label>
                <label className="v2-check-row">
                  <input
                    type="checkbox"
                    checked={object.visibility.mobile}
                    disabled={locked}
                    onChange={(event) => updateObject({ visibility: { ...object.visibility, mobile: event.target.checked } })}
                  />
                  <span>Shown on mobile public view</span>
                </label>
                <div className="v2-honest-note">
                  These fields are visitor-facing when public visibility is enabled. Upload and crop tools are not part of this build.
                </div>
              </div>
            )}

            {inspectorTab === "style" && (
              <div className="v2-inspector-section v2-object-style-panel">
                <div className="v2-inspector-section-title">Object state</div>
                <div data-testid="presence-studio-v2-object-state-summary" className="v2-object-state-summary strong">
                  {objectBadges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
                <label className="v2-check-row v2-state-toggle">
                  <input type="checkbox" checked={object.locked} onChange={(event) => updateObject({ locked: event.target.checked })} />
                  <span><strong>Lock movement</strong><em>Prevents canvas drag, resize, rotation, and content edits.</em></span>
                </label>
                <label className="v2-check-row v2-state-toggle">
                  <input type="checkbox" checked={object.pinned} onChange={(event) => updateObject({ pinned: event.target.checked })} />
                  <span><strong>Pin in room</strong><em>Marks this object as intentionally fixed in the composition.</em></span>
                </label>
                <div className="v2-layer-summary">
                  <span>Layer position</span>
                  <strong>Z {object.transform.zIndex}</strong>
                </div>
                <div className="v2-inspector-grid">
                  <button type="button" className="v2-btn" onClick={() => updateTransform({ zIndex: Math.max(0, object.transform.zIndex - 1) })}>
                    Layer down
                  </button>
                  <button type="button" className="v2-btn" onClick={() => updateTransform({ zIndex: Math.min(999, object.transform.zIndex + 1) })}>
                    Layer up
                  </button>
                  <button type="button" className="v2-btn" onClick={() => onDuplicate(object.id)}>Duplicate</button>
                  <button
                    type="button"
                    className="v2-btn danger"
                    onClick={() => (deletePending ? onDelete(object.id) : onRequestDelete(object.id))}
                  >
                    {deletePending ? "Confirm delete object" : "Delete object"}
                  </button>
                </div>
                {deletePending && (
                  <div className="v2-delete-confirm">
                    <span>This removes the object from the draft after Save draft.</span>
                    <button type="button" className="v2-btn" onClick={onCancelDelete}>Cancel</button>
                  </div>
                )}
                <button type="button" className="v2-btn" onClick={onOpenSkin}>Room Skin Lab controls object material</button>
              </div>
            )}

            {inspectorTab === "motion" && (
              <div className="v2-inspector-section v2-object-motion-panel">
                <div className="v2-inspector-section-title">Transform</div>
                <div data-testid="presence-studio-v2-object-state-summary" className="v2-object-state-summary">
                  {objectBadges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
                <div data-testid="presence-studio-v2-motion-mode-note" className="v2-honest-note">
                  {locked
                    ? "This object is locked. Unlock it in Style before moving, resizing, or rotating."
                    : mode === "wild"
                      ? "Drag the selected object on the canvas. Use corner handles to scale and the top handle to rotate."
                      : "Guided Mode protects the layout. Switch to Wild Mode to move, scale, or rotate on the canvas."}
                </div>
                <div className="v2-motion-grid">
                  <div className="v2-axis-cluster">
                    <label className="v2-field">
                      <span>X</span>
                      <input
                        data-testid="presence-studio-v2-transform-x"
                        type="number"
                        value={object.transform.x}
                        disabled={locked}
                        onChange={(event) => updateTransform({ x: clampNumber(Number(event.target.value), EDITOR_MIN_POSITION, EDITOR_MAX_POSITION) })}
                      />
                    </label>
                    <div className="v2-stepper-row">
                      <button type="button" className="v2-stepper" disabled={locked} onClick={() => updateTransform({ x: clampNumber(object.transform.x - 10, EDITOR_MIN_POSITION, EDITOR_MAX_POSITION) })} aria-label="Move object left 10 pixels">-10</button>
                      <button type="button" data-testid="presence-studio-v2-transform-x-plus" className="v2-stepper" disabled={locked} onClick={() => updateTransform({ x: clampNumber(object.transform.x + 10, EDITOR_MIN_POSITION, EDITOR_MAX_POSITION) })} aria-label="Move object right 10 pixels">+10</button>
                    </div>
                  </div>
                  <div className="v2-axis-cluster">
                    <label className="v2-field">
                      <span>Y</span>
                      <input
                        data-testid="presence-studio-v2-transform-y"
                        type="number"
                        value={object.transform.y}
                        disabled={locked}
                        onChange={(event) => updateTransform({ y: clampNumber(Number(event.target.value), EDITOR_MIN_POSITION, EDITOR_MAX_POSITION) })}
                      />
                    </label>
                    <div className="v2-stepper-row">
                      <button type="button" className="v2-stepper" disabled={locked} onClick={() => updateTransform({ y: clampNumber(object.transform.y - 10, EDITOR_MIN_POSITION, EDITOR_MAX_POSITION) })} aria-label="Move object up 10 pixels">-10</button>
                      <button type="button" data-testid="presence-studio-v2-transform-y-plus" className="v2-stepper" disabled={locked} onClick={() => updateTransform({ y: clampNumber(object.transform.y + 10, EDITOR_MIN_POSITION, EDITOR_MAX_POSITION) })} aria-label="Move object down 10 pixels">+10</button>
                    </div>
                  </div>
                  <div className="v2-range-field">
                    <label className="v2-field">
                      <span>Scale</span>
                      <input
                        data-testid="presence-studio-v2-transform-scale"
                        type="number"
                        min={EDITOR_MIN_SCALE}
                        max={EDITOR_MAX_SCALE}
                        step="0.05"
                        value={object.transform.scale}
                        disabled={locked}
                        onChange={(event) => updateTransform({ scale: clampNumber(Number(event.target.value), EDITOR_MIN_SCALE, EDITOR_MAX_SCALE) })}
                      />
                    </label>
                    <input
                      data-testid="presence-studio-v2-transform-scale-slider"
                      className="v2-motion-slider"
                      type="range"
                      min={EDITOR_MIN_SCALE}
                      max={EDITOR_MAX_SCALE}
                      step="0.05"
                      value={object.transform.scale}
                      disabled={locked}
                      onChange={(event) => updateTransform({ scale: clampNumber(Number(event.target.value), EDITOR_MIN_SCALE, EDITOR_MAX_SCALE) })}
                      aria-label="Scale selected object"
                    />
                  </div>
                  <div className="v2-range-field">
                    <label className="v2-field">
                      <span>Rotation</span>
                      <input
                        data-testid="presence-studio-v2-transform-rotation"
                        type="number"
                        step="1"
                        value={object.transform.rotation}
                        disabled={locked}
                        onChange={(event) => updateTransform({ rotation: clampNumber(Number(event.target.value), -360, 360) })}
                      />
                    </label>
                    <input
                      data-testid="presence-studio-v2-transform-rotation-slider"
                      className="v2-motion-slider rotation"
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={clampNumber(object.transform.rotation, -180, 180)}
                      disabled={locked}
                      onChange={(event) => updateTransform({ rotation: clampNumber(Number(event.target.value), -360, 360) })}
                      aria-label="Rotate selected object"
                    />
                  </div>
                  <label className="v2-field">
                    <span>Z index</span>
                    <input
                      data-testid="presence-studio-v2-transform-z"
                      type="number"
                      value={object.transform.zIndex}
                      disabled={locked}
                      onChange={(event) => updateTransform({ zIndex: clampNumber(Number(event.target.value), 0, 999) })}
                    />
                  </label>
                  <div className="v2-motion-mode">
                    <span>Current mode</span>
                    <strong>{locked ? "Locked - handles disabled" : mode === "wild" ? "Wild direct manipulation" : "Guided layout protection"}</strong>
                    <em>{mode === "wild" && !locked ? "Canvas handles and numeric controls are live." : "Canvas handles are read-only in this state."}</em>
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
