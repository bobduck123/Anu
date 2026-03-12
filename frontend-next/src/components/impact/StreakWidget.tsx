'use client';

import { Flame, Star } from 'lucide-react';

interface StreakWidgetProps {
  streakMonths: number;
  nextMilestone?: number;
}

export default function StreakWidget({ streakMonths, nextMilestone = 6 }: StreakWidgetProps) {
  const progress = Math.min(100, Math.round((streakMonths / nextMilestone) * 100));
  const multiplier = Math.min(1 + Math.floor(streakMonths / 3) * 0.1, 1.5);

  return (
    <div className="card-civic">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--color-earth-dark)]">Membership Streak</h3>
        <div className="flex items-center gap-1 text-[var(--color-accent)]">
          <Flame className="w-4 h-4" />
          <span className="text-sm font-semibold font-mono-data">{streakMonths}</span>
        </div>
      </div>
      <p className="text-sm text-[var(--color-earth-medium)] mb-4">
        {streakMonths} months active. Next recognition at {nextMilestone} months.
      </p>

      {/* Streak dots */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: nextMilestone }).map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: i < streakMonths
                ? 'var(--color-sage)'
                : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Multiplier badge */}
      {multiplier > 1 && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--color-forest)]">
          <Star className="w-3.5 h-3.5" />
          <span className="font-medium">{multiplier.toFixed(1)}x credit multiplier active</span>
        </div>
      )}
    </div>
  );
}
