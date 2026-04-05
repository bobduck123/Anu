'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onSelect: (result: { address: string; lat: number; lng: number; city?: string; country?: string }) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for an address...',
  className = '',
}: AddressAutocompleteProps) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, NominatimResult[]>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const useRemoteProvider = process.env.NEXT_PUBLIC_GEOCODE_PROVIDER === 'nominatim';

  const localFallback = useMemo<NominatimResult[]>(() => ([
    { display_name: 'Marrickville, NSW, Australia', lat: '-33.9072', lon: '151.1556', address: { city: 'Marrickville', country: 'Australia' } },
    { display_name: 'Parramatta, NSW, Australia', lat: '-33.8142', lon: '151.0020', address: { city: 'Parramatta', country: 'Australia' } },
    { display_name: 'Bondi Beach, NSW, Australia', lat: '-33.8908', lon: '151.2743', address: { city: 'Sydney', country: 'Australia' } },
    { display_name: 'Springfield, IL, USA', lat: '39.7817', lon: '-89.6501', address: { city: 'Springfield', country: 'United States' } },
    { display_name: 'Riverside, CA, USA', lat: '33.9806', lon: '-117.3755', address: { city: 'Riverside', country: 'United States' } },
    { display_name: 'Portland, OR, USA', lat: '45.5152', lon: '-122.6784', address: { city: 'Portland', country: 'United States' } },
    { display_name: 'New York, NY, USA', lat: '40.7128', lon: '-74.0060', address: { city: 'New York', country: 'United States' } },
    { display_name: 'Manly, NSW, Australia', lat: '-33.7971', lon: '151.2853', address: { city: 'Sydney', country: 'Australia' } },
  ]), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const cached = cacheRef.current.get(query.toLowerCase());
    if (cached) {
      setResults(cached);
      setIsOpen(cached.length > 0);
      setActiveIndex(0);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        let data: NominatimResult[] = [];
        if (useRemoteProvider) {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          data = await res.json();
        }
        if (!data.length) {
          const q = query.toLowerCase();
          data = localFallback.filter((item) => item.display_name.toLowerCase().includes(q)).slice(0, 5);
        }
        cacheRef.current.set(query.toLowerCase(), data);
        setResults(data);
        setIsOpen(data.length > 0);
        setActiveIndex(0);
      } catch {
        const q = query.toLowerCase();
        const fallback = localFallback.filter((item) => item.display_name.toLowerCase().includes(q)).slice(0, 5);
        cacheRef.current.set(query.toLowerCase(), fallback);
        setResults(fallback);
        setIsOpen(fallback.length > 0);
        setActiveIndex(0);
      }
    }, 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const city = result.address?.city || result.address?.town || result.address?.village || '';
    const country = result.address?.country || '';
    onChange(result.display_name);
    onSelect({
      address: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      city,
      country,
    });
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) handleSelect(selected);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-institutional)] focus:border-transparent ${className}`}
      />
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-[var(--color-foreground)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto" role="listbox">
          {results.map((result, i) => (
            <li
              key={i}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`px-3 py-2 cursor-pointer text-sm border-b border-[var(--color-border)] last:border-b-0 ${i === activeIndex ? 'bg-[var(--color-muted)]' : 'hover:bg-[var(--color-muted)]'}`}
            >
              {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
