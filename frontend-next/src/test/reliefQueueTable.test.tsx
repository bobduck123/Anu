// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReliefQueueTable from '@/components/admin/ReliefQueueTable';
import type { ReactNode } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('ReliefQueueTable', () => {
  it('renders empty state', () => {
    render(<ReliefQueueTable items={[]} onVote={() => {}} />);
    expect(screen.getByText('No requests in queue.')).toBeTruthy();
  });

  it('renders queue rows', () => {
    render(
      <ReliefQueueTable
        items={[
          {
            id: 12,
            amount_requested_cents: 12500,
            purpose: 'rent',
            urgency: 'high',
            submitted_at: new Date().toISOString(),
            status: 'submitted',
          },
        ]}
        onVote={() => {}}
      />
    );
    expect(screen.getByText('#12')).toBeTruthy();
    expect(screen.getByText('rent')).toBeTruthy();
    expect(screen.getByText('high')).toBeTruthy();
    expect(screen.getByText('$125')).toBeTruthy();
  });
});
