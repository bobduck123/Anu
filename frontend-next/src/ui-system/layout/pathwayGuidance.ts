import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

export type NavigationMode = 'explore' | 'tasks' | 'all';

export interface PathwayStep {
  href: string;
  label: string;
  authRequired?: boolean;
}

export interface PathwayGuide {
  title: string;
  summary: string;
  steps: PathwayStep[];
}

export function deriveNavigationMode(pathname: string | null): NavigationMode {
  if (!pathname) {
    return 'explore';
  }

  const realmSurface = getRealmSurface(pathname);

  if (realmSurface.realm === 'earth' || realmSurface.realm === 'labyrinth') {
    return 'tasks';
  }

  if (
    pathname.startsWith('/cost-lowering')
    || pathname.startsWith('/runs')
    || pathname.startsWith('/pledges')
    || pathname.startsWith('/dashboard/savings')
    || pathname.startsWith('/organizer')
    || pathname.startsWith('/admin')
    || pathname.startsWith('/governance')
  ) {
    return 'tasks';
  }

  return 'explore';
}

export function buildPathwayGuide(pathname: string | null): PathwayGuide {
  if (!pathname) {
    return {
      title: 'Explore first',
      summary: 'Open a pathway, then move naturally into tasks.',
      steps: [
        { href: '/community', label: 'Open community' },
        { href: '/education', label: 'Browse learning paths' },
        { href: '/cost-lowering', label: 'Inspect run opportunities' },
      ],
    };
  }

  if (pathname.startsWith('/education')) {
    return {
      title: 'Learning to action',
      summary: 'Explore context, then progress into practical steps.',
      steps: [
        { href: '/education/maps', label: 'Open education maps' },
        { href: '/education/curriculum', label: 'Continue curriculum' },
        { href: '/education/certifications', label: 'Check certifications', authRequired: true },
      ],
    };
  }

  if (pathname.startsWith('/community')) {
    return {
      title: 'Community flow',
      summary: 'Enter through the celestial chart, browse the starfield, then fall back to the gallery only when deeper inspection is needed.',
      steps: [
        { href: '/community', label: 'Open community field' },
        { href: '/community?compose=1', label: 'Post a signal', authRequired: true },
        { href: '/constellations', label: 'Inspect constellations' },
      ],
    };
  }

  if (pathname.startsWith('/constellations')) {
    return {
      title: 'Celestial traversal',
      summary: 'Browse clustered structures first, then descend into the signal or record that needs attention.',
      steps: [
        { href: '/constellations', label: 'Open constellation field' },
        { href: '/community', label: 'Return to community mesh' },
        { href: '/impact', label: 'Inspect impact bridge' },
      ],
    };
  }

  if (pathname.startsWith('/sandbox')) {
    return {
      title: 'Sandbox review',
      summary: 'Inspect adapted patterns first, then validate route behavior and map surfaces.',
      steps: [
        { href: '/sandbox/ui-lab', label: 'Review UI lab', authRequired: true },
        { href: '/sandbox/maps', label: 'Check maps sandbox', authRequired: true },
        { href: '/home', label: 'Return to steward home', authRequired: true },
      ],
    };
  }

  if (pathname.startsWith('/cost-lowering') || pathname.startsWith('/runs') || pathname.startsWith('/pledges')) {
    return {
      title: 'Cost-lowering flow',
      summary: 'Explore runs first, then commit and track outcomes.',
      steps: [
        { href: '/cost-lowering', label: 'Browse active runs' },
        { href: '/pledges', label: 'Manage pledges', authRequired: true },
        { href: '/dashboard/savings', label: 'Review savings', authRequired: true },
      ],
    };
  }

  if (pathname.startsWith('/governance/model-registry')) {
    return {
      title: 'Archive descent',
      summary: 'Enter the archive, inspect state-bearing models, then descend into manuscript chambers for detail.',
      steps: [
        { href: '/governance/model-registry', label: 'Open archive registry' },
        { href: '/governance', label: 'Return to governance index' },
        { href: '/transparency', label: 'Cross-check public truth' },
      ],
    };
  }

  if (pathname.startsWith('/relief')) {
    return {
      title: 'Grounded care flow',
      summary: 'Open private intake first, then follow trust and impact routes around the care lane.',
      steps: [
        { href: '/relief', label: 'Open relief intake', authRequired: true },
        { href: '/transparency', label: 'Read public trust' },
        { href: '/impact', label: 'Follow care capacity upward' },
      ],
    };
  }

  if (pathname.startsWith('/impact')) {
    return {
      title: 'Earth to sky bridge',
      summary: 'Read grounded contribution and participation first, then follow the outcomes that rise into the wider commons.',
      steps: [
        { href: '/actions', label: 'Open actions' },
        { href: '/relief', label: 'Inspect care routes' },
        { href: '/community', label: 'Return to community traces' },
      ],
    };
  }

  if (pathname.startsWith('/events') || pathname.startsWith('/actions')) {
    return {
      title: 'Field operations',
      summary: 'Explore campaigns and events, then shift to execution.',
      steps: [
        { href: '/actions', label: 'Open action board' },
        { href: '/events', label: 'Check event network' },
        { href: '/organizer', label: 'Open organizer cockpit', authRequired: true },
      ],
    };
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/governance') || pathname.startsWith('/profile')) {
    return {
      title: 'Steward systems',
      summary: 'Review institutional surfaces, then branch into operational or private work.',
      steps: [
        { href: '/profile', label: 'Open profile' },
        { href: '/organizer', label: 'Open organizer cockpit', authRequired: true },
        { href: '/sandbox/ui-lab', label: 'Review UI lab', authRequired: true },
      ],
    };
  }

  const realmSurface = getRealmSurface(pathname);

  if (realmSurface.realm === 'earth') {
    return {
      title: 'Grounded action flow',
      summary: 'Move through field conditions first, then open the operational detail that rises out of the terrain.',
      steps: [
        { href: '/actions', label: 'Open actions' },
        { href: '/events', label: 'Open events' },
        { href: '/impact', label: 'Follow outcomes upward' },
      ],
    };
  }

  if (realmSurface.realm === 'labyrinth') {
    return {
      title: 'Archive descent',
      summary: 'Move through governance and truth surfaces as archive passages before opening deeper records.',
      steps: [
        { href: '/governance', label: 'Open governance index' },
        { href: '/governance/model-registry', label: 'Inspect models' },
        { href: '/transparency', label: 'Read public truth' },
      ],
    };
  }

  if (realmSurface.realm === 'celestial') {
    return {
      title: 'Celestial traversal',
      summary: 'Enter the starfield, orient by signal type, then open the chamber or bubble that fits the content.',
      steps: [
        { href: '/community', label: 'Open community field' },
        { href: '/constellations', label: 'Inspect constellations' },
        { href: '/impact', label: 'Trace outcomes' },
      ],
    };
  }

  return {
    title: 'Explore first',
    summary: 'Discover pathways and follow the next strongest route.',
    steps: [
      { href: '/community', label: 'Open community' },
      { href: '/education', label: 'Open education' },
      { href: '/cost-lowering', label: 'Open cost-lowering' },
    ],
  };
}
