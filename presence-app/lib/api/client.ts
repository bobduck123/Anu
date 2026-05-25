export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_PRESENCE_API_BASE_URL ??
  "http://localhost:5000";

export class PresenceApiError extends Error {
  status: number;
  code: string;
  // Backend `details` payload — carries the self-promotion upgrade prompt
  // and other structured rejection metadata. Optional so older callers
  // keep working.
  details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function buildApiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function parseError(res: Response): Promise<PresenceApiError> {
  const payload = await res.json().catch(() => null);
  const err = payload?.error ?? payload;
  const details = (err && typeof err === "object" && "details" in err
    ? (err as { details?: Record<string, unknown> }).details
    : undefined) ?? undefined;
  if (res.status === 401) {
    return new PresenceApiError(
      401,
      err?.code ?? "auth_required",
      err?.message ?? err?.msg ?? "Please sign in again to create your Presence.",
      details,
    );
  }
  if (res.status === 403) {
    return new PresenceApiError(
      403,
      err?.code ?? "permission_denied",
      err?.message ?? err?.msg ?? "You do not have permission to create this Presence.",
      details,
    );
  }
  if (res.status === 404) {
    return new PresenceApiError(
      404,
      err?.code ?? "endpoint_unavailable",
      err?.message ?? err?.msg ?? "The Presence setup endpoint is unavailable.",
      details,
    );
  }
  return new PresenceApiError(
    res.status,
    err?.code ?? "request_failed",
    err?.message ?? err?.msg ?? `Request failed (${res.status})`,
    details,
  );
}

async function parseSuccess<T>(res: Response): Promise<T> {
  const payload = await res.json();
  if (payload && "ok" in payload) {
    if (!payload.ok) throw await parseError(res);
    return payload.data as T;
  }
  if (payload && "data" in payload) return payload.data as T;
  return payload as T;
}

// Default browser-side fetch timeout (ms). The Presence backend should answer
// well under this; if the host is unreachable we fail fast so client UI can
// render an empty / unavailable state instead of hanging on a TCP timeout.
const DEFAULT_FETCH_TIMEOUT_MS = 8000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = buildApiUrl(path);
  const controller =
    typeof AbortController !== "undefined" && !options.signal
      ? new AbortController()
      : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS)
    : null;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
      cache: "no-store",
      signal: options.signal ?? controller?.signal,
    });
  } catch {
    throw new PresenceApiError(
      0,
      "network_error",
      "The Presence backend did not allow this browser request, or could not be reached. Check the API URL and allowed frontend origin.",
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!res.ok) throw await parseError(res);

  return parseSuccess<T>(res);
}

// Auth-bearing fetch — attaches Supabase access token from session
export async function ownerFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface OwnerReadRetryPolicy {
  /**
   * Preview is a protected ensure-and-render operation: retrying after a
   * transient failure may repeat its audit event but does not publish or
   * overwrite owner content.
   */
  safeEnsurePost?: boolean;
  sessionPresent?: boolean;
  retryAuthOnce?: boolean;
  maxAttempts?: number;
}

const OWNER_READ_RETRY_DELAYS_MS = [180, 450];
const TRANSIENT_READ_STATUSES = new Set([408, 429, 502, 503, 504]);

export async function ownerReadFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
  policy: OwnerReadRetryPolicy = {},
): Promise<T> {
  const method = String(options.method ?? "GET").toUpperCase();
  const retryableMethod = method === "GET" || (method === "POST" && policy.safeEnsurePost === true);
  if (!retryableMethod) return ownerFetch<T>(path, token, options);

  const attempts = Math.max(1, policy.maxAttempts ?? 3);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const startedAt = nowMs();
    try {
      const result = await ownerFetch<T>(path, token, options);
      if (attempt > 0) {
        logOwnerReadTrace({
          path,
          method,
          status: 200,
          attempt: attempt + 1,
          recovered: true,
          durationMs: Math.round(nowMs() - startedAt),
          sessionPresent: policy.sessionPresent === true,
        });
      }
      return result;
    } catch (err) {
      const status = err instanceof PresenceApiError ? err.status : 0;
      const shouldRetry =
        attempt + 1 < attempts
        && (status === 0
          || TRANSIENT_READ_STATUSES.has(status)
          || (status === 401 && attempt === 0 && policy.sessionPresent === true && policy.retryAuthOnce === true));
      logOwnerReadTrace({
        path,
        method,
        status,
        attempt: attempt + 1,
        recovered: false,
        retrying: shouldRetry,
        durationMs: Math.round(nowMs() - startedAt),
        sessionPresent: policy.sessionPresent === true,
      });
      if (!shouldRetry) throw err;
      await wait(OWNER_READ_RETRY_DELAYS_MS[Math.min(attempt, OWNER_READ_RETRY_DELAYS_MS.length - 1)] ?? 450);
    }
  }

  throw new PresenceApiError(0, "network_error", "The Presence owner read could not be completed.");
}

interface OwnerReadTrace {
  path: string;
  method: string;
  status: number;
  attempt: number;
  recovered: boolean;
  retrying?: boolean;
  durationMs: number;
  sessionPresent: boolean;
}

function logOwnerReadTrace(trace: OwnerReadTrace) {
  if (!ownerReadDiagnosticsEnabled()) return;
  console.info("[Presence owner read]", {
    ...trace,
    credentials: "bearer-session",
  });
}

function ownerReadDiagnosticsEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "1";
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Classify an error as a connection problem (not a data/auth problem).
// Owner / Studio surfaces should surface a clear connection error here
// instead of pretending nothing exists — those users need to know the
// backend wasn't reached, not see a misleading "empty" state.
export function isPresenceConnectionError(err: unknown): boolean {
  if (err instanceof PresenceApiError) {
    return err.code === "network_error" || err.code === "endpoint_unavailable" || err.status === 0;
  }
  return false;
}

// Extract a `upgrade_required` upgrade prompt from a self-promotion
// validation_error so the Echo composer / Observation composer can show a
// "Open a Presence Room" CTA next to the rejection.
export interface UpgradeRequiredPayload {
  reason?: string;
  upgrade_required?: boolean;
  upgrade_target?: string;
  message?: string;
  allowed_actions?: string[];
}

export function extractUpgradeRequired(err: unknown): UpgradeRequiredPayload | null {
  if (!(err instanceof PresenceApiError)) return null;
  // PresenceApiError discards the original payload; we attach it back when
  // parseError is called below. The optional `details` field on the error
  // object carries the upgrade payload.
  const details = (err as PresenceApiError & { details?: UpgradeRequiredPayload }).details;
  if (details && typeof details === "object" && (details.upgrade_required || details.upgrade_target)) {
    return details;
  }
  return null;
}

export async function ownerMultipartFetch<T>(
  path: string,
  token: string,
  formData: FormData,
): Promise<T> {
  const url = buildApiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new PresenceApiError(
      0,
      "network_error",
      "The Presence backend did not allow this browser request, or could not be reached. Check the API URL and allowed frontend origin.",
    );
  }

  if (!res.ok) throw await parseError(res);
  return parseSuccess<T>(res);
}
