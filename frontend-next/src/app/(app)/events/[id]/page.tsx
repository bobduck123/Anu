'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamicImport from 'next/dynamic';
import { api, Event } from '@/lib/api';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });

export default function EventDetailPage() {
  const params = useParams();
  const eventId = String(params?.id || '');
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.events.getById(eventId);
        setEvent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load event';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    if (eventId) {
      load();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="max-w-3xl mx-auto card-civic">
          <p className="text-[var(--color-danger)] mb-4">{error}</p>
          <Link href="/events" className="btn-pill btn-pill-outline">Back to events</Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const hasLocation = event.latitude != null && event.longitude != null;
  const markers = hasLocation ? [{
    id: event.id,
    lat: event.latitude!,
    lng: event.longitude!,
    title: event.title,
    popup: `<strong>${event.title}</strong><br/>${event.address || ''}`,
    color: 'institutional' as const,
  }] : [];

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-4xl mx-auto card-civic">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
            {event.title}
          </h1>
          <Link href="/events" className="btn-pill btn-pill-outline text-sm">Back</Link>
        </div>

        <p className="text-[var(--color-muted-foreground)] mb-4">{event.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Date</div>
            <div>{new Date(event.date).toLocaleDateString()} {event.time}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Attendees</div>
            <div className="font-mono-data">{event.attendees}/{event.goal}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Location</div>
            <div>{event.city ? `${event.city}, ${event.country}` : event.isOnline ? 'Online' : 'TBA'}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Venue</div>
            <div>{event.venueId}</div>
          </div>
        </div>

        {hasLocation && (
          <div className="card-civic">
            <MapView markers={markers} height="400px" />
          </div>
        )}
      </div>
    </div>
  );
}
