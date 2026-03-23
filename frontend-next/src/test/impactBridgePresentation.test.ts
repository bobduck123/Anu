import { describe, expect, it } from 'vitest';
import { buildImpactOutcomeSignals } from '@/app/(app)/impact/impactBridgePresentation';

describe('buildImpactOutcomeSignals', () => {
  it('derives the bridge outcomes from summary and pool data', () => {
    const outcomes = buildImpactOutcomeSignals(
      {
        actions_completed: 12,
        event_attendance: 48,
        relief_paid_cents: 18500,
      },
      {
        total_pools: 3,
        active_pools: 2,
        total_target_cents: 990000,
        total_balance_cents: 240000,
      },
      [],
    );

    expect(outcomes).toHaveLength(4);
    expect(outcomes[0]?.groundedValue).toBe('12 completions');
    expect(outcomes[1]?.groundedValue).toBe('48 attendees');
    expect(outcomes[2]?.groundedValue).toBe('$185');
    expect(outcomes[3]?.groundedValue).toBe('$9,900');
  });
});
