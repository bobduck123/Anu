import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock, getCoreApiOriginMock, getImpactApiOriginMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getCoreApiOriginMock: vi.fn(),
  getImpactApiOriginMock: vi.fn(),
}));
const { emitPlaneLogMock } = vi.hoisted(() => ({
  emitPlaneLogMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/runtime', () => ({
  getCoreApiOrigin: getCoreApiOriginMock,
  getImpactApiOrigin: getImpactApiOriginMock,
}));
vi.mock('@/lib/observability/planeLog', () => ({
  emitPlaneLog: emitPlaneLogMock,
}));

import { GET } from '@/app/api/control/[...path]/route';

function buildRequest(url: string, host: string, method = 'GET', body?: string) {
  return new NextRequest(url, {
    method,
    headers: {
      host,
      'content-type': 'application/json',
    },
    body,
  });
}

function routeContext(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function createSupabaseSessionMock(role: string | null, accessToken = 'public.session.token') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: role
            ? {
                id: 'user-1',
                user_metadata: { role },
              }
            : null,
        },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: role
            ? {
                access_token: accessToken,
              }
            : null,
        },
      }),
    },
  };
}

describe('control proxy route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONTROL_PLANE_SHARED_SECRET = 'test-control-plane-secret';
    getCoreApiOriginMock.mockReturnValue('https://core.example.com');
    getImpactApiOriginMock.mockReturnValue('https://impact.example.com');
  });

  afterEach(() => {
    delete process.env.CONTROL_PLANE_SHARED_SECRET;
    delete process.env.CONTROL_PLANE_SECRET_HEADER;
  });

  it('rejects access on public hosts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      buildRequest('https://app.anu.eco/api/control/core/api/admin/tenants', 'app.anu.eco'),
      routeContext(['core', 'api', 'admin', 'tenants']),
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error.code).toBe('control_host_required');
    expect(createClientMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(emitPlaneLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plane: 'control',
        eventName: 'control_proxy_host_rejected',
      }),
    );
  });

  it('requires a valid control session', async () => {
    createClientMock.mockResolvedValue(createSupabaseSessionMock(null));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      buildRequest('https://control.anu.eco/api/control/core/api/admin/tenants', 'control.anu.eco'),
      routeContext(['core', 'api', 'admin', 'tenants']),
    );

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error.code).toBe('control_session_required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a control-eligible role', async () => {
    createClientMock.mockResolvedValue(createSupabaseSessionMock('participant'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      buildRequest('https://control.anu.eco/api/control/core/api/admin/tenants', 'control.anu.eco'),
      routeContext(['core', 'api', 'admin', 'tenants']),
    );

    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.error.code).toBe('control_role_required');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-allowlisted forwarding paths', async () => {
    createClientMock.mockResolvedValue(createSupabaseSessionMock('platform_admin'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      buildRequest('https://control.anu.eco/api/control/core/api/unknown/path', 'control.anu.eco'),
      routeContext(['core', 'api', 'unknown', 'path']),
    );

    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.error.code).toBe('control_route_not_allowlisted');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards allowlisted requests via server-side privileged token injection', async () => {
    createClientMock.mockResolvedValue(createSupabaseSessionMock('platform_admin', 'public.token'));

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === 'https://core.example.com/auth/control-token') {
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer public.token',
        });
        return new Response(JSON.stringify({ access_token: 'control.token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url === 'https://core.example.com/api/admin/tenants') {
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer control.token',
          'X-Control-Plane-Secret': 'test-control-plane-secret',
          'x-control-proxy-route-family': 'core-admin-tenants',
          'x-control-proxy-target': 'core',
        });
        return new Response(JSON.stringify([{ id: 1, name: 'Sydney Node', slug: 'sydney', status: 'active' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 500 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(
      buildRequest('https://control.anu.eco/api/control/core/api/admin/tenants', 'control.anu.eco'),
      routeContext(['core', 'api', 'admin', 'tenants']),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 1, name: 'Sydney Node', slug: 'sydney', status: 'active' },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
