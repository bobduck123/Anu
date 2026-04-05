'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { SystemHealthBanner } from '@/components/systemic/SystemHealthBanner';
import { PathwayGuideBar } from './PathwayGuideBar';
import { MobileDock } from './MobileDock';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

export function LayoutShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const realmSurface = getRealmSurface(pathname);

  const isFullBleedRoute = pathname?.startsWith('/wishlist/');
  const isImmersiveUniverseRoute = realmSurface.immersiveCanvas;
  const hideSupportChrome = realmSurface.hideSupportChrome;

  const desktopRailOffsetClass = 'md:ml-[88px]';

  if (isFullBleedRoute) {
    return <div className="manara-shell min-h-screen">{children}</div>;
  }

  return (
    <div
      className="manara-shell min-h-screen flex flex-col"
      data-realm={realmSurface.realm}
      data-realm-strength={realmSurface.strength}
      data-realm-surface={realmSurface.surfaceKind}
    >
      <Sidebar
        panelOpen={sidebarOpen}
        onPanelToggle={() => setSidebarOpen((open) => !open)}
        onPanelClose={() => setSidebarOpen(false)}
        immersive={isImmersiveUniverseRoute}
        showFloatingToggle={false}
      />

      <Header
        onMenuToggle={() => setSidebarOpen((open) => !open)}
        menuOpen={sidebarOpen}
        desktopOffset={!isFullBleedRoute}
      />

      <main
        className={`manara-grid-hero shell-main relative flex-1 pt-16 transition-all duration-500 ${
          isImmersiveUniverseRoute ? 'overflow-hidden' : desktopRailOffsetClass
        }`}
        data-realm={realmSurface.realm}
        data-realm-strength={realmSurface.strength}
        data-realm-entry={realmSurface.entryPattern}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(246,212,203,0.15),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(124,65,60,0.16),transparent_38%),linear-gradient(rgba(246,212,203,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(246,212,203,0.04)_1px,transparent_1px)] bg-[length:auto,auto,108px_108px,108px_108px]" />

        {!hideSupportChrome ? (
          <div className="relative z-20 px-3 pt-3 md:px-8 md:pt-5">
            <SystemHealthBanner />
            <PathwayGuideBar />
          </div>
        ) : null}

        <div
          className={`content-wrapper relative z-10 ${
            isImmersiveUniverseRoute ? 'h-full pb-0' : 'pb-24 md:pb-8'
          }`}
        >
          {children}
        </div>
      </main>

      {!hideSupportChrome ? <MobileDock /> : null}

      {!hideSupportChrome ? (
        <div className={isImmersiveUniverseRoute ? '' : desktopRailOffsetClass}>
          <Footer />
        </div>
      ) : null}
    </div>
  );
}
