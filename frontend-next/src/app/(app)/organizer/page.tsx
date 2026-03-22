'use client';

import { useEffect, useState } from 'react';
import { api, Article, StoryPost, Action, Event } from '@/lib/api';
import { Star, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [articleData, storyData, actionData, eventData] = await Promise.all([
          api.community.getArticles(),
          api.stories.getAll(1, 20),
          api.actions.getAll(),
          api.events.getAll(),
        ]);
        setArticles([
          ...articleData.news,
          ...articleData.opinion,
          ...articleData.creative,
        ]);
        setStories(storyData.items || []);
        setActions(actionData);
        setEvents(eventData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFeatureArticle = async (articleId: string, featured: boolean) => {
    await api.community.featureArticle(articleId, featured);
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, featured } : a)));
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Delete this article?')) return;
    await api.community.deleteArticle(articleId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
  };

  const handleFeatureStory = async (postId: number, featured: boolean) => {
    await api.stories.feature(postId, featured);
    setStories((prev) => prev.map((s) => (s.id === postId ? { ...s, featured } : s)));
  };

  const handleDeleteStory = async (postId: number) => {
    if (!confirm('Delete this story?')) return;
    await api.stories.delete(postId);
    setStories((prev) => prev.filter((s) => s.id !== postId));
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Delete this action?')) return;
    await api.actions.delete(actionId);
    setActions((prev) => prev.filter((a) => a._id !== actionId));
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    await api.events.delete(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <AnuPageHero
          eyebrow="Operational observatory"
          title="Organizer Console"
          description="Curate posts, stories, actions, and events from a single operational route without dropping the shared ANU shell language."
        >
          <div className="grid gap-3 md:grid-cols-4">
            <AnuHeroMetric label="Articles" value={String(articles.length)} detail="Current community article records." />
            <AnuHeroMetric label="Stories" value={String(stories.length)} detail="Storytelling entries ready for stewardship review." />
            <AnuHeroMetric label="Actions" value={String(actions.length)} detail="Active civic actions in the current console scope." />
            <AnuHeroMetric label="Events" value={String(events.length)} detail="Scheduled events surfaced to organizer workflows." />
          </div>
        </AnuPageHero>

        <section className="grid gap-4 md:grid-cols-3">
          <AnuInstrumentationCard label="Scope" value={tab === 'posts' ? 'Posts & Stories' : 'Actions & Events'} detail="Switch between publishing stewardship and field activity management." tone="signal" />
          <AnuInstrumentationCard label="Search" value={search ? 'Filtered' : 'All titles'} detail={search ? `Current query: ${search}` : 'No search query is currently narrowing the console.'} />
          <AnuInstrumentationCard label="Featured only" value={showFeaturedOnly ? 'On' : 'Off'} detail="Restrict list results to featured community outputs when needed." />
        </section>

        <AnuFilterBar>
          <AnuFilterGroup className="md:flex-[1.1]">
            <AnuFilterInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

        {tab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnuSurfacePanel tone="soft" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Articles</h2>
              <div className="space-y-3">
                {articles
                  .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
                  .filter((a) => (showFeaturedOnly ? a.featured : true))
                  .map((article) => (
                  <div key={article.id} className="p-3 border border-[var(--color-border)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{article.title}</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleFeatureArticle(article.id, !article.featured)}
                          className={`btn-pill text-xs ${article.featured ? 'btn-pill-sage' : 'btn-pill-outline'}`}>
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
                {articles.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No articles.</p>}
              </div>
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="quiet" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Stories</h2>
              <div className="space-y-3">
                {stories
                  .filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
                  .filter((s) => (showFeaturedOnly ? s.featured : true))
                  .map((story) => (
                  <div key={story.id} className="p-3 border border-[var(--color-border)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{story.title}</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleFeatureStory(story.id, !story.featured)}
                          className={`btn-pill text-xs ${story.featured ? 'btn-pill-sage' : 'btn-pill-outline'}`}>
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
                {stories.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No stories.</p>}
              </div>
            </AnuSurfacePanel>
          </div>
        )}

        {tab === 'activities' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnuSurfacePanel tone="soft" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                {actions
                  .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
                  .map((action) => (
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
                {actions.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No actions.</p>}
              </div>
            </AnuSurfacePanel>

            <AnuSurfacePanel tone="quiet" className="p-6">
              <h2 className="text-xl font-semibold mb-4">Events</h2>
              <div className="space-y-3">
                {events
                  .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
                  .map((event) => (
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
                {events.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No events.</p>}
              </div>
            </AnuSurfacePanel>
          </div>
        )}
      </div>
    </div>
  );
}
