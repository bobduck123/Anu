'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { brand } from '@/lib/brand';
import { getCoreApiBase } from '@/lib/runtime';
import {
  buildDefaultPublicSiteManifest,
  DEFAULT_SITE_RESOLUTION_META,
  normalizePublicSiteManifest,
  normalizePublicSiteResolutionMeta,
  type PublicSiteManifest,
  type PublicSiteResolutionMeta,
} from '@/lib/publicSiteManifest';
import { getTenantCSSVars, type TenantThemeOverride } from '../theme';

export interface TenantConfig {
  id: number | null;
  semanticKey?: string;
  slug: string;
  name: string;
  logo: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  modules: Record<string, boolean>;
  dataPolicy: number;
  calendarMode?: 'shifts' | 'events' | 'booking';
  isWhiteLabel: boolean;
  customCss?: string;
  siteManifest: PublicSiteManifest;
  siteResolution: PublicSiteResolutionMeta;
}

interface PublicNodeConfigDto {
  node_id: number;
  node_slug: string;
  node_name: string;
  semantic_key?: string | null;
  white_label: boolean;
  brand?: {
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    logo_url?: string | null;
    favicon_url?: string | null;
    custom_css?: string | null;
  };
  modules?: Record<string, boolean>;
  site_manifest?: unknown;
  site_resolution?: unknown;
}

const defaultSiteManifest = buildDefaultPublicSiteManifest({
  siteKey: brand.semanticKey,
  siteName: brand.name,
});

const defaultConfig: TenantConfig = {
  id: null,
  semanticKey: brand.semanticKey,
  slug: '',
  name: brand.name,
  logo: '',
  primaryColor: '#1e0227',
  accentColor: '#e0b115',
  modules: {
    marketplace: true,
    calendar: true,
    education: true,
    community: true,
    costLowering: true,
    impact: true,
    relief: true,
    governance: true,
  },
  dataPolicy: 0,
  isWhiteLabel: false,
  siteManifest: defaultSiteManifest,
  siteResolution: DEFAULT_SITE_RESOLUTION_META,
};

const TenantContext = createContext<TenantConfig>(defaultConfig);

/**
 * Parse optional tenant hints from middleware-set cookies.
 * Note: middleware writes httpOnly cookies by default, so this is best-effort only.
 */
function getTenantFromCookie(): Partial<TenantConfig> | null {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.tenant_brand) {
      const brandConfig = JSON.parse(decodeURIComponent(cookies.tenant_brand));
      const siteManifest = cookies.tenant_site_manifest
        ? normalizePublicSiteManifest(
          JSON.parse(decodeURIComponent(cookies.tenant_site_manifest)),
          buildDefaultPublicSiteManifest({
            tenantId: parseInt(cookies.tenant_id) || null,
            siteKey: cookies.tenant_slug || brand.semanticKey,
            siteName: decodeURIComponent(cookies.tenant_name || '') || brand.name,
            logoUrl: brandConfig.logo_url ?? brandConfig.logoUrl ?? null,
            faviconUrl: brandConfig.favicon_url ?? brandConfig.faviconUrl ?? null,
            primaryColor: brandConfig.primary_color ?? brandConfig.primaryColor ?? null,
            secondaryColor: brandConfig.secondary_color ?? brandConfig.secondaryColor ?? null,
            accentColor: brandConfig.accent_color ?? brandConfig.accentColor ?? null,
            customCss: brandConfig.custom_css ?? brandConfig.customCss ?? null,
          }),
        )
        : defaultSiteManifest;
      return {
        id: parseInt(cookies.tenant_id) || null,
        semanticKey: cookies.tenant_semantic_key || brand.semanticKey,
        slug: cookies.tenant_slug || '',
        name: decodeURIComponent(cookies.tenant_name || '') || brand.name,
        isWhiteLabel: cookies.tenant_white_label === 'true',
        primaryColor: brandConfig.primary_color ?? brandConfig.primaryColor,
        secondaryColor: brandConfig.secondary_color ?? brandConfig.secondaryColor,
        accentColor: brandConfig.accent_color ?? brandConfig.accentColor,
        logo: brandConfig.logo_url ?? brandConfig.logoUrl,
        favicon: brandConfig.favicon_url ?? brandConfig.faviconUrl,
        customCss: brandConfig.custom_css ?? brandConfig.customCss,
        siteManifest,
        siteResolution: DEFAULT_SITE_RESOLUTION_META,
      };
    }
    
    if (cookies.tenant_id) {
      return {
        id: parseInt(cookies.tenant_id) || null,
        semanticKey: cookies.tenant_semantic_key || brand.semanticKey,
        siteManifest: defaultSiteManifest,
        siteResolution: DEFAULT_SITE_RESOLUTION_META,
      };
    }
  } catch {
    // Cookie parsing failed, fall back to API
  }
  
  return null;
}

function mapPublicNodeConfigToTenantConfig(
  dto: Partial<PublicNodeConfigDto>,
  fallback: Partial<TenantConfig>,
): TenantConfig {
  const brandConfig = dto.brand || {};
  const fallbackSiteManifest =
    fallback.siteManifest
    || buildDefaultPublicSiteManifest({
      tenantId: dto.node_id ?? fallback.id ?? null,
      siteKey: dto.node_slug ?? fallback.slug ?? undefined,
      siteName: dto.node_name ?? fallback.name ?? undefined,
      logoUrl: (brandConfig.logo_url as string | null | undefined) ?? fallback.logo ?? null,
      faviconUrl: (brandConfig.favicon_url as string | null | undefined) ?? fallback.favicon ?? null,
      primaryColor: (brandConfig.primary_color as string | null | undefined) ?? fallback.primaryColor ?? null,
      secondaryColor: (brandConfig.secondary_color as string | null | undefined) ?? fallback.secondaryColor ?? null,
      accentColor: (brandConfig.accent_color as string | null | undefined) ?? fallback.accentColor ?? null,
      customCss: (brandConfig.custom_css as string | null | undefined) ?? fallback.customCss ?? null,
    });

  const siteManifest = normalizePublicSiteManifest(dto.site_manifest, fallbackSiteManifest);
  const siteResolution = normalizePublicSiteResolutionMeta(dto.site_resolution);

  return {
    ...defaultConfig,
    ...fallback,
    id: dto.node_id ?? fallback.id ?? null,
    semanticKey: dto.semantic_key || fallback.semanticKey || brand.semanticKey,
    slug: dto.node_slug || fallback.slug || '',
    name: dto.node_name || fallback.name || defaultConfig.name,
    logo: brandConfig.logo_url || fallback.logo || '',
    favicon: brandConfig.favicon_url || fallback.favicon,
    primaryColor: brandConfig.primary_color || fallback.primaryColor || defaultConfig.primaryColor,
    secondaryColor: brandConfig.secondary_color || fallback.secondaryColor,
    accentColor: brandConfig.accent_color || fallback.accentColor || defaultConfig.accentColor,
    modules: dto.modules || fallback.modules || defaultConfig.modules,
    isWhiteLabel: Boolean(dto.white_label ?? fallback.isWhiteLabel ?? false),
    customCss: brandConfig.custom_css || fallback.customCss,
    siteManifest,
    siteResolution,
  };
}

export function TenantBrandWrapper({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(() => {
    const cookieTenant = getTenantFromCookie();
    return cookieTenant?.id
      ? {
          ...defaultConfig,
          ...cookieTenant,
        }
      : defaultConfig;
  });

  useEffect(() => {
    const cookieTenant = getTenantFromCookie();
    const apiBase = getCoreApiBase();
    const endpoint = `${apiBase}/api/public/nodes/current/config`;

    fetch(endpoint, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          return;
        }
        const cfg = (data.data || data) as Partial<PublicNodeConfigDto>;
        setConfig(mapPublicNodeConfigToTenantConfig(cfg, cookieTenant || {}));
      })
      .catch(() => {
        // Keep cookie/default config when fetch fails.
      });
  }, []);

  // Apply tenant CSS overrides
  useEffect(() => {
    const root = document.documentElement;
    const overrides: TenantThemeOverride = {
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
    };
    const vars = getTenantCSSVars(overrides);
    for (const [prop, value] of Object.entries(vars)) {
      root.style.setProperty(prop, value);
    }
    
    // Set tenant theme attribute for CSS targeting
    if (config.slug) {
      root.setAttribute('data-tenant', config.slug);
    }
    if (config.name !== defaultConfig.name) {
      root.setAttribute('data-tenant-theme', config.name.toLowerCase().replace(/\s+/g, '-'));
    }
    if (config.isWhiteLabel) {
      root.setAttribute('data-white-label', 'true');
    }
    
    // Apply custom CSS if provided
    let styleEl = document.getElementById('tenant-custom-css');
    if (config.customCss) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'tenant-custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = config.customCss;
    } else if (styleEl) {
      styleEl.remove();
    }
    
    // Update favicon for white-label sites
    if (config.favicon && config.isWhiteLabel) {
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        existingFavicon.setAttribute('href', config.favicon);
      } else {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = config.favicon;
        document.head.appendChild(favicon);
      }
    }
  }, [config]);

  return (
    <TenantContext.Provider value={config}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

/**
 * Hook to check if a module is enabled for the current tenant.
 */
export function useModuleEnabled(moduleName: string): boolean {
  const tenant = useTenant();
  return tenant.modules[moduleName] ?? true;
}

/**
 * Hook to get tenant-specific branding values.
 */
export function useTenantBranding() {
  const tenant = useTenant();
  return {
    name: tenant.name,
    logo: tenant.logo,
    semanticKey: tenant.semanticKey,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    accentColor: tenant.accentColor,
    isWhiteLabel: tenant.isWhiteLabel,
  };
}
