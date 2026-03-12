'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '../primitives/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-[var(--color-danger-light)] flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-[var(--color-danger)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        {title}
      </h3>
      <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
