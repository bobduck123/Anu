'use client';

import type { ReactNode } from 'react';
import { capturePresenceEvent } from '@/lib/api/presence';

interface PresenceTrackedLinkProps {
  slug: string;
  href: string;
  eventType: 'link_clicked' | 'service_clicked' | 'portfolio_item_clicked' | 'work_clicked' | 'collection_clicked' | 'social_clicked';
  metadata?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
}

export function PresenceTrackedLink({ slug, href, eventType, metadata, className, children }: PresenceTrackedLinkProps) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className={className}
      onClick={() => void capturePresenceEvent(slug, eventType, metadata || { href })}
    >
      {children}
    </a>
  );
}
