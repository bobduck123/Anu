export interface ActionableSurfaceError {
  headline: string;
  detail: string;
  fallbackHref: string;
  fallbackLabel: string;
}

interface ActionableSurfaceErrorOptions {
  area: string;
  rawCode?: string | null;
  rawDetails?: unknown;
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

function normalizeCode(rawCode?: string | null): string {
  return (rawCode || '').trim().toLowerCase();
}

function detailFromUnknown(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.hint === 'string' && record.hint.trim()) return record.hint.trim();
    if (typeof record.recovery_hint === 'string' && record.recovery_hint.trim()) return record.recovery_hint.trim();
  }
  return null;
}

export function toActionableSurfaceError({
  area,
  rawCode,
  rawDetails,
  rawMessage,
  fallbackHref,
  fallbackLabel,
}: ActionableSurfaceErrorOptions): ActionableSurfaceError {
  const code = normalizeCode(rawCode);

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

  if (code === 'wcle_pledge_exists_conflict') {
    return {
      headline: `${area} already has a pending commitment`,
      detail:
        detailFromUnknown(rawDetails)
        || 'A previous commit request already created a pledge with different selections. Refresh scenario options and choose one path before retrying.',
      fallbackHref,
      fallbackLabel,
    };
  }

  if (code === 'wcle_max_households_reached') {
    return {
      headline: `${area} reached capacity`,
      detail:
        detailFromUnknown(rawDetails)
        || 'This run is at household capacity. Choose another scenario or return later if space opens.',
      fallbackHref,
      fallbackLabel,
    };
  }

  if (code === 'wcle_run_not_open_for_pledges' || code === 'wcle_invalid_run_transition') {
    return {
      headline: `${area} cannot proceed in the current stage`,
      detail:
        detailFromUnknown(rawDetails)
        || 'This scenario is no longer accepting commits. Refresh to load the latest status and continue from an available action.',
      fallbackHref,
      fallbackLabel,
    };
  }

  if (code === 'wcle_invalid_pledge_transition') {
    return {
      headline: `${area} state changed while processing`,
      detail:
        detailFromUnknown(rawDetails)
        || 'Your selection changed state during commit. Refresh options and retry with the latest state.',
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
