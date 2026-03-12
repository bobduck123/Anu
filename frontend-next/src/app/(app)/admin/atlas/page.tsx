'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo, useRef } from 'react';
import { useFeatureFlag } from '@/lib/featureFlags';
import {
  generateMockHeatmap,
  filterHeatmap,
  type HeatmapFilters as Filters,
} from '@/data/adapters/heatmapAdapter';
import {
  AugmentedMatrixHeatmap,
  HeatmapLegend,
  HeatmapFilters,
  HeatmapExport,
  type ColorScale,
} from '@/ui/patterns/augmented-matrix';
import { BarChart3, Layers } from 'lucide-react';

const SCALE_OPTIONS: { label: string; value: ColorScale }[] = [
  { label: 'Warm', value: 'warm' },
  { label: 'Cool', value: 'cool' },
  { label: 'Divergent', value: 'divergent' },
];

export default function AdminAtlasPage() {
  const enabled = useFeatureFlag('augmentedMatrixHeatmap');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [filters, setFilters] = useState<Filters>({});
  const [colorScale, setColorScale] = useState<ColorScale>('warm');
  const [cellCount, setCellCount] = useState<20 | 50>(20);

  const rawData = useMemo(() => generateMockHeatmap(cellCount, 24, 42), [cellCount]);
  const data = useMemo(() => filterHeatmap(rawData, filters), [rawData, filters]);

  if (!enabled) {
    return (
      <div className="p-8 text-center text-[var(--color-muted-foreground)]">
        <Layers className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">System Atlas is disabled</p>
        <p className="text-sm mt-1">Enable the augmentedMatrixHeatmap feature flag to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-primary)]/10">
            <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">System Atlas</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Observability heatmap — {data.cells.length.toLocaleString()} cells across {data.rows.length} endpoints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Row count toggle */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[var(--color-muted-foreground)]">Density</span>
            <button
              onClick={() => setCellCount(20)}
              className={`px-2 py-0.5 rounded ${cellCount === 20 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)]'}`}
            >
              20
            </button>
            <button
              onClick={() => setCellCount(50)}
              className={`px-2 py-0.5 rounded ${cellCount === 50 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-card)]'}`}
            >
              50
            </button>
          </div>

          {/* Color scale selector */}
          <div className="flex items-center gap-1">
            {SCALE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setColorScale(value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  colorScale === value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <HeatmapExport data={data} canvasRef={canvasRef} />
        </div>
      </div>

      {/* Filters */}
      <HeatmapFilters
        filters={filters}
        onFilterChange={setFilters}
        tenants={rawData.tenants}
        categories={rawData.categories}
      />

      {/* Heatmap */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden" style={{ height: 520 }}>
        <AugmentedMatrixHeatmap
          data={data}
          colorScale={colorScale}
          onCellClick={(cell) => {
            // Future: open detail panel
            console.log('Cell clicked:', cell);
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between">
        <HeatmapLegend colorScale={colorScale} minValue={data.minValue} maxValue={data.maxValue} />
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Scroll to zoom · Drag to pan · Arrow keys to navigate
        </span>
      </div>
    </div>
  );
}
