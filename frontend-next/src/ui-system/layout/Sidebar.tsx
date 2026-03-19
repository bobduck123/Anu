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

  const renderNav = (isMobile: boolean) => {
    const compact = !isMobile && collapsed;

    return (
      <nav className="flex h-full flex-col text-slate-100">
        {!compact ? (
          <div className="px-4 pb-3 pt-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c9a4]/82">Cultural pathways</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300/80">Choose a living route: community, learning, trust, and shared stewardship.</p>
          </div>
        ) : null}

        <div className="flex-1 space-y-6 overflow-y-auto px-1 pb-4 pt-1">
          {navSections.map((section) => {
            if (section.adminOnly && !isAdmin) return null;

            const visibleItems = section.items.filter(
              (item) => (!item.module || tenant.modules[item.module]) && (!item.authRequired || isAuthenticated),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                {!compact ? (
                  <div className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400/90">
                    {section.title}
                  </div>
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
                        title={compact ? item.label : undefined}
                        className={`group relative mx-2 inline-flex min-h-10 w-[calc(100%-1rem)] items-center rounded-2xl border px-3.5 py-2.5 text-sm transition-colors ${
                          compact ? 'justify-center' : 'gap-3'
                        } ${
                          active
                            ? 'border-[#50739a]/70 bg-[linear-gradient(125deg,rgba(43,80,125,0.9),rgba(23,44,74,0.95))] text-white shadow-[0_16px_30px_-22px_rgba(242,198,120,0.95)]'
                            : 'border-transparent text-slate-200/92 hover:border-white/12 hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!compact ? <span className="truncate">{item.label}</span> : null}
                        {!compact && active ? <span className="ml-auto h-2 w-2 rounded-full bg-[#f3c77b]/85" /> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!isMobile ? (
          <div className="border-t border-white/10 px-3 py-3">
            <button
              onClick={toggle}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              {!compact ? <span className="text-[11px] uppercase tracking-[0.16em]">Collapse rail</span> : null}
            </button>
          </div>
        ) : null}
      </nav>
    );
  };

  return (
    <>
      {!immersive ? (
        <aside
          className={`fixed bottom-3 left-3 top-[4.7rem] z-30 hidden overflow-hidden rounded-[1.6rem] border border-[#355372]/58 bg-[linear-gradient(180deg,rgba(10,21,36,0.95),rgba(12,27,45,0.93)_52%,rgba(11,20,34,0.95))] shadow-[0_26px_62px_-34px_rgba(0,0,0,0.86)] backdrop-blur-xl md:flex md:flex-col ${
            collapsed ? 'w-[84px]' : 'w-[252px]'
          }`}
        >
          {renderNav(false)}
        </aside>
      ) : null}

      {mobileOpen ? (
        <div className={`fixed inset-0 z-50 ${immersive ? '' : 'md:hidden'}`}>
          <div className="absolute inset-0 bg-slate-950/64 backdrop-blur-sm" onClick={onMobileClose} />
          <aside
            id="app-sidebar-drawer"
            className={`absolute bottom-0 left-0 top-0 flex flex-col border-r border-[#355372]/65 bg-[linear-gradient(180deg,rgba(10,21,36,0.97),rgba(12,27,45,0.96)_52%,rgba(11,20,34,0.97))] shadow-[24px_0_58px_-30px_rgba(0,0,0,0.96)] ${
              immersive ? 'w-[320px] max-w-[92vw]' : 'w-[304px]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-base font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                {tenant.name}
              </span>
              <button
                onClick={onMobileClose}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 transition-colors hover:bg-white/[0.1]"
                aria-label="Close drawer"
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
