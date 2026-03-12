'use client';

export type LoadingVariant = 'spinner' | 'skeleton' | 'dots';

export interface LoadingStateProps {
  variant?: LoadingVariant;
  message?: string;
  fullPage?: boolean;
  className?: string;
}

export function LoadingState({ variant = 'spinner', message, fullPage = false, className = '' }: LoadingStateProps) {
  const wrapper = fullPage ? 'min-h-screen flex items-center justify-center' : 'flex items-center justify-center py-12';

  if (variant === 'skeleton') {
    return (
      <div className={`space-y-4 animate-pulse ${className}`}>
        <div className="h-8 w-1/3 bg-[var(--color-muted)] rounded" />
        <div className="h-4 w-2/3 bg-[var(--color-muted)] rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-[var(--color-muted)] rounded-lg" />
          ))}
        </div>
        <div className="h-4 w-1/2 bg-[var(--color-muted)] rounded" />
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`${wrapper} ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          {message && <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${wrapper} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--color-muted)] border-t-[var(--color-primary)]" />
        {message && <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}
      </div>
    </div>
  );
}
