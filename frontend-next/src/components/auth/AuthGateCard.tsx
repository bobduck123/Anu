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
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-3">{eyebrow}</p>
        <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
          {title}
        </h1>
        <p className="text-[var(--color-earth-medium)] leading-relaxed mb-6">
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
