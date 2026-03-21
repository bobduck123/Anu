'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateCard from '@/components/auth/AuthGateCard';
import { wcleApi, OrganizerPanelData } from '@/lib/api/wcleApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { buildAuthHref } from '@/lib/auth/returnTo';

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

    try {
      const panel = await wcleApi.getOrganizerPanel(runId);
      setData(panel);
    } catch (e: unknown) {
      const actionable = toActionableSurfaceError({
        area: 'Organizer run panel',
        rawMessage: e instanceof Error ? e.message : null,
        fallbackHref: '/cost-lowering',
        fallbackLabel: 'Back to run list',
      });
      setError(`${actionable.headline}. ${actionable.detail}`);
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
    }
  }

  async function handleNoShow(pledgeId: number) {
    try {
      await wcleApi.noShowPledge(pledgeId);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
    }
  }

  async function handleAddReceipt() {
    if (!receiptAmount) return;
    setError('');
    try {
      const amountCents = Math.round(parseFloat(receiptAmount) * 100);
      await wcleApi.createReceipt(runId, { bulk_actual_total_cents: amountCents });
      setReceiptAmount('');
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      setError(msg);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
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
    return <div className="max-w-4xl mx-auto px-4 py-10 text-center text-rose-200">{error || 'Not found'}</div>;
  }

  const { run, pledges, aggregated_quantities } = data;
  const confirmed = pledges.filter((pledge) => pledge.status === 'CONFIRMED');
  const fulfilled = pledges.filter((pledge) => pledge.status === 'FULFILLED');
  const noShow = pledges.filter((pledge) => pledge.status === 'NO_SHOW');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/cost-lowering" className="text-sm text-white/80 hover:underline mb-4 inline-block">
        &larr; Back to runs
      </Link>

      <h1 className="text-2xl font-bold text-white mb-1">Organizer Panel</h1>
      <h2 className="text-lg text-white/70 mb-6">{run.title}</h2>

      {error && <div className="card-civic text-sm text-rose-200 mb-4">{error}</div>}

      <div className="card-civic mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-sm text-white/65">Status:</span>{' '}
            <span className="font-semibold text-white">{run.status}</span>
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

      {['CLOSED', 'EXECUTED'].includes(run.status) && (
        <div className="card-civic mb-6">
          <h3 className="font-semibold text-white mb-3">Receipt Entry</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm text-white/70 mb-1">Actual bulk total ($)</label>
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
        <h3 className="font-semibold text-white mb-3">Aggregated Quantities</h3>
        {aggregated_quantities.length === 0 ? (
          <p className="text-white/65 text-sm">No confirmed pledges yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/15 text-left text-white/65">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2">Total Qty</th>
                </tr>
              </thead>
              <tbody>
                {aggregated_quantities.map((item, index) => (
                  <tr key={`${item.name}-${index}`} className="border-b border-white/10">
                    <td className="py-2 pr-4 text-white">{item.name}</td>
                    <td className="py-2 pr-4 text-white/70">{item.unit}</td>
                    <td className="py-2 font-semibold text-white">{item.total_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-civic mb-6">
        <h3 className="font-semibold text-white mb-3">
          Pledges ({pledges.length})
          <span className="text-white/60 text-sm font-normal ml-2">
            {confirmed.length} confirmed, {fulfilled.length} fulfilled, {noShow.length} no-show
          </span>
        </h3>
        {pledges.length === 0 ? (
          <p className="text-white/65 text-sm">No pledges yet.</p>
        ) : (
          <div className="space-y-2">
            {pledges.map((pledge) => (
              <div key={pledge.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                <div>
                  <span className="text-white text-sm">User #{pledge.user_id}</span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      pledge.status === 'FULFILLED'
                        ? 'bg-emerald-300/20 text-emerald-100'
                        : pledge.status === 'CONFIRMED'
                          ? 'bg-sky-300/20 text-sky-100'
                          : pledge.status === 'NO_SHOW'
                            ? 'bg-amber-300/20 text-amber-100'
                            : 'bg-white/15 text-white/70'
                    }`}
                  >
                    {pledge.status}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-white/70">{cents(pledge.estimated_retail_cents)}</span>
                  {pledge.status === 'CONFIRMED' && ['EXECUTED', 'CLOSED'].includes(run.status) && (
                    <>
                      <button onClick={() => handleFulfil(pledge.id)} className="text-xs bg-emerald-300/20 text-emerald-100 px-2 py-1 rounded hover:bg-emerald-300/30">
                        Picked Up
                      </button>
                      <button onClick={() => handleNoShow(pledge.id)} className="text-xs bg-amber-300/20 text-amber-100 px-2 py-1 rounded hover:bg-amber-300/30">
                        No Show
                      </button>
                    </>
                  )}
                  {pledge.status === 'FULFILLED' && pledge.savings_cents != null && (
                    <span className="text-sm font-semibold text-emerald-200">Saved {cents(pledge.savings_cents)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {run.status === 'COMPLETED' && (
        <div className="card-civic">
          <h3 className="font-semibold text-emerald-100 mb-3">Run Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-white/60 uppercase">Retail Equivalent</p>
              <p className="text-xl font-bold text-white">{cents(run.retail_equivalent_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase">Actual Bulk Cost</p>
              <p className="text-xl font-bold text-white">{cents(run.bulk_actual_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase">Total Saved</p>
              <p className="text-xl font-bold text-emerald-200">
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
    green: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    yellow: 'bg-amber-500 hover:bg-amber-600 text-white',
    blue: 'bg-sky-500 hover:bg-sky-600 text-white',
    emerald: 'bg-teal-500 hover:bg-teal-600 text-white',
    red: 'bg-rose-300/20 hover:bg-rose-300/30 text-rose-100',
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
