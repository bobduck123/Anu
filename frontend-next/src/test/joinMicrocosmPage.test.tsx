// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const apiFetchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import JoinMicrocosmPage from '@/app/(app)/community/microcosms/join/page';

describe('JoinMicrocosmPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    apiFetchMock.mockReset();
  });

  it('guides the user through chamber selection and join confirmation', async () => {
    apiFetchMock.mockImplementation((url: string, options?: { method?: string }) => {
      if (url === '/api/hell/microcosms') {
        return Promise.resolve({
          microcosms: [
            {
              id: 2,
              name: 'Northside Gardens',
              description: 'Shared gardens and care work.',
              member_count: 14,
            },
          ],
        });
      }
      if (url === '/api/hell/microcosms/2/join' && options?.method === 'POST') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error(`Unhandled request: ${url}`));
    });

    render(<JoinMicrocosmPage />);

    expect(await screen.findByText('Join a microcosm')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Select' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Join Northside Gardens')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Join microcosm' }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/api/hell/microcosms/2/join', { method: 'POST' }),
    );
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/community/microcosms/2'),
    );
  });

  it('shows a chamber empty state when no microcosms are available', async () => {
    apiFetchMock.mockResolvedValue({ microcosms: [] });

    render(<JoinMicrocosmPage />);

    expect(await screen.findByText('No microcosms available yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Return to community' }));

    expect(pushMock).toHaveBeenCalledWith('/community');
  });
});
