'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import ViewToggle, { ViewMode } from '@/components/shared/ViewToggle';
import { api, Action, Event, RecommendationResult, DiscoverFeed } from '@/lib/api';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { BentoGrid, BentoCell, BentoHero, BentoStat, BentoList, BentoStyles } from '@/ui/patterns/chromatic-bento';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });
const CalendarView = dynamicImport(() => import('@/components/shared/CalendarView'), { ssr: false });

type Mode = 'actions' | 'events';
type FilterMode = 'all' | 'online' | 'local';

const discoverInputClass =
  'w-full rounded-xl border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(246,212,203,0.06)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[color:rgba(246,212,203,0.62)]';

function detailHref(item: Action | Event): string {
  return '_id' in item ? `/actions/${item._id}` : `/events/${item.id}`;
}

export default function DiscoverPage() {
  const [mode, setMode] = useState<Mode>('actions');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [actions, setActions] = useState<Action[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult<Action | Event> | null>(null);
  const [feed, setFeed] = useState<DiscoverFeed | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setNotice(null);
      setDegraded(false);

      const [feedResult, actionResult, eventResult] = await Promise.allSettled([
        api.engagement.getDiscoverFeed(),
        api.actions.getAll(),
        api.events.getAll(),
      ]);

      if (!active) {
        return;
      }

      const feedData = feedResult.status === 'fulfilled' ? feedResult.value : null;
      setFeed(feedData);

      const fallbackActions = feedData?.top_actions || [];
      const fallbackEvents = feedData?.upcoming_events || [];

      const nextActions = actionResult.status === 'fulfilled' ? actionResult.value : fallbackActions;
      const nextEvents = eventResult.status === 'fulfilled' ? eventResult.value : fallbackEvents;

      setActions(nextActions);
      setEvents(nextEvents);

      const hasLiveIssue =
        feedResult.status === 'rejected' ||
        actionResult.status === 'rejected' ||
        eventResult.status === 'rejected';

      setDegraded(hasLiveIssue);

      if (hasLiveIssue) {
        setNotice(
          'Live discovery feeds are partially unavailable. Working now: action/event browsing still runs with available sources while discovery sync recovers.',
        );
      } else if (nextActions.length < 1 && nextEvents.length < 1) {
        setNotice(
          'No published discover items are available yet. Explore community, education, and transparency while listings are prepared.',
        );
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadRecs = async () => {
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } catch {
        lat = undefined;
        lng = undefined;
      }

      try {
        const recs = await api.engagement.getRecommendations({ type: mode, limit: 6, lat, lng });
        if (active) {
          setRecommendations(recs);
        }
      } catch {
        if (!active) {
          return;
        }
        const fallbackItems = mode === 'actions' ? (feed?.top_actions || []) : (feed?.upcoming_events || []);
        setRecommendations({ type: mode, items: fallbackItems });
      }
    };

    void loadRecs();

    return () => {
      active = false;
    };
  }, [mode, feed]);

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (filter === 'online' && !action.isOnline) return false;
      if (filter === 'local' && (action.isOnline || action.isGlobal)) return false;
      if (query && !`${action.title} ${action.details}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [actions, filter, query]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filter === 'online' && !event.isOnline) return false;
      if (filter === 'local' && (event.isOnline || event.isGlobal)) return false;
      if (query && !`${event.title} ${event.description}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (date && !event.date.startsWith(date)) return false;
      return true;
    });
  }, [events, filter, query, date]);

  const mapMarkers = (mode === 'actions' ? filteredActions : filteredEvents)
    .map((item) => {
      if ('location' in item && item.location?.coordinates) {
        return {
          id: item._id,
          lat: item.location.coordinates[1],
          lng: item.location.coordinates[0],
          title: item.title,
          popup: `<strong>${item.title}</strong>`,
          color: 'sage' as const,
        };
      }
      if ('latitude' in item && item.latitude && item.longitude) {
        return {
          id: item.id,
          lat: item.latitude,
          lng: item.longitude,
          title: item.title,
          popup: `<strong>${item.title}</strong>`,
          color: 'institutional' as const,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; lat: number; lng: number; title: string; popup: string; color: 'sage' | 'institutional' | 'accent' }>;

  const calendarEvents = (mode === 'actions' ? filteredActions : filteredEvents).map((item) => {
    if ('startDate' in item) {
      return {
        id: item._id,
        title: `${item.title} (${item.pointsAssigned}pts)`,
        start: new Date(item.startDate),
        end: new Date(item.endDate),
        color: 'var(--color-sage)',
      };
    }
    return {
      id: item.id,
      title: item.title,
      start: new Date(item.date),
      end: new Date(item.date),
      color: 'var(--color-institutional)',
    };
  });

  const visibleItems = mode === 'actions' ? filteredActions : filteredEvents;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl font-semibold mb-3 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Discover
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)] text-lg">
            Explore actions and events with a unified map, list, and calendar.
          </p>
        </motion.div>

        {notice ? (
          <div
            className={`mb-8 rounded-2xl border p-4 ${
              degraded
                ? 'border-[color:rgba(224,177,21,0.32)] bg-[color:rgba(224,177,21,0.12)]'
                : 'border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(246,212,203,0.06)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.88)]">{notice}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AnuActionLink href="/community" tone="secondary">Open community</AnuActionLink>
                  <AnuActionLink href="/education" tone="ghost">Open education</AnuActionLink>
                  <AnuActionLink href="/transparency" tone="ghost">Open transparency</AnuActionLink>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="card-civic mb-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {(['actions', 'events'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`btn-pill text-sm ${mode === item ? 'btn-pill-primary' : 'btn-pill-outline'}`}
                >
                  {item === 'actions' ? 'Actions' : 'Events'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['all', 'online', 'local'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`btn-pill text-sm ${filter === item ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                >
                  {item === 'all' ? 'All' : item === 'online' ? 'Online' : 'Local'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title or description"
                className={`${discoverInputClass} md:w-64`}
              />
              {mode === 'events' ? (
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={discoverInputClass}
                />
              ) : null}
              <ViewToggle current={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>

        <BentoStyles />
        <BentoGrid columns={12} rowHeight={110} gap={12} className="mb-10">
          <BentoHero
            title="Discover"
            subtitle="Your personalized hub for community actions, events, and stories."
            metric={String((filteredActions.length || 0) + (filteredEvents.length || 0))}
            metricLabel="items found"
            colSpan={7}
            rowSpan={2}
          />

          <BentoStat label="Actions" value={filteredActions.length} colSpan={5} rowSpan={1} stagger={1} />
          <BentoStat label="Events" value={filteredEvents.length} colSpan={5} rowSpan={1} stagger={2} />

          {recommendations?.items?.length ? (
            recommendations.items.slice(0, 3).map((item, index) => (
              <BentoCell key={'_id' in item ? item._id : item.id} colSpan={4} rowSpan={2} stagger={3 + index}>
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)] opacity-70">Recommended</span>
                    <h3 className="font-semibold mt-1">{item.title}</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-3 mt-1">
                      {'details' in item ? item.details : item.description}
                    </p>
                  </div>
                  <Link href={detailHref(item)} className="btn-pill btn-pill-outline text-sm mt-3 self-start">
                    View
                  </Link>
                </div>
              </BentoCell>
            ))
          ) : (
            <BentoCell colSpan={12} rowSpan={1} stagger={3}>
              <p className="text-[var(--color-muted-foreground)] text-sm text-center">
                {degraded ? 'Recommendations are in fallback mode until live discovery sync recovers.' : 'No recommendations yet.'}
              </p>
            </BentoCell>
          )}

          {feed ? (
            <>
              <BentoList
                title="Active Microcosms"
                items={feed.active_microcosms.slice(0, 4).map((microcosm) => ({ label: microcosm.name, value: microcosm.description?.slice(0, 30) }))}
                colSpan={4}
                rowSpan={2}
                stagger={6}
              />
              <BentoList
                title="Highlighted Stories"
                items={feed.highlighted_stories.slice(0, 4).map((story) => ({ label: story.title }))}
                colSpan={4}
                rowSpan={2}
                stagger={7}
              />
              <BentoList
                title="Insights & Articles"
                items={feed.highlighted_articles.slice(0, 4).map((article) => ({ label: article.title }))}
                colSpan={4}
                rowSpan={2}
                stagger={8}
              />
            </>
          ) : null}
        </BentoGrid>

        {viewMode === 'map' ? (
          <div className="mb-8">
            <MapView markers={mapMarkers} height="520px" />
          </div>
        ) : null}

        {viewMode === 'calendar' ? (
          <div className="mb-8 card-civic">
            <CalendarView events={calendarEvents} height="600px" />
          </div>
        ) : null}

        {viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleItems.map((item, index) => (
              <motion.div
                key={'_id' in item ? item._id : item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
                className="card-civic"
              >
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-3 mb-4">
                  {'details' in item ? item.details : item.description}
                </p>
                {'pointsAssigned' in item ? (
                  <div className="text-sm font-mono-data text-[var(--color-institutional)] mb-3">
                    {item.pointsAssigned} pts
                  </div>
                ) : null}
                <Link href={detailHref(item)} className="btn-pill btn-pill-outline text-sm">
                  View Details
                </Link>
              </motion.div>
            ))}
          </div>
        ) : null}

        {visibleItems.length < 1 ? (
          <div className="text-center py-12 text-[var(--color-muted-foreground)]">
            Nothing matches your filters yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
