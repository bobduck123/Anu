"use client";

import { useCallback, useEffect, useMemo, useState, useRef, type CSSProperties } from "react";
import type { PresenceNode } from "@/lib/api/types";
import {
  getPresenceEditor,
  patchPresenceEditorDraft,
  createPresenceEditorDraft,
  type PresenceEditorConfigInput,
} from "@/lib/api/editor";
import {
  deriveStudioV2AssetRegistry,
  presenceConfigFromStudioV2State,
  studioV2AssetStatusLabel,
  studioV2FromPresenceConfig,
  validateStudioV2AssetUrl,
} from "@/lib/presence/studio-v2";
import type {
  StudioV2AssetRegistry,
  StudioV2DerivedAsset,
  StudioV2MediaHealth,
  StudioV2MoodboardReference,
  StudioV2Object,
  StudioV2PublicStylePreset,
  StudioV2State,
  StudioV2ChamberRole,
  StudioV2ChamberMetadata,
} from "@/lib/presence/studio-v2";
import { normalizeStudioV2Composition, placementMoveError, STUDIO_V2_LAYOUTS, studioV2Layout, type PresenceStudioV2LayoutId, type StudioV2ChamberComposition, type StudioV2PlacementSize } from "@/lib/presence/studio-v2";
import PresenceStudioV2Room from "./PresenceStudioV2Room";
import { SkinLabSheet, AddObjectSheet, MoodboardSheet, WorldSwitcher } from "./PresenceStudioV2Panels";
import { PUBLIC_STYLE_PRESET_OPTIONS, WORLD_KITS } from "./worlds";
import { isPubliclyContainedPresenceSlug } from "@/lib/presence/publicContainment";
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

function StudioGuide({
  selectedObject,
  dirty,
  saving,
  publicObjects,
}: {
  selectedObject: StudioV2Object | null;
  dirty: boolean;
  saving: boolean;
  publicObjects: number;
}) {
  const message = saving
    ? "Saving your draft. Keep working here; this does not publish the room."
    : dirty
      ? "Your room has a new draft change. Ordinary edits save automatically; transformed objects need Save draft."
      : selectedObject
        ? selectedObject.visibility.public
          ? `You are shaping ${selectedObject.title}. Use Content for its words and Style for its treatment.`
          : `${selectedObject.title} is private to this room. Refine it here before deciding whether it belongs in the public composition.`
        : publicObjects === 0
          ? "Start with one public object in the current chamber, then use Preview to check the room's public projection."
          : "Choose a chamber or an object in the room. The inspector will only show controls that change that selection.";

  return (
    <aside data-testid="presence-studio-v2-guide" className="v2-studio-guide" aria-live="polite">
      <span className="v2-studio-guide-eyebrow">Studio guide</span>
      <p>{message}</p>
    </aside>
  );
}

function LayoutCompositionControls({
  chamber,
  selectedObject,
  onChange,
}: {
  chamber: StudioV2State["chambers"][number];
  selectedObject: StudioV2Object | null;
  onChange: (chamberId: string, composition: StudioV2ChamberComposition) => void;
}) {
  const composition = normalizeStudioV2Composition(chamber.composition, chamber.id, chamber.objects);
  const layout = studioV2Layout(composition.layoutId);
  const placement = selectedObject ? composition.placements.find((item) => item.objectId === selectedObject.id) : null;
  const update = (next: StudioV2ChamberComposition) => onChange(chamber.id, next);
  const setLayout = (layoutId: PresenceStudioV2LayoutId) => update(normalizeStudioV2Composition({ layoutId, placements: [] }, chamber.id, chamber.objects));
  const move = (zoneId: string) => {
    if (!selectedObject || !placement) return;
    const issue = placementMoveError(composition, selectedObject, zoneId);
    if (issue) return;
    update({ ...composition, placements: composition.placements.map((item) => item.objectId === selectedObject.id ? { ...item, zoneId, order: composition.placements.filter((candidate) => candidate.zoneId === zoneId).length } : item) });
  };
  const reorder = (offset: number) => {
    if (!placement) return;
    const peers = composition.placements.filter((item) => item.zoneId === placement.zoneId).sort((a, b) => a.order - b.order);
    const index = peers.findIndex((item) => item.objectId === placement.objectId);
    const target = peers[index + offset];
    if (!target) return;
    update({ ...composition, placements: composition.placements.map((item) => item.objectId === placement.objectId ? { ...item, order: target.order } : item.objectId === target.objectId ? { ...item, order: placement.order } : item) });
  };
  return (
    <section className="v2-layout-composer" data-testid="presence-studio-v2-layout-composer">
      <div className="v2-inspector-section-title">Chamber arrangement</div>
      <label className="v2-field"><span>Layout</span><select data-testid="presence-studio-v2-layout-select" value={layout.id} onChange={(event) => setLayout(event.target.value as PresenceStudioV2LayoutId)}>{STUDIO_V2_LAYOUTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <p className="v2-layout-help">{layout.description}</p>
      {selectedObject && placement ? (
        <div className="v2-layout-object-controls" data-testid="presence-studio-v2-placement-controls">
          <strong>{selectedObject.title}</strong>
          {!selectedObject.visibility.public && <p>This object is hidden from public visitors, so it will remain editor/private-preview only.</p>}
          <label className="v2-field"><span>Zone</span><select data-testid="presence-studio-v2-placement-zone" value={placement.zoneId} onChange={(event) => move(event.target.value)}>{layout.zones.map((zone) => <option key={zone.id} value={zone.id} disabled={Boolean(placementMoveError(composition, selectedObject, zone.id))}>{zone.label}</option>)}</select></label>
          <div className="v2-layout-actions"><button type="button" className="v2-btn" onClick={() => reorder(-1)}>Move up</button><button type="button" className="v2-btn" onClick={() => reorder(1)}>Move down</button></div>
          <label className="v2-field"><span>Scale in room</span><select data-testid="presence-studio-v2-placement-size" value={placement.size} onChange={(event) => update({ ...composition, placements: composition.placements.map((item) => item.objectId === placement.objectId ? { ...item, size: event.target.value as StudioV2PlacementSize } : item) })}>{(layout.zones.find((zone) => zone.id === placement.zoneId)?.allowedSizes ?? []).map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          {(layout.zones.find((zone) => zone.id === placement.zoneId)?.allowedTreatments?.length ?? 0) > 0 && <label className="v2-field"><span>Treatment</span><select data-testid="presence-studio-v2-placement-treatment" value={placement.treatment ?? "quiet"} onChange={(event) => update({ ...composition, placements: composition.placements.map((item) => item.objectId === placement.objectId ? { ...item, treatment: event.target.value as StudioV2ChamberComposition["placements"][number]["treatment"] } : item) })}>{layout.zones.find((zone) => zone.id === placement.zoneId)?.allowedTreatments?.map((treatment) => <option key={treatment} value={treatment}>{treatment}</option>)}</select></label>}
        </div>
      ) : <p className="v2-layout-help">Select an object to place it in a valid part of this chamber.</p>}
    </section>
  );
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
  const [canvasInteractionActive, setCanvasInteractionActive] = useState(false);
  const [autosaveNotBefore, setAutosaveNotBefore] = useState(0);
  const [canvasChangesNeedManualSave, setCanvasChangesNeedManualSave] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [brokenAssetObjectIds, setBrokenAssetObjectIds] = useState<Set<string>>(() => new Set());

  const roomRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const autosaveFailureSnapshotRef = useRef<string | null>(null);
  const autosaveNotBeforeRef = useRef(0);
  const canvasChangesNeedManualSaveRef = useRef(false);
  const latestV2StateRef = useRef<StudioV2State | null>(null);
  // React may preserve a toolbar button's DOM node while canvas state changes.
  // Keep the latest rendered draft available to its event handler.
  latestV2StateRef.current = v2State;

  const dirty = useMemo(
    () => Boolean(v2State && snapshot(v2State) !== baseSnapshot),
    [v2State, baseSnapshot],
  );

  const assetRegistry = useMemo(
    () => (v2State ? deriveStudioV2AssetRegistry(v2State, { brokenObjectIds: brokenAssetObjectIds }) : null),
    [v2State, brokenAssetObjectIds],
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
      canvasChangesNeedManualSaveRef.current = false;
      setCanvasChangesNeedManualSave(false);
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

  async function saveDraft(
    nextState: StudioV2State | null = latestV2StateRef.current,
    options: { automatic?: boolean } = {},
  ): Promise<boolean> {
    if (!nextState) return false;
    const requestedSnapshot = snapshot(nextState);
    if (options.automatic && autosaveFailureSnapshotRef.current === requestedSnapshot) return false;
    if (!options.automatic) autosaveFailureSnapshotRef.current = null;
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
        const savedSnapshot = snapshot(savedState);
        setV2State((current) => (current && snapshot(current) === requestedSnapshot ? savedState : current));
        setBaseSnapshot(savedSnapshot);
        setHasDraft(true);
        if (!options.automatic) {
          canvasChangesNeedManualSaveRef.current = false;
          setCanvasChangesNeedManualSave(false);
        }
        setNotice(
          options.automatic
            ? "Autosaved just now"
            : hasDraft
              ? "Saved - just now"
              : "Draft room created - saved just now",
        );
      }
      void onNodeReload?.();
      return true;
    } catch (err) {
      if (options.automatic) autosaveFailureSnapshotRef.current = requestedSnapshot;
      setActionError(
        options.automatic
          ? `Autosave failed. Your changes are still here; retry Save draft. ${err instanceof Error ? err.message : ""}`.trim()
          : err instanceof Error
            ? err.message
            : "Save failed",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!v2State || !dirty || saving || canvasInteractionActive || canvasChangesNeedManualSave) return;
    const currentSnapshot = snapshot(v2State);
    if (autosaveFailureSnapshotRef.current === currentSnapshot) return;
    const timer = window.setTimeout(() => {
      if (
        interactionRef.current ||
        canvasChangesNeedManualSaveRef.current ||
        Date.now() < autosaveNotBeforeRef.current
      ) return;
      void saveDraft(v2State, { automatic: true });
    }, Math.max(1200, autosaveNotBefore - Date.now()));
    return () => window.clearTimeout(timer);
  }, [autosaveNotBefore, canvasChangesNeedManualSave, canvasInteractionActive, dirty, saving, v2State]);

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

  function updateChamberComposition(chamberId: string, composition: StudioV2ChamberComposition) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((chamber) => chamber.id === chamberId
        ? { ...chamber, composition: normalizeStudioV2Composition(composition, chamber.id, chamber.objects) }
        : chamber),
    }));
  }

  function moveObjectToZone(objectId: string, chamberId: string, zoneId: string): string | null {
    const chamber = v2State?.chambers.find((item) => item.id === chamberId);
    const object = chamber?.objects.find((item) => item.id === objectId);
    if (!chamber || !object) return "This object is no longer available in this chamber.";
    const composition = normalizeStudioV2Composition(chamber.composition, chamber.id, chamber.objects);
    const issue = placementMoveError(composition, object, zoneId);
    if (issue) return issue;
    const zone = studioV2Layout(composition.layoutId).zones.find((item) => item.id === zoneId);
    if (!zone) return "This part of the room is not available in the current layout.";
    updateChamberComposition(chamberId, {
      ...composition,
      placements: composition.placements.map((placement) => placement.objectId === objectId
        ? { ...placement, zoneId, order: composition.placements.filter((item) => item.zoneId === zoneId && item.objectId !== objectId).length, size: zone.allowedSizes.includes(placement.size) ? placement.size : zone.defaultSize, treatment: zone.allowedTreatments?.includes(placement.treatment as never) ? placement.treatment : zone.allowedTreatments?.[0] }
        : placement),
    });
    return null;
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
    canvasChangesNeedManualSaveRef.current = true;
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
    // A canvas gesture may comprise several pointer updates. Keep its persistence
    // explicit rather than race an in-flight snapshot against the active canvas.
    setCanvasChangesNeedManualSave(true);
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
    setCanvasInteractionActive(false);
    // Canvas transforms can involve several short pointer gestures. Wait for that
    // sequence to settle before serialising a snapshot, so autosave never replaces
    // the active selection while it is being manipulated.
    const nextAutosaveWindow = Date.now() + 2400;
    autosaveNotBeforeRef.current = nextAutosaveWindow;
    setAutosaveNotBefore(nextAutosaveWindow);
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
    // The ref closes the small gap before React can rerender the autosave effect.
    autosaveNotBeforeRef.current = Date.now() + 2400;
    setCanvasInteractionActive(true);
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

  function selectObject(id: string, options: { assetId?: string } = {}) {
    const isAlreadySelected = selectedId === id;
    setSelectedId(id);
    setSelectedAssetId(options.assetId ?? null);
    setSurfaceTab("chamber");
    if (!isAlreadySelected) setInspectorTab("content");
    setActivePanel("none");
    const chamber = v2State?.chambers.find((ch) => ch.objects.some((obj) => obj.id === id));
    if (chamber) setActiveChamberId(chamber.id);
    scrollToObject(id);
  }

  function selectAsset(assetId: string) {
    const asset = assetRegistry?.assets.find((candidate) => candidate.id === assetId);
    if (!asset) return;
    selectObject(asset.objectId, { assetId: asset.id });
    setInspectorOpen(true);
  }

  function replaceAssetUrl(objectId: string, value: string) {
    const object = findObject(objectId);
    if (!object) return;
    const src = value.trim();
    updateObject(objectId, {
      image: src ? { src, alt: object.image?.alt || object.title || "Room image" } : undefined,
    });
    setBrokenAssetObjectIds((current) => {
      const next = new Set(current);
      next.delete(objectId);
      return next;
    });
  }

  function markAssetBroken(objectId: string) {
    setBrokenAssetObjectIds((current) => {
      if (current.has(objectId)) return current;
      const next = new Set(current);
      next.add(objectId);
      return next;
    });
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
    if (isPubliclyContainedPresenceSlug(slug)) {
      setShareNotice("This private working proof has no shareable public link.");
      window.setTimeout(() => setShareNotice(null), 3400);
      return;
    }
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

  // ── Chamber helpers ──
  function handleAddChamber() {
    const nextIndex = (v2State?.chambers.length ?? 0) + 1;
    const newChamber = {
      id: makeId("chamber"),
      label: `Chamber ${nextIndex}`,
      objects: [] as StudioV2Object[],
      metadata: { role: "custom" as StudioV2ChamberRole },
    };
    updateState((prev) => ({
      ...prev,
      chambers: [...prev.chambers, newChamber],
    }));
    setExpandedChambers((current) => {
      const next = new Set(current);
      next.add(newChamber.id);
      return next;
    });
    setActiveChamberId(newChamber.id);
    scrollToChamber(newChamber.id);
  }

  function handleRenameChamber(id: string, label: string) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((ch) => (ch.id === id ? { ...ch, label } : ch)),
    }));
  }

  function handleMoveChamber(id: string, direction: "up" | "down") {
    updateState((prev) => {
      const idx = prev.chambers.findIndex((ch) => ch.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.chambers.length) return prev;
      const next = [...prev.chambers];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return { ...prev, chambers: next };
    });
  }

  function updateChamberMetadata(chamberId: string, patch: Partial<StudioV2ChamberMetadata>) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((ch) =>
        ch.id === chamberId
          ? { ...ch, metadata: { ...ch.metadata, ...patch } }
          : ch
      ),
    }));
  }

  function setChamberEntry(chamberId: string) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((ch) => {
        if (ch.id === chamberId) {
          return { ...ch, metadata: { ...ch.metadata, isEntry: true } };
        }
        const nextMeta = { ...ch.metadata };
        delete nextMeta.isEntry;
        return { ...ch, metadata: nextMeta };
      }),
    }));
  }

  function setChamberDefault(chamberId: string) {
    updateState((prev) => ({
      ...prev,
      chambers: prev.chambers.map((ch) => {
        if (ch.id === chamberId) {
          return { ...ch, metadata: { ...ch.metadata, isDefault: true } };
        }
        const nextMeta = { ...ch.metadata };
        delete nextMeta.isDefault;
        return { ...ch, metadata: nextMeta };
      }),
    }));
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
  const saveStatus = saving
    ? "Saving draft"
    : dirty
      ? canvasChangesNeedManualSave
        ? "Canvas changes pending - save draft to preserve them"
        : "Changes pending - autosaves shortly"
      : notice ?? "Saved";
  const publicUrlPath = `/presence/${v2State.slug || node.slug || String(nodeId)}`;
  const isPrivateProof =
    isPubliclyContainedPresenceSlug(v2State.slug) || isPubliclyContainedPresenceSlug(node.slug);
  const publicObjects = countPublicObjects(v2State);
  const assetRegistryForRender = assetRegistry ?? deriveStudioV2AssetRegistry(v2State, { brokenObjectIds: brokenAssetObjectIds });
  const selectedAssetForRender = assetRegistryForRender.assets.find((asset) => asset.id === selectedAssetId) ?? null;

  return (
    <div
      data-testid="presence-studio-v2-root"
      className={`presence-studio-v2 v2-cockpit${railOpen ? " rail-open" : " rail-closed"}${inspectorOpen ? " inspector-open" : " inspector-closed"}${selectedObject ? " has-object-focus" : ""}${activePanel !== "none" ? " overlay-open" : ""}`}
      style={{ "--p-copper": v2State.skin.accentColor } as CSSProperties}
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
          {isPrivateProof ? (
            <span data-testid="presence-studio-v2-private-proof" className="v2-save-status">
              Private working proof
            </span>
          ) : (
            <>
              <button data-testid="presence-studio-v2-share-action" className="v2-btn" onClick={() => void handleShare()} title={publicUrlPath}>Share</button>
              <button data-testid="presence-studio-v2-publish-action" className="v2-btn" onClick={goToPreview}>Publish from preview</button>
            </>
          )}
          <button data-testid="presence-studio-v2-preview-action" className="v2-btn" onClick={goToPreview}>Preview draft</button>
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
          assetRegistry={assetRegistryForRender}
          selectedId={selectedId}
          selectedAssetId={selectedAssetId}
          activeChamberId={activeChamber?.id ?? null}
          expandedChambers={expandedChambers}
          open={railOpen}
          onToggleChamber={toggleChamberExpanded}
          onSelectObject={selectObject}
          onSelectAsset={selectAsset}
          onSelectChamber={scrollToChamber}
          onAssetError={markAssetBroken}
          onAddChamber={handleAddChamber}
          onRenameChamber={handleRenameChamber}
          onMoveChamber={handleMoveChamber}
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

          <StudioGuide
            selectedObject={selectedObject}
            dirty={dirty}
            saving={saving}
            publicObjects={publicObjects}
          />

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
            activeChamberId={activeChamberId}
                  mode={mode}
                  viewport={viewport}
                  onSelectObject={(id) => {
                  if (id) selectObject(id);
                  else setSelectedId(null);
                }}
                onClearRoomFocus={() => setActiveChamberId(null)}
                  onBeginDrag={beginObjectDrag}
                  onBeginResize={beginObjectResize}
                onBeginRotate={beginObjectRotate}
                onMoveToZone={moveObjectToZone}
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
          selectedAsset={selectedAssetForRender}
          assetRegistry={assetRegistryForRender}
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
          onUpdatePublicStylePreset={(publicStylePreset) => updateState((prev) => ({ ...prev, publicStylePreset }))}
          onUpdateObject={(obj) => updateObject(obj.id, obj)}
          onReplaceAssetUrl={replaceAssetUrl}
          onSelectObject={(id) => selectObject(id)}
          onAssetError={markAssetBroken}
          onOpenWorlds={() => setActivePanel("worlds")}
          onOpenSkin={() => setActivePanel("skin")}
          onDuplicate={handleDuplicateObject}
          onDelete={handleDeleteObject}
          onUpdateChamberMetadata={updateChamberMetadata}
          onSetChamberEntry={setChamberEntry}
          onSetChamberDefault={setChamberDefault}
          activeChamberId={activeChamberId}
          onUpdateChamberComposition={updateChamberComposition}
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
  assetRegistry,
  selectedId,
  selectedAssetId,
  activeChamberId,
  expandedChambers,
  open,
  onToggleChamber,
  onSelectObject,
  onSelectAsset,
  onSelectChamber,
  onAssetError,
  onAddChamber,
  onRenameChamber,
  onMoveChamber,
}: {
  state: StudioV2State;
  assetRegistry: StudioV2AssetRegistry;
  selectedId: string | null;
  selectedAssetId: string | null;
  activeChamberId: string | null;
  expandedChambers: Set<string>;
  open: boolean;
  onToggleChamber: (id: string) => void;
  onSelectObject: (id: string) => void;
  onSelectAsset: (id: string) => void;
  onSelectChamber: (id: string) => void;
  onAssetError: (objectId: string) => void;
  onAddChamber: () => void;
  onRenameChamber: (id: string, label: string) => void;
  onMoveChamber: (id: string, direction: "up" | "down") => void;
}) {
  const assets = assetRegistry.assets;

  return (
    <aside
      id="presence-studio-v2-outline-panel"
      data-testid="presence-studio-v2-outline"
      className={`v2-left-rail${open ? " is-open" : " is-collapsed"}`}
    >
      <section className="v2-rail-section">
        <div className="v2-rail-title">
          <span>Room outline</span>
          <div className="v2-rail-title-actions">
            <strong>{state.chambers.length}</strong>
            <button
              type="button"
              data-testid="presence-studio-v2-add-chamber"
              className="v2-btn v2-add-chamber-btn"
              onClick={onAddChamber}
              title="Add chamber"
            >
              + Chamber
            </button>
          </div>
        </div>
        <div className="v2-outline-tree">
          {state.chambers.map((chamber, index) => {
            const expanded = expandedChambers.has(chamber.id);
            const active = activeChamberId === chamber.id;
            const roleLabel = chamber.metadata?.role && chamber.metadata.role !== "custom"
              ? chamber.metadata.role
              : null;
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
                  <InlineRename
                    value={chamber.label}
                    onCommit={(label) => onRenameChamber(chamber.id, label)}
                    onClick={() => onSelectChamber(chamber.id)}
                    testId={`presence-studio-v2-chamber-rename-${chamber.id}`}
                  />
                  <span className="v2-outline-chamber-count">{chamber.objects.length}</span>
                </div>
                {roleLabel && (
                  <div className="v2-outline-chamber-role-badge">
                    <span>{roleLabel}</span>
                    {chamber.metadata?.isEntry && <span className="v2-entry-badge">Entry</span>}
                  </div>
                )}
                <div className="v2-outline-chamber-actions">
                  <button
                    type="button"
                    data-testid={`presence-studio-v2-chamber-move-up-${chamber.id}`}
                    className="v2-btn v2-chamber-action"
                    disabled={index === 0}
                    onClick={() => onMoveChamber(chamber.id, "up")}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    data-testid={`presence-studio-v2-chamber-move-down-${chamber.id}`}
                    className="v2-btn v2-chamber-action"
                    disabled={index === state.chambers.length - 1}
                    onClick={() => onMoveChamber(chamber.id, "down")}
                    title="Move down"
                  >
                    ↓
                  </button>
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

      <section data-testid="presence-studio-v2-assets-panel" className="v2-rail-section v2-assets-panel">
        <div className="v2-rail-title">
          <span>Room Assets</span>
          <strong>{assets.length}</strong>
        </div>
        <p className="v2-quiet-copy">Derived from objects in this room. Upload library later.</p>
        <MediaHealthChecklist health={assetRegistry.health} />
        {assets.length === 0 ? (
          <p className="v2-quiet-copy">No image or media objects in this draft yet. Add image URLs through object content fields.</p>
        ) : (
          <div className="v2-assets-grid">
            {assets.map((asset) => (
              <article
                key={asset.id}
                data-testid="presence-studio-v2-asset-card"
                className={`v2-asset-card${selectedAssetId === asset.id || selectedId === asset.objectId ? " active" : ""}`}
              >
                <button
                  type="button"
                  data-testid="presence-studio-v2-asset-thumbnail"
                  className="v2-asset-thumb"
                  onClick={() => onSelectAsset(asset.id)}
                  aria-label={`Inspect asset used in ${asset.objectTitle}`}
                >
                  {asset.src ? (
                    <img src={asset.src} alt={asset.alt} onError={() => onAssetError(asset.objectId)} />
                  ) : (
                    <span>Missing URL</span>
                  )}
                </button>
                <div className="v2-asset-card-copy">
                  <strong>{asset.objectTitle}</strong>
                  <span>{asset.chamberLabel} / {asset.objectType}</span>
                  <div className="v2-asset-status-row">
                    {asset.statuses.map((status) => (
                      <span
                        key={status}
                        data-testid="presence-studio-v2-asset-status"
                        className={`v2-asset-status status-${status}`}
                      >
                        {studioV2AssetStatusLabel(status)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="v2-asset-card-actions">
                  <button
                    type="button"
                    data-testid="presence-studio-v2-asset-used-in"
                    className="v2-link-button"
                    onClick={() => onSelectObject(asset.objectId)}
                  >
                    Used in {asset.chamberLabel}
                  </button>
                  <button
                    type="button"
                    className="v2-link-button"
                    onClick={() => onSelectAsset(asset.id)}
                  >
                    Replace URL
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

function MediaHealthChecklist({ health }: { health: StudioV2MediaHealth }) {
  const items = [
    { label: "Total media assets", value: health.total, state: "neutral" },
    { label: "Missing URLs", value: health.missingUrls, state: health.missingUrls > 0 ? "warn" : "ok" },
    { label: "Broken/unloaded thumbnails", value: health.brokenOrUnloaded, state: health.brokenOrUnloaded > 0 ? "warn" : "ok" },
    { label: "Suspected test assets", value: health.suspectedTestAssets, state: health.suspectedTestAssets > 0 ? "warn" : "ok" },
    { label: "Duplicate URLs", value: health.duplicateUrls, state: health.duplicateUrls > 0 ? "notice" : "ok" },
    { label: "External URLs", value: health.externalUrls, state: health.externalUrls > 0 ? "notice" : "ok" },
    { label: "Public-visible media", value: health.publicVisible, state: "neutral" },
    { label: "Mobile-visible media", value: health.mobileVisible, state: "neutral" },
  ] as const;

  return (
    <div data-testid="presence-studio-v2-media-health" className="v2-media-health" aria-label="Room media health checklist">
      {items.map((item) => (
        <div
          key={item.label}
          data-testid="presence-studio-v2-media-health-item"
          className={`v2-media-health-item ${item.state}`}
        >
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function AssetDetailPanel({
  asset,
  registryTotal,
  locked,
  onReplaceUrl,
  onSelectObject,
  onOpenObjectInspector,
  onAssetError,
}: {
  asset: StudioV2DerivedAsset;
  registryTotal: number;
  locked: boolean;
  onReplaceUrl: (value: string) => void;
  onSelectObject: () => void;
  onOpenObjectInspector: () => void;
  onAssetError: () => void;
}) {
  const validation = validateStudioV2AssetUrl(asset.src);
  const validationMessages = [
    validation.empty ? "Empty URL: this object has no image source." : "",
    validation.unsupportedProtocol ? "Unsupported protocol. Use a public /path, http, or https URL." : "",
    validation.possibleTestAsset ? "Possible test asset: URL includes smoke/test terms." : "",
    validation.externalUrl ? "External URL: confirm the file is public, stable, and approved." : "",
    validation.localPublicAsset ? "Local/public asset path." : "",
    asset.statuses.includes("broken-unloaded") ? "Preview failed to load in this editor session." : "",
    asset.usageCount > 1
      ? `Duplicate URL appears in ${asset.usageCount} objects. This S5 flow replaces the selected object only; multi-replace arrives later.`
      : "",
    locked ? "This object is locked. Unlock it in Style before replacing its image URL." : "",
  ].filter(Boolean);

  return (
    <section className="v2-asset-detail" aria-label="Selected asset detail">
      <div className="v2-inspector-section-title">
        <span>Asset detail</span>
        <strong>{registryTotal} in room</strong>
      </div>
      <div className="v2-asset-detail-preview">
        {asset.src ? (
          <img src={asset.src} alt={asset.alt} onError={onAssetError} />
        ) : (
          <div className="v2-asset-detail-empty">Missing image URL</div>
        )}
      </div>
      <div className="v2-asset-status-row detail">
        {asset.statuses.map((status) => (
          <span
            key={status}
            data-testid="presence-studio-v2-asset-status"
            className={`v2-asset-status status-${status}`}
          >
            {studioV2AssetStatusLabel(status)}
          </span>
        ))}
      </div>
      <label className="v2-field">
        <span>Full URL</span>
        <input readOnly value={asset.src || "No URL"} title={asset.src || "No URL"} onFocus={(event) => event.currentTarget.select()} />
      </label>
      <label className="v2-field">
        <span>Replace image URL</span>
        <input
          data-testid="presence-studio-v2-asset-replace-url"
          value={asset.src}
          disabled={locked}
          placeholder="/public/path/or/https-url.webp"
          onChange={(event) => onReplaceUrl(event.target.value)}
        />
      </label>
      <dl className="v2-asset-detail-facts">
        <div><dt>Object</dt><dd>{asset.objectTitle}</dd></div>
        <div><dt>Type</dt><dd>{asset.objectType}</dd></div>
        <div><dt>Used in</dt><dd>{asset.chamberLabel}</dd></div>
        <div><dt>Public</dt><dd>{asset.publicVisible ? "Public" : "Hidden from public"}</dd></div>
        <div><dt>Mobile</dt><dd>{asset.mobileVisible ? "Mobile-visible" : "Hidden on mobile"}</dd></div>
        <div><dt>Threshold</dt><dd>{asset.thresholdContext ? "Threshold/hero context" : "Chamber object"}</dd></div>
      </dl>
      {validationMessages.length > 0 && (
        <div className="v2-asset-warnings">
          {validationMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      <div className="v2-asset-detail-actions">
        <button type="button" data-testid="presence-studio-v2-asset-used-in" className="v2-btn" onClick={onSelectObject}>
          Select object
        </button>
        <button type="button" className="v2-btn" onClick={onOpenObjectInspector}>
          Open object inspector
        </button>
      </div>
      <div className="v2-honest-note">
        Derived from current room objects. Upload library arrives later.
      </div>
    </section>
  );
}

function StudioInspectorPanel({
  state,
  selectedObject,
  selectedAsset,
  assetRegistry,
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
  onUpdatePublicStylePreset,
  onUpdateObject,
  onReplaceAssetUrl,
  onSelectObject,
  onAssetError,
  onOpenWorlds,
  onOpenSkin,
  onDuplicate,
  onDelete,
  onUpdateChamberMetadata,
  onSetChamberEntry,
  onSetChamberDefault,
  activeChamberId,
  onUpdateChamberComposition,
}: {
  state: StudioV2State;
  selectedObject: StudioV2Object | null;
  selectedAsset: StudioV2DerivedAsset | null;
  assetRegistry: StudioV2AssetRegistry;
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
  onUpdatePublicStylePreset: (publicStylePreset: StudioV2PublicStylePreset) => void;
  onUpdateObject: (object: StudioV2Object) => void;
  onReplaceAssetUrl: (objectId: string, value: string) => void;
  onSelectObject: (id: string) => void;
  onAssetError: (objectId: string) => void;
  onOpenWorlds: () => void;
  onOpenSkin: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateChamberMetadata: (chamberId: string, patch: Partial<StudioV2ChamberMetadata>) => void;
  onSetChamberEntry: (chamberId: string) => void;
  onSetChamberDefault: (chamberId: string) => void;
  activeChamberId: string | null;
  onUpdateChamberComposition: (chamberId: string, composition: StudioV2ChamberComposition) => void;
}) {
  const object = selectedObject;
  const world = WORLD_KITS.find((kit) => kit.id === state.worldId);
  const locked = Boolean(object?.locked);
  const linkHost = safeHost(object?.link);
  const deletePending = Boolean(object && deleteConfirmId === object.id);
  const objectBadges = object ? objectStateBadges(object, dirty) : [];
  const registryTotal = assetRegistry.health.total;
  const currentStylePreset = PUBLIC_STYLE_PRESET_OPTIONS.find((option) => option.id === state.publicStylePreset) ??
    PUBLIC_STYLE_PRESET_OPTIONS[0];
  const checklist = [
    { label: "Room title", ok: Boolean(state.title.trim()) },
    { label: "Public objects", ok: publicObjects > 0 },
    { label: "CTA path", ok: Boolean(state.cta.label || state.cta.href) },
    { label: "Mobile preview", ok: true },
  ];
  const activeChamber = state.chambers.find((ch) => ch.id === activeChamberId) ?? state.chambers[0] ?? null;

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

      {activeChamber && (
        <LayoutCompositionControls
          chamber={activeChamber}
          selectedObject={object}
          onChange={onUpdateChamberComposition}
        />
      )}

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
            <div className="v2-inspector-section-title">Public output style</div>
            <div
              className="v2-public-style-selector"
              data-testid="presence-studio-v2-public-style-selector"
            >
              <div className="v2-public-style-current" data-testid="presence-studio-v2-public-style-current">
                <span>Current style</span>
                <strong>{currentStylePreset.label}</strong>
              </div>
              <div className="v2-public-style-options" role="radiogroup" aria-label="Public output style">
                {PUBLIC_STYLE_PRESET_OPTIONS.map((option) => {
                  const selected = option.id === state.publicStylePreset;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid="presence-studio-v2-public-style-option"
                      data-style-preset={option.id}
                      className={`v2-public-style-option${selected ? " is-selected" : ""}`}
                      onClick={() => onUpdatePublicStylePreset(option.id)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="v2-honest-note">
                Style controls public presentation only. Room content, assets, and publish flow stay unchanged.
              </div>
            </div>
          </div>

          <div className="v2-inspector-section">
            <div className="v2-inspector-section-title">Chamber dynamics</div>
            {activeChamber ? (
              <div data-testid="presence-studio-v2-chamber-dynamics">
                <div className="v2-inspector-row">
                  <span>Active chamber</span>
                  <strong>{activeChamber.label}</strong>
                </div>
                <label className="v2-field">
                  <span>Role</span>
                  <select
                    data-testid="presence-studio-v2-chamber-role"
                    value={activeChamber.metadata?.role || "custom"}
                    onChange={(e) => onUpdateChamberMetadata(activeChamber.id, { role: e.target.value as StudioV2ChamberRole })}
                  >
                    {["threshold","gallery","practice","about","archive","contact","index","custom"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="v2-field">
                  <span>Layout hint</span>
                  <select
                    data-testid="presence-studio-v2-chamber-layout"
                    value={activeChamber.metadata?.layout || "stack"}
                    onChange={(e) => onUpdateChamberMetadata(activeChamber.id, { layout: e.target.value as StudioV2ChamberMetadata["layout"] })}
                  >
                    {["stack","focus","grid","sequence","wall","field"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="v2-field">
                  <span>Transition hint</span>
                  <select
                    data-testid="presence-studio-v2-chamber-transition"
                    value={activeChamber.metadata?.transition || "none"}
                    onChange={(e) => onUpdateChamberMetadata(activeChamber.id, { transition: e.target.value as StudioV2ChamberMetadata["transition"] })}
                  >
                    {["none","fade","slide","recede","portal","snap"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="v2-field">
                  <span>Description</span>
                  <textarea
                    data-testid="presence-studio-v2-chamber-description"
                    value={activeChamber.metadata?.description || ""}
                    onChange={(e) => onUpdateChamberMetadata(activeChamber.id, { description: e.target.value })}
                    placeholder="What visitors see or feel in this chamber"
                  />
                </label>
                <label className="v2-check-row v2-state-toggle">
                  <input
                    type="checkbox"
                    data-testid="presence-studio-v2-chamber-entry-toggle"
                    checked={activeChamber.metadata?.isEntry === true}
                    onChange={(e) => e.target.checked ? onSetChamberEntry(activeChamber.id) : onUpdateChamberMetadata(activeChamber.id, { isEntry: undefined })}
                  />
                  <span>
                    <strong>Entry chamber</strong>
                    <em>Visitors land here first. Only one chamber can be the entry.</em>
                  </span>
                </label>
                <label className="v2-check-row v2-state-toggle">
                  <input
                    type="checkbox"
                    data-testid="presence-studio-v2-chamber-default-toggle"
                    checked={activeChamber.metadata?.isDefault === true}
                    onChange={(e) => e.target.checked ? onSetChamberDefault(activeChamber.id) : onUpdateChamberMetadata(activeChamber.id, { isDefault: undefined })}
                  />
                  <span>
                    <strong>Default chamber</strong>
                    <em>Fallback when no entry is set. Only one chamber can be the default.</em>
                  </span>
                </label>
                <div className="v2-honest-note">
                  Chambers shape how visitors move through the room. Public styles may use these roles differently. Transitions are saved as movement hints — advanced timeline controls arrive later.
                </div>
              </div>
            ) : (
              <div className="v2-honest-note">No chambers available. Add a chamber from the outline.</div>
            )}
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
            {selectedAsset && (
              <AssetDetailPanel
                asset={selectedAsset}
                registryTotal={registryTotal}
                locked={locked}
                onReplaceUrl={(value) => onReplaceAssetUrl(selectedAsset.objectId, value)}
                onSelectObject={() => onSelectObject(selectedAsset.objectId)}
                onOpenObjectInspector={() => onSetInspectorTab("content")}
                onAssetError={() => onAssetError(selectedAsset.objectId)}
              />
            )}

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

/* ─── Inline Rename ─── */
function InlineRename({
  value,
  onCommit,
  onClick,
  testId,
}: {
  value: string;
  onCommit: (label: string) => void;
  onClick?: () => void;
  testId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    setEditing(false);
    setDraft(value);
  }

  function cancel() {
    setEditing(false);
    setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        data-testid={testId}
        className="v2-inline-rename"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") cancel();
        }}
      />
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      className="v2-outline-chamber-name"
      onClick={() => { onClick?.(); setEditing(true); }}
      title="Click to select and rename"
    >
      {value}
    </button>
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
