'use client';

import { Activity, Dot } from 'lucide-react';
import { Card } from '@/ui-system/primitives/Card';
import type { DumbDumbActivityEntry } from '@/lib/api/dumbDumbApi';
import { formatMoney, formatRelativeTime } from '@/lib/dumbDumb';

interface DumbDumbActivityFeedProps {
  entries: DumbDumbActivityEntry[];
}

export function DumbDumbActivityFeed({ entries }: DumbDumbActivityFeedProps) {
  return (
    <Card
      padding="lg"
      className="border-[rgba(30,58,95,0.12)] bg-[linear-gradient(180deg,rgba(30,58,95,0.03),rgba(255,255,255,0.96))]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-institutional-light)] text-[var(--color-institutional)]">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Live-ish activity</p>
          <h3 className="text-xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Recent mutual-aid purchases
          </h3>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-[var(--color-border)] bg-white/90 px-4 py-3 shadow-[0_8px_24px_-20px_rgba(44,36,27,0.3)]"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-earth-dark)]">
              <span className="font-semibold">{entry.buyer_name}</span>
              <span>bought</span>
              <span className="font-semibold">{entry.parody_title}</span>
              <Dot className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span className="text-[var(--color-forest)]">funded {entry.impact_title}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
              <span>{entry.pool_name}</span>
              <span>{formatMoney(entry.amount_cents)} · {formatRelativeTime(entry.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
