'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ReceiptText } from 'lucide-react';
import { dumbDumbApi, type DumbDumbPurchase } from '@/lib/api/dumbDumbApi';
import { formatMoney } from '@/lib/dumbDumb';
import { Card } from '@/ui-system/primitives/Card';
import { Select } from '@/ui-system/primitives/Form';

export default function AdminDumbDumbPage() {
  const [rows, setRows] = useState<DumbDumbPurchase[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setLoading(true);
      setError(null);
      dumbDumbApi
        .adminPurchases(status || undefined)
        .then((nextRows) => {
          if (!cancelled) {
            setRows(nextRows);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Unable to load Dumb Dumb purchases.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const totals = useMemo(
    () => rows.reduce((sum, row) => sum + row.amount_cents, 0),
    [rows],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/admin/ledger" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] transition-colors hover:text-[var(--color-forest)]">
        <ArrowLeft className="h-4 w-4" />
        Back to ledger
      </Link>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-institutional)]">Admin reporting</p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Dumb Dumb purchases
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-earth-medium)]">
            Every row keeps the parody title and the real pool destination visible together.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-foreground)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">Visible total</p>
          <p className="mt-2 text-2xl font-semibold font-mono-data text-[var(--color-earth-dark)]">{formatMoney(totals)}</p>
        </div>
      </div>

      <Card padding="lg" className="mt-8">
        <div className="flex flex-wrap items-center gap-4">
          <ReceiptText className="h-5 w-5 text-[var(--color-institutional)]" />
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="max-w-[220px]">
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="checkout_pending">Checkout pending</option>
            <option value="expired">Expired</option>
            <option value="payment_failed">Payment failed</option>
          </Select>
          <span className="text-sm text-[var(--color-muted-foreground)]">{rows.length} records</span>
        </div>
      </Card>

      {error && (
        <div className="mt-6 rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-light)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-border)] bg-[var(--color-foreground)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-muted)] text-[var(--color-earth-medium)]">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Supporter</th>
                  <th className="px-4 py-3 font-medium">Creator</th>
                  <th className="px-4 py-3 font-medium">Parody item</th>
                  <th className="px-4 py-3 font-medium">Actually funded</th>
                  <th className="px-4 py-3 font-medium">Pool</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--color-border)] align-top">
                    <td className="px-4 py-4 text-[var(--color-earth-medium)]">{row.created_at ? new Date(row.created_at).toLocaleString() : '--'}</td>
                    <td className="px-4 py-4">{row.buyer?.pseudonym || 'Guest supporter'}</td>
                    <td className="px-4 py-4">{row.owner?.pseudonym || '--'}</td>
                    <td className="px-4 py-4 font-medium text-[var(--color-earth-dark)]">{row.item?.title || '--'}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-[var(--color-forest)]">{row.item?.impact_title || '--'}</div>
                      <div className="mt-1 text-xs text-[var(--color-earth-medium)]">{row.item?.impact_description || '--'}</div>
                    </td>
                    <td className="px-4 py-4">{row.item?.destination_pool.name || '--'}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[var(--color-institutional-light)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-institutional)]">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono-data">{formatMoney(row.amount_cents, row.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
