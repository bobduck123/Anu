import Link from 'next/link';
import { ArrowUpRight, BookOpen, Compass, Eye } from 'lucide-react';
import { AnuChip, AnuSectionHeading, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';

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
    <AnuSurfacePanel tone="soft" className="relative overflow-hidden p-5 md:p-7">
      <span className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-[#f0c98a]/22 blur-3xl" />

      <div className="relative z-10">
        <AnuSectionHeading
          eyebrow="Orientation ritual"
          title="Start here before entering steward mode"
          description="Follow this cultural flow to orient quickly, verify trust signals, and keep moving even while live APIs recover."
          action={<AnuChip tone="accent">Three-step path</AnuChip>}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <Link key={step.title} href={step.href} className="group block">
                <AnuSurfacePanel
                  tone="quiet"
                  className="flex h-full flex-col gap-4 p-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <AnuChip tone="accent">{`Step ${index + 1}`}</AnuChip>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--anu-border-signal)] bg-[#122744] text-[#dce8ff]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>

                  <div>
                    <p className="text-base font-semibold text-white">{step.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300/84">{step.description}</p>
                  </div>

                  <div className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[#f1d3a1]">
                    Open step
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </AnuSurfacePanel>
              </Link>
            );
          })}
        </div>
      </div>
    </AnuSurfacePanel>
  );
}
