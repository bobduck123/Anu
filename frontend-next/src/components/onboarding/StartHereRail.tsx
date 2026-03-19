import Link from 'next/link';
import { ArrowUpRight, BookOpen, Compass, Eye } from 'lucide-react';

const STEPS = [
  {
    title: 'Explore the Manara signal field',
    description: 'Begin with public signals, creator channels, and read-only fallback views.',
    href: '/manara',
    icon: Compass,
  },
  {
    title: 'Read trust and stewardship surfaces',
    description: 'Review transparency snapshots and governance context before posting or joining.',
    href: '/transparency',
    icon: Eye,
  },
  {
    title: 'Continue through guided docs',
    description: 'Use continuity docs to choose your next action whenever live services are unstable.',
    href: '/docs',
    icon: BookOpen,
  },
] as const;

export function StartHereRail() {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#d8ccb7]/65 bg-[linear-gradient(180deg,rgba(252,248,240,0.94),rgba(246,239,226,0.92))] p-5 shadow-[0_22px_50px_-38px_rgba(28,36,48,0.7)] md:p-7">
      <span className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-[#f0c98a]/22 blur-3xl" />

      <div className="relative z-10">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-earth-medium)]">Orientation ritual</p>
        <h2 className="mt-2 text-3xl text-[var(--color-earth-dark)] md:text-[2.1rem]" style={{ fontFamily: 'var(--font-serif)' }}>
          Start here before entering steward mode
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--color-earth-medium)] md:text-[15px]">
          Follow this cultural flow to orient quickly, verify trust signals, and keep moving even while live APIs recover.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <Link
                key={step.title}
                href={step.href}
                className="group relative rounded-2xl border border-[var(--color-border)] bg-white/85 p-4 shadow-[0_18px_28px_-24px_rgba(31,45,67,0.65)] transition-transform duration-300 hover:-translate-y-0.5 hover:border-[var(--color-institutional)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-institutional)]/35 bg-[var(--color-institutional-light)] text-xs font-semibold text-[var(--color-institutional)]">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-[var(--color-institutional)]" />
                </div>

                <p className="mt-3 text-sm font-semibold text-[var(--color-earth-dark)]">{step.title}</p>
                <p className="mt-2 text-xs leading-5 text-[var(--color-earth-medium)]">{step.description}</p>

                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-institutional)]">
                  Open step
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
