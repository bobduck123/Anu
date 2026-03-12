'use client';

import { Inbox, type LucideIcon } from 'lucide-react';
import { Button } from '../primitives/Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-14 h-14 rounded-full bg-[var(--color-muted)] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[var(--color-muted-foreground)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && (onAction || actionHref) && (
        actionHref ? (
          <a href={actionHref}>
            <Button variant="primary" size="sm">{actionLabel}</Button>
          </a>
        ) : (
          <Button variant="primary" size="sm" onClick={onAction}>{actionLabel}</Button>
        )
      )}
    </div>
  );
}
