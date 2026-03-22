'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { membershipsApi, MembershipPlan, SubscriptionStatus } from '@/lib/api/endpoints';
import {
  AnuChip,
  AnuControlButton,
  AnuControlLink,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import {
  ArrowRight,
  Check,
  CreditCard,
  Flame,
  Leaf,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';

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

const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  'pending',
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
]);

function formatSubscriptionLabel(status: string | null): string {
  if (!status) {
    return 'No active plan';
  }

  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function MembershipNotice({
  label,
  children,
  tone = 'muted',
}: {
  label: string;
  children: string;
  tone?: 'muted' | 'accent' | 'signal';
}) {
  return (
    <AnuSurfacePanel tone="soft" className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <AnuChip tone={tone}>{label}</AnuChip>
          <p className="mt-3 text-sm leading-6 text-slate-300/84">{children}</p>
        </div>
      </div>
    </AnuSurfacePanel>
  );
}

export default function MembershipsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authHref = '/auth';
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<'success' | 'canceled' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<number | null>(null);

  const subscriptionStatus = status?.subscription?.status || null;
  const hasGuardedSubscription = subscriptionStatus
    ? BLOCKED_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
    : false;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const isSuccess = url.searchParams.get('success') === '1';
    const isCanceled = url.searchParams.get('canceled') === '1';

    if (!isSuccess && !isCanceled) {
      return;
    }

    setCheckoutNotice(isSuccess ? 'success' : 'canceled');
    url.searchParams.delete('success');
    url.searchParams.delete('canceled');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setLoading(true);

    Promise.all([
      membershipsApi.listPlans(),
      isAuthenticated ? membershipsApi.status() : Promise.resolve(FALLBACK_STATUS),
    ])
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
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (checkoutNotice !== 'success' || authLoading || !isAuthenticated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      membershipsApi.status().then(setStatus).catch(() => undefined);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [authLoading, checkoutNotice, isAuthenticated]);

  const subscribe = async (planId: number) => {
    if (!isAuthenticated) {
      return;
    }

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

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === status?.subscription?.plan_id) || null,
    [plans, status?.subscription?.plan_id],
  );

  const membershipStateValue = !isAuthenticated
    ? 'Public browse'
    : status?.is_subscribed
      ? activePlan?.name || 'Active'
      : formatSubscriptionLabel(subscriptionStatus);

  const streakValue = status?.subscription?.streak_months || 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow="Commons memberships"
          title="Sustain the Commons"
          description="Choose a membership that funds community-led relief, learning, and care. The route stays public, the ledger stays legible, and checkout stays securely off-platform until Stripe hands control back."
          actions={
            <>
              {isAuthenticated ? (
                <AnuControlLink href="/impact" tone="active" iconRight={ArrowRight}>
                  View impact ledger
                </AnuControlLink>
              ) : (
                <AnuControlLink href={authHref} tone="active" iconRight={ArrowRight}>
                  Sign in to begin
                </AnuControlLink>
              )}
              <AnuControlLink href="/transparency" tone="default" iconRight={ArrowRight}>
                Open transparency
              </AnuControlLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal" icon={ShieldCheck}>
                  Secure checkout
                </AnuChip>
                <AnuChip tone="muted" icon={Sparkles}>
                  Transparent contribution trail
                </AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                Memberships are public to evaluate, but checkout and account state stay guarded.
                This route should explain the covenant clearly before anyone commits.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Plans live"
              value={loading ? 'Loading' : String(plans.length)}
              detail="Three tiers fund different levels of recurring commons support."
            />
            <AnuHeroMetric
              label="Membership state"
              value={membershipStateValue}
              detail={
                isAuthenticated
                  ? 'Signed-in members can start checkout or manage an existing covenant.'
                  : 'Browse first, then sign in when you are ready to start secure checkout.'
              }
            />
            <AnuHeroMetric
              label="Checkout path"
              value={isAuthenticated ? 'Ready' : 'Sign-in gated'}
              detail="Stripe handles payment collection. ANU only receives the resulting subscription state."
            />
          </div>
        </AnuPageHero>

        {status?.is_subscribed ? (
          <MembershipNotice label="Active membership" tone="signal">
            {`Current plan ${activePlan?.name || 'membership'} with ${formatSubscriptionLabel(subscriptionStatus)} status and ${streakValue} month streak.`}
          </MembershipNotice>
        ) : null}

        {error ? (
          <MembershipNotice label="Membership surface degraded" tone="accent">
            {error}
          </MembershipNotice>
        ) : null}

        {checkoutNotice === 'success' ? (
          <MembershipNotice label="Checkout syncing" tone="signal">
            Checkout returned successfully. Your membership will appear here as soon as payment confirmation finishes syncing.
          </MembershipNotice>
        ) : null}

        {checkoutNotice === 'canceled' ? (
          <MembershipNotice label="Checkout canceled">
            Checkout was canceled. No charge was made, and you can choose a plan whenever you are ready.
          </MembershipNotice>
        ) : null}

        {subscriptionStatus === 'pending' && checkoutNotice !== 'success' ? (
          <MembershipNotice label="Processing membership" tone="signal">
            Your membership checkout is still processing. The active view will unlock after payment confirmation lands.
          </MembershipNotice>
        ) : null}

        {(subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') ? (
          <MembershipNotice label="Payment attention required" tone="accent">
            Your current membership needs payment attention before you can start another plan.
          </MembershipNotice>
        ) : null}

        {!isAuthenticated && !authLoading ? (
          <MembershipNotice label="Public preview">
            Plans are public. Sign in when you are ready to start secure checkout and track your membership.
          </MembershipNotice>
        ) : null}

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <AnuInstrumentationCard
            label="Transparent impact"
            value={status?.is_subscribed ? 'Live' : 'Open'}
            detail="Every plan points members back toward impact and transparency surfaces instead of hiding the public ledger."
            icon={Flame}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Contribution cadence"
            value={plans.length ? `${plans[0]?.credit_grant_monthly || 0}-${plans[plans.length - 1]?.credit_grant_monthly || 0}` : '0'}
            detail="Monthly impact credits scale from the first tier upward without changing the route language."
            icon={Leaf}
          />
          <AnuInstrumentationCard
            label="Accountability mode"
            value={status?.is_subscribed ? `${streakValue} month streak` : 'Ready to begin'}
            detail="Members keep a visible streak and status state once checkout has been confirmed."
            icon={CreditCard}
            tone={status?.is_subscribed ? 'signal' : 'steady'}
          />
        </div>

        <section className="mt-12">
          <AnuSectionHeading
            eyebrow="Contribution tiers"
            title="Choose a covenant"
            description="The plan cards now share the same ANU panel language as the rest of the shell, while keeping the membership decision clear and operational."
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-institutional)]" />
            </div>
          ) : plans.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const meta = tierMeta[plan.name] || {
                  accent: 'var(--color-sage)',
                  badge: 'Plan',
                };
                const price = (plan.amount_cents / 100).toFixed(2);
                const isPopular = index === 1;

                return (
                  <AnuSurfacePanel
                    key={plan.id}
                    tone={isPopular ? 'shell' : 'soft'}
                    className="relative flex h-full flex-col overflow-hidden"
                  >
                    <div
                      className="absolute inset-x-8 top-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${meta.accent}, transparent)` }}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        <AnuChip tone={isPopular ? 'accent' : 'muted'} icon={isPopular ? Star : Leaf}>
                          {isPopular ? 'Most chosen' : meta.badge}
                        </AnuChip>
                        <span
                          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]"
                          style={{ borderColor: `${meta.accent}55`, color: meta.accent }}
                        >
                          {plan.pool_allocation_pct || 'Pooled'}
                        </span>
                      </div>
                    </div>

                    <h2
                      className="mt-6 text-3xl text-white"
                      style={{ fontFamily: 'var(--anu-type-display)' }}
                    >
                      {plan.name}
                    </h2>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-semibold text-white font-mono-data">${price}</span>
                      <span className="text-sm text-slate-400">per month</span>
                    </div>

                    <div className="mt-6 space-y-3 text-sm text-slate-200/84">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: meta.accent }} />
                        <span>{plan.credit_grant_monthly} impact credits each month</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: meta.accent }} />
                        <span>Pool allocation included in the plan covenant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: meta.accent }} />
                        <span>Streak bonuses reward steady support over time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 flex-shrink-0" style={{ color: meta.accent }} />
                        <span>Transparency and impact routes stay visible after signup</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-2">
                      {isAuthenticated ? (
                        hasGuardedSubscription ? (
                          status?.is_subscribed ? (
                            <AnuControlLink href="/impact" tone="active" iconRight={ArrowRight} className="w-full justify-center">
                              View impact
                            </AnuControlLink>
                          ) : (
                            <AnuControlButton tone="warning" disabled className="w-full justify-center">
                              {subscriptionStatus === 'pending' || subscriptionStatus === 'incomplete'
                                ? 'Checkout pending'
                                : 'Resolve current plan'}
                            </AnuControlButton>
                          )
                        ) : (
                          <AnuControlButton
                            onClick={() => void subscribe(plan.id)}
                            disabled={subscribing !== null}
                            tone={isPopular ? 'active' : 'default'}
                            className="w-full justify-center"
                          >
                            {subscribing === plan.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {subscribing === plan.id ? 'Redirecting...' : 'Subscribe'}
                          </AnuControlButton>
                        )
                      ) : (
                        <AnuControlLink href={authHref} tone={isPopular ? 'active' : 'default'} iconRight={ArrowRight} className="w-full justify-center">
                          Sign in to subscribe
                        </AnuControlLink>
                      )}
                    </div>
                  </AnuSurfacePanel>
                );
              })}
            </div>
          ) : (
            <AnuSurfacePanel tone="soft" className="mt-8 text-center">
              <p className="text-sm text-slate-300/82">No plans are configured yet. Check back soon.</p>
            </AnuSurfacePanel>
          )}
        </section>

        <AnuSurfacePanel tone="quiet" className="mt-10 text-center">
          <p className="text-sm text-slate-300/82">
            <strong className="text-white">Secure checkout.</strong> Stripe collects payment details off-platform,
            and ANU stores only the resulting subscription state needed to operate the commons.
          </p>
        </AnuSurfacePanel>
      </div>
    </div>
  );
}
