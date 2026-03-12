'use client';

import { Activity, Flame, TrendingUp } from 'lucide-react';

interface ImpactHeaderProps {
  tier?: string;
  streakMonths?: number;
}

export default function ImpactHeader({ tier, streakMonths }: ImpactHeaderProps) {
  const tierLabel = tier === 'active' ? 'Active Member' : tier || 'Community';

  return (
    <div
      className="rounded-xl p-8 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, var(--color-institutional) 0%, var(--color-forest) 100%)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-white/70 mb-2">
            <Activity className="w-4 h-4" />
            Impact Home
          </span>
          <h1
            className="text-2xl md:text-4xl font-semibold text-white mb-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Your Civic Commons
          </h1>
          <p className="text-white/70 max-w-lg">
            A steady, privacy-forward membership that funds relief, learning, and care.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 min-w-[120px]">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-white/60" />
              <p className="text-xs text-white/60 font-medium">Tier</p>
            </div>
            <p className="text-lg font-semibold text-white">{tierLabel}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4 min-w-[120px]">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-white/60" />
              <p className="text-xs text-white/60 font-medium">Streak</p>
            </div>
            <p className="text-lg font-semibold text-white font-mono-data">
              {streakMonths ?? 0} <span className="text-sm font-normal text-white/60">mo</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
