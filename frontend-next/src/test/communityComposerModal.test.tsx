// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const storyCreateMock = vi.fn();
const articleCreateMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    stories: {
      create: (payload: unknown) => storyCreateMock(payload),
    },
    community: {
      createArticle: (payload: unknown) => articleCreateMock(payload),
    },
  },
}));

import CommunityComposerModal from '@/app/(app)/community/CommunityComposerModal';

describe('CommunityComposerModal', () => {
  beforeEach(() => {
    storyCreateMock.mockReset();
    articleCreateMock.mockReset();
  });

  it('blocks empty publication attempts with a clear chamber error', async () => {
    render(<CommunityComposerModal open onClose={() => {}} onPublished={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Publish story' }));

    expect(await screen.findByText('Add both a title and content before publishing.')).toBeInTheDocument();
  });

  it('publishes article mode through the community API and returns a gallery post', async () => {
    const onPublished = vi.fn();

    articleCreateMock.mockResolvedValue({
      id: 11,
      title: 'Commons brief',
      content: 'A structured update for the wider public commons.',
      category: 'news',
      createdAt: '2026-03-22T03:00:00.000Z',
      authorPseudonym: 'River Stone',
      authorId: 7,
      likes: 0,
      comments: 0,
      featured: false,
    });

    render(<CommunityComposerModal open onClose={() => {}} onPublished={onPublished} />);

    fireEvent.click(screen.getByRole('button', { name: 'Article' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Commons brief' } });
    fireEvent.change(screen.getByLabelText('Content'), {
      target: { value: 'A structured update for the wider public commons.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish article' }));

    await waitFor(() =>
      expect(articleCreateMock).toHaveBeenCalledWith({
        title: 'Commons brief',
        content: 'A structured update for the wider public commons.',
        category: 'news',
      }),
    );
    await waitFor(() => expect(onPublished).toHaveBeenCalled());
  });
});
