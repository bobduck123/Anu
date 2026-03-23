import type { LucideIcon } from 'lucide-react';
import { BookOpen, Compass, FlaskConical, House, Map, Shield, Sparkles, Target, User } from 'lucide-react';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

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
  const realmSurface = getRealmSurface(pathname);

  if (pathname?.startsWith('/sandbox') && hasStewardAccess) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: '/sandbox/ui-lab', label: 'UI Lab', icon: FlaskConical },
      { href: '/sandbox/maps', label: 'Maps', icon: Map },
      doorwayLink,
    ];
  }

  if (
    pathname?.startsWith('/governance/model-registry') ||
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

  if (realmSurface.realm === 'celestial') {
    return [
      { href: '/community', label: 'Commons', icon: Compass },
      { href: '/constellations', label: 'Stars', icon: Sparkles },
      { href: '/impact', label: 'Impact', icon: Target },
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

  if (realmSurface.realm === 'earth' || pathname?.startsWith('/cost-lowering') || pathname?.startsWith('/runs') || pathname?.startsWith('/pledges')) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: '/actions', label: 'Actions', icon: Target },
      { href: '/events', label: 'Events', icon: Map },
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
