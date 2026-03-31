import { describe, expect, it } from 'vitest';
import { ANU_PRIMITIVE_MANIFEST, getPrimitiveAdoptionSummary } from '@/ui-system/anu/primitiveManifest';

describe('M2 primitive manifest', () => {
  it('covers required phase-2 primitive classes', () => {
    const ids = ANU_PRIMITIVE_MANIFEST.map((entry) => entry.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'hero-frame',
        'section-header',
        'primary-cta',
        'secondary-cta',
        'panel-variants',
        'chip-variants',
        'filter-bars',
        'instrumentation-cards',
        'chamber-cards',
      ]),
    );
  });

  it('meets the shared route adoption floor', () => {
    const adoption = getPrimitiveAdoptionSummary();
    expect(adoption.minimum_shared_route_target).toBe(3);
    expect(adoption.unique_adopted_route_count).toBeGreaterThanOrEqual(3);
    expect(adoption.meets_shared_route_target).toBe(true);
  });
});
