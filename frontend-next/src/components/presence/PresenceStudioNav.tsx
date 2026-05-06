'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PresenceStudioRoute } from './presenceStudioRoutes';

function isRouteActive(pathname: string | null, route: PresenceStudioRoute) {
  if (!pathname) return false;
  if (pathname === route.href || pathname.startsWith(`${route.href}/`)) return true;
  return (route.aliases || []).some((alias) => pathname === alias || pathname.startsWith(`${alias}/`));
}

interface PresenceStudioNavProps {
  routes: PresenceStudioRoute[];
  variant?: 'rail' | 'dock';
}

export function PresenceStudioNav({ routes, variant = 'rail' }: PresenceStudioNavProps) {
  const pathname = usePathname();

  if (variant === 'dock') {
    return (
      <nav aria-label="Presence Studio quick navigation" className="grid grid-cols-4 gap-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const active = isRouteActive(pathname, route);
          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : 'false'}
              className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-[1.15rem] border px-2 py-2 text-center text-[11px] font-medium transition-colors ${
                active
                  ? 'border-[#f6d4cb]/60 bg-[rgba(246,212,203,0.14)] text-[#fff7f2]'
                  : 'border-white/10 bg-white/[0.04] text-[#f6d4cb]/82 hover:border-white/20 hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{route.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Presence Studio sections" className="overflow-x-auto">
      <div className="flex min-w-max gap-2 pb-1">
        {routes.map((route) => {
          const Icon = route.icon;
          const active = isRouteActive(pathname, route);
          return (
            <Link
              key={route.href}
              href={route.href}
              aria-current={active ? 'page' : undefined}
              data-active={active ? 'true' : 'false'}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-[#f6d4cb]/65 bg-[rgba(246,212,203,0.16)] text-[#fff7f2]'
                  : 'border-white/10 bg-white/[0.04] text-[#f6d4cb]/80 hover:border-white/20 hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{route.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
