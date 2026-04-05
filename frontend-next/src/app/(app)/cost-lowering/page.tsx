'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { wcleApi, WCLERun } from '@/lib/api/wcleApi';
import { OnboardingWidget } from '@/components/wcle/OnboardingWidget';
import { toActionableSurfaceError } from '@/lib/ui/actionableErrors';
import { buildAuthHref } from '@/lib/auth/returnTo';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

function supplierBadge(type: string) {
  const colors: Record<string, string> = {
    FLEMINGTON: 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]',
    COSTCO: 'bg-[color:rgba(124,65,60,0.2)] text-[#7c413c]',
    BUTCHER: 'bg-[color:rgba(124,65,60,0.2)] text-[#f6d4cb]',
    ALDI: 'bg-[color:rgba(224,177,21,0.2)] text-[#e0b115]',
    CUSTOM: 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.85)]',
  };
  return colors[type] || colors.CUSTOM;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.7)]',
    OPEN: 'bg-[color:rgba(102,87,0,0.2)] text-[#f6d4cb]',
    CLOSED: 'bg-[color:rgba(224,177,21,0.2)] text-[#e0b115]',
    EXECUTED: 'bg-[color:rgba(124,65,60,0.2)] text-[#7c413c]',
    COMPLETED: 'bg-[color:rgba(102,87,0,0.25)] text-[#665700]',
    CANCELLED: 'bg-[color:rgba(124,65,60,0.2)] text-[#f6d4cb]',
  };
  return colors[status] || 'bg-[color:rgba(246,212,203,0.15)] text-[color:rgba(246,212,203,0.7)]';
}

export default function CostLoweringPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [runs, setRuns] = useState<WCLERun[]>([]);
  const [loading, setLoading] = useState(true);
  const [postcode, setPostcode] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const authHref = useMemo(() => buildAuthHref('/cost-lowering'), []);

  const loadRuns = useCallback(async (filters: { postcode?: string; supplierFilter?: string } = {}) => {
    setLoading(true);
    setNotice(null);
    try {
      const params: Record<string, string> = {};
      if (filters.postcode) params.postcode = filters.postcode;
      if (filters.supplierFilter) params.supplier_type = filters.supplierFilter;
      const res = await wcleApi.listRuns(params);
      setRuns(res.runs || []);
    } catch (err) {
      console.error('Failed to load runs:', err);
      const actionable = toActionableSurfaceError({
        area: 'Weekly Cost-Lowering Engine',
        rawMessage: err instanceof Error ? err.message : null,
        fallbackHref: '/docs',
        fallbackLabel: 'Open docs',
      });
      setNotice(`${actionable.headline}. ${actionable.detail}`);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void loadRuns();
  }, [authLoading, loadRuns]);

  function handleSearch() {
    void loadRuns({ postcode, supplierFilter });
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <section className="card-civic mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.65)]">Weekly Cost-Lowering Engine</p>
        <h1 className="text-3xl font-bold mt-2 mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
          Weekly Cost-Lowering Engine
        </h1>
        <p className="text-sm text-[color:rgba(246,212,203,0.75)] max-w-2xl">
          Explore active runs, compare suppliers, and see indicative savings. Sign in when you are ready to pledge and track household outcomes.
        </p>
        {!isAuthenticated ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[color:rgba(246,212,203,0.65)]">Preview mode active</span>
            <Link href={authHref} className="btn-pill btn-pill-primary text-xs">
              Sign in to pledge
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mb-8">
        <OnboardingWidget />
      </section>

      <section className="card-civic flex flex-wrap gap-3 mb-8 items-end">
        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Postcode</label>
          <input
            type="text"
            value={postcode}
            onChange={(event) => setPostcode(event.target.value)}
            placeholder="e.g. 2042"
            className="input-civic w-32"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.65)] mb-1">Supplier</label>
          <select
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            className="input-civic"
          >
            <option value="">All suppliers</option>
            <option value="FLEMINGTON">Flemington Markets</option>
            <option value="COSTCO">Costco</option>
            <option value="BUTCHER">Butcher</option>
            <option value="ALDI">Aldi</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <button onClick={handleSearch} className="btn-pill btn-pill-primary text-sm">
          Search
        </button>
      </section>

      {notice ? <div className="card-civic mb-6 text-sm text-[#e0b115]">{notice}</div> : null}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#665700]" />
        </div>
      ) : runs.length === 0 ? (
        <div className="card-civic text-center py-16 text-[color:rgba(246,212,203,0.7)]">
          <p className="text-lg mb-2">No runs found</p>
          <p className="text-sm">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => {
            const savingsEst = (run.retail_equivalent_total_cents || 0) - (run.bulk_estimate_total_cents || 0);
            return (
              <Link key={run.id} href={`/runs/${run.id}`} className="card-civic block hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${supplierBadge(run.supplier_type)}`}>
                        {run.supplier_type}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{run.title}</h3>
                    <p className="text-sm text-[color:rgba(246,212,203,0.7)] mt-1">
                      {run.location_name || run.address || 'Location TBD'} · {run.suburb || ''} {run.postcode || ''}
                    </p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.6)] mt-1">
                      {new Date(run.run_date).toLocaleDateString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {run.status === 'COMPLETED' && run.retail_equivalent_total_cents ? (
                      <>
                        <p className="text-xs text-[color:rgba(246,212,203,0.6)]">Community saved</p>
                        <p className="text-lg font-bold text-[#665700]">
                          {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
                        </p>
                      </>
                    ) : savingsEst > 0 ? (
                      <>
                        <p className="text-xs text-[color:rgba(246,212,203,0.6)]">Est. savings</p>
                        <p className="text-lg font-bold text-[#665700]">{cents(savingsEst)}</p>
                      </>
                    ) : null}
                    <p className="text-xs text-[color:rgba(246,212,203,0.6)] mt-1">Fee: {cents(run.coordination_fee_per_household_cents)}/household</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
