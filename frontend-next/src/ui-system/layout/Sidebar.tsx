'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, GraduationCap, BarChart3,
  Heart, Eye, Shield, ChevronLeft, ChevronRight, X,
  MapPin, Sparkles, LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from './TenantBrandWrapper';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: string;
  authRequired?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Core',
    items: [
      { href: '/home', label: 'Home', icon: Home, authRequired: true },
      { href: '/manara', label: 'Manara', icon: Sparkles, module: 'impact' },
      { href: '/impact', label: 'Impact', icon: BarChart3, module: 'impact', authRequired: true },
      { href: '/community', label: 'Community', icon: Users, module: 'community' },
    ],
  },
  {
    title: 'Trust',
    items: [
      { href: '/memberships', label: 'Memberships', icon: Heart },
      { href: '/transparency', label: 'Transparency', icon: Eye },
      { href: '/docs', label: 'Docs', icon: LayoutGrid },
      { href: '/contact', label: 'Contact', icon: MapPin },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { href: '/admin/tenants', label: 'Tenants', icon: Shield },
      { href: '/admin/atlas', label: 'Atlas Heatmap', icon: LayoutGrid },
      { href: '/admin/relief', label: 'Relief', icon: Heart },
      { href: '/admin/education', label: 'Education Admin', icon: GraduationCap },
      { href: '/admin/ledger', label: 'Ledger', icon: BarChart3 },
      { href: '/admin/dumb-dumb', label: 'Dumb Dumb', icon: Sparkles },
      { href: '/governance/capital', label: 'Capital', icon: BarChart3 },
      { href: '/governance/formulas', label: 'Formulas', icon: BarChart3 },
      { href: '/governance/metrics-registry', label: 'Metrics', icon: BarChart3 },
      { href: '/governance/model-registry', label: 'Models', icon: LayoutGrid },
      { href: '/governance/competency', label: 'Competency', icon: GraduationCap },
      { href: '/governance/needs', label: 'Needs', icon: Eye },
      { href: '/governance/sovereignty', label: 'Sovereignty', icon: Shield },
      { href: '/governance/simulations', label: 'Simulations', icon: MapPin },
      { href: '/governance/federation', label: 'Federation', icon: MapPin },
      { href: '/governance/institutional', label: 'Institutional', icon: Shield },
      { href: '/governance/systemic', label: 'Systemic Shock', icon: Shield },
    ],
  },
];

const SIDEBAR_KEY = 'ff-sidebar-collapsed';
const adminRoles = new Set(['node_admin', 'platform_admin', 'board_member', 'treasury_guardian']);

export interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  });
  const { user } = useAuth();
  const tenant = useTenant();
  const pathname = usePathname();
  const isAdmin = user && adminRoles.has(user.role);
  const isAuthenticated = !!user;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const renderNav = (isMobile: boolean) => (
    <nav className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {navSections.map((section) => {
          if (section.adminOnly && !isAdmin) return null;
          const visibleItems = section.items.filter(
            (item) => (!item.module || tenant.modules[item.module]) && (!item.authRequired || isAuthenticated)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed && (
                <div className="px-4 mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={isMobile ? onMobileClose : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors ${
                        active
                          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                          : 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            onClick={toggle}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors text-[var(--color-muted-foreground)]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-14 left-0 bottom-0 z-30 bg-[var(--color-card)] border-r border-[var(--color-border)] transition-all duration-300 ${
          collapsed ? 'w-[56px]' : 'w-[240px]'
        }`}
      >
        {renderNav(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-[var(--color-card)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <span className="font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-serif)' }}>
                {tenant.name}
              </span>
              <button onClick={onMobileClose} className="p-1 rounded-lg hover:bg-[var(--color-muted)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNav(true)}
          </aside>
        </div>
      )}
    </>
  );
}
