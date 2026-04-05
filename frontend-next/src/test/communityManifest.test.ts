import { describe, expect, it } from 'vitest';
import {
  ANU_COMMUNITY_MODULES,
  ANU_COMMUNITY_PROTOCOL_RULES,
  COMMUNITY_COMMONS_CONTRACT_VERSION,
  getCommunityCoverageSummary,
} from '@/ui-system/anu/communityManifest';

describe('M4 community manifest', () => {
  it('declares community commons modules and protocol rules', () => {
    expect(COMMUNITY_COMMONS_CONTRACT_VERSION).toBe('m4.2026-04-01');
    expect(ANU_COMMUNITY_MODULES.length).toBeGreaterThanOrEqual(5);
    expect(ANU_COMMUNITY_PROTOCOL_RULES.length).toBeGreaterThanOrEqual(4);

    expect(ANU_COMMUNITY_MODULES.map((module) => module.id)).toEqual(
      expect.arrayContaining([
        'commons-browse-frame',
        'status-language',
        'filter-control-bar',
        'gallery-backup-path',
        'composer-chamber',
      ]),
    );
  });

  it('reports route coverage summary for the commons module set', () => {
    const summary = getCommunityCoverageSummary();
    expect(summary.module_count).toBeGreaterThanOrEqual(5);
    expect(summary.rule_count).toBeGreaterThanOrEqual(4);
    expect(summary.route_count).toBeGreaterThanOrEqual(1);
  });
});
