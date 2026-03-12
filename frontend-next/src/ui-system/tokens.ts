/** Design tokens extracted from globals.css — single source of truth */

export const colors = {
  earth: {
    dark: '#2c241b',
    medium: '#8b7355',
    light: '#d4c4b7',
  },
  sage: {
    DEFAULT: '#87a878',
    light: '#e8f0e4',
  },
  forest: {
    DEFAULT: '#2d5a3d',
    light: '#e0ebe3',
  },
  institutional: {
    DEFAULT: '#1e3a5f',
    light: '#e0e8f0',
  },
  accent: {
    DEFAULT: '#d97706',
    light: '#fef3e2',
  },
  danger: {
    DEFAULT: '#dc2626',
    light: '#fde8e8',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

export const semanticColors = {
  light: {
    background: '#faf9f7',
    foreground: '#2c241b',
    card: '#ffffff',
    cardForeground: '#2c241b',
    primary: '#1e3a5f',
    primaryForeground: '#ffffff',
    secondary: '#d4c4b7',
    secondaryForeground: '#2c241b',
    muted: '#f5f4f2',
    mutedForeground: '#78736c',
    border: '#e7e5e4',
    input: '#e7e5e4',
    ring: '#1e3a5f',
  },
  dark: {
    background: '#1a1a2e',
    foreground: '#e0e0e0',
    card: '#16213e',
    cardForeground: '#e0e0e0',
    primary: '#5b8dce',
    primaryForeground: '#ffffff',
    secondary: '#3a3a5a',
    secondaryForeground: '#e0e0e0',
    muted: '#22223a',
    mutedForeground: '#9a9ab0',
    border: '#2a2a4a',
    input: '#2a2a4a',
    ring: '#5b8dce',
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
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 4px 12px rgba(0, 0, 0, 0.08)',
  md: '0 8px 20px -4px rgba(0, 0, 0, 0.12)',
  lg: '0 20px 40px -12px rgba(44, 36, 27, 0.15)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
