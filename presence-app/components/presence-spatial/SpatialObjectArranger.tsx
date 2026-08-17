"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  addArrangerComponent,
  assignArrangerMedia,
  createBlankMobstarSpatialRoom,
  isArrangerMediaParent,
  isArrangerMovablePlacement,
  listArrangerCompatibleMedia,
  moveArrangerPlacement,
  moveArrangerPlacementTo,
  reorderArrangerPiece,
  rotateArrangerPlacement,
} from "@/lib/presence/spatial/arranger";
import { compileSpatialRoom } from "@/lib/presence/spatial/compile";
import { BBB_PROJECTION_WALL_FIXTURE } from "@/lib/presence/spatial/fixtures/bbbProjectionWall";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "@/lib/presence/spatial/fixtures/mobstar";
import { MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE } from "@/lib/presence/spatial/fixtures/mobstarGate4";
import type {
  SpatialDraftEnvelope,
  SpatialPlacement,
  SpatialRoomDefinition,
  SpatialValidationIssue,
} from "@/lib/presence/spatial/model";
import { resolveSpatialPlacementTransform } from "@/lib/presence/spatial/placement";
import { spatialComponent } from "@/lib/presence/spatial/registry";
import {
  SpatialDraftStorage,
  createSpatialDraftEnvelope,
  decodeSpatialDraftEnvelope,
  encodeSpatialDraftEnvelope,
} from "@/lib/presence/spatial/storage";
import { SpatialRoomViewport } from "./SpatialRoomViewport";
import styles from "./SpatialObjectArranger.module.css";

const ADDABLE_COMPONENTS = [
  { componentId: "presence.wall-panel", label: "Wall" },
  { componentId: "presence.divider-wall", label: "Divider" },
  { componentId: "presence.display-table", label: "Table" },
  { componentId: "presence.retail-rack", label: "Rack" },
  { componentId: "presence.display-plinth", label: "Plinth" },
  { componentId: "presence.projection-wall", label: "Projection wall" },
] as const;

const EDITOR_COMPONENT_IDS: ReadonlySet<string> = new Set(ADDABLE_COMPONENTS.map((entry) => entry.componentId));
const MAX_IMPORT_BYTES = 256 * 1024;

type PreviewSource = "current" | "saved";

type ArrangerMutationResult =
  | { ok: true; room: SpatialRoomDefinition }
  | { ok: false; room: SpatialRoomDefinition; issues: readonly SpatialValidationIssue[] };

export function SpatialObjectArranger() {
  const initialRoom = useMemo(() => cloneRoom(MOBSTAR_SPATIAL_ROOM_FIXTURE), []);
  const [room, setRoom] = useState<SpatialRoomDefinition>(initialRoom);
  const [baselineRoom, setBaselineRoom] = useState<SpatialRoomDefinition>(initialRoom);
  const [workspaceLabel, setWorkspaceLabel] = useState("Mobstar fixture");
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>();
  const [selectedMediaId, setSelectedMediaId] = useState(initialRoom.media[0]?.id ?? "");
  const [draggingPlacementId, setDraggingPlacementId] = useState<string>();
  const [diagnostics, setDiagnostics] = useState<readonly SpatialValidationIssue[]>([]);
  const [status, setStatus] = useState("Loaded the bundled Mobstar proof fixture.");
  const [savedEnvelope, setSavedEnvelope] = useState<SpatialDraftEnvelope | null>(null);
  const [hasPreviousGeneration, setHasPreviousGeneration] = useState(false);
  const [previewSource, setPreviewSource] = useState<PreviewSource>("current");
  const importInputRef = useRef<HTMLInputElement>(null);
  const importOperationRef = useRef(0);
  const draggingPlacementIdRef = useRef<string | undefined>(undefined);

  const currentCompile = useMemo(() => compileSpatialRoom(room), [room]);
  const initialFingerprint = useMemo(() => {
    const compiled = compileSpatialRoom(initialRoom);
    return compiled.ok ? compiled.plan.fingerprint : "invalid";
  }, [initialRoom]);
  const [cleanFingerprint, setCleanFingerprint] = useState(initialFingerprint);
  const savedCompile = useMemo(
    () => (savedEnvelope ? compileSpatialRoom(savedEnvelope.room) : null),
    [savedEnvelope],
  );
  const previewCompile = previewSource === "saved" && savedCompile?.ok ? savedCompile : currentCompile;
  const selectedPlacement = room.placements.find((placement) => placement.id === selectedPlacementId);
  const selectedDefinition = selectedPlacement ? spatialComponent(selectedPlacement) : undefined;
  const selectedTransform = selectedPlacement
    ? resolveSpatialPlacementTransform(room, selectedPlacement)
    : undefined;
  const assignedPieces = useMemo(
    () => room.placements
      .filter((placement) => placement.anchor.parentPlacementId === selectedPlacementId && placement.componentId === "presence.piece-plane")
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)),
    [room.placements, selectedPlacementId],
  );
  const editablePlacements = useMemo(
    () => room.placements.filter((placement) => EDITOR_COMPONENT_IDS.has(placement.componentId)),
    [room.placements],
  );
  const compatibleMedia = useMemo(
    () => selectedPlacementId ? listArrangerCompatibleMedia(room, selectedPlacementId) : [],
    [room, selectedPlacementId],
  );
  const isMediaParent = Boolean(selectedPlacement && isArrangerMediaParent(selectedPlacement));
  const canAssignMedia = isMediaParent && compatibleMedia.length > 0;
  const dirty = currentCompile.ok
    ? currentCompile.plan.fingerprint !== savedEnvelope?.roomFingerprint
    : true;
  const workingDirty = currentCompile.ok
    ? currentCompile.plan.fingerprint !== cleanFingerprint
    : true;

  useEffect(() => {
    if (!room.media.some((media) => media.id === selectedMediaId)) {
      setSelectedMediaId(room.media[0]?.id ?? "");
    }
  }, [room.media, selectedMediaId]);

  useEffect(() => {
    if (compatibleMedia.length > 0 && !compatibleMedia.some((media) => media.id === selectedMediaId)) {
      setSelectedMediaId(compatibleMedia[0].id);
    }
  }, [compatibleMedia, selectedMediaId]);

  useEffect(() => {
    if (!workingDirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [workingDirty]);

  useEffect(() => {
    try {
      const storage = new SpatialDraftStorage(window.localStorage);
      const active = storage.load(room.id);
      const previous = storage.loadPrevious(room.id);
      setSavedEnvelope(active?.ok ? active.value : null);
      setHasPreviousGeneration(Boolean(previous?.ok));
      if (active && !active.ok) {
        setDiagnostics(active.issues);
        setStatus("The browser draft was rejected; the valid working layout is unchanged.");
      }
    } catch (error) {
      setSavedEnvelope(null);
      setHasPreviousGeneration(false);
      setDiagnostics([localStorageIssue(error)]);
      setStatus("Browser storage is unavailable. Export still works as a download.");
    }
  }, [room.id]);

  function invalidatePendingImport() {
    importOperationRef.current += 1;
  }

  function stopDragging() {
    draggingPlacementIdRef.current = undefined;
    setDraggingPlacementId(undefined);
  }

  function confirmDiscardWorkingChanges(operation: string): boolean {
    return !workingDirty || window.confirm(`Discard unsaved working changes and ${operation}?`);
  }

  function markRoomClean(next: SpatialRoomDefinition) {
    const compiled = compileSpatialRoom(next);
    setCleanFingerprint(compiled.ok ? compiled.plan.fingerprint : "invalid");
  }

  function loadWorkspace(next: SpatialRoomDefinition, label: string) {
    if (!confirmDiscardWorkingChanges(`load ${label}`)) return;
    invalidatePendingImport();
    const workingCopy = cloneRoom(next);
    setRoom(workingCopy);
    setBaselineRoom(cloneRoom(next));
    markRoomClean(workingCopy);
    setWorkspaceLabel(label);
    setSelectedPlacementId(undefined);
    stopDragging();
    setDiagnostics([]);
    setPreviewSource("current");
    setStatus(`Loaded ${label}. No browser draft was changed.`);
  }

  function applyMutation(result: ArrangerMutationResult, successMessage: string) {
    invalidatePendingImport();
    if (!result.ok) {
      setDiagnostics(result.issues);
      setStatus("Mutation rejected. The last valid layout is still active.");
      return false;
    }
    setRoom(result.room);
    setDiagnostics([]);
    setStatus(successMessage);
    return true;
  }

  function handleAdd(componentId: typeof ADDABLE_COMPONENTS[number]["componentId"]) {
    const before = new Set(room.placements.map((placement) => placement.id));
    const result = addArrangerComponent(room, componentId);
    if (applyMutation(result, `Added ${ADDABLE_COMPONENTS.find((item) => item.componentId === componentId)?.label ?? "object"} on the snapped grid.`)) {
      const added = result.room.placements.find((placement) => !before.has(placement.id));
      if (added) setSelectedPlacementId(added.id);
    }
  }

  function handleMove(deltaX: number, deltaZ: number) {
    if (!selectedPlacement) return;
    applyMutation(
      moveArrangerPlacement(room, selectedPlacement.id, deltaX, deltaZ),
      `Moved ${selectedPlacement.semanticLabel} on the 0.25m grid.`,
    );
  }

  function handleRotate(direction: -1 | 1) {
    if (!selectedPlacement) return;
    applyMutation(
      rotateArrangerPlacement(room, selectedPlacement.id, direction),
      `Rotated ${selectedPlacement.semanticLabel} ${direction > 0 ? "clockwise" : "counter-clockwise"} by 15 degrees.`,
    );
  }

  function handleAssignMedia() {
    if (!selectedPlacement || !selectedMediaId) return;
    const before = new Set(room.placements.map((placement) => placement.id));
    const result = assignArrangerMedia(room, selectedPlacement.id, selectedMediaId);
    if (applyMutation(result, `Assigned media to ${selectedPlacement.semanticLabel}.`)) {
      const added = result.room.placements.find((placement) => !before.has(placement.id));
      if (added) setStatus(`Assigned ${added.semanticLabel} to ${selectedPlacement.semanticLabel}.`);
    }
  }

  function handleReorder(pieceId: string, direction: -1 | 1) {
    if (!selectedPlacement) return;
    applyMutation(
      reorderArrangerPiece(room, selectedPlacement.id, pieceId, direction),
      `Reordered Piece ${direction < 0 ? "earlier" : "later"}.`,
    );
  }

  function handleSave() {
    try {
      const storage = new SpatialDraftStorage(window.localStorage);
      const envelope = storage.save(room);
      setSavedEnvelope(envelope);
      setCleanFingerprint(envelope.roomFingerprint);
      setHasPreviousGeneration(Boolean(storage.loadPrevious(room.id)?.ok));
      setDiagnostics([]);
      setStatus("Saved locally in this browser. Nothing was published or sent to a server.");
    } catch (error) {
      setDiagnostics([localStorageIssue(error)]);
      setStatus("Local save failed. The working layout is unchanged.");
    }
  }

  function handleReload() {
    try {
      const result = new SpatialDraftStorage(window.localStorage).load(room.id);
      if (!result) {
        setStatus("No local draft exists for this room.");
        return;
      }
      if (!result.ok) {
        setDiagnostics(result.issues);
        setStatus("The local draft was rejected. The working layout is unchanged.");
        return;
      }
      if (!confirmDiscardWorkingChanges("reload the saved browser draft")) return;
      invalidatePendingImport();
      setRoom(cloneRoom(result.value.room));
      setSavedEnvelope(result.value);
      setCleanFingerprint(result.value.roomFingerprint);
      setSelectedPlacementId(undefined);
      setDiagnostics([]);
      setStatus(`Reloaded the local generation saved ${formatSavedAt(result.value.savedAt)}.`);
    } catch (error) {
      setDiagnostics([localStorageIssue(error)]);
      setStatus("Local reload failed. The working layout is unchanged.");
    }
  }

  function handleRevert() {
    try {
      const storage = new SpatialDraftStorage(window.localStorage);
      const previous = storage.loadPrevious(room.id);
      if (!previous) {
        setHasPreviousGeneration(false);
        setStatus("No previous local generation exists for this room.");
        return;
      }
      if (!previous.ok) {
        setDiagnostics(previous.issues);
        setStatus("The previous generation was rejected. The working layout is unchanged.");
        return;
      }
      if (!confirmDiscardWorkingChanges("revert to the previous browser generation")) return;
      invalidatePendingImport();
      const result = storage.revert(room.id);
      if (!result) {
        setHasPreviousGeneration(false);
        setStatus("No previous local generation exists for this room.");
        return;
      }
      if (!result.ok) {
        setDiagnostics(result.issues);
        setStatus("The previous generation was rejected. The working layout is unchanged.");
        return;
      }
      setRoom(cloneRoom(result.value.room));
      setSavedEnvelope(result.value);
      setCleanFingerprint(result.value.roomFingerprint);
      setHasPreviousGeneration(Boolean(storage.loadPrevious(room.id)?.ok));
      setSelectedPlacementId(undefined);
      setDiagnostics([]);
      setStatus(`Reverted to the local generation saved ${formatSavedAt(result.value.savedAt)}. The newer generation is retained for another revert.`);
    } catch (error) {
      setDiagnostics([localStorageIssue(error)]);
      setStatus("Local revert failed. The working layout is unchanged.");
    }
  }

  function handleReset() {
    if (!confirmDiscardWorkingChanges(`reset to ${workspaceLabel}`)) return;
    invalidatePendingImport();
    const resetRoom = cloneRoom(baselineRoom);
    setRoom(resetRoom);
    markRoomClean(resetRoom);
    setSelectedPlacementId(undefined);
    stopDragging();
    setDiagnostics([]);
    setPreviewSource("current");
    setStatus(`Reset the working layout to ${workspaceLabel}. Local save generations were not deleted.`);
  }

  function handleExport() {
    try {
      const envelope = createSpatialDraftEnvelope(room);
      const blob = new Blob([encodeSpatialDraftEnvelope(envelope)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${room.id}-draft.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDiagnostics([]);
      setStatus("Exported a validated local draft envelope. Nothing was uploaded.");
    } catch (error) {
      setDiagnostics([operationIssue("export", error)]);
      setStatus("Export failed. The working layout is unchanged.");
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const importOperation = ++importOperationRef.current;
    if (file.size > MAX_IMPORT_BYTES) {
      setDiagnostics([{
        path: "$",
        code: "import-size",
        message: "Draft imports are capped at 256 KB before strict layout validation.",
      }]);
      setStatus("Import rejected. The last valid layout is still active.");
      return;
    }
    try {
      const encoded = await file.text();
      if (importOperation !== importOperationRef.current) {
        setStatus("A newer operator action superseded this import.");
        return;
      }
      const result = decodeSpatialDraftEnvelope(encoded);
      if (!result.ok) {
        setDiagnostics(result.issues);
        setStatus("Import rejected. The last valid layout is still active.");
        return;
      }
      const imported = cloneRoom(result.value.room);
      if (!confirmDiscardWorkingChanges(`import ${result.value.roomId}`)) return;
      setRoom(imported);
      setBaselineRoom(cloneRoom(imported));
      setCleanFingerprint(result.value.roomFingerprint);
      setWorkspaceLabel(`imported ${result.value.roomId} draft`);
      if (savedEnvelope?.roomId !== imported.id) {
        setSavedEnvelope(null);
        setHasPreviousGeneration(false);
      }
      setSelectedPlacementId(undefined);
      setDiagnostics([]);
      setPreviewSource("current");
      setStatus("Imported a validated draft into memory. It has not been saved or published.");
    } catch (error) {
      setDiagnostics([operationIssue("import", error)]);
      setStatus("Import failed. The last valid layout is still active.");
    }
  }

  function handleOperatorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (isFormControl(event.target) || !selectedPlacement || !isArrangerMovablePlacement(selectedPlacement)) return;
    const operations: Partial<Record<string, () => void>> = {
      ArrowLeft: () => handleMove(-0.25, 0),
      ArrowRight: () => handleMove(0.25, 0),
      ArrowUp: () => handleMove(0, -0.25),
      ArrowDown: () => handleMove(0, 0.25),
      q: () => handleRotate(-1),
      Q: () => handleRotate(-1),
      e: () => handleRotate(1),
      E: () => handleRotate(1),
    };
    const operation = operations[event.key];
    if (!operation) return;
    event.preventDefault();
    operation();
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const activePlacementId = draggingPlacementIdRef.current;
    if (!activePlacementId) return;
    const placement = room.placements.find((candidate) => candidate.id === activePlacementId);
    if (!placement || !isArrangerMovablePlacement(placement)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * room.bounds.width;
    const z = ((event.clientY - rect.top) / rect.height - 0.5) * room.bounds.depth;
    if (Math.abs(x - placement.transform.position[0]) < 0.125 && Math.abs(z - placement.transform.position[2]) < 0.125) return;
    applyMutation(
      moveArrangerPlacementTo(room, placement.id, x, z),
      `Moved ${placement.semanticLabel} on the 0.25m grid.`,
    );
  }

  return (
    <main className={styles.shell} onKeyDown={handleOperatorKeyDown}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Presence Gate 3 · internal operator proof</p>
          <h1>Spatial object arranger</h1>
          <p className={styles.intro}>Compose fixture-backed room data, validate every placement, then inspect the same compiled plan through the visitor renderer.</p>
        </div>
        <div className={styles.headerMeta}>
          <span>{room.fixtureKind}</span>
          <span>{currentCompile.ok ? currentCompile.plan.fingerprint : "invalid"}</span>
          <strong className={dirty ? styles.unsaved : styles.saved}>{dirty ? "Working changes" : "Matches local save"}</strong>
        </div>
      </header>

      <section className={styles.honestyBanner} aria-label="Persistence boundary">
        <strong>Local operator proof only.</strong>
        <span>Save keeps at most two generations in this browser. Import and export use JSON files. There is no API, collaboration, publishing, or production persistence here.</span>
      </section>

      <div className={styles.toolbar} aria-label="Workspace and local draft controls">
        <div className={styles.toolbarGroup}>
          <span className={styles.groupLabel}>Start</span>
          <button onClick={() => loadWorkspace(createBlankMobstarSpatialRoom(), "a new Mobstar layout")} type="button">Create Mobstar</button>
          <button onClick={() => loadWorkspace(MOBSTAR_SPATIAL_ROOM_FIXTURE, "Mobstar fixture")} type="button">Load Mobstar</button>
          <button data-testid="presence-spatial-load-mobstar-gate4" onClick={() => loadWorkspace(MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE, "Mobstar Gate 4 candidate")} type="button">Load Gate 4 candidate</button>
          <button onClick={() => loadWorkspace(BBB_PROJECTION_WALL_FIXTURE, "BBB projection fixture")} type="button">Load BBB</button>
        </div>
        <div className={styles.toolbarGroup}>
          <span className={styles.groupLabel}>Browser draft</span>
          <button onClick={handleSave} type="button">Save local</button>
          <button disabled={!savedEnvelope} onClick={handleReload} type="button">Reload saved</button>
          <button disabled={!hasPreviousGeneration} onClick={handleRevert} type="button">Revert generation</button>
          <button onClick={handleReset} type="button">Reset working</button>
        </div>
        <div className={styles.toolbarGroup}>
          <span className={styles.groupLabel}>JSON</span>
          <button onClick={handleExport} type="button">Export</button>
          <button onClick={() => importInputRef.current?.click()} type="button">Import</button>
          <input
            accept="application/json,.json"
            className={styles.fileInput}
            onChange={handleImport}
            ref={importInputRef}
            type="file"
          />
        </div>
      </div>

      <section className={styles.statusRegion} aria-live="polite">
        <p>{status}</p>
        {savedEnvelope ? <span>Active local save: {formatSavedAt(savedEnvelope.savedAt)}</span> : <span>No local save loaded.</span>}
      </section>

      <div className={styles.operatorGrid}>
        <aside className={styles.controlRail} aria-label="Arranger controls">
          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>01</span><h2>Add objects</h2></div>
              <small>First valid 0.25m position</small>
            </div>
            <div className={styles.addGrid}>
              {ADDABLE_COMPONENTS.map((entry) => (
                <button key={entry.componentId} onClick={() => handleAdd(entry.componentId)} type="button">+ {entry.label}</button>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>02</span><h2>Objects</h2></div>
              <small>{editablePlacements.length} core objects</small>
            </div>
            <div className={styles.objectList}>
              {editablePlacements.map((placement) => (
                <button
                  aria-pressed={selectedPlacementId === placement.id}
                  key={placement.id}
                  onClick={() => setSelectedPlacementId(placement.id)}
                  type="button"
                >
                  <span>{spatialComponent(placement)?.label ?? placement.componentId}</span>
                  <small>{placement.id}</small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>03</span><h2>Selection</h2></div>
              <small>{selectedPlacement ? selectedDefinition?.category : "None"}</small>
            </div>
            {selectedPlacement ? (
              <div className={styles.selectionControls}>
                <div className={styles.selectionReadout}>
                  <strong>{selectedPlacement.semanticLabel}</strong>
                  <code>
                    x {selectedTransform?.position[0].toFixed(2)} · z {selectedTransform?.position[2].toFixed(2)} · {Math.round((selectedTransform?.rotation[1] ?? 0) * 180 / Math.PI)}°
                  </code>
                </div>
                {isArrangerMovablePlacement(selectedPlacement) ? (
                  <>
                    <div className={styles.nudgePad} aria-label="Move selected floor object">
                      <button aria-label="Move forward" onClick={() => handleMove(0, -0.25)} type="button">↑</button>
                      <button aria-label="Move left" onClick={() => handleMove(-0.25, 0)} type="button">←</button>
                      <button aria-label="Move backward" onClick={() => handleMove(0, 0.25)} type="button">↓</button>
                      <button aria-label="Move right" onClick={() => handleMove(0.25, 0)} type="button">→</button>
                    </div>
                    <div className={styles.rotateControls}>
                      <button onClick={() => handleRotate(-1)} type="button">Q · −15°</button>
                      <button onClick={() => handleRotate(1)} type="button">E · +15°</button>
                    </div>
                    <p className={styles.hint}>Drag in the plan, use arrow keys, or press Q/E. Rejected moves leave this object where it was.</p>
                  </>
                ) : (
                  <p className={styles.hint}>This object is not floor-movable. Select a floor-anchored divider, table, rack, or plinth.</p>
                )}
              </div>
            ) : <p className={styles.empty}>Select a room object in the plan or list.</p>}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>04</span><h2>Assign Pieces</h2></div>
              <small>{assignedPieces.length} assigned</small>
            </div>
            {selectedPlacement && isMediaParent ? (
              <div className={styles.assignmentControls}>
                <label>
                  <span>{selectedDefinition?.category === "projection" ? "Gallery / media" : "Piece media"}</span>
                  <select disabled={!canAssignMedia} onChange={(event) => setSelectedMediaId(event.target.value)} value={canAssignMedia ? selectedMediaId : ""}>
                    {!canAssignMedia ? <option value="">Surface capacity reached</option> : null}
                    {compatibleMedia.map((media) => <option key={media.id} value={media.id}>{media.alt}</option>)}
                  </select>
                </label>
                <button disabled={!canAssignMedia || !selectedMediaId} onClick={handleAssignMedia} type="button">
                  Assign to {selectedDefinition?.label}
                </button>
                <ol className={styles.pieceList}>
                  {assignedPieces.map((piece, index) => (
                    <li key={piece.id}>
                      <span><strong>{piece.semanticLabel}</strong><small>{piece.anchor.anchorId}</small></span>
                      <span>
                        <button aria-label={`Move ${piece.semanticLabel} earlier`} disabled={index === 0} onClick={() => handleReorder(piece.id, -1)} type="button">↑</button>
                        <button aria-label={`Move ${piece.semanticLabel} later`} disabled={index === assignedPieces.length - 1} onClick={() => handleReorder(piece.id, 1)} type="button">↓</button>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : <p className={styles.empty}>Select a compatible table, plinth, rack, or projection wall to assign and reorder media Pieces.</p>}
          </section>
        </aside>

        <section className={styles.planPanel}>
          <div className={styles.planHeading}>
            <div>
              <p className={styles.eyebrow}>Operator plan · top down</p>
              <h2>{room.label}</h2>
            </div>
            <span>Grid 0.25m · Rotation 15°</span>
          </div>
          <TopDownRoomPlan
            draggingPlacementId={draggingPlacementId}
            onDragEnd={stopDragging}
            onDragMove={handlePointerMove}
            onDragStart={(placementId, event) => {
              setSelectedPlacementId(placementId);
              event.currentTarget.ownerSVGElement?.focus();
              const placement = room.placements.find((candidate) => candidate.id === placementId);
              if (placement && isArrangerMovablePlacement(placement)) {
                event.currentTarget.setPointerCapture(event.pointerId);
                draggingPlacementIdRef.current = placementId;
                setDraggingPlacementId(placementId);
              }
            }}
            onSelect={setSelectedPlacementId}
            room={room}
            selectedPlacementId={selectedPlacementId}
          />
          <div className={styles.legend}>
            {ADDABLE_COMPONENTS.map((entry) => <span key={entry.componentId}><i data-component={entry.componentId} />{entry.label}</span>)}
          </div>
        </section>
      </div>

      <section className={styles.diagnosticsPanel} data-has-errors={diagnostics.length > 0}>
        <div>
          <p className={styles.eyebrow}>Strict validation</p>
          <h2>{diagnostics.length > 0 ? `${diagnostics.length} rejected condition${diagnostics.length === 1 ? "" : "s"}` : "Last valid state active"}</h2>
        </div>
        {diagnostics.length > 0 ? (
          <ul>{diagnostics.slice(0, 8).map((issue, index) => <li key={`${issue.path}-${issue.code}-${index}`}><code>{issue.code}</code><span>{issue.message}</span><small>{issue.path}</small></li>)}</ul>
        ) : <p>Every accepted edit has compiled through the shared schema and placement rules.</p>}
      </section>

      <section className={styles.previewPanel}>
        <div className={styles.previewHeading}>
          <div>
            <p className={styles.eyebrow}>Visitor-shaped compiled preview</p>
            <h2>Same data, actual renderer path</h2>
            <p>Desktop WebGL mounts the lazy Three renderer. Mobile, reduced-motion, and unsupported devices receive its semantic fallback.</p>
          </div>
          <fieldset>
            <legend>Preview data</legend>
            <label><input checked={previewSource === "current"} name="preview-source" onChange={() => setPreviewSource("current")} type="radio" /> Current</label>
            <label><input checked={previewSource === "saved"} disabled={!savedCompile?.ok} name="preview-source" onChange={() => setPreviewSource("saved")} type="radio" /> Saved</label>
          </fieldset>
        </div>
        {previewCompile.ok ? (
          <SpatialRoomViewport
            ariaLabel={`${previewSource === "saved" ? "Saved" : "Current"} ${room.label} visitor preview`}
            plan={previewCompile.plan}
          />
        ) : (
          <div className={styles.previewError} role="alert">The current room did not compile, so no renderer input was produced.</div>
        )}
      </section>
    </main>
  );
}

interface TopDownRoomPlanProps {
  room: SpatialRoomDefinition;
  selectedPlacementId?: string;
  draggingPlacementId?: string;
  onSelect: (placementId: string) => void;
  onDragStart: (placementId: string, event: PointerEvent<SVGGElement>) => void;
  onDragMove: (event: PointerEvent<SVGSVGElement>) => void;
  onDragEnd: () => void;
}

function TopDownRoomPlan({
  room,
  selectedPlacementId,
  draggingPlacementId,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: TopDownRoomPlanProps) {
  const width = 900;
  const height = 600;
  const xScale = width / room.bounds.width;
  const zScale = height / room.bounds.depth;
  const objects = room.placements.filter((placement) => EDITOR_COMPONENT_IDS.has(placement.componentId));

  return (
    <svg
      aria-label="Top-down editable room plan"
      className={styles.plan}
      onPointerCancel={onDragEnd}
      onPointerLeave={onDragEnd}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      role="img"
      tabIndex={0}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <pattern height={0.25 * zScale} id="spatial-minor-grid" patternUnits="userSpaceOnUse" width={0.25 * xScale}>
          <path className={styles.minorGrid} d={`M ${0.25 * xScale} 0 L 0 0 0 ${0.25 * zScale}`} fill="none" />
        </pattern>
        <pattern height={zScale} id="spatial-major-grid" patternUnits="userSpaceOnUse" width={xScale}>
          <rect fill="url(#spatial-minor-grid)" height={zScale} width={xScale} />
          <path className={styles.majorGrid} d={`M ${xScale} 0 L 0 0 0 ${zScale}`} fill="none" />
        </pattern>
      </defs>
      <rect className={styles.roomFloor} height={height} width={width} />
      <rect fill="url(#spatial-major-grid)" height={height} width={width} />
      <path className={styles.cameraPath} d={room.cameraPath.points.map((point, index) => `${index === 0 ? "M" : "L"} ${worldX(point[0], room, width)} ${worldZ(point[2], room, height)}`).join(" ")} />
      {objects.map((placement) => {
        const definition = spatialComponent(placement);
        if (!definition) return null;
        const transform = resolveSpatialPlacementTransform(room, placement);
        const centerX = worldX(transform.position[0], room, width);
        const centerY = worldZ(transform.position[2], room, height);
        const objectWidth = Math.max(8, definition.dimensions.width * transform.scale[0] * xScale);
        const objectDepth = Math.max(8, definition.dimensions.depth * transform.scale[2] * zScale);
        const angle = transform.rotation[1] * 180 / Math.PI;
        const selected = selectedPlacementId === placement.id;
        return (
          <g
            className={styles.planObject}
            data-component={placement.componentId}
            data-dragging={draggingPlacementId === placement.id}
            data-selected={selected}
            key={placement.id}
            onClick={() => onSelect(placement.id)}
            onPointerDown={(event) => onDragStart(placement.id, event)}
            transform={`rotate(${angle} ${centerX} ${centerY})`}
          >
            <rect height={objectDepth} rx="4" width={objectWidth} x={centerX - objectWidth / 2} y={centerY - objectDepth / 2} />
            <circle cx={centerX} cy={centerY} r="4" />
            <title>{`${definition.label} — ${placement.id}`}</title>
          </g>
        );
      })}
      <g className={styles.entryMarker} transform={`translate(${worldX(0, room, width)} ${worldZ(room.bounds.depth / 2 - 0.6, room, height)})`}>
        <path d="M -10 0 L 0 -14 L 10 0" />
        <text textAnchor="middle" y="18">ENTRY</text>
      </g>
    </svg>
  );
}

function worldX(x: number, room: SpatialRoomDefinition, width: number): number {
  return (x / room.bounds.width + 0.5) * width;
}

function worldZ(z: number, room: SpatialRoomDefinition, height: number): number {
  return (z / room.bounds.depth + 0.5) * height;
}

function cloneRoom(room: SpatialRoomDefinition): SpatialRoomDefinition {
  return JSON.parse(JSON.stringify(room)) as SpatialRoomDefinition;
}

function formatSavedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function localStorageIssue(error: unknown): SpatialValidationIssue {
  return operationIssue("local-storage", error);
}

function operationIssue(code: string, error: unknown): SpatialValidationIssue {
  return {
    path: "$",
    code,
    message: error instanceof Error ? error.message : "The browser operation failed.",
  };
}

function isFormControl(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName);
}
