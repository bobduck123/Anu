import { describe, expect, it } from 'vitest';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';

describe('actionableErrors', () => {
  it('keeps network fallback messaging', () => {
    const surface = toActionableSurfaceError({
      area: 'Scenario commitment',
      rawMessage: 'Failed to fetch',
      fallbackHref: '/cost-lowering',
      fallbackLabel: 'Return to scenarios',
    });

    expect(surface.headline).toContain('fallback mode');
    expect(surface.detail).toContain('read-only mode');
  });

  it('maps WCLE conflict codes to recovery-oriented guidance', () => {
    const surface = toActionableSurfaceError({
      area: 'Scenario commitment',
      rawCode: 'wcle_pledge_exists_conflict',
      rawMessage: 'An active pledge already exists',
      fallbackHref: '/cost-lowering',
      fallbackLabel: 'Return to scenarios',
    });

    expect(surface.headline).toContain('already has a pending commitment');
    expect(surface.detail).toContain('Refresh scenario options');
  });

  it('falls back to raw details when supplied for WCLE capacity errors', () => {
    const surface = toActionableSurfaceError({
      area: 'Scenario commitment',
      rawCode: 'wcle_max_households_reached',
      rawMessage: 'Run has reached maximum households',
      rawDetails: { hint: 'Try another nearby scenario.' },
      fallbackHref: '/cost-lowering',
      fallbackLabel: 'Return to scenarios',
    });

    expect(surface.headline).toContain('reached capacity');
    expect(surface.detail).toBe('Try another nearby scenario.');
  });
});
