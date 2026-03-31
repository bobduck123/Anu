import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/sdk/observatory-metadata/route';

describe('M5 observatory metadata API route', () => {
  it('returns trust and observatory contract payload', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        contract_version: string;
        modules: Array<{ id: string; class: string; route: string }>;
        protocol_rules: string[];
        coverage: {
          module_count: number;
          rule_count: number;
          route_count: number;
          class_counts: Record<string, number>;
        };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.contract_version).toBe('m5.2026-04-01');
    expect(payload.data.modules.length).toBeGreaterThanOrEqual(7);
    expect(payload.data.modules.map((module) => module.id)).toContain('admin-runtime-health');
    expect(payload.data.protocol_rules.length).toBeGreaterThanOrEqual(4);
    expect(payload.data.coverage.module_count).toBe(payload.data.modules.length);
    expect(payload.data.coverage.rule_count).toBe(payload.data.protocol_rules.length);
    expect(payload.data.coverage.route_count).toBeGreaterThanOrEqual(6);
    expect(payload.data.coverage.class_counts.trust).toBeGreaterThanOrEqual(4);
  });
});
