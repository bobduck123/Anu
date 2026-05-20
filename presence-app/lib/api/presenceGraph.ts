import { apiFetch, ownerFetch } from "./client.ts";
import type {
  Encounter,
  FieldNote,
  MoodBoard,
  MoodBoardItem,
  ObserverProfile,
  PassportStamp,
  PathTrace,
  PathWalk,
  PresencePass,
  PresencePath,
  RoomConnection,
  RoomGraphAnalytics,
  RoomKey,
  RoomKeyEntryPayload,
  Signal,
} from "./types";

const PRESENCE = "/api/presence";
const OBSERVER = "/api/observer";
const PATHS = "/api/paths";

export interface EncounterInput {
  source?: string;
  room_key_token?: string;
  context_label?: string;
  anonymous_visitor_id?: string;
}

export interface ObserverProfileInput {
  alias?: string;
  mask_name?: string;
  avatar_key?: string;
  bio_fragment?: string;
  visibility?: "public_mask" | "private" | "limited";
}

export interface MoodBoardInput {
  title: string;
  description?: string;
  visibility?: "private" | "public" | "room_public" | "unlisted";
  board_type?: string;
}

export interface MoodBoardItemInput {
  item_type: string;
  item_id?: number;
  external_url?: string;
  title?: string;
  description?: string;
  image_url?: string;
  tags?: string[];
  position_index?: number;
  source_context?: string;
}

export interface FieldNoteInput {
  room_id?: number;
  path_id?: number;
  encounter_id?: number;
  mood_board_id?: number;
  body: string;
  visibility?: "public" | "room_owner_only" | "private";
}

export interface SignalInput {
  target_type: string;
  target_id: number;
  signal_type: string;
}

export interface PresencePassInput {
  pass_type?: string;
  label?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface RoomKeyInput {
  key_type?: string;
  presence_pass_id?: number;
  campaign_label?: string;
  physical_batch_id?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function resolveRoomKey(token: string) {
  return apiFetch<RoomKeyEntryPayload>(`${PRESENCE}/keys/${encodeURIComponent(token)}/resolve`);
}

export function captureRoomEncounter(roomId: number, payload: EncounterInput, token?: string | null) {
  return apiFetch<{ encounter: Encounter; room_id: number; available_actions: string[] }>(
    `${PRESENCE}/rooms/${roomId}/encounters`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      headers: token ? authHeaders(token) : undefined,
    },
  );
}

export function getObserverProfile(token: string) {
  return apiFetch<ObserverProfile>(`${OBSERVER}/profile`, { headers: authHeaders(token) });
}

export function createObserverProfile(payload: ObserverProfileInput, token: string) {
  return apiFetch<ObserverProfile>(`${OBSERVER}/profile`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function updateObserverProfile(payload: ObserverProfileInput, token: string) {
  return apiFetch<ObserverProfile>(`${OBSERVER}/profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function saveRoom(roomId: number, token: string) {
  return apiFetch<{ connection: RoomConnection }>(`${OBSERVER}/rooms/${roomId}/save`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function followRoom(roomId: number, token: string) {
  return apiFetch<{ connection: RoomConnection }>(`${OBSERVER}/rooms/${roomId}/follow`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function getPassport(token: string) {
  return apiFetch<{ items: PassportStamp[] }>(`${OBSERVER}/passport`, { headers: authHeaders(token) });
}

export function listMoodBoards(token: string) {
  return apiFetch<{ items: MoodBoard[] }>(`${OBSERVER}/mood-boards`, { headers: authHeaders(token) });
}

export function createMoodBoard(payload: MoodBoardInput, token: string) {
  return apiFetch<MoodBoard>(`${OBSERVER}/mood-boards`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function getMoodBoard(boardId: number, token: string) {
  return apiFetch<MoodBoard>(`${OBSERVER}/mood-boards/${boardId}`, { headers: authHeaders(token) });
}

export function updateMoodBoard(boardId: number, payload: Partial<MoodBoardInput>, token: string) {
  return apiFetch<MoodBoard>(`${OBSERVER}/mood-boards/${boardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function addMoodBoardItem(boardId: number, payload: MoodBoardItemInput, token: string) {
  return apiFetch<MoodBoardItem>(`${OBSERVER}/mood-boards/${boardId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function removeMoodBoardItem(boardId: number, itemId: number, token: string) {
  return apiFetch<{ deleted: boolean }>(`${OBSERVER}/mood-boards/${boardId}/items/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function createFieldNote(payload: FieldNoteInput, token: string) {
  return apiFetch<FieldNote>(`${OBSERVER}/field-notes`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function createSignal(payload: SignalInput, token: string) {
  return apiFetch<Signal>(`${OBSERVER}/signals`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function removeSignal(signalId: number, token: string) {
  return apiFetch<{ deleted: boolean }>(`${OBSERVER}/signals/${signalId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function getPath(pathId: number) {
  return apiFetch<PresencePath>(`${PATHS}/${pathId}`);
}

export function getPathFromRoom(roomId: number) {
  return apiFetch<PresencePath>(`${PATHS}/from-room/${roomId}`);
}

export function getPathFromMoodBoard(boardId: number) {
  return apiFetch<PresencePath>(`${PATHS}/from-mood-board/${boardId}`);
}

export function generatePathFromRoom(roomId: number) {
  return apiFetch<PresencePath>(`${PATHS}/generate/from-room/${roomId}`, { method: "POST" });
}

export function generatePathFromMoodBoard(boardId: number) {
  return apiFetch<PresencePath>(`${PATHS}/generate/from-mood-board/${boardId}`, { method: "POST" });
}

export function startPathWalk(pathId: number, token: string) {
  return apiFetch<PathWalk>(`${OBSERVER}/paths/${pathId}/walks`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function recordPathTrace(pathId: number, payload: { trace_type: string; waypoint_id?: number; metadata?: Record<string, unknown> }, token: string) {
  return apiFetch<PathTrace>(`${OBSERVER}/paths/${pathId}/traces`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function choosePathFork(pathId: number, choiceId: number, token: string) {
  return apiFetch<PathTrace>(`${OBSERVER}/paths/${pathId}/choose`, {
    method: "POST",
    body: JSON.stringify({ choice_id: choiceId }),
    headers: authHeaders(token),
  });
}

export function listPresencePasses(roomId: number, token: string) {
  return ownerFetch<{ items: PresencePass[] }>(`${PRESENCE}/owner/rooms/${roomId}/passes`, token);
}

export function createPresencePass(roomId: number, payload: PresencePassInput, token: string) {
  return ownerFetch<PresencePass>(`${PRESENCE}/owner/rooms/${roomId}/passes`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePresencePass(roomId: number, passId: number, payload: Partial<PresencePassInput>, token: string) {
  return ownerFetch<PresencePass>(`${PRESENCE}/owner/rooms/${roomId}/passes/${passId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listRoomKeys(roomId: number, token: string) {
  return ownerFetch<{ items: RoomKey[] }>(`${PRESENCE}/owner/rooms/${roomId}/keys`, token);
}

export function createRoomKey(roomId: number, payload: RoomKeyInput, token: string) {
  return ownerFetch<RoomKey>(`${PRESENCE}/owner/rooms/${roomId}/keys`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRoomKey(roomId: number, keyId: number, payload: Partial<RoomKeyInput>, token: string) {
  return ownerFetch<RoomKey>(`${PRESENCE}/owner/rooms/${roomId}/keys/${keyId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getRoomGraphAnalytics(roomId: number, token: string) {
  return ownerFetch<RoomGraphAnalytics>(`${PRESENCE}/owner/rooms/${roomId}/analytics`, token);
}

export function listRoomEncounters(roomId: number, token: string) {
  return ownerFetch<{ items: Encounter[] }>(`${PRESENCE}/owner/rooms/${roomId}/encounters`, token);
}

export function listRoomConnections(roomId: number, token: string) {
  return ownerFetch<{ items: RoomConnection[] }>(`${PRESENCE}/owner/rooms/${roomId}/connections`, token);
}

export function listRoomFieldNotes(roomId: number, token: string) {
  return ownerFetch<{ items: FieldNote[] }>(`${PRESENCE}/owner/rooms/${roomId}/field-notes`, token);
}

export function generateOwnerPathFromRoom(roomId: number, token: string) {
  return ownerFetch<PresencePath>(`${PRESENCE}/owner/rooms/${roomId}/paths/generate`, token, {
    method: "POST",
  });
}
