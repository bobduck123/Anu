import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/sdk/community-commons-metadata/route';

describe('M4 community commons metadata API route', () => {
  it('returns community commons contract payload', async () => {
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
    expect(payload.data.contract_version).toBe('m4.2026-04-01');
    expect(payload.data.modules.length).toBeGreaterThanOrEqual(5);
    expect(payload.data.modules.map((module) => module.id)).toContain('composer-chamber');
    expect(payload.data.protocol_rules.length).toBeGreaterThanOrEqual(4);
    expect(payload.data.coverage.module_count).toBe(payload.data.modules.length);
    expect(payload.data.coverage.rule_count).toBe(payload.data.protocol_rules.length);
    expect(payload.data.coverage.route_count).toBeGreaterThanOrEqual(1);
  });
});
