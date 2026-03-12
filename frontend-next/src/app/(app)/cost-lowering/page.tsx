'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { wcleApi, WCLERun } from '@/lib/api/wcleApi';
import { OnboardingWidget } from '@/components/wcle/OnboardingWidget';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

function supplierBadge(type: string) {
  const colors: Record<string, string> = {
    FLEMINGTON: 'bg-green-100 text-green-800',
    COSTCO: 'bg-blue-100 text-blue-800',
    BUTCHER: 'bg-red-100 text-red-800',
    ALDI: 'bg-orange-100 text-orange-800',
    CUSTOM: 'bg-gray-100 text-gray-700',
  };
  return colors[type] || colors.CUSTOM;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    OPEN: 'bg-green-100 text-green-700',
    CLOSED: 'bg-yellow-100 text-yellow-700',
    EXECUTED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-red-100 text-red-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export default function CostLoweringPage() {
  const [runs, setRuns] = useState<WCLERun[]>([]);
  const [loading, setLoading] = useState(true);
  const [postcode, setPostcode] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  const loadRuns = useCallback(async (filters: { postcode?: string; supplierFilter?: string } = {}) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.postcode) params.postcode = filters.postcode;
      if (filters.supplierFilter) params.supplier_type = filters.supplierFilter;
      const res = await wcleApi.listRuns(params);
      setRuns(res.runs || []);
    } catch (err) {
      console.error('Failed to load runs:', err);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  function handleSearch() {
    void loadRuns({ postcode, supplierFilter });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
          Weekly Cost-Lowering Engine
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          Join bulk-buying runs in your area. Save 30-50% on fresh produce by buying
          together with your neighbours.
        </p>
      </section>

      {/* Onboarding Widget */}
      <section className="mb-8">
        <OnboardingWidget />
      </section>

      {/* Filters */}
      <section className="flex flex-wrap gap-3 mb-8 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
          <input
            type="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="e.g. 2042"
            className="border border-gray-300 rounded-lg px-3 py-2 w-32 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All suppliers</option>
            <option value="FLEMINGTON">Flemington Markets</option>
            <option value="COSTCO">Costco</option>
            <option value="BUTCHER">Butcher</option>
            <option value="ALDI">Aldi</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Search
        </button>
      </section>

      {/* Runs list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No runs found</p>
          <p className="text-sm">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {runs.map((run) => {
            const savingsEst = (run.retail_equivalent_total_cents || 0) - (run.bulk_estimate_total_cents || 0);
            return (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
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
                    <h3 className="text-lg font-semibold text-gray-900">{run.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {run.location_name || run.address || 'Location TBD'} &middot; {run.suburb || ''} {run.postcode || ''}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(run.run_date).toLocaleDateString('en-AU', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {run.status === 'COMPLETED' && run.retail_equivalent_total_cents ? (
                      <>
                        <p className="text-xs text-gray-400">Community saved</p>
                        <p className="text-lg font-bold text-green-600">
                          {cents((run.retail_equivalent_total_cents || 0) - (run.bulk_actual_total_cents || 0))}
                        </p>
                      </>
                    ) : savingsEst > 0 ? (
                      <>
                        <p className="text-xs text-gray-400">Est. savings</p>
                        <p className="text-lg font-bold text-green-600">{cents(savingsEst)}</p>
                      </>
                    ) : null}
                    <p className="text-xs text-gray-400 mt-1">
                      Fee: {cents(run.coordination_fee_per_household_cents)}/household
                    </p>
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
