'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { brand } from '@/lib/brand';
import { getCoreApiBase } from '@/lib/runtime';
import { getTenantCSSVars, type TenantThemeOverride } from '../theme';

export interface TenantConfig {
  id: number | null;
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
}

const defaultConfig: TenantConfig = {
  id: null,
  slug: '',
  name: brand.name,
  logo: '',
  primaryColor: '#17324a',
  accentColor: '#d18632',
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
};

const TenantContext = createContext<TenantConfig>(defaultConfig);

/**
 * Parse tenant context from middleware-set cookies/headers.
 * This allows Server Components to pass tenant info to client.
 */
function getTenantFromCookie(): Partial<TenantConfig> | null {
  if (typeof document === 'undefined') return null;
  
  // Try to get tenant brand config from cookie set by middleware
  try {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.tenant_brand) {
      const brandConfig = JSON.parse(decodeURIComponent(cookies.tenant_brand));
      return {
        id: parseInt(cookies.tenant_id) || null,
        slug: cookies.tenant_slug || '',
        name: cookies.tenant_name || brand.name,
        isWhiteLabel: cookies.tenant_white_label === 'true',
        primaryColor: brandConfig.primary_color,
        secondaryColor: brandConfig.secondary_color,
        logo: brandConfig.logo_url,
        favicon: brandConfig.favicon_url,
        customCss: brandConfig.custom_css,
      };
    }
    
    // Fallback: just tenant ID from cookie
    if (cookies.tenant_id) {
      return {
        id: parseInt(cookies.tenant_id) || null,
      };
    }
  } catch {
    // Cookie parsing failed, fall back to API
  }
  
  return null;
}

export function TenantBrandWrapper({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultConfig);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // First, try to get tenant from middleware cookies (for white-label sites)
    const cookieTenant = getTenantFromCookie();
    if (cookieTenant?.id) {
      setConfig((prev) => ({
        ...prev,
        ...cookieTenant,
      }));
    }

    // Then fetch full config from API
    const apiBase = getCoreApiBase();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    // Build request with tenant context
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // If we have a tenant ID from cookie, include it in the request
    const tenantId = cookieTenant?.id;
    const endpoint = tenantId 
      ? `${apiBase}/api/nodes/${tenantId}/config`
      : `${apiBase}/api/nodes/current/config`;

    fetch(endpoint, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setInitialized(true);
          return;
        }
        const cfg = data.data || data;
        setConfig({
          id: cfg.node_id || cfg.id || tenantId || null,
          slug: cfg.slug || cookieTenant?.slug || '',
          name: cfg.name || cookieTenant?.name || defaultConfig.name,
          logo: cfg.logo || cfg.branding?.logo || cfg.branding?.logo_url || cookieTenant?.logo || '',
          favicon: cfg.branding?.favicon_url || cookieTenant?.favicon,
          primaryColor: cfg.branding?.primary_color || cfg.primary_color || cookieTenant?.primaryColor || defaultConfig.primaryColor,
          secondaryColor: cfg.branding?.secondary_color || cookieTenant?.secondaryColor,
          accentColor: cfg.branding?.accent_color,
          modules: cfg.modules || defaultConfig.modules,
          dataPolicy: cfg.data_policy ?? 0,
          calendarMode: cfg.calendar?.mode,
          isWhiteLabel: cfg.white_label?.enabled || cookieTenant?.isWhiteLabel || false,
          customCss: cfg.branding?.custom_css || cookieTenant?.customCss,
        });
        setInitialized(true);
      })
      .catch(() => {
        setInitialized(true);
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
    if (config.customCss) {
      let styleEl = document.getElementById('tenant-custom-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'tenant-custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = config.customCss;
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
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    accentColor: tenant.accentColor,
    isWhiteLabel: tenant.isWhiteLabel,
  };
}
