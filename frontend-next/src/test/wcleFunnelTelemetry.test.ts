import { beforeEach, describe, expect, it } from 'vitest';
import {
  queryWcleFunnelSummary,
  summarizeWcleFunnelEvents,
  trackWcleFunnelEvent,
  type WcleFunnelEvent,
} from '@/lib/wcle/funnelTelemetry';

function isoHoursBefore(anchorIso: string, hours: number): string {
  const anchorMs = Date.parse(anchorIso);
  return new Date(anchorMs - (hours * 60 * 60 * 1000)).toISOString();
}

describe('wcle funnel telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('summarizes stage transitions, reliability, and commit rates', () => {
    const nowIso = '2026-04-23T10:00:00.000Z';
    const events: WcleFunnelEvent[] = [
      {
        id: 'e1',
        occurredAt: isoHoursBefore(nowIso, 2),
        eventName: 'wcle_stage_transition',
        toStage: 'inspect',
      },
      {
        id: 'e2',
        occurredAt: isoHoursBefore(nowIso, 2),
        eventName: 'wcle_commit_attempt',
        toStage: 'commit',
      },
      {
        id: 'e3',
        occurredAt: isoHoursBefore(nowIso, 2),
        eventName: 'wcle_commit_result',
        status: 'success',
        toStage: 'post_commit',
      },
      {
        id: 'e4',
        occurredAt: isoHoursBefore(nowIso, 2),
        eventName: 'wcle_action_result',
        status: 'failure',
        toStage: 'options',
      },
      {
        id: 'e5',
        occurredAt: isoHoursBefore(nowIso, 2),
        eventName: 'wcle_tradeoff_summary_view',
        toStage: 'compare',
      },
    ];

    const summary = summarizeWcleFunnelEvents(events, { windowHours: 24, nowIso });

    expect(summary.totalEvents).toBe(5);
    expect(summary.stageTransitions.inspect).toBe(1);
    expect(summary.actions).toBe(2);
    expect(summary.actionFailures).toBe(1);
    expect(summary.reliabilityPct).toBe(50);
    expect(summary.commitAttempts).toBe(1);
    expect(summary.commitSuccesses).toBe(1);
    expect(summary.commitSuccessRatePct).toBe(100);
    expect(summary.inspectToCommitRatePct).toBe(100);
    expect(summary.trustInteractionCount).toBe(1);
  });

  it('filters out events older than selected window', () => {
    const nowIso = '2026-04-23T10:00:00.000Z';
    const events: WcleFunnelEvent[] = [
      {
        id: 'recent',
        occurredAt: isoHoursBefore(nowIso, 6),
        eventName: 'wcle_stage_transition',
        toStage: 'discover',
      },
      {
        id: 'old',
        occurredAt: isoHoursBefore(nowIso, 32),
        eventName: 'wcle_stage_transition',
        toStage: 'discover',
      },
    ];

    const summary = summarizeWcleFunnelEvents(events, { windowHours: 24, nowIso });

    expect(summary.totalEvents).toBe(1);
    expect(summary.stageTransitions.discover).toBe(1);
  });

  it('stores and queries tracked events from local storage', () => {
    trackWcleFunnelEvent({
      eventName: 'wcle_stage_transition',
      toStage: 'discover',
    });

    const summary = queryWcleFunnelSummary({ windowHours: 24 });
    expect(summary.totalEvents).toBeGreaterThanOrEqual(1);
    expect(summary.stageTransitions.discover).toBeGreaterThanOrEqual(1);
  });
});

