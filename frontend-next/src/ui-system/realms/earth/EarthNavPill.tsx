import Link from 'next/link';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export interface EarthNavItem {
  href: string;
  label: string;
  active?: boolean;
}

interface EarthNavPillProps {
  items: EarthNavItem[];
  className?: string;
}

export function EarthNavPill({ items, className }: EarthNavPillProps) {
  return (
    <nav className={joinClasses('anu-earth-nav-pill', className)} aria-label="Earth routes">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={joinClasses('anu-earth-nav-link', item.active && 'anu-earth-nav-link-active')}
          aria-current={item.active ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
