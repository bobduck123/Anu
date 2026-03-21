const PENDING_RETURN_TO_KEY = 'manara.pendingReturnTo';

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

function normalizeInternalPath(path: string, fallback: string): string {
  if (!isSafeInternalPath(path)) {
    return fallback;
  }

  if (path === '/auth' || path.startsWith('/auth?')) {
    return fallback;
  }

  return path;
}

export function sanitizeReturnTo(returnTo: string | null | undefined, fallback = '/profile'): string {
  const value = (returnTo ?? '').trim();

  if (!value) {
    return fallback;
  }

  if (isSafeInternalPath(value)) {
    return normalizeInternalPath(value, fallback);
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      if (typeof window !== 'undefined' && parsed.origin !== window.location.origin) {
        return fallback;
      }

      const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return normalizeInternalPath(nextPath, fallback);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function buildAuthHref(returnTo: string): string {
  const params = new URLSearchParams();
  params.set('returnTo', sanitizeReturnTo(returnTo, '/'));
  return `/auth?${params.toString()}`;
}

export function savePendingReturnTo(returnTo: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const safeReturnTo = sanitizeReturnTo(returnTo, '/profile');
    window.sessionStorage.setItem(PENDING_RETURN_TO_KEY, safeReturnTo);
  } catch {
    // Ignore browser storage restrictions.
  }
}

export function readPendingReturnTo(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(PENDING_RETURN_TO_KEY);
    return value ? sanitizeReturnTo(value, '/profile') : null;
  } catch {
    return null;
  }
}

export function clearPendingReturnTo(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(PENDING_RETURN_TO_KEY);
  } catch {
    // Ignore browser storage restrictions.
  }
}

export function resolvePostAuthReturnTo(returnTo: string | null | undefined, fallback = '/profile'): string {
  const requested = sanitizeReturnTo(returnTo, fallback);
  if (requested !== fallback) {
    return requested;
  }

  const pending = readPendingReturnTo();
  if (pending) {
    return sanitizeReturnTo(pending, fallback);
  }

  return fallback;
}
