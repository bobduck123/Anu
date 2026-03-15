'use client';

import Link from 'next/link';
import { ImpactPool } from '@/lib/api/endpoints';
import { ArrowRight } from 'lucide-react';

interface PoolCardsProps {
  pools: ImpactPool[];
  linkBasePath?: string | null;
}

const categoryColors: Record<string, string> = {
  relief: 'var(--color-accent)',
  sovereignty: 'var(--color-institutional)',
  infrastructure: 'var(--color-forest)',
  default: 'var(--color-sage)',
};

export default function PoolCards({ pools, linkBasePath = '/pools' }: PoolCardsProps) {
  if (!pools?.length) {
    return (
      <div className="card-civic text-center py-10">
        <p className="text-[var(--color-earth-medium)]">No pools available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pools.map((pool) => {
        const color = categoryColors[pool.category || 'default'] || categoryColors.default;
        const balance = pool.current_balance_cents / 100;
        const target = pool.target_amount_cents ? pool.target_amount_cents / 100 : null;
        const progress = target ? Math.min(100, (balance / target) * 100) : 0;
        const content = (
          <>
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: color + '15',
                  color: color,
                }}
              >
                {pool.category || 'pool'}
              </span>
              {linkBasePath && (
                <ArrowRight className="w-4 h-4 text-[var(--color-earth-medium)] group-hover:text-[var(--color-institutional)] group-hover:translate-x-1 transition-all duration-300" />
              )}
            </div>

            <h3
              className="font-semibold text-lg text-[var(--color-earth-dark)] mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {pool.name}
            </h3>
            <p className="text-sm text-[var(--color-earth-medium)] line-clamp-2 mb-4">
              {pool.description || 'Shared community resources.'}
            </p>

            <div className="pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-[var(--color-earth-medium)] mb-1">Current balance</p>
                  <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
                    ${balance.toLocaleString()}
                  </p>
                </div>
                {target && (
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-earth-medium)] mb-1">Target</p>
                    <p className="text-sm font-medium text-[var(--color-earth-medium)] font-mono-data">
                      ${target.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {target && (
                <div className="progress-bar mt-3">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              )}
            </div>
          </>
        );

        return linkBasePath ? (
          <Link
            key={pool.id}
            href={`${linkBasePath}/${pool.id}`}
            className="card-civic group"
          >
            {content}
          </Link>
        ) : (
          <div key={pool.id} className="card-civic">
            {content}
          </div>
        );
      })}
    </div>
  );
}
