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
      className="p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors focus-ring"
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun className="w-5 h-5 text-[var(--color-foreground)]" />}
      {theme === 'dark' && <Moon className="w-5 h-5 text-[var(--color-foreground)]" />}
      {theme === 'system' && <Monitor className="w-5 h-5 text-[var(--color-foreground)]" />}
    </button>
  );
}
