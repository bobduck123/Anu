// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const eventsGetAllMock = vi.fn();
const venuesGetAllMock = vi.fn();

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/lib/api', () => ({
  api: {
    events: {
      getAll: (...args: unknown[]) => eventsGetAllMock(...args),
      attend: vi.fn(),
      create: vi.fn(),
    },
    venues: {
      getAll: (...args: unknown[]) => venuesGetAllMock(...args),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/components/shared/ViewToggle', () => ({
  default: () => <div>view-toggle</div>,
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

import EventsPage from '@/app/(app)/events/page';

describe('EventsPage', () => {
  beforeEach(() => {
    eventsGetAllMock.mockReset();
    venuesGetAllMock.mockReset();
    eventsGetAllMock.mockResolvedValue([
      {
        id: 'event-1',
        title: 'River commons assembly',
        description: 'Open gathering for river restoration planning.',
        city: 'Sydney',
        country: 'Australia',
        date: '2026-03-30',
        time: '18:00:00',
        venueId: '12',
        attendees: 12,
        goal: 30,
        pointsAssigned: 10,
        isOnline: false,
        isGlobal: false,
        ownerId: 'owner-1',
      },
    ]);
    venuesGetAllMock.mockResolvedValue([
      {
        id: 1,
        name: 'Commons Hall',
        address: '12 River St',
        city: 'Sydney',
        country: 'Australia',
        latitude: -33.86,
        longitude: 151.2,
        is_online: false,
        is_global: false,
        user_id: 2,
      },
    ]);
  });

  it('renders the Earth field shell and keeps route bridges visible', async () => {
    render(<EventsPage />);

    await waitFor(() => expect(eventsGetAllMock).toHaveBeenCalled());

    expect(screen.getByText('Ground gatherings and markets on one field.')).toBeInTheDocument();
    expect(screen.getByText('Gatherings cluster across the field as moments of commons activity.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: /community/i })).toHaveAttribute('href', '/community');
    expect(screen.getAllByRole('link', { name: /impact/i }).some((link) => link.getAttribute('href') === '/impact')).toBe(true);
  });

  it('switches into the market layer and exposes the venue detail chamber', async () => {
    render(<EventsPage />);

    await waitFor(() => expect(screen.getByText('River commons assembly')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Markets' }));

    expect(screen.getAllByText('Commons Hall').length).toBeGreaterThan(0);
    expect(screen.getByText('Grounded market')).toBeInTheDocument();
  });
});
