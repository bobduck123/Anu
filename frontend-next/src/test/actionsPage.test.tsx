// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const actionsGetAllMock = vi.fn();
const actionsCompleteMock = vi.fn();
const todosAddActionMock = vi.fn();

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/lib/runtime', () => ({
  getCoreApiBase: () => 'https://core.example',
}));

vi.mock('@/lib/api', () => ({
  api: {
    actions: {
      getAll: (...args: unknown[]) => actionsGetAllMock(...args),
      complete: (...args: unknown[]) => actionsCompleteMock(...args),
    },
    todos: {
      addAction: (...args: unknown[]) => todosAddActionMock(...args),
    },
  },
}));

vi.mock('@/ui-system/anu/surfacePrimitives', async () => {
  const actual = await vi.importActual<typeof import('@/ui-system/anu/surfacePrimitives')>(
    '@/ui-system/anu/surfacePrimitives',
  );

  return {
    ...actual,
    AnuActionLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
  };
});

import ActionsPage from '@/app/(app)/actions/page';

describe('ActionsPage', () => {
  beforeEach(() => {
    actionsGetAllMock.mockReset();
    actionsCompleteMock.mockReset();
    todosAddActionMock.mockReset();
    actionsCompleteMock.mockResolvedValue({ success: true });
    todosAddActionMock.mockResolvedValue(undefined);
    actionsGetAllMock.mockResolvedValue([
      {
        _id: 'action-1',
        title: 'Seed the ridge',
        details: 'Local tree planting effort.',
        instructions: 'Bring gloves and water.',
        actionType: 'environmental',
        isOnline: false,
        isGlobal: false,
        startDate: '2026-03-20',
        endDate: '2026-03-27',
        milestones: { first: 'Brief', second: 'Plant', final: 'Report' },
        pointsAssigned: 25,
        recurrence: 'weekly',
        ownerId: 'owner-1',
        completions: 8,
        city: 'Sydney',
        country: 'Australia',
      },
      {
        _id: 'action-2',
        title: 'Route relief parcels',
        details: 'Coordinate parcel routing for support kits.',
        instructions: 'Match requests to nearby hubs.',
        actionType: 'community',
        isOnline: true,
        isGlobal: true,
        startDate: '2026-03-22',
        endDate: '2026-03-29',
        milestones: {},
        pointsAssigned: 18,
        recurrence: 'none',
        ownerId: 'owner-2',
        completions: 3,
      },
    ]);
  });

  it('renders the Earth field shell and exposes the route sibling pill', async () => {
    render(<ActionsPage />);

    await waitFor(() => expect(actionsGetAllMock).toHaveBeenCalled());

    expect(screen.getByText('The Commons')).toBeInTheDocument();
    expect(screen.getByText('Move to gatherings')).toBeInTheDocument();
    expect(screen.getByText('Trace outcomes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('link', { name: 'Impact' })).toHaveAttribute('href', '/impact');
  });

  it('switches to list backup and keeps the selected action actionable', async () => {
    render(<ActionsPage />);

    await waitFor(() => expect(screen.getByText('Seed the ridge')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'List' }));

    expect(screen.getByText('List backup')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Complete' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Add to to-do' }).length).toBeGreaterThan(0);
  });
});
