'use client';

import Link from 'next/link';

interface AuthGateCardProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export default function AuthGateCard({
  eyebrow,
  title,
  description,
  primaryHref = '/auth',
  primaryLabel = 'Sign in',
  secondaryHref,
  secondaryLabel,
}: AuthGateCardProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="card-civic">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.68)] mb-3">{eyebrow}</p>
        <h1 className="text-3xl font-semibold text-[var(--color-foreground)] mb-4" style={{ fontFamily: 'var(--anu-type-display)' }}>
          {title}
        </h1>
        <p className="text-[color:rgba(246,212,203,0.82)] leading-relaxed mb-6">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={primaryHref} className="btn-pill btn-pill-primary text-center">
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref} className="btn-pill btn-pill-outline text-center">
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
