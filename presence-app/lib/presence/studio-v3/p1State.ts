import {
  studioV2Layout,
  type PresenceStudioV2LayoutId,
  type StudioV2ChamberComposition,
  type StudioV2ObjectPlacement,
  type StudioV2PlacementSize,
  type StudioV2PlacementTreatment,
} from "../studio-v2/layouts.ts";
import { studioV3RoomStyleDefinition, STUDIO_V3_P1_LOOKS } from "./p1Catalog.ts";
import {
  findStudioV3LegacyPiece,
  findStudioV3Piece,
  isStudioV3CollectionSourceRef,
  isStudioV3PlacementId,
  isStudioV3SourceRef,
  makeStudioV3ObjectEditId,
  type StudioV3SourceRef,
} from "./sourceRefs.ts";
import { STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON } from "./model.ts";
import { containsForbiddenStudioV3Text } from "./safety.ts";
import type {
  StudioV3BaseIdentity,
  StudioV3Document,
  StudioV3Layer,
  StudioV3LayerLock,
  StudioV3LayerOverride,
  StudioV3Look,
  StudioV3LookId,
  StudioV3LookValues,
  StudioV3ObjectEdit,
  StudioV3Placement,
  StudioV3Room,
  StudioV3RoomStyleId,
  StudioV3ScopeKind,
  StudioV3StructuralSavepoint,
} from "./model.ts";

export { STUDIO_V3_ROOM_STYLE_DEFINITIONS } from "./p1Catalog.ts";

export type StudioV3StructuralOutcome = "placed" | "shelved" | "unplaced" | "duplicate";

export interface StudioV3StructuralAccounting {
  objectId: string;
  sourceRef?: string;
  beforeStatus: string;
  afterStatus: string;
  beforeZoneId?: string;
  afterZoneId?: string;
  outcome: StudioV3StructuralOutcome;
  compatible: boolean;
  changed: boolean;
  moved: boolean;
  overflow: boolean;
  reason?: string;
}

export interface StudioV3StructuralStageImpact {
  accounting: StudioV3StructuralAccounting[];
  preservedByLock: string[];
  preservedByOverride: string[];
}

export interface StudioV3StructuralComparison {
  fingerprint: string;
  structure: ReturnType<typeof structuralProjection>;
}

export interface StudioV3StructuralStageReady {
  status: "ready";
  originalDocument: StudioV3Document;
  stagedDocument: StudioV3Document;
  savepoint: StudioV3StructuralSavepoint;
  compare: {
    before: StudioV3StructuralComparison;
    after: StudioV3StructuralComparison;
  };
  impact: StudioV3StructuralStageImpact;
}

export interface StudioV3StructuralStageBlocked {
  status: "blocked";
  reason: "room-missing" | "look-missing" | "savepoint-capacity";
  originalDocument: StudioV3Document;
  stagedDocument: StudioV3Document;
  savepoint: StudioV3StructuralSavepoint;
  compare: {
    before: StudioV3StructuralComparison;
    after: StudioV3StructuralComparison;
  };
  impact: StudioV3StructuralStageImpact;
}

export type StudioV3StructuralStage = StudioV3StructuralStageReady | StudioV3StructuralStageBlocked;

export interface StudioV3RestoreIssue {
  kind: "missing-room" | "missing-piece" | "missing-look" | "missing-collection" | "invalid-reference";
  reference: string;
}

export interface StudioV3RestoreReport {
  status: "exact" | "partial" | "rejected";
  issues: StudioV3RestoreIssue[];
}

export interface StudioV3RestoreResult {
  document: StudioV3Document;
  report: StudioV3RestoreReport;
}

export interface StudioV3ScopedCandidate<T> {
  value: T;
  provenance: string;
}

export function resolveStudioV3ScopedValue<T>(input: {
  presence?: StudioV3ScopedCandidate<T>;
  room?: StudioV3ScopedCandidate<T>;
  collection?: StudioV3ScopedCandidate<T>;
  piece?: StudioV3ScopedCandidate<T>;
}): (StudioV3ScopedCandidate<T> & { scopeKind: StudioV3ScopeKind }) | null {
  for (const scopeKind of ["piece", "collection", "room", "presence"] as const) {
    const candidate = input[scopeKind];
    if (candidate) return { ...candidate, scopeKind };
  }
  return null;
}

export function hasStudioV3ServerRevision(identity: StudioV3BaseIdentity): identity is StudioV3BaseIdentity & { revision: number } {
  return Number.isInteger(identity.revision) && Number(identity.revision) >= 1;
}

function matchingStudioV3ObjectEdit(
  document: StudioV3Document,
  input: { roomId: string; objectId: string; sourceRef: StudioV3SourceRef },
): StudioV3ObjectEdit | undefined {
  const edit = document.objectEdits[makeStudioV3ObjectEditId(input.roomId, input.objectId)];
  if (!edit
    || edit.roomId !== input.roomId
    || edit.objectId !== input.objectId
    || edit.sourceRef !== input.sourceRef) return undefined;
  return edit;
}

export function isStudioV3ObjectEffectivelyHidden(
  document: StudioV3Document,
  input: { roomId: string; objectId: string; sourceRef: StudioV3SourceRef },
): boolean {
  const edit = matchingStudioV3ObjectEdit(document, input);
  return edit?.visibility === "hidden"
    && !isRequiredCtaSource(document, input.sourceRef, input.roomId, input.objectId);
}

export function stageStudioV3RoomStyle(
  document: StudioV3Document,
  input: { roomId: string; roomStyleId: StudioV3RoomStyleId; now?: string },
): StudioV3StructuralStage {
  const room = document.rooms.find((candidate) => candidate.id === input.roomId);
  if (!room) return blockedStage(document, "room-missing");
  if (document.savepoints.length >= STUDIO_V3_PRIVATE_METADATA_MAX_ITEMS) return blockedStage(document, "savepoint-capacity");
  const now = input.now ?? new Date().toISOString();
  const savepoint = createStructuralSavepoint(document, now);
  const matchingLock = document.locks.find((lock) => (
    lock.scopeKind === "room" && lock.scopeId === room.id && lock.layer === "room-style"
  ));
  const matchingOverride = document.layerOverrides.find((override) => (
    override.scopeKind === "room" && override.scopeId === room.id && override.layer === "room-style"
  ));
  const targetStyle = roomStyleValue(matchingOverride?.value) ?? roomStyleValue(matchingLock?.value) ?? input.roomStyleId;
  const remapped = remapRoomForStyle(document, room, targetStyle);
  const objectEdits = reconcileRoomStyleObjectEdits(document, room, remapped.room);
  const stagedDocument: StudioV3Document = {
    ...document,
    objectEdits,
    rooms: document.rooms.map((candidate) => candidate.id === room.id ? remapped.room : candidate),
  };
  return readyStage(document, stagedDocument, savepoint, {
    accounting: remapped.accounting,
    preservedByLock: matchingLock ? [matchingLock.id] : [],
    preservedByOverride: matchingOverride ? [matchingOverride.id] : [],
  });
}

export function remapStudioV3RoomForCurrentStyle(
  document: StudioV3Document,
  roomId: string,
): StudioV3Document {
  const room = document.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return document;
  const remapped = remapRoomForStyle(document, room, room.styleId);
  return {
    ...document,
    rooms: document.rooms.map((candidate) => candidate.id === room.id ? remapped.room : candidate),
  };
}

export function stageStudioV3LookRoomStyleRecommendation(
  document: StudioV3Document,
  input: { roomId: string; lookId: StudioV3LookId; now?: string },
): StudioV3StructuralStage {
  const room = document.rooms.find((candidate) => candidate.id === input.roomId);
  const look = document.looks[input.lookId] ?? STUDIO_V3_P1_LOOKS.find((candidate) => candidate.id === input.lookId);
  if (!room) return blockedStage(document, "room-missing");
  if (!look) return blockedStage(document, "look-missing");

  const matchingLock = document.locks.find((lock) =>
    lock.scopeKind === "room" && lock.scopeId === room.id && lock.layer === "room-style"
  );
  const matchingOverride = document.layerOverrides.find((override) =>
    override.scopeKind === "room" && override.scopeId === room.id && override.layer === "room-style"
  );
  const lockedStyle = roomStyleValue(matchingLock?.value);
  const overrideStyle = roomStyleValue(matchingOverride?.value);
  const targetStyle = overrideStyle ?? lockedStyle ?? look.values.roomStyleId;
  const baseStage = stageStudioV3RoomStyle(document, {
    roomId: room.id,
    roomStyleId: targetStyle,
    now: input.now,
  });
  if (baseStage.status !== "ready") return baseStage;
  return {
    ...baseStage,
    stagedDocument: {
      ...baseStage.stagedDocument,
      activeLookId: look.id,
    },
    impact: {
      ...baseStage.impact,
      preservedByLock: matchingLock ? [matchingLock.id] : [],
      preservedByOverride: matchingOverride ? [matchingOverride.id] : [],
    },
  };
}

export function applyStudioV3StructuralStage(stage: StudioV3StructuralStage): {
  document: StudioV3Document;
  report: StudioV3RestoreReport;
} {
  if (stage.status !== "ready") {
    return { document: stage.originalDocument, report: { status: "rejected", issues: [] } };
  }
  const savepoints = stage.stagedDocument.savepoints.some((item) => item.id === stage.savepoint.id)
    ? stage.stagedDocument.savepoints
    : [...stage.stagedDocument.savepoints, stage.savepoint];
  if (savepoints.length > STUDIO_V3_PRIVATE_METADATA_MAX_ITEMS) {
    return { document: stage.originalDocument, report: { status: "rejected", issues: [] } };
  }
  return {
    document: { ...stage.stagedDocument, savepoints },
    report: { status: "exact", issues: [] },
  };
}

export function cancelStudioV3StructuralStage(stage: StudioV3StructuralStage): StudioV3RestoreResult {
  if (stage.status !== "ready") {
    return { document: stage.originalDocument, report: { status: "rejected", issues: [] } };
  }
  const exact = structuralFingerprint(stage.originalDocument) === stage.compare.before.fingerprint;
  return {
    document: stage.originalDocument,
    report: { status: exact ? "exact" : "partial", issues: [] },
  };
}

export function compareStudioV3StructuralStage(
  stage: Pick<StudioV3StructuralStageReady, "originalDocument" | "stagedDocument">,
  side: "before" | "after",
) {
  return structuralProjection(side === "before" ? stage.originalDocument : stage.stagedDocument);
}

export function restoreStudioV3Savepoint(
  current: StudioV3Document,
  savepoint: StudioV3StructuralSavepoint,
): StudioV3RestoreResult {
  if (!savepointPreservesRequiredCta(current, savepoint)) {
    return { document: current, report: { status: "rejected", issues: [] } };
  }
  const issues: StudioV3RestoreIssue[] = [];
  const currentRooms = new Map(current.rooms.map((room) => [room.id, room]));
  const currentPieceRefs = new Set(Object.values(current.pieces).map((piece) => piece.sourceRef));
  const restoredRooms: StudioV3Room[] = [];

  for (const saved of [...savepoint.rooms].sort((a, b) => a.order - b.order)) {
    const currentRoom = currentRooms.get(saved.roomId);
    if (!currentRoom) {
      issues.push({ kind: "missing-room", reference: saved.roomId });
      continue;
    }
    const placements = saved.placements.filter((placement) => {
      if (findStudioV3Piece(current.pieces, placement.sourceRef, saved.roomId)) return true;
      issues.push({ kind: "missing-piece", reference: placement.sourceRef });
      return false;
    }).map((placement) => normalizePrivatePlacement(current, { ...placement }));
    const baseObjectIds = saved.baseObjectIds.filter((objectId) => {
      if (findStudioV3LegacyPiece(current.pieces, saved.roomId, objectId)) return true;
      issues.push({ kind: "missing-piece", reference: objectId });
      return false;
    });
    const restoredObjectIds = new Set([
      ...baseObjectIds,
      ...placements.filter((placement) => canPlacementEnterComposition(current, placement)).map((placement) => placement.id),
    ]);
    const composition = saved.composition ? {
      ...structuredClone(saved.composition),
      placements: saved.composition.placements.filter((placement) => {
        if (restoredObjectIds.has(placement.objectId)) return true;
        issues.push({ kind: "missing-piece", reference: placement.objectId });
        return false;
      }),
    } : undefined;
    restoredRooms.push({
      ...currentRoom,
      styleId: saved.styleId,
      collectionPresentationId: saved.collectionPresentationId,
      composition,
      baseObjectIds,
      placements,
    });
  }
  for (const room of current.rooms) if (!savepoint.rooms.some((saved) => saved.roomId === room.id)) restoredRooms.push(room);

  const activeRoomId = restoredRooms.some((room) => room.id === savepoint.activeRoomId)
    ? savepoint.activeRoomId
    : restoredRooms[0]?.id ?? current.activeRoomId;
  const activeLookId = current.looks[savepoint.activeLookId] || current.namedLooks.some((look) => look.id === savepoint.activeLookId)
    ? savepoint.activeLookId
    : current.activeLookId;
  if (activeLookId !== savepoint.activeLookId) issues.push({ kind: "missing-look", reference: savepoint.activeLookId });
  const restoredRoomIds = new Set(restoredRooms.map((room) => room.id));
  const entryRoomId = restoredRoomIds.has(savepoint.navigation.entryRoomId)
    ? savepoint.navigation.entryRoomId
    : restoredRooms[0]?.id ?? current.navigation.entryRoomId;
  if (entryRoomId !== savepoint.navigation.entryRoomId) issues.push({ kind: "missing-room", reference: savepoint.navigation.entryRoomId });
  const destinationToken = savepoint.navigation.requiredCta.destinationToken;
  const destinationRoomId = destinationToken?.startsWith("room:") ? destinationToken.slice("room:".length) : null;
  const safeDestinationToken = destinationRoomId && !restoredRoomIds.has(destinationRoomId)
    ? "existing-base" as const
    : destinationToken;
  if (destinationRoomId && safeDestinationToken !== destinationToken) issues.push({ kind: "missing-room", reference: destinationRoomId });
  const ctaSourceRef = savepoint.navigation.requiredCta.sourceRef;
  const safeCtaSourceRef = ctaSourceRef && currentPieceRefs.has(ctaSourceRef) ? ctaSourceRef : undefined;
  if (ctaSourceRef && !safeCtaSourceRef) issues.push({ kind: "missing-piece", reference: ctaSourceRef });
  const roomOrder = restoredRooms.map((room) => room.id);

  const scopeExists = (scopeKind: StudioV3ScopeKind, scopeId: string) => {
    if (scopeKind === "presence") return scopeId === String(current.nodeId);
    if (scopeKind === "room") return restoredRoomIds.has(scopeId);
    if (scopeKind === "collection") return Boolean(current.collections[scopeId]);
    return (isStudioV3SourceRef(scopeId) && Boolean(findStudioV3Piece(current.pieces, scopeId)))
      || Object.values(current.pieces).some((piece) => piece.id === scopeId);
  };
  const locks = savepoint.locks.filter((lock) => {
    if (scopeExists(lock.scopeKind, lock.scopeId)) return true;
    issues.push({ kind: "invalid-reference", reference: lock.scopeId });
    return false;
  });
  const layerOverrides = savepoint.layerOverrides.filter((override) => {
    if (scopeExists(override.scopeKind, override.scopeId)) return true;
    issues.push({ kind: "invalid-reference", reference: override.scopeId });
    return false;
  });

  return {
    document: {
      ...current,
      activeRoomId,
      activeLookId,
      rooms: restoredRooms,
      navigation: {
        entryRoomId,
        roomOrder,
        requiredCta: {
          visible: savepoint.navigation.requiredCta.visible,
          ...(safeCtaSourceRef ? { sourceRef: safeCtaSourceRef } : {}),
          ...(safeDestinationToken ? { destinationToken: safeDestinationToken } : {}),
        },
      },
      locks: structuredClone(locks),
      layerOverrides: structuredClone(layerOverrides),
    },
    report: { status: issues.length ? "partial" : "exact", issues: dedupeIssues(issues) },
  };
}

export interface StudioV3PrivateMetadata extends Record<string, unknown> {
  owner_mode?: StudioV3Document["mode"];
  named_looks?: Array<Record<string, unknown>>;
  layer_locks?: Array<Record<string, unknown>>;
  savepoints?: Array<Record<string, unknown>>;
  placements?: Array<Record<string, unknown>>;
  object_edits?: Array<Record<string, unknown>>;
  layer_values?: Array<Record<string, unknown>>;
  restore?: Record<string, unknown>;
  compatibility?: Array<Record<string, unknown>>;
}

export const STUDIO_V3_PRIVATE_METADATA_MAX_BYTES = 256 * 1024;
export const STUDIO_V3_PRIVATE_METADATA_SECTION_MAX_BYTES = 96 * 1024;
export const STUDIO_V3_PRIVATE_METADATA_MAX_DEPTH = 9;
export const STUDIO_V3_PRIVATE_METADATA_MAX_ITEMS = 160;

export interface StudioV3ProjectedMetadata extends StudioV3PrivateMetadata {
  owner_mode: StudioV3Document["mode"];
  named_looks: Array<Record<string, unknown>>;
  layer_locks: Array<Record<string, unknown>>;
  savepoints: Array<Record<string, unknown>>;
  placements: Array<Record<string, unknown>>;
  object_edits: Array<Record<string, unknown>>;
  layer_values: Array<Record<string, unknown>>;
  restore: Record<string, unknown>;
  compatibility: Array<Record<string, unknown>>;
}

export function projectStudioV3Metadata(
  document: StudioV3Document,
  options: { savepoint?: StudioV3StructuralSavepoint; restoreReport?: StudioV3RestoreReport } = {},
): StudioV3ProjectedMetadata {
  const savepoints = uniqueById([
    ...document.savepoints,
    ...(options.savepoint ? [options.savepoint] : []),
  ]).filter((savepoint) => Number.isInteger(savepoint.baseRevision) && Number(savepoint.baseRevision) >= 1);
  const projectedSavepoints = savepoints.map(projectSavepoint);
  const placements = document.rooms.flatMap((room) => room.placements.map(projectPlacement));
  const activeSavepoint = options.savepoint ?? savepoints[savepoints.length - 1];
  const unresolvedRefs = options.restoreReport?.issues.map((issue) => stableToken(issue.reference)).filter(Boolean) ?? [];
  return {
    owner_mode: document.mode,
    named_looks: document.namedLooks.map(projectNamedLook),
    layer_locks: document.locks.map(projectLayerLock).filter(isRecord),
    savepoints: projectedSavepoints,
    placements,
    object_edits: Object.values(document.objectEdits).map(projectObjectEdit),
    layer_values: document.layerOverrides.map(projectLayerValue).filter(isRecord),
    restore: {
      ...(activeSavepoint ? { activeSavepointId: activeSavepoint.id } : {}),
      ...(options.restoreReport && activeSavepoint ? { lastRestoredSavepointId: activeSavepoint.id } : {}),
      activeRoomId: document.activeRoomId,
      activeLookId: document.activeLookId,
      roomStyles: document.rooms.map(projectRoomStyle),
      ...(activeSavepoint ? { comparison: { savepointId: activeSavepoint.id, view: "after" } } : {}),
      unresolvedRefs,
    },
    compatibility: projectCompatibility(document),
  };
}

export function restoreStudioV3Metadata(
  baseDocument: StudioV3Document,
  metadata: unknown,
): StudioV3RestoreResult {
  if (!isSafeStudioV3MetadataEnvelope(metadata)) {
    return { document: baseDocument, report: { status: "rejected", issues: [] } };
  }
  const source = metadata as StudioV3PrivateMetadata;
  const issues: StudioV3RestoreIssue[] = [];
  let document = baseDocument;

  const namedLooks = source.named_looks === undefined
    ? structuredClone(baseDocument.namedLooks)
    : parseNamedLooks(source.named_looks);
  const namedLookMap = Object.fromEntries(namedLooks.map((look) => [look.id, look]));
  const parsedSavepoints = (source.savepoints ?? baseDocument.savepoints.map(projectSavepoint)).map((row) => parseSavepoint(row));
  if (parsedSavepoints.some((savepoint) => !savepoint)) {
    return { document: baseDocument, report: { status: "rejected", issues: [] } };
  }
  if (parsedSavepoints.some((savepoint) => savepoint && !savepointPreservesRequiredCta(baseDocument, savepoint))) {
    return { document: baseDocument, report: { status: "rejected", issues: [] } };
  }
  document = {
    ...document,
    mode: source.owner_mode ?? document.mode,
    namedLooks,
    looks: { ...document.looks, ...namedLookMap },
    savepoints: parsedSavepoints.filter((savepoint): savepoint is StudioV3StructuralSavepoint => Boolean(savepoint)),
  };

  const placementsByRoom = new Map<string, StudioV3Placement[]>();
  const restoredPlacementIds = new Set<string>();
  for (const row of source.placements ?? []) {
    const parsedPlacement = parsePlacement(row);
    if (!parsedPlacement) return { document: baseDocument, report: { status: "rejected", issues: [] } };
    if (!findStudioV3Piece(document.pieces, parsedPlacement.sourceRef, parsedPlacement.roomId)) {
      issues.push({ kind: "missing-piece", reference: parsedPlacement.sourceRef });
      continue;
    }
    if (!document.rooms.some((room) => room.id === parsedPlacement.roomId)) {
      return {
        document: baseDocument,
        report: { status: "rejected", issues: [{ kind: "missing-room", reference: parsedPlacement.roomId }] },
      };
    }
    if (isRequiredCtaSource(document, parsedPlacement.sourceRef, parsedPlacement.roomId, parsedPlacement.id)
      && (parsedPlacement.status !== "placed" || parsedPlacement.visibility === "hidden")) {
      return { document: baseDocument, report: { status: "rejected", issues: [] } };
    }
    const placement = normalizePrivatePlacement(document, parsedPlacement);
    restoredPlacementIds.add(placement.id);
    const bucket = placementsByRoom.get(placement.roomId) ?? [];
    bucket.push(placement);
    placementsByRoom.set(placement.roomId, bucket);
  }
  if (source.placements !== undefined) {
    const requiredPlacementMissing = baseDocument.rooms.some((room) => room.placements.some((placement) => (
      isRequiredCtaSource(baseDocument, placement.sourceRef, room.id, placement.id) && !restoredPlacementIds.has(placement.id)
    )));
    if (requiredPlacementMissing) return { document: baseDocument, report: { status: "rejected", issues: [] } };
  }

  const restore = source.restore ?? {};
  const roomStyles = Array.isArray(restore.roomStyles) ? restore.roomStyles : [];
  const hasPlacementOverlay = source.placements !== undefined;
  let rooms = document.rooms.map((room) => {
    const placements = hasPlacementOverlay
      ? placementsByRoom.get(room.id) ?? []
      : room.placements;
    return {
      ...room,
      placements: [...placements].sort((a, b) => a.order - b.order),
    };
  });
  for (const raw of roomStyles) {
    const parsed = parseRoomStyle(raw);
    if (!parsed) return { document: baseDocument, report: { status: "rejected", issues: [] } };
    const roomIndex = rooms.findIndex((room) => room.id === parsed.roomId);
    if (roomIndex < 0) {
      issues.push({ kind: "missing-room", reference: parsed.roomId });
      continue;
    }
    const currentForRemap = {
      ...document,
      ...(source.object_edits === undefined ? {} : { objectEdits: {} }),
      rooms,
    };
    rooms[roomIndex] = remapRoomForStyle(currentForRemap, rooms[roomIndex]!, parsed.styleId).room;
  }
  document = { ...document, rooms };

  const locks = source.layer_locks === undefined
    ? baseDocument.locks
    : source.layer_locks.map(parseLayerLock);
  if (locks.some((lock) => !lock)) return { document: baseDocument, report: { status: "rejected", issues: [] } };
  const parsedLocks = locks.filter((lock): lock is StudioV3LayerLock => Boolean(lock));
  if (parsedLocks.some((lock) => lock.scopeKind === "presence" && lock.scopeId !== String(document.nodeId))) {
    return { document: baseDocument, report: { status: "rejected", issues: [] } };
  }
  const restoredLocks = parsedLocks.filter((lock) => {
    if (privateScopeExists(document, lock.scopeKind, lock.scopeId)) return true;
    issues.push({ kind: "invalid-reference", reference: lock.scopeId });
    return false;
  });

  const layerOverrides = source.layer_values === undefined
    ? baseDocument.layerOverrides
    : source.layer_values.map((row) => parseLayerValue(row));
  if (layerOverrides.some((override) => !override)) return { document: baseDocument, report: { status: "rejected", issues: [] } };
  if (layerOverrides.some((override) => override?.scopeKind === "presence" && override.scopeId !== String(document.nodeId))) {
    return { document: baseDocument, report: { status: "rejected", issues: [] } };
  }
  const restoredLayerOverrides = layerOverrides.filter((override): override is StudioV3LayerOverride => Boolean(override)).filter((override) => {
    if (privateScopeExists(document, override.scopeKind, override.scopeId)) return true;
    issues.push({ kind: "invalid-reference", reference: override.scopeId });
    return false;
  });

  let objectEdits: Record<string, StudioV3ObjectEdit> = source.object_edits === undefined
    ? structuredClone(baseDocument.objectEdits)
    : {};
  for (const row of source.object_edits ?? []) {
    const parsed = parseObjectEdit(row);
    if (!parsed) return { document: baseDocument, report: { status: "rejected", issues: [] } };
    const room = document.rooms.find((candidate) => candidate.id === parsed.roomId);
    const placement = room?.placements.find((candidate) => candidate.id === parsed.objectId);
    const targetSourceRef = placement?.sourceRef
      ?? findStudioV3LegacyPiece(document.pieces, parsed.roomId, parsed.objectId)?.sourceRef;
    if (!room || targetSourceRef !== parsed.sourceRef
      || findStudioV3Piece(document.pieces, parsed.sourceRef, parsed.roomId)?.sourceStatus !== "current") {
      issues.push({ kind: room ? "missing-piece" : "missing-room", reference: room ? parsed.sourceRef : parsed.roomId });
      continue;
    }
    if (isRequiredCtaSource(document, parsed.sourceRef, parsed.roomId, parsed.objectId)
      && (parsed.visibility === "hidden" || (parsed.title !== undefined && !parsed.title.trim()))) {
      return { document: baseDocument, report: { status: "rejected", issues: [] } };
    }
    const safeEdit = sanitizeRestoredObjectArrangement(document, room, parsed, issues);
    const mediaSourcePiece = safeEdit.mediaSourceRef
      ? findStudioV3Piece(document.pieces, safeEdit.mediaSourceRef, parsed.roomId)
      : undefined;
    if (safeEdit.mediaSourceRef && (mediaSourcePiece?.sourceStatus !== "current" || !mediaSourcePiece?.media)) {
      issues.push({ kind: "missing-piece", reference: safeEdit.mediaSourceRef });
      delete safeEdit.mediaSourceRef;
      delete safeEdit.mediaAlt;
    }
    if (safeEdit.mediaId && document.mediaAssets[safeEdit.mediaId]?.sourceStatus !== "current") {
      issues.push({ kind: "invalid-reference", reference: safeEdit.mediaId });
      delete safeEdit.mediaId;
      delete safeEdit.mediaAlt;
    }
    if (hasObjectEditPayload(safeEdit)) {
      objectEdits[safeEdit.id] = safeEdit;
    }
  }
  if (source.object_edits !== undefined) {
    const compositionEditRoomIds = new Set([
      ...Object.values(baseDocument.objectEdits),
      ...Object.values(objectEdits),
    ]
      .filter((edit) => edit.visibility === "hidden" || hasObjectArrangement(edit))
      .map((edit) => edit.roomId));
    const documentWithObjectEdits = { ...document, objectEdits };
    document = {
      ...documentWithObjectEdits,
      rooms: document.rooms.map((room) => compositionEditRoomIds.has(room.id)
        ? remapRoomForStyle(documentWithObjectEdits, room, room.styleId).room
        : room),
    };
    objectEdits = enforceRestoredObjectArrangementCapacity(document, objectEdits, issues);
  }
  document = {
    ...document,
    locks: restoredLocks,
    layerOverrides: restoredLayerOverrides,
    objectEdits,
  };

  const activeRoomId = typeof restore.activeRoomId === "string" && document.rooms.some((room) => room.id === restore.activeRoomId)
    ? restore.activeRoomId
    : document.activeRoomId;
  const activeLookId = typeof restore.activeLookId === "string" && (document.looks[restore.activeLookId] || namedLookMap[restore.activeLookId])
    ? restore.activeLookId as StudioV3Look["id"]
    : document.activeLookId;
  if (typeof restore.activeRoomId === "string" && activeRoomId !== restore.activeRoomId) issues.push({ kind: "missing-room", reference: restore.activeRoomId });
  if (typeof restore.activeLookId === "string" && activeLookId !== restore.activeLookId) issues.push({ kind: "missing-look", reference: restore.activeLookId });

  return {
    document: { ...document, activeRoomId, activeLookId },
    report: { status: issues.length ? "partial" : "exact", issues: dedupeIssues(issues) },
  };
}

function blockedStage(document: StudioV3Document, reason: StudioV3StructuralStageBlocked["reason"]): StudioV3StructuralStageBlocked {
  const savepoint = createStructuralSavepoint(document, new Date().toISOString());
  const comparison = { fingerprint: structuralFingerprint(document), structure: structuralProjection(document) };
  return {
    status: "blocked",
    reason,
    originalDocument: document,
    stagedDocument: document,
    savepoint,
    compare: { before: comparison, after: comparison },
    impact: { accounting: [], preservedByLock: [], preservedByOverride: [] },
  };
}

function readyStage(
  originalDocument: StudioV3Document,
  stagedDocument: StudioV3Document,
  savepoint: StudioV3StructuralSavepoint,
  impact: StudioV3StructuralStageImpact,
): StudioV3StructuralStageReady {
  return {
    status: "ready",
    originalDocument,
    stagedDocument,
    savepoint,
    compare: {
      before: { fingerprint: structuralFingerprint(originalDocument), structure: structuralProjection(originalDocument) },
      after: { fingerprint: structuralFingerprint(stagedDocument), structure: structuralProjection(stagedDocument) },
    },
    impact,
  };
}

function remapRoomForStyle(
  document: StudioV3Document,
  room: StudioV3Room,
  roomStyleId: StudioV3RoomStyleId,
): { room: StudioV3Room; accounting: StudioV3StructuralAccounting[] } {
  const definition = studioV3RoomStyleDefinition(roomStyleId);
  const layout = studioV2Layout(definition.v2LayoutId);
  const beforeZones = new Map((room.composition?.placements ?? []).map((placement) => [placement.objectId, placement.zoneId]));
  const currentPlacements = room.composition?.layoutId === layout.id
    ? new Map(room.composition.placements.map((placement) => [placement.objectId, placement]))
    : new Map<string, StudioV2ObjectPlacement>();
  const zoneCounts = new Map<string, number>();
  const compositionPlacements: StudioV2ObjectPlacement[] = [];
  const accounting: Array<{ index: number; row: StudioV3StructuralAccounting }> = [];
  const nextPlacements = room.placements.map((placement) => ({ ...placement }));
  const candidates = [
    ...room.baseObjectIds.map((objectId) => ({ objectId, placement: undefined as StudioV3Placement | undefined })),
    ...nextPlacements.map((placement) => ({ objectId: placement.id, placement })),
  ].map((candidate, index) => {
    const piece = candidate.placement
      ? findStudioV3Piece(document.pieces, candidate.placement.sourceRef, room.id)
      : findStudioV3LegacyPiece(document.pieces, room.id, candidate.objectId);
    const sourceRef = candidate.placement?.sourceRef ?? piece?.sourceRef;
    const edit = sourceRef ? matchingStudioV3ObjectEdit(document, {
      roomId: room.id,
      objectId: candidate.objectId,
      sourceRef,
    }) : undefined;
    const hiddenByObjectEdit = sourceRef ? isStudioV3ObjectEffectivelyHidden(document, {
      roomId: room.id,
      objectId: candidate.objectId,
      sourceRef,
    }) : false;
    const compatibleZones = piece ? layout.zones.filter((item) => item.accepts.includes(piece.snapshotType)) : [];
    const eligibleForPlacement = Boolean(piece
      && piece.sourceStatus === "current"
      && candidate.placement?.visibility !== "hidden"
      && candidate.placement?.status !== "duplicate"
      && !hiddenByObjectEdit
      && piece.compatibleRoomStyles.includes(roomStyleId));
    const currentZone = eligibleForPlacement
      ? compatibleZones.find((zone) => zone.id === currentPlacements.get(candidate.objectId)?.zoneId)
      : undefined;
    const editedZone = eligibleForPlacement && edit?.zoneId
      ? compatibleZones.find((zone) => zone.id === edit.zoneId)
      : undefined;
    const reservedZone = editedZone ?? currentZone;
    const requiredCta = sourceRef
      ? isRequiredCtaSource(document, sourceRef, room.id, candidate.objectId)
      : false;
    const requiredCtaNeedsBoundedReservation = requiredCta && compatibleZones.length > 0
      && compatibleZones.every((zone) => zone.maxObjects !== undefined);
    const reservationPriority = eligibleForPlacement && requiredCtaNeedsBoundedReservation
      ? -1
      : currentZone && (!editedZone || currentZone.id === editedZone.id)
        ? 0
        : editedZone
          ? 1
          : 2;
    return {
      ...candidate,
      index,
      piece,
      sourceRef,
      hiddenByObjectEdit,
      compatibleZones,
      reservedZone,
      reservationPriority,
      edit,
    };
  }).sort((left, right) => left.reservationPriority - right.reservationPriority
    || (left.reservationPriority === 1 ? (left.edit?.id ?? "").localeCompare(right.edit?.id ?? "") : 0)
    || left.index - right.index);

  for (const candidate of candidates) {
    const { piece, sourceRef, hiddenByObjectEdit, compatibleZones } = candidate;
    const beforeStatus = candidate.placement?.status ?? "placed";
    let outcome: StudioV3StructuralOutcome = beforeStatus === "duplicate" ? "duplicate" : "placed";
    let compatible = Boolean(piece);
    let reason: string | undefined;
    let overflow = false;
    let zone = candidate.reservedZone
      && (candidate.reservedZone.maxObjects === undefined
        || (zoneCounts.get(candidate.reservedZone.id) ?? 0) < candidate.reservedZone.maxObjects)
      ? candidate.reservedZone
      : compatibleZones.find((item) => item.maxObjects === undefined || (zoneCounts.get(item.id) ?? 0) < item.maxObjects);
    if (piece && (piece.sourceStatus !== "current" || candidate.placement?.visibility === "hidden" || hiddenByObjectEdit)) {
      compatible = false;
      outcome = "shelved";
      zone = undefined;
      reason = STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON;
      if (candidate.placement && piece.sourceStatus !== "current") candidate.placement.visibility = "hidden";
    } else if (candidate.placement?.status === "duplicate") {
      compatible = true;
      zone = undefined;
      reason = candidate.placement.reason ?? "Duplicate placement remains retained on the Piece Shelf.";
    } else if (!piece) {
      compatible = false;
      outcome = "unplaced";
      zone = undefined;
      reason = "The referenced Piece is no longer available.";
    } else if (!piece.compatibleRoomStyles.includes(roomStyleId)) {
      compatible = false;
      outcome = "shelved";
      zone = undefined;
      reason = "This Piece is incompatible with the selected Room Style.";
    } else if (!zone && compatibleZones.length > 0) {
      compatible = true;
      outcome = "shelved";
      overflow = true;
      reason = `The bounded ${compatibleZones[0]!.label} capacity is full; this Piece remains retained.`;
      zone = undefined;
    } else if (!zone) {
      compatible = false;
      outcome = "unplaced";
      reason = "The selected Room Style has no compatible zone for this Piece.";
    }

    if (zone) {
      const order = zoneCounts.get(zone.id) ?? 0;
      zoneCounts.set(zone.id, order + 1);
      compositionPlacements.push({
        objectId: candidate.objectId,
        chamberId: room.id,
        layoutId: definition.v2LayoutId,
        zoneId: zone.id,
        order,
        size: zone.defaultSize,
        treatment: zone.allowedTreatments?.[0],
      });
    }
    const objectEditVisibilityOverlay = Boolean(candidate.placement
      && hiddenByObjectEdit
      && piece?.sourceStatus === "current"
      && candidate.placement.visibility !== "hidden"
      && candidate.placement.status !== "duplicate"
      && piece.compatibleRoomStyles.includes(roomStyleId));
    if (candidate.placement) {
      candidate.placement.status = objectEditVisibilityOverlay
        ? "placed"
        : outcome === "unplaced" || outcome === "shelved"
          ? "shelved"
          : outcome;
      candidate.placement.reason = candidate.placement.status === "placed" ? undefined : reason;
    }
    const beforeZoneId = beforeZones.get(candidate.objectId);
    const afterZoneId = zone?.id;
    const afterStatus = objectEditVisibilityOverlay ? outcome : candidate.placement?.status ?? outcome;
    accounting.push({
      index: candidate.index,
      row: {
        objectId: candidate.objectId,
        sourceRef,
        beforeStatus,
        afterStatus,
        beforeZoneId,
        afterZoneId,
        outcome,
        compatible,
        changed: beforeStatus !== afterStatus || beforeZoneId !== afterZoneId || room.styleId !== roomStyleId,
        moved: Boolean(beforeZoneId && afterZoneId && beforeZoneId !== afterZoneId),
        overflow,
        reason,
      },
    });
  }

  return {
    room: {
      ...room,
      styleId: roomStyleId,
      collectionPresentationId: definition.collectionPresentationId,
      placements: nextPlacements,
      composition: { layoutId: definition.v2LayoutId, placements: compositionPlacements },
    },
    accounting: accounting.sort((left, right) => left.index - right.index).map(({ row }) => row),
  };
}

function reconcileRoomStyleObjectEdits(
  document: StudioV3Document,
  previousRoom: StudioV3Room,
  nextRoom: StudioV3Room,
): Record<string, StudioV3ObjectEdit> {
  if (previousRoom.composition?.layoutId === nextRoom.composition?.layoutId) {
    return document.objectEdits;
  }
  const reconciled: Record<string, StudioV3ObjectEdit> = {};
  for (const [editId, edit] of Object.entries(document.objectEdits)) {
    if (edit.roomId !== previousRoom.id || !hasObjectArrangement(edit)) {
      reconciled[editId] = edit;
      continue;
    }
    const retained = stripObjectArrangement(edit);
    if (hasObjectEditPayload(retained)) reconciled[editId] = retained;
  }
  return reconciled;
}

function normalizePrivatePlacement(document: StudioV3Document, placement: StudioV3Placement): StudioV3Placement {
  const piece = findStudioV3Piece(document.pieces, placement.sourceRef, placement.roomId);
  const room = document.rooms.find((candidate) => candidate.id === placement.roomId);
  if (piece?.roomId === placement.roomId && room?.baseObjectIds.includes(piece.id)) {
    return {
      ...placement,
      status: "duplicate",
      reason: "This Room-native Piece already exists in the Room base.",
    };
  }
  if (piece?.sourceStatus === "current" && placement.visibility !== "hidden") return placement;
  return {
    ...placement,
    status: "shelved",
    ...(piece && piece.sourceStatus !== "current" ? { visibility: "hidden" as const } : {}),
    reason: STUDIO_V3_HIDDEN_OR_UNAVAILABLE_REASON,
  };
}

function canPlacementEnterComposition(document: StudioV3Document, placement: StudioV3Placement): boolean {
  const piece = findStudioV3Piece(document.pieces, placement.sourceRef, placement.roomId);
  return placement.status === "placed" && placement.visibility !== "hidden" && piece?.sourceStatus === "current";
}

function createStructuralSavepoint(document: StudioV3Document, now: string): StudioV3StructuralSavepoint {
  const structure = structuralProjection(document);
  const fingerprint = structuralFingerprint(document);
  return {
    id: `savepoint:${shortDigest(`${now}:${fingerprint}`)}`,
    createdAt: now,
    activeRoomId: document.activeRoomId,
    activeLookId: document.activeLookId,
    navigation: structuredClone(document.navigation),
    rooms: document.rooms.map((room, order) => ({
      roomId: room.id,
      order,
      styleId: room.styleId,
      collectionPresentationId: room.collectionPresentationId,
      composition: room.composition ? structuredClone(room.composition) : undefined,
      baseObjectIds: [...room.baseObjectIds],
      placements: room.placements.map((placement) => ({ ...placement })),
    })),
    locks: document.locks.map((lock) => structuredClone(lock)),
    layerOverrides: document.layerOverrides.map((override) => structuredClone(override)),
    lookProvenance: document.looks[document.activeLookId]?.provenance ?? "owner-named-look",
    baseRevision: document.base.identity.revision,
    fingerprint: `${fingerprint}:${shortDigest(stableJson(structure))}`,
  };
}

function structuralProjection(document: StudioV3Document) {
  return {
    activeRoomId: document.activeRoomId,
    activeLookId: document.activeLookId,
    navigation: document.navigation,
    rooms: document.rooms.map((room) => ({
      id: room.id,
      styleId: room.styleId,
      collectionPresentationId: room.collectionPresentationId,
      composition: room.composition,
      baseObjectIds: room.baseObjectIds,
      placements: room.placements,
    })),
    locks: document.locks,
    layerOverrides: document.layerOverrides,
  };
}

function structuralFingerprint(document: StudioV3Document): string {
  return shortDigest(stableJson(structuralProjection(document)));
}

function shortDigest(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, child]) => [key, sortValue(child)]));
}

function roomStyleValue(value: unknown): StudioV3RoomStyleId | null {
  if (!value || typeof value !== "object") return null;
  const roomStyleId = (value as Record<string, unknown>).roomStyleId;
  return isRoomStyleId(roomStyleId) ? roomStyleId : null;
}

function isRoomStyleId(value: unknown): value is StudioV3RoomStyleId {
  return value === "threshold-portal" || value === "gallery-wall" || value === "film-strip-selected-works";
}

function projectLookValues(values: Partial<StudioV3LookValues>): Record<string, unknown> {
  const allowed = [
    "background", "accentColor", "texture", "borderStyle", "objectRadius", "shadowDepth", "headingWeight",
    "motionIntensity", "publicStylePreset", "roomStyleId", "worldId", "collectionPresentationId", "density",
    "pieceTreatment", "atmosphere", "journey",
  ] as const;
  return Object.fromEntries(allowed.flatMap((key) => values[key] === undefined ? [] : [[key, values[key]]])) as Record<string, unknown>;
}

function projectNamedLook(look: StudioV3Look): Record<string, unknown> {
  return {
    id: look.id,
    name: look.name,
    ...(look.baseLookId ? { baseLookId: look.baseLookId } : {}),
    values: projectLookValues(look.values),
    provenance: stableToken(look.provenance) || "owner-look",
    ...(look.mediaIds?.length ? { mediaIds: look.mediaIds.map(stableToken).filter(Boolean) } : {}),
    ...(look.createdAt ? { createdAt: look.createdAt } : {}),
    ...(look.updatedAt ? { updatedAt: look.updatedAt } : {}),
  };
}

function projectLayerLock(lock: StudioV3LayerLock): Record<string, unknown> | null {
  const value = projectLookValues(lock.value && typeof lock.value === "object" ? lock.value as Partial<StudioV3LookValues> : {});
  if (Object.keys(value).length === 0) return null;
  return {
    id: stableToken(lock.id),
    scopeKind: lock.scopeKind,
    scopeId: stableToken(lock.scopeId),
    layer: lock.layer,
    value,
    reasonCode: reasonCode(lock.reason),
  };
}

function projectLayerValue(override: StudioV3LayerOverride): Record<string, unknown> | null {
  const value = projectLookValues(override.value);
  if (Object.keys(value).length === 0) return null;
  return {
    scopeKind: override.scopeKind,
    scopeId: stableToken(override.scopeId),
    layer: override.layer,
    value,
  };
}

function projectPlacement(placement: StudioV3Placement): Record<string, unknown> {
  return {
    id: stableToken(placement.id),
    roomId: stableToken(placement.roomId),
    sourceRef: placement.sourceRef,
    ...(placement.collectionSourceRef ? { collectionSourceRef: placement.collectionSourceRef } : {}),
    objectId: stableToken(placement.id),
    order: placement.order,
    status: placement.status,
    ...(placement.featured === undefined ? {} : { featured: placement.featured }),
    ...(placement.depth === undefined ? {} : { depth: placement.depth }),
    ...(placement.visibility ? { visibility: placement.visibility } : {}),
    ...(placement.reason ? { reasonCode: reasonCode(placement.reason) } : {}),
  };
}

function projectObjectEdit(edit: StudioV3ObjectEdit): Record<string, unknown> {
  return {
    id: stableToken(edit.id),
    roomId: stableToken(edit.roomId),
    objectId: stableToken(edit.objectId),
    sourceRef: edit.sourceRef,
    ...(edit.title !== undefined ? { title: edit.title } : {}),
    ...(edit.body !== undefined ? { body: edit.body } : {}),
    ...(edit.caption !== undefined ? { caption: edit.caption } : {}),
    ...(edit.mediaSourceRef ? { mediaSourceRef: edit.mediaSourceRef } : {}),
    ...(edit.mediaId ? { mediaId: stableToken(edit.mediaId) } : {}),
    ...(edit.mediaAlt !== undefined ? { mediaAlt: edit.mediaAlt } : {}),
    ...(edit.zoneId ? { zoneId: stableToken(edit.zoneId) } : {}),
    ...(edit.order !== undefined ? { order: edit.order } : {}),
    ...(edit.size ? { size: edit.size } : {}),
    ...(edit.treatment ? { treatment: edit.treatment } : {}),
    ...(edit.featured !== undefined ? { featured: edit.featured } : {}),
    ...(edit.visibility ? { visibility: edit.visibility } : {}),
  };
}

function projectRoomStyle(room: StudioV3Room): Record<string, unknown> {
  return {
    roomId: stableToken(room.id),
    styleId: room.styleId,
    compositionToken: room.composition?.layoutId ?? studioV3RoomStyleDefinition(room.styleId).v2LayoutId,
  };
}

function projectSavepoint(savepoint: StudioV3StructuralSavepoint): Record<string, unknown> {
  return {
    id: stableToken(savepoint.id),
    activeRoomId: stableToken(savepoint.activeRoomId),
    activeLookId: stableToken(savepoint.activeLookId),
    roomOrder: savepoint.navigation.roomOrder.map(stableToken),
    entryRoomId: stableToken(savepoint.navigation.entryRoomId),
    rooms: [...savepoint.rooms].sort((left, right) => left.order - right.order).map((room) => ({
      roomId: stableToken(room.roomId),
      order: room.order,
      styleId: room.styleId,
      ...(room.collectionPresentationId ? { collectionPresentationId: room.collectionPresentationId } : {}),
      ...(room.composition ? {
        composition: {
          layoutId: room.composition.layoutId,
          placements: room.composition.placements.map((placement) => ({
            objectId: stableToken(placement.objectId),
            chamberId: stableToken(placement.chamberId),
            layoutId: placement.layoutId,
            zoneId: stableToken(placement.zoneId),
            order: placement.order,
            size: placement.size,
            ...(placement.treatment ? { treatment: placement.treatment } : {}),
          })),
        },
      } : {}),
      baseObjectIds: room.baseObjectIds.map(stableToken),
      placements: room.placements.map(projectPlacement),
    })),
    layerValues: savepoint.layerOverrides.map(projectLayerValue).filter(isRecord),
    locks: savepoint.locks.map(projectLayerLock).filter(isRecord),
    requiredCta: {
      visible: savepoint.navigation.requiredCta.visible,
      ...(savepoint.navigation.requiredCta.sourceRef ? { sourceRef: savepoint.navigation.requiredCta.sourceRef } : {}),
      ...(savepoint.navigation.requiredCta.destinationToken ? { destinationToken: savepoint.navigation.requiredCta.destinationToken } : {}),
    },
    navigationToken: "room-order-v1",
    baseRevision: savepoint.baseRevision,
    fingerprint: savepoint.fingerprint,
    createdAt: savepoint.createdAt,
  };
}

function projectCompatibility(document: StudioV3Document): Array<Record<string, unknown>> {
  type CompatibilityRow = {
    sourceRef: StudioV3SourceRef;
    roomId: string;
    roomStyleId: StudioV3RoomStyleId;
    status: "compatible" | "incompatible" | "shelved" | "unresolved";
    reasonCode: string;
  };
  const rows: CompatibilityRow[] = document.rooms.flatMap((room): CompatibilityRow[] => {
    const baseRows: CompatibilityRow[] = room.baseObjectIds.flatMap((objectId): CompatibilityRow[] => {
      const piece = findStudioV3LegacyPiece(document.pieces, room.id, objectId);
      if (!piece) return [];
      const hidden = isStudioV3ObjectEffectivelyHidden(document, {
        roomId: room.id,
        objectId,
        sourceRef: piece.sourceRef,
      });
      return [{
        sourceRef: piece.sourceRef,
        roomId: room.id,
        roomStyleId: room.styleId,
        status: hidden ? "shelved" : piece.compatibleRoomStyles.includes(room.styleId) ? "compatible" : "incompatible",
        reasonCode: hidden ? "hidden-or-unavailable" : piece.compatibleRoomStyles.includes(room.styleId)
          ? "supported-piece"
          : "unsupported-piece",
      }];
    });
    const placementRows: CompatibilityRow[] = room.placements.map((placement): CompatibilityRow => {
      const hidden = placement.visibility === "hidden" || isStudioV3ObjectEffectivelyHidden(document, {
        roomId: room.id,
        objectId: placement.id,
        sourceRef: placement.sourceRef,
      });
      return {
        sourceRef: placement.sourceRef,
        roomId: room.id,
        roomStyleId: room.styleId,
        status: hidden
          ? "shelved"
          : placement.status === "placed"
            ? "compatible"
            : placement.status === "incompatible"
              ? "incompatible"
              : placement.status === "shelved"
                ? "shelved"
                : "unresolved",
        reasonCode: hidden ? "hidden-or-unavailable" : placement.reason ? reasonCode(placement.reason) : "supported-piece",
      };
    });
    return [...baseRows, ...placementRows];
  });
  const statusPriority: Record<CompatibilityRow["status"], number> = {
    compatible: 0,
    unresolved: 1,
    shelved: 2,
    incompatible: 3,
  };
  const merged = new Map<string, CompatibilityRow>();
  for (const row of rows) {
    const identity = `${row.sourceRef}\u001f${row.roomId}\u001f${row.roomStyleId}`;
    const current = merged.get(identity);
    if (!current || statusPriority[row.status] > statusPriority[current.status]) merged.set(identity, row);
  }
  return [...merged.values()];
}

export function isSafeStudioV3MetadataEnvelope(value: unknown): value is StudioV3PrivateMetadata {
  if (!isRecord(value) || !isWithinStudioV3MetadataLimits(value) || hasForbiddenMetadataValue(value)) return false;
  const allowed = new Set([
    "owner_mode", "named_looks", "layer_locks", "savepoints", "placements", "restore", "compatibility",
    "object_edits", "layer_values",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  if (value.owner_mode !== undefined && value.owner_mode !== "simple" && value.owner_mode !== "advanced-creative") return false;
  if (value.named_looks !== undefined && !Array.isArray(value.named_looks)) return false;
  if (value.layer_locks !== undefined && !Array.isArray(value.layer_locks)) return false;
  if (value.savepoints !== undefined && !Array.isArray(value.savepoints)) return false;
  if (value.placements !== undefined && !Array.isArray(value.placements)) return false;
  if (value.compatibility !== undefined && !Array.isArray(value.compatibility)) return false;
  if (value.restore !== undefined && !isRecord(value.restore)) return false;
  if (value.object_edits !== undefined && !Array.isArray(value.object_edits)) return false;
  if (value.layer_values !== undefined && !Array.isArray(value.layer_values)) return false;
  if ([
    value.named_looks,
    value.layer_locks,
    value.savepoints,
    value.placements,
    value.compatibility,
    value.object_edits,
    value.layer_values,
  ].some((rows) => (rows?.length ?? 0) > STUDIO_V3_PRIVATE_METADATA_MAX_ITEMS)) return false;
  const parsedNamedLooks = parseNamedLooks((value.named_looks ?? []).filter(isRecord));
  if (parsedNamedLooks.length !== (value.named_looks?.length ?? 0) || hasDuplicateIds(parsedNamedLooks)) return false;
  const parsedLocks = (value.layer_locks ?? []).map((row) => isRecord(row) ? parseLayerLock(row) : null);
  const safeLocks = parsedLocks.filter((lock): lock is StudioV3LayerLock => Boolean(lock));
  if (parsedLocks.some((lock) => !lock) || hasDuplicateIds(safeLocks)
    || hasDuplicateIdentities(safeLocks, (lock) => `${lock.scopeKind}\u001f${lock.scopeId}\u001f${lock.layer}`)) return false;
  const parsedSavepoints = (value.savepoints ?? []).map((row) => isRecord(row) ? parseSavepoint(row) : null);
  if (parsedSavepoints.some((savepoint) => !savepoint)
    || hasDuplicateIds(parsedSavepoints.filter((savepoint): savepoint is StudioV3StructuralSavepoint => Boolean(savepoint)))) return false;
  const parsedPlacements = (value.placements ?? []).map((row) => isRecord(row) ? parsePlacement(row) : null);
  if (parsedPlacements.some((placement) => !placement)) return false;
  if (new Set(parsedPlacements.map((placement) => placement?.id)).size !== parsedPlacements.length) return false;
  const parsedObjectEdits = (value.object_edits ?? []).map((row) => isRecord(row) ? parseObjectEdit(row) : null);
  if (parsedObjectEdits.some((edit) => !edit)) return false;
  if (new Set(parsedObjectEdits.map((edit) => edit?.id)).size !== parsedObjectEdits.length) return false;
  const parsedLayerValues = (value.layer_values ?? []).map((row) => isRecord(row) ? parseLayerValue(row) : null);
  if (parsedLayerValues.some((layer) => !layer)
    || hasDuplicateIds(parsedLayerValues.filter((layer): layer is StudioV3LayerOverride => Boolean(layer)))) return false;
  if (value.restore !== undefined && !isSafeRestoreMetadata(value.restore)) return false;
  const compatibilityRows = value.compatibility ?? [];
  if (!compatibilityRows.every(isSafeCompatibilityRow)
    || hasDuplicateIdentities(compatibilityRows, (row) => {
      const compatibility = row as Record<string, unknown>;
      return `${String(compatibility.sourceRef)}\u001f${String(compatibility.roomId)}\u001f${String(compatibility.roomStyleId)}`;
    })) return false;
  return true;
}

export function isWithinStudioV3MetadataLimits(value: Record<string, unknown>): boolean {
  if (!isWithinStudioV3ShapeLimits(value, 1)) return false;
  if (studioV3Utf8JsonSize(value) > STUDIO_V3_PRIVATE_METADATA_MAX_BYTES) return false;
  return Object.values(value).every((section) => (
    studioV3Utf8JsonSize(section) <= STUDIO_V3_PRIVATE_METADATA_SECTION_MAX_BYTES
  ));
}

function isWithinStudioV3ShapeLimits(value: unknown, depth: number): boolean {
  if (depth > STUDIO_V3_PRIVATE_METADATA_MAX_DEPTH) return false;
  if (Array.isArray(value)) {
    return value.length <= STUDIO_V3_PRIVATE_METADATA_MAX_ITEMS
      && value.every((child) => isWithinStudioV3ShapeLimits(child, depth + 1));
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    return entries.length <= STUDIO_V3_PRIVATE_METADATA_MAX_ITEMS
      && entries.every(([, child]) => isWithinStudioV3ShapeLimits(child, depth + 1));
  }
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function studioV3Utf8JsonSize(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined
      ? Number.POSITIVE_INFINITY
      : new TextEncoder().encode(serialized).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function hasDuplicateIds(rows: Array<{ id: string }>): boolean {
  return new Set(rows.map((row) => row.id)).size !== rows.length;
}

function hasDuplicateIdentities<T>(rows: T[], identity: (row: T) => string): boolean {
  return new Set(rows.map(identity)).size !== rows.length;
}

function hasForbiddenMetadataValue(value: unknown, key = ""): boolean {
  if (/url|href|blob|base64|auth|email|password|secret|owner_user|raw_payload/i.test(key)) return true;
  if (typeof value === "string") {
    return containsForbiddenStudioV3Text(value, /fingerprint/i.test(key));
  }
  if (Array.isArray(value)) return value.some((item) => hasForbiddenMetadataValue(item));
  if (isRecord(value)) return Object.entries(value).some(([childKey, child]) => hasForbiddenMetadataValue(child, childKey));
  return false;
}

function parseNamedLooks(rows: Array<Record<string, unknown>>): StudioV3Look[] {
  return rows.flatMap((row) => {
    if (!hasExactKeys(row, ["id", "name", "baseLookId", "values", "provenance", "mediaIds", "createdAt", "updatedAt"], ["id", "name", "values", "provenance"])
      || typeof row.id !== "string" || !/^named:[a-z0-9][a-z0-9-]{0,119}$/.test(row.id) || typeof row.name !== "string" || !row.name.trim()
      || row.name.length > 80 || typeof row.provenance !== "string" || !isStableReference(row.provenance) || !isRecord(row.values)
      || (row.baseLookId !== undefined && !["soft-editorial", "nocturnal-gallery", "zine-archive"].includes(String(row.baseLookId)))
      || (row.mediaIds !== undefined && (!Array.isArray(row.mediaIds) || row.mediaIds.length > 16
        || row.mediaIds.some((mediaId) => typeof mediaId !== "string" || !isStableReference(mediaId))
        || new Set(row.mediaIds).size !== row.mediaIds.length))
      || (row.createdAt !== undefined && (typeof row.createdAt !== "string" || !isIsoTimestamp(row.createdAt)))
      || (row.updatedAt !== undefined && (typeof row.updatedAt !== "string" || !isIsoTimestamp(row.updatedAt)))) return [];
    const values = parseLookValues(row.values);
    if (!values) return [];
    return [{
      id: row.id as `named:${string}`,
      name: row.name,
      origin: "owner" as const,
      ...(typeof row.baseLookId === "string" ? { baseLookId: row.baseLookId as StudioV3LookId } : {}),
      values,
      provenance: row.provenance,
      ...(Array.isArray(row.mediaIds) ? { mediaIds: row.mediaIds as string[] } : {}),
      ...(typeof row.createdAt === "string" ? { createdAt: row.createdAt } : {}),
      ...(typeof row.updatedAt === "string" ? { updatedAt: row.updatedAt } : {}),
    }];
  });
}

function parseLookValues(value: Record<string, unknown>): StudioV3LookValues | null {
  const candidate = value as unknown as StudioV3LookValues;
  const template = STUDIO_V3_P1_LOOKS.find((look) => look.values.roomStyleId === candidate.roomStyleId);
  if (!template) return null;
  const required = Object.keys(template.values);
  if (required.some((key) => value[key] === undefined) || Object.keys(value).some((key) => !required.includes(key))) return null;
  if (!isSafeLookValueRecord(value, true)) return null;
  return structuredClone(candidate);
}

function parsePlacement(value: Record<string, unknown>): StudioV3Placement | null {
  if (!hasExactKeys(value, [
    "id", "roomId", "sourceRef", "collectionSourceRef", "objectId", "order", "status",
    "featured", "depth", "visibility", "reasonCode",
  ], ["id", "roomId", "sourceRef", "order", "status"])) return null;
  if (typeof value.id !== "string" || typeof value.roomId !== "string" || typeof value.sourceRef !== "string"
    || !isStableReference(value.id) || !isStableReference(value.roomId) || !isStudioV3SourceRef(value.sourceRef)
    || !/^(?:work|legacy-object):/.test(value.sourceRef)
    || typeof value.order !== "number" || !Number.isInteger(value.order) || value.order < 0 || value.order > 10000
    || !["placed", "duplicate", "incompatible", "shelved"].includes(String(value.status))) return null;
  if (!isStudioV3PlacementId(value.id, value.roomId, value.sourceRef)) return null;
  if (value.collectionSourceRef !== undefined && (typeof value.collectionSourceRef !== "string" || !isStudioV3CollectionSourceRef(value.collectionSourceRef))) return null;
  if (value.objectId !== undefined && (typeof value.objectId !== "string" || !isStableReference(value.objectId))) return null;
  if (value.featured !== undefined && typeof value.featured !== "boolean") return null;
  if (value.depth !== undefined && (typeof value.depth !== "number" || !Number.isFinite(value.depth) || value.depth < -100 || value.depth > 100)) return null;
  if (value.visibility !== undefined && value.visibility !== "visible" && value.visibility !== "hidden") return null;
  if (value.reasonCode !== undefined && (typeof value.reasonCode !== "string" || !isStableReference(value.reasonCode))) return null;
  return {
    id: value.id,
    roomId: value.roomId,
    sourceRef: value.sourceRef as StudioV3Placement["sourceRef"],
    ...(typeof value.collectionSourceRef === "string" ? { collectionSourceRef: value.collectionSourceRef as StudioV3Placement["collectionSourceRef"] } : {}),
    order: value.order,
    status: value.status as StudioV3Placement["status"],
    ...(typeof value.featured === "boolean" ? { featured: value.featured } : {}),
    ...(typeof value.depth === "number" ? { depth: value.depth } : {}),
    ...(value.visibility === "visible" || value.visibility === "hidden" ? { visibility: value.visibility } : {}),
    ...(typeof value.reasonCode === "string" ? { reason: value.reasonCode } : {}),
  };
}

function parseObjectEdit(value: Record<string, unknown>): StudioV3ObjectEdit | null {
  const allowed = [
    "id", "roomId", "objectId", "sourceRef", "title", "body", "caption",
    "mediaSourceRef", "mediaId", "mediaAlt", "zoneId", "order", "size", "treatment", "featured", "visibility",
  ];
  if (!hasExactKeys(value, allowed, ["id", "roomId", "objectId", "sourceRef"])) return null;
  if (typeof value.id !== "string" || typeof value.roomId !== "string" || typeof value.objectId !== "string"
    || typeof value.sourceRef !== "string" || !isStableReference(value.id) || !isStableReference(value.roomId) || !isStableReference(value.objectId)
    || !isStudioV3SourceRef(value.sourceRef) || !/^(?:work|legacy-object):/.test(value.sourceRef)
    || value.id !== makeStudioV3ObjectEditId(value.roomId, value.objectId)) return null;
  if (!boundedOptionalString(value.title, 180) || !boundedOptionalString(value.body, 4000)
    || !boundedOptionalString(value.caption, 500)
    || !boundedOptionalString(value.mediaAlt, 240)) return null;
  if (value.mediaSourceRef !== undefined && (typeof value.mediaSourceRef !== "string"
    || !isStudioV3SourceRef(value.mediaSourceRef) || !/^(?:work|legacy-object):/.test(value.mediaSourceRef))) return null;
  if (value.mediaId !== undefined && (typeof value.mediaId !== "string" || !isStableReference(value.mediaId))) return null;
  if (value.mediaSourceRef !== undefined && value.mediaId !== undefined) return null;
  if (value.mediaAlt !== undefined && value.mediaSourceRef === undefined && value.mediaId === undefined) return null;
  if (value.zoneId !== undefined && (typeof value.zoneId !== "string" || !isRegisteredObjectEditZone(value.zoneId))) return null;
  if (value.zoneId === undefined && (value.size !== undefined || value.treatment !== undefined || value.featured !== undefined)) return null;
  if (value.order !== undefined && (typeof value.order !== "number" || !Number.isInteger(value.order) || value.order < 0 || value.order > 10000)) return null;
  if (value.size !== undefined && !isPlacementSize(value.size)) return null;
  if (value.treatment !== undefined && !isPlacementTreatment(value.treatment)) return null;
  if (value.featured !== undefined && typeof value.featured !== "boolean") return null;
  if ((value.featured === true && value.size !== undefined && value.size !== "feature")
    || (value.featured === false && value.size === "feature")) return null;
  if (value.visibility !== undefined && value.visibility !== "visible" && value.visibility !== "hidden") return null;
  return {
    id: value.id,
    roomId: value.roomId,
    objectId: value.objectId,
    sourceRef: value.sourceRef as StudioV3ObjectEdit["sourceRef"],
    ...(typeof value.title === "string" ? { title: value.title } : {}),
    ...(typeof value.body === "string" ? { body: value.body } : {}),
    ...(typeof value.caption === "string" ? { caption: value.caption } : {}),
    ...(typeof value.mediaSourceRef === "string" ? { mediaSourceRef: value.mediaSourceRef as StudioV3ObjectEdit["mediaSourceRef"] } : {}),
    ...(typeof value.mediaId === "string" ? { mediaId: value.mediaId } : {}),
    ...(typeof value.mediaAlt === "string" ? { mediaAlt: value.mediaAlt } : {}),
    ...(typeof value.zoneId === "string" ? { zoneId: value.zoneId } : {}),
    ...(typeof value.order === "number" ? { order: value.order } : {}),
    ...(isPlacementSize(value.size) ? { size: value.size } : {}),
    ...(isPlacementTreatment(value.treatment) ? { treatment: value.treatment } : {}),
    ...(typeof value.featured === "boolean" ? { featured: value.featured } : {}),
    ...(value.visibility === "visible" || value.visibility === "hidden" ? { visibility: value.visibility } : {}),
  };
}

function boundedOptionalString(value: unknown, maximum: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maximum);
}

function parseRoomStyle(value: unknown): { roomId: string; styleId: StudioV3RoomStyleId; compositionToken: PresenceStudioV2LayoutId } | null {
  if (!isRecord(value) || !hasExactKeys(value, ["roomId", "styleId", "compositionToken"], ["roomId", "styleId", "compositionToken"])
    || typeof value.roomId !== "string" || !isStableReference(value.roomId) || !isRoomStyleId(value.styleId)) return null;
  const compositionToken = value.compositionToken;
  if (compositionToken !== "gallery-wall" && compositionToken !== "portal-threshold" && compositionToken !== "film-strip-selected-works") return null;
  return { roomId: value.roomId, styleId: value.styleId, compositionToken };
}

function parseSavepoint(value: Record<string, unknown>): StudioV3StructuralSavepoint | null {
  const keys = [
    "id", "activeRoomId", "activeLookId", "roomOrder", "entryRoomId", "rooms", "layerValues",
    "locks", "requiredCta", "navigationToken", "baseRevision", "fingerprint", "createdAt",
  ];
  if (!hasExactKeys(value, keys, keys)) return null;
  if (typeof value.id !== "string" || !isStableReference(value.id)
    || typeof value.activeRoomId !== "string" || !isStableReference(value.activeRoomId)
    || typeof value.activeLookId !== "string" || !isStableReference(value.activeLookId)
    || typeof value.entryRoomId !== "string" || !isStableReference(value.entryRoomId)
    || value.navigationToken !== "room-order-v1"
    || typeof value.fingerprint !== "string" || !/^(?:[0-9a-f]{16}(?::[0-9a-f]{16})?|[0-9a-f]{64})$/.test(value.fingerprint)
    || typeof value.createdAt !== "string" || !isIsoTimestamp(value.createdAt)
    || typeof value.baseRevision !== "number" || !Number.isInteger(value.baseRevision) || value.baseRevision < 1
    || !Array.isArray(value.roomOrder) || value.roomOrder.length < 1 || value.roomOrder.length > 160
    || !Array.isArray(value.rooms) || value.rooms.length < 1 || value.rooms.length > 160
    || !Array.isArray(value.layerValues) || value.layerValues.length > 160
    || !Array.isArray(value.locks) || value.locks.length > 160
    || !isRecord(value.requiredCta)) return null;

  const roomOrder = value.roomOrder.filter((roomId): roomId is string => typeof roomId === "string" && isStableReference(roomId));
  if (roomOrder.length !== value.roomOrder.length || new Set(roomOrder).size !== roomOrder.length) return null;
  const rooms = value.rooms.map((room) => isRecord(room) ? parseSavepointRoom(room) : null);
  if (rooms.some((room) => !room)) return null;
  const parsedRooms = rooms.filter((room): room is StudioV3StructuralSavepoint["rooms"][number] => Boolean(room));
  if (new Set(parsedRooms.map((room) => room.roomId)).size !== parsedRooms.length) return null;
  const orderedRoomIds = [...parsedRooms].sort((left, right) => left.order - right.order).map((room) => room.roomId);
  if (parsedRooms.some((room, index) => !Number.isInteger(room.order) || room.order < 0 || room.order >= parsedRooms.length)
    || new Set(parsedRooms.map((room) => room.order)).size !== parsedRooms.length
    || orderedRoomIds.some((roomId, index) => roomId !== roomOrder[index])) return null;
  if (!roomOrder.includes(value.activeRoomId) || !roomOrder.includes(value.entryRoomId)) return null;

  const requiredCta = parseSavepointRequiredCta(value.requiredCta, new Set(roomOrder));
  if (!requiredCta) return null;
  const locks = value.locks.map((lock) => isRecord(lock) ? parseLayerLock(lock) : null);
  const layerOverrides = value.layerValues.map((layer) => isRecord(layer) ? parseLayerValue(layer) : null);
  if (locks.some((lock) => !lock) || layerOverrides.some((layer) => !layer)) return null;
  const parsedLocks = locks.filter((lock): lock is StudioV3LayerLock => Boolean(lock));
  if (new Set(parsedLocks.map((lock) => lock.id)).size !== parsedLocks.length
    || hasDuplicateIdentities(parsedLocks, (lock) => `${lock.scopeKind}\u001f${lock.scopeId}\u001f${lock.layer}`)) return null;

  return {
    id: value.id,
    createdAt: value.createdAt,
    activeRoomId: value.activeRoomId,
    activeLookId: value.activeLookId as StudioV3Look["id"],
    navigation: {
      entryRoomId: value.entryRoomId,
      roomOrder,
      requiredCta,
    },
    rooms: parsedRooms,
    locks: parsedLocks,
    layerOverrides: layerOverrides.filter((layer): layer is StudioV3LayerOverride => Boolean(layer)),
    lookProvenance: "restored-private-savepoint",
    baseRevision: value.baseRevision,
    fingerprint: value.fingerprint,
  };
}

function parseSavepointRoom(value: Record<string, unknown>): StudioV3StructuralSavepoint["rooms"][number] | null {
  if (!hasExactKeys(value, [
    "roomId", "order", "styleId", "collectionPresentationId", "composition", "baseObjectIds", "placements",
  ], ["roomId", "order", "styleId", "baseObjectIds", "placements"])) return null;
  if (typeof value.roomId !== "string" || !isStableReference(value.roomId)
    || typeof value.order !== "number" || !Number.isInteger(value.order) || value.order < 0 || value.order > 159
    || !isRoomStyleId(value.styleId)
    || !Array.isArray(value.baseObjectIds) || value.baseObjectIds.length > 160
    || !Array.isArray(value.placements) || value.placements.length > 160) return null;
  if (value.collectionPresentationId !== undefined && !isCollectionPresentationId(value.collectionPresentationId)) return null;
  const baseObjectIds = value.baseObjectIds.filter((objectId): objectId is string => typeof objectId === "string" && isStableReference(objectId));
  if (baseObjectIds.length !== value.baseObjectIds.length || new Set(baseObjectIds).size !== baseObjectIds.length) return null;
  const placements = value.placements.map((placement) => isRecord(placement) ? parsePlacement(placement) : null);
  if (placements.some((placement) => !placement)) return null;
  const parsedPlacements = placements.filter((placement): placement is StudioV3Placement => Boolean(placement));
  if (parsedPlacements.some((placement) => placement.roomId !== value.roomId)
    || new Set(parsedPlacements.map((placement) => placement.id)).size !== parsedPlacements.length
    || parsedPlacements.some((placement) => baseObjectIds.includes(placement.id))) return null;
  const knownObjectIds = new Set([
    ...baseObjectIds,
    ...parsedPlacements.flatMap((placement) => [placement.id]),
    ...value.placements.flatMap((placement) => isRecord(placement) && typeof placement.objectId === "string" ? [placement.objectId] : []),
  ]);
  const expectedLayout = studioV3RoomStyleDefinition(value.styleId).v2LayoutId;
  const composition = value.composition === undefined
    ? undefined
    : isRecord(value.composition)
      ? parseSavepointComposition(value.composition, value.roomId, expectedLayout, knownObjectIds)
      : null;
  if (composition === null) return null;
  return {
    roomId: value.roomId,
    order: value.order,
    styleId: value.styleId,
    ...(isCollectionPresentationId(value.collectionPresentationId) ? { collectionPresentationId: value.collectionPresentationId } : {}),
    ...(composition ? { composition } : {}),
    baseObjectIds,
    placements: parsedPlacements,
  };
}

function parseSavepointComposition(
  value: Record<string, unknown>,
  roomId: string,
  expectedLayout: PresenceStudioV2LayoutId,
  knownObjectIds: Set<string>,
): StudioV2ChamberComposition | null {
  if (!hasExactKeys(value, ["layoutId", "placements"], ["layoutId", "placements"])
    || value.layoutId !== expectedLayout || !Array.isArray(value.placements) || value.placements.length > 160) return null;
  const placements = value.placements.map((placement) => (
    isRecord(placement) ? parseSavepointCompositionPlacement(placement, roomId, expectedLayout) : null
  ));
  if (placements.some((placement) => !placement)) return null;
  const parsed = placements.filter((placement): placement is StudioV2ObjectPlacement => Boolean(placement));
  if (new Set(parsed.map((placement) => placement.objectId)).size !== parsed.length
    || parsed.some((placement) => !knownObjectIds.has(placement.objectId))) return null;
  return { layoutId: expectedLayout, placements: parsed };
}

function parseSavepointCompositionPlacement(
  value: Record<string, unknown>,
  roomId: string,
  layoutId: PresenceStudioV2LayoutId,
): StudioV2ObjectPlacement | null {
  if (!hasExactKeys(value, ["objectId", "chamberId", "layoutId", "zoneId", "order", "size", "treatment"], [
    "objectId", "chamberId", "layoutId", "zoneId", "order", "size",
  ])) return null;
  if (typeof value.objectId !== "string" || !isStableReference(value.objectId)
    || value.chamberId !== roomId || value.layoutId !== layoutId
    || typeof value.zoneId !== "string" || !isStableReference(value.zoneId)
    || typeof value.order !== "number" || !Number.isInteger(value.order) || value.order < 0 || value.order > 10000
    || !isPlacementSize(value.size)
    || (value.treatment !== undefined && !isPlacementTreatment(value.treatment))) return null;
  const zone = studioV2Layout(layoutId).zones.find((candidate) => candidate.id === value.zoneId);
  if (!zone || !zone.allowedSizes.includes(value.size)
    || (value.treatment !== undefined && !zone.allowedTreatments?.includes(value.treatment))) return null;
  return {
    objectId: value.objectId,
    chamberId: roomId,
    layoutId,
    zoneId: value.zoneId,
    order: value.order,
    size: value.size,
    ...(value.treatment ? { treatment: value.treatment } : {}),
  };
}

function parseSavepointRequiredCta(
  value: Record<string, unknown>,
  roomIds: Set<string>,
): StudioV3StructuralSavepoint["navigation"]["requiredCta"] | null {
  if (!hasExactKeys(value, ["visible", "sourceRef", "destinationToken"], ["visible"])
    || typeof value.visible !== "boolean") return null;
  if (value.sourceRef !== undefined && (typeof value.sourceRef !== "string" || !isStudioV3SourceRef(value.sourceRef)
    || !/^(?:work|legacy-object):/.test(value.sourceRef))) return null;
  if (value.destinationToken !== undefined) {
    if (typeof value.destinationToken !== "string") return null;
    if (value.destinationToken !== "existing-base") {
      const match = /^room:(.+)$/.exec(value.destinationToken);
      if (!match?.[1] || !isStableReference(match[1]) || !roomIds.has(match[1])) return null;
    }
  }
  return {
    visible: value.visible,
    ...(typeof value.sourceRef === "string" ? { sourceRef: value.sourceRef as StudioV3StructuralSavepoint["navigation"]["requiredCta"]["sourceRef"] } : {}),
    ...(typeof value.destinationToken === "string" ? { destinationToken: value.destinationToken as "existing-base" | `room:${string}` } : {}),
  };
}

function parseLayerLock(value: Record<string, unknown>): StudioV3LayerLock | null {
  if (!hasExactKeys(value, ["id", "scopeKind", "scopeId", "layer", "value", "reasonCode"], ["id", "scopeKind", "scopeId", "layer", "value"])) return null;
  if (typeof value.id !== "string" || !isStableReference(value.id) || typeof value.scopeId !== "string" || !isStableReference(value.scopeId)
    || !isScopeKind(value.scopeKind) || !isLayer(value.layer) || !isRecord(value.value)
    || !isSafeLookValueRecord(value.value, false)) return null;
  if (value.reasonCode !== undefined && (typeof value.reasonCode !== "string" || !isStableReference(value.reasonCode))) return null;
  return {
    id: value.id,
    scopeKind: value.scopeKind,
    scopeId: value.scopeId,
    layer: value.layer,
    value: structuredClone(value.value),
    reason: typeof value.reasonCode === "string" ? value.reasonCode : "restored-owner-lock",
  };
}

function parseLayerValue(value: Record<string, unknown>): StudioV3LayerOverride | null {
  if (!hasExactKeys(value, ["scopeKind", "scopeId", "layer", "value"], ["scopeKind", "scopeId", "layer", "value"])) return null;
  if (typeof value.scopeId !== "string" || !isStableReference(value.scopeId) || !isScopeKind(value.scopeKind)
    || !isLayer(value.layer) || !isRecord(value.value) || !isSafeLookValueRecord(value.value, false)) return null;
  return {
    id: `${value.scopeKind}:${value.scopeId}:${value.layer}`,
    scopeKind: value.scopeKind,
    scopeId: value.scopeId,
    layer: value.layer,
    value: structuredClone(value.value),
    provenance: "restored-private-savepoint",
  };
}

function isSafeLookValueRecord(value: Record<string, unknown>, requireComplete: boolean): boolean {
  const allowed = [
    "background", "accentColor", "texture", "borderStyle", "objectRadius", "shadowDepth", "headingWeight",
    "motionIntensity", "publicStylePreset", "roomStyleId", "worldId", "collectionPresentationId", "density",
    "pieceTreatment", "atmosphere", "journey",
  ];
  if (!hasExactKeys(value, allowed, requireComplete ? allowed : [])) return false;
  if (!requireComplete && Object.keys(value).length === 0) return false;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "background" || key === "accentColor") && (typeof child !== "string" || !/^#[0-9a-f]{6}$/i.test(child))) return false;
    if (key === "texture" && !["none", "paper", "grain", "scan", "linen", "timber", "ledger"].includes(String(child))) return false;
    if (key === "borderStyle" && !["none", "hairline", "framed", "taped", "ledger"].includes(String(child))) return false;
    if (key === "objectRadius" && (typeof child !== "number" || !Number.isFinite(child) || child < 0 || child > 40)) return false;
    if (key === "shadowDepth" && (typeof child !== "number" || !Number.isFinite(child) || child < 0 || child > 1)) return false;
    if (key === "headingWeight" && (typeof child !== "number" || !Number.isInteger(child) || child < 300 || child > 900)) return false;
    if (key === "motionIntensity" && !["still", "gentle", "living"].includes(String(child))) return false;
    if (key === "publicStylePreset" && !["gallery-p2", "christina-liquid-gallery", "bbbvision-threshold-gallery"].includes(String(child))) return false;
    if (key === "roomStyleId" && !isRoomStyleId(child)) return false;
    if (key === "worldId" && !["gallery", "zine", "dj", "healing", "market", "archive", "carpenter", "consultant"].includes(String(child))) return false;
    if (key === "collectionPresentationId" && !isCollectionPresentationId(child)) return false;
    if (key === "density" && !["spacious", "focused", "dense"].includes(String(child))) return false;
    if (key === "pieceTreatment" && !["quiet-framed", "luminous-depth", "captioned-ledger"].includes(String(child))) return false;
    if (key === "atmosphere" && !["paper-light", "nocturnal-depth", "ledger-scan"].includes(String(child))) return false;
    if (key === "journey" && !["editorial-browse", "threshold-reveal", "archive-index"].includes(String(child))) return false;
  }
  return true;
}

function isSafeRestoreMetadata(value: Record<string, unknown>): boolean {
  if (!hasExactKeys(value, [
    "activeSavepointId", "lastRestoredSavepointId", "activeRoomId", "activeLookId", "roomStyles",
    "comparison", "unresolvedRefs",
  ], [])) return false;
  for (const key of ["activeSavepointId", "lastRestoredSavepointId", "activeRoomId", "activeLookId"] as const) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || !isStableReference(value[key]))) return false;
  }
  if (value.roomStyles !== undefined && (!Array.isArray(value.roomStyles) || value.roomStyles.length > 160
    || !value.roomStyles.every((row) => Boolean(parseRoomStyle(row))))) return false;
  if (value.comparison !== undefined) {
    if (!isRecord(value.comparison) || !hasExactKeys(value.comparison, ["savepointId", "view"], ["savepointId", "view"])
      || typeof value.comparison.savepointId !== "string" || !isStableReference(value.comparison.savepointId)
      || (value.comparison.view !== "before" && value.comparison.view !== "after")) return false;
  }
  if (value.unresolvedRefs !== undefined && (!Array.isArray(value.unresolvedRefs) || value.unresolvedRefs.length > 160
    || !value.unresolvedRefs.every((reference) => typeof reference === "string" && isStableReference(reference)))) return false;
  return true;
}

function isSafeCompatibilityRow(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["sourceRef", "roomId", "roomStyleId", "status", "reasonCode"], [
    "sourceRef", "roomId", "roomStyleId", "status", "reasonCode",
  ])) return false;
  return typeof value.sourceRef === "string" && isStudioV3SourceRef(value.sourceRef)
    && /^(?:work|legacy-object):/.test(value.sourceRef)
    && typeof value.roomId === "string" && isStableReference(value.roomId)
    && isRoomStyleId(value.roomStyleId)
    && ["compatible", "incompatible", "shelved", "unresolved"].includes(String(value.status))
    && typeof value.reasonCode === "string" && isStableReference(value.reasonCode);
}

function hasExactKeys(value: Record<string, unknown>, allowed: readonly string[], required: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key)) && required.every((key) => Object.hasOwn(value, key));
}

function isStableReference(value: string): boolean {
  return value.length > 0 && value.length <= 160 && /^[A-Za-z0-9_.:-]+$/.test(value);
}

function isCollectionPresentationId(value: unknown): value is StudioV3LookValues["collectionPresentationId"] {
  return value === "wall" || value === "selected-sequence" || value === "threshold-feature";
}

function isPlacementSize(value: unknown): value is StudioV2PlacementSize {
  return value === "small" || value === "medium" || value === "large" || value === "feature";
}

function isPlacementTreatment(value: unknown): value is StudioV2PlacementTreatment {
  return value === "quiet" || value === "framed" || value === "captioned" || value === "signal";
}

function isRegisteredObjectEditZone(value: string): boolean {
  return ["gallery-wall", "portal-threshold", "film-strip-selected-works"]
    .some((layoutId) => studioV2Layout(layoutId).zones.some((zone) => zone.id === value));
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function isScopeKind(value: unknown): value is StudioV3ScopeKind {
  return value === "presence" || value === "room" || value === "collection" || value === "piece";
}

function isLayer(value: unknown): value is StudioV3Layer {
  return ["presence-look", "room-style", "collection-presentation", "piece-treatment", "motion-atmosphere", "navigation-journey"].includes(String(value));
}

function privateScopeExists(document: StudioV3Document, scopeKind: StudioV3ScopeKind, scopeId: string): boolean {
  if (scopeKind === "presence") return scopeId === String(document.nodeId);
  if (scopeKind === "room") return document.rooms.some((room) => room.id === scopeId);
  if (scopeKind === "collection") return Boolean(document.collections[scopeId]);
  return (isStudioV3SourceRef(scopeId) && Boolean(findStudioV3Piece(document.pieces, scopeId)))
    || Object.values(document.pieces).some((piece) => piece.id === scopeId)
    || document.rooms.some((room) => room.placements.some((placement) => placement.id === scopeId));
}

function sanitizeRestoredObjectArrangement(
  document: StudioV3Document,
  room: StudioV3Room,
  edit: StudioV3ObjectEdit,
  issues: StudioV3RestoreIssue[],
): StudioV3ObjectEdit {
  const safeEdit = { ...edit };
  if (!hasObjectArrangement(edit)) return safeEdit;

  const layoutId = studioV3RoomStyleDefinition(room.styleId).v2LayoutId;
  const currentPlacement = effectiveRestoredRoomComposition(document, room).placements
    .find((placement) => placement.objectId === edit.objectId);
  const piece = findStudioV3Piece(document.pieces, edit.sourceRef, room.id);
  const zone = studioV2Layout(layoutId).zones.find((candidate) => candidate.id === (edit.zoneId ?? currentPlacement?.zoneId));
  const arrangementReference = `${edit.id}:arrangement`;

  if (!currentPlacement || !piece || !zone || !zone.accepts.includes(piece.snapshotType)) {
    issues.push({ kind: "invalid-reference", reference: arrangementReference });
    return stripObjectArrangement(safeEdit);
  }

  if (safeEdit.size !== undefined && !zone.allowedSizes.includes(safeEdit.size)) {
    delete safeEdit.size;
    issues.push({ kind: "invalid-reference", reference: `${edit.id}:size` });
  }
  if (safeEdit.treatment !== undefined && !zone.allowedTreatments?.includes(safeEdit.treatment)) {
    delete safeEdit.treatment;
    issues.push({ kind: "invalid-reference", reference: `${edit.id}:treatment` });
  }
  if (safeEdit.featured === true && !zone.allowedSizes.includes("feature")) {
    delete safeEdit.featured;
    issues.push({ kind: "invalid-reference", reference: `${edit.id}:featured` });
  } else if (safeEdit.featured === false && !zone.allowedSizes.some((size) => size !== "feature")) {
    delete safeEdit.featured;
    issues.push({ kind: "invalid-reference", reference: `${edit.id}:featured` });
  }
  return safeEdit;
}

function enforceRestoredObjectArrangementCapacity(
  document: StudioV3Document,
  objectEdits: Record<string, StudioV3ObjectEdit>,
  issues: StudioV3RestoreIssue[],
): Record<string, StudioV3ObjectEdit> {
  const next = Object.fromEntries(Object.entries(objectEdits).map(([id, edit]) => [id, { ...edit }]));
  const basePlacements = new Map<string, StudioV2ObjectPlacement[]>();
  for (const room of document.rooms) {
    basePlacements.set(room.id, effectiveRestoredRoomComposition(document, room).placements);
  }

  while (true) {
    const rejected = new Set<string>();
    for (const room of document.rooms) {
      const placements = basePlacements.get(room.id) ?? [];
      const layout = studioV2Layout(studioV3RoomStyleDefinition(room.styleId).v2LayoutId);
      for (const zone of layout.zones) {
        if (zone.maxObjects === undefined) continue;
        const occupants = placements.flatMap((placement) => {
          const edit = next[makeStudioV3ObjectEditId(room.id, placement.objectId)];
          const privatePlacement = room.placements.find((candidate) => candidate.id === placement.objectId);
          const sourceRef = privatePlacement?.sourceRef
            ?? findStudioV3LegacyPiece(document.pieces, room.id, placement.objectId)?.sourceRef;
          const requiredCta = sourceRef
            ? isRequiredCtaSource(document, sourceRef, room.id, placement.objectId)
            : false;
          if (edit?.visibility === "hidden" && !requiredCta) return [];
          const targetZoneId = edit && hasObjectArrangement(edit) ? edit.zoneId ?? placement.zoneId : placement.zoneId;
          return targetZoneId === zone.id ? [{ placement, edit }] : [];
        });
        if (occupants.length <= zone.maxObjects) continue;
        const residents = occupants.filter(({ placement }) => placement.zoneId === zone.id);
        const availableForMoves = Math.max(0, zone.maxObjects - residents.length);
        const incoming = occupants
          .filter(({ placement }) => placement.zoneId !== zone.id)
          .flatMap(({ edit }) => edit ? [edit] : [])
          .sort((left, right) => left.id.localeCompare(right.id));
        for (const edit of incoming.slice(availableForMoves)) rejected.add(edit.id);
      }
    }
    if (rejected.size === 0) break;
    for (const id of [...rejected].sort()) {
      const edit = next[id];
      if (!edit || !hasObjectArrangement(edit)) continue;
      next[id] = stripObjectArrangement(edit);
      issues.push({ kind: "invalid-reference", reference: `${id}:capacity` });
    }
  }

  return Object.fromEntries(Object.entries(next).filter(([, edit]) => hasObjectEditPayload(edit)));
}

function effectiveRestoredRoomComposition(
  document: StudioV3Document,
  room: StudioV3Room,
): StudioV2ChamberComposition {
  const layoutId = studioV3RoomStyleDefinition(room.styleId).v2LayoutId;
  const layout = studioV2Layout(layoutId);
  const remapped = remapRoomForStyle(document, room, room.styleId).room.composition
    ?? { layoutId, placements: [] };
  if (room.composition?.layoutId !== layoutId) return remapped;

  const eligibleObjectIds = new Set(remapped.placements.map((placement) => placement.objectId));
  const placements: StudioV2ObjectPlacement[] = [];
  const used = new Set<string>();
  const zoneCount = (zoneId: string) => placements.filter((placement) => placement.zoneId === zoneId).length;
  const pieceForObject = (objectId: string) => {
    const privatePlacement = room.placements.find((placement) => placement.id === objectId);
    return privatePlacement
      ? findStudioV3Piece(document.pieces, privatePlacement.sourceRef, room.id)
      : findStudioV3LegacyPiece(document.pieces, room.id, objectId);
  };

  for (const current of room.composition.placements) {
    const piece = pieceForObject(current.objectId);
    const zone = layout.zones.find((candidate) => candidate.id === current.zoneId);
    if (!eligibleObjectIds.has(current.objectId) || !piece || !zone || !zone.accepts.includes(piece.snapshotType)
      || (zone.maxObjects !== undefined && zoneCount(zone.id) >= zone.maxObjects)) continue;
    used.add(current.objectId);
    placements.push({
      objectId: current.objectId,
      chamberId: room.id,
      layoutId,
      zoneId: zone.id,
      order: current.order,
      size: zone.allowedSizes.includes(current.size) ? current.size : zone.defaultSize,
      ...(current.treatment && zone.allowedTreatments?.includes(current.treatment)
        ? { treatment: current.treatment }
        : zone.allowedTreatments?.[0]
          ? { treatment: zone.allowedTreatments[0] }
          : {}),
    });
  }

  for (const fallback of remapped.placements) {
    if (used.has(fallback.objectId)) continue;
    const piece = pieceForObject(fallback.objectId);
    if (!piece) continue;
    const preferred = layout.zones.find((zone) => zone.id === fallback.zoneId
      && zone.accepts.includes(piece.snapshotType)
      && (zone.maxObjects === undefined || zoneCount(zone.id) < zone.maxObjects));
    const zone = preferred ?? layout.zones.find((candidate) => candidate.accepts.includes(piece.snapshotType)
      && (candidate.maxObjects === undefined || zoneCount(candidate.id) < candidate.maxObjects));
    if (!zone) continue;
    placements.push({
      objectId: fallback.objectId,
      chamberId: room.id,
      layoutId,
      zoneId: zone.id,
      order: zoneCount(zone.id),
      size: zone.defaultSize,
      ...(zone.allowedTreatments?.[0] ? { treatment: zone.allowedTreatments[0] } : {}),
    });
    used.add(fallback.objectId);
  }
  return { layoutId, placements };
}

function hasObjectArrangement(edit: StudioV3ObjectEdit): boolean {
  return edit.zoneId !== undefined || edit.order !== undefined || edit.size !== undefined
    || edit.treatment !== undefined || edit.featured !== undefined;
}

function stripObjectArrangement(edit: StudioV3ObjectEdit): StudioV3ObjectEdit {
  const safeEdit = { ...edit };
  delete safeEdit.zoneId;
  delete safeEdit.order;
  delete safeEdit.size;
  delete safeEdit.treatment;
  delete safeEdit.featured;
  return safeEdit;
}

function hasObjectEditPayload(edit: StudioV3ObjectEdit): boolean {
  return Object.keys(edit).some((key) => !["id", "roomId", "objectId", "sourceRef"].includes(key));
}

function isRequiredCtaSource(
  document: StudioV3Document,
  sourceRef: StudioV3SourceRef,
  roomId: string,
  objectId: string,
): boolean {
  const requiredPiece = Object.values(document.pieces).find((piece) => (
    piece.snapshotType === "cta" && piece.sourceRef === document.navigation.requiredCta.sourceRef
  ));
  const requiredPlacement = requiredPiece ? undefined : document.rooms.flatMap((room) => (
    room.placements.map((placement) => ({ roomId: room.id, placement }))
  )).find(({ placement }) => placement.sourceRef === document.navigation.requiredCta.sourceRef);
  return Boolean(
    document.navigation.requiredCta.visible
    && document.navigation.requiredCta.sourceRef === sourceRef
    && (requiredPiece
      ? requiredPiece.roomId === roomId && requiredPiece.id === objectId
      : requiredPlacement
        ? requiredPlacement.roomId === roomId && requiredPlacement.placement.id === objectId
        : true)
  );
}

function savepointPreservesRequiredCta(
  document: StudioV3Document,
  savepoint: StudioV3StructuralSavepoint,
): boolean {
  const requiredSourceRef = document.navigation.requiredCta.visible
    ? document.navigation.requiredCta.sourceRef
    : undefined;
  if (!requiredSourceRef) return true;
  if (!savepoint.navigation.requiredCta.visible || savepoint.navigation.requiredCta.sourceRef !== requiredSourceRef) return false;

  const requiredPiece = Object.values(document.pieces).find((piece) => (
    piece.snapshotType === "cta" && piece.sourceRef === requiredSourceRef
  ));
  const requiredPlacement = requiredPiece ? undefined : document.rooms.flatMap((room) => (
    room.placements.map((placement) => ({ roomId: room.id, placement }))
  )).find(({ placement }) => placement.sourceRef === requiredSourceRef);
  if (!requiredPiece && !requiredPlacement) return false;
  for (const room of document.rooms) {
    const savedRoom = savepoint.rooms.find((candidate) => candidate.roomId === room.id);
    if (!savedRoom) continue;
    if (requiredPiece && room.id === requiredPiece.roomId
      && room.baseObjectIds.includes(requiredPiece.id)
      && !savedRoom.baseObjectIds.includes(requiredPiece.id)) return false;
    for (const placement of room.placements.filter((candidate) => (
      isRequiredCtaSource(document, candidate.sourceRef, room.id, candidate.id)
    ))) {
      const savedPlacement = savedRoom.placements.find((candidate) => candidate.id === placement.id);
      if (!savedPlacement || savedPlacement.status !== "placed" || savedPlacement.visibility === "hidden") return false;
    }
  }
  return true;
}

function stableToken(value: string): string {
  return String(value || "token").trim().replace(/[^A-Za-z0-9_.:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160) || "token";
}

function reasonCode(value: string): string {
  return stableToken(value.toLowerCase()).slice(0, 120) || "owner-state";
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => seen.has(row.id) ? false : (seen.add(row.id), true));
}

function dedupeIssues(issues: StudioV3RestoreIssue[]): StudioV3RestoreIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.kind}:${issue.reference}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
