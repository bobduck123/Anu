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

vi.mock('@/components/maps/universe/UniverseScene', () => ({
  UniverseScene: ({
    packet,
    onSelectStarId,
  }: {
    packet?: { title?: string } | null;
    onSelectStarId: (starId: string) => void;
  }) => (
    <div data-testid="community-starfield">
      <span>{packet?.title ?? 'No packet'}</span>
      <button type="button" onClick={() => onSelectStarId('community-story-1')}>
        Select node
      </button>
    </div>
  ),
}));

vi.mock('@/app/(app)/community/CommunityComposerModal', () => ({
  default: () => null,
}));

import CommunityPage from '@/app/(app)/community/page';

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

describe('CommunityPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    loadCommunityUniverseDataMock.mockReset();
    window.matchMedia = createMatchMedia(false);
  });

  it('uses the celestial field as the primary community surface and keeps the gallery as a backup path', async () => {
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
    expect((await screen.findAllByText('Live commons')).length).toBeGreaterThan(0);
    expect(screen.getByText('1 public traces visible')).toBeInTheDocument();
    expect(screen.getByText('1 trusted signals')).toBeInTheDocument();
    expect(screen.getByText('How to read this commons surface')).toBeInTheDocument();
    expect(screen.getByText('Enter the starfield')).toBeInTheDocument();
    expect(screen.queryByTestId('community-gallery')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enter the starfield' }));

    expect(await screen.findByTestId('community-starfield')).toHaveTextContent('Manara Community Universe');

    fireEvent.click(screen.getByRole('button', { name: 'Select node' }));
    expect(await screen.findByText('Open related gallery')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open related gallery' }));

    expect(await screen.findByTestId('community-gallery')).toBeInTheDocument();
  });

  it('auto-falls back to the 2D backup on reduced-motion preference while allowing starfield re-entry', async () => {
    window.matchMedia = createMatchMedia(true);

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
    expect(
      await screen.findByText(
        'Reduced-motion preference detected. The 2D gallery is active by default, but the celestial field remains available.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByTestId('community-gallery')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Starfield' }));
    expect(await screen.findByTestId('community-starfield')).toHaveTextContent('Manara Community Universe');
  });
});
