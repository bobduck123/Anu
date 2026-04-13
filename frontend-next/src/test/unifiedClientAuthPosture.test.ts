// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { buildParticipantRequestHeadersMock } = vi.hoisted(() => ({
  buildParticipantRequestHeadersMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  buildParticipantRequestHeaders: (...args: unknown[]) => buildParticipantRequestHeadersMock(...args),
}));

import { impactMembershipApi } from '@/lib/api/impactApi';
import floraFaunaApi from '@/lib/api/floraFaunaApi';

describe('unified client auth posture', () => {
  beforeEach(() => {
    buildParticipantRequestHeadersMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses canonical participant auth injection for impact-service participant calls', async () => {
    buildParticipantRequestHeadersMock.mockResolvedValue({
      Authorization: 'Bearer participant.token',
      'Content-Type': 'application/json',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ subscription: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await impactMembershipApi.getStatus();

    expect(buildParticipantRequestHeadersMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeContentType: true }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/api/memberships/status',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer participant.token',
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/api/control/');
  });

  it('does not inject participant auth for public memetics feed calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ feed: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await floraFaunaApi.getFeed();

    expect(buildParticipantRequestHeadersMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/api/manara/feed',
      expect.objectContaining({
        cache: 'no-store',
      }),
    );
  });

  it('uses canonical participant auth injection for organizer memetics calls', async () => {
    buildParticipantRequestHeadersMock.mockResolvedValue({
      Authorization: 'Bearer participant.token',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await floraFaunaApi.listRevenueEvents(5);

    expect(buildParticipantRequestHeadersMock).toHaveBeenCalledWith(
      expect.objectContaining({ includeContentType: false }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5003/api/manara/revenue-events?limit=5',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer participant.token',
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/api/control/');
  });
});
