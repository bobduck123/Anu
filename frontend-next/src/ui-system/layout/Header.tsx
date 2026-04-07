'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  User,
} from 'lucide-react';
import ManaraMark from '@/components/branding/ManaraMark';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from './TenantBrandWrapper';
import { ThemeToggle } from '../ThemeToggle';
import { getShellSignal } from './shellSignals';
import { getTenantSemantics, getThresholdState } from '@/lib/tenantSemantics';
import { buildOrganizerOnRampHref } from '@/lib/auth/returnTo';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

export interface HeaderProps {
  onMenuToggle: () => void;
  menuOpen?: boolean;
  showMenuToggleDesktop?: boolean;
  desktopOffset?: boolean;
}

export function Header({
  onMenuToggle,
  menuOpen = false,
  showMenuToggleDesktop = false,
  desktopOffset = true,
}: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const tenant = useTenant();
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const homeHref = isAuthenticated ? '/home' : '/';

  const shellSignal = useMemo(() => getShellSignal(pathname), [pathname]);
  const realmSurface = useMemo(() => getRealmSurface(pathname), [pathname]);
  const tenantSemantics = useMemo(() => getTenantSemantics(tenant), [tenant]);
  const thresholdState = useMemo(
    () => getThresholdState(user?.role, isAuthenticated, tenant),
    [isAuthenticated, tenant, user?.role],
  );
  const isSteward = thresholdState.current.key === 'steward';
  const isSandboxRoute = pathname?.startsWith('/sandbox');

  const profileLinks = [
    { href: '/profile', label: 'Profile' },
    { href: buildOrganizerOnRampHref('/organizer'), label: 'Organizer path' },
    { href: '/pledges', label: 'My Pledges' },
    { href: '/dashboard/savings', label: 'Savings' },
    { href: '/wallet/ledger', label: 'Wallet' },
    ...(isSteward
      ? [
          { href: '/organizer', label: 'Organiser' },
          { href: '/organizer/intelligence', label: 'Cockpit' },
          { href: '/dumb-dumb/manage', label: 'Dumb Dumb Studio' },
          { href: '/memberships', label: 'Memberships' },
          { href: '/sandbox/ui-lab', label: 'UI Lab' },
        ]
      : []),
  ];

  const SignalIcon = shellSignal.icon;
  const doorwayLabel = `${thresholdState.current.label} threshold`;

  return (
    <header
      className={`manara-grid-hero fixed right-0 top-0 z-40 h-16 border-b border-[color:rgba(246,212,203,0.1)] bg-[linear-gradient(102deg,rgba(30,2,39,0.92)_0%,rgba(30,2,39,0.9)_52%,rgba(30,2,39,0.94)_100%)] text-[color:rgba(246,212,203,0.92)] shadow-[0_18px_42px_-30px_rgba(30,2,39,0.9)] backdrop-blur-2xl ${
        desktopOffset ? 'left-0 md:left-[88px]' : 'left-0'
      }`}
      data-realm={realmSurface.realm}
      data-realm-strength={realmSurface.strength}
    >
      <div className="relative h-full px-3 md:px-4 lg:px-6">
        <span className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f6d4cb]/75 to-transparent" />
        <span className="pointer-events-none absolute inset-x-1/3 bottom-0 h-px bg-gradient-to-r from-transparent via-[color:rgba(246,212,203,0.1)] to-transparent" />

        <div className="relative flex h-full items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 md:gap-3">
            <button
              onClick={onMenuToggle}
              className={`manara-glass-chip inline-flex min-h-10 min-w-10 items-center justify-center border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(246,212,203,0.06)] text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.12)] ${
                showMenuToggleDesktop ? '' : 'md:hidden'
              }`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="app-sidebar-drawer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href={homeHref} className="group inline-flex items-center gap-2.5 rounded-xl px-2 py-1.5 focus-ring">
              {tenant.logo ? (
                <Image src={tenant.logo} alt={tenant.name} width={32} height={32} unoptimized className="rounded-full object-cover" />
              ) : (
                <ManaraMark className="h-8 w-8" />
              )}
              <div className="hidden min-[420px]:block">
                <span className="block text-[1.16rem] font-semibold tracking-tight text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {tenant.name}
                </span>
                <span className="hidden xl:block text-[10px] uppercase tracking-[0.26em] text-[#f6d4cb]/85">
                  {tenantSemantics.shellDescriptor}
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden lg:flex min-w-0 flex-1 items-center justify-center px-3">
            <div className="manara-glass-chip flex min-w-[min(100%,34rem)] items-center gap-3 border border-[color:rgba(246,212,203,0.12)] bg-[linear-gradient(120deg,rgba(246,212,203,0.08),rgba(246,212,203,0.02))] px-3.5 py-2 shadow-[inset_0_1px_0_rgba(246,212,203,0.08)]">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#f6d4cb]/28 bg-[#1e0227]/78 text-[#f6d4cb]">
                <SignalIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.82)]">{shellSignal.eyebrow}</p>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--color-foreground)]">{shellSignal.label}</span>
                  <span className="rounded-full border border-[#f6d4cb]/18 bg-[#f6d4cb]/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]">
                    {realmSurface.environmentTitle}
                  </span>
                  <span className="rounded-full border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.07)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.84)]">
                    {thresholdState.current.label}
                  </span>
                  {isSandboxRoute ? (
                    <span className="rounded-full border border-[#f6d4cb]/28 bg-[#f6d4cb]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]">
                      Internal
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-[color:rgba(246,212,203,0.72)]">{shellSignal.note}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-3 py-1.5">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#f6d4cb]/80">{doorwayLabel}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-1.5 py-1">
              <ThemeToggle />

              {isAuthenticated ? (
                <button
                  className="manara-glass-chip hidden min-h-10 min-w-10 items-center justify-center border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.12)] md:inline-flex"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                </button>
              ) : null}

              <div className="relative">
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  className="manara-glass-chip inline-flex min-h-10 items-center gap-2 border border-[color:rgba(246,212,203,0.14)] bg-[color:rgba(246,212,203,0.06)] px-2.5 py-1.5 text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.12)]"
                  aria-label={isAuthenticated ? 'Open profile menu' : 'Open sign in menu'}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#7c413c] to-[#1e0227] shadow-[0_0_0_1px_rgba(246,212,203,0.22)]">
                    <User className="h-4 w-4 text-[var(--color-foreground)]" />
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.7)]">
                      {doorwayLabel}
                    </span>
                    <span className="block text-sm font-medium text-[color:rgba(246,212,203,0.92)]">
                      {isAuthenticated ? (user?.pseudonym || user?.username || 'Profile') : 'Sign in'}
                    </span>
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-[color:rgba(246,212,203,0.76)] sm:inline" />
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#7c413c]/80 bg-[linear-gradient(180deg,#1e0227,#1e0227)] shadow-[0_18px_48px_-22px_rgba(30,2,39,0.88)]">
                    <div className="py-1.5">
                      {isAuthenticated ? (
                        <>
                          <div className="border-b border-[color:rgba(246,212,203,0.1)] px-4 py-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]/78">{doorwayLabel}</p>
                            <p className="mt-1 text-sm font-medium text-[color:rgba(246,212,203,0.97)]">{user?.pseudonym || user?.username}</p>
                            <p className="text-xs capitalize text-[color:rgba(246,212,203,0.85)]">{user?.role}</p>
                            <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.64)]">{thresholdState.current.summary}</p>
                          </div>
                          {profileLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="block px-4 py-2 text-sm text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.1)]"
                              onClick={() => setProfileOpen(false)}
                            >
                              {link.label}
                            </Link>
                          ))}
                          <div className="mt-1 border-t border-[color:rgba(246,212,203,0.1)] pt-1">
                            <button
                              onClick={() => {
                                logout();
                                setProfileOpen(false);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#f6d4cb] transition-colors hover:bg-[color:rgba(246,212,203,0.1)]"
                            >
                              <LogOut className="h-4 w-4" /> Sign out
                            </button>
                          </div>
                        </>
                      ) : (
                        <Link
                          href="/auth"
                          className="block px-4 py-2 text-sm text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.1)]"
                          onClick={() => setProfileOpen(false)}
                        >
                          Login / Register
                        </Link>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
