// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const apiFetchMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock('@/lib/calendar/icsExport', () => ({
  downloadICS: vi.fn(),
}));

vi.mock('@/ui-system/layout/TenantBrandWrapper', () => ({
  useTenant: () => ({
    calendarMode: 'events',
  }),
}));

vi.mock('@/ui-system/primitives/Card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/ui-system/states/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/ui-system/states/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/ui-system/states/ErrorState', () => ({
  ErrorState: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock('@/ui-system/primitives/StatusBadge', () => ({
  StatusBadge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/calendar/ShiftCard', () => ({
  ShiftCard: () => <div>shift-card</div>,
}));

vi.mock('@/components/calendar/AvailabilityEditor', () => ({
  AvailabilityEditor: () => <div>availability-editor</div>,
}));

import CalendarPage from '@/app/(app)/calendar/page';

describe('CalendarPage', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/calendar/events')) {
        return Promise.resolve([]);
      }

      if (url.includes('/api/calendar/shifts')) {
        return Promise.resolve([]);
      }

      if (url.includes('/api/calendar/availability')) {
        return Promise.resolve([]);
      }

      return Promise.resolve([]);
    });
  });

  it('keeps calendar linked to events, community, organizer, and impact routes', async () => {
    render(<CalendarPage />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());

    expect(screen.getByText('Calendar is the timing layer of the commons')).toBeInTheDocument();
    expect(screen.getByText('How calendar connects to earth-plane work')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /events/i })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('link', { name: /community commons/i })).toHaveAttribute('href', '/community');
    expect(screen.getByRole('link', { name: /impact workspace/i })).toHaveAttribute('href', '/impact');
  });
});
