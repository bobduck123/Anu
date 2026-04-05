'use client';

import Link from 'next/link';
import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import type { DumbDumbItem, DumbDumbList } from '@/lib/api/dumbDumbApi';
import { brand } from '@/lib/brand';
import { dumbDumbVisual, formatMoney } from '@/lib/dumbDumb';

interface DumbDumbWishlistScreenProps {
  list: DumbDumbList;
}

const BOARD_VARIANTS = [
  {
    figureClass: 'md:ml-10 md:mt-6 md:-rotate-[4deg]',
    noteClass: 'items-start text-left md:pl-2',
  },
  {
    figureClass: 'md:mt-0 md:rotate-[6deg]',
    noteClass: 'items-center text-center',
  },
  {
    figureClass: 'md:ml-12 md:mt-2 md:-rotate-[2deg]',
    noteClass: 'items-start text-left md:pl-10',
  },
  {
    figureClass: 'md:ml-14 md:mt-4 md:rotate-[3deg]',
    noteClass: 'items-end text-right md:pr-4',
  },
  {
    figureClass: 'md:ml-2 md:mt-8 md:-rotate-[8deg]',
    noteClass: 'items-start text-left md:pl-8',
  },
  {
    figureClass: 'md:mt-6 md:rotate-[8deg]',
    noteClass: 'items-center text-center',
  },
];

const scriptFont = '"Snell Roundhand", "Segoe Script", "Bradley Hand", cursive';
const handwrittenFont = '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive';

function splitWishlistLabel(value: string): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['Wishlist item'];
  const lines: string[] = [];
  for (let index = 0; index < words.length; index += 2) {
    lines.push(words.slice(index, index + 2).join(' '));
  }
  return lines.slice(0, 4);
}

function renderWishlistFigure(item: DumbDumbItem) {
  if (item.image_url) {
    return (
      <img
        src={item.image_url}
        alt={item.title}
        className="mx-auto h-[220px] w-auto max-w-full object-contain drop-shadow-[0_24px_28px_rgba(30,2,39,0.18)] md:h-[260px]"
      />
    );
  }

  return (
    <div className="flex h-[220px] items-center justify-center md:h-[260px]">
      <div className="flex h-32 w-32 items-center justify-center rounded-[2.2rem] border border-[rgba(30,2,39,0.18)] bg-[radial-gradient(circle_at_top,rgba(246,212,203,0.98),rgba(246,212,203,0.96))] text-6xl shadow-[0_24px_24px_rgba(30,2,39,0.12)]">
        {dumbDumbVisual(item)}
      </div>
    </div>
  );
}

function WishlistBoardItem({ item, listSlug, index }: { item: DumbDumbItem; listSlug: string; index: number }) {
  const variant = BOARD_VARIANTS[index % BOARD_VARIANTS.length];
  const labelLines = splitWishlistLabel(item.title);

  return (
    <Link
      href={`/dumb-dumb/${listSlug}/${item.id}`}
      className="group relative block min-h-[330px] rounded-[1.75rem] p-4 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className={`relative ${variant.figureClass}`}>{renderWishlistFigure(item)}</div>
      <div className={`mt-4 flex ${variant.noteClass}`}>
        <div className="max-w-[220px]">
          <div
            className="text-[1.9rem] leading-[1.02] text-[rgba(30,2,39,0.92)]"
            style={{ fontFamily: handwrittenFont }}
          >
            {labelLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div className="mt-2 h-px w-full max-w-[180px] bg-[rgba(30,2,39,0.5)]" />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[rgba(30,2,39,0.7)]">
            <span>{item.source_site_name || brand.name}</span>
            <span>{formatMoney(item.price_cents, item.currency)}</span>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-8 bottom-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[rgba(30,2,39,0.56)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span>Open mutual-aid listing</span>
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export function DumbDumbWishlistScreen({ list }: DumbDumbWishlistScreenProps) {
  const items = list.items || [];

  return (
    <div className="min-h-screen bg-[#f6d4cb] px-3 py-4 text-[#1e0227] md:px-6 md:py-8">
      <div className="mx-auto max-w-[980px] rounded-[2.25rem] border border-[rgba(30,2,39,0.12)] bg-[#f6d4cb] p-3 shadow-[0_30px_70px_rgba(30,2,39,0.12)] md:p-5">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-[rgba(30,2,39,0.12)] bg-[#f6d4cb] px-4 py-8 md:px-10 md:py-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(30,2,39,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(30,2,39,0.12) 1px, transparent 1px)',
            backgroundSize: '39px 39px',
          }}
        >
          <div className="pointer-events-none absolute -left-6 top-12 h-40 w-72 rounded-full border border-[rgba(30,2,39,0.8)]" />
          <div className="pointer-events-none absolute left-14 top-0 h-32 w-60 rounded-full border border-[rgba(30,2,39,0.8)]" />
          <div className="pointer-events-none absolute left-12 top-6 h-20 w-40 rounded-full border border-[rgba(30,2,39,0.8)]" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-full border border-[rgba(30,2,39,0.14)] bg-[rgba(246,212,203,0.62)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(30,2,39,0.78)]">
                {brand.wishlistHostLabel}
              </div>
              <Link
                href={`/dumb-dumb/${list.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(30,2,39,0.16)] bg-[rgba(246,212,203,0.66)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(30,2,39,0.84)] transition-colors hover:bg-[var(--color-foreground)]"
              >
                Open platform list
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="pt-6 text-center">
              <div className="flex flex-wrap items-end justify-center gap-3 text-center md:gap-4">
                <span className="text-[4.8rem] leading-none md:text-[7.2rem]" style={{ fontFamily: scriptFont }}>
                  Wishlist
                </span>
                <span className="pb-3 text-[2.8rem] leading-none md:pb-4 md:text-[4.4rem]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {list.owner?.pseudonym || list.title}
                </span>
              </div>
              <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-[rgba(30,2,39,0.78)] md:text-base">
                {list.intro_text || 'A discreet share surface for routing attention toward mutual aid.'}
              </p>
            </div>

            <div className="mt-8 grid gap-y-8 md:mt-10 md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {items.map((item, index) => (
                <WishlistBoardItem key={item.id} item={item} listSlug={list.slug} index={index} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-1 pb-1 pt-5 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.6rem] border border-[rgba(30,2,39,0.12)] bg-[rgba(246,212,203,0.72)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(30,2,39,0.64)]">Transparent note</p>
            <p className="mt-3 text-sm leading-7 text-[rgba(30,2,39,0.82)]">
              {list.parody_disclaimer}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-[rgba(124,65,60,0.18)] bg-[linear-gradient(180deg,rgba(246,212,203,0.92),rgba(246,212,203,0.88))] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)]">
              <HeartHandshake className="h-4 w-4" />
              Real destination
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={`impact-${item.id}`}
                  className="rounded-[1.2rem] border border-[rgba(124,65,60,0.12)] bg-[color:rgba(246,212,203,0.82)] px-4 py-3"
                >
                  <p className="text-sm font-semibold text-[var(--color-earth-dark)]">{item.impact_title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-earth-medium)]">{item.impact_description}</p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)]">
                    {item.destination_pool.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
