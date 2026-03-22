// @vitest-environment jsdom
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const backMock = vi.fn();
const apiFetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock }),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import MicrocosmDetailPage from '@/app/(app)/community/microcosms/[id]/page';

describe('MicrocosmDetailPage', () => {
  beforeEach(() => {
    backMock.mockReset();
    apiFetchMock.mockReset();
  });

  it('renders the chamber detail view and routes join actions through the live endpoint', async () => {
    apiFetchMock.mockImplementation((url: string, options?: { method?: string }) => {
      if (url === '/api/hell/microcosms/2') {
        return Promise.resolve({
          id: 2,
          name: 'Northside Gardens',
          description: 'Shared gardens and neighborhood care.',
          member_count: 14,
          is_member: false,
          story_count: 6,
          team_count: 3,
        });
      }
      if (url === '/api/hell/microcosms/2/activity') {
        return Promise.resolve({
          activity: [
            {
              type: 'story',
              id: 9,
              title: 'Garden repair day',
              created_at: '2026-03-21T00:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/hell/microcosms/2/join' && options?.method === 'POST') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading route…</div>}>
          <MicrocosmDetailPage params={Promise.resolve({ id: '2' })} />
        </Suspense>,
      );
    });

    expect(await screen.findByText('Microcosm chamber')).toBeInTheDocument();
    expect(await screen.findByText('Northside Gardens')).toBeInTheDocument();
    expect(await screen.findByText('Recent movement')).toBeInTheDocument();
    expect(screen.getByText('Garden repair day')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(backMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Join microcosm' }));
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/api/hell/microcosms/2/join', { method: 'POST' }),
    );
  });
});
