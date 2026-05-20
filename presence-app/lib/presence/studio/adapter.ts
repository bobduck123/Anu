// Presence Studio manifest adapter.
//
// Fetches GET /api/presence/customisation/manifest, normalises the
// backend response into the UI-friendly StudioManifest shape, and
// falls back to LOCAL_STUDIO_MANIFEST when the backend is
// unavailable. UI code never sees the raw backend payload — only the
// typed shape with human labels.

import { API_BASE } from "@/lib/api/client";
import { LOCAL_STUDIO_MANIFEST, type StudioManifest } from "./manifest";
import { friendlyLabelFor } from "./backendLabels";

const ENDPOINT = "/api/presence/customisation/manifest";

interface BackendManifestResponse {
  data?: unknown;
  ok?: boolean;
}

/** Fetches the backend manifest. Returns null on any failure so the
 * caller can fall back. Never throws. */
async function fetchBackendManifest(signal?: AbortSignal): Promise<StudioManifest | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as BackendManifestResponse;
    if (!body) return null;
    const data = (body.data ?? body) as Record<string, unknown>;
    return normaliseBackendManifest(data);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Backend shape detection.
//
// The live API ships a `presence-customisation-manifest-v1` payload with
// arrays keyed `archetypes`, `room_worlds`, `engagement_dynamics`,
// `motion_profiles`, `atmosphere_packs`, `object_skin_packs`. The legacy
// shape (and the local fallback) uses the UI vocabulary directly:
// `identities`, `worlds`, `movements`, `moods`, `paces`, `materials`. The
// adapter accepts either.
// ---------------------------------------------------------------------------
function isArrayWithRows(x: unknown): x is Array<Record<string, unknown>> {
  return Array.isArray(x) && x.length > 0 && typeof x[0] === "object" && x[0] !== null;
}

function pickArray(data: Record<string, unknown>, ...keys: string[]): Array<Record<string, unknown>> | null {
  for (const k of keys) {
    const v = data[k];
    if (isArrayWithRows(v)) return v;
  }
  return null;
}

function detectShape(data: Record<string, unknown>): "backend-v1" | "legacy" | "unknown" {
  const sv = data.schema_version;
  if (typeof sv === "string" && sv.includes("presence-customisation-manifest")) return "backend-v1";
  if (pickArray(data, "archetypes")) return "backend-v1";
  if (pickArray(data, "identities", "worlds", "movements")) return "legacy";
  return "unknown";
}

/** Translate a backend response into the StudioManifest the UI consumes.
 *
 * Two shapes are accepted:
 *
 * 1. **Backend v1** (live API). Keys are canonical:
 *    `archetypes`, `room_worlds`, `engagement_dynamics`,
 *    `motion_profiles`, `atmosphere_packs`, `object_skin_packs`.
 *    Each row carries a snake-case `id` and a technical `label`. The
 *    adapter starts from the LOCAL fallback (so visitors get the warm
 *    labels and the hand-built vignettes), refreshes labels through
 *    `FRIENDLY_BACKEND_LABELS`, and confirms every local `backendId`
 *    is present in the backend's canonical set. The result keeps the
 *    UI surface intact while flipping `source: "backend"` and stamping
 *    the backend `schema_version`.
 *
 * 2. **Legacy** (and the local fallback's own shape). Keys are
 *    UI-shaped: `identities`, `worlds`, etc. Each row merges over the
 *    local fallback row at the same index when an `id + label` pair
 *    is present.
 *
 * Returns `null` for a clearly malformed manifest (neither shape
 * recognised), so the caller can fall back. */
export function normaliseBackendManifest(data: unknown): StudioManifest | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const shape = detectShape(root);
  if (shape === "unknown") return null;

  const base = structuredCloneSafe(LOCAL_STUDIO_MANIFEST);

  if (shape === "backend-v1") {
    applyBackendV1(base, root);
  } else {
    applyLegacy(base, root);
  }

  base.version =
    pickString(root.schema_version) ??
    pickString(root.manifest_version) ??
    pickString(root.version) ??
    "studio-v1-backend";
  base.source = "backend";
  return base;
}

/** Backend v1 merge. Each canonical array is walked once; for every
 * backend row we either (a) refresh the matching local row's label via
 * the friendly dictionary, or (b) leave the local row alone if the
 * backend offers no friendlier name. Local-only rows (e.g. our richer
 * 5-mood palette mapped onto 3 backend atmosphere packs) are kept so
 * the UI never loses choices. */
function applyBackendV1(base: StudioManifest, root: Record<string, unknown>): void {
  refreshLabelsByBackendId(base.identities, pickArray(root, "archetypes"));
  refreshLabelsByBackendId(base.worlds, pickArray(root, "room_worlds", "roomWorlds"));
  refreshLabelsByBackendId(base.movements, pickArray(root, "engagement_dynamics", "engagementDynamics"));
  refreshLabelsByBackendId(base.paces, pickArray(root, "motion_profiles", "motionProfiles"));
  refreshLabelsByBackendId(base.moods, pickArray(root, "atmosphere_packs", "atmospherePacks"));
  refreshLabelsByBackendId(base.materials, pickArray(root, "object_skin_packs", "objectSkinPacks"));
  // `contacts` has no backend equivalent yet — kept from local fallback.
}

/** Legacy/local-shape merge (preserves the original Pass 7 behaviour for
 * back-compatibility with anything still emitting UI keys). */
function applyLegacy(base: StudioManifest, root: Record<string, unknown>): void {
  const apply = <K extends keyof StudioManifest>(key: K) => {
    const incoming = root[key as string];
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    const fallback = base[key] as unknown as Array<Record<string, unknown>>;
    const cleaned = (incoming as Array<Record<string, unknown>>).map((row, i) => {
      const id = typeof row.id === "string" ? row.id : null;
      const label =
        typeof row.label === "string" ? row.label :
        typeof row.name === "string" ? row.name : null;
      if (!id || !label) return null;
      const fb = fallback[i] ?? {};
      return { ...fb, ...row, id, label } as unknown;
    }).filter(Boolean);
    if (cleaned.length > 0) {
      (base as unknown as Record<string, unknown>)[key as string] = cleaned;
    }
  };
  apply("identities");
  apply("worlds");
  apply("movements");
  apply("moods");
  apply("paces");
  apply("materials");
  apply("contacts");
}

/** Walk a local-shape array and, for every row whose `backendId` is
 * mentioned in the incoming backend rows, replace its `label` with the
 * friendly dictionary entry (preferring the backend's own label over the
 * bare backend id, but never preferring the bare id). Rows whose
 * `backendId` is not in the incoming set are left alone. */
function refreshLabelsByBackendId(
  rows: Array<{ backendId: string; label: string }>,
  incoming: Array<Record<string, unknown>> | null,
): void {
  if (!incoming) return;
  const incomingById = new Map<string, string>();
  for (const row of incoming) {
    const id = typeof row.id === "string" ? row.id : null;
    const label = typeof row.label === "string" ? row.label : null;
    if (id) incomingById.set(id, label ?? "");
  }
  for (const row of rows) {
    if (!incomingById.has(row.backendId)) continue;
    const backendLabel = incomingById.get(row.backendId) ?? "";
    const friendly = friendlyLabelFor(row.backendId, backendLabel || row.label);
    if (friendly && friendly.trim().length > 0) {
      row.label = friendly;
    }
  }
}

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Public API — used by the studio state hook. */
export async function loadStudioManifest(options?: { signal?: AbortSignal }): Promise<StudioManifest> {
  const fromBackend = await fetchBackendManifest(options?.signal);
  return fromBackend ?? LOCAL_STUDIO_MANIFEST;
}

// ---------------------------------------------------------------------------
// Setup request submission
// ---------------------------------------------------------------------------

const SETUP_ENDPOINT = "/api/presence/setup-requests";

export interface SetupRequestPayload {
  display_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  what_youre_building: string;
  notes?: string;
  references?: string[];
  do_not_wants?: string;
  consent_to_contact: boolean;
  archetype?: string;
  room_world?: string;
  engagement_dynamic?: string;
  motion_profile?: string;
  object_skin_pack?: string;
  atmosphere_pack?: string;
  contact_style?: string;
  copy_tone?: string;
  customisation_manifest_version: string;
  customisation_snapshot: Record<string, unknown>;
}

export interface SetupRequestResult {
  /**
   * - "submitted" → the backend accepted and stored the request
   * - "validation_error" → the backend rejected the payload
   * - "saved_locally" → the backend was unavailable; the draft was saved on the device
   */
  state: "submitted" | "validation_error" | "saved_locally";
  reference?: string;
  errors?: Record<string, string>;
  message?: string;
}

const LOCAL_DRAFT_KEY = "presence-studio:setup-request-draft";

export function saveLocalDraft(payload: SetupRequestPayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function loadLocalDraft(): SetupRequestPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SetupRequestPayload;
  } catch {
    return null;
  }
}

export function clearLocalDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export async function submitSetupRequest(payload: SetupRequestPayload): Promise<SetupRequestResult> {
  // Always save the draft locally before attempting the network call so
  // a backend outage never loses the user's work.
  saveLocalDraft(payload);

  if (typeof fetch === "undefined") {
    return { state: "saved_locally", message: "Saved on this device. We'll try sending again when you're online." };
  }
  try {
    const res = await fetch(`${API_BASE}${SETUP_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const data = ((body.data ?? body) as Record<string, unknown>) ?? {};
      const reference = typeof data.reference === "string"
        ? data.reference
        : typeof data.id === "string" || typeof data.id === "number"
          ? `PS-${data.id}`
          : undefined;
      clearLocalDraft();
      return { state: "submitted", reference };
    }
    if (res.status === 400 || res.status === 422) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const errBody = (body.error ?? body) as Record<string, unknown>;
      const details = (errBody.details ?? errBody) as Record<string, unknown>;
      const errors: Record<string, string> = {};
      for (const [k, v] of Object.entries(details)) {
        if (typeof v === "string") errors[k] = v;
      }
      return {
        state: "validation_error",
        errors,
        message: typeof errBody.message === "string" ? errBody.message : "Some details need a second look.",
      };
    }
    // Any non-2xx, non-4xx response → treat as backend unavailable.
    return { state: "saved_locally", message: "We couldn't reach the studio right now — your request is saved on this device." };
  } catch {
    return { state: "saved_locally", message: "Your request is saved on this device. We'll keep trying to send it." };
  }
}
