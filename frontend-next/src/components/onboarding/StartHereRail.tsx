import Link from 'next/link';
import { ArrowRight, Compass, Eye, BookOpen } from 'lucide-react';

const STEPS = [
  {
    title: '1. Explore the Manara feed',
    description: 'Start with public signals, creator channels, and read-only fallback views.',
    href: '/manara',
    icon: Compass,
  },
  {
    title: '2. Check trust surfaces',
    description: 'Review transparency snapshots, docs, and governance context before signing in.',
    href: '/transparency',
    icon: Eye,
  },
  {
    title: '3. Continue with guided docs',
    description: 'Use the docs hub to pick your next action when live services are degraded.',
    href: '/docs',
    icon: BookOpen,
  },
] as const;

export function StartHereRail() {
  return (
    <section className="card-civic">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)]">Start here</p>
        <h2 className="mt-2 text-2xl text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
          New visitor onboarding rail
        </h2>
        <p className="mt-2 text-sm text-[var(--color-earth-medium)]">
          Follow this sequence to orient quickly, verify trust signals, and continue safely when APIs are unstable.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              className="rounded-xl border border-[var(--color-border)] bg-white/80 p-4 transition hover:border-[var(--color-institutional)] hover:bg-[var(--color-institutional-light)]"
            >
              <div className="flex items-start justify-between gap-2">
                <Icon className="h-4 w-4 text-[var(--color-institutional)]" />
                <ArrowRight className="h-4 w-4 text-[var(--color-earth-medium)]" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--color-earth-dark)]">{step.title}</p>
              <p className="mt-2 text-xs text-[var(--color-earth-medium)] leading-5">{step.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
