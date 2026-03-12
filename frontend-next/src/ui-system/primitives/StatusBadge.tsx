'use client';

import type { ReactNode } from 'react';

export type BadgeStatus =
  | 'draft'
  | 'open'
  | 'closed'
  | 'confirmed'
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'approved'
  | 'rejected';

const statusStyles: Record<BadgeStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-[var(--color-muted)]', text: 'text-[var(--color-muted-foreground)]' },
  open: { bg: 'bg-[var(--color-sage-light)]', text: 'text-[var(--color-forest)]' },
  closed: { bg: 'bg-[var(--color-muted)]', text: 'text-[var(--color-muted-foreground)]' },
  confirmed: { bg: 'bg-[var(--color-sage-light)]', text: 'text-[var(--color-forest)]' },
  pending: { bg: 'bg-[var(--color-accent-light)]', text: 'text-[var(--color-accent)]' },
  active: { bg: 'bg-[var(--color-institutional-light)]', text: 'text-[var(--color-institutional)]' },
  completed: { bg: 'bg-[var(--color-sage-light)]', text: 'text-[var(--color-forest)]' },
  cancelled: { bg: 'bg-[var(--color-danger-light)]', text: 'text-[var(--color-danger)]' },
  expired: { bg: 'bg-[var(--color-muted)]', text: 'text-[var(--color-muted-foreground)]' },
  approved: { bg: 'bg-[var(--color-sage-light)]', text: 'text-[var(--color-forest)]' },
  rejected: { bg: 'bg-[var(--color-danger-light)]', text: 'text-[var(--color-danger)]' },
};

export interface StatusBadgeProps {
  status: BadgeStatus | string;
  children?: ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, children, className = '', dot = false }: StatusBadgeProps) {
  const style = statusStyles[status as BadgeStatus] || statusStyles.draft;
  const label = children || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${className}`}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}
