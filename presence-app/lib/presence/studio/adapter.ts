// Presence Studio manifest adapter.
//
// Fetches GET /api/presence/customisation/manifest, normalises the
// backend response into the UI-friendly StudioManifest shape, and
// falls back to LOCAL_STUDIO_MANIFEST when the backend is
// unavailable. UI code never sees the raw backend payload — only the
// typed shape with human labels.

import { API_BASE } from "@/lib/api/client";
import { LOCAL_STUDIO_MANIFEST, type StudioManifest } from "./manifest";
// `friendlyLabelFor` is exported separately for callers that need to render
// a label for a bare backend id (e.g. future backend-only rows). The
// adapter itself preserves local labels — see applyBackendV1.
export { friendlyLabelFor, FRIENDLY_BACKEND_LABELS } from "./backendLabels";

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

/** Backend v1 merge. The local rows already carry the warm UI labels
 * we want; the backend response confirms each `backendId` is a known
 * canonical AND lets us stamp the right manifest version and provenance.
 *
 * We intentionally do NOT overwrite local labels with backend labels here.
 * Backend labels are correct but technical ("Underground DJ", "Gallery
 * Frame Pack"); the local manifest's richer palette also COLLAPSES multiple
 * local rows onto the same backend canonical id (e.g. "Cinematic" and
 * "Editorial" moods both map to `quiet_gallery`), so blindly applying the
 * backend label would erase the precise local distinction.
 *
 * The `FRIENDLY_BACKEND_LABELS` dictionary remains exported (see
 * `backendLabels.ts`) for the rare case where the UI needs to render a
 * label for a bare backend id that has no local row.
 *
 * Local-only rows are kept untouched so the UI never loses choices. */
function applyBackendV1(base: StudioManifest, root: Record<string, unknown>): void {
  validateLocalBackendIds(base.identities, pickArray(root, "archetypes"), "archetypes");
  validateLocalBackendIds(base.worlds, pickArray(root, "room_worlds", "roomWorlds"), "room_worlds");
  validateLocalBackendIds(base.movements, pickArray(root, "engagement_dynamics", "engagementDynamics"), "engagement_dynamics");
  validateLocalBackendIds(base.paces, pickArray(root, "motion_profiles", "motionProfiles"), "motion_profiles");
  validateLocalBackendIds(base.moods, pickArray(root, "atmosphere_packs", "atmospherePacks"), "atmosphere_packs");
  validateLocalBackendIds(base.materials, pickArray(root, "object_skin_packs", "objectSkinPacks"), "object_skin_packs");
  // `contacts` has no backend equivalent yet — kept from local fallback.
}

/** Best-effort sanity check: every local row's `backendId` should still
 * exist in the backend's canonical set. We don't throw or rewrite when a
 * mismatch is found — the studio still works on local fallback ids,
 * and the backend remaps unknown ids gracefully — but a console.warn in
 * dev surfaces drift quickly so it can be reconciled. */
function validateLocalBackendIds(
  rows: Array<{ backendId: string }>,
  incoming: Array<Record<string, unknown>> | null,
  slot: string,
): void {
  if (!incoming) return;
  const known = new Set<string>();
  for (const r of incoming) {
    if (typeof r.id === "string") known.add(r.id);
  }
  if (typeof console === "undefined" || process.env.NODE_ENV === "production") return;
  for (const row of rows) {
    if (!known.has(row.backendId)) {
      console.warn(`[studio adapter] local ${slot} row backendId "${row.backendId}" is not in the backend canonical set; submissions may be remapped.`);
    }
  }
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
