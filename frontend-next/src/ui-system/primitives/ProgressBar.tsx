'use client';

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'sage' | 'forest' | 'institutional' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const colorClasses: Record<string, string> = {
  sage: 'bg-[var(--color-sage)]',
  forest: 'bg-[var(--color-forest)]',
  institutional: 'bg-[var(--color-institutional)]',
  accent: 'bg-[var(--color-accent)]',
  danger: 'bg-[var(--color-danger)]',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  max = 100,
  color = 'sage',
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-xs text-[var(--color-muted-foreground)] mb-1">
          <span>{Math.round(pct)}%</span>
          <span>{value} / {max}</span>
        </div>
      )}
      <div className={`w-full bg-[var(--color-muted)] rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClasses[color]}`}
          style={{ width: `${pct}%`, transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </div>
    </div>
  );
}
