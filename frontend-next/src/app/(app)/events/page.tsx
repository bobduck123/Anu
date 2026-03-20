'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api, Event, Venue } from '@/lib/api';
import { Plus, MapPin, Building2 } from 'lucide-react';
import Link from 'next/link';
import ViewToggle, { ViewMode } from '@/components/shared/ViewToggle';
import dynamicImport from 'next/dynamic';
import { BentoGrid, BentoHero, BentoStat, BentoStyles } from '@/ui/patterns/chromatic-bento';
import styles from './EventsFloating.module.css';

export const dynamic = 'force-dynamic';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });
const CreateEventModal = dynamicImport(() => import('@/components/shared/CreateEventModal'), { ssr: false });
const CreateVenueModal = dynamicImport(() => import('@/components/shared/CreateVenueModal'), { ssr: false });

type TabMode = 'events' | 'venues';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tabMode, setTabMode] = useState<TabMode>('events');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const getBadge = (event: Event) => {
    if (event.trendLabel) return event.trendLabel;
    const dateValue = event.date ? new Date(event.date) : null;
    if (dateValue) {
      const daysLeft = Math.ceil((dateValue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3) return 'Closing Soon';
      if (daysLeft <= 7) return 'New';
    }
    return 'Trending';
  };

  useEffect(() => {
    try {
      setIsOrganizer(localStorage.getItem('organizer_applied') === 'true');
    } catch {
      setIsOrganizer(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const params: { city?: string; date?: string } = {};
      if (city) params.city = city;
      if (date) params.date = date;
      const [eventsData, venuesData] = await Promise.all([api.events.getAll(params), api.venues.getAll()]);
      setEvents(eventsData);
      setFilteredEvents(eventsData);
      setVenues(venuesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setNotice('Could not load events and venues from live services.');
      setEvents([]);
      setFilteredEvents([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [city, date]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAttend = async (eventId: string) => {
    try {
      const updated = await api.events.attend(eventId);
      setEvents((current) => current.map((event) => (event.id === eventId ? updated : event)));
      setFilteredEvents((current) => current.map((event) => (event.id === eventId ? updated : event)));
      setNotice('Attendance registered.');
    } catch (error) {
      console.error('Failed to attend event:', error);
      setNotice('Could not register attendance right now.');
    }
  };

  const handleCreateEvent = async (data: Record<string, unknown>) => {
    try {
      await api.events.create(data as Parameters<typeof api.events.create>[0]);
      await loadData();
      setNotice('Event created successfully.');
    } catch (error) {
      console.error('Failed to create event:', error);
      setNotice('Could not create event right now.');
    }
  };

  const handleCreateVenue = async (data: Record<string, unknown>) => {
    try {
      await api.venues.create(data as Parameters<typeof api.venues.create>[0]);
      await loadData();
      setNotice('Venue created successfully.');
    } catch (error) {
      console.error('Failed to create venue:', error);
      setNotice('Could not create venue right now.');
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm('Delete this venue?')) return;
    try {
      await api.venues.delete(id);
      setVenues((current) => current.filter((venue) => String(venue.id) !== id));
      setNotice('Venue deleted.');
    } catch (error) {
      console.error('Failed to delete venue:', error);
      setNotice('Could not delete venue right now.');
    }
  };

  const eventMarkers = filteredEvents
    .filter((event) => event.latitude && event.longitude)
    .map((event) => ({
      id: event.id,
      lat: event.latitude!,
      lng: event.longitude!,
      title: event.title,
      popup: `<strong>${event.title}</strong><br/>${new Date(event.date).toLocaleDateString()}<br/>${event.attendees}/${event.goal} attendees`,
      color: 'institutional' as const,
    }));

  const venueMarkers = venues
    .filter((venue) => venue.latitude && venue.longitude)
    .map((venue) => ({
      id: String(venue.id),
      lat: venue.latitude,
      lng: venue.longitude,
      title: venue.name,
      popup: `<strong>${venue.name}</strong><br/>${venue.address}`,
      color: 'accent' as const,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]" />
      </div>
    );
  }

  return (
    <div className={styles.pageRoot}>
      <BentoStyles />
      <div className={styles.surface}>
        <header className={styles.header}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">Events + Venues System</p>
            <h1 className={styles.heading}>Community Events</h1>
            <p className={styles.subhead}>Discover events, monitor venues, and coordinate operations from a unified ANU surface.</p>
            <div className={styles.metrics}>
              <span>{filteredEvents.length} events active</span>
              <span>{venues.length} venues indexed</span>
            </div>
            {notice ? <div className={styles.notice}>{notice}</div> : null}
          </div>
        </header>

        <div className="px-4 pb-5 pt-4 sm:px-6">
          <BentoGrid columns={12} rowHeight={80} gap={12} className="mb-8">
            <BentoHero
              title="Events + Venues"
              subtitle="Discover and attend local environmental events"
              metric={`${filteredEvents.length}`}
              metricLabel="events"
              colSpan={7}
              rowSpan={2}
            />
            <BentoStat label="Events" value={filteredEvents.length} colSpan={5} rowSpan={1} stagger={1} />
            <BentoStat label="Venues" value={venues.length} colSpan={5} rowSpan={1} stagger={2} />
          </BentoGrid>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex gap-2">
              <button
                onClick={() => setTabMode('events')}
                className={`btn-pill text-sm flex items-center gap-1.5 ${tabMode === 'events' ? 'btn-pill-primary' : 'btn-pill-outline'}`}
              >
                <MapPin className="w-4 h-4" /> Events
              </button>
              <button
                onClick={() => setTabMode('venues')}
                className={`btn-pill text-sm flex items-center gap-1.5 ${tabMode === 'venues' ? 'btn-pill-primary' : 'btn-pill-outline'}`}
              >
                <Building2 className="w-4 h-4" /> Venues
              </button>
            </div>

            <div className="flex items-center gap-4">
              <ViewToggle current={viewMode} onChange={setViewMode} modes={['list', 'map']} />
              {isOrganizer ? (
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateEvent(true)} className="btn-pill btn-pill-primary text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Event
                  </button>
                  <button onClick={() => setShowCreateVenue(true)} className="btn-pill btn-pill-accent text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Venue
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {tabMode === 'events' ? (
            <div className="card-civic mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Enter city name"
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-institutional)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-institutional)]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setCity('');
                      setDate('');
                    }}
                    className="w-full btn-pill btn-pill-outline"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {viewMode === 'map' ? (
            <div className="mb-8">
              <MapView markers={tabMode === 'events' ? eventMarkers : [...eventMarkers, ...venueMarkers]} height="500px" />
            </div>
          ) : null}

          {viewMode === 'list' && tabMode === 'events' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="card-civic"
                >
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                    {event.title}
                  </h3>
                  <p className="text-[var(--color-muted-foreground)] mb-4 line-clamp-3 text-sm">{event.description}</p>

                  <div className="space-y-1.5 mb-4 text-sm text-[var(--color-muted-foreground)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-institutional)]">Date:</span>
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                      <span className="ml-2">{event.time}</span>
                    </div>
                    {event.city ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-institutional)]">Location:</span>
                        <span>
                          {event.city}, {event.country}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-institutional)]">Attendees:</span>
                      <span className="font-mono-data">
                        {event.attendees}/{event.goal}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {event.isOnline ? (
                        <span className="px-2 py-0.5 bg-[var(--color-institutional-light)] text-[var(--color-institutional)] rounded-full text-xs">
                          Online
                        </span>
                      ) : null}
                      {event.isGlobal ? (
                        <span className="px-2 py-0.5 bg-[var(--color-sage-light)] text-[var(--color-forest)] rounded-full text-xs">
                          Global
                        </span>
                      ) : null}
                      <span className="px-2 py-0.5 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-full text-xs">
                        {getBadge(event)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAttend(event.id)}
                      disabled={event.attendees >= event.goal}
                      className={`btn-pill text-sm ${
                        event.attendees >= event.goal
                          ? 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)] cursor-not-allowed'
                          : 'btn-pill-primary'
                      }`}
                    >
                      {event.attendees >= event.goal ? 'Full' : 'Attend'}
                    </button>
                  </div>
                  <div className="mt-3">
                    <Link href={`/events/${event.id}`} className="btn-pill btn-pill-outline text-sm inline-block">
                      View Details
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}

          {viewMode === 'list' && tabMode === 'venues' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue, index) => (
                <motion.div
                  key={venue.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="card-civic"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                      {venue.name}
                    </h3>
                    <Building2 className="w-5 h-5 text-[var(--color-accent)] flex-shrink-0" />
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-2">{venue.address}</p>
                  <p className="text-sm text-[var(--color-institutional)]">
                    {venue.city}, {venue.country}
                  </p>
                  {isOrganizer ? (
                    <button onClick={() => handleDeleteVenue(String(venue.id))} className="mt-3 text-xs text-[var(--color-danger)] hover:underline">
                      Delete Venue
                    </button>
                  ) : null}
                </motion.div>
              ))}
              {venues.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-[var(--color-muted-foreground)]">No venues yet.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {filteredEvents.length === 0 && tabMode === 'events' && viewMode === 'list' ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-muted-foreground)] text-lg">No events found</p>
            </div>
          ) : null}
        </div>
      </div>

      {showCreateEvent ? <CreateEventModal onClose={() => setShowCreateEvent(false)} onSubmit={handleCreateEvent} /> : null}
      {showCreateVenue ? <CreateVenueModal onClose={() => setShowCreateVenue(false)} onSubmit={handleCreateVenue} /> : null}
    </div>
  );
}
