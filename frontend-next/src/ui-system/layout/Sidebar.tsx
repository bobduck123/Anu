'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  GraduationCap,
  Grid3X3,
  Heart,
  LayoutGrid,
  MapPin,
  Shield,
  Sparkles,
  Users,
  Eye,
  X,
  Menu,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ManaraMark from '@/components/branding/ManaraMark';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from './TenantBrandWrapper';
import { ThemeToggle } from '../ThemeToggle';

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
      { href: '/home', label: 'Home', icon: Sparkles, authRequired: true },
      { href: '/manara', label: 'Manara', icon: Sparkles, module: 'impact' },
      { href: '/community', label: 'Community', icon: Users, module: 'community' },
      { href: '/education', label: 'Education', icon: GraduationCap },
      { href: '/universe', label: 'Universe', icon: Sparkles },
      { href: '/impact', label: 'Impact', icon: BarChart3, module: 'impact', authRequired: true },
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

const railNavLinks = [
  { href: '/manara', label: 'Manara', icon: Sparkles },
  { href: '/community', label: 'Community', icon: Users },
  { href: '/education', label: 'Education', icon: GraduationCap },
  { href: '/transparency', label: 'Transparency', icon: Eye },
] as const;

const universeOptions = [
  { href: '/universe', label: 'Universe', icon: Sparkles },
  { href: '/constellations', label: 'Constellations', icon: Grid3X3 },
  { href: '/community', label: 'Community Mesh', icon: Users },
  { href: '/education/maps', label: 'Education Maps', icon: MapPin },
  { href: '/discover', label: 'Discover', icon: Eye },
  { href: '/transparency', label: 'Trust Signals', icon: Shield },
] as const;

const adminRoles = new Set(['node_admin', 'platform_admin', 'board_member', 'treasury_guardian']);

export interface SidebarProps {
  panelOpen?: boolean;
  onPanelToggle?: () => void;
  onPanelClose?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  immersive?: boolean;
}

export function Sidebar({
  panelOpen,
  onPanelToggle,
  onPanelClose,
  mobileOpen,
  onMobileClose,
  immersive = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const tenant = useTenant();
  const [universeGridOpen, setUniverseGridOpen] = useState(false);

  const resolvedPanelOpen = panelOpen ?? mobileOpen ?? false;

  const closePanel = () => {
    setUniverseGridOpen(false);
    onPanelClose?.();
    onMobileClose?.();
  };

  const togglePanel = () => {
    if (onPanelToggle) {
      onPanelToggle();
      return;
    }

    if (resolvedPanelOpen) {
      onMobileClose?.();
    }
  };

  const isAdmin = user ? adminRoles.has(user.role) : false;
  const homeHref = isAuthenticated ? '/home' : '/';
  const profileHref = isAuthenticated ? '/profile' : '/auth';
  const profileLabel = isAuthenticated ? (user?.pseudonym || user?.username || 'Profile') : 'Sign in';

  const visibleSections = useMemo(() => {
    return navSections
      .filter((section) => !(section.adminOnly && !isAdmin))
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => (!item.module || tenant.modules[item.module]) && (!item.authRequired || isAuthenticated),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [isAdmin, isAuthenticated, tenant.modules]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const handlePanelToggle = () => {
    setUniverseGridOpen(false);
    togglePanel();
  };

  const handleUniverseToggle = () => {
    if (resolvedPanelOpen && universeGridOpen) {
      setUniverseGridOpen(false);
      closePanel();
      return;
    }

    setUniverseGridOpen(true);

    if (!resolvedPanelOpen) {
      togglePanel();
    }
  };

  const renderNavLinks = () => (
    <div className="space-y-5 px-3 pb-6 pt-3">
      {visibleSections.map((section) => (
        <section key={section.title}>
          <h2 className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400/90">
            {section.title}
          </h2>
          <div className="space-y-1.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closePanel}
                  className={`group relative flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 ${
                    active
                      ? 'border-[#6b90b8]/62 bg-[linear-gradient(128deg,rgba(35,70,112,0.86),rgba(20,41,68,0.9))] text-white shadow-[0_16px_30px_-22px_rgba(243,199,123,0.8)]'
                      : 'border-transparent text-slate-200/92 hover:border-white/12 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {active ? <span className="ml-auto h-2 w-2 rounded-full bg-[#f3c77b]/90" /> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );

  const renderUniverseArray = () => (
    <div className="space-y-3 px-3 pb-4 pt-3">
      <div className="px-1">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c9a4]/85">Universe array</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-300/86">
          Jump between constellation intelligence, maps, and trust surfaces.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {universeOptions.map((option) => {
          const Icon = option.icon;
          const active = isActive(option.href);

          return (
            <Link
              key={option.href}
              href={option.href}
              onClick={closePanel}
              className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'border-[#7ca7dd]/62 bg-[#153a6a]/72 text-white'
                  : 'border-white/12 bg-white/[0.04] text-slate-100/88 hover:border-white/25 hover:bg-white/[0.1]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="leading-tight">{option.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  const renderPathwaysHeader = () => (
    <div className="border-b border-white/10 px-4 pb-3 pt-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#d8c9a4]/82">Cultural pathways</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-300/86">
        Choose a living route: community, learning, trust, and shared stewardship.
      </p>
    </div>
  );

  const renderPanelHeader = (showCloseButton: boolean) => (
    <div className="border-b border-white/10 px-4 pb-3 pt-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={homeHref} onClick={closePanel} className="inline-flex items-center gap-2.5 rounded-lg px-1 py-1 text-white">
          {tenant.logo ? (
            <Image src={tenant.logo} alt={tenant.name} width={28} height={28} unoptimized className="rounded-full object-cover" />
          ) : (
            <ManaraMark className="h-7 w-7" />
          )}
          <span className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            {tenant.name}
          </span>
        </Link>

        {showCloseButton ? (
          <button
            onClick={closePanel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-200 transition-colors hover:bg-white/10"
            aria-label="Close navigation panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <ThemeToggle />
        <Link
          href={profileHref}
          onClick={closePanel}
          className="inline-flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-white/12 bg-white/6 px-3 text-sm font-medium text-slate-100 transition-colors hover:bg-white/12"
        >
          <User className="h-4 w-4" />
          <span className="truncate">{profileLabel}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {!resolvedPanelOpen ? (
        <button
          onClick={handlePanelToggle}
          className={`fixed left-3 top-3 z-[45] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/14 bg-[linear-gradient(180deg,rgba(10,21,36,0.92),rgba(10,19,32,0.88))] text-slate-100 shadow-[0_14px_32px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors hover:bg-white/10 ${
            immersive ? '' : 'md:hidden'
          }`}
          aria-label={resolvedPanelOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={resolvedPanelOpen}
          aria-controls="app-sidebar-drawer"
        >
          <Menu className="h-5 w-5" />
        </button>
      ) : null}

      {!immersive ? (
        <aside className="manara-grid-hero fixed inset-y-0 left-0 z-40 hidden w-[88px] border-r border-white/12 bg-[linear-gradient(180deg,#071a42_0%,#0a2458_52%,#041431_100%)] shadow-[14px_0_44px_-26px_rgba(0,0,0,0.95)] md:flex md:flex-col">
          <div className="flex h-full flex-col items-center py-4">
            <Link
              href={homeHref}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#071b46]/70 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              aria-label={`${tenant.name} home`}
            >
              {tenant.logo ? (
                <Image src={tenant.logo} alt={tenant.name} width={30} height={30} unoptimized className="rounded-full object-cover" />
              ) : (
                <ManaraMark className="h-7 w-7" />
              )}
            </Link>

            <button
              onClick={handlePanelToggle}
              className="group mt-16 inline-flex h-14 w-11 flex-col items-center justify-center gap-1 rounded-md border border-transparent text-[#f2a464] transition-all hover:border-white/12 hover:bg-white/6"
              aria-label={resolvedPanelOpen ? 'Close menu panel' : 'Open menu panel'}
              aria-expanded={resolvedPanelOpen}
              aria-controls="app-sidebar-panel"
            >
              <span className="h-[2px] w-5 rounded-full bg-current transition-all group-hover:w-6" />
              <span className="h-[2px] w-3.5 rounded-full bg-current transition-all group-hover:w-6" />
              <span className="h-[2px] w-5 rounded-full bg-current transition-all group-hover:w-6" />
              <span className="pt-1 text-[9px] uppercase tracking-[0.2em] text-slate-300/82">Menu</span>
            </button>

            <div className="mt-auto flex w-full flex-col items-center border-t border-white/12 bg-[#072153]/36 px-0 py-3">
              <span className="mb-3 h-1.5 w-9 rounded-full bg-[#f68338]" />
              <ul className="space-y-1.5">
                {railNavLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={closePanel}
                        aria-label={item.label}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                          active
                            ? 'border-[#f6b165]/62 bg-white/12 text-[#f6b165]'
                            : 'border-white/10 text-slate-300/70 hover:border-white/24 hover:text-[#f6b165]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-auto flex w-full items-center justify-center border-t border-white/12 bg-[#071b46]/82 py-4">
              <button
                onClick={handleUniverseToggle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#f68338] transition-colors hover:bg-white/8"
                aria-label={resolvedPanelOpen && universeGridOpen ? 'Close universe array' : 'Open universe array'}
                aria-controls="app-sidebar-panel"
                aria-expanded={resolvedPanelOpen && universeGridOpen}
              >
                <Grid3X3 className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {!immersive && resolvedPanelOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 hidden bg-slate-950/46 backdrop-blur-[1px] md:block"
            onClick={closePanel}
            aria-label="Close menu panel"
          />

          <aside
            id="app-sidebar-panel"
            className="manara-grid-hero fixed inset-y-0 left-[88px] z-50 hidden w-[296px] overflow-hidden border-r border-[#355372]/68 bg-[linear-gradient(180deg,rgba(10,21,36,0.95),rgba(12,27,45,0.94)_52%,rgba(9,19,33,0.95))] shadow-[24px_0_58px_-30px_rgba(0,0,0,0.95)] md:flex md:flex-col"
          >
            {renderPanelHeader(true)}

            {universeGridOpen ? (
              renderUniverseArray()
            ) : (
              <>
                {renderPathwaysHeader()}
                <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>
              </>
            )}
          </aside>
        </>
      ) : null}

      {resolvedPanelOpen ? (
        <div className={`fixed inset-0 z-50 ${immersive ? '' : 'md:hidden'}`}>
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/68 backdrop-blur-sm"
            onClick={closePanel}
            aria-label="Close navigation drawer"
          />

          <aside
            id="app-sidebar-drawer"
            className={`manara-grid-hero absolute bottom-0 left-0 top-0 flex flex-col border-r border-[#355372]/65 bg-[linear-gradient(180deg,rgba(10,21,36,0.95),rgba(12,27,45,0.94)_52%,rgba(11,20,34,0.95))] shadow-[24px_0_58px_-30px_rgba(0,0,0,0.96)] backdrop-blur-xl ${
              immersive ? 'w-[320px] max-w-[92vw]' : 'w-[304px]'
            }`}
          >
            {renderPanelHeader(true)}

            {universeGridOpen ? (
              renderUniverseArray()
            ) : (
              <>
                {renderPathwaysHeader()}
                <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>
              </>
            )}

            {!universeGridOpen ? (
              <div className="border-t border-white/10 px-4 py-4">
                <div className="grid grid-cols-4 gap-2">
                  {railNavLinks.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closePanel}
                        aria-label={item.label}
                        className={`inline-flex h-9 w-full items-center justify-center rounded-md border transition-colors ${
                          active
                            ? 'border-[#f6b165]/62 bg-white/12 text-[#f6b165]'
                            : 'border-white/10 text-slate-300/80 hover:border-white/24 hover:text-[#f6b165]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
