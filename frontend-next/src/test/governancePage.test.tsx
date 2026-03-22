// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GovernanceIndexPage from '@/app/(app)/governance/page';

describe('GovernanceIndexPage', () => {
  it('organizes governance routes by observatory function', () => {
    render(<GovernanceIndexPage />);

    expect(screen.getByText('Read models, pressure, and institutional shape.')).toBeInTheDocument();
    expect(screen.getByText('Enter by institutional function')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /systemic mode/i })).toHaveAttribute('href', '/governance/systemic');
    expect(screen.getByText('Formal institutional instruments')).toBeInTheDocument();
    expect(screen.getByText('Federation and institutional shape')).toBeInTheDocument();
  });
});
