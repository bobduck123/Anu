import { getCoreApiBase } from '@/lib/runtime';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigurationError } from '@/lib/supabase/config';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  requestId?: string;

  constructor(payload: ApiErrorPayload, requestId?: string) {
    super(payload.message);
    this.code = payload.code;
    this.details = payload.details;
    this.requestId = requestId;
  }
}

const API_BASE = getCoreApiBase();

function getDefaultApiErrorPayload(status: number): ApiErrorPayload {
  switch (status) {
    case 401:
      return { code: 'unauthorized', message: 'Sign in is required for this data.' };
    case 403:
      return { code: 'forbidden', message: 'You do not have access to this resource.' };
    case 404:
      return { code: 'not_found', message: 'The requested resource was not found.' };
    case 500:
      return { code: 'service_error', message: 'The service returned an error. Try again shortly.' };
    case 503:
      return { code: 'service_unavailable', message: 'This service is temporarily unavailable.' };
    default:
      return { code: 'request_failed', message: 'The request could not be completed.' };
  }
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  if (typeof window === 'undefined') return {};

  try {
    const supabase = createSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token?.trim();
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }

    if (error) {
      console.warn('Unable to read Supabase session token for API requests. Falling back to local token cache.', error);
    }
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      throw error;
    }
    console.warn('Unable to resolve Supabase session token for API requests. Falling back to local token cache.', error);
  }

  const token = localStorage.getItem('auth_token')?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
      ...(options.headers || {}),
    },
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const errPayload = payload?.error || getDefaultApiErrorPayload(res.status);
    throw new ApiError(errPayload, payload?.request_id);
  }
  if (payload && typeof payload.ok === 'boolean') {
    if (!payload.ok) {
      const errPayload = payload?.error || getDefaultApiErrorPayload(res.status);
      throw new ApiError(errPayload, payload?.request_id);
    }
    return payload.data as T;
  }
  return payload as T;
}

export interface ApiFetchMetaResult<T> {
  data: T | null;
  notModified: boolean;
  etag?: string;
}

export async function apiFetchWithMeta<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiFetchMetaResult<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
      ...(options.headers || {}),
    },
  });

  const etag = res.headers.get('ETag') || undefined;
  if (res.status === 304) {
    return { data: null, notModified: true, etag };
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const errPayload = payload?.error || getDefaultApiErrorPayload(res.status);
    throw new ApiError(errPayload, payload?.request_id);
  }

  if (payload && typeof payload.ok === 'boolean') {
    if (!payload.ok) {
      const errPayload = payload?.error || getDefaultApiErrorPayload(res.status);
      throw new ApiError(errPayload, payload?.request_id);
    }
    return { data: payload.data as T, notModified: false, etag };
  }
  return { data: payload as T, notModified: false, etag };
}
