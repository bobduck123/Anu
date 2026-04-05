import { describe, expect, it } from 'vitest';
import {
  ANU_CHAMBER_MODULES,
  ANU_CHAMBER_PROTOCOL_RULES,
  CHAMBER_METADATA_CONTRACT_VERSION,
  getChamberCoverageSummary,
} from '@/ui-system/anu/chamberManifest';

describe('M3 chamber manifest', () => {
  it('declares required chamber surfaces and protocol rules', () => {
    expect(CHAMBER_METADATA_CONTRACT_VERSION).toBe('m3.2026-04-01');
    expect(ANU_CHAMBER_PROTOCOL_RULES.length).toBeGreaterThanOrEqual(4);

    expect(ANU_CHAMBER_MODULES.map((module) => module.id)).toEqual(
      expect.arrayContaining([
        'profile-cockpit',
        'inbox-stack',
        'organizer-pathway',
        'team-chambers',
        'microcosm-entry',
        'microcosm-detail',
      ]),
    );
  });

  it('reports chamber route coverage summary', () => {
    const summary = getChamberCoverageSummary();
    expect(summary.module_count).toBeGreaterThanOrEqual(6);
    expect(summary.rule_count).toBeGreaterThanOrEqual(4);
    expect(summary.route_count).toBeGreaterThanOrEqual(4);
  });
});
