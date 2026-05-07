const PENDING_RETURN_TO_KEY = "presence.pendingReturnTo";

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

function normalizeInternalPath(path: string, fallback: string) {
  if (!isSafeInternalPath(path)) return fallback;
  if (path === "/auth" || path.startsWith("/auth?")) return fallback;
  if (path.startsWith("/auth/sign-in")) return fallback;
  if (path.startsWith("/auth/sign-up")) return fallback;
  if (path.startsWith("/auth/verify-email")) return fallback;
  return path;
}

export function sanitizeReturnTo(
  returnTo: string | null | undefined,
  fallback = "/studio",
  allowedOrigin?: string,
) {
  const value = (returnTo ?? "").trim();
  if (!value) return fallback;

  if (isSafeInternalPath(value)) {
    return normalizeInternalPath(value, fallback);
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      const origin =
        allowedOrigin ??
        (typeof window !== "undefined" ? window.location.origin : null);
      if (!origin || parsed.origin !== origin) return fallback;
      return normalizeInternalPath(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
        fallback,
      );
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function buildSignInHref(returnTo = "/studio") {
  const params = new URLSearchParams();
  params.set("returnTo", sanitizeReturnTo(returnTo, "/studio"));
  return `/auth/sign-in?${params.toString()}`;
}

export function buildSignUpHref(returnTo = "/studio") {
  const params = new URLSearchParams();
  params.set("returnTo", sanitizeReturnTo(returnTo, "/studio"));
  return `/auth/sign-up?${params.toString()}`;
}

export function savePendingReturnTo(returnTo: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      PENDING_RETURN_TO_KEY,
      sanitizeReturnTo(returnTo, "/studio"),
    );
  } catch {
    // Browser storage can be unavailable in private contexts.
  }
}

export function readPendingReturnTo() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(PENDING_RETURN_TO_KEY);
    return value ? sanitizeReturnTo(value, "/studio") : null;
  } catch {
    return null;
  }
}

export function clearPendingReturnTo() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PENDING_RETURN_TO_KEY);
  } catch {
    // Browser storage can be unavailable in private contexts.
  }
}

export function resolvePostAuthReturnTo(
  returnTo: string | null | undefined,
  fallback = "/studio",
) {
  const requested = sanitizeReturnTo(returnTo, fallback);
  if (requested !== fallback) return requested;
  return readPendingReturnTo() ?? fallback;
}
