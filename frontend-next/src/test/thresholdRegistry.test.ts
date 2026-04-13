import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLD_MAPPINGS,
  THRESHOLD_REGISTRY,
  getThresholdDefinition,
  getThresholdForRoute,
  getThresholdLabelForRoute,
  getThresholdsByPlane,
  getThresholdsByRealm,
  mapActorToThreshold,
} from '@/ui-system/anu/thresholdRegistry';

describe('threshold registry', () => {
  it('contains canonical threshold ladder', () => {
    expect(THRESHOLD_REGISTRY.map((entry) => entry.threshold)).toEqual([
      'OPEN',
      'MEMBER',
      'VERIFIED_ACTOR',
      'STEWARD',
      'OPERATOR',
    ]);
  });

  it('preserves canonical actor-to-threshold mapping', () => {
    expect(DEFAULT_THRESHOLD_MAPPINGS).toEqual([
      { actor: 'Public', threshold: 'OPEN' },
      { actor: 'Participant', threshold: 'MEMBER' },
      { actor: 'Contributor', threshold: 'VERIFIED_ACTOR' },
      { actor: 'Steward', threshold: 'STEWARD' },
      { actor: 'Operator', threshold: 'OPERATOR' },
    ]);

    expect(mapActorToThreshold('Contributor')).toBe('VERIFIED_ACTOR');
    expect(getThresholdDefinition('STEWARD').summary).toContain('governance');
  });

  it('resolves route thresholds through route-purpose metadata', () => {
    expect(getThresholdForRoute('/community')).toBe('MEMBER');
    expect(getThresholdForRoute('/impact')).toBe('VERIFIED_ACTOR');
    expect(getThresholdForRoute('/governance/model-registry')).toBe('STEWARD');
    expect(getThresholdForRoute('/control/tenants')).toBe('OPERATOR');
    expect(getThresholdForRoute('/lab')).toBe('STEWARD');
    expect(getThresholdForRoute('/sandbox/ui-lab')).toBe('STEWARD');
    expect(getThresholdForRoute('/unknown-route')).toBe('OPEN');

    expect(getThresholdLabelForRoute('/impact')).toBe('Contributor');
    expect(getThresholdLabelForRoute('/lab')).toBe('Steward');
    expect(getThresholdLabelForRoute('/unknown-route')).toBe('Public');
  });

  it('exposes threshold groupings by plane and realm', () => {
    expect(getThresholdsByPlane('public')).toEqual(expect.arrayContaining(['OPEN', 'STEWARD']));
    expect(getThresholdsByPlane('control')).toEqual(['OPERATOR']);

    expect(getThresholdsByRealm('earth')).toEqual(expect.arrayContaining(['MEMBER', 'VERIFIED_ACTOR']));
    expect(getThresholdsByRealm('control')).toEqual(['OPERATOR']);
  });
});
