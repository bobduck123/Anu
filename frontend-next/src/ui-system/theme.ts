import { semanticColors, type ThemeMode } from './tokens';

export interface TenantThemeOverride {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logo?: string;
  fontOverride?: string;
}

/** Generate CSS custom property declarations for a given theme */
export function getThemeCSSVars(mode: 'light' | 'dark'): Record<string, string> {
  const palette = semanticColors[mode];
  return {
    '--color-background': palette.background,
    '--color-foreground': palette.foreground,
    '--color-card': palette.card,
    '--color-card-foreground': palette.cardForeground,
    '--color-primary': palette.primary,
    '--color-primary-foreground': palette.primaryForeground,
    '--color-secondary': palette.secondary,
    '--color-secondary-foreground': palette.secondaryForeground,
    '--color-muted': palette.muted,
    '--color-muted-foreground': palette.mutedForeground,
    '--color-border': palette.border,
    '--color-input': palette.input,
    '--color-ring': palette.ring,
  };
}

/** Generate CSS custom properties for tenant branding overrides */
export function getTenantCSSVars(overrides: TenantThemeOverride): Record<string, string> {
  const vars: Record<string, string> = {};
  if (overrides.primaryColor) {
    vars['--color-institutional'] = overrides.primaryColor;
    vars['--color-primary'] = overrides.primaryColor;
    vars['--color-ring'] = overrides.primaryColor;
  }
  if (overrides.secondaryColor) {
    vars['--color-secondary'] = overrides.secondaryColor;
  }
  if (overrides.accentColor) {
    vars['--color-accent'] = overrides.accentColor;
  }
  return vars;
}

/** Resolve effective theme from user preference */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}
