'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { wcleApi, WCLERun, WCLEPack } from '@/lib/api/wcleApi';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Passed';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runId = Number(params.id);

  const [run, setRun] = useState<WCLERun | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledging, setPledging] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!runId) return;
    wcleApi.getRun(runId)
      .then(setRun)
      .catch((e) => setError(e.message || 'Failed to load run'))
      .finally(() => setLoading(false));
  }, [runId]);

  async function handlePledge() {
    if (!selectedPackId) {
      setError('Please select a pack');
      return;
    }
    setPledging(true);
    setError('');
    try {
      const pledge = await wcleApi.createPledge(runId, { pack_id: selectedPackId });
      await wcleApi.confirmPledge(pledge.id);
      router.push('/pledges');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create pledge';
      setError(msg);
    } finally {
      setPledging(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-red-500">{error || 'Run not found'}</p>
        <Link href="/cost-lowering" className="text-green-600 underline mt-4 inline-block">
          Back to runs
        </Link>
      </div>
    );
  }

  const packs = run.packs || [];
  const isOpen = run.status === 'OPEN';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/cost-lowering" className="text-sm text-green-600 hover:underline mb-4 inline-block">
        &larr; Back to runs
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800">
            {run.supplier_type}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            run.status === 'OPEN' ? 'bg-green-100 text-green-700'
            : run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800'
            : 'bg-gray-100 text-gray-600'
          }`}>
            {run.status}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{run.title}</h1>
        <p className="text-gray-500">
          {run.location_name || run.address || 'Location TBD'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {run.suburb} {run.postcode}
          {run.organizer_username && ` — Organised by ${run.organizer_username}`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Run Date</p>
            <p className="font-semibold text-gray-800">
              {new Date(run.run_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Deadline</p>
            <p className="font-semibold text-gray-800">{timeUntil(run.pledge_deadline)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Pickup</p>
            <p className="font-semibold text-gray-800">
              {run.pickup_window_start
                ? new Date(run.pickup_window_start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                : 'TBD'}
              {run.pickup_window_end && (
                <> &ndash; {new Date(run.pickup_window_end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Pledged</p>
            <p className="font-semibold text-gray-800">
              {run.pledge_count ?? 0}{run.max_households ? ` / ${run.max_households}` : ''} households
            </p>
          </div>
        </div>
      </div>

      {/* Packs */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Available Packs</h2>
      {packs.length === 0 ? (
        <p className="text-gray-500">No packs available yet.</p>
      ) : (
        <div className="grid gap-4 mb-6">
          {packs.map((pack: WCLEPack) => {
            const retailTotal = pack.retail_estimate_cents || 0;
            const bulkTotal = pack.bulk_estimate_cents || 0;
            const savingsEst = retailTotal - bulkTotal;
            const savingsPct = retailTotal > 0 ? Math.round((savingsEst / retailTotal) * 100) : 0;
            const isSelected = selectedPackId === pack.id;

            return (
              <div
                key={pack.id}
                onClick={() => isOpen && setSelectedPackId(pack.id)}
                className={`bg-white border rounded-xl p-5 transition-all ${
                  isOpen ? 'cursor-pointer hover:shadow-md' : ''
                } ${isSelected ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pack.name}</h3>
                    {pack.description && (
                      <p className="text-sm text-gray-500 mt-1">{pack.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 line-through">{cents(retailTotal)} retail</p>
                    <p className="text-lg font-bold text-green-600">{cents(bulkTotal)}</p>
                    {savingsPct > 0 && (
                      <p className="text-xs text-green-600 font-medium">Save {savingsPct}%</p>
                    )}
                  </div>
                </div>

                {/* Items preview */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {(pack.items || []).slice(0, 8).map((item, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {item.name} ({item.qty} {item.unit})
                    </span>
                  ))}
                  {(pack.items || []).length > 8 && (
                    <span className="text-xs text-gray-400">+{(pack.items || []).length - 8} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pledge CTA */}
      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Join this run</p>
              <p className="text-sm text-gray-500">
                Select a pack above, then pledge.
                Coordination fee: {cents(run.coordination_fee_per_household_cents)} per household.
              </p>
            </div>
            <button
              onClick={handlePledge}
              disabled={pledging || !selectedPackId}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pledging ? 'Pledging...' : 'Pledge Now'}
            </button>
          </div>
        </div>
      )}

      {/* Completed run summary */}
      {run.status === 'COMPLETED' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-6">
          <h3 className="font-semibold text-emerald-900 mb-3">Run Complete</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-emerald-600 uppercase tracking-wide">Retail Value</p>
              <p className="text-lg font-bold text-gray-900">{cents(run.retail_equivalent_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase tracking-wide">Bulk Cost</p>
              <p className="text-lg font-bold text-gray-900">{cents(run.bulk_actual_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase tracking-wide">Total Saved</p>
              <p className="text-lg font-bold text-green-600">
                {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
