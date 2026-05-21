import { apiFetch } from "./client";
import type {
  GardenHome,
  GardenSeed,
  Observation,
  ObservationEcho,
  ObservationKind,
  PublicMask,
  SharedSpace,
} from "./types";

const GARDEN = "/api/garden";
const OBSERVATIONS = "/api/observations";
const SEEDS = "/api/garden/seeds";
const MASKS = "/api/masks";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Garden home ─────────────────────────────────────────────────────────────

export function getGardenHome(token: string) {
  return apiFetch<GardenHome>(`${GARDEN}/home`, { headers: authHeaders(token) });
}

export function listGardenSeeds(token: string, params: { state?: string; kind?: string } = {}) {
  const search = new URLSearchParams();
  if (params.state) search.set("state", params.state);
  if (params.kind) search.set("kind", params.kind);
  const qs = search.toString();
  return apiFetch<{ items: GardenSeed[] }>(`${SEEDS}${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token),
  });
}

export function listSharedSpaces(token: string) {
  return apiFetch<{ items: SharedSpace[] }>(`${GARDEN}/shared-spaces`, {
    headers: authHeaders(token),
  });
}

// ── Seed actions ────────────────────────────────────────────────────────────

export function nurtureSeed(seedId: number, token: string) {
  return apiFetch<{ seed: GardenSeed }>(`${SEEDS}/${seedId}/nurture`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function pruneSeed(seedId: number, token: string, reason?: string) {
  return apiFetch<{ seed: GardenSeed }>(`${SEEDS}/${seedId}/prune`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
    headers: authHeaders(token),
  });
}

export function compostSeed(seedId: number, token: string) {
  return apiFetch<{ seed: GardenSeed }>(`${SEEDS}/${seedId}/compost`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function blockSeed(seedId: number, token: string) {
  return apiFetch<{ seed: GardenSeed }>(`${SEEDS}/${seedId}/block`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

// ── Observations ────────────────────────────────────────────────────────────

export interface ObservationInput {
  observation_kind: ObservationKind | string;
  body: string;
  body_format?: "plain" | "display";
  visibility?: "public" | "mask_only" | "private";
  source_kind?: string;
  source_id?: number;
  source_slug?: string;
  hall_id?: number;
  image_url?: string;
}

export function createObservation(payload: ObservationInput, token: string) {
  return apiFetch<Observation>(`${OBSERVATIONS}`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

export function listObservationsByMask(alias: string) {
  return apiFetch<{ items: Observation[] }>(
    `${OBSERVATIONS}/by-mask/${encodeURIComponent(alias)}`,
  );
}

export function getObservation(id: number) {
  return apiFetch<Observation>(`${OBSERVATIONS}/${id}`);
}

export function deleteObservation(id: number, token: string) {
  return apiFetch<{ deleted: boolean }>(`${OBSERVATIONS}/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function nurtureObservation(id: number, token: string) {
  return apiFetch<{ observation: Observation }>(`${OBSERVATIONS}/${id}/nurture`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function unnurtureObservation(id: number, token: string) {
  return apiFetch<{ observation: Observation }>(`${OBSERVATIONS}/${id}/nurture`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// The canonical contract accepts both `message` and `commentary`.
// Send both keys mirrored so older backend revisions still pick the body up.
export function echoObservation(
  id: number,
  payload: { message?: string; commentary?: string } = {},
  token: string,
) {
  const text = payload.commentary ?? payload.message ?? "";
  const body = text.trim()
    ? { message: text.trim(), commentary: text.trim() }
    : {};
  return apiFetch<ObservationEcho>(`${OBSERVATIONS}/${id}/echoes`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeaders(token),
  });
}

export function reportObservation(
  id: number,
  payload: { reason: string },
  token: string,
) {
  return apiFetch<{ received: boolean }>(`${OBSERVATIONS}/${id}/report`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(token),
  });
}

// ── Masks (public Mask/Garden pages) ────────────────────────────────────────

export function getPublicMask(alias: string) {
  return apiFetch<PublicMask>(`${MASKS}/${encodeURIComponent(alias)}`);
}

// ── Mood Board → Seed ───────────────────────────────────────────────────────
//
// Canonical contract endpoint. A Mood Board item is "planted" — it either
// creates a fresh GardenSeed or adds a `mood_board_add` nurture to the
// existing active seed. The response includes a `garden_home_update_hint`
// (typically `"from_mood_boards"`) so the Garden home can know which
// section's already-rendered list is stale.
export interface MoodBoardSeedResponse {
  seed: GardenSeed;
  reason_label?: string;
  garden_home_update_hint?: string;
}

export function plantMoodBoardItemAsSeed(
  boardId: number,
  itemId: number,
  token: string,
) {
  return apiFetch<MoodBoardSeedResponse>(
    `/api/observer/mood-boards/${boardId}/items/${itemId}/seed`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
}
