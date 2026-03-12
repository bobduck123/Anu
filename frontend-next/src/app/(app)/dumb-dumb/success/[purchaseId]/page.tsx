'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DumbDumbReceiptCard } from '@/components/dumb-dumb/DumbDumbReceiptCard';
import { dumbDumbApi, type DumbDumbPurchase } from '@/lib/api/dumbDumbApi';
import { demoPurchase } from '@/lib/dumbDumb';

export default function DumbDumbSuccessPage() {
  const params = useParams<{ purchaseId: string }>();
  const purchaseId = Number(params.purchaseId);
  const [purchase, setPurchase] = useState<DumbDumbPurchase | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dumbDumbApi
      .getPurchase(purchaseId)
      .then((payload) => {
        if (!cancelled) setPurchase(payload);
      })
      .catch(() => {
        if (!cancelled) {
          if (purchaseId === demoPurchase.id) setPurchase(demoPurchase);
          else setMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [purchaseId]);

  useEffect(() => {
    if (!purchase || purchase.status !== 'paid') return;
    dumbDumbApi.track({
      event_name: 'dumb_dumb_purchase_completed',
      entity_id: String(purchase.id),
      entity_type: 'dumb_dumb_purchase',
      props: {
        purchase_id: purchase.id,
        item_id: purchase.item_id,
        destination_pool_id: purchase.destination_pool_id,
        amount_cents: purchase.amount_cents,
      },
    }).catch(() => undefined);
  }, [purchase]);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[1.6rem] border border-[var(--color-border)] bg-white px-6 py-8 text-center">
          <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Receipt not found
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-earth-medium)]">
            The purchase record could not be loaded. It may still be processing.
          </p>
          <Link
            href="/dumb-dumb"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-institutional)] px-5 py-2.5 text-sm font-medium text-white"
          >
            Back to hub
          </Link>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <DumbDumbReceiptCard purchase={purchase} />
      </div>
    </div>
  );
}
