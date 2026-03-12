'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { StarType, UniverseFilters as Filters, Constellation } from '@/data/adapters/starfieldAdapter';

interface UniverseFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  constellations: Constellation[];
  starCount: number;
}

const TYPE_CONFIG: { type: StarType; label: string; color: string }[] = [
  { type: 'event', label: 'Events', color: '#667eea' },
  { type: 'action', label: 'Actions', color: '#48bb78' },
  { type: 'community', label: 'Community', color: '#ed8936' },
  { type: 'donor', label: 'Donors', color: '#f6e05e' },
  { type: 'relief', label: 'Relief', color: '#fc8181' },
  { type: 'education', label: 'Education', color: '#b794f4' },
  { type: 'marketplace', label: 'Marketplace', color: '#4fd1c5' },
];

export function UniverseFilters({
  filters,
  onFilterChange,
  constellations,
  starCount,
}: UniverseFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ ...filters, search: searchInput || undefined });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const toggleType = (type: StarType) => {
    const current = filters.types ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFilterChange({ ...filters, types: next.length > 0 ? next : undefined });
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
        <input
          type="text"
          placeholder="Search stars..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8 pr-3 py-1.5 text-xs rounded-full bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 w-48"
        />
      </div>

      {/* Type chips */}
      <div className="flex flex-wrap gap-1">
        {TYPE_CONFIG.map(({ type, label, color }) => {
          const active = !filters.types || filters.types.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{
                backgroundColor: active ? color + '30' : 'rgba(255,255,255,0.05)',
                color: active ? color : 'rgba(255,255,255,0.35)',
                borderWidth: 1,
                borderColor: active ? color + '50' : 'transparent',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: active ? color : 'rgba(255,255,255,0.2)' }}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* Constellation filter */}
      {constellations.length > 0 && (
        <select
          value={filters.constellation ?? ''}
          onChange={(e) =>
            onFilterChange({ ...filters, constellation: e.target.value || undefined })
          }
          className="px-2.5 py-1.5 text-xs rounded-full bg-white/10 border border-white/10 text-white/80 focus:outline-none"
        >
          <option value="">All Constellations</option>
          {constellations.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Star count */}
      <span className="text-[10px] text-white/30 ml-auto">
        {starCount.toLocaleString()} entities
      </span>
    </div>
  );
}
