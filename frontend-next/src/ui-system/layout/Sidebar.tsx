'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  GraduationCap,
  BarChart3,
  Heart,
  Eye,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Sparkles,
  LayoutGrid,
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
      { href: '/education', label: 'Education', icon: GraduationCap },
      { href: '/universe', label: 'Universe', icon: Sparkles },
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
  immersive?: boolean;
}

export function Sidebar({ mobileOpen, onMobileClose, immersive = false }: SidebarProps) {
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderNav = (isMobile: boolean) => (
    <nav className="flex h-full flex-col text-slate-100">
      {!collapsed ? (
        <div className="px-4 pb-3 pt-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c9a4]/80">Cultural pathways</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300/80">Navigate signals, learning, trust, and community operations.</p>
        </div>
      ) : null}

      <div className="flex-1 space-y-6 overflow-y-auto pb-4 pt-1">
        {navSections.map((section) => {
          if (section.adminOnly && !isAdmin) return null;

          const visibleItems = section.items.filter(
            (item) => (!item.module || tenant.modules[item.module]) && (!item.authRequired || isAuthenticated)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              {!collapsed ? (
                <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400/90">{section.title}</div>
              ) : null}

              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={isMobile ? onMobileClose : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`group mx-2 inline-flex min-h-10 w-[calc(100%-1rem)] items-center rounded-xl border px-3 py-2 text-sm transition-colors ${
                        collapsed ? 'justify-center' : 'gap-3'
                      } ${
                        active
                          ? 'border-[#48668a] bg-[linear-gradient(115deg,rgba(38,74,118,0.95),rgba(25,43,74,0.95))] text-white shadow-[0_14px_28px_-20px_rgba(243,199,123,0.9)]'
                          : 'border-transparent text-slate-200/90 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!isMobile ? (
        <div className="border-t border-white/10 p-3">
          <button
            onClick={toggle}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      ) : null}
    </nav>
  );

  return (
    <>
      {!immersive ? (
        <aside
          className={`fixed bottom-0 left-0 top-16 z-30 hidden border-r border-[#304860]/85 bg-[linear-gradient(180deg,rgba(11,20,33,0.98),rgba(15,29,45,0.97)_48%,rgba(14,23,37,0.98))] shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] md:flex md:flex-col ${
            collapsed ? 'w-[72px]' : 'w-[248px]'
          }`}
        >
          {renderNav(false)}
        </aside>
      ) : null}

      {mobileOpen ? (
        <div className={`fixed inset-0 z-50 ${immersive ? '' : 'md:hidden'}`}>
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onMobileClose} />
          <aside
            id="app-sidebar-drawer"
            className={`absolute bottom-0 left-0 top-0 flex flex-col border-r border-[#304860]/85 bg-[linear-gradient(180deg,rgba(11,20,33,0.98),rgba(15,29,45,0.97)_48%,rgba(14,23,37,0.98))] shadow-[20px_0_44px_-28px_rgba(0,0,0,0.95)] ${
              immersive ? 'w-[320px] max-w-[92vw]' : 'w-[292px]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-base font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                {tenant.name}
              </span>
              <button
                onClick={onMobileClose}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 transition-colors hover:bg-white/[0.1]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNav(true)}
          </aside>
        </div>
      ) : null}
    </>
  );
}
