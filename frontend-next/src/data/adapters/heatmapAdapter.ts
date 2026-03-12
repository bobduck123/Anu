/**
 * Heatmap data adapter for the Admin Atlas (Augmented Matrix).
 * Provides mock + real data modes for the observability heatmap.
 */

import { seededRandom, pickRandom } from './types';

export interface HeatmapCell {
  row: number;
  col: number;
  value: number;
  label: string;
  category: string;
  tenant: string;
  timestamp: string;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  rows: string[];
  cols: string[];
  minValue: number;
  maxValue: number;
  categories: string[];
  tenants: string[];
}

export interface HeatmapFilters {
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  tenant?: string;
  category?: string;
  minValue?: number;
}

const CATEGORIES = ['API', 'Auth', 'Database', 'Cache', 'Queue', 'Storage', 'Compute', 'Network'];
const TENANTS = ['Addi', 'FBI', 'Mudyin', 'Global'];
const ENDPOINTS = [
  '/api/events', '/api/users', '/api/wcle/runs', '/api/community', '/api/marketplace',
  '/api/education', '/api/relief', '/api/calendar', '/api/ledger', '/api/auth',
  '/api/pools', '/api/credits', '/api/constellations', '/api/governance', '/api/admin',
  '/api/transparency', '/api/assets', '/api/memberships', '/api/teams', '/api/actions',
];

export function generateMockHeatmap(
  rowCount: number = 20,
  colCount: number = 24,
  seed: number = 42,
): HeatmapData {
  const rng = seededRandom(seed);
  const cells: HeatmapCell[] = [];

  const rows = ENDPOINTS.slice(0, rowCount);
  const cols = Array.from({ length: colCount }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      // Create realistic patterns: higher traffic during business hours
      const hourWeight = c >= 8 && c <= 18 ? 1.5 : 0.6;
      const baseValue = rng() * 100 * hourWeight;
      // Add some spikes
      const spike = rng() > 0.95 ? rng() * 200 : 0;
      const value = Math.round((baseValue + spike) * 10) / 10;

      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;

      cells.push({
        row: r,
        col: c,
        value,
        label: `${rows[r]} at ${cols[c]}`,
        category: pickRandom(CATEGORIES, rng),
        tenant: pickRandom(TENANTS, rng),
        timestamp: new Date(2026, 1, 26, c, Math.floor(rng() * 60)).toISOString(),
      });
    }
  }

  return {
    cells,
    rows,
    cols,
    minValue,
    maxValue,
    categories: CATEGORIES,
    tenants: TENANTS,
  };
}

export function generateLargeHeatmap(cellCount: number = 10000, seed: number = 42): HeatmapData {
  const side = Math.ceil(Math.sqrt(cellCount));
  return generateMockHeatmap(Math.min(side, ENDPOINTS.length), side, seed);
}

export function filterHeatmap(data: HeatmapData, filters: HeatmapFilters): HeatmapData {
  let filtered = data.cells;

  if (filters.tenant) {
    filtered = filtered.filter(c => c.tenant === filters.tenant);
  }
  if (filters.category) {
    filtered = filtered.filter(c => c.category === filters.category);
  }
  if (filters.minValue !== undefined) {
    filtered = filtered.filter(c => c.value >= filters.minValue!);
  }

  return {
    ...data,
    cells: filtered,
    minValue: filtered.length ? Math.min(...filtered.map(c => c.value)) : 0,
    maxValue: filtered.length ? Math.max(...filtered.map(c => c.value)) : 0,
  };
}
