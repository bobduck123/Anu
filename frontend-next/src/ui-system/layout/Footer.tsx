'use client';

import { useTenant } from './TenantBrandWrapper';

export function Footer() {
  const tenant = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#30445f]/70 bg-[linear-gradient(90deg,rgba(12,22,36,0.96),rgba(15,28,45,0.94))] px-4 py-4 text-slate-200">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 text-xs sm:flex-row sm:items-center">
        <span className="tracking-[0.02em] text-slate-200/90">
          © {year} {tenant.name}. Cultural operating commons.
        </span>
        <span className="font-mono-data text-[11px] uppercase tracking-[0.16em] text-[#f0c98f]/75">v1.0.0-alpha</span>
      </div>
    </footer>
  );
}
