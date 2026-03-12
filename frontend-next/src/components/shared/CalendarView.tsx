'use client';

import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  height?: string;
  onSelectEvent?: (event: CalendarEvent) => void;
}

export default function CalendarView({ events, height = '500px', onSelectEvent }: CalendarViewProps) {
  const eventStyleGetter = useMemo(() => {
    return (event: CalendarEvent) => ({
      style: {
        backgroundColor: event.color || 'var(--color-sage)',
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '0.8rem',
        padding: '2px 6px',
      },
    });
  }, []);

  return (
    <div style={{ height }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={Views.MONTH}
        views={[Views.MONTH, Views.WEEK, Views.DAY]}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={onSelectEvent}
        style={{ height: '100%' }}
      />
    </div>
  );
}
