import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export interface EarthNavItem {
  href: string;
  label: string;
  active?: boolean;
  icon?: LucideIcon;
}

interface EarthNavPillProps {
  items: EarthNavItem[];
  className?: string;
}

export function EarthNavPill({ items, className }: EarthNavPillProps) {
  return (
    <nav className={joinClasses('anu-earth-nav-pill', className)} aria-label="Earth routes">
      {items.map((item) => (
        (() => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={joinClasses('anu-earth-nav-link', item.active && 'anu-earth-nav-link-active')}
              aria-current={item.active ? 'page' : undefined}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
              <span>{item.label}</span>
            </Link>
          );
        })()
      ))}
    </nav>
  );
}
