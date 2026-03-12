'use client';

import { useTenant } from './TenantBrandWrapper';

export function Footer() {
  const tenant = useTenant();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-card)] py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-muted-foreground)]">
        <span>&copy; {year} {tenant.name}. Civic Commons Platform.</span>
        <span>v1.0.0-alpha</span>
      </div>
    </footer>
  );
}
