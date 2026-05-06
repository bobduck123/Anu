const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

export class PresenceApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<PresenceApiError> {
  const payload = await res.json().catch(() => null);
  const err = payload?.error ?? payload;
  return new PresenceApiError(
    res.status,
    err?.code ?? "request_failed",
    err?.message ?? `Request failed (${res.status})`,
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) throw await parseError(res);

  const payload = await res.json();
  if (payload && "ok" in payload) {
    if (!payload.ok) throw await parseError(res);
    return payload.data as T;
  }
  if (payload && "data" in payload) return payload.data as T;
  return payload as T;
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
