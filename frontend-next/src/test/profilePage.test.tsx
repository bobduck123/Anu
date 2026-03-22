// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const meMock = vi.fn();
const todosMock = vi.fn();
const notificationsMock = vi.fn();
const challengesMock = vi.fn();
const storiesMock = vi.fn();
const articlesMock = vi.fn();
const organizerStatusMock = vi.fn();
const organizerApplyMock = vi.fn();
const timebankListMock = vi.fn();
const burnoutMeMock = vi.fn();

let desktopEnabled = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 7,
      username: 'river-stone',
      pseudonym: 'River Stone',
      role: 'member',
      points: 64,
      level: 3,
      nodeId: null,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/featureFlags', () => ({
  useFeatureFlag: () => desktopEnabled,
}));

vi.mock('@/lib/api', () => ({
  api: {
    users: { me: () => meMock() },
    todos: { getAll: () => todosMock() },
    notifications: { getAll: () => notificationsMock() },
    engagement: { getChallenges: () => challengesMock() },
    stories: { getAll: (...args: unknown[]) => storiesMock(...args) },
    community: { getArticles: () => articlesMock() },
    organizer: {
      getStatus: () => organizerStatusMock(),
      apply: (payload: unknown) => organizerApplyMock(payload),
    },
  },
}));

vi.mock('@/lib/api/endpoints', () => ({
  timebankApi: { list: () => timebankListMock() },
  burnoutApi: { me: () => burnoutMeMock() },
}));

vi.mock('@/ui/patterns/profile-desktop', () => ({
  DesktopCanvas: () => <div data-testid="desktop-canvas">desktop</div>,
}));

import ProfilePage from '@/app/(app)/profile/page';

describe('ProfilePage', () => {
  beforeEach(() => {
    desktopEnabled = false;
    window.localStorage.clear();
    meMock.mockReset();
    todosMock.mockReset();
    notificationsMock.mockReset();
    challengesMock.mockReset();
    storiesMock.mockReset();
    articlesMock.mockReset();
    organizerStatusMock.mockReset();
    organizerApplyMock.mockReset();
    timebankListMock.mockReset();
    burnoutMeMock.mockReset();

    meMock.mockResolvedValue({
      id: 7,
      username: 'river-stone',
      pseudonym: 'River Stone',
      role: 'member',
      points: 64,
      level: 3,
      points_to_level_up: 100,
      node_id: null,
    });
    todosMock.mockResolvedValue([
      {
        id: 1,
        action_id: 11,
        is_completed: false,
        title: 'Water the courtyard beds',
        details: 'Coordinate the next watering round.',
        instructions: '',
        action_type: 'care',
        is_online: false,
        is_global: false,
        points_assigned: 8,
      },
      {
        id: 2,
        action_id: 12,
        is_completed: true,
        title: 'Archive the community notes',
        details: 'Done yesterday.',
        instructions: '',
        action_type: 'archive',
        is_online: true,
        is_global: false,
        points_assigned: 5,
      },
    ]);
    notificationsMock.mockResolvedValue([
      { id: 1, user_id: 7, message: 'A new local brief is ready.', is_read: false, timestamp: '2026-03-22T03:00:00.000Z' },
      { id: 2, user_id: 7, message: 'Team check-in complete.', is_read: true, timestamp: '2026-03-21T03:00:00.000Z' },
    ]);
    challengesMock.mockResolvedValue([
      { id: 9, title: 'Three acts of care', description: 'Complete three local tasks.', metric_type: 'count', target: 3, progress: 1, reward_points: 30, status: 'in_progress' },
    ]);
    storiesMock.mockResolvedValue({ items: [] });
    articlesMock.mockResolvedValue({ news: [], opinion: [], creative: [] });
    organizerStatusMock.mockResolvedValue({ hasApplied: false, isOrganizer: false, role: 'participant' });
    organizerApplyMock.mockResolvedValue({ autoApproved: false });
    timebankListMock.mockResolvedValue({ entries: [{ id: 1, user_id: 7, activity_type: 'Stewardship', hours: 2.5, occurred_at: '2026-03-20T00:00:00.000Z', verification_status: 'verified' }] });
    burnoutMeMock.mockResolvedValue({ score: 18, risk: 'low' });
  });

  it('renders the chambered cockpit and exposes task and organizer modules', async () => {
    render(<ProfilePage />);

    expect(await screen.findByText('Profile cockpit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks (1)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tasks (1)' }));
    expect(await screen.findByText('Water the courtyard beds')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Organizer' }));
    expect(await screen.findByPlaceholderText('Organization name')).toBeInTheDocument();
  });

  it('opens the experimental desktop only as a secondary mode', async () => {
    desktopEnabled = true;

    render(<ProfilePage />);

    expect(await screen.findByText('Profile cockpit')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /open experimental desktop/i }));

    await waitFor(() => expect(screen.getByTestId('desktop-canvas')).toBeInTheDocument());
    expect(screen.getByText(/classic cockpit remains primary/i)).toBeInTheDocument();
  });
});
