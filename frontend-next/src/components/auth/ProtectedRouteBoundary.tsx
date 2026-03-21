'use client';

import { ReactNode } from 'react';
import AuthGateCard from '@/components/auth/AuthGateCard';
import { buildAuthHref } from '@/lib/auth/returnTo';

interface ProtectedRouteBoundaryProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  returnTo: string;
  eyebrow: string;
  title: string;
  description: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children: ReactNode;
}

export default function ProtectedRouteBoundary({
  isLoading,
  isAuthenticated,
  returnTo,
  eyebrow,
  title,
  description,
  secondaryHref,
  secondaryLabel,
  children,
}: ProtectedRouteBoundaryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGateCard
        eyebrow={eyebrow}
        title={title}
        description={description}
        primaryHref={buildAuthHref(returnTo)}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />
    );
  }

  return <>{children}</>;
}
