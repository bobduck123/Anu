'use client';

import { ShieldCheck } from 'lucide-react';
import { Card } from '@/ui-system/primitives/Card';

interface DumbDumbTransparencyNoteProps {
  headline: string;
  body: string;
  points: string[];
}

export function DumbDumbTransparencyNote({ headline, body, points }: DumbDumbTransparencyNoteProps) {
  return (
    <Card
      padding="lg"
      className="border-[rgba(45,90,61,0.18)] bg-[linear-gradient(135deg,rgba(232,240,228,0.92),rgba(255,255,255,0.98))]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-forest)] text-white shadow-[0_14px_24px_-18px_rgba(45,90,61,0.8)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-forest)]">Transparency</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            {headline}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-earth-medium)]">{body}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {points.map((point) => (
              <div key={point} className="rounded-2xl border border-white/70 bg-white/70 px-4 py-4 text-sm leading-6 text-[var(--color-earth-dark)]">
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
