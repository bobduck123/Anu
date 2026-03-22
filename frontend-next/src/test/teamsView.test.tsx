// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const teamListMock = vi.fn();
const microcosmsMock = vi.fn();
const membersMock = vi.fn();
const challengesMock = vi.fn();
const actionsMock = vi.fn();
const streakMock = vi.fn();
const joinMock = vi.fn();
const createMock = vi.fn();
const createActionMock = vi.fn();
const completeActionMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    teams: {
      list: (microcosmId?: number) => teamListMock(microcosmId),
      members: (teamId: number) => membersMock(teamId),
      challenges: (teamId: number) => challengesMock(teamId),
      actions: (teamId: number) => actionsMock(teamId),
      join: (teamId: number) => joinMock(teamId),
      create: (payload: unknown) => createMock(payload),
      createAction: (teamId: number, payload: unknown) => createActionMock(teamId, payload),
      completeAction: (teamId: number, actionId: number) => completeActionMock(teamId, actionId),
    },
    community: {
      getMicrocosms: () => microcosmsMock(),
    },
    engagement: {
      getCollectiveStreaks: (_scope: string, teamId: number) => streakMock(teamId),
    },
  },
}));

import TeamsView from '@/components/teams/TeamsView';

describe('TeamsView', () => {
  beforeEach(() => {
    teamListMock.mockReset();
    microcosmsMock.mockReset();
    membersMock.mockReset();
    challengesMock.mockReset();
    actionsMock.mockReset();
    streakMock.mockReset();
    joinMock.mockReset();
    createMock.mockReset();
    createActionMock.mockReset();
    completeActionMock.mockReset();

    teamListMock.mockResolvedValue([
      {
        id: 7,
        name: 'Care Crew',
        description: 'Local maintenance and support team.',
        microcosm_id: 2,
        microcosm_name: 'Northside Gardens',
        created_by: 3,
        member_count: 3,
        is_member: false,
      },
    ]);
    microcosmsMock.mockResolvedValue([
      { id: '2', name: 'Northside Gardens', description: 'Shared gardens.' },
    ]);
    membersMock.mockResolvedValue([
      { id: 1, pseudonym: 'River Stone', role: 'steward' },
    ]);
    challengesMock.mockResolvedValue([
      {
        id: 1,
        title: 'Repair path lights',
        description: 'Restore safe night access.',
        metric_type: 'count',
        target: 3,
        progress: 1,
        reward_points: 20,
        status: 'in_progress',
      },
    ]);
    actionsMock.mockResolvedValue([
      {
        id: 11,
        title: 'Replace damaged light',
        description: 'Start with the west path.',
        points: 10,
        created_by: 3,
        completed_count: 1,
      },
    ]);
    streakMock.mockResolvedValue({
      scope: 'team',
      scope_id: 7,
      scope_name: 'Care Crew',
      current_streak: 4,
      best_streak: 5,
      weekly_stats: { is_active: true },
      reward_points_granted: 0,
      reward_milestones: { next: null, completed: [] },
    });
    joinMock.mockResolvedValue(true);
    createMock.mockResolvedValue({
      id: 9,
      name: 'New Chamber',
      description: 'New team',
      created_by: 3,
      member_count: 1,
      is_member: true,
    });
    createActionMock.mockResolvedValue({
      id: 22,
      title: 'Draft rota',
      description: 'Shared schedule',
      points: 6,
      created_by: 3,
      completed_count: 0,
    });
    completeActionMock.mockResolvedValue(true);
  });

  it('renders the team chamber view and supports joining a team', async () => {
    render(<TeamsView />);

    expect(await screen.findByText('Team chambers')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Care Crew' })).toBeInTheDocument();
    expect(await screen.findByText('Repair path lights')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => expect(joinMock).toHaveBeenCalledWith(7));
  });
});
