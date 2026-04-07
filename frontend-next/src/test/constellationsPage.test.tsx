// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const listMock = vi.fn();

vi.mock('@/lib/api/endpoints', () => ({
  constellationsApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

vi.mock('@/components/maps/universe/UniverseScene', () => ({
  UniverseScene: ({
    packet,
    onSelectStarId,
  }: {
    packet?: { title?: string } | null;
    onSelectStarId: (starId: string) => void;
  }) => (
    <div data-testid="constellation-starfield">
      <span>{packet?.title ?? 'No packet'}</span>
      <button type="button" onClick={() => onSelectStarId('constellation-1')}>
        Select constellation
      </button>
    </div>
  ),
}));

import ConstellationsPage from '@/app/(app)/constellations/page';

const createMatchMedia = (matches: boolean): typeof window.matchMedia =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;

describe('ConstellationsPage', () => {
  beforeEach(() => {
    listMock.mockReset();
    window.matchMedia = createMatchMedia(false);
  });

  it('renders the constellation threshold as a celestial route with an explicit list fallback', async () => {
    listMock.mockResolvedValue({
      constellations: [
        {
          id: 1,
          nodeId: 3,
          name: 'North Harbour Weave',
          description: 'A shared coastal coordination pattern.',
          domain: 'governance',
          geoLabel: 'Sydney Harbour',
          active: true,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });

    render(<ConstellationsPage />);

    await waitFor(() => expect(listMock).toHaveBeenCalled());

    expect(screen.getByText('Enter the field of coordination patterns')).toBeInTheDocument();
    expect(await screen.findByTestId('constellation-starfield')).toHaveTextContent('Constellation Field');

    fireEvent.click(screen.getByRole('button', { name: 'Select constellation' }));
    expect(await screen.findByText('Open constellation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(await screen.findByText('North Harbour Weave')).toBeInTheDocument();
  });

  it('auto-falls back to list mode on reduced-motion preference while keeping starfield available', async () => {
    window.matchMedia = createMatchMedia(true);

    listMock.mockResolvedValue({
      constellations: [
        {
          id: 1,
          nodeId: 3,
          name: 'North Harbour Weave',
          description: 'A shared coastal coordination pattern.',
          domain: 'governance',
          geoLabel: 'Sydney Harbour',
          active: true,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });

    render(<ConstellationsPage />);

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(
      await screen.findByText(
        'Reduced-motion preference detected. List mode is active by default, but the starfield threshold remains available.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('North Harbour Weave')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Starfield' }));
    expect(await screen.findByTestId('constellation-starfield')).toHaveTextContent('Constellation Field');
  });
});
