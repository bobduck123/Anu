// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { getFallbackEducationMap } from '@/lib/maps/fallbackMapData';

const listEducationMapsMock = vi.fn();
const getEducationMapMock = vi.fn();
const loadCommunityUniverseDataMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/educationMaps', () => ({
  listEducationMaps: (...args: unknown[]) => listEducationMapsMock(...args),
  getEducationMap: (...args: unknown[]) => getEducationMapMock(...args),
  shouldUseEducationMapsFallback: () => false,
  getEducationMapsFallbackMessage: () => 'Fallback packet active.',
}));

vi.mock('@/lib/community/loadCommunityUniverse', () => ({
  loadCommunityUniverseData: (...args: unknown[]) => loadCommunityUniverseDataMock(...args),
}));

vi.mock('@/components/maps/FalakMapViewer', () => ({
  FalakMapViewer: ({
    packet,
    headerActions,
  }: {
    packet?: { title?: string } | null;
    headerActions?: ReactNode;
  }) => (
    <div>
      <div data-testid="universe-viewer">{packet?.title ?? 'No packet'}</div>
      <div>{headerActions}</div>
    </div>
  ),
}));

import UniversePage from '@/app/(app)/universe/page';

describe('UniversePage', () => {
  beforeEach(() => {
    listEducationMapsMock.mockReset();
    getEducationMapMock.mockReset();
    loadCommunityUniverseDataMock.mockReset();
  });

  it('merges community traces into the shared universe and exposes the community domain selector', async () => {
    const map = getFallbackEducationMap('neural-civic-governance');
    expect(map).toBeTruthy();

    listEducationMapsMock.mockResolvedValue([map!.definition]);
    getEducationMapMock.mockResolvedValue(map);
    loadCommunityUniverseDataMock.mockResolvedValue({
      posts: [
        {
          id: 'story-1',
          title: 'Mutual aid round-up',
          author: {
            id: 1,
            username: 'river-stone',
            pseudonym: 'River Stone',
            role: 'storyteller',
          },
          content: 'Local stewards delivered support packs across the neighborhood.',
          coverImage: 'https://example.com/story.jpg',
          layout: { imagePosition: 'top', imageSize: 50 },
          likes: 12,
          comments: 4,
          shares: 3,
          tags: ['mutual-aid', 'community'],
          createdAt: '2026-03-20T00:00:00.000Z',
          microcosm: 'Northside Gardens',
        },
      ],
      warnings: [],
      loadError: null,
      degraded: false,
      trustedNewsMeta: {
        count: 1,
        stale: false,
        sourceNames: ['BBC News'],
      },
    });

    render(<UniversePage />);

    await waitFor(() => expect(listEducationMapsMock).toHaveBeenCalled());
    expect(await screen.findByTestId('universe-viewer')).toHaveTextContent('Manara Shared Universe');
    expect(screen.getByRole('option', { name: 'Manara Community Universe' })).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'community' } });

    await waitFor(() => expect(screen.getByTestId('universe-viewer')).toHaveTextContent('Manara Community Universe'));
  });
});
