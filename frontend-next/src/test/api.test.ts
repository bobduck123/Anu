import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getParticipantAuthHeadersMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getParticipantAuthHeaders: (...args: unknown[]) => getParticipantAuthHeadersMock(...args),
}));

import { api } from '@/lib/api';

const mockFetch = vi.fn();

describe('api client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    getParticipantAuthHeadersMock.mockReset();
    getParticipantAuthHeadersMock.mockResolvedValue({});
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: mockFetch,
    });
    localStorage.clear();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('maps action response fields into app model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          id: 1,
          title: 'Clean the river',
          details: 'Bring gloves',
          instructions: 'Meet at dawn',
          action_tile: 'Cleanup',
          action_type: 'cleanup',
          is_online: false,
          is_global: true,
          latitude: 34.05,
          longitude: -118.25,
          address: '123 River Rd',
          city: 'LA',
          country: 'US',
          start_date: '2026-03-01',
          end_date: '2026-03-02',
          first_milestone: 'Step 1',
          second_milestone: 'Step 2',
          final_milestone: 'Done',
          points_assigned: 50,
          recurrence: 'once',
          user_id: 7,
          completions: 3,
        },
      ]),
    });

    const actions = await api.actions.getAll();

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      _id: '1',
      title: 'Clean the river',
      actionType: 'cleanup',
      isOnline: false,
      isGlobal: true,
      address: '123 River Rd',
      city: 'LA',
      country: 'US',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      pointsAssigned: 50,
      recurrence: 'once',
      ownerId: '7',
      completions: 3,
    });
    expect(actions[0].location?.coordinates).toEqual([-118.25, 34.05]);
  });

  it('surfaces article publish errors instead of creating mock content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'missing' }),
    });

    await expect(api.community.createArticle({
      title: 'New Article',
      content: 'Hello world',
      category: 'news',
    })).rejects.toThrow('missing');
  });

  it('surfaces story publish auth errors instead of creating mock content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(api.stories.create({
      title: 'Field note',
      content: 'A quick update from the node.',
    })).rejects.toThrow('Unauthorized');
  });

  it('fetches and normalizes articles with defaults', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        opinion: [
          {
            id: 2,
            title: 'Opinion',
            content: 'Thoughts',
            category: 'opinion',
          },
        ],
        news: [
          {
            id: 3,
            title: 'News',
            content: 'Update',
            category: 'news',
            author_pseudonym: 'Reporter',
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ],
      }),
    });

    const articles = await api.community.getArticles();

    expect(articles.opinion[0]).toMatchObject({
      id: '2',
      title: 'Opinion',
      authorPseudonym: 'Anonymous',
    });
    expect(articles.news[0]).toMatchObject({
      id: '3',
      authorPseudonym: 'Reporter',
      createdAt: '2026-01-02T00:00:00.000Z',
    });
    expect(articles.creative).toEqual([]);
  });

  it('fetches and normalizes trusted news feed items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          items: [
            {
              id: 'bbc-1',
              title: 'Trusted update',
              summary: 'Verified public-interest coverage.',
              url: 'https://example.com/story',
              source_name: 'BBC News',
              feed_label: 'World',
              homepage: 'https://www.bbc.co.uk/news/10628494',
              published_at: '2026-03-15T00:00:00.000Z',
              image_url: 'https://images.example.com/news.jpg',
            },
          ],
          sources: [
            {
              key: 'bbc-world',
              source_name: 'BBC News',
              feed_label: 'World',
              feed_url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
              homepage: 'https://www.bbc.co.uk/news/10628494',
            },
          ],
          fetched_at: '2026-03-15T00:05:00.000Z',
          stale: false,
        },
      }),
    });

    const feed = await api.community.getTrustedNews(8);

    expect(feed.items[0]).toMatchObject({
      id: 'bbc-1',
      title: 'Trusted update',
      sourceName: 'BBC News',
      feedLabel: 'World',
      publishedAt: '2026-03-15T00:00:00.000Z',
    });
    expect(feed.sources[0]).toMatchObject({
      sourceName: 'BBC News',
      feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    });
    expect(feed.stale).toBe(false);
  });

  it('uses auth headers when completing actions', async () => {
    getParticipantAuthHeadersMock.mockResolvedValueOnce({ Authorization: 'Bearer supabase-token' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, newCompletions: 4 }),
    });

    const result = await api.actions.complete('abc');

    expect(result).toEqual({ success: true, newCompletions: 4 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/complete_action/abc'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer supabase-token',
        }),
      })
    );
    expect(getParticipantAuthHeadersMock).toHaveBeenCalledWith({ allowLegacyTokenFallback: false });
  });

  it('falls back to mock comment when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'error' }),
    });

    const comment = await api.community.addComment('1', 'Hello');

    expect(comment.id).toMatch(/^mock_/);
    expect(comment.content).toBe('Hello');
  });

  it('falls back to mock poll vote when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'error' }),
    });

    const poll = await api.community.votePoll('poll-1', 'A');

    expect(poll).toMatchObject({
      id: 'poll-1',
      options: ['A'],
      votes: { A: 1 },
    });
  });

  it('returns empty marketplace list when API missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'missing' }),
    });

    const products = await api.marketplace.getProducts();

    expect(products).toEqual([]);
  });

  it('surfaces public certification registry errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'registry disabled' }),
    });

    await expect(api.education.getPublicCertifications()).rejects.toThrow('registry disabled');
  });

  it('creates a mock product when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'error' }),
    });

    const product = await api.marketplace.createProduct({
      name: 'Bottle',
      description: 'Reusable',
      price: 12,
      category: 'gear',
      impact: 'less waste',
      inStock: true,
    });

    expect(product.id).toMatch(/^mock_/);
    expect(product.inStock).toBe(true);
  });

  it('auto-approves organizer application when API missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'missing' }),
    });

    const result = await api.organizer.apply({
      organizationName: 'Org',
      organizationType: 'ngo',
      experience: 'some',
      causeFocus: ['health'],
      contactInfo: {},
      references: [],
      motivation: 'help',
    });

    expect(result.autoApproved).toBe(true);
    expect(result.applicationId).toMatch(/^mock_/);
  });

  it('normalizes events from the API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          id: 9,
          title: 'Tree planting',
          description: 'Local park',
          address: '42 Green Way',
          city: 'Portland',
          country: 'US',
          longitude: -122.67,
          latitude: 45.52,
          is_online: false,
          is_global: false,
          date: '2026-04-12',
          time: '10:00',
          venue_id: 3,
          attendees: 12,
          goal: 50,
          points_assigned: 25,
          reminder_week: '1',
          reminder_day: '2',
          reminder_hours: '12',
          user_id: 5,
        },
      ]),
    });

    const events = await api.events.getAll();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: '9',
      title: 'Tree planting',
      venueId: '3',
      ownerId: '5',
      isOnline: false,
      isGlobal: false,
      pointsAssigned: 25,
    });
  });

  it('normalizes attend response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 10,
        title: 'Cleanup',
        description: 'River',
        is_online: true,
        is_global: false,
        date: '2026-05-01',
        time: '09:00',
        venue_id: 4,
        attendees: 20,
        goal: 40,
        points_assigned: 10,
        user_id: 2,
      }),
    });

    const event = await api.events.attend('10');

    expect(event).toMatchObject({
      id: '10',
      title: 'Cleanup',
      isOnline: true,
      venueId: '4',
      ownerId: '2',
    });
  });

  it('falls back to local organizer status when network fails', async () => {
    localStorage.setItem('organizer_applied', 'true');
    mockFetch.mockRejectedValueOnce(new Error('network'));

    const status = await api.organizer.getStatus();

    expect(status).toEqual({
      hasApplied: true,
      isOrganizer: true,
      role: 'organizer',
    });
  });
});
