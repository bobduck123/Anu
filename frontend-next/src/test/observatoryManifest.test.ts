import { describe, expect, it } from 'vitest';
import {
  ANU_OBSERVATORY_MODULES,
  ANU_OBSERVATORY_PROTOCOL_RULES,
  OBSERVATORY_CONTRACT_VERSION,
  getObservatoryCoverageSummary,
} from '@/ui-system/anu/observatoryManifest';

describe('M5 observatory manifest', () => {
  it('declares trust and observatory modules with protocol rules', () => {
    expect(OBSERVATORY_CONTRACT_VERSION).toBe('m5.2026-04-01');
    expect(ANU_OBSERVATORY_MODULES.length).toBeGreaterThanOrEqual(7);
    expect(ANU_OBSERVATORY_PROTOCOL_RULES.length).toBeGreaterThanOrEqual(4);

    expect(ANU_OBSERVATORY_MODULES.map((module) => module.id)).toEqual(
      expect.arrayContaining([
        'trust-transparency',
        'trust-docs',
        'trust-contact',
        'trust-memberships',
        'governance-observatory',
        'admin-runtime-health',
      ]),
    );
  });

  it('reports observatory route and class coverage', () => {
    const summary = getObservatoryCoverageSummary();
    expect(summary.module_count).toBeGreaterThanOrEqual(7);
    expect(summary.rule_count).toBeGreaterThanOrEqual(4);
    expect(summary.route_count).toBeGreaterThanOrEqual(6);
    expect(summary.class_counts.trust).toBeGreaterThanOrEqual(4);
    expect(summary.class_counts.observatory).toBeGreaterThanOrEqual(2);
  });
});
