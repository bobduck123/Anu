import { describe, expect, it } from 'vitest';
import {
  FLAGSHIP_ROUTE_LIST,
  ROUTE_ALIAS_REGISTRY,
  ROUTE_PURPOSE_REGISTRY,
  getRouteAlias,
  getRoutePurpose,
  getRoutesByPlane,
  isFlagshipRoute,
  resolveCanonicalRoute,
} from '@/ui-system/anu/routePurposeRegistry';

describe('route purpose registry', () => {
  it('contains canonical flagship routes with required metadata fields', () => {
    expect(ROUTE_PURPOSE_REGISTRY.length).toBe(FLAGSHIP_ROUTE_LIST.length);

    for (const entry of ROUTE_PURPOSE_REGISTRY) {
      expect(entry.route).toMatch(/^\//);
      expect(entry.purpose.length).toBeGreaterThan(10);
      expect(entry.primaryActor.length).toBeGreaterThan(1);
      expect(entry.keyInputs.length).toBeGreaterThan(0);
      expect(entry.keyOutputs.length).toBeGreaterThan(0);
      expect(entry.adjacentRoutes.length).toBeGreaterThan(0);
      expect(entry.thresholdLabel.length).toBeGreaterThan(1);
      expect(entry.provenanceTrustRequirement.length).toBeGreaterThan(10);
    }
  });

  it('resolves by route prefix for nested paths', () => {
    expect(getRoutePurpose('/community/microcosms/anu')?.route).toBe('/community');
    expect(getRoutePurpose('/governance/model-registry/changes')?.route).toBe('/governance/model-registry');
    expect(getRoutePurpose('/control/runtime-health/checks')?.route).toBe('/control/runtime-health');
  });

  it('exposes control-plane route grouping', () => {
    const controlRoutes = getRoutesByPlane('control').map((entry) => entry.route);
    expect(controlRoutes).toEqual(expect.arrayContaining(['/control/tenants', '/control/runtime-health']));
  });

  it('models /lab canon with explicit legacy alias mapping', () => {
    expect(ROUTE_ALIAS_REGISTRY).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alias: '/sandbox/ui-lab',
          canonical: '/lab',
          status: 'legacy-redirect',
        }),
      ]),
    );

    expect(getRouteAlias('/sandbox/ui-lab')?.canonical).toBe('/lab');
    expect(resolveCanonicalRoute('/sandbox/ui-lab')).toBe('/lab');
    expect(resolveCanonicalRoute('/sandbox/ui-lab/preview')).toBe('/lab/preview');
  });

  it('does not treat /lab as a flagship route entry', () => {
    expect(isFlagshipRoute('/lab')).toBe(false);
    expect(getRoutePurpose('/lab')).toBeNull();
    expect(getRoutePurpose('/sandbox/ui-lab')).toBeNull();
  });
});
