// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const getMock = vi.fn();
const confirmMock = vi.fn();
const actionsMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('@/lib/api/onboarding', () => ({
  onboardingApi: {
    get: () => getMock(),
    confirm: (...args: unknown[]) => confirmMock(...args),
  },
}));
vi.mock('@/lib/api', () => ({
  api: { actions: { getAll: () => actionsMock() } },
}));

import OnboardingPage from '@/app/(app)/onboarding/page';

const initial = {
  interests: [],
  joined_microcosms: [],
  microcosms: [{ id: 2, name: 'First Garden', description: 'Local care' }],
  complete: false,
};
const completed = {
  ...initial,
  interests: ['Community Care'],
  joined_microcosms: [{ id: 2, name: 'First Garden' }],
  complete: true,
};

async function chooseMembership() {
  render(<OnboardingPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Community Care' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: /First Garden/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('ANU onboarding page', () => {
  beforeEach(() => {
    pushMock.mockReset();
    getMock.mockReset();
    confirmMock.mockReset();
    actionsMock.mockReset();
    getMock.mockResolvedValue(initial);
    actionsMock.mockResolvedValue([]);
    window.localStorage.clear();
  });

  it('confirms membership before navigation and never sets a local completion flag', async () => {
    confirmMock.mockResolvedValue(completed);
    await chooseMembership();
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm membership & explore actions' }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(['Community Care'], 2));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/actions'));
    expect(window.localStorage.getItem('onboarding_complete')).toBeNull();
  });

  it('keeps choices and offers retry when confirmation fails', async () => {
    confirmMock.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(completed);
    await chooseMembership();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm membership & explore actions' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Membership could not be confirmed');
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm membership & explore actions' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/actions'));
    expect(confirmMock).toHaveBeenCalledTimes(2);
  });

  it('reads completed membership on another device without posting again', async () => {
    getMock.mockResolvedValue(completed);
    render(<OnboardingPage />);
    expect(await screen.findByText('Your interests and membership are saved to your account.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Explore actions' }));
    expect(pushMock).toHaveBeenCalledWith('/actions');
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('recovers when the confirmation response is lost after a server commit', async () => {
    getMock.mockResolvedValueOnce(initial).mockResolvedValueOnce(completed);
    confirmMock.mockRejectedValue(new Error('connection lost'));
    await chooseMembership();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm membership & explore actions' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/actions'));
  });

  it('does not present a completion path if the account cannot load', async () => {
    getMock.mockRejectedValue(new Error('unauthorized'));
    render(<OnboardingPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('community account could not be loaded');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth');
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
