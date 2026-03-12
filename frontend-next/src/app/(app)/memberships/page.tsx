'use client';

import { useEffect, useState } from 'react';
import { membershipsApi, MembershipPlan, SubscriptionStatus } from '@/lib/api/endpoints';
import { CreditCard, Check, Flame, Loader2, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const tierMeta: Record<string, { accent: string; badge: string }> = {
  Seed: { accent: 'var(--color-sage)', badge: 'Starter' },
  Sapling: { accent: 'var(--color-forest)', badge: 'Growing' },
  Forest: { accent: 'var(--color-institutional)', badge: 'Sustainer' },
};

const FALLBACK_PLANS: MembershipPlan[] = [
  {
    id: 1,
    name: 'Seed',
    amount_cents: 1200,
    credit_grant_monthly: 12,
    pool_allocation_pct: '15%',
    stripe_price_id: 'demo_seed',
  },
  {
    id: 2,
    name: 'Sapling',
    amount_cents: 2400,
    credit_grant_monthly: 30,
    pool_allocation_pct: '25%',
    stripe_price_id: 'demo_sapling',
  },
  {
    id: 3,
    name: 'Forest',
    amount_cents: 5000,
    credit_grant_monthly: 75,
    pool_allocation_pct: '40%',
    stripe_price_id: 'demo_forest',
  },
];

const FALLBACK_STATUS: SubscriptionStatus = {
  is_subscribed: false,
  subscription: null,
};

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([membershipsApi.listPlans(), membershipsApi.status()])
      .then(([planData, statusData]) => {
        setPlans(planData.length ? planData : FALLBACK_PLANS);
        setStatus(statusData || FALLBACK_STATUS);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load memberships';
        setError(message);
        setPlans(FALLBACK_PLANS);
        setStatus(FALLBACK_STATUS);
      })
      .finally(() => setLoading(false));
  }, []);

  const subscribe = async (planId: number) => {
    try {
      setSubscribing(planId);
      const res = await membershipsApi.createCheckout(planId);
      window.location.assign(res.checkout_url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      setError(message);
      setSubscribing(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <CreditCard className="w-4 h-4" />
            Memberships
          </span>
          <h1
            className="text-3xl md:text-5xl font-semibold text-[var(--color-earth-dark)] mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Sustain the Commons
          </h1>
          <p className="text-lg text-[var(--color-earth-medium)] max-w-2xl mx-auto">
            Choose a plan that funds community-led relief, learning, and care.
            Every dollar is transparent.
          </p>
        </div>

        {/* Active Subscription Banner */}
        {status?.is_subscribed && (
          <div
            className="rounded-xl p-6 mb-10 border"
            style={{
              backgroundColor: 'var(--color-sage-light)',
              borderColor: 'var(--color-sage)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-sage)' }}
                >
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--color-earth-dark)]">
                    Active Subscription
                  </p>
                  <p className="text-sm text-[var(--color-earth-medium)]">
                    Status: {status.subscription?.status}
                    {' · '}
                    <Flame className="w-3.5 h-3.5 inline text-[var(--color-accent)]" />
                    {' '}{status.subscription?.streak_months || 0} month streak
                  </p>
                </div>
              </div>
              <Link
                href="/impact"
                className="btn-pill btn-pill-outline text-sm"
              >
                View Impact
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)] mb-8">
            <p className="text-sm text-[var(--color-accent)]">{error}</p>
          </div>
        )}

        {/* Plan Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
          </div>
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const meta = tierMeta[plan.name] || {
                accent: 'var(--color-sage)',
                badge: 'Plan',
              };
              const price = (plan.amount_cents / 100).toFixed(2);
              const isPopular = index === 1;

              return (
                <div
                  key={plan.id}
                  className={`card-civic relative flex flex-col ${
                    isPopular ? 'ring-2' : ''
                  }`}
                  style={isPopular ? { borderColor: meta.accent, boxShadow: `0 0 0 2px ${meta.accent}` } : undefined}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white px-3 py-1 rounded-full"
                      style={{ backgroundColor: meta.accent }}
                    >
                      <Star className="w-3 h-3 inline mr-1" />
                      Most Popular
                    </div>
                  )}

                  {/* Tier badge */}
                  <span
                    className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full w-fit mb-4"
                    style={{
                      backgroundColor: meta.accent + '15',
                      color: meta.accent,
                    }}
                  >
                    {meta.badge}
                  </span>

                  <h2
                    className="text-2xl font-semibold text-[var(--color-earth-dark)] mb-2"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {plan.name}
                  </h2>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
                      ${price}
                    </span>
                    <span className="text-sm text-[var(--color-earth-medium)]">/month</span>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: meta.accent }} />
                      <span className="text-[var(--color-earth-dark)]">
                        {plan.credit_grant_monthly} impact credits/month
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: meta.accent }} />
                      <span className="text-[var(--color-earth-dark)]">
                        Pool allocation included
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: meta.accent }} />
                      <span className="text-[var(--color-earth-dark)]">
                        Streak bonus multiplier
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: meta.accent }} />
                      <span className="text-[var(--color-earth-dark)]">
                        Transparent ledger access
                      </span>
                    </div>
                  </div>

                  {/* Subscribe button */}
                  <button
                    onClick={() => subscribe(plan.id)}
                    disabled={subscribing !== null}
                    className="btn-pill w-full justify-center text-white"
                    style={{ backgroundColor: meta.accent }}
                  >
                    {subscribing === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {subscribing === plan.id ? 'Redirecting...' : 'Subscribe'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-civic text-center py-10">
            <p className="text-[var(--color-earth-medium)]">
              No plans configured yet. Check back soon.
            </p>
          </div>
        )}

        {/* Privacy footer */}
        <div className="mt-10 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]">
          <p className="text-sm text-[var(--color-earth-medium)] text-center">
            <strong>Secure checkout</strong> powered by Stripe. Your payment information
            is never stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
