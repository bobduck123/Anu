import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/sdk/chamber-metadata/route';

describe('M3 chamber metadata API route', () => {
  it('returns chamber protocol metadata contract', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        contract_version: string;
        modules: Array<{ id: string; route: string }>;
        protocol_rules: string[];
        coverage: {
          module_count: number;
          rule_count: number;
          route_count: number;
        };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.contract_version).toBe('m3.2026-04-01');
    expect(payload.data.modules.length).toBeGreaterThanOrEqual(6);
    expect(payload.data.modules.map((module) => module.id)).toContain('team-chambers');
    expect(payload.data.protocol_rules.length).toBeGreaterThanOrEqual(4);
    expect(payload.data.coverage.module_count).toBe(payload.data.modules.length);
    expect(payload.data.coverage.rule_count).toBe(payload.data.protocol_rules.length);
    expect(payload.data.coverage.route_count).toBeGreaterThanOrEqual(4);
  });
});
