'use client';

import { List, Map, CalendarDays } from 'lucide-react';

export type ViewMode = 'list' | 'map' | 'calendar';

interface ViewToggleProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
  modes?: ViewMode[];
}

const icons: Record<ViewMode, typeof List> = {
  list: List,
  map: Map,
  calendar: CalendarDays,
};

const labels: Record<ViewMode, string> = {
  list: 'List',
  map: 'Map',
  calendar: 'Calendar',
};

export default function ViewToggle({
  current,
  onChange,
  modes = ['list', 'map', 'calendar'],
}: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] overflow-hidden">
      {modes.map((mode) => {
        const Icon = icons[mode];
        const isActive = current === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--color-institutional)] text-[var(--color-foreground)]'
                : 'bg-[var(--color-card)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {labels[mode]}
          </button>
        );
      })}
    </div>
  );
}
