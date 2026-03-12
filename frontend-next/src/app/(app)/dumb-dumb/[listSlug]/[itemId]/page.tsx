'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { DumbDumbItemCard } from '@/components/dumb-dumb/DumbDumbItemCard';
import { Button } from '@/ui-system/primitives/Button';
import { Card } from '@/ui-system/primitives/Card';
import { dumbDumbApi, type DumbDumbItem } from '@/lib/api/dumbDumbApi';
import { demoLists, formatMoney } from '@/lib/dumbDumb';

export default function DumbDumbItemPage() {
  const params = useParams<{ listSlug: string; itemId: string }>();
  const [item, setItem] = useState<DumbDumbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [missing, setMissing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const listSlug = params.listSlug;
  const itemId = Number(params.itemId);

  useEffect(() => {
    let cancelled = false;
    dumbDumbApi
      .getItem(listSlug, itemId)
      .then((payload) => {
        if (!cancelled) setItem(payload);
      })
      .catch(() => {
        const fallbackList = demoLists.find((list) => list.slug === listSlug);
        const fallbackItem = fallbackList?.items?.find((entry) => entry.id === itemId) || null;
        if (!cancelled) {
          if (fallbackItem) setItem({ ...fallbackItem, list: { id: fallbackList!.id, slug: fallbackList!.slug, title: fallbackList!.title } });
          else setMissing(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    dumbDumbApi.track({
      event_name: 'dumb_dumb_item_click',
      entity_id: String(itemId),
      entity_type: 'dumb_dumb_item',
      props: { item_id: itemId, list_slug: listSlug },
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [itemId, listSlug]);

  const cancelUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/dumb-dumb/${listSlug}/${itemId}`;
  }, [itemId, listSlug]);

  const successUrl = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}/dumb-dumb/success/__PURCHASE_ID__`;
  }, []);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[1.6rem] border border-[var(--color-border)] bg-white px-6 py-8 text-center">
          <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Item not found
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-earth-medium)]">
            This parody item is not public, inactive, or no longer available.
          </p>
          <Link
            href={`/dumb-dumb/${listSlug}`}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-institutional)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const startCheckout = async () => {
    if (!item) return;
    try {
      setSubmitting(true);
      setCheckoutError(null);
      dumbDumbApi.track({
        event_name: 'dumb_dumb_checkout_started',
        entity_id: String(item.id),
        entity_type: 'dumb_dumb_item',
        props: {
          item_id: item.id,
          list_slug: listSlug,
          destination_pool_id: item.destination_pool.id,
        },
      }).catch(() => undefined);
      const res = await dumbDumbApi.checkout({
        item_id: item.id,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      const target = res.checkout_url.replace('__PURCHASE_ID__', String(res.purchase_id));
      window.location.assign(target);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Unable to start checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !item) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href={`/dumb-dumb/${listSlug}`} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] transition-colors hover:text-[var(--color-forest)]">
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <DumbDumbItemCard item={item} onBuy={startCheckout} actionLabel={submitting ? 'Starting checkout...' : 'Fund this cause'} />

          <div className="space-y-6">
            <Card padding="lg" className="border-[rgba(45,90,61,0.18)] bg-[linear-gradient(135deg,rgba(232,240,228,0.96),rgba(255,255,255,0.98))]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-forest)] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-forest)]">Checkout clarity</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
                    You are funding the real cause below
                  </h2>
                </div>
              </div>
              <div className="mt-5 rounded-[1.4rem] border border-white/80 bg-white/78 p-4">
                <p className="text-sm leading-7 text-[var(--color-earth-dark)]">
                  <strong>Parody item:</strong> {item.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-earth-dark)]">
                  <strong>Actually funds:</strong> {item.impact_title}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-earth-medium)]">{item.impact_description}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-earth-dark)]">
                  <strong>Destination pool:</strong> {item.destination_pool.name}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-earth-medium)]">
                  This is a transparent parody flow. You are not purchasing a real product or shipping item.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Contribution</p>
                  <p className="mt-1 text-2xl font-semibold font-mono-data text-[var(--color-earth-dark)]">
                    {formatMoney(item.price_cents, item.currency)}
                  </p>
                </div>
                <Button variant="forest" size="lg" onClick={startCheckout} loading={submitting} disabled={item.is_sold_out}>
                  {item.is_sold_out ? 'Sold out' : 'Continue to checkout'}
                </Button>
              </div>
            </Card>

            <Card padding="lg" className="bg-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Before you pay</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-earth-medium)]">
                <li>Stripe checkout repeats the parody notice and the real pool destination.</li>
                <li>The receipt confirms the satire framing, amount paid, and actual cause funded.</li>
                <li>Admin reporting and ledger entries store the real destination pool, never just the joke title.</li>
              </ul>
            </Card>
            {checkoutError && (
              <Card padding="lg" className="border-[var(--color-danger)] bg-[var(--color-danger-light)] text-[var(--color-danger)]">
                {checkoutError}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
