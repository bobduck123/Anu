// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getParticipantAuthHeadersMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getParticipantAuthHeaders: (...args: unknown[]) => getParticipantAuthHeadersMock(...args),
}));

import { downloadICS } from '@/lib/calendar/icsExport';

describe('downloadICS', () => {
  const fetchMock = vi.fn();
  const createObjectURLMock = vi.fn();
  const revokeObjectURLMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    getParticipantAuthHeadersMock.mockReset();
    createObjectURLMock.mockReset();
    revokeObjectURLMock.mockReset();

    getParticipantAuthHeadersMock.mockResolvedValue({ Authorization: 'Bearer supabase-token' });
    createObjectURLMock.mockReturnValue('blob:calendar');

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
  });

  it('uses canonical participant auth headers for ICS export requests', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('BEGIN:VCALENDAR', {
        status: 200,
        headers: { 'Content-Type': 'text/calendar' },
      }),
    );

    await downloadICS('2026-04-01', '2026-04-30');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/calendar/export.ics?start=2026-04-01&end=2026-04-30'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer supabase-token' },
      }),
    );
    expect(getParticipantAuthHeadersMock).toHaveBeenCalledWith({ allowLegacyTokenFallback: false });
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:calendar');
  });
});
