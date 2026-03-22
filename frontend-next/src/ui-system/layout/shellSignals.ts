import { Compass, FlaskConical, GraduationCap, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ShellSignal {
  eyebrow: string;
  label: string;
  note: string;
  icon: LucideIcon;
}

export function getShellSignal(pathname: string | null): ShellSignal {
  if (!pathname) {
    return {
      eyebrow: 'Commons route',
      label: 'Cultural commons',
      note: 'Move between public pathways, trust, and coordinated action.',
      icon: Sparkles,
    };
  }

  if (pathname.startsWith('/community')) {
    return {
      eyebrow: 'Commons route',
      label: 'Community mesh',
      note: 'Signals, stories, and microcosms in a shared commons.',
      icon: Users,
    };
  }

  if (pathname.startsWith('/education')) {
    return {
      eyebrow: 'Learning route',
      label: 'Learning pathways',
      note: 'Maps, curriculum, and literacy paths that can move into action.',
      icon: GraduationCap,
    };
  }

  if (pathname.startsWith('/sandbox')) {
    return {
      eyebrow: 'Internal route',
      label: 'Sandbox and lab',
      note: 'Pattern validation, route experiments, and implementation review.',
      icon: FlaskConical,
    };
  }

  if (pathname.startsWith('/universe')) {
    return {
      eyebrow: 'Universe route',
      label: 'Shared universe',
      note: 'Constellation-scale exploration remains its own track.',
      icon: Compass,
    };
  }

  if (pathname.startsWith('/transparency') || pathname.startsWith('/docs') || pathname.startsWith('/contact')) {
    return {
      eyebrow: 'Trust route',
      label: 'Trust surfaces',
      note: 'Legibility, contact, and public trust-facing documentation.',
      icon: ShieldCheck,
    };
  }

  if (
    pathname.startsWith('/actions') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/cost-lowering') ||
    pathname.startsWith('/runs') ||
    pathname.startsWith('/pledges') ||
    pathname.startsWith('/organizer')
  ) {
    return {
      eyebrow: 'Field route',
      label: 'Field operations',
      note: 'Runs, events, and operational work where action becomes accountable.',
      icon: Target,
    };
  }

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/governance') ||
    pathname.startsWith('/memberships') ||
    pathname.startsWith('/profile')
  ) {
    return {
      eyebrow: 'Steward route',
      label: 'Steward systems',
      note: 'Private stewardship, governance, and institutional tooling.',
      icon: ShieldCheck,
    };
  }

  if (pathname.startsWith('/manara')) {
    return {
      eyebrow: 'Signal route',
      label: 'Signal field',
      note: 'Shared situational awareness across community, trust, and impact.',
      icon: Sparkles,
    };
  }

  return {
    eyebrow: 'Commons route',
    label: 'Cultural commons',
    note: 'Move between public pathways, trust, and coordinated action.',
    icon: Sparkles,
  };
}
