'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRouteBoundary from '@/components/auth/ProtectedRouteBoundary';
import { wcleApi, WCLESavingsSummary, WCLECommunitySavings } from '@/lib/api/wcleApi';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

export default function SavingsDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [savings, setSavings] = useState<WCLESavingsSummary | null>(null);
  const [community, setCommunity] = useState<WCLECommunitySavings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    Promise.all([wcleApi.mySavings().catch(() => null), wcleApi.communitySavings().catch(() => null)])
      .then(([summary, communitySummary]) => {
        setSavings(summary);
        setCommunity(communitySummary);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  const summary =
    savings ||
    ({
      savings_this_week_cents: 0,
      savings_this_month_cents: 0,
      savings_this_year_cents: 0,
      savings_lifetime_cents: 0,
      runs_participated: 0,
      participation_streak_weeks: 0,
    } satisfies WCLESavingsSummary);

  return (
    <ProtectedRouteBoundary
      isLoading={authLoading}
      isAuthenticated={isAuthenticated}
      returnTo="/dashboard/savings"
      eyebrow="Savings Dashboard"
      title="Sign in to track your savings"
      description="Personal savings, participation streaks, and run history are tied to your account. Sign in to see your dashboard."
      secondaryHref="/cost-lowering"
      secondaryLabel="Browse runs"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Savings Dashboard
          </h1>
          <p className="text-white/70 mb-8">Track how much you&apos;re saving through weekly bulk buying runs.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="This Week" value={cents(summary.savings_this_week_cents)} accent="green" />
            <StatCard label="This Month" value={cents(summary.savings_this_month_cents)} accent="green" />
            <StatCard label="Year to Date" value={cents(summary.savings_this_year_cents)} accent="emerald" />
            <StatCard label="Lifetime" value={cents(summary.savings_lifetime_cents)} accent="emerald" large />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-civic text-center">
              <p className="text-4xl font-bold text-emerald-200">{summary.participation_streak_weeks}</p>
              <p className="text-sm text-white/70 mt-1">Week streak</p>
            </div>
            <div className="card-civic text-center">
              <p className="text-4xl font-bold text-white">{summary.runs_participated}</p>
              <p className="text-sm text-white/70 mt-1">Runs joined</p>
            </div>
            <div className="card-civic text-center">
              <p className="text-4xl font-bold text-emerald-200">{cents(community?.total_savings_cents)}</p>
              <p className="text-sm text-white/70 mt-1">Community total saved</p>
            </div>
          </div>

          <div className="card-civic text-center">
            <p className="text-white/80 mb-3">Keep your streak going. Join this week&apos;s run.</p>
            <Link href="/cost-lowering" className="btn-pill btn-pill-primary">
              Browse Runs
            </Link>
          </div>
        </div>
      )}
    </ProtectedRouteBoundary>
  );
}

function StatCard({
  label,
  value,
  accent = 'green',
  large = false,
}: {
  label: string;
  value: string;
  accent?: string;
  large?: boolean;
}) {
  const textColor = accent === 'emerald' ? 'text-emerald-200' : 'text-emerald-100';
  return (
    <div className="card-civic">
      <p className="text-xs text-white/60 uppercase tracking-wide">{label}</p>
      <p className={`${large ? 'text-3xl' : 'text-2xl'} font-bold ${textColor} mt-1`}>{value}</p>
    </div>
  );
}
