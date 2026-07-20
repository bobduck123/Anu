import { apiFetch, buildApiUrl, ownerFetch } from "./client";
import type {
  HallAnalytics,
  HallModerationAction,
  HallParticipant,
  HallParticipantStatus,
  HallPortal,
  HallSession,
  HallStall,
  HallType,
  HallVisibility,
  HallZone,
  HallZoneKind,
  Observation,
  PresenceHall,
  PresencePath,
} from "./types";

const HALLS = "/api/halls";
const OWNER_HALLS = "/api/presence/owner/halls";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Public ──────────────────────────────────────────────────────────────────

export interface HallListQuery {
  status?: "live" | "scheduled" | "ended";
  hall_type?: HallType | string;
  host_room_id?: number;
  from_seeds?: boolean;
  near_paths?: boolean;
  limit?: number;
  offset?: number;
}

export interface HallList {
  items: PresenceHall[];
  total: number;
  live_count: number;
  scheduled_count: number;
}

export function listHalls(query: HallListQuery = {}, token?: string | null) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.hall_type) params.set("hall_type", query.hall_type);
  if (query.host_room_id !== undefined) params.set("host_room_id", String(query.host_room_id));
  if (query.from_seeds) params.set("from_seeds", "1");
  if (query.near_paths) params.set("near_paths", "1");
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  return apiFetch<HallList>(`${HALLS}${qs ? `?${qs}` : ""}`, {
    headers: token ? authHeaders(token) : undefined,
  });
}

export function getHall(slug: string, token?: string | null) {
  return apiFetch<PresenceHall>(`${HALLS}/${encodeURIComponent(slug)}`, {
    headers: token ? authHeaders(token) : undefined,
  });
}

export function getHallParticipants(slug: string, token?: string | null) {
  return apiFetch<{ items: HallParticipant[] }>(
    `${HALLS}/${encodeURIComponent(slug)}/participants`,
    {
      headers: token ? authHeaders(token) : undefined,
    },
  );
}

export function getHallObservations(slug: string, token?: string | null) {
  return apiFetch<{ items: Observation[] }>(
    `${HALLS}/${encodeURIComponent(slug)}/observations`,
    {
      headers: token ? authHeaders(token) : undefined,
    },
  );
}

// Authenticated Observer join — token required.
export function joinHall(slug: string, token: string) {
  return apiFetch<HallParticipantStatus>(`${HALLS}/${encodeURIComponent(slug)}/join`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

// Guest join for public / unlisted Halls. The contract accepts an optional
// `guest_token` so a returning guest can be recognised across page loads.
export function joinHallAsGuest(slug: string, guestToken?: string) {
  return apiFetch<HallParticipantStatus>(`${HALLS}/${encodeURIComponent(slug)}/join`, {
    method: "POST",
    body: JSON.stringify(guestToken ? { guest_token: guestToken } : {}),
  });
}

export function leaveHall(slug: string, token: string) {
  return apiFetch<HallParticipantStatus>(`${HALLS}/${encodeURIComponent(slug)}/leave`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export interface HallActivityEvent {
  id?: number;
  hall_id: number;
  event_type:
    | "portal_click"
    | "stall_visit"
    | "join"
    | "leave"
    | "observation"
    | "path_open"
    | "room_enter"
    | string;
  portal_id?: number | null;
  stall_id?: number | null;
  observer_id?: number | null;
  guest_token?: string | null;
  created_at?: string | null;
}

// Public Hall activity tracking. The canonical contract records a real
// `hall_activity_event` row that feeds Hall analytics. We fail silent in the
// client so end users never see a tracking error, but we use `sendBeacon`
// when the click is about to navigate away so the event still lands.
function fireAndForgetEvent(path: string): Promise<HallActivityEvent | null> {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const ok = navigator.sendBeacon(buildApiUrl(path), new Blob(["{}"], { type: "application/json" }));
      if (ok) return Promise.resolve(null);
    } catch {
      // fall through to fetch
    }
  }
  return apiFetch<HallActivityEvent>(path, {
    method: "POST",
    // `keepalive` lets the fetch survive a navigation away from the page.
    // Cast through unknown because RequestInit's typing is conservative.
    ...(({ keepalive: true } as unknown) as RequestInit),
  }).catch(() => null);
}

export function trackPortalClick(slug: string, portalId: number) {
  return fireAndForgetEvent(`${HALLS}/${encodeURIComponent(slug)}/portals/${portalId}/click`);
}

export function trackStallVisit(slug: string, stallId: number) {
  return fireAndForgetEvent(`${HALLS}/${encodeURIComponent(slug)}/stalls/${stallId}/visit`);
}

// Create an Observation in a Hall through the dedicated route. The canonical
// contract supports `POST /api/halls/:slug/observations`; using this path
// means the backend automatically attaches the Hall as the Observation
// source and records a `hall.observation` analytics event.
export function createHallObservation(
  slug: string,
  payload: { observation_kind?: string; body: string; visibility?: string },
  token: string,
) {
  return apiFetch<Observation>(`${HALLS}/${encodeURIComponent(slug)}/observations`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

// Hall trailhead Path — get the active Path for a Hall (lazy-generates on
// the backend if missing). Public; no auth required.
export function getPathFromHall(hallId: number) {
  return apiFetch<PresencePath>(`/api/paths/from-hall/${hallId}`);
}

// Force-generate a new Hall trailhead Path. Public; backend logs a
// `path_open` Hall activity event.
export function generatePathFromHall(hallId: number) {
  return apiFetch<PresencePath>(`/api/paths/generate/from-hall/${hallId}`, {
    method: "POST",
  });
}

// ── Owner / Studio ──────────────────────────────────────────────────────────

export interface HallInput {
  title: string;
  description?: string;
  rules?: string;
  hall_type: HallType | string;
  visibility?: HallVisibility | string;
  host_room_id: number;
  starts_at?: string | null;
  ends_at?: string | null;
  cover_image_url?: string | null;
}

export interface HallZoneInput {
  zone_kind: HallZoneKind | string;
  title: string;
  blurb?: string;
  capacity?: number;
  order_index?: number;
  links_to_kind?: "room" | "path" | "mood_board" | "garden" | "hall" | null;
  links_to_id?: number | null;
  links_to_slug?: string | null;
}

export interface HallSessionInput {
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  host_label?: string;
}

export interface HallStallInput {
  room_id: number;
  zone_id?: number;
  short_pitch?: string;
}

export interface HallPortalInput {
  zone_id?: number;
  label: string;
  destination_kind: "room" | "garden" | "path" | "mood_board" | "hall";
  destination_id?: number;
  destination_slug?: string;
}

export function listOwnerHalls(roomId: number, token: string) {
  return ownerFetch<{ items: PresenceHall[] }>(
    `${OWNER_HALLS}?room_id=${roomId}`,
    token,
  );
}

export function getOwnerHall(roomId: number, hallId: number, token: string) {
  return ownerFetch<PresenceHall>(
    `${OWNER_HALLS}/${hallId}?room_id=${roomId}`,
    token,
  );
}

export function createHall(payload: HallInput, token: string) {
  return ownerFetch<PresenceHall>(`${OWNER_HALLS}`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHall(hallId: number, payload: Partial<HallInput>, token: string) {
  return ownerFetch<PresenceHall>(`${OWNER_HALLS}/${hallId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteHall(hallId: number, token: string) {
  return ownerFetch<{ deleted: boolean }>(`${OWNER_HALLS}/${hallId}`, token, {
    method: "DELETE",
  });
}

export function addHallZone(hallId: number, payload: HallZoneInput, token: string) {
  return ownerFetch<HallZone>(`${OWNER_HALLS}/${hallId}/zones`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHallZone(
  hallId: number,
  zoneId: number,
  payload: Partial<HallZoneInput>,
  token: string,
) {
  return ownerFetch<HallZone>(`${OWNER_HALLS}/${hallId}/zones/${zoneId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function removeHallZone(hallId: number, zoneId: number, token: string) {
  return ownerFetch<{ deleted: boolean }>(
    `${OWNER_HALLS}/${hallId}/zones/${zoneId}`,
    token,
    { method: "DELETE" },
  );
}

export function addHallSession(hallId: number, payload: HallSessionInput, token: string) {
  return ownerFetch<HallSession>(`${OWNER_HALLS}/${hallId}/sessions`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addHallStall(hallId: number, payload: HallStallInput, token: string) {
  return ownerFetch<HallStall>(`${OWNER_HALLS}/${hallId}/stalls`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addHallPortal(hallId: number, payload: HallPortalInput, token: string) {
  return ownerFetch<HallPortal>(`${OWNER_HALLS}/${hallId}/portals`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getHallAnalytics(hallId: number, token: string) {
  return ownerFetch<HallAnalytics>(`${OWNER_HALLS}/${hallId}/analytics`, token);
}

export function moderateHall(
  hallId: number,
  payload: { target_kind: "observation" | "participant"; target_id: number; action: string; reason?: string },
  token: string,
) {
  return ownerFetch<HallModerationAction>(`${OWNER_HALLS}/${hallId}/moderation`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
