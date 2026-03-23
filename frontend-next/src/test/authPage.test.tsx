// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthPage from '@/app/auth/page';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const loginMock = vi.fn();
const registerMock = vi.fn();
let currentSearchParams = new URLSearchParams();
let authLoading = false;
let authenticated = false;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    register: registerMock,
    isLoading: authLoading,
    isAuthenticated: authenticated,
  }),
}));

describe('AuthPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    loginMock.mockReset();
    registerMock.mockReset();
    currentSearchParams = new URLSearchParams();
    authLoading = false;
    authenticated = false;
    window.sessionStorage.clear();
  });

  it('returns to the requested route after login', async () => {
    currentSearchParams = new URLSearchParams('returnTo=%2Fcommunity%3Fcompose%3D1');
    loginMock.mockResolvedValueOnce(undefined);

    render(<AuthPage />);

    expect(screen.getByText('How access deepens')).toBeInTheDocument();
    expect(screen.getByText('Witness threshold')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'alpha@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'alpha_public' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('alpha@example.com', 'alpha_public'));
    expect(pushMock).toHaveBeenCalledWith('/community?compose=1');
    expect(screen.getByText(/continue where you left off/i)).toBeInTheDocument();
  });

  it('falls back to the profile route when no return path is provided', async () => {
    loginMock.mockResolvedValueOnce(undefined);

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('member@example.com', 'secret'));
    expect(pushMock).toHaveBeenCalledWith('/profile');
  });

  it('redirects authenticated users away from auth page using the return path', async () => {
    currentSearchParams = new URLSearchParams('returnTo=%2Fruns%2F17');
    authenticated = true;

    render(<AuthPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/runs/17');
    });
  });
});
