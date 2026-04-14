import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getCoreApiBaseMock, emitPlaneLogMock } = vi.hoisted(() => ({
  getCoreApiBaseMock: vi.fn(),
  emitPlaneLogMock: vi.fn(),
}));

vi.mock('@/lib/runtime', () => ({
  getCoreApiBase: getCoreApiBaseMock,
}));

vi.mock('@/lib/observability/planeLog', () => ({
  emitPlaneLog: emitPlaneLogMock,
}));

import { fetchPublicArchiveSummaries } from '@/lib/api/publicArchive';

describe('public archive logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCoreApiBaseMock.mockReturnValue('https://core.example');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits public-plane warning log for HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), {
          status: 503,
          headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-archive-1' },
        }),
      ),
    );

    const result = await fetchPublicArchiveSummaries({ page: 2, pageSize: 12, recordType: 'public-trust-report' });

    expect(result.degradedHonesty.isDegraded).toBe(true);
    expect(emitPlaneLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plane: 'public',
        eventName: 'public_archive_fetch_http_error',
        level: 'warn',
      }),
    );
  });
});
