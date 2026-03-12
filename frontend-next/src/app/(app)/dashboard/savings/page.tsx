'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { wcleApi, WCLESavingsSummary, WCLECommunitySavings } from '@/lib/api/wcleApi';

function cents(v: number | null | undefined): string {
  if (v == null) return '$0.00';
  return `$${(v / 100).toFixed(2)}`;
}

export default function SavingsDashboard() {
  const [savings, setSavings] = useState<WCLESavingsSummary | null>(null);
  const [community, setCommunity] = useState<WCLECommunitySavings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      wcleApi.mySavings().catch(() => null),
      wcleApi.communitySavings().catch(() => null),
    ]).then(([s, c]) => {
      setSavings(s);
      setCommunity(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const s = savings || {
    savings_this_week_cents: 0,
    savings_this_month_cents: 0,
    savings_this_year_cents: 0,
    savings_lifetime_cents: 0,
    runs_participated: 0,
    participation_streak_weeks: 0,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
        Savings Dashboard
      </h1>
      <p className="text-gray-500 mb-8">Track how much you&apos;re saving through bulk buying.</p>

      {/* Personal savings cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="This Week" value={cents(s.savings_this_week_cents)} accent="green" />
        <StatCard label="This Month" value={cents(s.savings_this_month_cents)} accent="green" />
        <StatCard label="Year to Date" value={cents(s.savings_this_year_cents)} accent="emerald" />
        <StatCard label="Lifetime" value={cents(s.savings_lifetime_cents)} accent="emerald" large />
      </div>

      {/* Streak + Participation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-4xl font-bold text-green-600">{s.participation_streak_weeks}</p>
          <p className="text-sm text-gray-500 mt-1">Week streak</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-4xl font-bold text-gray-800">{s.runs_participated}</p>
          <p className="text-sm text-gray-500 mt-1">Runs joined</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-4xl font-bold text-emerald-600">
            {cents(community?.total_savings_cents)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Community total saved</p>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-gray-700 mb-3">Keep your streak going! Join this week&apos;s run.</p>
        <Link
          href="/cost-lowering"
          className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Browse Runs
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = 'green', large = false }: {
  label: string;
  value: string;
  accent?: string;
  large?: boolean;
}) {
  const textColor = accent === 'emerald' ? 'text-emerald-600' : 'text-green-600';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`${large ? 'text-3xl' : 'text-2xl'} font-bold ${textColor} mt-1`}>
        {value}
      </p>
    </div>
  );
}
