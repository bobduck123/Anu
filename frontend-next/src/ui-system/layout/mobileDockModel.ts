import type { LucideIcon } from 'lucide-react';
import { BookOpen, Compass, FlaskConical, House, Map, Shield, Sparkles, Target, User } from 'lucide-react';
import { INTERNAL_ROUTE_CANON, resolveCanonicalRoute } from '@/ui-system/anu/routePurposeRegistry';
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
  const canonicalPath = resolveCanonicalRoute(pathname);
  const realmSurface = getRealmSurface(canonicalPath);

  if ((canonicalPath?.startsWith('/sandbox') || canonicalPath?.startsWith(INTERNAL_ROUTE_CANON.lab)) && hasStewardAccess) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: INTERNAL_ROUTE_CANON.lab, label: 'UI Lab', icon: FlaskConical },
      { href: '/sandbox/maps', label: 'Maps', icon: Map },
      doorwayLink,
    ];
  }

  if (
    canonicalPath?.startsWith('/governance/model-registry')
    || canonicalPath?.startsWith('/transparency')
    || canonicalPath?.startsWith('/archive')
    || canonicalPath?.startsWith('/memberships')
    || canonicalPath?.startsWith('/docs')
    || canonicalPath?.startsWith('/contact')
  ) {
    return [
      { href: '/home', label: 'Home', icon: House },
      { href: '/transparency', label: 'Trust', icon: Shield },
      { href: '/archive', label: 'Archive', icon: BookOpen },
      doorwayLink,
    ];
  }

  if (canonicalPath?.startsWith('/education')) {
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

  if (canonicalPath?.startsWith('/manara') || canonicalPath?.startsWith('/flora-fauna')) {
    return [
      { href: '/manara', label: 'Signals', icon: Sparkles },
      { href: '/community', label: 'Commons', icon: Compass },
      { href: '/education', label: 'Learn', icon: BookOpen },
      doorwayLink,
    ];
  }

  if (
    realmSurface.realm === 'earth'
    || canonicalPath?.startsWith('/cost-lowering')
    || canonicalPath?.startsWith('/runs')
    || canonicalPath?.startsWith('/pledges')
  ) {
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
