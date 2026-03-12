'use client';

import { useEffect, useState } from 'react';
import { membershipsApi, MembershipPlan } from '@/lib/api/endpoints';
import { CreditCard, Plus, Loader2, Settings } from 'lucide-react';

export default function AdminMembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    node_id: 'default-node',
    name: '',
    amount_cents: 5000,
    credit_grant_monthly: 50,
    pool_allocation_pct: 'relief:60,education:20,perks:20',
    stripe_price_id: '',
    is_active: true,
  });

  const loadPlans = () => {
    membershipsApi
      .listPlans()
      .then(setPlans)
      .catch((err) => setError(err.message || 'Failed to load plans'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await membershipsApi.createPlan(form);
      setForm((prev) => ({ ...prev, name: '', stripe_price_id: '' }));
      loadPlans();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create plan';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <Settings className="w-4 h-4" />
            Administration
          </span>
          <h1
            className="text-3xl md:text-4xl font-semibold text-[var(--color-earth-dark)] mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Membership Plans
          </h1>
          <p className="text-[var(--color-earth-medium)]">
            Create or review membership plans for your node.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-danger-light)] border border-[var(--color-danger)] mb-6">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
          </div>
        )}

        {/* Create Plan Form */}
        <form onSubmit={submit} className="card-civic mb-10">
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-4 h-4 text-[var(--color-institutional)]" />
            <h2
              className="text-lg font-semibold text-[var(--color-earth-dark)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Create New Plan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Node ID</span>
              <input
                className="w-full mt-1.5 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                value={form.node_id}
                onChange={(e) => setForm({ ...form, node_id: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Plan Name</span>
              <input
                className="w-full mt-1.5 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Amount (cents)</span>
              <input
                type="number"
                className="w-full mt-1.5 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] font-mono-data focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                value={form.amount_cents}
                onChange={(e) => setForm({ ...form, amount_cents: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Credits / month</span>
              <input
                type="number"
                className="w-full mt-1.5 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] font-mono-data focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                value={form.credit_grant_monthly}
                onChange={(e) => setForm({ ...form, credit_grant_monthly: Number(e.target.value) })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Pool allocation</span>
              <input
                className="w-full mt-1.5 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                value={form.pool_allocation_pct}
                onChange={(e) => setForm({ ...form, pool_allocation_pct: e.target.value })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider">Stripe Price ID</span>
              <input
                className="w-full mt-1.5 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] font-mono-data focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)] transition-shadow"
                value={form.stripe_price_id}
                onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
                placeholder="price_..."
                required
              />
            </label>
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)]">
            <label className="flex items-center gap-2 text-sm text-[var(--color-earth-dark)]">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={() => setForm({ ...form, is_active: !form.is_active })}
                className="rounded border-[var(--color-border)]"
              />
              Active
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="btn-pill btn-pill-primary text-sm"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Plan
            </button>
          </div>
        </form>

        {/* Existing Plans */}
        <section>
          <h2
            className="text-xl font-semibold text-[var(--color-earth-dark)] mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Existing Plans
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
            </div>
          ) : plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className="card-civic">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-[var(--color-earth-dark)]">{plan.name}</h3>
                    <span className="text-xs text-[var(--color-earth-medium)] font-mono-data bg-[var(--color-muted)] px-2 py-1 rounded">
                      #{plan.id}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-[var(--color-earth-dark)] font-mono-data">
                    ${(plan.amount_cents / 100).toFixed(2)}
                    <span className="text-sm font-normal text-[var(--color-earth-medium)]"> /month</span>
                  </p>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-earth-medium)]">
                    <span><CreditCard className="w-3 h-3 inline mr-1" />{plan.credit_grant_monthly} credits</span>
                    <span className="font-mono-data">{plan.stripe_price_id}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-civic text-center py-10">
              <p className="text-[var(--color-earth-medium)]">No plans configured yet.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
