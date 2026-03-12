'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { startTransition, useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import EcologySummaryPanel from '@/components/impact/EcologySummaryPanel';
import { brand, manaraPath } from '@/lib/brand';
import floraFaunaApi, { FloraFaunaChannel, formatFloraFaunaApiError } from '@/lib/api/floraFaunaApi';

export default function FloraFaunaChannelPage() {
  const params = useParams<{ channelId: string }>();
  const channelId = params?.channelId || '';
  const [channel, setChannel] = useState<FloraFaunaChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) {
      return;
    }
    const controller = new AbortController();

    startTransition(() => {
      setChannel(null);
      setError(null);
    });

    void floraFaunaApi.getChannel(channelId, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted) return;
      startTransition(() => setChannel(data));
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setError(formatFloraFaunaApiError(err, `Unable to load ${brand.name} creator channel`));
    });

    return () => controller.abort();
  }, [channelId]);

  if (!channelId) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">Missing channel identifier.</div>;
  }

  if (!channel && !error) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">Loading channel...</div>;
  }

  if (!channel) {
    return <div className="min-h-screen pt-28 px-4 md:px-8">{error || 'Channel unavailable.'}</div>;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(180deg, rgba(224,235,227,0.55) 0%, rgba(250,249,247,1) 38%), var(--color-background)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 space-y-8">
        <section className="card-civic">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-institutional)] bg-[var(--color-institutional-light)] mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Creator Channel
              </div>
              <h1 className="text-4xl md:text-5xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {channel.title}
              </h1>
              <p className="mt-4 text-lg text-[var(--color-earth-medium)] leading-relaxed">
                {channel.description}
              </p>
              <p className="mt-5 rounded-[1.5rem] border border-[var(--color-border)] bg-white/80 px-5 py-5 text-[var(--color-earth-dark)] leading-relaxed">
                {channel.manifesto}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-white/75 px-5 py-5 min-w-[260px]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Operating Rules
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--color-earth-medium)]">Share policy</span>
                  <strong className="text-[var(--color-forest)]">{channel.sharePolicy}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--color-earth-medium)]">Open flags</span>
                  <strong className="font-mono-data text-[var(--color-earth-dark)]">{channel.moderation.openFlags}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[var(--color-earth-medium)]">Open cases</span>
                  <strong className="font-mono-data text-[var(--color-earth-dark)]">{channel.moderation.openCases}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <EcologySummaryPanel ecology={channel.ecology} />

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-2">
                Published Memes
              </p>
              <h2 className="text-3xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                Lineage-ready pieces
              </h2>
            </div>
            <Link
              href={manaraPath()}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-institutional)]"
            >
              Back to feed
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {channel.memes.map((meme) => (
              <Link
                key={meme.id}
                href={manaraPath(`/memes/${meme.id}`)}
                className="card-civic"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,247,243,0.92))',
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-2">
                  Meme
                </p>
                <h3 className="text-2xl text-[var(--color-earth-dark)]">{meme.title}</h3>
                <p className="mt-3 text-[var(--color-earth-medium)]">{meme.summary}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-institutional)]">
                  Open meme page
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
