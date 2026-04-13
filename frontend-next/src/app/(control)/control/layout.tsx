import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  evaluateControlRouteAccess,
  getControlPlaneHostsFromEnv,
  getRequestHostnameFromHeaders,
} from '@/lib/auth/controlSession';

export default async function ControlLayout({ children }: { children: ReactNode }) {
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
              <p className="text-sm font-semibold text-[var(--color-foreground)]">Control routes are isolated to control hosts.</p>
              <p className="text-sm text-[color:rgba(246,212,203,0.86)]">
                This host does not have control-plane access for <code>/control/*</code>. Use a configured control host to open
                tenants and runtime diagnostics.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/home" className="btn-pill btn-pill-outline text-xs">
                  Open home
                </Link>
                <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">
                  Open transparency
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(30,2,39,0.48)] px-4 py-3">
        <ShieldCheck className="h-4 w-4 text-[var(--color-foreground)]" />
        <span className="text-xs uppercase tracking-[0.14em] text-[color:rgba(246,212,203,0.84)]">Control Plane</span>
        <Link href="/control/tenants" className="btn-pill btn-pill-outline text-xs">
          Tenants
        </Link>
        <Link href="/control/runtime-health" className="btn-pill btn-pill-outline text-xs">
          Runtime Health
        </Link>
      </div>
      {children}
    </div>
  );
}
