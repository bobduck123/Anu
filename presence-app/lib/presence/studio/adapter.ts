// Presence Studio manifest adapter.
//
// Fetches GET /api/presence/customisation/manifest, normalises the
// backend response into the UI-friendly StudioManifest shape, and
// falls back to LOCAL_STUDIO_MANIFEST when the backend is
// unavailable. UI code never sees the raw backend payload — only the
// typed shape with human labels.

import { API_BASE } from "@/lib/api/client";
import { LOCAL_STUDIO_MANIFEST, type StudioManifest } from "./manifest";

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

/** Translate a backend response (whatever shape it ships with) into
 * the strict StudioManifest. If the backend returns a richer or
 * partial manifest, we merge with the local fallback so UI never
 * encounters missing rows. */
function normaliseBackendManifest(data: Record<string, unknown>): StudioManifest {
  // Conservative merge: take any backend-supplied arrays that look right;
  // otherwise keep the local entries. We intentionally accept loose
  // shapes from the backend and validate field-by-field rather than
  // assuming a schema.
  const base = structuredCloneSafe(LOCAL_STUDIO_MANIFEST);
  const apply = <K extends keyof StudioManifest>(key: K, fallback: StudioManifest[K]) => {
    const incoming = data[key as string];
    if (Array.isArray(incoming) && incoming.length > 0) {
      // Each entry must at least have an id + a human label; otherwise
      // we skip it and keep the local fallback row for that index.
      const cleaned = (incoming as Array<Record<string, unknown>>)
        .map((row, i) => {
          const id = typeof row.id === "string" ? row.id : null;
          const label = typeof row.label === "string"
            ? row.label
            : typeof row.name === "string"
              ? row.name
              : null;
          if (!id || !label) return null;
          const fb = (fallback as unknown as Array<Record<string, unknown>>)[i] ?? {};
          // Merge incoming over local; backend wins on any field it provides.
          return { ...fb, ...row, id, label } as unknown;
        })
        .filter(Boolean);
      if (cleaned.length > 0) {
        (base as unknown as Record<string, unknown>)[key as string] = cleaned;
      }
    }
  };
  apply("identities", base.identities);
  apply("worlds", base.worlds);
  apply("movements", base.movements);
  apply("moods", base.moods);
  apply("paces", base.paces);
  apply("materials", base.materials);
  apply("contacts", base.contacts);
  base.version = typeof data.version === "string" ? data.version : "studio-v1-backend";
  base.source = "backend";
  return base;
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
