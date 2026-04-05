'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRouteBoundary from '@/components/auth/ProtectedRouteBoundary';
import { wcleApi, WCLEPledge } from '@/lib/api/wcleApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.7)]' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-[color:rgba(124,65,60,0.2)] text-[#7c413c]' },
  CANCELLED: { label: 'Cancelled', color: 'bg-[color:rgba(124,65,60,0.2)] text-[#f6d4cb]' },
  FULFILLED: { label: 'Fulfilled', color: 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]' },
  NO_SHOW: { label: 'No Show', color: 'bg-[color:rgba(224,177,21,0.2)] text-[#e0b115]' },
};

export default function PledgesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [pledges, setPledges] = useState<WCLEPledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      setPledges([]);
      return;
    }

    wcleApi
      .myPledges()
      .then(setPledges)
      .catch((err) => {
        const actionable = toActionableSurfaceError({
          area: 'Pledges ledger',
          rawMessage: err instanceof Error ? err.message : null,
          fallbackHref: '/cost-lowering',
          fallbackLabel: 'Back to run list',
        });
        setNotice(`${actionable.headline}. ${actionable.detail}`);
        setPledges([]);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  async function handleCancel(pledgeId: number) {
    try {
      await wcleApi.cancelPledge(pledgeId);
      setPledges((prev) => prev.map((pledge) => (pledge.id === pledgeId ? { ...pledge, status: 'CANCELLED' } : pledge)));
      setNotice('Pledge cancelled.');
    } catch (e) {
      console.error('Failed to cancel pledge:', e);
      setNotice('Could not cancel pledge right now.');
    }
  }

  return (
    <ProtectedRouteBoundary
      isLoading={authLoading}
      isAuthenticated={isAuthenticated}
      returnTo="/pledges"
      eyebrow="My pledges"
      title="Sign in to manage pledges"
      description="Pledge history and cancellation controls are available only for your signed-in account."
      secondaryHref="/cost-lowering"
      secondaryLabel="Browse runs"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
            My Pledges
          </h1>

          {notice ? <div className="card-civic mb-5 text-sm text-[#e0b115]">{notice}</div> : null}

          {pledges.length === 0 ? (
            <div className="card-civic text-center py-12">
              <p className="text-[color:rgba(246,212,203,0.75)] text-lg mb-2">No pledges yet</p>
              <p className="text-[color:rgba(246,212,203,0.6)] text-sm mb-6">Join a run to start saving on your groceries.</p>
              <Link href="/cost-lowering" className="btn-pill btn-pill-primary">
                Browse Runs
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pledges.map((pledge) => {
                const sc = statusConfig[pledge.status] || statusConfig.DRAFT;
                return (
                  <div key={pledge.id} className="card-civic">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/runs/${pledge.run_id}`} className="text-lg font-semibold text-[var(--color-foreground)] hover:text-[#665700] transition-colors">
                          {pledge.run_title || `Run #${pledge.run_id}`}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                          {pledge.run_date ? (
                            <span className="text-xs text-[color:rgba(246,212,203,0.6)]">
                              {new Date(pledge.run_date).toLocaleDateString('en-AU', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {pledge.status === 'FULFILLED' && pledge.savings_cents != null && pledge.savings_cents > 0 ? (
                          <>
                            <p className="text-xs text-[color:rgba(246,212,203,0.6)]">You saved</p>
                            <p className="text-lg font-bold text-[#665700]">{cents(pledge.savings_cents)}</p>
                          </>
                        ) : pledge.estimated_retail_cents ? (
                          <>
                            <p className="text-xs text-[color:rgba(246,212,203,0.6)]">Est. value</p>
                            <p className="font-semibold text-[var(--color-foreground)]">{cents(pledge.estimated_retail_cents)}</p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {pledge.status === 'FULFILLED' ? (
                      <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-[color:rgba(246,212,203,0.7)]">
                        <div>
                          <span className="block text-[color:rgba(246,212,203,0.55)]">Retail</span>
                          {cents(pledge.estimated_retail_cents)}
                        </div>
                        <div>
                          <span className="block text-[color:rgba(246,212,203,0.55)]">Bulk</span>
                          {cents(pledge.final_allocated_bulk_cents)}
                        </div>
                        <div>
                          <span className="block text-[color:rgba(246,212,203,0.55)]">Fee</span>
                          {cents(pledge.final_coordination_fee_cents)}
                        </div>
                        <div>
                          <span className="block text-[color:rgba(246,212,203,0.55)]">Total paid</span>
                          {cents(pledge.final_total_cents)}
                        </div>
                      </div>
                    ) : null}

                    {pledge.status === 'DRAFT' || pledge.status === 'CONFIRMED' ? (
                      <div className="mt-3 pt-3 border-t border-[color:rgba(246,212,203,0.1)]">
                        <button onClick={() => handleCancel(pledge.id)} className="text-sm text-[#7c413c] hover:text-[#f6d4cb] transition-colors">
                          Cancel pledge
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </ProtectedRouteBoundary>
  );
}
