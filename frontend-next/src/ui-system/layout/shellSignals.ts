import { Compass, FlaskConical, GraduationCap, LayoutGrid, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { INTERNAL_ROUTE_CANON, resolveCanonicalRoute } from '@/ui-system/anu/routePurposeRegistry';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

export interface ShellSignal {
  eyebrow: string;
  label: string;
  note: string;
  icon: LucideIcon;
}

export function getShellSignal(pathname: string | null): ShellSignal {
  const canonicalPath = resolveCanonicalRoute(pathname);
  const realmSurface = getRealmSurface(canonicalPath);

  if (!canonicalPath) {
    return {
      eyebrow: 'Commons route',
      label: 'Cultural commons',
      note: 'Move between public pathways, trust, and coordinated action.',
      icon: Sparkles,
    };
  }

  if (canonicalPath.startsWith('/community')) {
    return {
      eyebrow: 'Commons route',
      label: 'Community mesh',
      note: 'Enter through a carved celestial chart, then read community traces in the starfield or the 2D backup.',
      icon: Users,
    };
  }

  if (canonicalPath.startsWith('/constellations')) {
    return {
      eyebrow: 'Sky route',
      label: 'Constellation field',
      note: 'Clusters, signals, and shared structures arranged for celestial browsing.',
      icon: Compass,
    };
  }

  if (canonicalPath.startsWith('/education')) {
    return {
      eyebrow: 'Learning route',
      label: 'Learning pathways',
      note: 'Maps, curriculum, and literacy paths that can move into action.',
      icon: GraduationCap,
    };
  }

  if (canonicalPath.startsWith('/governance/model-registry')) {
    return {
      eyebrow: 'Registry route',
      label: 'Model archive',
      note: 'Canonical models, states, and simulation forms surfaced through the institutional archive.',
      icon: LayoutGrid,
    };
  }

  if (canonicalPath.startsWith('/sandbox') || canonicalPath.startsWith(INTERNAL_ROUTE_CANON.lab)) {
    return {
      eyebrow: 'Internal route',
      label: 'Sandbox and lab',
      note: 'Pattern validation, route experiments, and implementation review.',
      icon: FlaskConical,
    };
  }

  if (canonicalPath.startsWith('/universe')) {
    return {
      eyebrow: 'Universe route',
      label: 'Shared universe',
      note: 'Constellation-scale exploration remains its own track.',
      icon: Compass,
    };
  }

  if (canonicalPath.startsWith('/transparency') || canonicalPath.startsWith('/docs') || canonicalPath.startsWith('/contact')) {
    return {
      eyebrow: 'Trust route',
      label: 'Trust surfaces',
      note: 'Legibility, contact, and public trust-facing documentation.',
      icon: ShieldCheck,
    };
  }

  if (canonicalPath.startsWith('/auth')) {
    return {
      eyebrow: 'Threshold route',
      label: 'Entry doorway',
      note: 'Move from witness reading into participant access without hiding the threshold language.',
      icon: ShieldCheck,
    };
  }

  if (canonicalPath.startsWith('/impact')) {
    return {
      eyebrow: 'Bridge route',
      label: 'Impact bridge',
      note: 'Grounded contribution, participation, and care should rise into visible public consequence here.',
      icon: Sparkles,
    };
  }

  if (canonicalPath.startsWith('/relief')) {
    return {
      eyebrow: 'Care route',
      label: 'Grounded care',
      note: 'Private intake and queue state remain protected while the wider commons loop stays inspectable.',
      icon: ShieldCheck,
    };
  }

  if (
    canonicalPath.startsWith('/actions')
    || canonicalPath.startsWith('/events')
    || canonicalPath.startsWith('/cost-lowering')
    || canonicalPath.startsWith('/runs')
    || canonicalPath.startsWith('/pledges')
    || canonicalPath.startsWith('/organizer')
  ) {
    return {
      eyebrow: 'Field route',
      label: 'Field operations',
      note: 'Runs, events, and operational work where action becomes accountable.',
      icon: Target,
    };
  }

  if (canonicalPath.startsWith('/memberships')) {
    return {
      eyebrow: 'Contribution route',
      label: 'Contribution covenant',
      note: 'Recurring support and contributor thresholds that sustain the commons.',
      icon: Sparkles,
    };
  }

  if (canonicalPath.startsWith('/profile')) {
    return {
      eyebrow: 'Member route',
      label: 'Profile cockpit',
      note: 'Private threshold, tasks, organizer status, and commons position.',
      icon: ShieldCheck,
    };
  }

  if (canonicalPath.startsWith('/admin') || canonicalPath.startsWith('/governance')) {
    return {
      eyebrow: 'Steward route',
      label: 'Steward systems',
      note: 'Private stewardship, governance, and institutional tooling.',
      icon: ShieldCheck,
    };
  }

  if (canonicalPath.startsWith('/manara')) {
    return {
      eyebrow: 'Signal route',
      label: 'Signal field',
      note: 'Shared situational awareness across community, trust, and impact.',
      icon: Sparkles,
    };
  }

  if (realmSurface.realm === 'earth') {
    return {
      eyebrow: 'Field route',
      label: 'Grounded pathways',
      note: 'Action, scheduling, and consequence stay close to the ground before they move upward.',
      icon: Target,
    };
  }

  if (realmSurface.realm === 'labyrinth') {
    return {
      eyebrow: 'Archive route',
      label: 'Institutional archive',
      note: 'Governance and trust surfaces should read like an archive before they resolve into chambers and records.',
      icon: ShieldCheck,
    };
  }

  if (realmSurface.realm === 'celestial') {
    return {
      eyebrow: 'Sky route',
      label: 'Celestial commons',
      note: 'Signals and constellations should be felt as spatially arranged traces rather than flat pages alone.',
      icon: Compass,
    };
  }

  return {
    eyebrow: 'Commons route',
    label: 'Cultural commons',
    note: 'Move between public pathways, trust, and coordinated action.',
    icon: Sparkles,
  };
}
