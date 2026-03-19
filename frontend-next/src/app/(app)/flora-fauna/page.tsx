'use client';

import Link from 'next/link';
import { startTransition, useEffect, useState } from 'react';
import { ArrowRight, Coins, Orbit, Share2, Sparkles } from 'lucide-react';
import EcologySummaryPanel from '@/components/impact/EcologySummaryPanel';
import { useAuth } from '@/contexts/AuthContext';
import { brand, manaraPath } from '@/lib/brand';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import floraFaunaApi, {
  FloraFaunaChannel,
  FloraFaunaFeedResponse,
  FloraFaunaPool,
  formatFloraFaunaApiError,
} from '@/lib/api/floraFaunaApi';

export default function FloraFaunaFeedPage() {
  const { isAuthenticated } = useAuth();
  const [feed, setFeed] = useState<FloraFaunaFeedResponse['feed']>([]);
  const [channel, setChannel] = useState<FloraFaunaChannel | null>(null);
  const [pool, setPool] = useState<FloraFaunaPool | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionableError = error
    ? toActionableSurfaceError({
        area: 'Manara feed',
        rawMessage: error,
        fallbackHref: '/community',
        fallbackLabel: 'Open community fallback',
      })
    : null;

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      setError(null);
    });

    void Promise.allSettled([
      floraFaunaApi.getFeed({ signal: controller.signal }),
      floraFaunaApi.listChannels(1, { signal: controller.signal }),
      floraFaunaApi.listPools(1, { signal: controller.signal }),
    ]).then(([feedResult, channelsResult, poolsResult]) => {
      if (controller.signal.aborted) {
        return;
      }

      startTransition(() => {
        if (feedResult.status === 'fulfilled') {
          setFeed(feedResult.value.feed);
        } else {
          setFeed([]);
        }

        if (channelsResult.status === 'fulfilled') {
          setChannel(channelsResult.value.channels[0] || null);
        } else {
          setChannel(null);
        }

        if (poolsResult.status === 'fulfilled') {
          setPool(poolsResult.value.pools[0] || null);
        } else {
          setPool(null);
        }

        const firstError = [feedResult, channelsResult, poolsResult].find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        );
        setError(firstError ? formatFloraFaunaApiError(firstError.reason, `Unable to load ${brand.name} feed`) : null);
      });
    });

    return () => controller.abort();
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 20% 0%, rgba(242,199,134,0.14), transparent 28%), radial-gradient(circle at 86% 8%, rgba(63,110,160,0.18), transparent 34%), linear-gradient(180deg,#0a1322_0%,#08111e_60%,#08101a_100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        {actionableError ? (
          <div className="rounded-2xl border border-amber-300/34 bg-[linear-gradient(152deg,rgba(39,29,12,0.92),rgba(24,17,8,0.92))] p-5 text-amber-100">
            <p className="text-sm font-semibold text-amber-200">{actionableError.headline}</p>
            <p className="mt-2 text-sm text-amber-100/92">{actionableError.detail}</p>
            <Link
              href={actionableError.fallbackHref}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-100/30 bg-amber-200/8 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-200/16"
            >
              {actionableError.fallbackLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        {!isAuthenticated ? (
          <div className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Start here</p>
            <p className="mt-2 text-sm text-slate-300">
              New here? Begin with Manara Signals, then review Transparency and Docs before signing in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <Link href="/manara" className="rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-slate-100 hover:bg-white/12">Manara feed</Link>
              <Link href="/transparency" className="rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-slate-100 hover:bg-white/12">Transparency</Link>
              <Link href="/docs" className="rounded-full border border-white/14 bg-white/6 px-3 py-1.5 text-slate-100 hover:bg-white/12">Docs</Link>
            </div>
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <div className="relative overflow-hidden rounded-[1.7rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,19,34,0.9),rgba(8,15,28,0.92))] p-6 text-slate-100 shadow-[0_24px_72px_-40px_rgba(0,0,0,0.95)] md:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2d5a3d_0%,#1e3a5f_45%,#d97706_100%)]" />
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8fba9d]/30 bg-[#8fba9d]/16 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8f1e3]">
              <Sparkles className="h-3.5 w-3.5" />
              {brand.memeticsTitle}
            </div>
            <h1
              className="max-w-4xl text-4xl text-white md:text-6xl"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Memes stay free.
              <br />
              Attention funds the commons.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              This subsystem tracks creator channels, remix lineage, nutrient-driven ecology identity,
              and ledger-backed liquidity pools without ever turning the meme itself into merchandise.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['Share Policy', 'Free + forkable'],
                ['Revenue Split', 'Creator / Platform / Pool'],
                ['Audit Trail', 'Domain events on every major action'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.15rem] border border-white/12 bg-white/[0.05] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <EcologySummaryPanel ecology={channel?.ecology ?? null} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Meme Feed
                </p>
                <h2 className="text-3xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  Shareable spores
                </h2>
              </div>
              {channel && (
                <Link
                  href={manaraPath(`/channels/${channel.id}`)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#f3cd92]"
                >
                  Visit creator channel
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="grid gap-5">
              {feed.length === 0 ? (
                <div className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                  <p className="text-slate-300">No memes published yet, or the memetics service is unavailable.</p>
                </div>
              ) : feed.map((meme) => (
                <Link
                  key={meme.id}
                  href={manaraPath(`/memes/${meme.id}`)}
                  className="group rounded-[1.5rem] border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100 transition-colors hover:border-white/20"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#8fba9d]/30 bg-[#8fba9d]/16 px-3 py-1 text-xs font-semibold text-[#d8f1e3]">
                      <Share2 className="h-3 w-3" />
                      Free meme
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#8cb4de]/28 bg-[#8cb4de]/16 px-3 py-1 text-xs font-semibold text-[#d4e7fb]">
                      <Orbit className="h-3 w-3" />
                      {meme.ecology?.ecologyIdentity || 'Awaiting ecology'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <h3 className="text-2xl text-white transition-colors group-hover:text-[#f3cd92]">
                        {meme.title}
                      </h3>
                      <p className="mt-3 leading-relaxed text-slate-300">
                        {meme.summary || 'Free cultural matter for cooperative propagation.'}
                      </p>
                    </div>
                    <div className="min-w-[180px] rounded-[1.15rem] border border-white/12 bg-white/[0.05] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Attention score</p>
                      <p className="mt-2 text-3xl font-semibold font-mono-data text-white">
                        {Math.round(Number(meme.attentionScore || 0) * 100)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
                    <span className="text-slate-300">
                      Channel: <strong className="text-white">{meme.channel?.title}</strong>
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-[#f3cd92]">
                      Open meme page
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            {channel && (
              <div className="rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Creator Channel</p>
                <h3 className="text-2xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  {channel.title}
                </h3>
                <p className="mt-3 leading-relaxed text-slate-300">{channel.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Share policy</span>
                  <strong className="text-[#d8f1e3]">{channel.sharePolicy}</strong>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Open moderation flags</span>
                  <strong className="font-mono-data text-white">{channel.moderation.openFlags}</strong>
                </div>
              </div>
            )}

            {pool && (
              <Link href={manaraPath(`/pools/${pool.id}`)} className="block rounded-2xl border border-white/12 bg-[linear-gradient(152deg,rgba(8,16,29,0.9),rgba(7,13,24,0.92))] p-5 text-slate-100 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Mutual-Aid Liquidity Pool</p>
                    <h3 className="text-2xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                      {pool.name}
                    </h3>
                  </div>
                  <Coins className="h-7 w-7 text-[#f3cd92]" />
                </div>
                <p className="mt-3 text-slate-300">{pool.description}</p>
                <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Available balance</p>
                    <p className="mt-2 text-3xl font-semibold font-mono-data text-white">
                      ${(pool.availableBalanceCents / 100).toLocaleString()}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#f3cd92]">
                    Inspect ledger
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
