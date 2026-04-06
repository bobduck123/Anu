'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const organizerAccessRoles = new Set([
  'organizer',
  'node_admin',
  'platform_admin',
  'board_member',
  'treasury_guardian',
]);

type AccessState = 'checking' | 'allowed' | 'blocked';

function hasOrganizerRole(role: string | null | undefined): boolean {
  return !!role && organizerAccessRoles.has(role);
}

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isOnRampRoute = pathname?.startsWith('/organizer/on-ramp') ?? false;
  const nextOrganizerRoute = pathname && !isOnRampRoute ? pathname : '/organizer';
  const onRampRedirectHref = `/organizer/on-ramp?next=${encodeURIComponent(nextOrganizerRoute)}`;

  const [accessState, setAccessState] = useState<AccessState>(isOnRampRoute ? 'allowed' : 'checking');
  const [accessPath, setAccessPath] = useState<string | null>(isOnRampRoute ? pathname ?? null : null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOnRampRoute || authLoading) {
      return;
    }

    let active = true;

    const verifyAccess = async () => {
      if (!isAuthenticated) {
        if (!active) return;
        setNotice('Working now: redirecting to organizer path while access checks complete.');
        setAccessPath(null);
        setAccessState('blocked');
        router.replace(onRampRedirectHref);
        return;
      }

      if (hasOrganizerRole(user?.role)) {
        if (!active) return;
        setAccessPath(pathname ?? null);
        setAccessState('allowed');
        setNotice(null);
        return;
      }

      try {
        const status = await api.organizer.getStatus();
        if (!active) return;

        if (status.isOrganizer || hasOrganizerRole(status.role)) {
          setAccessPath(pathname ?? null);
          setAccessState('allowed');
          setNotice(null);
          return;
        }

        setNotice('Organizer access is not active for this account yet.');
        setAccessPath(null);
        setAccessState('blocked');
        router.replace(onRampRedirectHref);
      } catch {
        if (!active) return;
        setNotice('Live organizer verification is unavailable. Redirecting to organizer path.');
        setAccessPath(null);
        setAccessState('blocked');
        router.replace(onRampRedirectHref);
      }
    };

    void verifyAccess();

    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, isOnRampRoute, onRampRedirectHref, pathname, router, user?.role]);

  const hasRouteAccess = accessState === 'allowed' && accessPath === (pathname ?? null);

  if (isOnRampRoute || hasRouteAccess) {
    return <>{children}</>;
  }

  if (authLoading || accessState === 'checking' || (accessState === 'allowed' && !hasRouteAccess)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.82)]">Checking organizer access…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-14 space-y-4">
        <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
            <div className="space-y-2 min-w-0">
              <p className="text-sm text-[var(--color-foreground)]">Organizer routes require active organizer access.</p>
              {notice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Link href={onRampRedirectHref} className="btn-pill btn-pill-primary text-xs">
                  Open organizer path
                </Link>
                <Link href="/profile" className="btn-pill btn-pill-outline text-xs">
                  Open profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
