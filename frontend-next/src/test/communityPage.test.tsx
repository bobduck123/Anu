// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const loadCommunityUniverseDataMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => '/community',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
}));

vi.mock('@/lib/featureFlags', () => ({
  useFeatureFlag: () => true,
}));

vi.mock('@/lib/community/loadCommunityUniverse', () => ({
  loadCommunityUniverseData: (...args: unknown[]) => loadCommunityUniverseDataMock(...args),
}));

vi.mock('@/ui/patterns/draggable-gallery', () => ({
  DraggableGallery: () => <div data-testid="community-gallery">gallery</div>,
}));

vi.mock('@/components/maps/FalakMapViewer', () => ({
  FalakMapViewer: ({ packet }: { packet?: { title?: string } | null }) => (
    <div data-testid="community-viewer">{packet?.title ?? 'No packet'}</div>
  ),
}));

vi.mock('@/app/(app)/community/CommunityComposerModal', () => ({
  default: () => null,
}));

import CommunityPage from '@/app/(app)/community/page';

describe('CommunityPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    loadCommunityUniverseDataMock.mockReset();
  });

  it('keeps the community universe path available in live mode, not only fallback mode', async () => {
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

    render(<CommunityPage />);

    await waitFor(() => expect(loadCommunityUniverseDataMock).toHaveBeenCalled());
    const toggle = await screen.findByRole('button', { name: 'Open community universe' });

    fireEvent.click(toggle);

    expect(await screen.findByTestId('community-viewer')).toHaveTextContent('Manara Community Universe');
    expect(screen.getByRole('button', { name: 'Hide community universe' })).toBeInTheDocument();
  });
});
