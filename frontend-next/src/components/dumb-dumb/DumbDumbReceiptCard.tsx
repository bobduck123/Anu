'use client';

import Link from 'next/link';
import { BadgeCheck, Share2 } from 'lucide-react';
import { Card } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
import type { DumbDumbPurchase } from '@/lib/api/dumbDumbApi';
import { dumbDumbVisual, formatMoney } from '@/lib/dumbDumb';

interface DumbDumbReceiptCardProps {
  purchase: DumbDumbPurchase;
}

export function DumbDumbReceiptCard({ purchase }: DumbDumbReceiptCardProps) {
  const item = purchase.item;
  if (!item || !purchase.list) return null;

  return (
    <Card
      padding="lg"
      className="overflow-hidden border-[rgba(30,2,39,0.16)] bg-[linear-gradient(180deg,rgba(246,212,203,0.98),rgba(246,212,203,0.54))]"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-light)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-forest)]">
            <BadgeCheck className="h-4 w-4" />
            Receipt
          </div>
          <h2 className="mt-4 text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Payment confirmed
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-earth-medium)]">
            This purchase used a parody item as the wrapper. The funds were directed to the real cause shown below.
          </p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-[rgba(30,2,39,0.12)] bg-[var(--color-foreground)] text-4xl">
          {dumbDumbVisual(item)}
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[color:rgba(246,212,203,0.8)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Parody item bought</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-earth-dark)]">{item.title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-earth-medium)]">{item.parody_description}</p>
          <p className="mt-4 text-lg font-semibold font-mono-data text-[var(--color-institutional)]">
            {formatMoney(purchase.amount_cents, purchase.currency)}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(124,65,60,0.14)] bg-[var(--color-sage-light)]/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-forest)]">Actually funded</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-earth-dark)]">{item.impact_title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-earth-medium)]">{item.impact_description}</p>
          <p className="mt-4 text-sm text-[var(--color-forest)]">{item.destination_pool.name}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.navigator.clipboard?.writeText(window.location.href);
            }
          }}
        >
          <Share2 className="h-4 w-4" />
          Copy receipt link
        </Button>
        <Link
          href={`/dumb-dumb/${purchase.list.slug}`}
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-earth-dark)] transition-colors hover:bg-[var(--color-muted)]"
        >
          Back to list
        </Link>
      </div>
    </Card>
  );
}
