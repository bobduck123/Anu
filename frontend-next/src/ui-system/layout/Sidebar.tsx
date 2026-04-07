'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  FlaskConical,
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
  Compass,
  Target,
  Leaf,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ManaraMark from '@/components/branding/ManaraMark';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from './TenantBrandWrapper';
import { ThemeToggle } from '../ThemeToggle';
import { buildPathwayGuide, deriveNavigationMode, type NavigationMode } from './pathwayGuidance';
import { hasSandboxAccessRole } from '@/ui-system/anu/SandboxAccessBoundary';
import { buildOrganizerOnRampHref } from '@/lib/auth/returnTo';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: string;
  authRequired?: boolean;
}

interface NavSection {
  title: string;
  mode: 'explore' | 'task' | 'trust' | 'admin';
  items: NavItem[];
  adminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    title: 'Commons',
    mode: 'explore',
    items: [
      { href: '/manara', label: 'Manara', icon: Sparkles, module: 'impact' },
      { href: '/community', label: 'Community', icon: Users, module: 'community' },
      { href: '/education', label: 'Education', icon: GraduationCap },
      { href: '/universe', label: 'Universe', icon: Compass },
      { href: '/discover', label: 'Discover', icon: Eye },
    ],
  },
  {
    title: 'Fieldwork',
    mode: 'task',
    items: [
      { href: '/actions', label: 'Actions', icon: Target },
      { href: '/events', label: 'Events', icon: MapPin },
      { href: '/cost-lowering', label: 'Cost-Lowering', icon: Leaf },
      { href: '/runs', label: 'Runs', icon: BarChart3 },
      { href: '/pledges', label: 'Pledges', icon: Heart, authRequired: true },
      { href: '/dashboard/savings', label: 'Savings', icon: BarChart3, authRequired: true },
      { href: buildOrganizerOnRampHref('/organizer'), label: 'Organizer Path', icon: Shield, authRequired: true },
    ],
  },
  {
    title: 'Trust',
    mode: 'trust',
    items: [
      { href: '/transparency', label: 'Transparency', icon: Eye },
      { href: '/memberships', label: 'Memberships', icon: Heart },
      { href: '/docs', label: 'Docs', icon: LayoutGrid },
      { href: '/contact', label: 'Contact', icon: MapPin },
    ],
  },
  {
    title: 'Stewardship',
    mode: 'admin',
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
  showFloatingToggle?: boolean;
}

export function Sidebar({
  panelOpen,
  onPanelToggle,
  onPanelClose,
  mobileOpen,
  onMobileClose,
  immersive = false,
  showFloatingToggle = true,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const tenant = useTenant();
  const [universeGridOpen, setUniverseGridOpen] = useState(false);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>(() => deriveNavigationMode(pathname));

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
  const isSteward = user ? hasSandboxAccessRole(user.role) : false;
  const homeHref = isAuthenticated ? '/home' : '/';
  const profileHref = isAuthenticated ? '/profile' : '/auth';
  const profileLabel = isAuthenticated ? (user?.pseudonym || user?.username || 'Profile') : 'Sign in';

  useEffect(() => {
    setNavigationMode(deriveNavigationMode(pathname));
  }, [pathname]);

  const pathwayGuide = useMemo(() => buildPathwayGuide(pathname), [pathname]);

  const visibleSections = useMemo(() => {
    const modeFilteredSections = navSections.filter((section) => {
      if (section.mode === 'admin') {
        return isAdmin;
      }

      if (navigationMode === 'all') {
        return true;
      }

      if (navigationMode === 'explore') {
        return section.mode === 'explore' || section.mode === 'trust';
      }

      return section.mode === 'task' || section.mode === 'trust';
    });

    return modeFilteredSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => (!item.module || tenant.modules[item.module]) && (!item.authRequired || isAuthenticated),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [isAdmin, isAuthenticated, navigationMode, tenant.modules]);

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
          <h2 className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f6d4cb]/82">
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
                  className={`group relative flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 ${
                    active
                      ? 'border-[#7c413c]/62 bg-[linear-gradient(128deg,rgba(30,2,39,0.86),rgba(30,2,39,0.9))] text-[var(--color-foreground)] shadow-[0_16px_30px_-22px_rgba(246,212,203,0.8)]'
                      : 'border-transparent text-[color:rgba(246,212,203,0.92)] hover:border-[color:rgba(246,212,203,0.12)] hover:bg-[color:rgba(246,212,203,0.08)] hover:text-[var(--color-foreground)]'
                  }`}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {active ? <span className="ml-auto h-2 w-2 rounded-full bg-[#f6d4cb]/90" /> : null}
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
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#f6d4cb]/85">Universe array</p>
        <p className="mt-1 text-xs leading-relaxed text-[color:rgba(246,212,203,0.86)]">
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
                  ? 'border-[#f6d4cb]/62 bg-[#1e0227]/72 text-[var(--color-foreground)]'
                  : 'border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] text-[color:rgba(246,212,203,0.88)] hover:border-[color:rgba(246,212,203,0.25)] hover:bg-[color:rgba(246,212,203,0.1)]'
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
    <div className="border-b border-[color:rgba(246,212,203,0.1)] px-4 pb-3 pt-4 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#f6d4cb]/82">Explore-first navigation</p>
        <p className="mt-1 text-xs leading-relaxed text-[color:rgba(246,212,203,0.86)]">
          Start with exploration, then move naturally into execution.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setNavigationMode('explore')}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
            navigationMode === 'explore'
              ? 'border-[#f6d4cb]/55 bg-[#1e0227]/70 text-[var(--color-foreground)]'
              : 'border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] text-[color:rgba(246,212,203,0.85)] hover:bg-[color:rgba(246,212,203,0.1)]'
          }`}
        >
          Explore
        </button>
        <button
          type="button"
          onClick={() => setNavigationMode('tasks')}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
            navigationMode === 'tasks'
              ? 'border-[#f6d4cb]/55 bg-[#1e0227]/70 text-[var(--color-foreground)]'
              : 'border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] text-[color:rgba(246,212,203,0.85)] hover:bg-[color:rgba(246,212,203,0.1)]'
          }`}
        >
          Tasks
        </button>
        <button
          type="button"
          onClick={() => setNavigationMode('all')}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
            navigationMode === 'all'
              ? 'border-[#f6d4cb]/55 bg-[#1e0227]/70 text-[var(--color-foreground)]'
              : 'border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] text-[color:rgba(246,212,203,0.85)] hover:bg-[color:rgba(246,212,203,0.1)]'
          }`}
        >
          Full
        </button>
      </div>

      <div className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.86)]">{pathwayGuide.title}</p>
        <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.82)]">{pathwayGuide.summary}</p>
        <div className="mt-2 space-y-1.5">
          {pathwayGuide.steps
            .filter((step) => !step.authRequired || isAuthenticated)
            .slice(0, 3)
            .map((step) => (
              <Link
                key={step.href}
                href={step.href}
                onClick={closePanel}
                className="inline-flex w-full items-center justify-between rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-2.5 py-1.5 text-xs text-[color:rgba(246,212,203,0.88)] transition-colors hover:border-[color:rgba(246,212,203,0.24)] hover:bg-[color:rgba(246,212,203,0.1)]"
              >
                <span>{step.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.86)]" />
              </Link>
            ))}
        </div>
      </div>

      {isSteward ? (
        <div className="rounded-xl border border-[#f6d4cb]/18 bg-[linear-gradient(145deg,rgba(246,212,203,0.06),rgba(246,212,203,0.03))] p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f6d4cb]/84">Internal lab</p>
          <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.82)]">Pattern-bank review and sandbox validation for steward roles.</p>
          <Link
            href="/sandbox/ui-lab"
            onClick={closePanel}
            className="mt-2 inline-flex w-full items-center justify-between rounded-lg border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.2)] px-2.5 py-2 text-xs text-[color:rgba(246,212,203,0.88)] transition-colors hover:border-[color:rgba(246,212,203,0.24)] hover:bg-[color:rgba(246,212,203,0.1)]"
          >
            <span className="inline-flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-[#f6d4cb]" />
              <span>Open UI lab</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.86)]" />
          </Link>
        </div>
      ) : null}
    </div>
  );

  const renderPanelHeader = (showCloseButton: boolean) => (
    <div className="border-b border-[color:rgba(246,212,203,0.1)] px-4 pb-3 pt-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={homeHref} onClick={closePanel} className="inline-flex items-center gap-2.5 rounded-lg px-1 py-1 text-[var(--color-foreground)]">
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:rgba(246,212,203,0.1)] text-[color:rgba(246,212,203,0.84)] transition-colors hover:bg-[color:rgba(246,212,203,0.1)]"
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
          className="inline-flex min-h-10 flex-1 items-center gap-2 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.06)] px-3 text-sm font-medium text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.12)]"
        >
          <User className="h-4 w-4" />
          <span className="truncate">{profileLabel}</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {showFloatingToggle && !resolvedPanelOpen ? (
        <button
          onClick={handlePanelToggle}
          className={`fixed left-3 top-3 z-[45] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:rgba(246,212,203,0.14)] bg-[linear-gradient(180deg,rgba(30,2,39,0.92),rgba(30,2,39,0.88))] text-[color:rgba(246,212,203,0.92)] shadow-[0_14px_32px_-20px_rgba(30,2,39,0.9)] backdrop-blur-xl transition-colors hover:bg-[color:rgba(246,212,203,0.1)] ${
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
        <aside className="manara-grid-hero fixed inset-y-0 left-0 z-40 hidden w-[88px] border-r border-[color:rgba(246,212,203,0.12)] bg-[linear-gradient(180deg,#1e0227_0%,#1e0227_52%,#1e0227_100%)] shadow-[14px_0_44px_-26px_rgba(30,2,39,0.95)] md:flex md:flex-col">
          <div className="flex h-full flex-col items-center py-4">
            <Link
              href={homeHref}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.2)] bg-[#1e0227]/70 shadow-[0_0_0_1px_rgba(246,212,203,0.08)]"
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
              className="group mt-16 inline-flex h-14 w-11 flex-col items-center justify-center gap-1 rounded-md border border-transparent text-[#e0b115] transition-all hover:border-[color:rgba(246,212,203,0.12)] hover:bg-[color:rgba(246,212,203,0.06)]"
              aria-label={resolvedPanelOpen ? 'Close menu panel' : 'Open menu panel'}
              aria-expanded={resolvedPanelOpen}
              aria-controls="app-sidebar-panel"
            >
              <span className="h-[2px] w-5 rounded-full bg-current transition-all group-hover:w-6" />
              <span className="h-[2px] w-3.5 rounded-full bg-current transition-all group-hover:w-6" />
              <span className="h-[2px] w-5 rounded-full bg-current transition-all group-hover:w-6" />
              <span className="pt-1 text-[9px] uppercase tracking-[0.2em] text-[color:rgba(246,212,203,0.82)]">Menu</span>
            </button>

            <div className="mt-auto flex w-full flex-col items-center border-t border-[color:rgba(246,212,203,0.12)] bg-[#1e0227]/36 px-0 py-3">
              <span className="mb-3 h-1.5 w-9 rounded-full bg-[#e0b115]" />
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
                            ? 'border-[#e0b115]/62 bg-[color:rgba(246,212,203,0.12)] text-[#e0b115]'
                            : 'border-[color:rgba(246,212,203,0.1)] text-[color:rgba(246,212,203,0.7)] hover:border-[color:rgba(246,212,203,0.24)] hover:text-[#e0b115]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-auto flex w-full items-center justify-center border-t border-[color:rgba(246,212,203,0.12)] bg-[#1e0227]/82 py-4">
              <button
                onClick={handleUniverseToggle}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#e0b115] transition-colors hover:bg-[color:rgba(246,212,203,0.08)]"
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
            className="fixed inset-0 z-40 hidden bg-[color:rgba(30,2,39,0.46)] backdrop-blur-[1px] md:block"
            onClick={closePanel}
            aria-label="Close menu panel"
          />

          <aside
            id="app-sidebar-panel"
            className="manara-grid-hero fixed inset-y-0 left-[88px] z-50 hidden w-[296px] overflow-hidden border-r border-[#7c413c]/68 bg-[linear-gradient(180deg,rgba(30,2,39,0.95),rgba(30,2,39,0.94)_52%,rgba(30,2,39,0.95))] shadow-[24px_0_58px_-30px_rgba(30,2,39,0.95)] md:flex md:flex-col"
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
            className="absolute inset-0 bg-[color:rgba(30,2,39,0.68)] backdrop-blur-sm"
            onClick={closePanel}
            aria-label="Close navigation drawer"
          />

          <aside
            id="app-sidebar-drawer"
            className={`manara-grid-hero absolute bottom-0 left-0 top-0 flex flex-col border-r border-[#7c413c]/65 bg-[linear-gradient(180deg,rgba(30,2,39,0.95),rgba(30,2,39,0.94)_52%,rgba(30,2,39,0.95))] shadow-[24px_0_58px_-30px_rgba(30,2,39,0.96)] backdrop-blur-xl ${
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
              <div className="border-t border-[color:rgba(246,212,203,0.1)] px-4 py-4">
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
                        className={`inline-flex min-h-11 w-full items-center justify-center rounded-md border transition-colors ${
                          active
                            ? 'border-[#e0b115]/62 bg-[color:rgba(246,212,203,0.12)] text-[#e0b115]'
                            : 'border-[color:rgba(246,212,203,0.1)] text-[color:rgba(246,212,203,0.8)] hover:border-[color:rgba(246,212,203,0.24)] hover:text-[#e0b115]'
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
