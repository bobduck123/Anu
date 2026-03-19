export interface ActionableSurfaceError {
  headline: string;
  detail: string;
  fallbackHref: string;
  fallbackLabel: string;
}

interface ActionableSurfaceErrorOptions {
  area: string;
  rawMessage?: string | null;
  fallbackHref: string;
  fallbackLabel: string;
}

const NETWORK_ERROR_PATTERNS = [
  'failed to fetch',
  'networkerror',
  'err_connection_refused',
  'fetch failed',
  'load failed',
  'network request failed',
  'service is temporarily unavailable',
];

function normalize(message?: string | null): string {
  return (message || '').trim().toLowerCase();
}

function isNetworkIssue(rawMessage?: string | null): boolean {
  const message = normalize(rawMessage);
  if (!message) return false;
  return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function isAuthIssue(rawMessage?: string | null): boolean {
  const message = normalize(rawMessage);
  if (!message) return false;
  return (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('sign in is required') ||
    message.includes('auth')
  );
}

export function toActionableSurfaceError({
  area,
  rawMessage,
  fallbackHref,
  fallbackLabel,
}: ActionableSurfaceErrorOptions): ActionableSurfaceError {
  if (isNetworkIssue(rawMessage)) {
    return {
      headline: `${area} is running in fallback mode`,
      detail:
        'We could not reach the live service right now. You can continue in read-only mode and follow the fallback route while the connection recovers.',
      fallbackHref,
      fallbackLabel,
    };
  }

  if (isAuthIssue(rawMessage)) {
    return {
      headline: `${area} needs signed-in access`,
      detail: 'This surface needs an authenticated session for full data. You can continue with public routes or sign in for complete access.',
      fallbackHref,
      fallbackLabel,
    };
  }

  return {
    headline: `${area} is temporarily unavailable`,
    detail: rawMessage?.trim() || 'This surface is temporarily unavailable. Please retry shortly or continue with a fallback route.',
    fallbackHref,
    fallbackLabel,
  };
}
