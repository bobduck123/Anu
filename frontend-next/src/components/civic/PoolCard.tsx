'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

interface PoolCardProps {
  id: string;
  name: string;
  description: string;
  balance: number;
  target?: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

const variantStyles = {
  primary: {
    border: 'border-l-primary',
    progress: 'text-primary',
    light: 'bg-primary-light',
  },
  secondary: {
    border: 'border-l-secondary',
    progress: 'text-secondary',
    light: 'bg-secondary-light',
  },
  tertiary: {
    border: 'border-l-tertiary',
    progress: 'text-tertiary',
    light: 'bg-tertiary-light',
  },
};

export function PoolCard({
  id,
  name,
  description,
  balance,
  target,
  trend,
  trendValue,
  variant = 'primary',
}: PoolCardProps) {
  const styles = variantStyles[variant];
  const progress = target ? Math.min((balance / target) * 100, 100) : null;
  
  return (
    <Link 
      href={`/pools/${id}`}
      className={`group block bg-[var(--color-foreground)] rounded-lg border-l-4 ${styles.border} p-5 hover-lift`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="label text-text-muted mb-1">Impact Pool</p>
          <h3 className="heading-4 text-text">{name}</h3>
        </div>
        <TrendIndicator trend={trend} value={trendValue} />
      </div>
      
      {/* Balance */}
      <div className="mb-4">
        <span className="metric text-text">${balance.toLocaleString()}</span>
        {target && (
          <span className="body-small text-text-secondary ml-2">
            of ${target.toLocaleString()}
          </span>
        )}
      </div>
      
      {/* Progress */}
      {progress !== null && (
        <div className="mb-4">
          <div className="progress-clean">
            <div 
              className={`progress-clean-fill ${styles.progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Description */}
      <p className="body-small text-text-secondary">{description}</p>
    </Link>
  );
}

function TrendIndicator({ trend, value }: { trend: string; value: string }) {
  const config = {
    up: {
      icon: TrendingUp,
      color: 'text-tertiary bg-tertiary-light',
    },
    down: {
      icon: TrendingDown,
      color: 'text-highlight bg-highlight-light',
    },
    neutral: {
      icon: Minus,
      color: 'text-text-secondary bg-surface',
    },
  };
  
  const { icon: Icon, color } = config[trend as keyof typeof config] || config.neutral;
  
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="metric-small">{value}</span>
    </div>
  );
}
