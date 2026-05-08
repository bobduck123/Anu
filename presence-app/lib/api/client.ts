export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_PRESENCE_API_BASE_URL ??
  "http://localhost:5000";

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

async function parseSuccess<T>(res: Response): Promise<T> {
  const payload = await res.json();
  if (payload && "ok" in payload) {
    if (!payload.ok) throw await parseError(res);
    return payload.data as T;
  }
  if (payload && "data" in payload) return payload.data as T;
  return payload as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
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
    });
  } catch {
    throw new PresenceApiError(
      0,
      "network_error",
      "Presence backend could not be reached. Check the API URL and try again.",
    );
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

export async function ownerMultipartFetch<T>(
  path: string,
  token: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
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
      "Presence backend could not be reached. Check the API URL and try again.",
    );
  }

  if (!res.ok) throw await parseError(res);
  return parseSuccess<T>(res);
}
