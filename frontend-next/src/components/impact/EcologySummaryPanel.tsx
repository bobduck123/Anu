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
  { key: 'careIndex', label: 'Care', color: '#7c413c' },
  { key: 'reciprocityIndex', label: 'Reciprocity', color: '#7c413c' },
  { key: 'resonanceIndex', label: 'Resonance', color: '#7c413c' },
  { key: 'originalityIndex', label: 'Originality', color: '#7c413c' },
  { key: 'stewardshipIndex', label: 'Stewardship', color: '#7c413c' },
  { key: 'mycelialDensityIndex', label: 'Mycelial Density', color: '#7c413c' },
];

export default function EcologySummaryPanel({
  ecology,
  compact = false,
}: EcologySummaryPanelProps) {
  if (!ecology) {
    return (
      <div className="rounded-2xl border border-[color:rgba(246,212,203,0.12)] bg-[linear-gradient(152deg,rgba(30,2,39,0.9),rgba(30,2,39,0.92))] p-5 text-[color:rgba(246,212,203,0.92)]">
        <p className="text-sm text-[color:rgba(246,212,203,0.76)]">
          No nutrient snapshots yet. Ecology identity appears after the first recompute.
        </p>
      </div>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-[1.7rem] border border-[color:rgba(246,212,203,0.12)] bg-[linear-gradient(152deg,rgba(30,2,39,0.9),rgba(30,2,39,0.92))] p-5 text-[color:rgba(246,212,203,0.92)] shadow-[0_24px_72px_-40px_rgba(30,2,39,0.95)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/30 bg-[#f6d4cb]/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f6d4cb]">
            <Leaf className="h-3.5 w-3.5" />
            Computed Ecology
          </div>
          <h3 className="text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
            {ecology.ecologyIdentity}
          </h3>
          <p className="mt-2 max-w-xl text-sm text-[color:rgba(246,212,203,0.76)]">
            Identity is inferred from nutrient snapshots, not fixed badges.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[220px]">
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.64)]">
              <Orbit className="h-3.5 w-3.5" />
              Confidence
            </div>
            <p className="mt-2 text-2xl font-semibold font-mono-data text-[var(--color-foreground)]">
              {Math.round(ecology.identityConfidence * 100)}%
            </p>
          </div>
          <div className="rounded-2xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.64)]">
              <Layers3 className="h-3.5 w-3.5" />
              Geology
            </div>
            <p className="mt-2 text-lg font-semibold text-[var(--color-foreground)]">{ecology.geology.formKey}</p>
          </div>
        </div>
      </div>

      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]'}`}>
        <div className="space-y-3">
          {nutrientLabels.map((item) => {
            const value = ecology.nutrientVector[item.key];
            return (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-medium text-[color:rgba(246,212,203,0.84)]">{item.label}</span>
                  <span className="font-mono-data text-[color:rgba(246,212,203,0.64)]">{Math.round(value * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[color:rgba(246,212,203,0.12)]">
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

        <div className="rounded-[1.5rem] border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">
            <Waves className="h-3.5 w-3.5" />
            Geological Form
          </div>
          <p className="mt-3 leading-relaxed text-[color:rgba(246,212,203,0.84)]">{ecology.geology.strataSummary}</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['Permeability', ecology.geology.permeabilityIndex],
              ['Volatility', ecology.geology.volatilityIndex],
              ['Stability', ecology.geology.stabilityIndex],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.26)] px-3 py-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.64)]">{label}</p>
                <p className="mt-1 text-lg font-semibold font-mono-data text-[var(--color-foreground)]">{Math.round(Number(value) * 100)}%</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {ecology.dominantNutrients.map((nutrient) => (
              <span
                key={nutrient}
                className="inline-flex items-center gap-1 rounded-full border border-[#f6d4cb]/28 bg-[#f6d4cb]/16 px-3 py-1 text-xs font-semibold text-[#f6d4cb]"
              >
                <Sprout className="h-3 w-3" />
                {nutrient}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
