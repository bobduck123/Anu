'use client';

import Link from 'next/link';
import { ArrowRight, CircleHelp, HandHeart, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { DumbDumbHubPayload } from '@/lib/api/dumbDumbApi';
import { formatMoney } from '@/lib/dumbDumb';
import { DumbDumbActivityFeed } from './DumbDumbActivityFeed';
import { DumbDumbItemCard } from './DumbDumbItemCard';
import { DumbDumbTransparencyNote } from './DumbDumbTransparencyNote';

interface DumbDumbHubScreenProps {
  data: DumbDumbHubPayload;
}

export function DumbDumbHubScreen({ data }: DumbDumbHubScreenProps) {
  const { isAuthenticated } = useAuth();
  const demoList = data.featured_lists[0];

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <section className="relative overflow-hidden border-b border-[rgba(30,58,95,0.08)] bg-[linear-gradient(135deg,rgba(224,232,240,0.72),rgba(255,255,255,0.96)_42%,rgba(232,240,228,0.82))]">
        <div className="pointer-events-none absolute -left-24 top-12 h-56 w-56 rounded-full bg-[rgba(30,58,95,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[rgba(45,90,61,0.1)] blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(30,58,95,0.12)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-institutional)]">
                <Sparkles className="h-4 w-4" />
                Transparent satire
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-[var(--color-earth-dark)] sm:text-6xl" style={{ fontFamily: 'var(--font-serif)' }}>
                {data.hero.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--color-earth-medium)]">
                {data.hero.subtitle}
              </p>
              <div className="mt-8 rounded-[1.5rem] border border-[rgba(45,90,61,0.15)] bg-white/80 p-5">
                <p className="text-sm leading-7 text-[var(--color-earth-dark)]">
                  <strong className="text-[var(--color-forest)]">Important:</strong> {data.hero.disclaimer}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#lists"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-institutional)] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:brightness-95"
                >
                  Browse lists
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {demoList ? (
                  <Link
                    href={`/dumb-dumb/${demoList.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-white/80 px-6 py-3 text-sm font-medium text-[var(--color-earth-dark)] transition-colors hover:bg-[var(--color-muted)]"
                  >
                    View demo list
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.7rem] border border-white/70 bg-white/78 p-5 shadow-[0_20px_40px_-30px_rgba(30,58,95,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Total directed</p>
                <p className="mt-3 text-4xl font-semibold font-mono-data text-[var(--color-earth-dark)]">
                  {formatMoney(data.stats.total_raised_cents)}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-white/70 bg-white/78 p-5 shadow-[0_20px_40px_-30px_rgba(30,58,95,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Featured creators</p>
                <p className="mt-3 text-4xl font-semibold font-mono-data text-[var(--color-earth-dark)]">{data.stats.lists}</p>
              </div>
              <div className="rounded-[1.7rem] border border-white/70 bg-white/78 p-5 shadow-[0_20px_40px_-30px_rgba(30,58,95,0.55)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Recent purchases</p>
                <p className="mt-3 text-4xl font-semibold font-mono-data text-[var(--color-earth-dark)]">{data.stats.recent_purchases}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        <section aria-labelledby="how-it-works">
          <div className="flex items-center gap-3">
            <CircleHelp className="h-5 w-5 text-[var(--color-institutional)]" />
            <h2 id="how-it-works" className="text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
              How it works
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Choose a parody item', 'Pick a ridiculous object with a clearly marked price.'],
              ['See what it actually funds', 'Each card foregrounds the real mutual-aid pool and impact.'],
              ['Contribute to real mutual aid', 'Checkout and receipt repeat the real destination before money moves.'],
            ].map(([title, body], index) => (
              <div key={title} className="rounded-[1.5rem] border border-[var(--color-border)] bg-white px-5 py-6 shadow-[0_16px_28px_-24px_rgba(44,36,27,0.4)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Step {index + 1}</p>
                <h3 className="mt-3 text-xl font-semibold text-[var(--color-earth-dark)]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--color-earth-medium)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="featured-items">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Featured items</p>
              <h2 id="featured-items" className="mt-2 text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Satire in the wrapper, impact in the headline
              </h2>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {data.featured_items.map((item) => (
              <DumbDumbItemCard key={item.id} item={item} href={`/dumb-dumb/${item.list?.slug || demoList?.slug || ''}/${item.id}`} />
            ))}
          </div>
        </section>

        <section id="lists" aria-labelledby="featured-lists">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Featured creators</p>
            <h2 id="featured-lists" className="mt-2 text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Public Dumb Dumb lists
            </h2>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {data.featured_lists.map((list) => (
              <article key={list.id} className="rounded-[1.7rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_18px_36px_-28px_rgba(44,36,27,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Creator</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {list.owner?.pseudonym}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-institutional)]">{list.title}</p>
                <p className="mt-4 text-sm leading-7 text-[var(--color-earth-medium)]">{list.intro_text}</p>
                <div className="mt-5 flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
                  <span>{list.item_count} items</span>
                  <span>Public satire with explicit destinations</span>
                </div>
                <Link
                  href={`/dumb-dumb/${list.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-forest)] transition-colors hover:text-[var(--color-institutional)]"
                >
                  Open list
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <DumbDumbActivityFeed entries={data.activity_feed} />
          <DumbDumbTransparencyNote
            headline={data.transparency.headline}
            body={data.transparency.body}
            points={data.transparency.points}
          />
        </section>

        <section className="rounded-[2rem] border border-[rgba(30,58,95,0.1)] bg-[linear-gradient(135deg,rgba(30,58,95,0.95),rgba(45,90,61,0.92))] px-6 py-8 text-white shadow-[0_24px_48px_-30px_rgba(30,58,95,0.72)] sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
                <HandHeart className="h-4 w-4" />
                Creator tools
              </div>
              <h2 className="mt-3 text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                Build your own transparent parody list
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/78">
                Create satirical items, map each one to a real pool, and preview the public page before sharing it.
              </p>
            </div>
            <Link
              href={isAuthenticated ? '/dumb-dumb/manage' : '/auth'}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[var(--color-earth-dark)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {isAuthenticated ? 'Create your own list' : 'Sign in to create a list'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
