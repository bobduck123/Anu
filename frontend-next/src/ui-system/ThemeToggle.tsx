'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const order = ['light', 'dark', 'system'] as const;
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  return (
    <button
      onClick={cycle}
      className="manara-glass-chip inline-flex min-h-10 min-w-10 items-center justify-center border border-white/10 bg-white/5 text-slate-100 transition-colors hover:bg-white/10 focus-ring"
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun className="h-5 w-5 text-slate-100" />}
      {theme === 'dark' && <Moon className="h-5 w-5 text-slate-100" />}
      {theme === 'system' && <Monitor className="h-5 w-5 text-slate-100" />}
    </button>
  );
}
