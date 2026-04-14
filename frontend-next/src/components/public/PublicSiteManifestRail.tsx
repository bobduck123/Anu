'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getRoutePurpose } from '@/ui-system/anu/routePurposeRegistry';
import { isPublicSafeManifestHref } from '@/lib/publicSiteManifest';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';

const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/archive',
  '/trust',
  '/transparency',
  '/docs',
  '/contact',
  '/privacy',
  '/terms',
  '/code-of-conduct',
  '/community',
  '/impact',
  '/education',
  '/actions',
  '/events',
  '/universe',
  '/governance/model-registry',
] as const;

function isPublicSurface(pathname: string, plane: string | undefined): boolean {
  if (plane === 'public') {
    return true;
  }
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function PublicSiteManifestRail() {
  const pathname = usePathname();
  const routePurpose = getRoutePurpose(pathname);
  const tenant = useTenant();

  const manifest = tenant.siteManifest;
  if (!isPublicSurface(pathname, routePurpose?.plane)) {
    return null;
  }

  const navItems = manifest.navItems.filter((item) => isPublicSafeManifestHref(item.href)).slice(0, 6);
  const footerLinks = manifest.footerLinks.filter((item) => isPublicSafeManifestHref(item.href)).slice(0, 6);

  return (
    <section
      data-testid="public-site-manifest-rail"
      className="mb-4 rounded-2xl border border-[color:rgba(246,212,203,0.18)] bg-[color:rgba(30,2,39,0.44)] px-4 py-4 text-[color:rgba(246,212,203,0.9)] shadow-[0_16px_30px_-24px_rgba(30,2,39,0.85)] md:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f6d4cb]/76">Public site manifest</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">{manifest.siteName}</h2>
          <p className="mt-1 text-sm text-[#f6d4cb]/80">{manifest.tagline}</p>
        </div>
        <div className="text-right text-xs text-[#f6d4cb]/70">
          <p>{manifest.siteKey}</p>
          {manifest.previewHost ? <p className="mt-1">{manifest.previewHost}</p> : null}
        </div>
      </div>

      {tenant.siteResolution.resolved ? null : (
        <p data-testid="public-site-resolution-fallback" className="mt-3 text-xs text-[#f6d4cb]/78">
          {tenant.siteResolution.fallbackNote || 'This host is not mapped to a tenant site manifest. Showing platform defaults.'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {navItems.map((item) => (
          <Link
            key={`${item.href}:${item.label}`}
            href={item.href}
            className="rounded-full border border-[color:rgba(246,212,203,0.18)] px-3 py-1 text-xs font-medium text-[#f6d4cb]/90 transition-colors hover:bg-[color:rgba(246,212,203,0.12)]"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#f6d4cb]/75">
        {footerLinks.map((item) => (
          <Link key={`${item.href}:${item.label}`} href={item.href} className="underline-offset-4 hover:underline">
            {item.label}
          </Link>
        ))}
        {manifest.contact.email ? <span>{manifest.contact.email}</span> : null}
      </div>
    </section>
  );
}

