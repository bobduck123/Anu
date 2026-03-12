// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PoolCards from '@/components/impact/PoolCards';
import type { ReactNode } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('PoolCards', () => {
  it('renders empty state', () => {
    render(<PoolCards pools={[]} />);
    expect(screen.getByText('No pools available yet.')).toBeTruthy();
  });

  it('renders pool data', () => {
    render(
      <PoolCards
        pools={[
          {
            id: 1,
            slug: 'relief',
            name: 'Relief Pool',
            description: 'Support relief',
            category: 'relief',
            target_amount_cents: 20000,
            current_balance_cents: 5000,
            is_active: true,
          },
        ]}
      />
    );
    expect(screen.getByText('Relief Pool')).toBeTruthy();
    expect(screen.getByText('$50')).toBeTruthy();
    expect(screen.getByText('$200')).toBeTruthy();
  });
});
