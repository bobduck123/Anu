import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/sdk/shell-metadata/route';

describe('M5 shell metadata API route', () => {
  it('returns shell, chamber, community, observatory, and realm metadata contract payload', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        contract_version: string;
        shell: {
          primitive_count: number;
          pattern_experiment_count: number;
          primitives: string[];
          primitive_adoption: {
            unique_adopted_route_count: number;
            minimum_shared_route_target: number;
            meets_shared_route_target: boolean;
          };
        };
        chambers: {
          module_count: number;
          protocol_rule_count: number;
          coverage: {
            route_count: number;
          };
          modules: Array<{ id: string; route: string }>;
        };
        community: {
          module_count: number;
          protocol_rule_count: number;
          coverage: {
            route_count: number;
          };
          modules: Array<{ id: string; route: string }>;
        };
        observatory: {
          module_count: number;
          protocol_rule_count: number;
          coverage: {
            route_count: number;
            class_counts: Record<string, number>;
          };
          modules: Array<{ id: string; route: string }>;
        };
        realms: Array<{ id: string; prefixes: string[] }>;
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.contract_version).toBe('m5.2026-04-01');
    expect(payload.data.shell.primitive_count).toBeGreaterThan(5);
    expect(payload.data.shell.pattern_experiment_count).toBeGreaterThan(0);
    expect(payload.data.shell.primitives).toContain('hero-frame');
    expect(payload.data.shell.primitive_adoption.minimum_shared_route_target).toBe(3);
    expect(payload.data.shell.primitive_adoption.unique_adopted_route_count).toBeGreaterThanOrEqual(3);
    expect(payload.data.shell.primitive_adoption.meets_shared_route_target).toBe(true);

    expect(payload.data.chambers.module_count).toBeGreaterThanOrEqual(5);
    expect(payload.data.chambers.protocol_rule_count).toBeGreaterThanOrEqual(4);
    expect(payload.data.chambers.coverage.route_count).toBeGreaterThanOrEqual(4);
    expect(payload.data.chambers.modules.map((module) => module.id)).toContain('profile-cockpit');

    expect(payload.data.community.module_count).toBeGreaterThanOrEqual(5);
    expect(payload.data.community.protocol_rule_count).toBeGreaterThanOrEqual(4);
    expect(payload.data.community.coverage.route_count).toBeGreaterThanOrEqual(1);
    expect(payload.data.community.modules.map((module) => module.id)).toContain('commons-browse-frame');

    expect(payload.data.observatory.module_count).toBeGreaterThanOrEqual(7);
    expect(payload.data.observatory.protocol_rule_count).toBeGreaterThanOrEqual(4);
    expect(payload.data.observatory.coverage.route_count).toBeGreaterThanOrEqual(6);
    expect(payload.data.observatory.coverage.class_counts.trust).toBeGreaterThanOrEqual(4);
    expect(payload.data.observatory.modules.map((module) => module.id)).toContain('governance-observatory');

    expect(payload.data.realms.map((realm) => realm.id)).toEqual(
      expect.arrayContaining(['internal-lab', 'private-chambers']),
    );
  });
});
