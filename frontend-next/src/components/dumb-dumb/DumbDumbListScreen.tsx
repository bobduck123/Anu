'use client';

import Link from 'next/link';
import { ArrowLeft, Eye, User2 } from 'lucide-react';
import type { DumbDumbList } from '@/lib/api/dumbDumbApi';
import { DumbDumbItemCard } from './DumbDumbItemCard';

interface DumbDumbListScreenProps {
  list: DumbDumbList;
}

export function DumbDumbListScreen({ list }: DumbDumbListScreenProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/dumb-dumb" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] transition-colors hover:text-[var(--color-forest)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Dumb Dumb Mode
        </Link>

        <section className="mt-8 rounded-[2rem] border border-[rgba(30,2,39,0.1)] bg-[linear-gradient(135deg,rgba(246,212,203,0.76),rgba(246,212,203,0.94),rgba(246,212,203,0.86))] px-6 py-10 shadow-[0_24px_44px_-32px_rgba(30,2,39,0.45)] sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Public parody list</p>
              <h1 className="mt-3 text-4xl font-semibold text-[var(--color-earth-dark)] sm:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
                {list.title}
              </h1>
              <p className="mt-4 text-lg leading-8 text-[var(--color-earth-medium)]">{list.intro_text}</p>
            </div>

            <div className="rounded-[1.6rem] border border-[color:rgba(246,212,203,0.7)] bg-[color:rgba(246,212,203,0.85)] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-institutional-light)] text-[var(--color-institutional)]">
                  <User2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Creator</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-earth-dark)]">{list.owner?.pseudonym}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                <Eye className="h-4 w-4" />
                Impact copy is stronger than the joke copy on every item.
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-[rgba(124,65,60,0.15)] bg-[color:rgba(246,212,203,0.82)] p-5">
            <p className="text-sm leading-7 text-[var(--color-earth-dark)]">
              <strong className="text-[var(--color-forest)]">Transparent satire disclaimer:</strong> {list.parody_disclaimer}
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Items</p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Fund the real outcome shown on each card
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(list.items || []).map((item) => (
              <DumbDumbItemCard key={item.id} item={item} href={`/dumb-dumb/${list.slug}/${item.id}`} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
