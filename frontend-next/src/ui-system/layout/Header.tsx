'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ManaraMark from '@/components/branding/ManaraMark';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from './TenantBrandWrapper';
import { ThemeToggle } from '../ThemeToggle';

export interface HeaderProps {
  onMenuToggle: () => void;
  menuOpen?: boolean;
  showMenuToggleDesktop?: boolean;
}

type PathwayMarker = {
  label: string;
  icon: LucideIcon;
};

export function Header({ onMenuToggle, menuOpen = false, showMenuToggleDesktop = false }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const tenant = useTenant();
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const homeHref = isAuthenticated ? '/home' : '/';

  const pathway = useMemo<PathwayMarker>(() => {
    if (!pathname) {
      return { label: 'Cultural commons', icon: Sparkles };
    }

    if (pathname.startsWith('/community')) {
      return { label: 'Community mesh', icon: Users };
    }

    if (pathname.startsWith('/education')) {
      return { label: 'Learning pathways', icon: GraduationCap };
    }

    if (pathname.startsWith('/universe')) {
      return { label: 'Shared universe', icon: Sparkles };
    }

    if (pathname.startsWith('/transparency') || pathname.startsWith('/docs') || pathname.startsWith('/contact')) {
      return { label: 'Trust surfaces', icon: ShieldCheck };
    }

    if (pathname.startsWith('/manara')) {
      return { label: 'Signal field', icon: Sparkles };
    }

    return { label: 'Cultural commons', icon: Sparkles };
  }, [pathname]);

  const organizerRoles = new Set(['organizer', 'node_admin', 'platform_admin', 'board_member', 'treasury_guardian']);
  const isOrganizer = user && organizerRoles.has(user.role);

  const profileLinks = [
    { href: '/profile', label: 'Profile' },
    { href: '/pledges', label: 'My Pledges' },
    { href: '/dashboard/savings', label: 'Savings' },
    { href: '/wallet/ledger', label: 'Wallet' },
    ...(isOrganizer
      ? [
          { href: '/organizer', label: 'Organiser' },
          { href: '/organizer/intelligence', label: 'Cockpit' },
          { href: '/dumb-dumb/manage', label: 'Dumb Dumb Studio' },
          { href: '/memberships', label: 'Memberships' },
        ]
      : []),
  ];

  const PathwayIcon = pathway.icon;

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-[#2f435f]/50 bg-[linear-gradient(102deg,rgba(10,22,36,0.95)_0%,rgba(13,31,52,0.92)_48%,rgba(10,23,39,0.95)_100%)] text-slate-100 shadow-[0_18px_42px_-30px_rgba(4,8,14,0.9)] backdrop-blur-2xl">
      <div className="relative h-full px-3 md:px-4 lg:px-6">
        <span className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f1c57a]/75 to-transparent" />
        <span className="pointer-events-none absolute inset-x-1/3 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative flex h-full items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 md:gap-3">
            <button
              onClick={onMenuToggle}
              className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/14 bg-white/6 text-slate-100 transition-colors hover:bg-white/12 ${
                showMenuToggleDesktop ? '' : 'md:hidden'
              }`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="app-sidebar-drawer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href={homeHref} className="group inline-flex items-center gap-2.5 rounded-full px-1 py-1.5 focus-ring">
              {tenant.logo ? (
                <Image src={tenant.logo} alt={tenant.name} width={32} height={32} unoptimized className="rounded-full object-cover" />
              ) : (
                <ManaraMark className="h-8 w-8" />
              )}
              <span
                className="hidden min-[420px]:inline text-[1.16rem] font-semibold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {tenant.name}
              </span>
              <span className="hidden xl:inline text-[10px] uppercase tracking-[0.26em] text-[#ead1ad]/85">Cultural commons</span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/12 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <PathwayIcon className="h-3.5 w-3.5 text-[#f5c57e]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-300/85">Pathway</span>
            <span className="text-sm font-medium text-white">{pathway.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            {isAuthenticated ? (
              <button
                className="hidden min-h-10 min-w-10 items-center justify-center rounded-full border border-white/12 bg-white/5 text-slate-100 transition-colors hover:bg-white/12 md:inline-flex"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </button>
            ) : null}

            <div className="relative">
              <button
                onClick={() => setProfileOpen((open) => !open)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/14 bg-white/6 px-2.5 py-1.5 text-slate-100 transition-colors hover:bg-white/12"
                aria-label={isAuthenticated ? 'Open profile menu' : 'Open sign in menu'}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-[#2f5d8f] to-[#173454] shadow-[0_0_0_1px_rgba(255,255,255,0.22)]">
                  <User className="h-4 w-4 text-white" />
                </span>
                <span className="hidden text-sm font-medium text-slate-100 sm:inline">
                  {isAuthenticated ? (user?.pseudonym || user?.username || 'Profile') : 'Sign in'}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-300 sm:inline" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[#314b66]/80 bg-[linear-gradient(180deg,#142437,#101a29)] shadow-[0_18px_48px_-22px_rgba(0,0,0,0.88)]">
                  <div className="py-1.5">
                    {isAuthenticated ? (
                      <>
                        <div className="border-b border-white/10 px-4 py-3">
                          <p className="text-sm font-medium text-slate-50">{user?.pseudonym || user?.username}</p>
                          <p className="text-xs capitalize text-slate-300/85">{user?.role}</p>
                        </div>
                        {profileLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="block px-4 py-2 text-sm text-slate-100 transition-colors hover:bg-white/10"
                            onClick={() => setProfileOpen(false)}
                          >
                            {link.label}
                          </Link>
                        ))}
                        <div className="mt-1 border-t border-white/10 pt-1">
                          <button
                            onClick={() => {
                              logout();
                              setProfileOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-white/10"
                          >
                            <LogOut className="h-4 w-4" /> Sign out
                          </button>
                        </div>
                      </>
                    ) : (
                      <Link
                        href="/auth"
                        className="block px-4 py-2 text-sm text-slate-100 transition-colors hover:bg-white/10"
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
    </header>
  );
}
