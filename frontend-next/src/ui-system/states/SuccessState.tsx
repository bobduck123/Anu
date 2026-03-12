'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from '../primitives/Button';

export interface SuccessStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SuccessState({
  title = 'Success!',
  message,
  actionLabel,
  onAction,
  className = '',
}: SuccessStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-[var(--color-sage-light)] flex items-center justify-center mb-4">
        <CheckCircle className="w-7 h-7 text-[var(--color-forest)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        {title}
      </h3>
      {message && (
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mb-4">{message}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
