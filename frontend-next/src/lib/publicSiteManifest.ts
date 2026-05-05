import { brand } from '@/lib/brand';

export interface PublicSiteManifestNavItem {
  label: string;
  href: string;
  module?: string | null;
}

export interface PublicSiteManifestLinkItem {
  label: string;
  href: string;
}

export interface PublicSiteManifest {
  tenantId: number | null;
  siteKey: string;
  siteName: string;
  tagline: string;
  brandAssets: {
    logoUrl: string | null;
    faviconUrl: string | null;
    wordmarkUrl: string | null;
  };
  themeTokens: {
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    customCss: string | null;
  };
  navItems: PublicSiteManifestNavItem[];
  enabledPublicModules: string[];
  footerLinks: PublicSiteManifestLinkItem[];
  legalLinks: Record<string, string>;
  trustLinks: Record<string, string>;
  contact: {
    email: string | null;
    publicContactUrl: string;
    locationLabel: string | null;
  };
  canonicalDomains: string[];
  previewHost: string | null;
}

export interface PublicSiteResolutionMeta {
  resolved: boolean;
  resolutionStatus: string;
  fallbackNote: string | null;
  host: string | null;
}

const PUBLIC_ROUTE_PREFIXES = [
  '/',
  '/about',
  '/mission',
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

const DEFAULT_NAV_ITEMS: PublicSiteManifestNavItem[] = [
  { label: 'About', href: '/about' },
  { label: 'Community', href: '/community', module: 'community' },
  { label: 'Impact', href: '/impact', module: 'impact' },
  { label: 'Education', href: '/education', module: 'education' },
  { label: 'Trust Center', href: '/trust', module: 'trust' },
  { label: 'Transparency', href: '/transparency', module: 'transparency' },
  { label: 'Archive', href: '/archive', module: 'archive' },
];

const DEFAULT_FOOTER_LINKS: PublicSiteManifestLinkItem[] = [
  { label: 'About', href: '/about' },
  { label: 'Trust Center', href: '/trust' },
  { label: 'Transparency', href: '/transparency' },
  { label: 'Archive', href: '/archive' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Code of Conduct', href: '/code-of-conduct' },
  { label: 'Contact', href: '/contact' },
];

export const DEFAULT_SITE_RESOLUTION_META: PublicSiteResolutionMeta = {
  resolved: true,
  resolutionStatus: 'resolved',
  fallbackNote: null,
  host: null,
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  return normalized || fallback;
}

function asNullableText(value: unknown): string | null {
  const normalized = asText(value);
  return normalized || null;
}

export function isPublicSafeManifestHref(href: string): boolean {
  if (!href.startsWith('/')) {
    return false;
  }
  if (href.startsWith('/api') || href.startsWith('/control')) {
    return false;
  }

  return PUBLIC_ROUTE_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`));
}

function sanitizeNavItems(raw: unknown): PublicSiteManifestNavItem[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_NAV_ITEMS;
  }

  const projected: PublicSiteManifestNavItem[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    const href = asText(row.href);
    const label = asText(row.label);
    if (!href || !label || !isPublicSafeManifestHref(href)) {
      continue;
    }

    const module = asNullableText(row.module);
    projected.push(module ? { label, href, module } : { label, href });
  }

  return projected.length ? projected : DEFAULT_NAV_ITEMS;
}

function sanitizeFooterLinks(raw: unknown): PublicSiteManifestLinkItem[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_FOOTER_LINKS;
  }

  const projected: PublicSiteManifestLinkItem[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    const href = asText(row.href);
    const label = asText(row.label);
    if (!href || !label || !isPublicSafeManifestHref(href)) {
      continue;
    }
    projected.push({ label, href });
  }

  return projected.length ? projected : DEFAULT_FOOTER_LINKS;
}

function sanitizeLookup(raw: unknown, defaults: Record<string, string>): Record<string, string> {
  const source = asRecord(raw);
  return Object.fromEntries(
    Object.entries(defaults).map(([key, defaultHref]) => {
      const candidate = asText(source[key], defaultHref);
      return [key, isPublicSafeManifestHref(candidate) ? candidate : defaultHref];
    }),
  );
}

export function buildDefaultPublicSiteManifest(source: {
  tenantId?: number | null;
  siteKey?: string | null;
  siteName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  customCss?: string | null;
} = {}): PublicSiteManifest {
  const siteName = source.siteName || brand.name;
  const siteKey = source.siteKey || brand.semanticKey;
  return {
    tenantId: source.tenantId ?? null,
    siteKey,
    siteName,
    tagline: `${siteName} public routes are hosted on ANU platform rails.`,
    brandAssets: {
      logoUrl: source.logoUrl ?? null,
      faviconUrl: source.faviconUrl ?? null,
      wordmarkUrl: null,
    },
    themeTokens: {
      primaryColor: source.primaryColor ?? null,
      secondaryColor: source.secondaryColor ?? null,
      accentColor: source.accentColor ?? null,
      customCss: source.customCss ?? null,
    },
    navItems: DEFAULT_NAV_ITEMS,
    enabledPublicModules: ['community', 'impact', 'education', 'trust', 'transparency', 'archive'],
    footerLinks: DEFAULT_FOOTER_LINKS,
    legalLinks: {
      privacy: '/privacy',
      terms: '/terms',
      code_of_conduct: '/code-of-conduct',
    },
    trustLinks: {
      trust_center: '/trust',
      transparency: '/transparency',
      archive: '/archive',
    },
    contact: {
      email: null,
      publicContactUrl: '/contact',
      locationLabel: null,
    },
    canonicalDomains: [],
    previewHost: null,
  };
}

export function normalizePublicSiteManifest(
  raw: unknown,
  fallback: PublicSiteManifest,
): PublicSiteManifest {
  const value = asRecord(raw);
  const brandAssets = asRecord(value.brand_assets ?? value.brandAssets);
  const themeTokens = asRecord(value.theme_tokens ?? value.themeTokens);
  const contact = asRecord(value.contact);

  const enabledModuleSource = value.enabled_public_modules ?? value.enabledPublicModules;
  const enabledPublicModules = Array.isArray(enabledModuleSource)
    ? enabledModuleSource.map((item: unknown) => asText(item)).filter(Boolean)
    : fallback.enabledPublicModules;
  const canonicalDomainSource = value.canonical_domains ?? value.canonicalDomains;
  const canonicalDomains = Array.isArray(canonicalDomainSource)
    ? canonicalDomainSource.map((item: unknown) => asText(item)).filter(Boolean)
    : fallback.canonicalDomains;

  return {
    tenantId:
      typeof value.tenant_id === 'number'
        ? value.tenant_id
        : typeof value.tenantId === 'number'
          ? value.tenantId
          : fallback.tenantId,
    siteKey: asText(value.site_key ?? value.siteKey, fallback.siteKey),
    siteName: asText(value.site_name ?? value.siteName, fallback.siteName),
    tagline: asText(value.tagline, fallback.tagline),
    brandAssets: {
      logoUrl: asNullableText(brandAssets.logo_url ?? brandAssets.logoUrl) ?? fallback.brandAssets.logoUrl,
      faviconUrl: asNullableText(brandAssets.favicon_url ?? brandAssets.faviconUrl) ?? fallback.brandAssets.faviconUrl,
      wordmarkUrl: asNullableText(brandAssets.wordmark_url ?? brandAssets.wordmarkUrl) ?? fallback.brandAssets.wordmarkUrl,
    },
    themeTokens: {
      primaryColor: asNullableText(themeTokens.primary_color ?? themeTokens.primaryColor) ?? fallback.themeTokens.primaryColor,
      secondaryColor: asNullableText(themeTokens.secondary_color ?? themeTokens.secondaryColor) ?? fallback.themeTokens.secondaryColor,
      accentColor: asNullableText(themeTokens.accent_color ?? themeTokens.accentColor) ?? fallback.themeTokens.accentColor,
      customCss: asNullableText(themeTokens.custom_css ?? themeTokens.customCss) ?? fallback.themeTokens.customCss,
    },
    navItems: sanitizeNavItems(value.nav_items ?? value.navItems),
    enabledPublicModules,
    footerLinks: sanitizeFooterLinks(value.footer_links ?? value.footerLinks),
    legalLinks: sanitizeLookup(value.legal_links ?? value.legalLinks, fallback.legalLinks),
    trustLinks: sanitizeLookup(value.trust_links ?? value.trustLinks, fallback.trustLinks),
    contact: {
      email: asNullableText(contact.email) ?? fallback.contact.email,
      publicContactUrl: isPublicSafeManifestHref(asText(contact.public_contact_url ?? contact.publicContactUrl, fallback.contact.publicContactUrl))
        ? asText(contact.public_contact_url ?? contact.publicContactUrl, fallback.contact.publicContactUrl)
        : fallback.contact.publicContactUrl,
      locationLabel: asNullableText(contact.location_label ?? contact.locationLabel) ?? fallback.contact.locationLabel,
    },
    canonicalDomains,
    previewHost: asNullableText(value.preview_host ?? value.previewHost) ?? fallback.previewHost,
  };
}

export function normalizePublicSiteResolutionMeta(raw: unknown): PublicSiteResolutionMeta {
  const value = asRecord(raw);
  const resolutionStatus = asText(value.resolution_status ?? value.resolutionStatus, DEFAULT_SITE_RESOLUTION_META.resolutionStatus);
  return {
    resolved: Boolean(value.resolved ?? DEFAULT_SITE_RESOLUTION_META.resolved),
    resolutionStatus,
    fallbackNote: asNullableText(value.fallback_note ?? value.fallbackNote),
    host: asNullableText(value.host),
  };
}
