'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Star, Trash2 } from 'lucide-react';
import { api, Article, StoryPost, Action, Event } from '@/lib/api';
import {
  AnuControlButton,
  AnuFilterBar,
  AnuFilterGroup,
  AnuFilterInput,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

type Tab = 'posts' | 'activities';

export default function OrganizerConsole() {
  const [tab, setTab] = useState<Tab>('posts');
  const [articles, setArticles] = useState<Article[]>([]);
  const [stories, setStories] = useState<StoryPost[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [surfaceNotice, setSurfaceNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setSurfaceError(null);
      setSurfaceNotice(null);

      const [articleResult, storyResult, actionResult, eventResult] = await Promise.allSettled([
        api.community.getArticles(),
        api.stories.getAll(1, 20),
        api.actions.getAll(),
        api.events.getAll(),
      ]);

      if (!active) {
        return;
      }

      let degraded = false;

      if (articleResult.status === 'fulfilled') {
        setArticles([
          ...articleResult.value.news,
          ...articleResult.value.opinion,
          ...articleResult.value.creative,
        ]);
      } else {
        degraded = true;
        setArticles([]);
      }

      if (storyResult.status === 'fulfilled') {
        setStories(storyResult.value.items || []);
      } else {
        degraded = true;
        setStories([]);
      }

      if (actionResult.status === 'fulfilled') {
        setActions(actionResult.value);
      } else {
        degraded = true;
        setActions([]);
      }

      if (eventResult.status === 'fulfilled') {
        setEvents(eventResult.value);
      } else {
        degraded = true;
        setEvents([]);
      }

      if (degraded) {
        setSurfaceError('Live organizer feeds are unavailable in this environment.');
        setSurfaceNotice('Working now: available records remain reviewable while organizer feeds recover.');
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filteredArticles = useMemo(
    () => articles
      .filter((article) => article.title.toLowerCase().includes(search.toLowerCase()))
      .filter((article) => (showFeaturedOnly ? article.featured : true)),
    [articles, search, showFeaturedOnly],
  );

  const filteredStories = useMemo(
    () => stories
      .filter((story) => story.title.toLowerCase().includes(search.toLowerCase()))
      .filter((story) => (showFeaturedOnly ? story.featured : true)),
    [search, showFeaturedOnly, stories],
  );

  const filteredActions = useMemo(
    () => actions.filter((action) => action.title.toLowerCase().includes(search.toLowerCase())),
    [actions, search],
  );

  const filteredEvents = useMemo(
    () => events.filter((event) => event.title.toLowerCase().includes(search.toLowerCase())),
    [events, search],
  );

  const handleFeatureArticle = async (articleId: string, featured: boolean) => {
    try {
      await api.community.featureArticle(articleId, featured);
      setArticles((prev) => prev.map((article) => (article.id === articleId ? { ...article, featured } : article)));
      setSurfaceNotice(featured ? 'Article marked as featured.' : 'Article removed from featured set.');
    } catch {
      setSurfaceNotice('Working now: article feature update could not reach live service.');
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await api.community.deleteArticle(articleId);
      setArticles((prev) => prev.filter((article) => article.id !== articleId));
    } catch {
      setSurfaceNotice('Working now: article delete could not reach live service.');
    }
  };

  const handleFeatureStory = async (postId: number, featured: boolean) => {
    try {
      await api.stories.feature(postId, featured);
      setStories((prev) => prev.map((story) => (story.id === postId ? { ...story, featured } : story)));
      setSurfaceNotice(featured ? 'Story marked as featured.' : 'Story removed from featured set.');
    } catch {
      setSurfaceNotice('Working now: story feature update could not reach live service.');
    }
  };

  const handleDeleteStory = async (postId: number) => {
    if (!confirm('Delete this story?')) return;
    try {
      await api.stories.delete(postId);
      setStories((prev) => prev.filter((story) => story.id !== postId));
    } catch {
      setSurfaceNotice('Working now: story delete could not reach live service.');
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Delete this action?')) return;
    try {
      await api.actions.delete(actionId);
      setActions((prev) => prev.filter((action) => action._id !== actionId));
    } catch {
      setSurfaceNotice('Working now: action delete could not reach live service.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.events.delete(eventId);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
    } catch {
      setSurfaceNotice('Working now: event delete could not reach live service.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)] mx-auto" />
          <p className="text-sm text-[color:rgba(246,212,203,0.8)]">Loading organizer console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <div className="flex justify-end">
          <HoverBubble title="Console focus" align="right">
            Keep this route practical: scan metrics, filter quickly, then take the smallest required moderation action.
          </HoverBubble>
        </div>

        <AnuPageHero
          eyebrow="Operational observatory"
          title="Organizer console"
          description="Review posts, stories, actions, and events from one route."
        >
          <div className="grid gap-3 md:grid-cols-4">
            <AnuHeroMetric label="Articles" value={String(articles.length)} detail="Community article records." />
            <AnuHeroMetric label="Stories" value={String(stories.length)} detail="Story submissions in scope." />
            <AnuHeroMetric label="Actions" value={String(actions.length)} detail="Current action records." />
            <AnuHeroMetric label="Events" value={String(events.length)} detail="Scheduled organizer events." />
          </div>
        </AnuPageHero>

        {surfaceError || surfaceNotice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="space-y-2 min-w-0">
                {surfaceError ? <p className="text-sm text-[var(--color-foreground)]">{surfaceError}</p> : null}
                {surfaceNotice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{surfaceNotice}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href="/organizer/on-ramp" className="btn-pill btn-pill-outline text-xs">
                    Organizer path
                  </Link>
                  <Link href="/actions" className="btn-pill btn-pill-outline text-xs">
                    Open actions
                  </Link>
                  <Link href="/events" className="btn-pill btn-pill-outline text-xs">
                    Open events
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <AnuInstrumentationCard label="Scope" value={tab === 'posts' ? 'Posts & stories' : 'Actions & events'} detail="Switch between content and activity review." tone="signal" />
          <AnuInstrumentationCard label="Search" value={search ? 'Filtered' : 'All titles'} detail={search ? `Current query: ${search}` : 'No query is currently applied.'} />
          <AnuInstrumentationCard label="Featured" value={showFeaturedOnly ? 'On' : 'Off'} detail="Restrict list results to featured records." />
        </section>

        <AnuFilterBar>
          <AnuFilterGroup className="md:flex-[1.1]">
            <AnuFilterInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles..."
              className="w-full md:max-w-xs"
            />
            <AnuControlButton
              tone={showFeaturedOnly ? 'active' : 'default'}
              onClick={() => setShowFeaturedOnly((current) => !current)}
              iconLeft={Star}
            >
              Featured only
            </AnuControlButton>
          </AnuFilterGroup>

          <AnuFilterGroup className="justify-end md:flex-[0.9]">
            <AnuControlButton tone={tab === 'posts' ? 'active' : 'default'} onClick={() => setTab('posts')}>
              Posts & Stories
            </AnuControlButton>
            <AnuControlButton tone={tab === 'activities' ? 'active' : 'default'} onClick={() => setTab('activities')}>
              Actions & Events
            </AnuControlButton>
          </AnuFilterGroup>
        </AnuFilterBar>

        <details className="card-civic">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">Show advanced control notes</summary>
          <ul className="mt-3 space-y-1 text-sm text-[color:rgba(246,212,203,0.82)]">
            <li>Use featured mode when you need quick curation reviews.</li>
            <li>Search is title-only to keep filtering predictable.</li>
            <li>Delete actions call live services and may enter fallback continuity when offline.</li>
          </ul>
        </details>

        {tab === 'posts' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnuSurfacePanel tone="soft" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Articles</h2>
              <div className="space-y-3">
                {filteredArticles.map((article) => (
                  <div key={article.id} className="p-3 border border-[var(--color-border)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{article.title}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFeatureArticle(article.id, !article.featured)}
                          className={`btn-pill text-xs ${article.featured ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                        >
                          <Star className="w-3 h-3" /> {article.featured ? 'Featured' : 'Feature'}
                        </button>
                        <button onClick={() => handleDeleteArticle(article.id)} className="btn-pill btn-pill-outline text-xs">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{article.category}</p>
                  </div>
                ))}
                {filteredArticles.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No matching articles.</p> : null}
              </div>
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="quiet" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Stories</h2>
              <div className="space-y-3">
                {filteredStories.map((story) => (
                  <div key={story.id} className="p-3 border border-[var(--color-border)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{story.title}</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFeatureStory(story.id, !story.featured)}
                          className={`btn-pill text-xs ${story.featured ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                        >
                          <Star className="w-3 h-3" /> {story.featured ? 'Featured' : 'Feature'}
                        </button>
                        <button onClick={() => handleDeleteStory(story.id)} className="btn-pill btn-pill-outline text-xs">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{story.author_pseudonym}</p>
                  </div>
                ))}
                {filteredStories.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No matching stories.</p> : null}
              </div>
            </AnuSurfacePanel>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnuSurfacePanel tone="soft" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                {filteredActions.map((action) => (
                  <div key={action._id} className="p-3 border border-[var(--color-border)] rounded-lg flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{action.title}</h3>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{action.pointsAssigned} pts</p>
                    </div>
                    <button onClick={() => handleDeleteAction(action._id)} className="btn-pill btn-pill-outline text-xs">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {filteredActions.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No matching actions.</p> : null}
              </div>
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="quiet" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Events</h2>
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-3 border border-[var(--color-border)] rounded-lg flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDeleteEvent(event.id)} className="btn-pill btn-pill-outline text-xs">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {filteredEvents.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">No matching events.</p> : null}
              </div>
            </AnuSurfacePanel>
          </div>
        )}
      </div>
    </div>
  );
}
