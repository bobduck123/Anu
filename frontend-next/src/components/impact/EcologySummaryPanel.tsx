'use client';

import { Leaf, Layers3, Orbit, Sprout, Waves } from 'lucide-react';
import { FloraFaunaEcology } from '@/lib/api/floraFaunaApi';

interface EcologySummaryPanelProps {
  ecology: FloraFaunaEcology | null;
  compact?: boolean;
}

const nutrientLabels: Array<{
  key: keyof FloraFaunaEcology['nutrientVector'];
  label: string;
  color: string;
}> = [
  { key: 'careIndex', label: 'Care', color: '#4f7c5f' },
  { key: 'reciprocityIndex', label: 'Reciprocity', color: '#2f6f73' },
  { key: 'resonanceIndex', label: 'Resonance', color: '#9a6b2f' },
  { key: 'originalityIndex', label: 'Originality', color: '#a1423d' },
  { key: 'stewardshipIndex', label: 'Stewardship', color: '#3f5c8a' },
  { key: 'mycelialDensityIndex', label: 'Mycelial Density', color: '#6a4e8d' },
];

export default function EcologySummaryPanel({
  ecology,
  compact = false,
}: EcologySummaryPanelProps) {
  if (!ecology) {
    return (
      <div className="card-civic">
        <p className="text-sm text-[var(--color-earth-medium)]">
          No nutrient snapshots yet. Ecology identity appears after the first recompute.
        </p>
      </div>
    );
  }

  return (
    <section
      className="card-civic overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at top right, rgba(79,124,95,0.12), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,244,240,0.95))',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)] bg-[var(--color-forest-light)] mb-3">
            <Leaf className="w-3.5 h-3.5" />
            Computed Ecology
          </div>
          <h3
            className="text-2xl text-[var(--color-earth-dark)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {ecology.ecologyIdentity}
          </h3>
          <p className="text-sm text-[var(--color-earth-medium)] mt-2 max-w-xl">
            Identity is inferred from nutrient snapshots, not fixed badges.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[220px]">
          <div className="rounded-2xl bg-white/75 border border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--color-earth-medium)]">
              <Orbit className="w-3.5 h-3.5" />
              Confidence
            </div>
            <p className="mt-2 text-2xl font-semibold font-mono-data text-[var(--color-earth-dark)]">
              {Math.round(ecology.identityConfidence * 100)}%
            </p>
          </div>
          <div className="rounded-2xl bg-white/75 border border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--color-earth-medium)]">
              <Layers3 className="w-3.5 h-3.5" />
              Geology
            </div>
            <p className="mt-2 text-lg font-semibold text-[var(--color-earth-dark)]">
              {ecology.geology.formKey}
            </p>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]'}`}>
        <div className="space-y-3">
          {nutrientLabels.map((item) => {
            const value = ecology.nutrientVector[item.key];
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-[var(--color-earth-dark)] font-medium">{item.label}</span>
                  <span className="font-mono-data text-[var(--color-earth-medium)]">
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(6, value * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/70 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-earth-medium)]">
            <Waves className="w-3.5 h-3.5" />
            Geological Form
          </div>
          <p className="mt-3 text-[var(--color-earth-dark)] leading-relaxed">
            {ecology.geology.strataSummary}
          </p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              ['Permeability', ecology.geology.permeabilityIndex],
              ['Volatility', ecology.geology.volatilityIndex],
              ['Stability', ecology.geology.stabilityIndex],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[var(--color-muted)] px-3 py-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-earth-medium)]">
                  {label}
                </p>
                <p className="text-lg font-semibold font-mono-data text-[var(--color-earth-dark)] mt-1">
                  {Math.round(Number(value) * 100)}%
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {ecology.dominantNutrients.map((nutrient) => (
              <span
                key={nutrient}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-[var(--color-institutional-light)] text-[var(--color-institutional)]"
              >
                <Sprout className="w-3 h-3" />
                {nutrient}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
