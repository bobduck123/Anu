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
  ARRANGER_COMPONENT_OPTIONS,
  ARRANGER_CORE_COMPONENT_OPTIONS,
  addArrangerOption,
  addArrangerComponent,
  arrangerComponentCapabilityTags,
  assignArrangerMaterialPreset,
  assignArrangerMedia,
  assignArrangerOpenLink,
  assignArrangerPlacementMedia,
  assignArrangerSkin,
  bindArrangerPieceToHost,
  bindArrangerContentToHost,
  createArrangerPieceLibraryItem,
  createBlankMobstarSpatialRoom,
  createRoomFromPresenceRoomKitOption,
  deleteArrangerPlacement,
  duplicateArrangerPlacement,
  isArrangerMediaParent,
  isArrangerMovablePlacement,
  arrangerRackSlotState,
  setArrangerPieceGarmentArtwork,
  defaultArrangementKindForHost,
  listArrangerContentBindings,
  moveArrangerContentBinding,
  removeArrangerContentBinding,
  listArrangerCompatibleMedia,
  listArrangerHostSupportedPieceTypes,
  listArrangerPieceLibrary,
  moveArrangerPlacement,
  moveArrangerPlacementTo,
  reorderArrangerPiece,
  rotateArrangerPlacement,
  type ArrangerBindingActionKind,
} from "@/lib/presence/spatial/arranger";
import {
  CANDIDATE_COMPONENT_OPTIONS,
  CANDIDATE_ROOM_KIT_OPTIONS,
  candidateComponentGroups,
  type CandidateComponentOption,
} from "@/lib/presence/spatial/candidateOptions";
import { compileSpatialRoom } from "@/lib/presence/spatial/compile";
import { ALPHA_GARMENT_RACK_FIXTURE } from "@/lib/presence/spatial/fixtures/alphaGarmentRack";
import { BBB_PROJECTION_WALL_FIXTURE } from "@/lib/presence/spatial/fixtures/bbbProjectionWall";
import { DRACO_DISPLAY_ISLAND_PROOF_FIXTURE } from "@/lib/presence/spatial/fixtures/dracoDisplayIslandProof";
import { MOBSTAR_SPATIAL_ROOM_FIXTURE } from "@/lib/presence/spatial/fixtures/mobstar";
import { MOBSTAR_GATE4_SPATIAL_ROOM_FIXTURE } from "@/lib/presence/spatial/fixtures/mobstarGate4";
import { SPATIAL_ARRANGEMENT_KINDS, SPATIAL_GARMENT_HANG_PROFILES } from "@/lib/presence/spatial/model";
import type { ArrangerGarmentArtworkInput } from "@/lib/presence/spatial/arranger";
import type {
  SpatialArrangementKind,
  SpatialArrangementOverflowPolicy,
  SpatialDraftEnvelope,
  SpatialGarmentArticleType,
  SpatialPieceLibraryItem,
  SpatialMaterialPresetId,
  SpatialMaterialSlotId,
  PieceType,
  SpatialPlacement,
  SpatialRoomDefinition,
  SpatialValidationIssue,
} from "@/lib/presence/spatial/model";
import { SPATIAL_MATERIAL_PRESETS } from "@/lib/presence/spatial/materials";
import {
  PRESENCE_OPTION_ALIASES,
  PRESENCE_ROOM_KIT_CONTAINERS,
  presenceOptionPaletteGroups,
  type PresenceOptionAlias,
  type PresenceRoomKitContainer,
} from "@/lib/presence/spatial/optionAliases";
import { resolveSpatialPlacementTransform } from "@/lib/presence/spatial/placement";
import { spatialAuthoringMaterialSlots, spatialComponent } from "@/lib/presence/spatial/registry";
import {
  SpatialDraftStorage,
  createSpatialDraftEnvelope,
  decodeSpatialDraftEnvelope,
  encodeSpatialDraftEnvelope,
} from "@/lib/presence/spatial/storage";
import { SpatialRoomViewport } from "./SpatialRoomViewport";
import styles from "./SpatialObjectArranger.module.css";

const ADDABLE_COMPONENTS = ARRANGER_CORE_COMPONENT_OPTIONS;
const CANDIDATE_COMPONENT_GROUPS = candidateComponentGroups();
const PRESENCE_OPTION_GROUPS = presenceOptionPaletteGroups();
const EDITOR_COMPONENT_IDS: ReadonlySet<string> = new Set(ADDABLE_COMPONENTS.map((entry) => entry.componentId));
const EDITOR_CANDIDATE_COMPONENT_IDS: ReadonlySet<string> = new Set(CANDIDATE_COMPONENT_OPTIONS.map((entry) => entry.componentId));
const PRESENCE_OPTION_COMPONENT_IDS: ReadonlySet<string> = new Set(
  PRESENCE_OPTION_ALIASES
    .map((entry) => entry.componentRef?.componentId)
    .filter((componentId): componentId is string => Boolean(componentId)),
);
const MAX_IMPORT_BYTES = 256 * 1024;
const PALETTE_LABELS: Readonly<Record<string, string>> = {
  "presence.wall-panel": "Wall",
  "presence.divider-wall": "Divider",
  "presence.display-table": "Table",
  "presence.retail-rack": "Rack",
  "presence.display-plinth": "Plinth",
  "presence.projection-wall": "Projection wall",
};

type PreviewSource = "current" | "saved";

type ArrangerMutationResult =
  | { ok: true; room: SpatialRoomDefinition }
  | { ok: false; room: SpatialRoomDefinition; issues: readonly SpatialValidationIssue[] };

/** Artwork channels an operator can assign, per article. */
function garmentArtworkFields(article: SpatialGarmentArticleType): readonly {
  key: "frontImageRef" | "backImageRef" | "displayImageRef" | "outerSideImageRef" | "topImageRef";
  label: string;
}[] {
  if (article === "shoe") {
    // Footwear is not a front/back garment, so it is offered display/side/top.
    return [
      { key: "displayImageRef", label: "Display artwork" },
      { key: "outerSideImageRef", label: "Outer side artwork" },
      { key: "topImageRef", label: "Top artwork" },
    ];
  }
  return [
    { key: "frontImageRef", label: "Front artwork" },
    { key: "backImageRef", label: "Back artwork" },
    { key: "displayImageRef", label: "Display fallback" },
  ];
}

function garmentArtworkWarnings(piece: SpatialPieceLibraryItem): readonly string[] {
  const article = piece.garmentArticleType ?? "generic";
  const warnings: string[] = [];
  if (article === "shoe") {
    warnings.push("Shoes use display/outer-side/top artwork on a low stand proxy. They do not hang, and front/back wrapping is not implemented.");
    if (!piece.displayImageRef && !piece.outerSideImageRef && !piece.topImageRef) {
      warnings.push("No shoe artwork assigned — the carrier will render invisible.");
    }
  } else {
    if (!piece.frontImageRef && !piece.displayImageRef) warnings.push("No front artwork assigned — the carrier will render invisible.");
    if (!piece.backImageRef) warnings.push("No back artwork assigned — the front image will be reused behind.");
  }
  warnings.push("Carrier geometry is invisible by default and is proxy quality, not admitted art.");
  return warnings;
}

export function SpatialObjectArranger() {
  const initialRoom = useMemo(() => cloneRoom(MOBSTAR_SPATIAL_ROOM_FIXTURE), []);
  const [room, setRoom] = useState<SpatialRoomDefinition>(initialRoom);
  const [baselineRoom, setBaselineRoom] = useState<SpatialRoomDefinition>(initialRoom);
  const [workspaceLabel, setWorkspaceLabel] = useState("Mobstar fixture");
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>();
  const [selectedMediaId, setSelectedMediaId] = useState(initialRoom.media[0]?.id ?? "");
  const [selectedMaterialSlot, setSelectedMaterialSlot] = useState<SpatialMaterialSlotId | "">("");
  const [selectedMaterialPresetId, setSelectedMaterialPresetId] = useState<SpatialMaterialPresetId | "">("");
  const [selectedSkinId, setSelectedSkinId] = useState(initialRoom.skins[0]?.id ?? "");
  const [linkLabel, setLinkLabel] = useState("Open link");
  const [linkHref, setLinkHref] = useState("https://example.com");
  // null means "follow the selected host". Rendered QA found a hard-coded
  // wall-grid default here, which made rack-row unreachable for every operator.
  const [bindingArrangementOverride, setBindingArrangementOverride] = useState<SpatialArrangementKind | null>(null);
  const [bindingOverflowPolicy, setBindingOverflowPolicy] = useState<SpatialArrangementOverflowPolicy>("overflow-list");
  const [bindingActionKind, setBindingActionKind] = useState<ArrangerBindingActionKind>("open-link");
  const [selectedPieceId, setSelectedPieceId] = useState(initialRoom.pieceLibrary?.[0]?.id ?? "");
  const [pieceType, setPieceType] = useState<PieceType>("image");
  const [debugCarriers, setDebugCarriers] = useState(false);
  const [pieceTitle, setPieceTitle] = useState("Untitled internal piece");
  const [pieceCaption, setPieceCaption] = useState("");
  const [pieceMediaId, setPieceMediaId] = useState(initialRoom.media[0]?.id ?? "");
  const [pieceActionKind, setPieceActionKind] = useState<ArrangerBindingActionKind>("open-link");
  const [pieceActionLabel, setPieceActionLabel] = useState("Open piece");
  const [pieceActionHref, setPieceActionHref] = useState("https://example.com/piece");
  const [pieceTags, setPieceTags] = useState("internal, sample");
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
  const pieceLibrary = useMemo(() => listArrangerPieceLibrary(room), [room]);
  const selectedLibraryPiece = pieceLibrary.find((piece) => piece.id === selectedPieceId) ?? pieceLibrary[0];
  const hostSupportedPieceTypes = useMemo(
    () => listArrangerHostSupportedPieceTypes(selectedPlacement),
    [selectedPlacement],
  );

  useEffect(() => {
    if (!selectedLibraryPiece && pieceLibrary[0]) setSelectedPieceId(pieceLibrary[0].id);
  }, [pieceLibrary, selectedLibraryPiece]);
  useEffect(() => {
    // Changing host re-derives the arrangement rather than carrying the previous
    // host's choice across, so a rack never inherits a wall grid.
    setBindingArrangementOverride(null);
  }, [selectedPlacementId]);
  const selectedDefinition = selectedPlacement ? spatialComponent(selectedPlacement) : undefined;
  const selectedTransform = selectedPlacement
    ? resolveSpatialPlacementTransform(room, selectedPlacement)
    : undefined;
  const componentRefsUsed = useMemo(
    () => (currentCompile.ok
      ? Array.from(new Set(currentCompile.plan.items.map((item) => item.componentKey))).sort()
      : []),
    [currentCompile],
  );
  const selectedRenderItem = currentCompile.ok && selectedPlacement
    ? currentCompile.plan.items.find((item) => item.placementId === selectedPlacement.id)
    : undefined;
  const selectedFallbackItem = currentCompile.ok && selectedPlacement
    ? currentCompile.plan.semanticFallback.find((item) => item.placementId === selectedPlacement.id)
    : undefined;
  const selectedActions = selectedPlacement
    ? selectedPlacement.actionRefs
      .map((actionId) => room.actions.find((action) => action.id === actionId))
      .filter((action): action is NonNullable<typeof action> => Boolean(action))
    : [];
  const assignedPieces = useMemo(
    () => room.placements
      .filter((placement) => placement.anchor.parentPlacementId === selectedPlacementId && placement.componentId === "presence.piece-plane")
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)),
    [room.placements, selectedPlacementId],
  );
  const boundPieces = useMemo(
    () => selectedPlacementId ? listArrangerContentBindings(room, selectedPlacementId) : [],
    [room, selectedPlacementId],
  );
  const bindingArrangementKind: SpatialArrangementKind = bindingArrangementOverride
    ?? (selectedPlacement ? defaultArrangementKindForHost(selectedPlacement) : "wall-grid");
  const rackSlotState = useMemo(
    () => (selectedPlacementId ? arrangerRackSlotState(room, selectedPlacementId) : undefined),
    [room, selectedPlacementId],
  );
  const selectedBindingArrangement = currentCompile.ok && selectedPlacement
    ? currentCompile.plan.contentBindingArrangements.find((arrangement) => arrangement.hostPlacementId === selectedPlacement.id)
    : undefined;
  const editablePlacements = useMemo(
    () => room.placements.filter((placement) => (
      !placement.anchor.parentPlacementId && placement.componentId !== "presence.piece-plane"
    )),
    [room.placements],
  );
  const reusableObjectCount = useMemo(
    () => editablePlacements.filter((placement) => (
      EDITOR_COMPONENT_IDS.has(placement.componentId) || EDITOR_CANDIDATE_COMPONENT_IDS.has(placement.componentId)
      || PRESENCE_OPTION_COMPONENT_IDS.has(placement.componentId) || Boolean(placement.optionRef)
    )).length,
    [editablePlacements],
  );
  const selectedPaletteObject = Boolean(
    selectedPlacement
    && (
      EDITOR_COMPONENT_IDS.has(selectedPlacement.componentId)
      || EDITOR_CANDIDATE_COMPONENT_IDS.has(selectedPlacement.componentId)
      || PRESENCE_OPTION_COMPONENT_IDS.has(selectedPlacement.componentId)
      || Boolean(selectedPlacement.optionRef)
    ),
  );
  const selectedMaterialSlots = selectedDefinition && selectedPlacement
    ? spatialAuthoringMaterialSlots(selectedPlacement)
    : [];
  const selectedMaterialOptions = useMemo(
    () => Object.values(SPATIAL_MATERIAL_PRESETS).filter((preset) => preset.slot === selectedMaterialSlot),
    [selectedMaterialSlot],
  );
  const canAssignDirectMedia = Boolean(
    selectedPlacement
    && (selectedDefinition?.category === "piece" || selectedDefinition?.category === "projection")
    && room.media.length > 0,
  );
  const compatibleMedia = useMemo(
    () => selectedPlacementId ? listArrangerCompatibleMedia(room, selectedPlacementId) : [],
    [room, selectedPlacementId],
  );
  const isMediaParent = Boolean(selectedPlacement && isArrangerMediaParent(selectedPlacement));
  const canAssignMedia = isMediaParent && compatibleMedia.length > 0;
  const canBindContent = isMediaParent && compatibleMedia.length > 0;
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
    const firstSlot = selectedMaterialSlots[0] ?? "";
    if (!selectedMaterialSlot || !selectedMaterialSlots.includes(selectedMaterialSlot)) {
      setSelectedMaterialSlot(firstSlot);
    }
  }, [selectedMaterialSlot, selectedMaterialSlots]);

  useEffect(() => {
    const firstPreset = selectedMaterialOptions[0]?.id ?? "";
    if (!selectedMaterialPresetId || !selectedMaterialOptions.some((preset) => preset.id === selectedMaterialPresetId)) {
      setSelectedMaterialPresetId(firstPreset);
    }
  }, [selectedMaterialOptions, selectedMaterialPresetId]);

  useEffect(() => {
    if (!room.skins.some((skin) => skin.id === selectedSkinId)) {
      setSelectedSkinId(room.skins[0]?.id ?? "");
    }
  }, [room.skins, selectedSkinId]);

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

  function assignGarmentArtwork(input: ArrangerGarmentArtworkInput) {
    if (!selectedLibraryPiece) return;
    applyMutation(
      setArrangerPieceGarmentArtwork(room, selectedLibraryPiece.id, input),
      `Updated garment artwork for ${selectedLibraryPiece.label}.`,
    );
  }

  function moveRackBinding(bindingId: string, direction: -1 | 1) {
    if (!selectedPlacementId) return;
    applyMutation(
      moveArrangerContentBinding(room, selectedPlacementId, bindingId, direction),
      `Moved ${bindingId} ${direction === -1 ? "left" : "right"} on the rack.`,
    );
  }

  function removeRackBinding(bindingId: string) {
    if (!selectedPlacementId) return;
    applyMutation(
      removeArrangerContentBinding(room, selectedPlacementId, bindingId),
      `Removed ${bindingId} from the rack.`,
    );
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

  function handleAdd(componentId: string) {
    const before = new Set(room.placements.map((placement) => placement.id));
    const result = addArrangerComponent(room, componentId);
    if (applyMutation(result, `Added ${paletteLabel(componentId)} on the snapped grid.`)) {
      const added = result.room.placements.find((placement) => !before.has(placement.id));
      if (added) setSelectedPlacementId(added.id);
    }
  }

  function handleAddCandidate(option: CandidateComponentOption) {
    if (option.usability !== "selectable-internal") {
      setDiagnostics([{
        path: `candidateOptions.${option.componentId}`,
        code: "candidate-disabled",
        message: option.disabledReasons.join("; ") || "This candidate is deferred for review and cannot be placed.",
      }]);
      setStatus("Candidate option is deferred. The working layout is unchanged.");
      return;
    }
    handleAdd(option.componentId);
  }

  function handleLoadRoomKitOption(kit: PresenceRoomKitContainer) {
    const result = createRoomFromPresenceRoomKitOption(kit.optionId, kit.version);
    if (!result.ok) {
      setDiagnostics(result.issues);
      setStatus(`${kit.name} could not be loaded. The working layout is unchanged.`);
      return;
    }
    loadWorkspace(result.room, `${kit.name} option`);
  }

  function handleAddPresenceOption(option: PresenceOptionAlias) {
    const before = new Set(room.placements.map((placement) => placement.id));
    const result = addArrangerOption(room, option.optionId, option.version);
    if (applyMutation(result, `Added ${option.name} as ${option.optionId}@${option.version}.`)) {
      const added = result.room.placements.find((placement) => !before.has(placement.id));
      if (added) setSelectedPlacementId(added.id);
    }
  }

  function handleDuplicate() {
    if (!selectedPlacement) return;
    const before = new Set(room.placements.map((placement) => placement.id));
    const result = duplicateArrangerPlacement(room, selectedPlacement.id);
    if (applyMutation(result, `Duplicated ${selectedPlacement.semanticLabel} with its component references and overrides.`)) {
      const duplicate = result.room.placements.find((placement) => !before.has(placement.id));
      if (duplicate) setSelectedPlacementId(duplicate.id);
    }
  }

  function handleDelete() {
    if (!selectedPlacement) return;
    if (applyMutation(
      deleteArrangerPlacement(room, selectedPlacement.id),
      `Deleted ${selectedPlacement.semanticLabel} and its attached Pieces from the working layout.`,
    )) {
      setSelectedPlacementId(undefined);
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

  function handleAssignMaterial() {
    if (!selectedPlacement || !selectedMaterialSlot || !selectedMaterialPresetId) return;
    applyMutation(
      assignArrangerMaterialPreset(
        room,
        selectedPlacement.id,
        selectedMaterialSlot,
        selectedMaterialPresetId,
      ),
      `Applied ${SPATIAL_MATERIAL_PRESETS[selectedMaterialPresetId].label} to ${selectedPlacement.semanticLabel}.`,
    );
  }

  function handleAssignSkin() {
    if (!selectedPlacement || !selectedSkinId) return;
    const skin = room.skins.find((candidate) => candidate.id === selectedSkinId);
    applyMutation(
      assignArrangerSkin(room, selectedPlacement.id, selectedSkinId),
      `Applied ${skin?.label ?? "skin"} to ${selectedPlacement.semanticLabel}.`,
    );
  }

  function handleAssignDirectMedia() {
    if (!selectedPlacement || !selectedMediaId) return;
    const media = room.media.find((candidate) => candidate.id === selectedMediaId);
    applyMutation(
      assignArrangerPlacementMedia(room, selectedPlacement.id, selectedMediaId),
      `Applied ${media?.alt ?? "media"} directly to ${selectedPlacement.semanticLabel}.`,
    );
  }

  function handleAssignLink() {
    if (!selectedPlacement) return;
    applyMutation(
      assignArrangerOpenLink(room, selectedPlacement.id, linkLabel, linkHref),
      `Assigned the ${linkLabel.trim()} action to ${selectedPlacement.semanticLabel}.`,
    );
  }

  function handleBindContent() {
    if (!selectedPlacement || !selectedMediaId) return;
    const media = room.media.find((candidate) => candidate.id === selectedMediaId);
    applyMutation(
      bindArrangerContentToHost(room, selectedPlacement.id, {
        mediaId: selectedMediaId,
        arrangementKind: bindingArrangementKind,
        overflowPolicy: bindingOverflowPolicy,
        actionKind: bindingActionKind,
        actionLabel: linkLabel,
        href: linkHref,
      }),
      `Bound ${media?.alt ?? "content"} to ${selectedPlacement.semanticLabel}.`,
    );
  }

  function handleCreatePiece() {
    const before = new Set((room.pieceLibrary ?? []).map((piece) => piece.id));
    const result = createArrangerPieceLibraryItem(room, {
      pieceType,
      label: pieceTitle,
      caption: pieceCaption,
      mediaId: pieceMediaId || undefined,
      actionKind: pieceActionKind,
      actionLabel: pieceActionLabel,
      href: pieceActionHref,
      tags: pieceTags.split(","),
      collectionRefs: ["operator-library"],
    });
    if (applyMutation(result, `Created ${pieceTitle.trim() || "piece"} in the internal Piece Library.`)) {
      const added = result.room.pieceLibrary?.find((piece) => !before.has(piece.id));
      if (added) setSelectedPieceId(added.id);
    }
  }

  function handleBindSelectedPiece() {
    if (!selectedPlacement || !selectedLibraryPiece) return;
    applyMutation(
      bindArrangerPieceToHost(room, selectedPlacement.id, {
        pieceId: selectedLibraryPiece.id,
        arrangementKind: bindingArrangementKind,
        overflowPolicy: bindingOverflowPolicy,
      }),
      `Bound ${selectedLibraryPiece.label} from the internal Piece Library to ${selectedPlacement.semanticLabel}.`,
    );
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
          <p className={styles.eyebrow}>Presence Spatial Authoring Baseline - internal operator proof</p>
          <h1>Spatial object arranger</h1>
          <p className={styles.intro}>Arrange reusable component references, customise their material and media layers, then inspect the same validated data through the generic visitor renderer.</p>
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
          <button data-testid="presence-spatial-load-draco-proof" onClick={() => loadWorkspace(DRACO_DISPLAY_ISLAND_PROOF_FIXTURE, "Draco GLB proof")} type="button">Load Draco proof</button>
          <button onClick={() => loadWorkspace(BBB_PROJECTION_WALL_FIXTURE, "BBB projection fixture")} type="button">Load BBB</button>
          <button data-testid="presence-spatial-load-alpha-garment-rack" onClick={() => loadWorkspace(ALPHA_GARMENT_RACK_FIXTURE, "alpha-masked garment rack evidence fixture")} type="button">Load alpha garment rack</button>
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
          <section className={styles.panel} data-testid="presence-spatial-roomkit-options">
            <div className={styles.panelHeading}>
              <div><span>00</span><h2>Rooms</h2></div>
              <small>Stable option refs</small>
            </div>
            <div className={styles.candidateOptionList}>
              {PRESENCE_ROOM_KIT_CONTAINERS.map((kit) => {
                const available = kit.status.startsWith("available-now");
                return (
                  <article className={styles.candidateOption} data-disabled={!available} key={`${kit.optionId}@${kit.version}`}>
                    <div>
                      <strong>{kit.name}</strong>
                      <small>{kit.optionId}@{kit.version}</small>
                    </div>
                    <dl>
                      <div><dt>Kind</dt><dd>room-kit / {kit.category}</dd></div>
                      <div><dt>Size</dt><dd>{formatRoomKitDimensions(kit.dimensions)}</dd></div>
                      <div><dt>Strategy</dt><dd>{kit.fallbackMode}</dd></div>
                      <div><dt>Status</dt><dd>{kit.status}</dd></div>
                    </dl>
                    <small className={kit.warnings.length > 0 ? styles.warningLine : undefined}>{kit.warnings.join(", ") || "none"}</small>
                    <div className={styles.capabilityTags} aria-label={`${kit.optionId} option labels`}>
                      <i>{kit.materialPreset}</i>
                      <i>{kit.lightingProfile}</i>
                      <i>{kit.payloadEstimate.eagerRuntimeBytes} eager bytes</i>
                      <i>fallback-safe</i>
                    </div>
                    <button
                      data-testid={`presence-spatial-load-option-${testIdToken(kit.optionId)}`}
                      disabled={!available}
                      onClick={() => handleLoadRoomKitOption(kit)}
                      type="button"
                    >
                      Load room kit
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.panel} data-testid="presence-spatial-option-aliases">
            <div className={styles.panelHeading}>
              <div><span>0A</span><h2>Presence options</h2></div>
              <small>Curated alias layer</small>
            </div>
            <div className={styles.candidateGroups}>
              {PRESENCE_OPTION_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3>{group.label}</h3>
                  <div className={styles.candidateOptionList}>
                    {group.options.map((option) => {
                      const available = (option.status.startsWith("available-now") || option.status === "internal-experimental") && Boolean(option.componentRef);
                      return (
                        <article className={styles.candidateOption} data-disabled={!available} key={`${option.optionId}@${option.version}`}>
                          <div>
                            <strong>{option.name}</strong>
                            <small>{option.optionId}@{option.version}</small>
                          </div>
                          <dl>
                            <div><dt>Kind</dt><dd>{option.kind}</dd></div>
                            <div><dt>Category</dt><dd>{option.category}</dd></div>
                            <div><dt>Strategy</dt><dd>{option.implementationStrategy}</dd></div>
                            <div><dt>Status</dt><dd>{option.status}</dd></div>
                            <div><dt>Placement</dt><dd>{option.placementType}</dd></div>
                            <div><dt>Review</dt><dd>{option.reviewStatus}</dd></div>
                          </dl>
                          <small>{option.supportedCustomisations.join(", ") || "no active customisation"}</small>
                          {option.warnings.length > 0 ? <small className={styles.warningLine}>{option.warnings.join(", ")}</small> : null}
                          <div className={styles.capabilityTags} aria-label={`${option.optionId} capability labels`}>
                            <i>{option.fallbackBehaviour.includes("proxy") || option.fallbackBehaviour.includes("semantic") ? "fallback-safe" : "fallback-visible"}</i>
                            <i>{option.componentRef ? "component-ref" : "no-component-ref"}</i>
                            <i>{option.admissionStatus}</i>
                          </div>
                          <button
                            data-testid={`presence-spatial-add-option-${testIdToken(option.optionId)}`}
                            disabled={!available}
                            onClick={() => handleAddPresenceOption(option)}
                            type="button"
                          >
                            Add option ref
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>01</span><h2>Add objects</h2></div>
              <small>Reusable procedural candidates</small>
            </div>
            <div className={styles.addGrid}>
              {ADDABLE_COMPONENTS.map((entry) => (
                <button
                  aria-label={`+ ${paletteLabel(entry.componentId)}`}
                  key={entry.componentId}
                  onClick={() => handleAdd(entry.componentId)}
                  type="button"
                >
                  <span>+ {paletteLabel(entry.componentId)}</span>
                  <small
                    aria-hidden="true"
                    className={styles.capabilityTags}
                    data-testid={`presence-spatial-palette-tags-${testIdToken(entry.componentId)}`}
                  >
                    {arrangerComponentCapabilityTags(entry).map((tag) => <i key={tag}>{tag}</i>)}
                  </small>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panel} data-testid="presence-spatial-candidate-room-kits">
            <div className={styles.panelHeading}>
              <div><span>1A</span><h2>Room kits</h2></div>
              <small>Deferred internal options</small>
            </div>
            <div className={styles.candidateOptionList}>
              {CANDIDATE_ROOM_KIT_OPTIONS.map((option) => (
                <article className={styles.candidateOption} data-disabled={option.usability !== "selectable-internal"} key={option.roomKitId}>
                  <div>
                    <strong>{option.category}</strong>
                    <small>{option.roomKitId}</small>
                  </div>
                  <p>{option.sourceName}</p>
                  <dl>
                    <div><dt>Size</dt><dd>{formatDimensions(option.dimensions)}</dd></div>
                    <div><dt>Payload</dt><dd>{option.runtimeSizeKb.toFixed(1)} KB - {option.payloadStatus}</dd></div>
                    <div><dt>Status</dt><dd>{option.usability}</dd></div>
                  </dl>
                  <small className={styles.warningLine}>{option.disabledReasons.join(", ")}</small>
                  <div className={styles.capabilityTags} aria-label={`${option.roomKitId} status labels`}>
                    {option.statusLabels.map((tag) => <i key={tag}>{tag}</i>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel} data-testid="presence-spatial-candidate-components">
            <div className={styles.panelHeading}>
              <div><span>1B</span><h2>Candidate assets</h2></div>
              <small>{CANDIDATE_COMPONENT_OPTIONS.length} filtered options</small>
            </div>
            <div className={styles.candidateGroups}>
              {CANDIDATE_COMPONENT_GROUPS.map((group) => (
                <div key={group.group}>
                  <h3>{group.group}</h3>
                  <div className={styles.candidateOptionList}>
                    {group.options.map((option) => (
                      <article className={styles.candidateOption} data-disabled={option.usability !== "selectable-internal"} key={option.componentId}>
                        <div>
                          <strong>{option.role}</strong>
                          <small>{option.componentId}@{option.version}</small>
                        </div>
                        <p>{option.observedAs}</p>
                        <dl>
                          <div><dt>Observed</dt><dd>{option.categoryGuess}</dd></div>
                          <div><dt>Size</dt><dd>{formatDimensions(option.dimensions)}</dd></div>
                          <div><dt>Runtime</dt><dd>{option.runtimeSizeKb.toFixed(1)} KB - {option.renderMode}</dd></div>
                          <div><dt>Placement</dt><dd>{option.placementType}</dd></div>
                          <div><dt>Slots</dt><dd>{option.presenceMaterialSlots.join(", ") || "none"}</dd></div>
                          <div><dt>Anchors</dt><dd>{option.anchors.join(", ") || "none"}</dd></div>
                        </dl>
                        {option.warningFlags.length > 0 ? <small className={styles.warningLine}>{option.warningFlags.join(", ")}</small> : null}
                        <div className={styles.capabilityTags} aria-label={`${option.componentId} status labels`}>
                          {option.statusLabels.map((tag) => <i key={tag}>{tag}</i>)}
                        </div>
                        <button
                          data-testid={`presence-spatial-add-candidate-${testIdToken(option.componentId)}`}
                          disabled={option.usability !== "selectable-internal"}
                          onClick={() => handleAddCandidate(option)}
                          type="button"
                        >
                          Add candidate ref
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>02</span><h2>Objects</h2></div>
              <small><span data-testid="presence-spatial-object-count">{reusableObjectCount} palette objects</span> - {editablePlacements.length - reusableObjectCount} foundation</small>
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
                  <small data-testid="presence-spatial-selected-id">{selectedPlacement.id}</small>
                  <code>
                    x {selectedTransform?.position[0].toFixed(2)} - z {selectedTransform?.position[2].toFixed(2)} - {Math.round((selectedTransform?.rotation[1] ?? 0) * 180 / Math.PI)} degrees
                  </code>
                </div>
                <div className={styles.selectionActions}>
                  <button disabled={!selectedPaletteObject} onClick={handleDuplicate} type="button">Duplicate object</button>
                  <button disabled={!selectedPaletteObject} onClick={handleDelete} type="button">Delete object</button>
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
                      <button onClick={() => handleRotate(-1)} type="button">Q - -15 degrees</button>
                      <button onClick={() => handleRotate(1)} type="button">E - +15 degrees</button>
                    </div>
                    <p className={styles.hint}>Drag in the plan, use arrow keys, or press Q/E. Rejected moves leave this object where it was.</p>
                  </>
                ) : (
                  <p className={styles.hint}>This foundation or anchored Piece is locked. Select a reusable floor or wall object to move and rotate it.</p>
                )}
              </div>
            ) : <p className={styles.empty}>Select a room object in the plan or list.</p>}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>04</span><h2>Customise</h2></div>
              <small>Reference overrides</small>
            </div>
            {selectedPlacement ? (
              <div className={styles.customisationControls}>
                <label>
                  <span>Material slot</span>
                  <select
                    disabled={selectedMaterialSlots.length === 0}
                    onChange={(event) => setSelectedMaterialSlot(event.target.value as SpatialMaterialSlotId)}
                    value={selectedMaterialSlot}
                  >
                    {selectedMaterialSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </label>
                <label>
                  <span>Material preset</span>
                  <select
                    disabled={selectedMaterialOptions.length === 0}
                    onChange={(event) => setSelectedMaterialPresetId(event.target.value as SpatialMaterialPresetId)}
                    value={selectedMaterialPresetId}
                  >
                    {selectedMaterialOptions.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                  </select>
                </label>
                <button disabled={!selectedMaterialPresetId} onClick={handleAssignMaterial} type="button">Apply material preset</button>
                <label>
                  <span>Skin preset</span>
                  <select disabled={room.skins.length === 0} onChange={(event) => setSelectedSkinId(event.target.value)} value={selectedSkinId}>
                    {room.skins.map((skin) => <option key={skin.id} value={skin.id}>{skin.label}</option>)}
                  </select>
                </label>
                <button disabled={!selectedSkinId} onClick={handleAssignSkin} type="button">Apply skin preset</button>
                <label>
                  <span>Direct surface media</span>
                  <select disabled={!canAssignDirectMedia} onChange={(event) => setSelectedMediaId(event.target.value)} value={selectedMediaId}>
                    {room.media.map((media) => <option key={media.id} value={media.id}>{media.alt}</option>)}
                  </select>
                </label>
                <button disabled={!canAssignDirectMedia || !selectedMediaId} onClick={handleAssignDirectMedia} type="button">Apply media layer</button>
                <div className={styles.inlineFields}>
                  <label>
                    <span>Action label</span>
                    <input maxLength={160} onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} />
                  </label>
                  <label>
                    <span>HTTPS link</span>
                    <input inputMode="url" onChange={(event) => setLinkHref(event.target.value)} value={linkHref} />
                  </label>
                </div>
                <button disabled={!linkLabel.trim() || !linkHref.trim()} onClick={handleAssignLink} type="button">Assign link action</button>
                <p className={styles.hint}>Overrides stay as lightweight IDs in layout JSON. Media remains a separate asset reference.</p>
              </div>
            ) : <p className={styles.empty}>Select a foundation or reusable object to customise its supported slots.</p>}
          </section>

          {selectedLibraryPiece?.pieceType === "garment" ? (
            <section className={styles.panel} data-testid="presence-spatial-garment-artwork">
              <div className={styles.panelHeading}>
                <div><span>04C</span><h2>Garment Artwork</h2></div>
                <small>{selectedLibraryPiece.label}</small>
              </div>
              <div className={styles.assignmentControls}>
                <div className={styles.inlineFields}>
                  <label>
                    <span>Article type</span>
                    <select
                      onChange={(event) => assignGarmentArtwork({ garmentArticleType: event.target.value as SpatialGarmentArticleType })}
                      value={selectedLibraryPiece.garmentArticleType ?? "generic"}
                    >
                      {["shirt", "pant", "shoe", "generic"].map((article) => (
                        <option key={article} value={article}>{article}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Artwork aspect</span>
                    <select
                      onChange={(event) => assignGarmentArtwork({
                        artworkAspect: event.target.value === "" ? null : Number(event.target.value),
                      })}
                      value={selectedLibraryPiece.artworkAspect ?? ""}
                    >
                      <option value="">Article default</option>
                      {[0.4, 0.6, 0.9, 1.2, 1.6].map((aspect) => (
                        <option key={aspect} value={aspect}>{aspect}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {garmentArtworkFields(selectedLibraryPiece.garmentArticleType ?? "generic").map((field) => (
                  <label key={field.key}>
                    <span>{field.label}</span>
                    <select
                      onChange={(event) => assignGarmentArtwork({ [field.key]: event.target.value || null })}
                      value={(selectedLibraryPiece[field.key] as string | undefined) ?? ""}
                    >
                      <option value="">No artwork ref</option>
                      {room.media
                        .filter((media) => media.kind === "image" || media.kind === "poster" || media.kind === "logo")
                        .map((media) => <option key={media.id} value={media.id}>{media.alt} ({media.kind})</option>)}
                    </select>
                  </label>
                ))}
                <ul className={styles.diagnostics}>
                  <li>
                    Rack presentation: {SPATIAL_GARMENT_HANG_PROFILES[selectedLibraryPiece.garmentArticleType ?? "generic"].hardware}
                    {" · rail drop "}
                    {SPATIAL_GARMENT_HANG_PROFILES[selectedLibraryPiece.garmentArticleType ?? "generic"].railDrop}m
                  </li>
                  {garmentArtworkWarnings(selectedLibraryPiece).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <label>
                  <input
                    checked={debugCarriers}
                    onChange={(event) => setDebugCarriers(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Show carrier bounds (debug only — not final visual quality)</span>
                </label>
              </div>
            </section>
          ) : null}

          {rackSlotState && rackSlotState.occupied > 0 ? (
            <section className={styles.panel} data-testid="presence-spatial-rack-slots">
              <div className={styles.panelHeading}>
                <div><span>04B</span><h2>Rack Slots</h2></div>
                <small>
                  {rackSlotState.occupied}/{rackSlotState.capacity} filled
                  {rackSlotState.overflow > 0 ? ` · ${rackSlotState.overflow} overflow` : ` · ${rackSlotState.open} open`}
                </small>
              </div>
              <ol className={styles.assignmentControls} data-testid="presence-spatial-rack-slot-list">
                {rackSlotState.slots.filter((slot) => slot.bindingId).map((slot) => (
                  <li key={slot.bindingId} data-slot-index={slot.index} data-overflowed={slot.overflowed}>
                    <div className={styles.inlineFields}>
                      <span>
                        {slot.index + 1}. {slot.label}
                        {slot.overflowed ? " (overflow)" : ""}
                        {slot.missingArtwork ? " — no artwork assigned" : ""}
                      </span>
                      <button
                        onClick={() => moveRackBinding(slot.bindingId!, -1)}
                        title="Move left"
                        type="button"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => moveRackBinding(slot.bindingId!, 1)}
                        title="Move right"
                        type="button"
                      >
                        →
                      </button>
                      <button onClick={() => removeRackBinding(slot.bindingId!)} title="Remove from rack" type="button">
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className={styles.panel} data-testid="presence-spatial-piece-library">
            <div className={styles.panelHeading}>
              <div><span>04A</span><h2>Piece Library</h2></div>
              <small>{pieceLibrary.length} internal pieces</small>
            </div>
            <div className={styles.assignmentControls}>
              <div className={styles.inlineFields}>
                <label>
                  <span>Piece title</span>
                  <input maxLength={200} onChange={(event) => setPieceTitle(event.target.value)} value={pieceTitle} />
                </label>
                <label>
                  <span>Piece type</span>
                  <select onChange={(event) => setPieceType(event.target.value as PieceType)} value={pieceType}>
                    {["image", "video", "audio", "garment", "text", "link", "product", "event", "flyer", "archive-item", "gallery", "collection"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Piece caption</span>
                <textarea maxLength={500} onChange={(event) => setPieceCaption(event.target.value)} rows={2} value={pieceCaption} />
              </label>
              <div className={styles.inlineFields}>
                <label>
                  <span>Piece media</span>
                  <select onChange={(event) => setPieceMediaId(event.target.value)} value={pieceMediaId}>
                    <option value="">No media ref</option>
                    {room.media.map((media) => <option key={media.id} value={media.id}>{media.alt} ({media.kind})</option>)}
                  </select>
                </label>
                <label>
                  <span>Piece action kind</span>
                  <select onChange={(event) => setPieceActionKind(event.target.value as ArrangerBindingActionKind)} value={pieceActionKind}>
                    <option value="open-link">open-link</option>
                    <option value="listen">listen</option>
                    <option value="watch">watch</option>
                    <option value="enquire">enquire</option>
                  </select>
                </label>
              </div>
              <div className={styles.inlineFields}>
                <label>
                  <span>Piece action label</span>
                  <input maxLength={160} onChange={(event) => setPieceActionLabel(event.target.value)} value={pieceActionLabel} />
                </label>
                <label>
                  <span>Piece HTTPS link</span>
                  <input inputMode="url" onChange={(event) => setPieceActionHref(event.target.value)} value={pieceActionHref} />
                </label>
              </div>
              <label>
                <span>Piece tags</span>
                <input maxLength={160} onChange={(event) => setPieceTags(event.target.value)} value={pieceTags} />
              </label>
              <button disabled={!pieceTitle.trim()} onClick={handleCreatePiece} type="button">Create internal piece</button>
              <label>
                <span>Library piece</span>
                <select onChange={(event) => setSelectedPieceId(event.target.value)} value={selectedLibraryPiece?.id ?? ""}>
                  {pieceLibrary.map((piece) => <option key={piece.id} value={piece.id}>{piece.label} ({piece.pieceType})</option>)}
                </select>
              </label>
              <ol className={styles.pieceList} data-testid="presence-spatial-piece-library-list">
                {pieceLibrary.map((piece) => (
                  <li data-selected={piece.id === selectedLibraryPiece?.id || undefined} key={piece.id}>
                    <span><strong>{piece.label}</strong><small>{piece.pieceType} / {piece.safety}</small></span>
                    <span>{piece.mediaRefs.join(", ") || "no media"} / {piece.actionRefs.join(", ") || "no actions"}</span>
                  </li>
                ))}
              </ol>
              <p className={styles.hint}>Pieces are internal browser-local records. They carry media/action ids only, not upload blobs or copied model data.</p>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}>
              <div><span>05</span><h2>Assign Pieces</h2></div>
              <small>{boundPieces.length} bound / {assignedPieces.length} placed</small>
            </div>
            {selectedPlacement && isMediaParent ? (
              <div className={styles.assignmentControls}>
                <div className={styles.bindingBox} data-testid="presence-spatial-binding-panel">
                  <dl>
                    <div><dt>Selected host</dt><dd data-testid="presence-spatial-binding-host">{selectedPlacement.id}</dd></div>
                    <div><dt>Supported binding types</dt><dd data-testid="presence-spatial-piece-host-support">{hostSupportedPieceTypes.join(", ") || "none"}</dd></div>
                    <div><dt>Overflow</dt><dd data-testid="presence-spatial-binding-overflow">{selectedBindingArrangement ? `${selectedBindingArrangement.overflow.visibleCount}/${selectedBindingArrangement.overflow.totalCount} visible, ${selectedBindingArrangement.overflow.overflowCount} overflow via ${selectedBindingArrangement.policy}` : "none"}</dd></div>
                  </dl>
                  <label>
                    <span>Selected library piece</span>
                    <select onChange={(event) => setSelectedPieceId(event.target.value)} value={selectedLibraryPiece?.id ?? ""}>
                      {pieceLibrary.map((piece) => <option key={piece.id} value={piece.id}>{piece.label} ({piece.pieceType})</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Binding media</span>
                    <select disabled={!canBindContent} onChange={(event) => setSelectedMediaId(event.target.value)} value={canBindContent ? selectedMediaId : ""}>
                      {!canBindContent ? <option value="">No compatible media or capacity</option> : null}
                      {compatibleMedia.map((media) => <option key={media.id} value={media.id}>{media.alt} ({media.kind})</option>)}
                    </select>
                  </label>
                  <div className={styles.inlineFields}>
                    <label>
                      <span>Arrangement</span>
                      <select
                        onChange={(event) => setBindingArrangementOverride(event.target.value as SpatialArrangementKind)}
                        value={bindingArrangementKind}
                      >
                        {SPATIAL_ARRANGEMENT_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                            {bindingArrangementOverride === null && kind === bindingArrangementKind ? " (host default)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Overflow policy</span>
                      <select onChange={(event) => setBindingOverflowPolicy(event.target.value as SpatialArrangementOverflowPolicy)} value={bindingOverflowPolicy}>
                        <option value="overflow-list">overflow-list</option>
                        <option value="paginate">paginate</option>
                        <option value="show-all-if-possible">show-all-if-possible</option>
                        <option value="reject-over-capacity">reject-over-capacity</option>
                      </select>
                    </label>
                    <label>
                      <span>Binding action</span>
                      <select onChange={(event) => setBindingActionKind(event.target.value as ArrangerBindingActionKind)} value={bindingActionKind}>
                        <option value="open-link">open-link</option>
                        <option value="listen">listen</option>
                        <option value="watch">watch</option>
                        <option value="enquire">enquire</option>
                      </select>
                    </label>
                  </div>
                  <button disabled={!canBindContent || !selectedLibraryPiece} onClick={handleBindSelectedPiece} type="button">Bind selected library piece</button>
                  <button disabled={!canBindContent || !selectedMediaId || !linkLabel.trim() || !linkHref.trim()} onClick={handleBindContent} type="button">Bind content to host</button>
                  <ol className={styles.pieceList} data-testid="presence-spatial-bound-pieces">
                    {boundPieces.map((piece) => (
                      <li key={piece.id}>
                        <span><strong>{piece.label}</strong><small>{piece.pieceType} / {piece.arrangementRole}</small></span>
                        <span>{piece.actionRefs.join(", ")}</span>
                      </li>
                    ))}
                  </ol>
                  {selectedBindingArrangement ? (
                    <p className={styles.hint} data-testid="presence-spatial-binding-fallback">
                      Fallback rows: {selectedBindingArrangement.fallbackRows.map((row) => `${row.label} (${row.actionRefs.join(", ") || "no actions"})`).join("; ")}
                    </p>
                  ) : <p className={styles.hint}>Bindings save as refs and order only; transforms are derived during compile.</p>}
                </div>
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
              <p className={styles.eyebrow}>Operator plan - top down</p>
              <h2>{room.label}</h2>
            </div>
            <span>Grid 0.25m - Rotation 15 degrees</span>
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
            {ARRANGER_COMPONENT_OPTIONS.map((entry) => <span key={`${entry.componentId}@${entry.version}`}><i data-component={entry.componentId} />{paletteLabel(entry.componentId)}</span>)}
          </div>
        </section>
      </div>

      <section className={styles.budgetPanel} aria-label="Spatial payload budgets">
        <div>
          <p className={styles.eyebrow}>Payload discipline</p>
          <h2>References stay light</h2>
        </div>
        <div className={styles.budgetGrid}>
          <div>
            <span>Layout JSON / 100 KB</span>
            <strong data-testid="presence-spatial-layout-bytes">{currentCompile.ok ? formatBytes(currentCompile.plan.budgets.layoutJsonBytes) : "Invalid"}</strong>
            <progress max={100 * 1024} value={currentCompile.ok ? currentCompile.plan.budgets.layoutJsonBytes : 100 * 1024} />
          </div>
          <div>
            <span>Eager runtime / 3 MB</span>
            <strong data-testid="presence-spatial-eager-bytes">{currentCompile.ok ? formatBytes(currentCompile.plan.budgets.eagerCompressedAssetBytes) : "Invalid"}</strong>
            <progress max={3 * 1024 * 1024} value={currentCompile.ok ? currentCompile.plan.budgets.eagerCompressedAssetBytes : 3 * 1024 * 1024} />
          </div>
          <div>
            <span>Total runtime / 12 MB</span>
            <strong data-testid="presence-spatial-total-bytes">{currentCompile.ok ? formatBytes(currentCompile.plan.budgets.totalCompressedAssetBytes) : "Invalid"}</strong>
            <progress max={12 * 1024 * 1024} value={currentCompile.ok ? currentCompile.plan.budgets.totalCompressedAssetBytes : 12 * 1024 * 1024} />
          </div>
        </div>
      </section>

      <section className={styles.diagnosticsPanel} data-has-errors={diagnostics.length > 0}>
        <div>
          <p className={styles.eyebrow}>Strict validation</p>
          <h2>{diagnostics.length > 0 ? `${diagnostics.length} rejected condition${diagnostics.length === 1 ? "" : "s"}` : "Last valid state active"}</h2>
          {diagnostics[0] ? <p className={styles.diagnosticAdvice}>{diagnosticAdvice(diagnostics[0])}</p> : null}
        </div>
        {diagnostics.length > 0 ? (
          <ul data-testid="presence-spatial-diagnostics">{diagnostics.slice(0, 8).map((issue, index) => (
            <li key={`${issue.path}-${issue.code}-${index}`}>
              <code>{diagnosticTitle(issue)}</code>
              <span>{issue.message}</span>
              <small>{issue.path}</small>
            </li>
          ))}</ul>
        ) : <p>Every accepted edit has compiled through the shared schema and placement rules.</p>}
      </section>

      <section className={styles.inspectorPanel} data-testid="presence-spatial-layout-inspector">
        <div>
          <p className={styles.eyebrow}>Saved-layout inspector</p>
          <h2>Readable state, not raw JSON</h2>
          <p>Use this to verify component refs, overrides and fallback status before export.</p>
        </div>
        <div className={styles.inspectorGrid}>
          <dl>
            <div>
              <dt>Layout size</dt>
              <dd data-testid="presence-spatial-inspector-layout-size">{currentCompile.ok ? formatBytes(currentCompile.plan.budgets.layoutJsonBytes) : "Invalid"}</dd>
            </div>
            <div>
              <dt>Object count</dt>
              <dd>{room.placements.length} placements / {reusableObjectCount} core objects</dd>
            </div>
            <div>
              <dt>Content bindings</dt>
              <dd data-testid="presence-spatial-inspector-content-bindings">{room.contentBindings?.length ?? 0} bindings / {currentCompile.ok ? currentCompile.plan.contentBindingArrangements.length : 0} arranged hosts</dd>
            </div>
            <div>
              <dt>Component refs</dt>
              <dd data-testid="presence-spatial-inspector-component-refs">{componentRefsUsed.join(", ") || "None"}</dd>
            </div>
          </dl>
          <dl>
            <div>
              <dt>Selected object</dt>
              <dd data-testid="presence-spatial-inspector-selected-id">{selectedPlacement?.id ?? "None selected"}</dd>
            </div>
            <div>
              <dt>Component</dt>
              <dd data-testid="presence-spatial-inspector-selected-component">{selectedPlacement ? `${selectedPlacement.componentId}@${selectedPlacement.version}` : "None selected"}</dd>
            </div>
            <div>
              <dt>Option alias</dt>
              <dd data-testid="presence-spatial-inspector-option-ref">{selectedPlacement?.optionRef ? `${selectedPlacement.optionRef.optionId}@${selectedPlacement.optionRef.version}` : "resolved component only"}</dd>
            </div>
            <div>
              <dt>Transform</dt>
              <dd>{selectedTransform ? `x ${selectedTransform.position[0].toFixed(2)}, y ${selectedTransform.position[1].toFixed(2)}, z ${selectedTransform.position[2].toFixed(2)}, yaw ${Math.round(selectedTransform.rotation[1] * 180 / Math.PI)} deg` : "None selected"}</dd>
            </div>
            <div>
              <dt>Material overrides</dt>
              <dd data-testid="presence-spatial-inspector-material-overrides">{selectedPlacement ? formatRecord(selectedPlacement.materialSlotOverrides) : "None selected"}</dd>
            </div>
            <div>
              <dt>Media / skin refs</dt>
              <dd data-testid="presence-spatial-inspector-media-skin">{selectedPlacement ? `media ${selectedPlacement.mediaRef ?? "none"} / skin ${selectedPlacement.skinRef ?? "none"}` : "None selected"}</dd>
            </div>
            <div>
              <dt>Action refs</dt>
              <dd data-testid="presence-spatial-inspector-action-refs">{selectedPlacement ? selectedActions.map((action) => `${action.id}:${action.kind}`).join(", ") || "none" : "None selected"}</dd>
            </div>
            <div>
              <dt>Fallback status</dt>
              <dd data-testid="presence-spatial-inspector-fallback">{selectedPlacement ? (selectedFallbackItem ? `semantic row: ${selectedFallbackItem.label}` : `${selectedDefinition?.mobileFallback.strategy ?? "unknown"} component fallback`) : "None selected"}{selectedBindingArrangement ? ` / bound rows ${selectedBindingArrangement.fallbackRows.length}` : ""}</dd>
            </div>
            <div>
              <dt>Arrangement / overflow</dt>
              <dd data-testid="presence-spatial-inspector-arrangement">{selectedBindingArrangement ? `${selectedBindingArrangement.kind}, ${selectedBindingArrangement.policy}, overflow ${selectedBindingArrangement.overflow.overflowCount}` : selectedPlacement?.contentArrangement ? `${selectedPlacement.contentArrangement.kind}, ${selectedPlacement.contentArrangement.overflowPolicy}` : "none"}</dd>
            </div>
            <div>
              <dt>GLB status</dt>
              <dd data-testid="presence-spatial-inspector-glb-status">{selectedRenderItem?.renderGeometry?.kind === "glb" ? `${selectedRenderItem.renderGeometry.compression} optional GLB` : "proxy-only"}</dd>
            </div>
          </dl>
        </div>
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
            debugCarriers={debugCarriers}
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
  const objects = room.placements.filter((placement) => (
    !placement.anchor.parentPlacementId
    && (
      EDITOR_COMPONENT_IDS.has(placement.componentId)
      || EDITOR_CANDIDATE_COMPONENT_IDS.has(placement.componentId)
      || PRESENCE_OPTION_COMPONENT_IDS.has(placement.componentId)
      || Boolean(placement.optionRef)
    )
  ));

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

function formatBytes(value: number): string {
  return value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`;
}

function formatDimensions(value: readonly [number, number, number]): string {
  return `${value[0].toFixed(2)} x ${value[1].toFixed(2)} x ${value[2].toFixed(2)} m`;
}

function formatRoomKitDimensions(value: SpatialRoomDefinition["bounds"]): string {
  return `${value.width.toFixed(2)} x ${value.height.toFixed(2)} x ${value.depth.toFixed(2)} m`;
}

function paletteLabel(componentId: string): string {
  return PALETTE_LABELS[componentId]
    ?? ARRANGER_COMPONENT_OPTIONS.find((entry) => entry.componentId === componentId)?.label
    ?? componentId;
}

function diagnosticTitle(issue: SpatialValidationIssue): string {
  const labels: Record<string, string> = {
    "anchor-capacity": "Capacity exceeded",
    "anchor-kind": "Invalid anchor",
    "anchor-missing": "Invalid anchor",
    "anchor-mismatch": "Invalid anchor",
    "anchor-type": "Incompatible host",
    collision: "Collision",
    "media-surface": "Incompatible media",
    "not-arranger-editable": "Locked object",
    "not-arranger-movable": "Locked object",
    "orphan-anchor": "Invalid anchor",
    "parent-in-use": "Child objects attached",
    "parent-missing": "Invalid parent",
    "piece-host-compatibility": "Incompatible host",
    "preset-slot": "Unsupported material",
    "room-bounds": "Outside room bounds",
    "unsafe-link": "Invalid action URL",
    "unsupported-slot": "Unsupported material",
  };
  return labels[issue.code] ?? issue.code;
}

function diagnosticAdvice(issue: SpatialValidationIssue): string {
  const advice: Record<string, string> = {
    "anchor-capacity": "That host has no remaining compatible Piece slots. Select another surface or remove an assigned Piece first.",
    "anchor-type": "The selected object cannot host that Piece or media type. Choose a rack, surface, projection wall, or compatible media carrier.",
    collision: "The requested position overlaps another solid object. Move it to an open grid cell.",
    "media-surface": "This object has no direct media/decal/projection surface. Use Assign Pieces on a compatible host instead.",
    "not-arranger-editable": "Foundation and child Piece placements are protected from this operation.",
    "not-arranger-movable": "Foundation and anchored Piece placements stay locked; select a reusable floor or wall object.",
    "piece-host-compatibility": "Choose a host that lists the selected Piece type under Supported binding types.",
    "preset-slot": "Choose a material preset that belongs to the selected material slot.",
    "room-bounds": "The object would leave the validated room volume. The last valid position is preserved.",
    "unsafe-link": "Use a credential-free HTTPS URL. HTTP, javascript, local and credentialed URLs are rejected.",
    "unsupported-slot": "This component does not expose that material slot. Select a supported slot from the dropdown.",
  };
  return advice[issue.code] ?? "The rejected edit was not applied; the last valid draft and preview are still active.";
}

function formatRecord(record: Record<string, string>): string {
  const entries = Object.entries(record);
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${value}`).join(", ") : "none";
}

function testIdToken(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
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
