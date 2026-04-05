'use client';

import { useState, useCallback, useEffect } from 'react';
import { Play, FastForward, Zap, Rocket, Edit3, X, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useCosmicClock } from './tools/cosmic-clock/useCosmicClock';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS } from './tools/cosmic-clock/events';
import type { EventCategory, ClockEvent } from './tools/cosmic-clock/events';
import { RINGS } from './tools/cosmic-clock/rings';

interface Props {
  mode?: 'full' | 'compact';
}

const SPEED_OPTIONS = [
  { label: '1x', value: 1, icon: Play },
  { label: '1m/s', value: 60000 / 16, icon: FastForward },
  { label: '1h/s', value: 3600000 / 16, icon: Zap },
  { label: '1d/s', value: 86400000 / 16, icon: Rocket },
];

export function CosmicClockTemplate({ mode = 'full' }: Props) {
  const {
    canvasRef, tooltipRef,
    speedMultiplier, activeFilter, customEvents,
    showEventEditor, setShowEventEditor,
    setSpeed, setActiveFilter,
    addCustomEvent, removeCustomEvent, resetToDefaults,
    getCurrentTime,
    handlers: { handleMouseMove, handleMouseLeave },
  } = useCosmicClock();

  const [displayTime, setDisplayTime] = useState('');
  const [displayDate, setDisplayDate] = useState('');
  const [speedCycleIdx, setSpeedCycleIdx] = useState(0);

  // New event form
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<EventCategory>('cultural');

  // Update time display
  useEffect(() => {
    const interval = setInterval(() => {
      const time = getCurrentTime();
      setDisplayTime(time.toLocaleTimeString('en-US', { hour12: false }));
      setDisplayDate(time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    }, 100);
    return () => clearInterval(interval);
  }, [getCurrentTime]);

  const handleAddEvent = useCallback(() => {
    if (!newEventName.trim() || !newEventDate) return;
    addCustomEvent({
      date: new Date(newEventDate),
      name: newEventName.trim(),
      desc: newEventDesc.trim(),
      icon: 'fa-star',
      category: newEventCategory,
    });
    setNewEventName('');
    setNewEventDesc('');
    setNewEventDate('');
  }, [newEventName, newEventDesc, newEventDate, newEventCategory, addCustomEvent]);

  // Compact: cycle speed on click
  const cycleSpeed = useCallback(() => {
    const nextIdx = (speedCycleIdx + 1) % SPEED_OPTIONS.length;
    setSpeedCycleIdx(nextIdx);
    setSpeed(SPEED_OPTIONS[nextIdx].value);
  }, [speedCycleIdx, setSpeed]);

  const isCompact = mode === 'compact';

  return (
    <div className={`relative ${isCompact ? 'h-full' : 'min-h-[calc(100vh-56px)]'} bg-[#1e0227] text-[var(--color-foreground)] flex`}>
      {/* Full-viewport canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute hidden z-30 px-3 py-2 rounded-lg text-[11px] max-w-[200px] pointer-events-none"
          style={{ background: 'rgba(30,2,39,0.9)', border: '1px solid rgba(246,212,203,0.15)' }}
        />

        {/* Info panel (top-left) */}
        {!isCompact && (
          <div className="absolute top-4 left-4 z-20 p-4 rounded-xl max-w-[220px]"
            style={{ background: 'rgba(30,2,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(246,212,203,0.08)' }}>
            <h2 className="text-sm font-semibold mb-1">Cosmic Clock</h2>
            <div className="text-lg font-mono tracking-wide">{displayTime}</div>
            <div className="text-[10px] opacity-50 mt-1">{displayDate}</div>

            <div className="mt-3 space-y-1">
              {RINGS.map(ring => (
                <div key={ring.name} className="flex items-center gap-2 text-[9px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ring.color }} />
                  <span className="opacity-60">{ring.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compact: time overlay */}
        {isCompact && (
          <div className="absolute top-2 left-2 z-20">
            <div className="text-xs font-mono opacity-80">{displayTime}</div>
          </div>
        )}

        {/* Speed controls (bottom) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1 rounded-full"
          style={{ background: 'rgba(30,2,39,0.7)', border: '1px solid rgba(246,212,203,0.1)' }}>
          {isCompact ? (
            <button onClick={cycleSpeed}
              className="px-3 py-1 text-[10px] rounded-full bg-[color:rgba(246,212,203,0.1)] hover:bg-[color:rgba(246,212,203,0.2)] transition-colors">
              {SPEED_OPTIONS[speedCycleIdx].label}
            </button>
          ) : (
            SPEED_OPTIONS.map(opt => (
              <button key={opt.label}
                onClick={() => setSpeed(opt.value)}
                className={`px-3 py-1.5 text-[10px] rounded-full transition-colors ${
                  speedMultiplier === opt.value ? 'bg-[color:rgba(246,212,203,0.2)] text-[var(--color-foreground)]' : 'text-[color:rgba(246,212,203,0.5)] hover:text-[color:rgba(246,212,203,0.8)]'
                }`}>
                {opt.label}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Event panel (right side) — full mode only */}
      {!isCompact && (
        <div className="w-72 border-l border-[color:rgba(246,212,203,0.1)] flex flex-col overflow-hidden"
          style={{ background: 'rgba(30,2,39,0.5)', backdropFilter: 'blur(12px)' }}>
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-1 p-3 border-b border-[color:rgba(246,212,203,0.1)]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-1 text-[9px] rounded-full transition-colors ${
                activeFilter === 'all' ? 'bg-[color:rgba(246,212,203,0.2)] text-[var(--color-foreground)]' : 'text-[color:rgba(246,212,203,0.4)] hover:text-[color:rgba(246,212,203,0.7)]'
              }`}>
              All
            </button>
            {ALL_CATEGORIES.map(cat => (
              <button key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2 py-1 text-[9px] rounded-full transition-colors ${
                  activeFilter === cat ? 'text-[var(--color-foreground)]' : 'text-[color:rgba(246,212,203,0.4)] hover:text-[color:rgba(246,212,203,0.7)]'
                }`}
                style={activeFilter === cat ? { backgroundColor: CATEGORY_COLORS[cat] + '44' } : {}}>
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Event list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <EventList getCurrentTime={getCurrentTime} filter={activeFilter} />
          </div>

          {/* Edit events button */}
          <div className="p-3 border-t border-[color:rgba(246,212,203,0.1)]">
            <button onClick={() => setShowEventEditor(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] rounded-lg bg-[color:rgba(246,212,203,0.1)] hover:bg-[color:rgba(246,212,203,0.15)] transition-colors">
              <Edit3 className="w-3 h-3" /> Edit Events
            </button>
          </div>
        </div>
      )}

      {/* Event Editor Modal */}
      {showEventEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:rgba(30,2,39,0.7)]" onClick={() => setShowEventEditor(false)}>
          <div className="rounded-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ background: '#1e0227', border: '1px solid rgba(246,212,203,0.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Event Editor</h3>
              <button onClick={() => setShowEventEditor(false)} className="p-1 hover:bg-[color:rgba(246,212,203,0.1)] rounded"><X className="w-4 h-4" /></button>
            </div>

            {/* Add new event form */}
            <div className="space-y-2 mb-4 p-3 rounded-lg bg-[color:rgba(246,212,203,0.05)]">
              <input value={newEventName} onChange={e => setNewEventName(e.target.value)}
                placeholder="Event name" className="w-full text-[11px] px-2 py-1.5 rounded bg-[color:rgba(246,212,203,0.1)] border border-[color:rgba(246,212,203,0.1)] outline-none" />
              <input value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)}
                placeholder="Description" className="w-full text-[11px] px-2 py-1.5 rounded bg-[color:rgba(246,212,203,0.1)] border border-[color:rgba(246,212,203,0.1)] outline-none" />
              <div className="flex gap-2">
                <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)}
                  className="flex-1 text-[11px] px-2 py-1.5 rounded bg-[color:rgba(246,212,203,0.1)] border border-[color:rgba(246,212,203,0.1)] outline-none" />
                <select value={newEventCategory} onChange={e => setNewEventCategory(e.target.value as EventCategory)}
                  className="text-[11px] px-2 py-1.5 rounded bg-[color:rgba(246,212,203,0.1)] border border-[color:rgba(246,212,203,0.1)] outline-none">
                  {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>)}
                </select>
              </div>
              <button onClick={handleAddEvent}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] rounded bg-[#7c413c] hover:bg-[#7c413c] transition-colors">
                <Plus className="w-3 h-3" /> Add Event
              </button>
            </div>

            {/* Custom events list */}
            {customEvents.length > 0 && (
              <div className="space-y-1 mb-3">
                <div className="text-[9px] uppercase tracking-wider opacity-50 mb-1">Custom Events</div>
                {customEvents.map((evt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-[color:rgba(246,212,203,0.05)] text-[10px]">
                    <div>
                      <span className="w-2 h-2 inline-block rounded-full mr-1.5" style={{ backgroundColor: CATEGORY_COLORS[evt.category] }} />
                      {evt.name}
                    </div>
                    <button onClick={() => removeCustomEvent(i)} className="p-1 hover:bg-[color:rgba(246,212,203,0.1)] rounded text-[#7c413c]">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={resetToDefaults}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-[10px] rounded border border-[color:rgba(246,212,203,0.2)] hover:bg-[color:rgba(246,212,203,0.1)] transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component to show upcoming events with live updates
function EventList({ getCurrentTime, filter }: { getCurrentTime: () => Date; filter: EventCategory | 'all' }) {
  const [, forceUpdate] = useState(0);
  const [events, setEvents] = useState<ClockEvent[]>([]);

  useEffect(() => {
    import('./tools/cosmic-clock/events').then(mod => {
      const now = getCurrentTime();
      setEvents(mod.getDefaultEvents(now.getFullYear()));
    });
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = getCurrentTime();
  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter);
  const upcoming = filtered.filter(e => e.date >= now).slice(0, 15);

  if (upcoming.length === 0) {
    return <p className="text-[10px] opacity-40">No upcoming events in this category</p>;
  }

  return (
    <>
      {upcoming.map((evt, i) => {
        const daysUntil = Math.ceil((evt.date.getTime() - now.getTime()) / 86400000);
        const dateStr = evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <div key={i} className="flex items-start gap-2 text-[10px] p-2 rounded-lg bg-[color:rgba(246,212,203,0.05)]">
            <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: CATEGORY_COLORS[evt.category] }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="opacity-50">{dateStr}</span>
                <span className="opacity-40">{daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}</span>
              </div>
              <div className="font-medium truncate">{evt.name}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
