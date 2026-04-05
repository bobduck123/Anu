'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { wcleApi, WCLERun, WCLEPack } from '@/lib/api/wcleApi';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { buildAuthHref } from '@/lib/auth/returnTo';

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const runId = Number(params.id);

  const [run, setRun] = useState<WCLERun | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledging, setPledging] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const authHref = useMemo(() => buildAuthHref(`/runs/${runId}`), [runId]);

  useEffect(() => {
    if (!runId || authLoading) {
      return;
    }

    setLoading(true);
    setError('');

    wcleApi
      .getRun(runId)
      .then(setRun)
      .catch((e) => {
        const actionable = toActionableSurfaceError({
          area: 'Cost-lowering run detail',
          rawMessage: e instanceof Error ? e.message : null,
          fallbackHref: '/cost-lowering',
          fallbackLabel: 'Back to run list',
        });
        setError(`${actionable.headline}. ${actionable.detail}`);
      })
      .finally(() => setLoading(false));
  }, [runId, authLoading]);

  async function handlePledge() {
    if (!isAuthenticated) {
      router.push(authHref);
      return;
    }

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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <div className="card-civic text-sm text-[#7c413c]">{error || 'Run not found'}</div>
        <Link href="/cost-lowering" className="text-sm text-[color:rgba(246,212,203,0.8)] underline mt-4 inline-block">
          Back to runs
        </Link>
      </div>
    );
  }

  const packs = run.packs || [];
  const isOpen = run.status === 'OPEN';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/cost-lowering" className="text-sm text-[color:rgba(246,212,203,0.8)] hover:text-[var(--color-foreground)] mb-4 inline-block">
        &larr; Back to runs
      </Link>

      {!isAuthenticated ? (
        <div className="card-civic mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[color:rgba(246,212,203,0.75)]">
          <span>Preview mode active. Sign in when you are ready to pledge and track delivery.</span>
          <Link href={authHref} className="btn-pill btn-pill-primary text-xs">
            Sign in to pledge
          </Link>
        </div>
      ) : null}

      <div className="card-civic mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]">{run.supplier_type}</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              run.status === 'OPEN'
                ? 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]'
                : run.status === 'COMPLETED'
                  ? 'bg-[color:rgba(102,87,0,0.2)] text-[#665700]'
                  : 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.8)]'
            }`}
          >
            {run.status}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">{run.title}</h1>
        <p className="text-[color:rgba(246,212,203,0.7)]">{run.location_name || run.address || 'Location TBD'}</p>
        <p className="text-sm text-[color:rgba(246,212,203,0.6)] mt-1">
          {run.suburb} {run.postcode}
          {run.organizer_username && ` — Organised by ${run.organizer_username}`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Run Date</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {new Date(run.run_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Deadline</p>
            <p className="font-semibold text-[var(--color-foreground)]">{timeUntil(run.pledge_deadline)}</p>
          </div>
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Pickup</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {run.pickup_window_start
                ? new Date(run.pickup_window_start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                : 'TBD'}
              {run.pickup_window_end && (
                <> &ndash; {new Date(run.pickup_window_end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-[color:rgba(246,212,203,0.55)] uppercase tracking-wide">Pledged</p>
            <p className="font-semibold text-[var(--color-foreground)]">
              {run.pledge_count ?? 0}
              {run.max_households ? ` / ${run.max_households}` : ''} households
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">Available Packs</h2>
      {packs.length === 0 ? (
        <p className="text-[color:rgba(246,212,203,0.7)]">No packs available yet.</p>
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
                className={`card-civic transition-all ${isOpen ? 'cursor-pointer hover:shadow-md' : ''} ${
                  isSelected ? 'ring-2 ring-emerald-200/70' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{pack.name}</h3>
                    {pack.description && <p className="text-sm text-[color:rgba(246,212,203,0.7)] mt-1">{pack.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[color:rgba(246,212,203,0.55)] line-through">{cents(retailTotal)} retail</p>
                    <p className="text-lg font-bold text-[#665700]">{cents(bulkTotal)}</p>
                    {savingsPct > 0 && <p className="text-xs text-[#665700] font-medium">Save {savingsPct}%</p>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {(pack.items || []).slice(0, 8).map((item, index) => (
                    <span key={`${item.name}-${index}`} className="text-xs bg-[color:rgba(246,212,203,0.1)] text-[color:rgba(246,212,203,0.75)] px-2 py-0.5 rounded-full">
                      {item.name} ({item.qty} {item.unit})
                    </span>
                  ))}
                  {(pack.items || []).length > 8 && <span className="text-xs text-[color:rgba(246,212,203,0.6)]">+{(pack.items || []).length - 8} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isOpen ? (
        <div className="card-civic">
          {error && <div className="bg-[color:rgba(124,65,60,0.15)] text-[#7c413c] text-sm rounded-lg px-4 py-2 mb-4">{error}</div>}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--color-foreground)]">Join this run</p>
              <p className="text-sm text-[color:rgba(246,212,203,0.7)]">
                Select a pack above, then pledge. Coordination fee: {cents(run.coordination_fee_per_household_cents)} per household.
              </p>
            </div>
            <button
              onClick={handlePledge}
              disabled={pledging || !selectedPackId}
              className="btn-pill btn-pill-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticated ? (pledging ? 'Pledging...' : 'Pledge Now') : 'Sign in to pledge'}
            </button>
          </div>
        </div>
      ) : null}

      {run.status === 'COMPLETED' ? (
        <div className="card-civic mt-6">
          <h3 className="font-semibold text-[#f6d4cb] mb-3">Run Complete</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase tracking-wide">Retail Value</p>
              <p className="text-lg font-bold text-[var(--color-foreground)]">{cents(run.retail_equivalent_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase tracking-wide">Bulk Cost</p>
              <p className="text-lg font-bold text-[var(--color-foreground)]">{cents(run.bulk_actual_total_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.6)] uppercase tracking-wide">Total Saved</p>
              <p className="text-lg font-bold text-[#665700]">
                {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
