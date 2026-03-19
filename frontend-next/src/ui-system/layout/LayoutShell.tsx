'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { SystemHealthBanner } from '@/components/systemic/SystemHealthBanner';

export function LayoutShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isFullBleedRoute = pathname?.startsWith('/wishlist/');
  const isImmersiveUniverseRoute = pathname?.startsWith('/universe');

  if (isFullBleedRoute) {
    return <div className="manara-shell min-h-screen">{children}</div>;
  }

  return (
    <div className="manara-shell min-h-screen flex flex-col">
      <Header
        onMenuToggle={() => setMobileOpen((open) => !open)}
        menuOpen={mobileOpen}
        showMenuToggleDesktop={isImmersiveUniverseRoute}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        immersive={isImmersiveUniverseRoute}
      />

      <main
        className={`shell-main relative mt-16 flex-1 transition-all duration-500 ${
          isImmersiveUniverseRoute ? 'overflow-hidden' : 'md:ml-[248px]'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(248,208,142,0.15),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(52,98,145,0.16),transparent_38%)]" />

        {!isImmersiveUniverseRoute ? (
          <div className="relative z-20 px-3 pt-3 md:px-8 md:pt-5">
            <SystemHealthBanner />
          </div>
        ) : null}

        <div className={`content-wrapper relative z-10 ${isImmersiveUniverseRoute ? 'h-full pb-0' : 'pb-8'}`}>
          {children}
        </div>
      </main>

      {!isImmersiveUniverseRoute ? (
        <div className="md:ml-[248px]">
          <Footer />
        </div>
      ) : null}
    </div>
  );
}
