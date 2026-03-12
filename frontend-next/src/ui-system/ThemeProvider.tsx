'use client';

import { createContext, useContext, useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { type ThemeMode } from './tokens';
import { resolveTheme, getThemeCSSVars } from './theme';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'ff-theme';

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ['light', 'dark', 'system'].includes(stored)) return stored as ThemeMode;
  return 'light';
}

function applyThemeToDOM(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  const vars = getThemeCSSVars(resolved);
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeRef = useRef<ThemeMode>(getStoredTheme());
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((cb: () => void) => {
    // Apply theme on first subscription (mount)
    applyThemeToDOM(themeRef.current);
    listenersRef.current.add(cb);
    // Also listen for system theme changes
    const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handler = () => { if (themeRef.current === 'system') { applyThemeToDOM('system'); cb(); } };
    mq?.addEventListener('change', handler);
    return () => { listenersRef.current.delete(cb); mq?.removeEventListener('change', handler); };
  }, []);

  const getSnapshot = useCallback(() => themeRef.current, []);
  const getServerSnapshot = useCallback((): ThemeMode => 'light', []);

  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolved = resolveTheme(theme);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    themeRef.current = newTheme;
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyThemeToDOM(newTheme);
    listenersRef.current.forEach((cb) => cb());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
