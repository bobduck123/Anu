// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import floraFaunaApi, { FloraFaunaApiError } from '@/lib/api/floraFaunaApi';

describe('floraFaunaApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a structured API error for organizer-only endpoints', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: 'Forbidden',
              code: 'FORBIDDEN',
            },
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    );

    await expect(floraFaunaApi.listRevenueEvents(5)).rejects.toMatchObject<Partial<FloraFaunaApiError>>({
      name: 'FloraFaunaApiError',
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('returns null for missing detail records on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              message: 'Not found',
              code: 'NOT_FOUND',
            },
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    );

    await expect(floraFaunaApi.getChannel('missing-channel')).resolves.toBeNull();
  });

  it('targets the Manara API alias path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ feed: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await floraFaunaApi.getFeed();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/api/manara/feed',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
  });
});
