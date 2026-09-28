import type { StudioV3Document } from "./model.ts";
import { parseStudioV3SourceRef } from "./sourceRefs.ts";

export interface StudioV3ContentSourceSummary {
  canonicalWorkCount: number;
  collectionCount: number;
  roomNativePieceCount: number;
  activeRoomNativePieceCount: number;
  placedLibraryItemCount: number;
  retainedLibraryItemCount: number;
  hasCanonicalWorks: boolean;
  hasCollections: boolean;
  hasRendererBackedRoomMaterial: boolean;
  ownerWorksEmptyMessage: string;
  collectionsEmptyMessage: string;
  roomAssignmentNotice: string;
  rendererBackedRoomMaterialLabel: string;
  sourceNotice: string | null;
}

export function summarizeStudioV3ContentSources(
  document: StudioV3Document,
  activeRoomId = document.activeRoomId,
): StudioV3ContentSourceSummary {
  const pieces = Object.values(document.pieces);
  const collections = Object.values(document.collections);
  const activeRoom = document.rooms.find((room) => room.id === activeRoomId);
  const activeBaseIds = new Set(activeRoom?.baseObjectIds ?? []);
  const roomNativePieces = pieces.filter((piece) => parseStudioV3SourceRef(piece.sourceRef)?.kind === "legacy-object");
  const activeRoomNativePieceCount = roomNativePieces.filter((piece) => (
    piece.roomId === activeRoomId && activeBaseIds.has(piece.id)
  )).length;
  const canonicalWorkCount = pieces.filter((piece) => parseStudioV3SourceRef(piece.sourceRef)?.kind === "work").length;
  const placedLibraryItemCount = document.rooms.reduce((count, room) => (
    count + room.placements.filter((placement) => (
      placement.status === "placed"
      && placement.visibility !== "hidden"
      && parseStudioV3SourceRef(placement.sourceRef)?.kind === "work"
    )).length
  ), 0);
  const retainedLibraryItemCount = document.rooms.reduce((count, room) => (
    count + room.placements.filter((placement) => (
      (placement.status !== "placed" || placement.visibility === "hidden")
      && parseStudioV3SourceRef(placement.sourceRef)?.kind === "work"
    )).length
  ), 0);
  const hasCanonicalWorks = canonicalWorkCount > 0;
  const hasCollections = collections.length > 0;
  const hasRendererBackedRoomMaterial = roomNativePieces.length > 0;
  const ownerWorksEmptyMessage = hasRendererBackedRoomMaterial
    ? "No owner Works are connected yet. This Presence is showing room/base material inherited from the current Studio base; use a reviewed import or create step before editing real Works."
    : "No owner Works are connected yet. Add or import real Works in a reviewed Gate 2 slice before editing them here.";
  const collectionsEmptyMessage = "No Collections have been created for this Presence yet. The Studio will not invent a Collection or expose backend fields.";
  const roomAssignmentNotice = "Canonical Room assignment is inherited from the current room/base config in this slice. Private Room placement overlays can be saved for preview without changing public assignment.";
  const rendererBackedRoomMaterialLabel = "Renderer-backed room/base material";
  const sourceNotice = !hasCanonicalWorks
    ? `${ownerWorksEmptyMessage} ${roomAssignmentNotice}`
    : !hasCollections
      ? `${collectionsEmptyMessage} ${roomAssignmentNotice}`
      : roomAssignmentNotice;

  return {
    canonicalWorkCount,
    collectionCount: collections.length,
    roomNativePieceCount: roomNativePieces.length,
    activeRoomNativePieceCount,
    placedLibraryItemCount,
    retainedLibraryItemCount,
    hasCanonicalWorks,
    hasCollections,
    hasRendererBackedRoomMaterial,
    ownerWorksEmptyMessage,
    collectionsEmptyMessage,
    roomAssignmentNotice,
    rendererBackedRoomMaterialLabel,
    sourceNotice,
  };
}
