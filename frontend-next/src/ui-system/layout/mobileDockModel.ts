import type { LucideIcon } from 'lucide-react';
import { BookOpen, Compass, FlaskConical, House, Map, Shield, Sparkles, Target, User } from 'lucide-react';

export interface MobileDockLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

function buildDoorwayLink(isAuthenticated: boolean): MobileDockLink {
  return {
    href: isAuthenticated ? '/profile' : '/auth',
    label: isAuthenticated ? 'Profile' : 'Sign in',
    icon: User,
  };
}

export function getMobileDockLinks(
  pathname: string | null,
  isAuthenticated: boolean,
  hasStewardAccess: boolean,
): MobileDockLink[] {
  const doorwayLink = buildDoorwayLink(isAuthenticated);

  if (pathname?.startsWith('/sandbox') && hasStewardAccess) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: '/sandbox/ui-lab', label: 'UI Lab', icon: FlaskConical },
      { href: '/sandbox/maps', label: 'Maps', icon: Map },
      doorwayLink,
    ];
  }

  if (
    pathname?.startsWith('/transparency') ||
    pathname?.startsWith('/memberships') ||
    pathname?.startsWith('/docs') ||
    pathname?.startsWith('/contact')
  ) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: '/transparency', label: 'Trust', icon: Shield },
      { href: '/docs', label: 'Docs', icon: BookOpen },
      doorwayLink,
    ];
  }

  if (pathname?.startsWith('/education')) {
    return [
      { href: '/education', label: 'Learn', icon: BookOpen },
      { href: '/universe', label: 'Universe', icon: Compass },
      { href: '/community', label: 'Commons', icon: Sparkles },
      doorwayLink,
    ];
  }

  if (pathname?.startsWith('/community')) {
    return [
      { href: '/community', label: 'Commons', icon: Compass },
      { href: '/manara', label: 'Signals', icon: Sparkles },
      { href: '/education', label: 'Learn', icon: BookOpen },
      doorwayLink,
    ];
  }

  if (pathname?.startsWith('/manara') || pathname?.startsWith('/flora-fauna')) {
    return [
      { href: '/manara', label: 'Signals', icon: Sparkles },
      { href: '/community', label: 'Commons', icon: Compass },
      { href: '/education', label: 'Learn', icon: BookOpen },
      doorwayLink,
    ];
  }

  if (
    pathname?.startsWith('/actions') ||
    pathname?.startsWith('/events') ||
    pathname?.startsWith('/cost-lowering') ||
    pathname?.startsWith('/runs') ||
    pathname?.startsWith('/pledges')
  ) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: '/community', label: 'Commons', icon: Compass },
      { href: '/cost-lowering', label: 'Tasks', icon: Target },
      doorwayLink,
    ];
  }

  return [
    { href: '/community', label: 'Commons', icon: Compass },
    { href: '/education', label: 'Learn', icon: BookOpen },
    { href: '/cost-lowering', label: 'Tasks', icon: Target },
    doorwayLink,
  ];
}
