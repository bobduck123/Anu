/**
 * ANU Phase 1 color tokens.
 * Constraint: only the five approved brand colors (or alpha derivatives).
 */

export const anuPalette = {
  midnightViolet: '#1e0227',
  oliveBark: '#665700',
  almondSilk: '#f6d4cb',
  metallicGold: '#e0b115',
  claySoil: '#7c413c',
} as const;

export const colors = {
  earth: {
    dark: anuPalette.midnightViolet,
    medium: anuPalette.claySoil,
    light: anuPalette.almondSilk,
  },
  sage: {
    DEFAULT: anuPalette.oliveBark,
    light: 'rgba(102,87,0,0.24)',
  },
  forest: {
    DEFAULT: anuPalette.oliveBark,
    light: 'rgba(102,87,0,0.34)',
  },
  institutional: {
    DEFAULT: anuPalette.metallicGold,
    light: 'rgba(224,177,21,0.24)',
  },
  accent: {
    DEFAULT: anuPalette.metallicGold,
    light: 'rgba(224,177,21,0.18)',
  },
  danger: {
    DEFAULT: anuPalette.claySoil,
    light: 'rgba(124,65,60,0.2)',
  },
  white: anuPalette.almondSilk,
  black: anuPalette.midnightViolet,
} as const;

export const semanticColors = {
  light: {
    background: anuPalette.midnightViolet,
    foreground: anuPalette.almondSilk,
    card: 'rgba(124,65,60,0.24)',
    cardForeground: anuPalette.almondSilk,
    primary: anuPalette.metallicGold,
    primaryForeground: anuPalette.midnightViolet,
    secondary: anuPalette.claySoil,
    secondaryForeground: anuPalette.almondSilk,
    muted: 'rgba(102,87,0,0.24)',
    mutedForeground: 'rgba(246,212,203,0.78)',
    border: 'rgba(224,177,21,0.34)',
    input: 'rgba(124,65,60,0.42)',
    ring: anuPalette.metallicGold,
  },
  dark: {
    background: anuPalette.midnightViolet,
    foreground: anuPalette.almondSilk,
    card: 'rgba(124,65,60,0.3)',
    cardForeground: anuPalette.almondSilk,
    primary: anuPalette.metallicGold,
    primaryForeground: anuPalette.midnightViolet,
    secondary: anuPalette.oliveBark,
    secondaryForeground: anuPalette.almondSilk,
    muted: 'rgba(102,87,0,0.3)',
    mutedForeground: 'rgba(246,212,203,0.72)',
    border: 'rgba(224,177,21,0.28)',
    input: 'rgba(124,65,60,0.5)',
    ring: anuPalette.metallicGold,
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
} as const;

export const typography = {
  fontFamily: {
    sans: 'var(--font-inter), system-ui, sans-serif',
    serif: 'var(--font-source-serif), Georgia, serif',
    mono: 'var(--font-jetbrains-mono), ui-monospace, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.2',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
  },
} as const;

export const radii = {
  none: '0',
  sm: '0.25rem',
  DEFAULT: '0.5rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(30,2,39,0.2)',
  DEFAULT: '0 4px 12px rgba(30,2,39,0.3)',
  md: '0 8px 20px -4px rgba(30,2,39,0.36)',
  lg: '0 20px 40px -12px rgba(30,2,39,0.42)',
  xl: '0 25px 50px -12px rgba(30,2,39,0.54)',
} as const;

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  header: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

export const animation = {
  duration: {
    fast: '200ms',
    base: '500ms',
    slow: '800ms',
  },
  easing: {
    smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
    ease: 'ease',
    easeInOut: 'ease-in-out',
  },
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
