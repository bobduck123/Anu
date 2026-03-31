import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/sdk/shell-primitives/route';

describe('M2 shell primitives API route', () => {
  it('returns primitive manifest and adoption summary', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        manifest: Array<{ id: string; component: string; adoptedRoutes: string[] }>;
        adoption: {
          family_count: number;
          unique_adopted_route_count: number;
          minimum_shared_route_target: number;
          meets_shared_route_target: boolean;
        };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.manifest.length).toBeGreaterThanOrEqual(8);
    expect(payload.data.manifest.map((entry) => entry.id)).toContain('hero-frame');
    expect(payload.data.manifest.map((entry) => entry.component)).toContain('AnuPageHero');
    expect(payload.data.adoption.family_count).toBe(payload.data.manifest.length);
    expect(payload.data.adoption.minimum_shared_route_target).toBe(3);
    expect(payload.data.adoption.meets_shared_route_target).toBe(true);
  });
});
