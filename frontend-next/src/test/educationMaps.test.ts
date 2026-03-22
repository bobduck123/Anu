import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EducationMapApiError,
  getEducationMapsBlockingMessage,
  getEducationMap,
  getEducationMapsFallbackMessage,
  getFalakSessionStatus,
  isEducationMapsBlockingAuthError,
  listEducationMapImportActivity,
  listEducationMaps,
  persistEducationMapSeedImport,
  previewEducationMapSeedImport,
  shouldUseEducationMapsFallback,
} from '@/lib/api/educationMaps';
import { SupabaseConfigurationError } from '@/lib/supabase/config';
import { getFalakTenantConfiguration } from '@/lib/maps/sandbox';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getFallbackEducationMap, listFallbackEducationMaps } from '@/lib/maps/fallbackMapData';

const getSessionMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: getSessionMock,
    },
  }),
}));

describe('educationMaps client', () => {
  const fetchMock = vi.fn();
  const originalFalakMode = process.env.NEXT_PUBLIC_FALAK_MODE;
  const originalFalakTenantId = process.env.NEXT_PUBLIC_FALAK_TENANT_ID;
  const originalSandboxTenantId = process.env.NEXT_PUBLIC_FALAK_SANDBOX_TENANT_ID;
  const originalMockFallback = process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK;

  beforeEach(() => {
    fetchMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
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
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'supabase-token' } },
      error: null,
    });

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
          Authorization: 'Bearer supabase-token',
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

  it('reports tenant configuration as hosted when NEXT_PUBLIC_FALAK_TENANT_ID is present', () => {
    delete process.env.NEXT_PUBLIC_FALAK_MODE;
    process.env.NEXT_PUBLIC_FALAK_TENANT_ID = '22222222-2222-4222-8222-222222222222';

    expect(getFalakTenantConfiguration()).toEqual({
      mode: 'hosted',
      tenantId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('reports tenant configuration as missing outside sandbox when no hosted tenant id is present', () => {
    delete process.env.NEXT_PUBLIC_FALAK_MODE;
    delete process.env.NEXT_PUBLIC_FALAK_TENANT_ID;

    expect(getFalakTenantConfiguration()).toEqual({
      mode: 'missing',
      tenantId: null,
    });
  });

  it('detects Supabase config from an explicit public env object', () => {
    expect(
      isSupabaseConfigured({
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
    ).toBe(true);
  });

  it('falls back to the legacy auth token when no Supabase session is available', async () => {
    delete process.env.NEXT_PUBLIC_FALAK_MODE;
    localStorage.setItem('auth_token', 'legacy-token');

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listEducationMaps();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;

    expect(headers.Authorization).toBe('Bearer legacy-token');
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

  it('captures structured error details from import-limit responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: {
          code: 'MAP_IMPORT_LIMIT_EXCEEDED',
          message: 'Seed import rejected: nodes exceed limit (501 > 500).',
          details: {
            resource: 'nodes',
            actual: 501,
            limit: 500,
          },
        },
      }), {
        status: 422,
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
    expect((error as EducationMapApiError).code).toBe('MAP_IMPORT_LIMIT_EXCEEDED');
    expect((error as EducationMapApiError).details).toEqual({
      resource: 'nodes',
      actual: 501,
      limit: 500,
    });
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

  it('describes tenant header failures accurately in the fallback notice', () => {
    const error = new EducationMapApiError(
      'Missing X-Tenant-Id header',
      400,
      'TENANT_HEADER_REQUIRED',
      null,
      { error: { code: 'TENANT_HEADER_REQUIRED' } },
    );

    expect(getEducationMapsFallbackMessage(error)).toContain('`X-Tenant-Id`');
  });

  it('treats Falak actor allowlist rejections as fallback candidates', () => {
    const error = new EducationMapApiError(
      'Actor is not allowed to access Falak routes',
      403,
      'ACTOR_NOT_ALLOWED',
      null,
      { error: { code: 'ACTOR_NOT_ALLOWED' } },
    );

    expect(shouldUseEducationMapsFallback(error)).toBe(true);
    expect(getEducationMapsFallbackMessage(error)).toContain('admin-only universe service');
  });

  it('does not silently fall back for signed-in actor authorization failures', () => {
    const error = new EducationMapApiError(
      'Actor is not allowed to access Falak routes',
      403,
      'ACTOR_NOT_ALLOWED',
      null,
      { error: { code: 'ACTOR_NOT_ALLOWED' } },
    );

    expect(isEducationMapsBlockingAuthError(error, { authenticated: true })).toBe(true);
    expect(shouldUseEducationMapsFallback(error, { authenticated: true })).toBe(false);
    expect(getEducationMapsBlockingMessage(error)).toContain('allowlisted');
  });

  it('treats hosted Supabase config failures as blocking errors, not fallback candidates', () => {
    const error = new SupabaseConfigurationError('browser_client');

    expect(isEducationMapsBlockingAuthError(error, { authenticated: false })).toBe(true);
    expect(shouldUseEducationMapsFallback(error)).toBe(false);
    expect(getEducationMapsBlockingMessage(error)).toContain('Hosted Supabase auth is not configured');
  });

  it('can query the live Falak session diagnostic with hosted tenant headers', async () => {
    process.env.NEXT_PUBLIC_FALAK_TENANT_ID = '22222222-2222-4222-8222-222222222222';
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'supabase-token' } },
      error: null,
    });
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        status: 'verified',
        tenant: {
          id: '22222222-2222-4222-8222-222222222222',
          slug: 'anu-beta',
        },
        actor: null,
        actor_resolution: {
          source: 'verified_auth',
          verified: true,
          authenticated_identity: 'anu-admin',
          requested_actor_id: null,
        },
        map_access: {
          mode: 'admin_only',
          allowed: true,
          code: null,
          message: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getFalakSessionStatus();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/v1/falak/session',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer supabase-token',
          'X-Tenant-Id': '22222222-2222-4222-8222-222222222222',
        }),
      }),
    );
  });

  it('calls the privileged import preview endpoint with actor headers', async () => {
    process.env.NEXT_PUBLIC_FALAK_MODE = 'map_sandbox';
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        preview: {
          topicKey: 'tiny-import',
          title: 'Tiny Import',
          archetype: 'theory',
          nodeCount: 1,
          edgeCount: 0,
          categoryCount: 1,
          axisCount: 3,
          aliasCount: 0,
          sepLinkedNodeCount: 1,
          relationBreakdown: {},
          warnings: [],
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await previewEducationMapSeedImport({
      mode: 'curated_refine',
      seed: {
        topicKey: 'tiny-import',
        title: 'Tiny Import',
        documents: [{ id: 'doc-1' }],
        entities: [{ label: 'Entity 1' }],
      },
    }, 'anu-admin');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/v1/education/maps/import/preview',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Tenant-Id': '11111111-1111-4111-8111-111111111111',
          'X-Actor-Id': 'anu-admin',
        }),
      }),
    );
  });

  it('calls the privileged import persist endpoint and forwards import governance fields', async () => {
    process.env.NEXT_PUBLIC_FALAK_MODE = 'map_sandbox';
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        map: {
          definition: {
            id: 'map-1',
            tenantId: '11111111-1111-4111-8111-111111111111',
            topicKey: 'tiny-import',
            title: 'Tiny Import',
            archetype: 'theory',
            entityType: 'topic',
            status: 'reviewed',
            sizeFormula: 'default',
            version: 1,
            currentSnapshotId: null,
            confidence: { coverage: 0.5, taxonomy: 0.5, positions: 0.5, dedupe: 0.5, relationships: 0.5 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          categories: [],
          axes: [],
          nodes: [],
          edges: [],
          aliases: [],
          snapshots: [],
          jobs: [],
        },
        jobCreated: true,
        idempotentReuse: false,
        checksum: 'abc123',
        preview: {
          topicKey: 'tiny-import',
          title: 'Tiny Import',
          archetype: 'theory',
          nodeCount: 1,
          edgeCount: 0,
          categoryCount: 1,
          axisCount: 3,
          aliasCount: 0,
          sepLinkedNodeCount: 1,
          relationBreakdown: {},
          warnings: [],
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await persistEducationMapSeedImport({
      mode: 'curated_refine',
      status: 'reviewed',
      force: true,
      importNote: 'test import note',
      seed: {
        topicKey: 'tiny-import',
        title: 'Tiny Import',
        documents: [{ id: 'doc-1' }],
        entities: [{ label: 'Entity 1' }],
      },
    }, 'anu-admin');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
    expect(String(options.body)).toContain('"importNote":"test import note"');
    expect(String(options.body)).toContain('"force":true');
  });

  it('calls the privileged import activity endpoint for a topic key', async () => {
    process.env.NEXT_PUBLIC_FALAK_MODE = 'map_sandbox';
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await listEducationMapImportActivity('left-thought-graph-atlas', 'anu-admin');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/v1/education/maps/left-thought-graph-atlas/import-activity',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Tenant-Id': '11111111-1111-4111-8111-111111111111',
          'X-Actor-Id': 'anu-admin',
        }),
      }),
    );
  });

  it('ships a Stanford encyclopedia fallback map with live SEP sources', () => {
    const map = getFallbackEducationMap('stanford-encyclopedia-philosophy-atlas');

    expect(map?.definition.title).toBe('Stanford Encyclopedia of Philosophy Atlas');
    expect(listFallbackEducationMaps({ q: 'stanford encyclopedia of philosophy' })).toHaveLength(1);

    const aiNode = map?.nodes.find((node) => node.label === 'Artificial Intelligence');

    expect(aiNode?.sources[0]?.url).toBe('https://plato.stanford.edu/entries/artificial-intelligence/');
    expect(aiNode?.sources[0]?.domain).toBe('plato.stanford.edu');
  });

  it('ships a left-thought fallback atlas with preserved graph scale and relation mapping', () => {
    const map = getFallbackEducationMap('left-thought-graph-atlas');

    expect(map?.definition.title).toBe('Left Thought Graph Atlas');
    expect(map?.nodes).toHaveLength(79);
    expect(map?.edges).toHaveLength(126);

    const marxNode = map?.nodes.find((node) => node.label === 'Karl Marx');
    expect(marxNode?.sources.some((source) => source.domain === 'plato.stanford.edu')).toBe(true);

    const sepLinkedNodeCount = map?.nodes.filter((node) => node.sources.some((source) => source.domain === 'plato.stanford.edu')).length;
    expect(sepLinkedNodeCount).toBe(79);

    const authoredByEdge = map?.edges.find((edge) => edge.evidence?.includes('authored by'));
    expect(authoredByEdge?.relation).toBe('derived_from');
  });
});
