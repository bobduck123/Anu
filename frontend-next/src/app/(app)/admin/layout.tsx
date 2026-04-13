import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ShieldAlert } from 'lucide-react';
import {
  evaluateControlRouteAccess,
  getControlPlaneHostsFromEnv,
  getRequestHostnameFromHeaders,
} from '@/lib/auth/controlSession';

export default async function AdminShimLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const hostname = getRequestHostnameFromHeaders(headerStore);
  const access = evaluateControlRouteAccess(hostname, getControlPlaneHostsFromEnv());

  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-[color:rgba(124,65,60,0.28)] bg-[color:rgba(124,65,60,0.10)] p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--color-foreground)]" />
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">Legacy admin shims are control-host only.</p>
              <p className="text-sm text-[color:rgba(246,212,203,0.86)]">
                Canonical operator routes are now under <code>/control/*</code>. This host cannot access legacy admin shims.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/control" className="btn-pill btn-pill-primary text-xs">
                  Open control home
                </Link>
                <Link href="/home" className="btn-pill btn-pill-outline text-xs">
                  Open home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
