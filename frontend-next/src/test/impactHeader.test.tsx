// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImpactHeader from '@/components/impact/ImpactHeader';

describe('ImpactHeader', () => {
  it('renders default tier and streak', () => {
    render(<ImpactHeader />);
    expect(screen.getByText('Community')).toBeTruthy();
    const streakCard = screen.getByText('Streak').closest('div')?.parentElement;
    const streakValue = streakCard?.querySelector('p.text-lg');
    expect(streakValue?.textContent?.replace(/\s+/g, '')).toBe('0mo');
  });

  it('renders provided tier and streak', () => {
    render(<ImpactHeader tier="active" streakMonths={6} />);
    expect(screen.getByText('Active Member')).toBeTruthy();
    const streakCard = screen.getByText('Streak').closest('div')?.parentElement;
    const streakValue = streakCard?.querySelector('p.text-lg');
    expect(streakValue?.textContent?.replace(/\s+/g, '')).toBe('6mo');
  });
});
