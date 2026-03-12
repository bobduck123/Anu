'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { brand } from '@/lib/brand';
import { getCoreApiBase } from '@/lib/runtime';
import { getTenantCSSVars, type TenantThemeOverride } from '../theme';

export interface TenantConfig {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  modules: Record<string, boolean>;
  dataPolicy: number;
  calendarMode?: 'shifts' | 'events' | 'booking';
}

const defaultConfig: TenantConfig = {
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
};

const TenantContext = createContext<TenantConfig>(defaultConfig);

export function TenantBrandWrapper({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultConfig);

  useEffect(() => {
    const apiBase = getCoreApiBase();
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    fetch(`${apiBase}/api/nodes/current/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const cfg = data.data || data;
        setConfig({
          name: cfg.name || defaultConfig.name,
          logo: cfg.logo || cfg.branding?.logo || '',
          primaryColor: cfg.branding?.primary_color || cfg.primary_color || defaultConfig.primaryColor,
          secondaryColor: cfg.branding?.secondary_color,
          accentColor: cfg.branding?.accent_color,
          modules: cfg.modules || defaultConfig.modules,
          dataPolicy: cfg.data_policy ?? 0,
          calendarMode: cfg.calendar?.mode,
        });
      })
      .catch(() => {});
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
    if (config.name !== defaultConfig.name) {
      root.setAttribute('data-tenant-theme', config.name.toLowerCase().replace(/\s+/g, '-'));
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
