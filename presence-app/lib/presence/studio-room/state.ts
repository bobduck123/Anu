import type { EditorDraft, PublishState, Room, StudioRoomState } from "./model.ts";

export function createPublishState(room: Room, version = 1, publishedAt = "2026-01-01T00:00:00.000Z"): PublishState {
  return {
    roomId: room.id,
    version,
    room: { ...clone(room), state: "published" },
    publishedAt,
  };
}

export function createStudioRoomState(publishedRoom: Room, version = 1): StudioRoomState {
  return { published: createPublishState(publishedRoom, version) };
}

export function createEditorDraftFromPublished(
  published: PublishState,
  mutate?: (room: Room) => Room,
  updatedAt = "2026-01-01T00:00:00.000Z",
): EditorDraft {
  const base = { ...clone(published.room), state: "draft" as const };
  const room = mutate ? mutate(base) : base;
  return {
    id: `${published.roomId}:draft:${published.version + 1}`,
    roomId: published.roomId,
    basePublishedVersion: published.version,
    room: { ...room, state: "draft" },
    updatedAt,
    hasUnsavedChanges: false,
  };
}

export function saveEditorDraft(state: StudioRoomState, draft: EditorDraft): StudioRoomState {
  return {
    ...state,
    draft: { ...clone(draft), hasUnsavedChanges: false },
  };
}

export function getRoomForState(state: StudioRoomState, mode: "draft" | "published"): Room {
  if (mode === "draft" && state.draft) return clone(state.draft.room);
  return clone(state.published.room);
}

export function publishEditorDraft(
  state: StudioRoomState,
  publishedAt = "2026-01-01T00:00:00.000Z",
): StudioRoomState {
  if (!state.draft) return state;
  const nextVersion = state.published.version + 1;
  return {
    published: {
      roomId: state.published.roomId,
      version: nextVersion,
      previousVersion: state.published.version,
      room: { ...clone(state.draft.room), state: "published" },
      publishedAt,
    },
  };
}

export function hasUnpublishedDraft(state: StudioRoomState): boolean {
  return Boolean(state.draft);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
