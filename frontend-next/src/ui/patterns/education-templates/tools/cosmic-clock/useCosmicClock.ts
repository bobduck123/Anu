'use client';

import { useState, useRef, useEffect } from 'react';
import type { ClockEvent, EventCategory } from './events';
import { getDefaultEvents, CATEGORY_COLORS } from './events';
import { RINGS, drawRing, drawCenter, drawEventMarkers, drawBackgroundGrid } from './rings';
import type { EventMarkerPosition } from './rings';

export interface UseCosmicClockOptions {
  year?: number;
}

const STORAGE_KEY = 'cosmic-clock-custom-events';

function loadCustomEvents(): ClockEvent[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((e: Record<string, unknown>) => ({
        ...e,
        date: new Date(e.date as string),
      }));
    }
  } catch { /* ignore */ }
  return [];
}

function saveCustomEvents(events: ClockEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch { /* ignore */ }
}

export function useCosmicClock(options?: UseCosmicClockOptions) {
  const eventYear = options?.year ?? new Date().getFullYear();

  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [activeFilter, setActiveFilter] = useState<EventCategory | 'all'>('all');
  const [customEvents, setCustomEvents] = useState<ClockEvent[]>(() => loadCustomEvents());
  const [showEventEditor, setShowEventEditor] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatedTimeRef = useRef(nowInEventYear(eventYear));
  const animFrameRef = useRef<number>(0);
  const eventPositionsRef = useRef<EventMarkerPosition[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);

  function nowInEventYear(year: number): Date {
    const n = new Date();
    const dim = new Date(year, n.getMonth() + 1, 0).getDate();
    const day = Math.min(n.getDate(), dim);
    return new Date(year, n.getMonth(), day, n.getHours(), n.getMinutes(), n.getSeconds(), n.getMilliseconds());
  }

  // Animation loop
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) { animFrameRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { animFrameRef.current = requestAnimationFrame(tick); return; }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;
      const centerX = w / 2;
      const centerY = h / 2;

      ctx.clearRect(0, 0, w, h);
      drawBackgroundGrid(ctx, w, h);

      const time = simulatedTimeRef.current;

      for (let i = RINGS.length - 1; i >= 0; i--) {
        drawRing(ctx, RINGS[i], RINGS[i].getValue(time), centerX, centerY, w, h);
      }

      const defaults = getDefaultEvents(eventYear);
      const allEvts = activeFilter === 'all'
        ? [...defaults, ...customEvents]
        : [...defaults, ...customEvents].filter(e => e.category === activeFilter);
      eventPositionsRef.current = drawEventMarkers(
        ctx, allEvts, time, centerX, centerY, w, h, CATEGORY_COLORS,
      );

      drawCenter(ctx, centerX, centerY, w, h, time.getFullYear());

      if (speedMultiplier === 1) {
        simulatedTimeRef.current = nowInEventYear(eventYear);
      } else {
        simulatedTimeRef.current = new Date(simulatedTimeRef.current.getTime() + 16 * speedMultiplier);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [speedMultiplier, eventYear, activeFilter, customEvents]);

  // Mouse move for tooltips
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check event markers
    for (const pos of eventPositionsRef.current) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 8) {
        const evt = pos.event;
        const daysUntil = Math.ceil((evt.date.getTime() - simulatedTimeRef.current.getTime()) / 86400000);
        const dateStr = evt.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const color = CATEGORY_COLORS[evt.category as EventCategory] || '#888';

        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX - rect.left + 12}px`;
        tooltip.style.top = `${e.clientY - rect.top + 12}px`;
        tooltip.innerHTML = `
          <div style="font-weight:600;color:${color}">${evt.name}</div>
          <div style="font-size:10px;opacity:0.6">${dateStr}</div>
          <div style="font-size:10px;opacity:0.7;margin-top:2px">${evt.desc}</div>
          <div style="font-size:10px;opacity:0.5;margin-top:2px">${daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : daysUntil === 0 ? 'Today' : `In ${daysUntil} days`}</div>
        `;
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Check rings
    const w = rect.width;
    const h = rect.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    for (const ring of RINGS) {
      const baseRadius = Math.min(w, h) * 0.42 * (ring.radius / 285);
      if (Math.abs(distance - baseRadius) < ring.thickness) {
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
        const segmentIndex = Math.floor((normalizedAngle / (Math.PI * 2)) * ring.divisions);
        const label = ring.labels[segmentIndex];

        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX - rect.left + 12}px`;
        tooltip.style.top = `${e.clientY - rect.top + 12}px`;
        tooltip.innerHTML = `
          <div style="font-weight:600">${ring.name}</div>
          <div style="font-size:10px;opacity:0.7">${label || `Segment ${segmentIndex + 1}`}</div>
          <div style="font-size:10px;color:${ring.color}">${segmentIndex + 1} of ${ring.divisions}</div>
        `;
        canvas.style.cursor = 'default';
        return;
      }
    }

    tooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  };

  const handleMouseLeave = () => {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  };

  // Speed control
  const setSpeed = (multiplier: number) => {
    setSpeedMultiplier(multiplier);
    if (multiplier === 1) {
      simulatedTimeRef.current = nowInEventYear(eventYear);
    }
  };

  // Custom events
  const addCustomEvent = (event: ClockEvent) => {
    setCustomEvents(prev => {
      const next = [...prev, event];
      saveCustomEvents(next);
      return next;
    });
  };

  const removeCustomEvent = (index: number) => {
    setCustomEvents(prev => {
      const next = prev.filter((_, i) => i !== index);
      saveCustomEvents(next);
      return next;
    });
  };

  const resetToDefaults = () => {
    setCustomEvents([]);
    saveCustomEvents([]);
  };

  // Get current time for display
  const getCurrentTime = () => simulatedTimeRef.current;

  return {
    canvasRef,
    tooltipRef,
    speedMultiplier,
    activeFilter,
    customEvents,
    showEventEditor,
    setShowEventEditor,
    setSpeed,
    setActiveFilter,
    addCustomEvent,
    removeCustomEvent,
    resetToDefaults,
    getCurrentTime,
    handlers: {
      handleMouseMove,
      handleMouseLeave,
    },
  };
}
