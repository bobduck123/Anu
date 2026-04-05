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
      className="manara-glass-chip inline-flex min-h-10 min-w-10 items-center justify-center border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] text-[color:rgba(246,212,203,0.92)] transition-colors hover:bg-[color:rgba(246,212,203,0.1)] focus-ring"
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun className="h-5 w-5 text-[color:rgba(246,212,203,0.92)]" />}
      {theme === 'dark' && <Moon className="h-5 w-5 text-[color:rgba(246,212,203,0.92)]" />}
      {theme === 'system' && <Monitor className="h-5 w-5 text-[color:rgba(246,212,203,0.92)]" />}
    </button>
  );
}
