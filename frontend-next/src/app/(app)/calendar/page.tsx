'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar as CalIcon, Download, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Button } from '@/ui-system/primitives/Button';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { ErrorState } from '@/ui-system/states/ErrorState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';
import { ShiftCard, type ShiftData } from '@/components/calendar/ShiftCard';
import { AvailabilityEditor, type AvailabilitySlot } from '@/components/calendar/AvailabilityEditor';
import { downloadICS } from '@/lib/calendar/icsExport';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  time?: string;
  location?: string;
  description?: string;
  _type: 'event' | 'shift';
  assigned_count?: number;
  max_volunteers?: number;
  attendees?: number;
  goal?: number;
}

type Tab = 'events' | 'shifts' | 'availability';

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('events');
  const [signingUp, setSigningUp] = useState<number | null>(null);
  const [savingAvail, setSavingAvail] = useState(false);
  const tenant = useTenant();

  const now = new Date();
  const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const endStr = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [eventsRes, shiftsRes, availRes] = await Promise.allSettled([
        apiFetch<CalendarEvent[]>(`/api/calendar/events?start=${startStr}&end=${endStr}`),
        apiFetch<ShiftData[]>(`/api/calendar/shifts?start=${startStr}&end=${endStr}`),
        apiFetch<AvailabilitySlot[]>('/api/calendar/availability'),
      ]);
      setItems(eventsRes.status === 'fulfilled' ? eventsRes.value : []);
      setShifts(shiftsRes.status === 'fulfilled' ? shiftsRes.value : []);
      setAvailability(availRes.status === 'fulfilled' ? availRes.value : []);
    } catch {
      setError('Failed to load calendar data.');
    } finally {
      setLoading(false);
    }
  }, [startStr, endStr]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSignUp = async (shiftId: number) => {
    setSigningUp(shiftId);
    try {
      await apiFetch(`/api/calendar/shifts/${shiftId}/assign`, { method: 'POST' });
      await loadData();
    } catch {
      alert('Failed to sign up for shift.');
    } finally {
      setSigningUp(null);
    }
  };

  const handleSaveAvailability = async (slots: AvailabilitySlot[]) => {
    setSavingAvail(true);
    try {
      await apiFetch('/api/calendar/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      setAvailability(slots);
    } catch {
      alert('Failed to save availability.');
    } finally {
      setSavingAvail(false);
    }
  };

  if (loading) return <LoadingState fullPage message="Loading calendar..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const events = items.filter((i) => i._type === 'event');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Calendar</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            {tenant.calendarMode === 'shifts' && 'View and sign up for volunteer shifts.'}
            {tenant.calendarMode === 'booking' && 'Book time slots and manage appointments.'}
            {(!tenant.calendarMode || tenant.calendarMode === 'events') && 'Events, shifts, and your availability.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => downloadICS(startStr, endStr)}>
            Export ICS
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border)]">
        {(['events', 'shifts', 'availability'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div>
          {events.length === 0 ? (
            <EmptyState icon={CalIcon} title="No upcoming events" description="Check back later for new events." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Card key={`event-${event.id}`} padding="md" hover>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{event.title}</h4>
                    <StatusBadge status="active" dot>Event</StatusBadge>
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-2 mb-3">{event.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <CalIcon className="w-3.5 h-3.5" /> {event.date}
                    </span>
                    {event.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {event.time}
                      </span>
                    )}
                    {event.attendees != null && (
                      <span className="font-mono-data">{event.attendees}/{event.goal || '?'} attending</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'shifts' && (
        <div>
          {shifts.length === 0 ? (
            <EmptyState icon={Clock} title="No shifts available" description="No volunteer shifts scheduled for this period." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onSignUp={handleSignUp}
                  loading={signingUp === shift.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'availability' && (
        <Card padding="md">
          <CardTitle>Your Weekly Availability</CardTitle>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-6">Set when you&apos;re available for shifts.</p>
          <AvailabilityEditor
            slots={availability}
            onSave={handleSaveAvailability}
            saving={savingAvail}
          />
        </Card>
      )}
    </div>
  );
}
