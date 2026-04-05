'use client';

import { useTenant } from './TenantBrandWrapper';

export function Footer() {
  const tenant = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="manara-grid-hero border-t border-[#7c413c]/55 bg-[linear-gradient(90deg,rgba(30,2,39,0.88),rgba(30,2,39,0.86))] px-4 py-4 text-[color:rgba(246,212,203,0.84)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 text-xs sm:flex-row sm:items-center">
        <span className="tracking-[0.02em] text-[color:rgba(246,212,203,0.9)]">
          © {year} {tenant.name}. Cultural operating commons.
        </span>
        <span className="font-mono-data text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/75">v1.0.0-alpha</span>
      </div>
    </footer>
  );
}
