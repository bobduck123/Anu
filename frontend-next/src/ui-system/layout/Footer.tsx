'use client';

import { useTenant } from './TenantBrandWrapper';

export function Footer() {
  const tenant = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="manara-grid-hero border-t border-[#30445f]/55 bg-[linear-gradient(90deg,rgba(11,21,35,0.88),rgba(14,27,44,0.86))] px-4 py-4 text-slate-200 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 text-xs sm:flex-row sm:items-center">
        <span className="tracking-[0.02em] text-slate-200/90">
          © {year} {tenant.name}. Cultural operating commons.
        </span>
        <span className="font-mono-data text-[11px] uppercase tracking-[0.16em] text-[#f0c98f]/75">v1.0.0-alpha</span>
      </div>
    </footer>
  );
}
