// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DocsPage from '@/app/(public)/docs/page';

describe('DocsPage', () => {
  it('presents docs as an operations library instead of a bare link grid', () => {
    render(<DocsPage />);

    expect(screen.getByText('Read the institution before you operate it.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open transparency/i })).toHaveAttribute('href', '/transparency');
    expect(screen.getByText('Trust routes')).toBeInTheDocument();
    expect(screen.getByText('Governance and system instruments')).toBeInTheDocument();
    expect(screen.getByText('Truth before escalation')).toBeInTheDocument();
  });
});
