'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  wcleApi,
  OrganizerPanelData,
} from '@/lib/api/wcleApi';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

export default function OrganizerRunPage() {
  const params = useParams();
  const runId = Number(params.id);

  const [data, setData] = useState<OrganizerPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');

  const loadData = useCallback(async () => {
    try {
      const panel = await wcleApi.getOrganizerPanel(runId);
      setData(panel);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    if (runId) void loadData();
  }, [runId, loadData]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center text-red-500">{error || 'Not found'}</div>
    );
  }

  const { run, pledges, aggregated_quantities } = data;
  const confirmed = pledges.filter((p) => p.status === 'CONFIRMED');
  const fulfilled = pledges.filter((p) => p.status === 'FULFILLED');
  const noShow = pledges.filter((p) => p.status === 'NO_SHOW');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/cost-lowering" className="text-sm text-green-600 hover:underline mb-4 inline-block">
        &larr; Back to runs
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Organizer Panel</h1>
      <h2 className="text-lg text-gray-500 mb-6">{run.title}</h2>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>
      )}

      {/* Status + Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-sm text-gray-400">Status:</span>{' '}
            <span className="font-semibold text-gray-900">{run.status}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {run.status === 'DRAFT' && (
              <ActionBtn label="Open Run" action="open" loading={actionLoading} onClick={doAction} color="green" />
            )}
            {run.status === 'OPEN' && (
              <ActionBtn label="Close Run" action="close" loading={actionLoading} onClick={doAction} color="yellow" />
            )}
            {run.status === 'CLOSED' && (
              <ActionBtn label="Mark Executed" action="execute" loading={actionLoading} onClick={doAction} color="blue" />
            )}
            {['CLOSED', 'EXECUTED'].includes(run.status) && (
              <ActionBtn label="Complete Run" action="complete" loading={actionLoading} onClick={doAction} color="emerald" />
            )}
            {run.status !== 'COMPLETED' && run.status !== 'CANCELLED' && (
              <ActionBtn label="Cancel" action="cancel" loading={actionLoading} onClick={doAction} color="red" />
            )}
          </div>
        </div>
      </div>

      {/* Receipt Entry */}
      {['CLOSED', 'EXECUTED'].includes(run.status) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Receipt Entry</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Actual bulk total ($)</label>
              <input
                type="number"
                step="0.01"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                placeholder="e.g. 245.00"
                className="border border-gray-300 rounded-lg px-3 py-2 w-40 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button
              onClick={handleAddReceipt}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Add Receipt
            </button>
          </div>
        </div>
      )}

      {/* Aggregated Quantities */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Aggregated Quantities</h3>
        {aggregated_quantities.length === 0 ? (
          <p className="text-gray-400 text-sm">No confirmed pledges yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2">Total Qty</th>
                </tr>
              </thead>
              <tbody>
                {aggregated_quantities.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-800">{item.name}</td>
                    <td className="py-2 pr-4 text-gray-500">{item.unit}</td>
                    <td className="py-2 font-semibold text-gray-900">{item.total_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pledge List + Pickup Check-in */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          Pledges ({pledges.length})
          <span className="text-gray-400 text-sm font-normal ml-2">
            {confirmed.length} confirmed, {fulfilled.length} fulfilled, {noShow.length} no-show
          </span>
        </h3>
        {pledges.length === 0 ? (
          <p className="text-gray-400 text-sm">No pledges yet.</p>
        ) : (
          <div className="space-y-2">
            {pledges.map((pledge) => (
              <div key={pledge.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-gray-800 text-sm">User #{pledge.user_id}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    pledge.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-700' :
                    pledge.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                    pledge.status === 'NO_SHOW' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{pledge.status}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500">{cents(pledge.estimated_retail_cents)}</span>
                  {pledge.status === 'CONFIRMED' && ['EXECUTED', 'CLOSED'].includes(run.status) && (
                    <>
                      <button
                        onClick={() => handleFulfil(pledge.id)}
                        className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                      >
                        Picked Up
                      </button>
                      <button
                        onClick={() => handleNoShow(pledge.id)}
                        className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                      >
                        No Show
                      </button>
                    </>
                  )}
                  {pledge.status === 'FULFILLED' && pledge.savings_cents != null && (
                    <span className="text-sm font-semibold text-green-600">
                      Saved {cents(pledge.savings_cents)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run summary for completed */}
      {run.status === 'COMPLETED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <h3 className="font-semibold text-emerald-900 mb-3">Run Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-emerald-600 uppercase">Retail Equivalent</p>
              <p className="text-xl font-bold">{cents(run.retail_equivalent_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase">Actual Bulk Cost</p>
              <p className="text-xl font-bold">{cents(run.bulk_actual_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase">Total Saved</p>
              <p className="text-xl font-bold text-green-600">
                {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, action, loading, onClick, color }: {
  label: string;
  action: string;
  loading: string;
  onClick: (action: string) => void;
  color: string;
}) {
  const isLoading = loading === action;
  const colorMap: Record<string, string> = {
    green: 'bg-green-600 hover:bg-green-700 text-white',
    yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    red: 'bg-red-100 hover:bg-red-200 text-red-700',
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
