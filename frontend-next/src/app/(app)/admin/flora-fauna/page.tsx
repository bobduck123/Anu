'use client';

import { startTransition, useEffect, useState } from 'react';
import { BadgeDollarSign, Flag, HandCoins } from 'lucide-react';
import floraFaunaApi, {
  FloraFaunaAllocationRequest,
  FloraFaunaModerationCase,
  FloraFaunaRevenueEvent,
  formatFloraFaunaApiError,
} from '@/lib/api/floraFaunaApi';
import { brand } from '@/lib/brand';

export default function AdminFloraFaunaPage() {
  const [revenueEvents, setRevenueEvents] = useState<FloraFaunaRevenueEvent[]>([]);
  const [allocationRequests, setAllocationRequests] = useState<FloraFaunaAllocationRequest[]>([]);
  const [moderationCases, setModerationCases] = useState<FloraFaunaModerationCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      setIsLoading(true);
      setError(null);
    });

    void Promise.allSettled([
      floraFaunaApi.listRevenueEvents(12, { signal: controller.signal }),
      floraFaunaApi.listAllocationRequests(12, undefined, { signal: controller.signal }),
      floraFaunaApi.listModerationCases(12, undefined, { signal: controller.signal }),
    ]).then(([revenue, allocations, moderation]) => {
      if (controller.signal.aborted) return;

      startTransition(() => {
        setRevenueEvents(revenue.status === 'fulfilled' ? revenue.value.events : []);
        setAllocationRequests(allocations.status === 'fulfilled' ? allocations.value.requests : []);
        setModerationCases(moderation.status === 'fulfilled' ? moderation.value.cases : []);
        setIsLoading(false);

        const firstError = [revenue, allocations, moderation].find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        );
        setError(
          firstError
            ? formatFloraFaunaApiError(firstError.reason, `Unable to load ${brand.name} operations data.`)
            : null,
        );
      });
    });

    return () => controller.abort();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-2">
          Admin Dashboard
        </p>
        <h1 className="text-4xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
          {brand.name} Operations
        </h1>
        <p className="text-[var(--color-earth-medium)] mt-3 max-w-3xl">
          Revenue attribution, allocation queues, and moderation state from the live memetics service.
        </p>
        {error && (
          <p className="text-sm text-[var(--color-danger)] mt-3">{error}</p>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="card-civic">
          <div className="flex items-center gap-2 mb-4">
            <BadgeDollarSign className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Revenue Events
            </h2>
          </div>
          <div className="space-y-3">
            {revenueEvents.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-medium)]">
                {isLoading ? 'Loading revenue events...' : 'No revenue events available.'}
              </p>
            ) : revenueEvents.map((event) => (
              <div key={event.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4">
                <p className="font-semibold text-[var(--color-earth-dark)]">{event.sourceType}</p>
                <p className="text-sm text-[var(--color-earth-medium)] mt-1">{event.memo || event.channel?.title || event.subscription?.username}</p>
                <p className="text-xl font-semibold font-mono-data text-[var(--color-earth-dark)] mt-3">
                  ${(event.netAmountCents / 100).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-civic">
          <div className="flex items-center gap-2 mb-4">
            <HandCoins className="w-4 h-4 text-[var(--color-forest)]" />
            <h2 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Allocation Requests
            </h2>
          </div>
          <div className="space-y-3">
            {allocationRequests.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-medium)]">
                {isLoading ? 'Loading allocation requests...' : 'No allocation requests available.'}
              </p>
            ) : allocationRequests.map((request) => (
              <div key={request.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4">
                <p className="font-semibold text-[var(--color-earth-dark)]">{request.purpose}</p>
                <p className="text-sm text-[var(--color-earth-medium)] mt-1">{request.pool?.name || request.poolId}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.14em] text-[var(--color-earth-medium)]">{request.status}</span>
                  <span className="font-semibold font-mono-data text-[var(--color-earth-dark)]">
                    ${(request.amountCents / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-civic">
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-4 h-4 text-[var(--color-institutional)]" />
            <h2 className="text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
              Moderation Cases
            </h2>
          </div>
          <div className="space-y-3">
            {moderationCases.length === 0 ? (
              <p className="text-sm text-[var(--color-earth-medium)]">
                {isLoading ? 'Loading moderation cases...' : 'No moderation cases available.'}
              </p>
            ) : moderationCases.map((caseItem) => (
              <div key={caseItem.id} className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-4">
                <p className="font-semibold text-[var(--color-earth-dark)]">{caseItem.summary}</p>
                <p className="text-sm text-[var(--color-earth-medium)] mt-1">
                  {caseItem.meme?.title || caseItem.channel?.title || 'Channel-wide case'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.14em] text-[var(--color-earth-medium)]">{caseItem.status}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">{caseItem.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
