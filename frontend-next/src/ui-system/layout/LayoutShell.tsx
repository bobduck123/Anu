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

  if (isFullBleedRoute) {
    return <div className="min-h-screen bg-[var(--color-background)]">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <Header onMenuToggle={() => setMobileOpen((o) => !o)} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main content — offset for fixed header (h-14) and sidebar (w-[240px] on md+) */}
      <main className="flex-1 mt-14 md:ml-[240px] transition-all duration-300">
        <div className="px-4 pt-4 md:px-8">
          <SystemHealthBanner />
        </div>
        <div className="content-wrapper">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
