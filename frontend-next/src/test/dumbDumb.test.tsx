// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DumbDumbHubScreen } from '@/components/dumb-dumb/DumbDumbHubScreen';
import { DumbDumbListScreen } from '@/components/dumb-dumb/DumbDumbListScreen';
import { DumbDumbWishlistScreen } from '@/components/dumb-dumb/DumbDumbWishlistScreen';
import { brand } from '@/lib/brand';
import { demoHubPayload, demoLists } from '@/lib/dumbDumb';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: '1', username: 'demo', role: 'organizer' },
  }),
}));

describe('Dumb Dumb UI', () => {
  it('renders the front-page testing surface', () => {
    render(<DumbDumbHubScreen data={demoHubPayload} />);

    expect(screen.getByRole('heading', { name: 'Dumb Dumb Mode' })).toBeInTheDocument();
    expect(screen.getByText(/Transparent satire for mutual aid/i)).toBeInTheDocument();
    expect(screen.getByText(/Parody wrapper, real mutual aid destination/i)).toBeInTheDocument();
    expect(screen.getAllByText('Gold-Plated Emotional Support Spoon').length).toBeGreaterThan(0);
  });

  it('renders a public list with explicit impact mapping', () => {
    render(<DumbDumbListScreen list={demoLists[0]} />);

    expect(screen.getByRole('heading', { name: demoLists[0].title })).toBeInTheDocument();
    expect(screen.getAllByText('Actually funds').length).toBeGreaterThan(0);
    expect(screen.getByText('1 week transport')).toBeInTheDocument();
    expect(screen.getByText(/Transparent satire disclaimer/i)).toBeInTheDocument();
  });

  it('renders the discreet wishlist share surface', () => {
    render(<DumbDumbWishlistScreen list={demoLists[0]} />);

    expect(screen.getByText(brand.wishlistHostLabel)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open platform list/i })).toBeInTheDocument();
    expect(screen.getByText(/Real destination/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Gold-Plated Emotional/i).length).toBeGreaterThan(0);
  });
});
