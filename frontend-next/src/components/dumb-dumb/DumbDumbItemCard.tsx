'use client';

import Link from 'next/link';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import { Card } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
import type { DumbDumbItem } from '@/lib/api/dumbDumbApi';
import { dumbDumbVisual, formatMoney } from '@/lib/dumbDumb';

interface DumbDumbItemCardProps {
  item: DumbDumbItem;
  href?: string;
  onBuy?: () => void;
  actionLabel?: string;
}

export function DumbDumbItemCard({ item, href, onBuy, actionLabel = 'Fund this instead' }: DumbDumbItemCardProps) {
  const content = (
    <Card
      padding="lg"
      className="group relative h-full overflow-hidden border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,249,247,0.96))] shadow-[0_18px_36px_-28px_rgba(30,58,95,0.45)]"
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(30,58,95,0.55),transparent)]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-[var(--color-institutional-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">
            Parody item
          </span>
          <h3 className="mt-4 text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            {item.title}
          </h3>
        </div>
        <div
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-[rgba(30,58,95,0.12)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(224,232,240,0.95))] text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
        >
          {item.image_url ? (
            <img src={item.image_url} alt="" className="h-14 w-14 rounded-[1.15rem] object-cover" />
          ) : (
            dumbDumbVisual(item)
          )}
        </div>
      </div>

      <p className="mt-4 min-h-[3rem] text-sm leading-6 text-[var(--color-earth-medium)]">
        {item.parody_description}
      </p>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Price</p>
          <p className="mt-1 text-3xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
            {formatMoney(item.price_cents, item.currency)}
          </p>
        </div>
        <div className="rounded-full border border-[rgba(45,90,61,0.18)] bg-[var(--color-sage-light)] px-3 py-1.5 text-xs font-semibold text-[var(--color-forest)]">
          {item.destination_pool.name}
        </div>
      </div>

      <div className="mt-6 rounded-[1.35rem] border border-[rgba(45,90,61,0.14)] bg-[linear-gradient(180deg,rgba(232,240,228,0.88),rgba(255,255,255,0.92))] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-forest)]">
          <HeartHandshake className="h-4 w-4" />
          {item.actual_funds_label}
        </div>
        <p className="mt-2 text-base font-semibold text-[var(--color-earth-dark)]">{item.impact_title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--color-earth-medium)]">{item.impact_description}</p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {item.quantity_remaining != null ? `${item.quantity_remaining} remaining in this funding slot` : 'Open-ended funding target'}
        </p>
        {onBuy ? (
          <Button variant="forest" size="sm" onClick={onBuy} disabled={item.is_sold_out}>
            {item.is_sold_out ? 'Sold out' : actionLabel}
          </Button>
        ) : href ? (
          <Link
            href={href}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-forest)] px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:brightness-95"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </Card>
  );

  return content;
}
