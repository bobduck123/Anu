import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EducationMapApiError, getEducationMap, listEducationMaps, shouldUseEducationMapsFallback } from '@/lib/api/educationMaps';
import { getFallbackEducationMap, listFallbackEducationMaps } from '@/lib/maps/fallbackMapData';

describe('educationMaps client', () => {
  const fetchMock = vi.fn();
  const originalFalakMode = process.env.NEXT_PUBLIC_FALAK_MODE;
  const originalFalakTenantId = process.env.NEXT_PUBLIC_FALAK_TENANT_ID;
  const originalSandboxTenantId = process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID;
  const originalMockFallback = process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    if (originalFalakMode === undefined) {
      delete process.env.NEXT_PUBLIC_FALAK_MODE;
    } else {
      process.env.NEXT_PUBLIC_FALAK_MODE = originalFalakMode;
    }

    if (originalFalakTenantId === undefined) {
      delete process.env.NEXT_PUBLIC_FALAK_TENANT_ID;
    } else {
      process.env.NEXT_PUBLIC_FALAK_TENANT_ID = originalFalakTenantId;
    }

    if (originalSandboxTenantId === undefined) {
      delete process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID;
    } else {
      process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID = originalSandboxTenantId;
    }

    if (originalMockFallback === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK = originalMockFallback;
    }

    vi.restoreAllMocks();
  });

  it('sends sandbox tenant and actor headers in map sandbox mode', async () => {
    process.env.NEXT_PUBLIC_FALAK_MODE = 'map_sandbox';
    delete process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listEducationMaps({}, 'anu-admin');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/v1/education/maps',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Tenant-Id': '11111111-1111-4111-8111-111111111111',
          'X-Actor-Id': 'anu-admin',
        }),
      }),
    );
  });

  it('does not leak sandbox tenant or actor headers outside sandbox mode', async () => {
    delete process.env.NEXT_PUBLIC_FALAK_MODE;
    delete process.env.NEXT_PUBLIC_FALAK_TENANT_ID;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listEducationMaps({}, 'anu-admin');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;

    expect(headers['X-Tenant-Id']).toBeUndefined();
    expect(headers['X-Actor-Id']).toBeUndefined();
  });

  it('uses an explicit hosted tenant id outside sandbox mode', async () => {
    delete process.env.NEXT_PUBLIC_FALAK_MODE;
    process.env.NEXT_PUBLIC_FALAK_TENANT_ID = '22222222-2222-4222-8222-222222222222';

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listEducationMaps({}, 'anu-admin');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;

    expect(headers['X-Tenant-Id']).toBe('22222222-2222-4222-8222-222222222222');
    expect(headers['X-Actor-Id']).toBeUndefined();
  });

  it('surfaces a structured Falak dark-launch error that can trigger fallback', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: {
          code: 'FALAK_MAPS_DISABLED',
          message: 'Falak-backed education maps are disabled',
        },
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    let error: unknown;
    try {
      await listEducationMaps();
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(EducationMapApiError);
    expect((error as EducationMapApiError).code).toBe('FALAK_MAPS_DISABLED');
    expect(shouldUseEducationMapsFallback(error)).toBe(true);
  });

  it('treats backend readiness failures as fallback candidates', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: {
          code: 'INTERNAL',
          message: 'database unavailable',
        },
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    let error: unknown;
    try {
      await getEducationMap('neural-civic-governance');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(EducationMapApiError);
    expect(shouldUseEducationMapsFallback(error)).toBe(true);
  });

  it('ships a Stanford encyclopedia fallback map with live SEP sources', () => {
    const map = getFallbackEducationMap('stanford-encyclopedia-philosophy-atlas');

    expect(map?.definition.title).toBe('Stanford Encyclopedia of Philosophy Atlas');
    expect(listFallbackEducationMaps({ q: 'stanford encyclopedia of philosophy' })).toHaveLength(1);

    const aiNode = map?.nodes.find((node) => node.label === 'Artificial Intelligence');

    expect(aiNode?.sources[0]?.url).toBe('https://plato.stanford.edu/entries/artificial-intelligence/');
    expect(aiNode?.sources[0]?.domain).toBe('plato.stanford.edu');
  });
});
