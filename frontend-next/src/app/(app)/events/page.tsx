'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamicImport from 'next/dynamic';
import {
  AlertCircle,
  Compass,
  HeartHandshake,
  List,
  Map,
  MapPin,
  Plus,
  RefreshCw,
  Store,
  TentTree,
  Users,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { api, Event, Venue } from '@/lib/api';
import { buildAuthHref } from '@/lib/auth/returnTo';
import { useAuth } from '@/contexts/AuthContext';
import {
  AnuActionLink,
  AnuChip,
  AnuControlButton,
  AnuControlLink,
  AnuFilterBar,
  AnuFilterGroup,
  AnuFilterInput,
  AnuInstrumentationCard,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { EarthFieldShell } from '@/ui-system/realms/earth/EarthFieldShell';
import { EarthNavPill } from '@/ui-system/realms/earth/EarthNavPill';
import { EarthObjectMarker } from '@/ui-system/realms/earth/EarthObjectMarker';
import { EarthRisingPanel } from '@/ui-system/realms/earth/EarthRisingPanel';

export const dynamic = 'force-dynamic';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });
const CreateEventModal = dynamicImport(() => import('@/components/shared/CreateEventModal'), { ssr: false });
const CreateVenueModal = dynamicImport(() => import('@/components/shared/CreateVenueModal'), { ssr: false });
const EarthTerrainBackdrop = dynamicImport(
  () => import('@/ui-system/realms/earth/EarthTerrainBackdrop').then((module) => module.EarthTerrainBackdrop),
  { ssr: false },
);

type EventViewMode = 'field' | 'list' | 'map';
type TabMode = 'events' | 'venues';

const EVENT_FIELD_POSITIONS = [
  { top: '18%', left: '18%' },
  { top: '24%', left: '49%' },
  { top: '26%', left: '80%' },
  { top: '52%', left: '24%' },
  { top: '60%', left: '58%' },
  { top: '72%', left: '82%' },
  { top: '76%', left: '16%' },
] as const;

const VENUE_FIELD_POSITIONS = [
  { top: '22%', left: '24%' },
  { top: '18%', left: '70%' },
  { top: '46%', left: '48%' },
  { top: '68%', left: '22%' },
  { top: '72%', left: '76%' },
] as const;

function getBadge(event: Event) {
  if (event.trendLabel) return event.trendLabel;

  const dateValue = event.date ? new Date(event.date) : null;
  if (dateValue) {
    const daysLeft = Math.ceil((dateValue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return 'Closing soon';
    if (daysLeft <= 7) return 'New';
  }

  return 'Trending';
}

function eventMeta(event: Event) {
  const date = new Date(event.date);
  return `${date.toLocaleDateString()} / ${event.time}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [viewMode, setViewMode] = useState<EventViewMode>('field');
  const [tabMode, setTabMode] = useState<TabMode>('events');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authHref = useMemo(() => buildAuthHref('/events'), []);

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
      setVenues(venuesData);
    } catch (error) {
      console.error('Failed to load events and venues:', error);
      setNotice('Could not load live events and venues. Operational backups remain available.');
      setEvents([]);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, [city, date]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (tabMode === 'events') {
      if (events.length === 0) {
        setSelectedEventId(null);
        return;
      }

      const stillVisible = events.some((event) => event.id === selectedEventId);
      if (!stillVisible) {
        setSelectedEventId(events[0]?.id ?? null);
      }
      return;
    }

    if (venues.length === 0) {
      setSelectedVenueId(null);
      return;
    }

    const stillVisible = venues.some((venue) => String(venue.id) === selectedVenueId);
    if (!stillVisible) {
      setSelectedVenueId(String(venues[0]?.id ?? ''));
    }
  }, [events, venues, selectedEventId, selectedVenueId, tabMode]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const selectedVenue = useMemo(
    () => venues.find((venue) => String(venue.id) === selectedVenueId) ?? null,
    [venues, selectedVenueId],
  );

  const handleAttend = useCallback(async (eventId: string) => {
    try {
      const updated = await api.events.attend(eventId);
      setEvents((current) => current.map((event) => (event.id === eventId ? updated : event)));
      setNotice('Attendance registered.');
    } catch (error) {
      console.error('Failed to attend event:', error);
      setNotice('Could not register attendance right now.');
    }
  }, []);

  const handleCreateEvent = useCallback(async (data: Record<string, unknown>) => {
    try {
      await api.events.create(data as Parameters<typeof api.events.create>[0]);
      await loadData();
      setNotice('Event created successfully.');
    } catch (error) {
      console.error('Failed to create event:', error);
      setNotice('Could not create event right now.');
    }
  }, [loadData]);

  const handleCreateVenue = useCallback(async (data: Record<string, unknown>) => {
    try {
      await api.venues.create(data as Parameters<typeof api.venues.create>[0]);
      await loadData();
      setNotice('Venue created successfully.');
    } catch (error) {
      console.error('Failed to create venue:', error);
      setNotice('Could not create venue right now.');
    }
  }, [loadData]);

  const handleDeleteVenue = useCallback(async (id: string) => {
    if (!window.confirm('Delete this venue?')) {
      return;
    }

    try {
      await api.venues.delete(id);
      setVenues((current) => current.filter((venue) => String(venue.id) !== id));
      setNotice('Venue deleted.');
    } catch (error) {
      console.error('Failed to delete venue:', error);
      setNotice('Could not delete venue right now.');
    }
  }, []);

  const totalAttendance = useMemo(
    () => events.reduce((sum, event) => sum + (event.attendees || 0), 0),
    [events],
  );
  const isLiveEventSyncUnavailable = Boolean(notice) && events.length === 0 && venues.length === 0;

  const eventMarkers = useMemo(
    () =>
      events
        .filter((event) => event.latitude && event.longitude)
        .map((event) => ({
          id: event.id,
          lat: event.latitude!,
          lng: event.longitude!,
          title: event.title,
          popup: `<strong>${event.title}</strong><br/>${new Date(event.date).toLocaleDateString()}<br/>${event.attendees}/${event.goal} attendees`,
          color: 'institutional' as const,
        })),
    [events],
  );

  const venueMarkers = useMemo(
    () =>
      venues
        .filter((venue) => venue.latitude && venue.longitude)
        .map((venue) => ({
          id: String(venue.id),
          lat: venue.latitude,
          lng: venue.longitude,
          title: venue.name,
          popup: `<strong>${venue.name}</strong><br/>${venue.address}`,
          color: 'accent' as const,
        })),
    [venues],
  );

  const terrainMarkers = useMemo(
    () =>
      (tabMode === 'events' ? eventMarkers : venueMarkers).map((marker) => ({
        lat: marker.lat,
        lng: marker.lng,
      })),
    [eventMarkers, tabMode, venueMarkers],
  );

  const fieldMarkers = (
    <div className="relative h-full w-full">
      {terrainMarkers.length > 0 ? <EarthTerrainBackdrop markers={terrainMarkers} /> : null}
      {tabMode === 'events' ? (
        events.length > 0 ? (
          events.slice(0, EVENT_FIELD_POSITIONS.length).map((event, index) => (
            <EarthObjectMarker
              key={event.id}
              kind="gathering"
              title={event.title}
              summary={event.description}
              meta={eventMeta(event)}
              badges={[
                `${event.attendees}/${event.goal} attending`,
                getBadge(event),
                event.isOnline ? 'online' : event.isGlobal ? 'global' : 'local',
              ]}
              active={selectedEventId === event.id}
              style={EVENT_FIELD_POSITIONS[index]}
              onSelect={() => {
                setSelectedEventId(event.id);
                setViewMode('field');
              }}
            />
          ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="max-w-xl rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-6 py-8 backdrop-blur-md">
              <p className="text-lg text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                No gatherings match the current route pass.
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.78)]">
                {isLiveEventSyncUnavailable
                  ? 'Live gatherings are unavailable. Continue through actions, relief, or impact while event sync recovers.'
                  : 'Adjust the city or date filters to surface a different gathering on the field.'}
              </p>
              {isLiveEventSyncUnavailable ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <AnuControlLink href="/actions" tone="default">Open actions</AnuControlLink>
                  <AnuControlLink href="/relief" tone="default">Open relief</AnuControlLink>
                  <AnuControlLink href="/impact" tone="default">Open impact</AnuControlLink>
                </div>
              ) : null}
            </div>
          </div>
        )
      ) : venues.length > 0 ? (
        venues.slice(0, VENUE_FIELD_POSITIONS.length).map((venue, index) => (
          <EarthObjectMarker
            key={venue.id}
            kind="market"
            title={venue.name}
            summary={venue.address}
            meta={`${venue.city}, ${venue.country}`}
            badges={['Venue network', venue.is_online ? 'online' : 'grounded']}
            active={selectedVenueId === String(venue.id)}
            style={VENUE_FIELD_POSITIONS[index]}
            onSelect={() => {
              setSelectedVenueId(String(venue.id));
              setViewMode('field');
            }}
          />
        ))
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="max-w-xl rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-6 py-8 backdrop-blur-md">
            <p className="text-lg text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              No markets are indexed yet.
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.78)]">
              {isLiveEventSyncUnavailable
                ? 'Live venue indexing is unavailable. Continue through actions, relief, or impact while service recovers.'
                : 'Venue creation remains available as an operational backup.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const selectedDetailPanel = tabMode === 'events' && selectedEvent ? (
    <EarthRisingPanel
      eyebrow="Grounded gathering"
      title={selectedEvent.title}
      summary={<p>{selectedEvent.description}</p>}
      badges={
        <>
          <AnuChip tone="accent" icon={Users}>
            {selectedEvent.attendees}/{selectedEvent.goal} attending
          </AnuChip>
          <AnuChip tone="muted" icon={MapPin}>
            {selectedEvent.city ? `${selectedEvent.city}, ${selectedEvent.country}` : 'Location pending'}
          </AnuChip>
        </>
      }
      primary={
        <div className="grid gap-4 md:grid-cols-2">
          <AnuInstrumentationCard
            label="Gathering window"
            value={eventMeta(selectedEvent)}
            detail={selectedEvent.address || 'Address not published yet.'}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Attendance"
            value={`${selectedEvent.attendees}/${selectedEvent.goal}`}
            detail={selectedEvent.isOnline ? 'Online gathering' : selectedEvent.isGlobal ? 'Global gathering' : 'Local gathering'}
            tone={selectedEvent.attendees >= selectedEvent.goal ? 'warning' : 'steady'}
          />
        </div>
      }
      secondary={
        <AnuSurfacePanel tone="quiet" className="px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Field notes</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
            <p>Badge: {getBadge(selectedEvent)}</p>
            <p>Venue id: {selectedEvent.venueId}</p>
            <p>Points assigned: {selectedEvent.pointsAssigned}</p>
          </div>
        </AnuSurfacePanel>
      }
      footer={
        <div className="flex flex-wrap gap-3">
          <Link href={`/events/${selectedEvent.id}`} className="anu-earth-top-link">
            Open full event record
          </Link>
          <AnuControlButton
            tone={selectedEvent.attendees >= selectedEvent.goal ? 'warning' : 'active'}
            onClick={() => void handleAttend(selectedEvent.id)}
            disabled={selectedEvent.attendees >= selectedEvent.goal}
          >
            {selectedEvent.attendees >= selectedEvent.goal ? 'Event full' : 'Attend'}
          </AnuControlButton>
        </div>
      }
    />
  ) : tabMode === 'venues' && selectedVenue ? (
    <EarthRisingPanel
      eyebrow="Grounded market"
      title={selectedVenue.name}
      summary={<p>{selectedVenue.address}</p>}
      badges={
        <>
          <AnuChip tone="accent" icon={Store}>
            {selectedVenue.city}
          </AnuChip>
          <AnuChip tone="muted" icon={MapPin}>
            {selectedVenue.country}
          </AnuChip>
        </>
      }
      primary={
        <AnuInstrumentationCard
          label="Venue locality"
          value={`${selectedVenue.city}, ${selectedVenue.country}`}
          detail={selectedVenue.is_global ? 'Global venue' : selectedVenue.is_online ? 'Online venue' : 'Grounded venue'}
          tone="signal"
        />
      }
      secondary={
        <AnuSurfacePanel tone="quiet" className="px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Field notes</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
            <p>Address: {selectedVenue.address}</p>
            <p>Coordinates: {selectedVenue.latitude}, {selectedVenue.longitude}</p>
          </div>
        </AnuSurfacePanel>
      }
      footer={
        isOrganizer ? (
          <div className="flex flex-wrap gap-3">
            <AnuControlButton tone="warning" iconLeft={TentTree} onClick={() => void handleDeleteVenue(String(selectedVenue.id))}>
              Delete venue
            </AnuControlButton>
          </div>
        ) : null
      }
    />
  ) : null;

  const utilityView =
    viewMode === 'map' ? (
      <AnuSurfacePanel tone="soft" className="px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Map backup</p>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
          Geographic backup remains available when the field is not the best operational surface.
        </p>
        <div className="mt-5">
          <MapView markers={tabMode === 'events' ? eventMarkers : venueMarkers} height="500px" />
        </div>
      </AnuSurfacePanel>
    ) : viewMode === 'list' ? (
      <AnuSurfacePanel tone="soft" className="px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">List backup</p>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
              Utility list mode remains available for direct scanning and straightforward operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnuChip tone="muted">{events.length} events</AnuChip>
            <AnuChip tone="muted">{venues.length} venues</AnuChip>
          </div>
        </div>

        {tabMode === 'events' ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {events.length > 0 ? (
              events.map((event) => (
                <AnuSurfacePanel key={event.id} tone="quiet" className="px-4 py-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">gathering</p>
                        <h3 className="mt-2 text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                          {event.title}
                        </h3>
                      </div>
                      <AnuChip tone="accent">{getBadge(event)}</AnuChip>
                    </div>
                    <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{event.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <AnuChip tone="muted">{eventMeta(event)}</AnuChip>
                      <AnuChip tone="muted">{event.attendees}/{event.goal} attending</AnuChip>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <AnuActionLink href={`/events/${event.id}`} tone="secondary">
                        View details
                      </AnuActionLink>
                      <AnuControlButton
                        tone={event.attendees >= event.goal ? 'warning' : 'active'}
                        onClick={() => void handleAttend(event.id)}
                        disabled={event.attendees >= event.goal}
                      >
                        {event.attendees >= event.goal ? 'Full' : 'Attend'}
                      </AnuControlButton>
                    </div>
                  </div>
                </AnuSurfacePanel>
              ))
            ) : (
              <div className="rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-5 py-6 text-sm text-[color:rgba(246,212,203,0.78)] xl:col-span-2">
                <p>{isLiveEventSyncUnavailable ? 'No live gatherings are available right now.' : 'No events match the current filters.'}</p>
                {isLiveEventSyncUnavailable ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AnuControlLink href="/actions" tone="default">Open actions</AnuControlLink>
                    <AnuControlLink href="/relief" tone="default">Open relief</AnuControlLink>
                    <AnuControlLink href="/impact" tone="default">Open impact</AnuControlLink>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {venues.length > 0 ? (
              venues.map((venue) => (
                <AnuSurfacePanel key={venue.id} tone="quiet" className="px-4 py-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">market</p>
                      <h3 className="mt-2 text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                        {venue.name}
                      </h3>
                    </div>
                    <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{venue.address}</p>
                    <div className="flex flex-wrap gap-2">
                      <AnuChip tone="muted">{venue.city}, {venue.country}</AnuChip>
                    </div>
                    {isOrganizer ? (
                      <div className="flex flex-wrap gap-3">
                        <AnuControlButton tone="warning" onClick={() => void handleDeleteVenue(String(venue.id))}>
                          Delete venue
                        </AnuControlButton>
                      </div>
                    ) : null}
                  </div>
                </AnuSurfacePanel>
              ))
            ) : (
              <div className="rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-5 py-6 text-sm text-[color:rgba(246,212,203,0.78)] xl:col-span-2">
                {isLiveEventSyncUnavailable ? 'No live venues are available right now.' : 'No venues are indexed yet.'}
              </div>
            )}
          </div>
        )}
      </AnuSurfacePanel>
    ) : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--color-institutional)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 md:px-8">
      <div className="mx-auto w-full max-w-[96rem]">
        <EarthFieldShell
          eyebrow="Earth proof / events"
          title="The Commons"
          description="Gatherings and markets sit on one topographic field, with detail rising from the terrain while map and list remain available as backup instruments."
          actions={
            <div className="anu-earth-top-links">
              <Link href="/actions" className="anu-earth-top-link">
                Move to actions
              </Link>
              <Link href="/community" className="anu-earth-top-link">
                Enter community
              </Link>
              <Link href="/impact" className="anu-earth-top-link">
                Trace attendance
              </Link>
            </div>
          }
          metrics={
            <div className="anu-earth-hud-lines">
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Mode</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{tabMode === 'events' ? 'gatherings active' : 'markets active'}</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Gatherings</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{events.length} visible</span>
              </div>
              <div className="anu-earth-hud-line">
                <span className="anu-earth-hud-key">Attendance</span>
                <span className="anu-earth-hud-rule" />
                <span className="anu-earth-hud-value">{totalAttendance.toLocaleString()} registered</span>
              </div>
            </div>
          }
          controls={
            <div className="space-y-4">
              {notice ? (
                <AnuSurfacePanel tone="quiet" className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-[#f6d4cb]" />
                    <div className="min-w-0">
                      <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{notice}</p>
                      <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.74)]">
                        Working now: actions, relief, and impact routes remain available while event sync recovers.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AnuControlLink href="/actions" tone="default">Open actions</AnuControlLink>
                        <AnuControlLink href="/relief" tone="default">Open relief</AnuControlLink>
                        <AnuControlLink href="/impact" tone="default">Open impact</AnuControlLink>
                      </div>
                    </div>
                  </div>
                </AnuSurfacePanel>
              ) : null}

              <AnuFilterBar>
                <AnuFilterGroup>
                  <AnuFilterInput
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Filter by city"
                    aria-label="Filter events by city"
                  />
                  <AnuFilterInput
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    aria-label="Filter events by date"
                  />
                  <AnuControlButton tone="default" iconLeft={RefreshCw} onClick={() => void loadData()}>
                    Refresh field
                  </AnuControlButton>
                </AnuFilterGroup>

                <AnuFilterGroup className="justify-end">
                  <AnuControlButton tone={tabMode === 'events' ? 'active' : 'default'} iconLeft={Users} onClick={() => setTabMode('events')}>
                    Gatherings
                  </AnuControlButton>
                  <AnuControlButton tone={tabMode === 'venues' ? 'active' : 'default'} iconLeft={Store} onClick={() => setTabMode('venues')}>
                    Markets
                  </AnuControlButton>
                </AnuFilterGroup>

                <AnuFilterGroup className="justify-end">
                  <AnuControlButton tone={viewMode === 'field' ? 'active' : 'default'} iconLeft={Compass} onClick={() => setViewMode('field')}>
                    Field
                  </AnuControlButton>
                  <AnuControlButton tone={viewMode === 'list' ? 'active' : 'default'} iconLeft={List} onClick={() => setViewMode('list')}>
                    List
                  </AnuControlButton>
                  <AnuControlButton tone={viewMode === 'map' ? 'active' : 'default'} iconLeft={Map} onClick={() => setViewMode('map')}>
                    Map
                  </AnuControlButton>
                </AnuFilterGroup>

                {authLoading ? (
                  <AnuFilterGroup className="justify-end">
                    <AnuChip tone="muted">Checking session</AnuChip>
                  </AnuFilterGroup>
                ) : isOrganizer ? (
                  <AnuFilterGroup className="justify-end">
                    <AnuControlButton tone="active" iconLeft={Plus} onClick={() => setShowCreateEvent(true)}>
                      Create event
                    </AnuControlButton>
                    <AnuControlButton tone="default" iconLeft={Plus} onClick={() => setShowCreateVenue(true)}>
                      Create venue
                    </AnuControlButton>
                  </AnuFilterGroup>
                ) : isAuthenticated ? (
                  <AnuFilterGroup className="justify-end">
                    <AnuControlLink href="/organizer/on-ramp" tone="default" iconLeft={TentTree}>
                      Apply organizer path
                    </AnuControlLink>
                  </AnuFilterGroup>
                ) : (
                  <AnuFilterGroup className="justify-end">
                    <AnuControlLink href={authHref} tone="default" iconLeft={Plus}>
                      Sign in to coordinate
                    </AnuControlLink>
                  </AnuFilterGroup>
                )}
              </AnuFilterBar>
            </div>
          }
          field={fieldMarkers}
          risingPanel={selectedDetailPanel}
          nav={
            <EarthNavPill
              items={[
                { href: '/actions', label: 'Actions', icon: TentTree },
                { href: '/events', label: 'Events', active: true, icon: Users },
                { href: '/relief', label: 'Relief', icon: HeartHandshake },
                { href: '/impact', label: 'Impact', icon: Waypoints },
              ]}
            />
          }
          utility={utilityView}
        />
      </div>

      {showCreateEvent ? <CreateEventModal onClose={() => setShowCreateEvent(false)} onSubmit={handleCreateEvent} /> : null}
      {showCreateVenue ? <CreateVenueModal onClose={() => setShowCreateVenue(false)} onSubmit={handleCreateVenue} /> : null}
    </div>
  );
}
