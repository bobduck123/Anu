import { describe, expect, it } from 'vitest';
import { ANU_OBSERVATORY_MODULES } from '@/ui-system/anu/observatoryManifest';
import { ANU_PRIMITIVE_MANIFEST } from '@/ui-system/anu/primitiveManifest';
import {
  FLAGSHIP_ROUTE_CANON,
  INTERNAL_ROUTE_CANON,
  ROUTE_ALIAS_REGISTRY,
  ROUTE_PURPOSE_REGISTRY,
  resolveCanonicalRoute,
} from '@/ui-system/anu/routePurposeRegistry';
import { mapActorToThreshold, type ThresholdActorLabel } from '@/ui-system/anu/thresholdRegistry';

describe('route metadata parity', () => {
  it('keeps route list aligned with doctrine route canon', () => {
    expect(ROUTE_PURPOSE_REGISTRY.map((entry) => entry.route)).toEqual([
      FLAGSHIP_ROUTE_CANON.community,
      FLAGSHIP_ROUTE_CANON.impact,
      FLAGSHIP_ROUTE_CANON.governanceModelRegistry,
      FLAGSHIP_ROUTE_CANON.education,
      FLAGSHIP_ROUTE_CANON.transparency,
      FLAGSHIP_ROUTE_CANON.actions,
      FLAGSHIP_ROUTE_CANON.events,
      FLAGSHIP_ROUTE_CANON.universe,
      FLAGSHIP_ROUTE_CANON.archive,
      FLAGSHIP_ROUTE_CANON.controlTenants,
      FLAGSHIP_ROUTE_CANON.controlRuntimeHealth,
    ]);
  });

  it('keeps threshold label and threshold enum mapping consistent', () => {
    for (const entry of ROUTE_PURPOSE_REGISTRY) {
      expect(entry.threshold).toBe(mapActorToThreshold(entry.thresholdLabel as ThresholdActorLabel));
    }
  });

  it('contains no duplicate route declarations', () => {
    const uniqueRoutes = new Set(ROUTE_PURPOSE_REGISTRY.map((entry) => entry.route));
    expect(uniqueRoutes.size).toBe(ROUTE_PURPOSE_REGISTRY.length);
  });

  it('keeps observatory/primitive manifest routes canon-normalized', () => {
    const aliases = ROUTE_ALIAS_REGISTRY.map((entry) => entry.alias);

    for (const module of ANU_OBSERVATORY_MODULES) {
      expect(aliases).not.toContain(module.route);
      expect(resolveCanonicalRoute(module.route)).toBe(module.route);
    }

    for (const entry of ANU_PRIMITIVE_MANIFEST) {
      for (const route of entry.adoptedRoutes) {
        expect(aliases).not.toContain(route);
      }
    }
  });

  it('keeps internal lab canonical route explicit and singular', () => {
    expect(INTERNAL_ROUTE_CANON.lab).toBe('/lab');
    expect(ROUTE_ALIAS_REGISTRY.filter((entry) => entry.canonical === INTERNAL_ROUTE_CANON.lab)).toHaveLength(1);
  });
});
