'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { SystemHealthBanner } from '@/components/systemic/SystemHealthBanner';

export function LayoutShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isFullBleedRoute = pathname?.startsWith('/wishlist/');
  const isImmersiveUniverseRoute = pathname?.startsWith('/universe');
  const isCommunityRoute = pathname?.startsWith('/community');
  const hideSupportChrome = isImmersiveUniverseRoute || isCommunityRoute;

  const desktopRailOffsetClass = 'md:ml-[88px]';

  if (isFullBleedRoute) {
    return <div className="manara-shell min-h-screen">{children}</div>;
  }

  return (
    <div className="manara-shell min-h-screen flex flex-col">
      <Sidebar
        panelOpen={sidebarOpen}
        onPanelToggle={() => setSidebarOpen((open) => !open)}
        onPanelClose={() => setSidebarOpen(false)}
        immersive={isImmersiveUniverseRoute}
      />

      <main
        className={`manara-grid-hero shell-main relative flex-1 transition-all duration-500 ${
          isImmersiveUniverseRoute ? 'overflow-hidden' : desktopRailOffsetClass
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(248,208,142,0.15),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(52,98,145,0.16),transparent_38%),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:auto,auto,108px_108px,108px_108px]" />

        {!hideSupportChrome ? (
          <div className="relative z-20 px-3 pt-3 md:px-8 md:pt-5">
            <SystemHealthBanner />
          </div>
        ) : null}

        <div className={`content-wrapper relative z-10 ${isImmersiveUniverseRoute ? 'h-full pb-0' : 'pb-8'}`}>
          {children}
        </div>
      </main>

      {!hideSupportChrome ? (
        <div className={isImmersiveUniverseRoute ? '' : desktopRailOffsetClass}>
          <Footer />
        </div>
      ) : null}
    </div>
  );
}
