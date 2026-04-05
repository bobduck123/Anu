'use client';

import { useState } from 'react';
import type { HeatmapFilters as Filters } from '@/data/adapters/heatmapAdapter';

interface HeatmapFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  tenants: string[];
  categories: string[];
}

const TIME_RANGES: { label: string; value: Filters['timeRange'] }[] = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

export function HeatmapFilters({ filters, onFilterChange, tenants, categories }: HeatmapFiltersProps) {
  const [minVal, setMinVal] = useState(filters.minValue ?? 0);

  const update = (patch: Partial<Filters>) =>
    onFilterChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)]">
      {/* Time range chips */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] mr-1">Time</span>
        {TIME_RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => update({ timeRange: filters.timeRange === value ? undefined : value })}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              filters.timeRange === value
                ? 'bg-[var(--color-primary)] text-[var(--color-foreground)]'
                : 'bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--color-border)]" />

      {/* Tenant dropdown */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="tenant-filter" className="text-xs font-medium text-[var(--color-muted-foreground)]">
          Tenant
        </label>
        <select
          id="tenant-filter"
          value={filters.tenant ?? ''}
          onChange={(e) => update({ tenant: e.target.value || undefined })}
          className="text-xs px-2 py-1 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)]"
        >
          <option value="">All</option>
          {tenants.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Category dropdown */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="category-filter" className="text-xs font-medium text-[var(--color-muted-foreground)]">
          Category
        </label>
        <select
          id="category-filter"
          value={filters.category ?? ''}
          onChange={(e) => update({ category: e.target.value || undefined })}
          className="text-xs px-2 py-1 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)]"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Min value slider */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="min-value" className="text-xs font-medium text-[var(--color-muted-foreground)]">
          Min
        </label>
        <input
          id="min-value"
          type="range"
          min={0}
          max={200}
          value={minVal}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMinVal(v);
            update({ minValue: v > 0 ? v : undefined });
          }}
          className="w-20 h-1 accent-[var(--color-primary)]"
        />
        <span className="text-xs font-mono text-[var(--color-muted-foreground)] w-8">{minVal}</span>
      </div>

      {/* Clear button */}
      {(filters.timeRange || filters.tenant || filters.category || filters.minValue) && (
        <button
          onClick={() => {
            setMinVal(0);
            onFilterChange({});
          }}
          className="px-2 py-1 text-xs rounded-md text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
