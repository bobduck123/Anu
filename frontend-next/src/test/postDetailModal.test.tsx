// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { PostDetailModal } from '@/ui/patterns/draggable-gallery/PostDetailModal';

describe('PostDetailModal', () => {
  it('renders the commons detail grammar and closes on command', () => {
    const onClose = vi.fn();

    render(
      <PostDetailModal
        post={{
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
        }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Mutual aid round-up')).toBeInTheDocument();
    expect(screen.getByText('Northside Gardens')).toBeInTheDocument();
    expect(screen.getByText('Community trace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
