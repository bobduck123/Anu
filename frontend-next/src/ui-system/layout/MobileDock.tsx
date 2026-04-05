'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasSandboxAccessRole } from '@/ui-system/anu/SandboxAccessBoundary';
import { getShellSignal } from './shellSignals';
import { getMobileDockLinks } from './mobileDockModel';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileDock() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const shellSignal = getShellSignal(pathname);
  const realmSurface = getRealmSurface(pathname);
  const links = getMobileDockLinks(pathname, isAuthenticated, user ? hasSandboxAccessRole(user.role) : false);

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-[44] px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      <div className="manara-grid-hero overflow-hidden rounded-[1.4rem] border border-[color:rgba(246,212,203,0.12)] bg-[linear-gradient(180deg,rgba(30,2,39,0.96),rgba(30,2,39,0.98))] px-2 pb-2 pt-2 shadow-[0_-18px_38px_-22px_rgba(30,2,39,0.88)] backdrop-blur-2xl">
        <div className="mb-2 flex items-center justify-between gap-3 px-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#f6d4cb]/78">{shellSignal.eyebrow}</p>
            <p className="truncate text-[11px] font-medium text-[color:rgba(246,212,203,0.92)]">{shellSignal.label}</p>
          </div>
          <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.06)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.76)]">
            {realmSurface.environmentTitle}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1rem] border px-1 text-[11px] font-medium transition-all duration-300 ${
                  active
                    ? 'border-[#f6d4cb]/62 bg-[linear-gradient(132deg,rgba(30,2,39,0.9),rgba(30,2,39,0.92))] text-[var(--color-foreground)] shadow-[0_16px_26px_-20px_rgba(246,212,203,0.8)]'
                    : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] text-[color:rgba(246,212,203,0.85)] hover:border-[color:rgba(246,212,203,0.2)] hover:bg-[color:rgba(246,212,203,0.1)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
