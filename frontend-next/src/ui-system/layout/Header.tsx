'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Bell, User, LogOut, ChevronDown, GraduationCap, Sparkles } from 'lucide-react';
import ManaraMark from '@/components/branding/ManaraMark';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from './TenantBrandWrapper';
import { ThemeToggle } from '../ThemeToggle';

export interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const tenant = useTenant();
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const homeHref = isAuthenticated ? '/home' : '/';
  const quickLinks = [
    { href: '/education', label: 'Education', icon: GraduationCap },
    { href: '/universe', label: 'Universe', icon: Sparkles },
  ];

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

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--color-card)] border-b border-[var(--color-border)] backdrop-blur-md">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left: menu toggle + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href={homeHref} className="flex items-center gap-2 focus-ring rounded-lg">
            {tenant.logo ? (
              <Image src={tenant.logo} alt={tenant.name} width={28} height={28} unoptimized className="rounded-full object-cover" />
            ) : (
              <ManaraMark className="h-8 w-8" />
            )}
            <span
              className="font-semibold text-base tracking-tight text-[var(--color-foreground)] hidden sm:inline"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {tenant.name}
            </span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: theme + notifications + avatar */}
        <div className="flex items-center gap-1">
          <ThemeToggle />

          {isAuthenticated && (
            <button
              className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-[var(--color-foreground)]" />
            </button>
          )}

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--color-foreground)] hidden sm:inline">
                {isAuthenticated ? (user?.pseudonym || user?.username || 'Profile') : 'Sign in'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-muted-foreground)] hidden sm:inline" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg z-50">
                <div className="py-1">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-2 border-b border-[var(--color-border)]">
                        <p className="text-sm font-medium text-[var(--color-foreground)]">{user?.pseudonym || user?.username}</p>
                        <p className="text-xs text-[var(--color-muted-foreground)] capitalize">{user?.role}</p>
                      </div>
                      {profileLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                          onClick={() => setProfileOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <div className="border-t border-[var(--color-border)]">
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-muted)] transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <Link
                      href="/auth"
                      className="block px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                      onClick={() => setProfileOpen(false)}
                    >
                      Login / Register
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
