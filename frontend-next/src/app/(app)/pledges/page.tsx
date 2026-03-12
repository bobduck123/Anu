'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { wcleApi, WCLEPledge } from '@/lib/api/wcleApi';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
  FULFILLED: { label: 'Fulfilled', color: 'bg-emerald-100 text-emerald-800' },
  NO_SHOW: { label: 'No Show', color: 'bg-yellow-100 text-yellow-700' },
};

export default function PledgesPage() {
  const [pledges, setPledges] = useState<WCLEPledge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wcleApi.myPledges()
      .then(setPledges)
      .catch(() => setPledges([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(pledgeId: number) {
    try {
      await wcleApi.cancelPledge(pledgeId);
      setPledges((prev) =>
        prev.map((p) => (p.id === pledgeId ? { ...p, status: 'CANCELLED' } : p))
      );
    } catch (e) {
      console.error('Failed to cancel pledge:', e);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
        My Pledges
      </h1>

      {pledges.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No pledges yet</p>
          <p className="text-gray-400 text-sm mb-6">Join a run to start saving on your groceries.</p>
          <Link href="/cost-lowering" className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors">
            Browse Runs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pledges.map((pledge) => {
            const sc = statusConfig[pledge.status] || statusConfig.DRAFT;
            return (
              <div key={pledge.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/runs/${pledge.run_id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors"
                    >
                      {pledge.run_title || `Run #${pledge.run_id}`}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                        {sc.label}
                      </span>
                      {pledge.run_date && (
                        <span className="text-xs text-gray-400">
                          {new Date(pledge.run_date).toLocaleDateString('en-AU', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {pledge.status === 'FULFILLED' && pledge.savings_cents != null && pledge.savings_cents > 0 ? (
                      <>
                        <p className="text-xs text-gray-400">You saved</p>
                        <p className="text-lg font-bold text-green-600">{cents(pledge.savings_cents)}</p>
                      </>
                    ) : pledge.estimated_retail_cents ? (
                      <>
                        <p className="text-xs text-gray-400">Est. value</p>
                        <p className="font-semibold text-gray-700">{cents(pledge.estimated_retail_cents)}</p>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Detail row for fulfilled pledges */}
                {pledge.status === 'FULFILLED' && (
                  <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-gray-500">
                    <div>
                      <span className="block text-gray-400">Retail</span>
                      {cents(pledge.estimated_retail_cents)}
                    </div>
                    <div>
                      <span className="block text-gray-400">Bulk</span>
                      {cents(pledge.final_allocated_bulk_cents)}
                    </div>
                    <div>
                      <span className="block text-gray-400">Fee</span>
                      {cents(pledge.final_coordination_fee_cents)}
                    </div>
                    <div>
                      <span className="block text-gray-400">Total paid</span>
                      {cents(pledge.final_total_cents)}
                    </div>
                  </div>
                )}

                {/* Cancel button for active pledges */}
                {(pledge.status === 'DRAFT' || pledge.status === 'CONFIRMED') && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleCancel(pledge.id)}
                      className="text-sm text-red-600 hover:text-red-800 transition-colors"
                    >
                      Cancel pledge
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
