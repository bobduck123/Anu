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

  if (
    pathname.startsWith('/actions')
    || pathname.startsWith('/events')
    || pathname.startsWith('/cost-lowering')
    || pathname.startsWith('/runs')
    || pathname.startsWith('/pledges')
    || pathname.startsWith('/dashboard/savings')
    || pathname.startsWith('/organizer')
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
      summary: 'Observe live traces, then contribute when ready.',
      steps: [
        { href: '/community', label: 'Explore the feed' },
        { href: '/community?compose=1', label: 'Post a signal', authRequired: true },
        { href: '/education', label: 'Branch into learning' },
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
