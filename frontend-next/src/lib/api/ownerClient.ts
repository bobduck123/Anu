import { apiFetch } from '@/lib/api/client';

/**
 * Owner-scoped API client for authenticated presence node owners.
 * Uses Supabase JWT via apiFetch, pointed at /api/presence/owner/* routes.
 * Mirrors controlClient pattern for consistency.
 */

export interface OwnerApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export async function ownerFetchJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Normalize path: remove leading slash to avoid double slashes
  const normalizedPath = path.replace(/^\/+/, '');

  // apiFetch already handles Supabase JWT auth headers
  // Just point to the owner endpoint base
  const response = await apiFetch<T>(`/api/presence/owner/${normalizedPath}`, options);
  return response;
}
