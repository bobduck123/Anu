'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateCard from '@/components/auth/AuthGateCard';
import { wcleApi, OrganizerPanelData } from '@/lib/api/wcleApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { buildAuthHref } from '@/lib/auth/returnTo';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

export default function OrganizerRunPage() {
  const params = useParams();
  const runId = Number(params.id);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<OrganizerPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');

  const authHref = useMemo(() => buildAuthHref(`/organizer/runs/${runId}`), [runId]);

  const loadData = useCallback(async () => {
    if (!runId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotice(null);

    try {
      const panel = await wcleApi.getOrganizerPanel(runId);
      setData(panel);
      setNotice(null);
    } catch (e: unknown) {
      const actionable = toActionableSurfaceError({
        area: 'Organizer run panel',
        rawMessage: e instanceof Error ? e.message : null,
        fallbackHref: '/cost-lowering',
        fallbackLabel: 'Back to run list',
      });
      setError(`${actionable.headline}. ${actionable.detail}`);
      setNotice('Working now: run route remains available while live organizer run feeds recover.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    void loadData();
  }, [authLoading, isAuthenticated, loadData]);

  async function doAction(action: string) {
    setActionLoading(action);
    setError('');
    setNotice(null);
    try {
      if (action === 'open') await wcleApi.openRun(runId);
      if (action === 'close') await wcleApi.closeRun(runId);
      if (action === 'execute') await wcleApi.executeRun(runId);
      if (action === 'complete') {
        const amount = receiptAmount ? Math.round(parseFloat(receiptAmount) * 100) : undefined;
        await wcleApi.completeRun(runId, amount);
      }
      if (action === 'cancel') await wcleApi.cancelRun(runId);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setError(msg);
      setNotice('Working now: action update could not reach live service. Retry when service recovers.');
    } finally {
      setActionLoading('');
    }
  }

  async function handleFulfil(pledgeId: number) {
    try {
      await wcleApi.fulfilPledge(pledgeId);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      setNotice('Working now: fulfilment update is queued until live service recovers.');
    }
  }

  async function handleNoShow(pledgeId: number) {
    try {
      await wcleApi.noShowPledge(pledgeId);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      setNotice('Working now: no-show update is queued until live service recovers.');
    }
  }

  async function handleAddReceipt() {
    if (!receiptAmount) return;
    setError('');
    setNotice(null);
    try {
      const amountCents = Math.round(parseFloat(receiptAmount) * 100);
      await wcleApi.createReceipt(runId, { bulk_actual_total_cents: amountCents });
      setReceiptAmount('');
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
      setNotice('Working now: receipt entry could not reach live service. Keep value and retry.');
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGateCard
        eyebrow="Organizer panel"
        title="Sign in to manage this run"
        description="Organizer controls, pledge reconciliation, and completion actions require an authenticated organizer session."
        primaryHref={authHref}
        secondaryHref="/cost-lowering"
        secondaryLabel="Back to runs"
      />
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-3">
        <div className="card-civic text-sm text-[var(--color-foreground)]">{error || 'Run detail is unavailable.'}</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/organizer/on-ramp" className="btn-pill btn-pill-outline text-xs">
            Organizer path
          </Link>
          <Link href="/cost-lowering" className="btn-pill btn-pill-outline text-xs">
            Back to run list
          </Link>
        </div>
      </div>
    );
  }

  const { run, pledges, aggregated_quantities } = data;
  const confirmed = pledges.filter((pledge) => pledge.status === 'CONFIRMED');
  const fulfilled = pledges.filter((pledge) => pledge.status === 'FULFILLED');
  const noShow = pledges.filter((pledge) => pledge.status === 'NO_SHOW');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/cost-lowering" className="text-sm text-[color:rgba(246,212,203,0.8)] hover:underline mb-4 inline-block">
        &larr; Back to runs
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-1">Run console</h1>
          <h2 className="text-lg text-[color:rgba(246,212,203,0.7)]">{run.title}</h2>
        </div>
        <HoverBubble title="Run workflow" align="right">
          Move in order: status transition, receipt confirmation, then pledge reconciliation.
        </HoverBubble>
      </div>

      {error || notice ? (
        <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
            <div className="space-y-2 min-w-0">
              {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
              {notice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Link href="/organizer/on-ramp" className="btn-pill btn-pill-outline text-xs">
                  Organizer path
                </Link>
                <Link href="/cost-lowering" className="btn-pill btn-pill-outline text-xs">
                  Run list
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card-civic mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-sm text-[color:rgba(246,212,203,0.65)]">Status:</span>{' '}
            <span className="font-semibold text-[var(--color-foreground)]">{run.status}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {run.status === 'DRAFT' && <ActionBtn label="Open Run" action="open" loading={actionLoading} onClick={doAction} color="green" />}
            {run.status === 'OPEN' && <ActionBtn label="Close Run" action="close" loading={actionLoading} onClick={doAction} color="yellow" />}
            {run.status === 'CLOSED' && <ActionBtn label="Mark Executed" action="execute" loading={actionLoading} onClick={doAction} color="blue" />}
            {['CLOSED', 'EXECUTED'].includes(run.status) && (
              <ActionBtn label="Complete Run" action="complete" loading={actionLoading} onClick={doAction} color="emerald" />
            )}
            {run.status !== 'COMPLETED' && run.status !== 'CANCELLED' && (
              <ActionBtn label="Cancel" action="cancel" loading={actionLoading} onClick={doAction} color="red" />
            )}
          </div>
        </div>
      </div>

      <details className="card-civic mb-6">
        <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">Show status transition notes</summary>
        <ul className="mt-3 space-y-1 text-sm text-[color:rgba(246,212,203,0.82)]">
          <li>DRAFT → OPEN before pledges are actively coordinated.</li>
          <li>OPEN → CLOSED when pledge intake is complete.</li>
          <li>CLOSED → EXECUTED after operational completion and confirmations.</li>
          <li>EXECUTED/CLOSED → COMPLETED once receipts and final reconciliation are recorded.</li>
        </ul>
      </details>

      {['CLOSED', 'EXECUTED'].includes(run.status) && (
        <div className="card-civic mb-6">
          <h3 className="font-semibold text-[var(--color-foreground)] mb-3">Receipt Entry</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm text-[color:rgba(246,212,203,0.7)] mb-1">Actual bulk total ($)</label>
              <input
                type="number"
                step="0.01"
                value={receiptAmount}
                onChange={(event) => setReceiptAmount(event.target.value)}
                placeholder="e.g. 245.00"
                className="input-civic w-40"
              />
            </div>
            <button onClick={handleAddReceipt} className="btn-pill btn-pill-primary text-sm">
              Add Receipt
            </button>
          </div>
        </div>
      )}

      <div className="card-civic mb-6">
        <h3 className="font-semibold text-[var(--color-foreground)] mb-3">Aggregated Quantities</h3>
        {aggregated_quantities.length === 0 ? (
          <p className="text-[color:rgba(246,212,203,0.65)] text-sm">No confirmed pledges yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:rgba(246,212,203,0.15)] text-left text-[color:rgba(246,212,203,0.65)]">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2">Total Qty</th>
                </tr>
              </thead>
              <tbody>
                {aggregated_quantities.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-[color:rgba(246,212,203,0.1)]">
                    <td className="py-2 pr-4 text-[var(--color-foreground)]">{item.name}</td>
                    <td className="py-2 pr-4 text-[color:rgba(246,212,203,0.7)]">{item.unit}</td>
                    <td className="py-2 font-semibold text-[var(--color-foreground)]">{item.total_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-civic mb-6">
        <h3 className="font-semibold text-[var(--color-foreground)] mb-3">
          Pledges ({pledges.length})
          <span className="text-[color:rgba(246,212,203,0.6)] text-sm font-normal ml-2">
            {confirmed.length} confirmed, {fulfilled.length} fulfilled, {noShow.length} no-show
          </span>
        </h3>
        {pledges.length === 0 ? (
          <p className="text-[color:rgba(246,212,203,0.65)] text-sm">No pledges yet.</p>
        ) : (
          <div className="space-y-2">
            {pledges.map((pledge) => (
              <div key={pledge.id} className="flex items-center justify-between py-2 border-b border-[color:rgba(246,212,203,0.1)] last:border-0">
                <div>
                  <span className="text-[var(--color-foreground)] text-sm">User #{pledge.user_id}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      pledge.status === 'FULFILLED'
                        ? 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]'
                        : pledge.status === 'CONFIRMED'
                          ? 'bg-[color:rgba(124,65,60,0.2)] text-[#7c413c]'
                          : pledge.status === 'NO_SHOW'
                            ? 'bg-[color:rgba(224,177,21,0.2)] text-[#e0b115]'
                            : 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.7)]'
                    }`}
                  >
                    {pledge.status}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-[color:rgba(246,212,203,0.7)]">{cents(pledge.estimated_retail_cents)}</span>
                  {pledge.status === 'CONFIRMED' && ['EXECUTED', 'CLOSED'].includes(run.status) && (
                    <>
                      <button onClick={() => handleFulfil(pledge.id)} className="text-xs bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb] px-2 py-1 rounded hover:bg-[color:rgba(102,87,0,0.3)]">
                        Picked Up
                      </button>
                      <button onClick={() => handleNoShow(pledge.id)} className="text-xs bg-[color:rgba(224,177,21,0.2)] text-[#e0b115] px-2 py-1 rounded hover:bg-[color:rgba(224,177,21,0.3)]">
                        No Show
                      </button>
                    </>
                  )}
                  {pledge.status === 'FULFILLED' && pledge.savings_cents != null && (
                    <span className="text-sm font-semibold text-[#665700]">Saved {cents(pledge.savings_cents)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {run.status === 'COMPLETED' && (
        <div className="card-civic">
          <h3 className="font-semibold text-[#f6d4cb] mb-3">Run Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase">Retail Equivalent</p>
              <p className="text-xl font-bold text-[var(--color-foreground)]">{cents(run.retail_equivalent_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase">Actual Bulk Cost</p>
              <p className="text-xl font-bold text-[var(--color-foreground)]">{cents(run.bulk_actual_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase">Total Saved</p>
              <p className="text-xl font-bold text-[#665700]">
                {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  action,
  loading,
  onClick,
  color,
}: {
  label: string;
  action: string;
  loading: string;
  onClick: (action: string) => void;
  color: string;
}) {
  const isLoading = loading === action;
  const colorMap: Record<string, string> = {
    green: 'bg-[#665700] hover:bg-[#665700] text-[var(--color-foreground)]',
    yellow: 'bg-[#e0b115] hover:bg-[#e0b115] text-[var(--color-foreground)]',
    blue: 'bg-[#7c413c] hover:bg-[#7c413c] text-[var(--color-foreground)]',
    emerald: 'bg-[#665700] hover:bg-[#665700] text-[var(--color-foreground)]',
    red: 'bg-[color:rgba(124,65,60,0.2)] hover:bg-[color:rgba(124,65,60,0.3)] text-[#f6d4cb]',
  };
  return (
    <button
      onClick={() => onClick(action)}
      disabled={!!loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${colorMap[color] || colorMap.green}`}
    >
      {isLoading ? '...' : label}
    </button>
  );
}
