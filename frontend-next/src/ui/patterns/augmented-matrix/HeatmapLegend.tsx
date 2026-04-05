'use client';

import { useMemo } from 'react';
import type { ColorScale } from './AugmentedMatrixHeatmap';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HeatmapLegendProps {
  colorScale: ColorScale;
  minValue: number;
  maxValue: number;
  label?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Color stop definitions (mirrored from the heatmap component)       */
/* ------------------------------------------------------------------ */

const GRADIENT_STOPS: Record<ColorScale, string[]> = {
  warm: ['rgb(102,87,0)', 'rgb(224,177,21)', 'rgb(124,65,60)'],
  cool: ['rgb(124,65,60)', 'rgb(246,212,203)', 'rgb(124,65,60)'],
  divergent: ['rgb(124,65,60)', 'rgb(246,212,203)', 'rgb(124,65,60)'],
};

const SCALE_LABELS: Record<ColorScale, string> = {
  warm: 'Warm (Green \u2192 Yellow \u2192 Red)',
  cool: 'Cool (Blue \u2192 Purple \u2192 Red)',
  divergent: 'Divergent (Blue \u2192 White \u2192 Red)',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HeatmapLegend({
  colorScale,
  minValue,
  maxValue,
  label,
  className = '',
}: HeatmapLegendProps) {
  const gradientCSS = useMemo(() => {
    const stops = GRADIENT_STOPS[colorScale];
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [colorScale]);

  const safeMin = minValue ?? 0;
  const safeMax = maxValue ?? 100;
  const midValue = (safeMin + safeMax) / 2;

  return (
    <div
      className={`flex flex-col gap-1 ${className}`}
      role="img"
      aria-label={`Color legend: ${SCALE_LABELS[colorScale]}, range ${safeMin.toFixed(1)} to ${safeMax.toFixed(1)}`}
    >
      {/* Scale label */}
      {label && (
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
          {label}
        </span>
      )}

      {/* Gradient bar */}
      <div
        className="h-3 w-full rounded-sm border border-[var(--color-border)]"
        style={{ background: gradientCSS }}
      />

      {/* Min / Mid / Max labels */}
      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[var(--color-muted-foreground)]">
        <span>{safeMin.toFixed(1)}</span>
        <span>{midValue.toFixed(1)}</span>
        <span>{safeMax.toFixed(1)}</span>
      </div>

      {/* Scale name */}
      <span className="text-[10px] text-[var(--color-muted-foreground)] italic">
        {SCALE_LABELS[colorScale]}
      </span>
    </div>
  );
}

HeatmapLegend.displayName = 'HeatmapLegend';
