import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { AnuChip, AnuSectionHeading, AnuSurfacePanel } from './surfacePrimitives';

interface CoordinationRouteLink {
  href: string;
  label: string;
  detail: string;
  icon?: LucideIcon;
  tone?: 'signal' | 'muted' | 'accent';
}

interface RouteBridgePanelProps {
  eyebrow: string;
  title: string;
  description: string;
  links: CoordinationRouteLink[];
  className?: string;
}

export function AnuRouteBridgePanel({
  eyebrow,
  title,
  description,
  links,
  className,
}: RouteBridgePanelProps) {
  return (
    <AnuSurfacePanel tone="soft" className={className}>
      <AnuSectionHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-4 py-4 transition-colors hover:border-[color:rgba(246,212,203,0.18)] hover:bg-[color:rgba(246,212,203,0.05)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{link.label}</p>
                    {Icon ? <AnuChip tone={link.tone ?? 'muted'} icon={Icon}>Linked route</AnuChip> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{link.detail}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">{link.href}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#f6d4cb]" />
              </div>
            </Link>
          );
        })}
      </div>
    </AnuSurfacePanel>
  );
}

interface ProcessStep {
  title: string;
  detail: string;
}

interface ProcessPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  steps: ProcessStep[];
  className?: string;
}

export function AnuProcessPanel({
  eyebrow,
  title,
  description,
  steps,
  className,
}: ProcessPanelProps) {
  return (
    <AnuSurfacePanel tone="quiet" className={className}>
      <AnuSectionHeading eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Step {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-foreground)]">{step.title}</p>
            <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{step.detail}</p>
          </div>
        ))}
      </div>
    </AnuSurfacePanel>
  );
}
