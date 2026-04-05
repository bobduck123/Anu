'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { FlaskConical, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateCard from '@/components/auth/AuthGateCard';
import { buildAuthHref } from '@/lib/auth/returnTo';

const SANDBOX_STEWARD_ROLES = new Set([
  'organizer',
  'node_admin',
  'platform_admin',
  'board_member',
  'treasury_guardian',
]);

export function hasSandboxAccessRole(role: string | null | undefined): boolean {
  return !!role && SANDBOX_STEWARD_ROLES.has(role);
}

interface SandboxAccessBoundaryProps {
  returnTo: string;
  children: ReactNode;
}

export function SandboxAccessBoundary({ returnTo, children }: SandboxAccessBoundaryProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#e0b115]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGateCard
        eyebrow="Internal sandbox"
        title="Sign in to open the ANU sandbox"
        description="The sandbox cluster is reserved for ANU implementation, validation, and steward review. Sign in with a steward-capable account to continue."
        primaryHref={buildAuthHref(returnTo)}
        secondaryHref="/home"
        secondaryLabel="Back to steward home"
      />
    );
  }

  if (!hasSandboxAccessRole(user?.role)) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <section className="anu-lab-shell rounded-[2rem] px-6 py-8 md:px-8 md:py-10">
          <div className="flex max-w-3xl flex-col gap-5">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e0b115]/35 bg-[#1e0227] text-[#f6d4cb]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="anu-lab-kicker">Internal route</p>
              <h1 className="mt-3 text-4xl leading-[1.04] text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                The sandbox is restricted to steward and admin roles
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:rgba(246,212,203,0.86)]">
                This route is used for UI validation, pattern-bank review, and controlled implementation work. Your
                account is signed in, but it does not currently carry the steward role set required for sandbox access.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/home" className="anu-lab-button anu-lab-button-primary inline-flex min-h-11 items-center gap-2">
                Return home
              </Link>
              <Link href="/profile" className="anu-lab-button anu-lab-button-secondary inline-flex min-h-11 items-center gap-2">
                Review profile
              </Link>
            </div>
          </div>
        </section>

        <section className="anu-lab-panel rounded-[1.6rem] p-5 md:p-6">
          <div className="flex items-center gap-2 text-[#f6d4cb]">
            <FlaskConical className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.22em]">Why this is gated</p>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
            <li className="rounded-[1rem] border border-[color:rgba(246,212,203,0.1)] bg-[var(--color-foreground)]/[0.045] px-4 py-3">
              Sandbox surfaces can expose in-flight patterns before they are hardened for wider audiences.
            </li>
            <li className="rounded-[1rem] border border-[color:rgba(246,212,203,0.1)] bg-[var(--color-foreground)]/[0.045] px-4 py-3">
              Promotion decisions here affect the production shell, community browse, and chamber system.
            </li>
            <li className="rounded-[1rem] border border-[color:rgba(246,212,203,0.1)] bg-[var(--color-foreground)]/[0.045] px-4 py-3">
              Internal review protects the product from drifting into raw reference copying or unstable experiments.
            </li>
          </ul>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
