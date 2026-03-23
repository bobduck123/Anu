import { describe, expect, it } from 'vitest';
import { getTenantSemantics, getThresholdState } from '@/lib/tenantSemantics';

describe('tenant semantics manifest', () => {
  it('resolves the default ANU semantics from the Manara tenant identity', () => {
    const semantics = getTenantSemantics({ name: 'Manara', slug: 'anu-beta' });
    expect(semantics.key).toBe('manara');
    expect(semantics.thresholds.map((threshold) => threshold.key)).toEqual([
      'witness',
      'participant',
      'contributor',
      'steward',
    ]);
  });

  it('maps member roles to contributor and organizer roles to steward', () => {
    const contributor = getThresholdState('member', true);
    const steward = getThresholdState('organizer', true);

    expect(contributor.current.key).toBe('contributor');
    expect(contributor.next?.key).toBe('steward');
    expect(steward.current.key).toBe('steward');
    expect(steward.next).toBeNull();
  });
});
