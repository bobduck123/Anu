export const wcleFunnelWindowHours = [24, 168, 720] as const;
export type WcleFunnelWindowHours = (typeof wcleFunnelWindowHours)[number];

export type WcleFunnelStage =
  | 'discover'
  | 'inspect'
  | 'configure'
  | 'options'
  | 'compare'
  | 'commit'
  | 'post_commit';

export type WcleFunnelEventName =
  | 'wcle_stage_transition'
  | 'wcle_action_result'
  | 'wcle_commit_attempt'
  | 'wcle_commit_result'
  | 'wcle_recommendation_rationale_view'
  | 'wcle_tradeoff_summary_view'
  | 'wcle_confidence_panel_view';

export interface WcleFunnelEventPayload {
  eventName: WcleFunnelEventName;
  status?: 'success' | 'failure';
  fromStage?: WcleFunnelStage;
  toStage?: WcleFunnelStage;
  runId?: number | null;
  reasonCode?: string | null;
  message?: string | null;
  props?: Record<string, unknown>;
}

export interface WcleFunnelEvent extends WcleFunnelEventPayload {
  id: string;
  occurredAt: string;
}

export interface WcleFunnelSummary {
  windowHours: WcleFunnelWindowHours;
  since: string;
  totalEvents: number;
  stageTransitions: Record<WcleFunnelStage, number>;
  actions: number;
  actionFailures: number;
  reliabilityPct: number;
  commitAttempts: number;
  commitSuccesses: number;
  commitFailures: number;
  commitSuccessRatePct: number;
  trustInteractionCount: number;
  inspectToCommitRatePct: number;
}

const STORAGE_KEY = 'wcle-funnel-events-v1';
const MAX_EVENTS = 800;
const RETENTION_MS = 1000 * 60 * 60 * 24 * 45;

const stageDefaults: Record<WcleFunnelStage, number> = {
  discover: 0,
  inspect: 0,
  configure: 0,
  options: 0,
  compare: 0,
  commit: 0,
  post_commit: 0,
};

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function parseTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeReadRawEvents(): WcleFunnelEvent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is WcleFunnelEvent => (
        entry
        && typeof entry === 'object'
        && typeof entry.id === 'string'
        && typeof entry.eventName === 'string'
        && typeof entry.occurredAt === 'string'
      ))
      .filter((entry) => parseTimestamp(entry.occurredAt) != null);
  } catch {
    return [];
  }
}

function safeWriteRawEvents(events: WcleFunnelEvent[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore write failures in constrained environments.
  }
}

function pruneEvents(events: WcleFunnelEvent[], nowMs: number): WcleFunnelEvent[] {
  const cutoffMs = nowMs - RETENTION_MS;
  const retained = events.filter((event) => {
    const ts = parseTimestamp(event.occurredAt);
    return ts != null && ts >= cutoffMs;
  });

  if (retained.length <= MAX_EVENTS) {
    return retained;
  }

  return retained.slice(retained.length - MAX_EVENTS);
}

export function readWcleFunnelEvents(): WcleFunnelEvent[] {
  return safeReadRawEvents();
}

export function trackWcleFunnelEvent(payload: WcleFunnelEventPayload): WcleFunnelEvent | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const event: WcleFunnelEvent = {
    id: `wcle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString(),
    ...payload,
  };

  const nowMs = Date.now();
  const next = pruneEvents([...safeReadRawEvents(), event], nowMs);
  safeWriteRawEvents(next);
  return event;
}

export function summarizeWcleFunnelEvents(
  events: WcleFunnelEvent[],
  options: {
    windowHours?: WcleFunnelWindowHours;
    nowIso?: string;
  } = {},
): WcleFunnelSummary {
  const windowHours = options.windowHours ?? 168;
  const nowMs = parseTimestamp(options.nowIso || '') ?? Date.now();
  const sinceMs = nowMs - (windowHours * 60 * 60 * 1000);

  const filtered = events.filter((event) => {
    const ts = parseTimestamp(event.occurredAt);
    return ts != null && ts >= sinceMs;
  });

  const stageTransitions: Record<WcleFunnelStage, number> = {
    ...stageDefaults,
  };

  let actions = 0;
  let actionFailures = 0;
  let commitAttempts = 0;
  let commitSuccesses = 0;
  let commitFailures = 0;
  let trustInteractionCount = 0;

  for (const event of filtered) {
    if (event.eventName === 'wcle_stage_transition' && event.toStage) {
      stageTransitions[event.toStage] += 1;
    }

    if (event.eventName === 'wcle_action_result' || event.eventName === 'wcle_commit_result') {
      actions += 1;
      if (event.status === 'failure') {
        actionFailures += 1;
      }
    }

    if (event.eventName === 'wcle_commit_attempt') {
      commitAttempts += 1;
    }

    if (event.eventName === 'wcle_commit_result') {
      if (event.status === 'success') {
        commitSuccesses += 1;
      } else if (event.status === 'failure') {
        commitFailures += 1;
      }
    }

    if (
      event.eventName === 'wcle_recommendation_rationale_view'
      || event.eventName === 'wcle_tradeoff_summary_view'
      || event.eventName === 'wcle_confidence_panel_view'
    ) {
      trustInteractionCount += 1;
    }
  }

  const commitRateBase = commitAttempts > 0 ? commitAttempts : commitSuccesses + commitFailures;

  return {
    windowHours,
    since: new Date(sinceMs).toISOString(),
    totalEvents: filtered.length,
    stageTransitions,
    actions,
    actionFailures,
    reliabilityPct: percentage(actions - actionFailures, actions),
    commitAttempts,
    commitSuccesses,
    commitFailures,
    commitSuccessRatePct: percentage(commitSuccesses, commitRateBase),
    trustInteractionCount,
    inspectToCommitRatePct: percentage(commitSuccesses, stageTransitions.inspect),
  };
}

export function queryWcleFunnelSummary(options: { windowHours?: WcleFunnelWindowHours } = {}): WcleFunnelSummary {
  return summarizeWcleFunnelEvents(safeReadRawEvents(), options);
}

