'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar as CalIcon, Download, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { ErrorState } from '@/ui-system/states/ErrorState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';
import { ShiftCard, type ShiftData } from '@/components/calendar/ShiftCard';
import { AvailabilityEditor, type AvailabilitySlot } from '@/components/calendar/AvailabilityEditor';
import { downloadICS } from '@/lib/calendar/icsExport';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';
import { AnuProcessPanel, AnuRouteBridgePanel } from '@/ui-system/anu/coordinationPrimitives';
import styles from './CalendarFloating.module.css';

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

const TAB_ORDER: Tab[] = ['events', 'shifts', 'availability'];

const calendarLoopSteps = [
  {
    title: 'Schedule events and shifts',
    detail: 'Calendar is where gatherings and operational labor become concrete time commitments.',
  },
  {
    title: 'Coordinate people and availability',
    detail: 'Availability windows and sign-ups connect community willingness to actual coverage.',
  },
  {
    title: 'Feed readiness back into the commons',
    detail: 'Calendar state should support organizer, events, and impact surfaces instead of living as a separate utility.',
  },
];

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('events');
  const [activeIndex, setActiveIndex] = useState(0);
  const [signingUp, setSigningUp] = useState<number | null>(null);
  const [savingAvail, setSavingAvail] = useState(false);
  const tenant = useTenant();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

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

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  const snapToTab = useCallback((nextTab: Tab) => {
    setTab(nextTab);
    const index = TAB_ORDER.indexOf(nextTab);
    if (index < 0) return;

    setActiveIndex(index);

    const viewport = viewportRef.current;
    const section = sectionRefs.current[index];
    if (!viewport || !section) return;

    viewport.scrollTo({ top: section.offsetTop, behavior: 'smooth' });
  }, []);

  const handleViewportScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const focusY = viewport.scrollTop + viewport.clientHeight / 2;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;
      const sectionCenter = section.offsetTop + section.clientHeight / 2;
      const distance = Math.abs(sectionCenter - focusY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });

    if (nearest !== activeIndex) {
      setActiveIndex(nearest);
      setTab(TAB_ORDER[nearest] ?? 'events');
    }
  }, [activeIndex]);

  if (loading) return <LoadingState fullPage message="Loading calendar..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const events = items.filter((i) => i._type === 'event');
  const openShiftSlots = shifts.reduce((sum, shift) => {
    const max = shift.max_volunteers ?? 0;
    const assigned = shift.assigned_count ?? 0;
    return sum + Math.max(max - assigned, 0);
  }, 0);

  return (
    <div className={styles.pageRoot}>
      <section className={styles.surface} aria-label="Calendar coordination surface">
        <header className={styles.header}>
          <div>
            <h1 className={styles.heading}>Calendar</h1>
            <p className={styles.subhead}>
              {tenant.calendarMode === 'shifts' && 'Track and claim volunteer shifts through one shared tile.'}
              {tenant.calendarMode === 'booking' && 'Manage appointment windows and handoff availability in one place.'}
              {(!tenant.calendarMode || tenant.calendarMode === 'events') &&
                'Events, shifts, and availability now live in a floating snap surface for faster coordination.'}
            </p>
            <div className={styles.metrics}>
              <span>{events.length} events</span>
              <span>{shifts.length} shifts</span>
              <span>{openShiftSlots} open slots</span>
              <span>{availability.length} saved windows</span>
            </div>
          </div>

          <button type="button" className={styles.exportButton} onClick={() => downloadICS(startStr, endStr)}>
            <Download className="h-4 w-4" /> Export ICS
          </button>
        </header>

        <div className="px-4 pt-4 sm:px-6">
          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
            <AnuRouteBridgePanel
              eyebrow="Connected routes"
              title="Calendar is the timing layer of the commons"
              description="Scheduling should sit clearly between events, organizer operations, impact, and community participation rather than acting like an isolated utility."
              links={[
                {
                  href: '/events',
                  label: 'Events',
                  detail: 'Move back into discovery and attendance when the question is what is happening publicly.',
                  icon: CalIcon,
                  tone: 'signal',
                },
                {
                  href: '/organizer',
                  label: 'Organizer',
                  detail: 'Use organizer routes for operational follow-through, runs, and applied stewardship.',
                  icon: Clock,
                  tone: 'accent',
                },
                {
                  href: '/community',
                  label: 'Community commons',
                  detail: 'Use the public commons when schedules need social context or publication visibility.',
                  icon: CalIcon,
                },
                {
                  href: '/impact',
                  label: 'Impact workspace',
                  detail: 'Participation and shift coverage should remain legible in the wider impact loop.',
                  icon: Clock,
                },
              ]}
            />

            <AnuProcessPanel
              eyebrow="Timing doctrine"
              title="How calendar connects to earth-plane work"
              description="Calendar should explain how time, staffing, and event readiness affect the rest of the system."
              steps={calendarLoopSteps}
            />
          </div>
        </div>

        <div className={styles.shell}>
          <nav className={styles.tabRail} aria-label="Calendar sections">
            {TAB_ORDER.map((nextTab) => {
              const isActive = tab === nextTab;
              return (
                <button
                  key={nextTab}
                  type="button"
                  onClick={() => snapToTab(nextTab)}
                  className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
                >
                  {nextTab}
                </button>
              );
            })}

            <div className={styles.indicatorRow} aria-hidden="true">
              {TAB_ORDER.map((name, index) => (
                <span
                  key={name}
                  className={`${styles.indicatorDot} ${index === activeIndex ? styles.indicatorActive : ''}`}
                />
              ))}
            </div>
          </nav>

          <div ref={viewportRef} className={styles.snapViewport} onScroll={handleViewportScroll}>
            <section
              ref={(node) => {
                sectionRefs.current[0] = node;
              }}
              className={styles.snapSection}
              aria-label="Events"
            >
              <div className={styles.sectionPanel}>
                <p className={styles.sectionHeading}>Events</p>
                {events.length === 0 ? (
                  <div className={styles.emptyState}>
                    <EmptyState icon={CalIcon} title="No upcoming events" description="Check back later for new events." />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {events.map((event) => (
                      <Card key={`event-${event.id}`} padding="md" hover className="bg-[rgba(11,24,52,0.72)] border-white/12">
                        <div className="mb-2 flex items-start justify-between">
                          <h4 className="font-semibold text-white">{event.title}</h4>
                          <StatusBadge status="active" dot>
                            Event
                          </StatusBadge>
                        </div>
                        <p className="mb-3 line-clamp-2 text-sm text-white/76">{event.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-white/70">
                          <span className="flex items-center gap-1">
                            <CalIcon className="h-3.5 w-3.5" /> {event.date}
                          </span>
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> {event.time}
                            </span>
                          )}
                          {event.attendees != null && (
                            <span className="font-mono-data">
                              {event.attendees}/{event.goal || '?'} attending
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section
              ref={(node) => {
                sectionRefs.current[1] = node;
              }}
              className={styles.snapSection}
              aria-label="Shifts"
            >
              <div className={styles.sectionPanel}>
                <p className={styles.sectionHeading}>Shifts</p>
                {shifts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <EmptyState
                      icon={Clock}
                      title="No shifts available"
                      description="No volunteer shifts scheduled for this period."
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            </section>

            <section
              ref={(node) => {
                sectionRefs.current[2] = node;
              }}
              className={styles.snapSection}
              aria-label="Availability"
            >
              <div className={styles.sectionPanel}>
                <p className={styles.sectionHeading}>Availability</p>
                <Card padding="md" className="bg-[rgba(9,20,44,0.66)] border-white/12">
                  <CardTitle className="text-white">Your Weekly Availability</CardTitle>
                  <p className="mb-6 text-sm text-white/72">Set when you&apos;re available for shifts.</p>
                  <AvailabilityEditor slots={availability} onSave={handleSaveAvailability} saving={savingAvail} />
                </Card>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
