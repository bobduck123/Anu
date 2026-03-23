import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, FileSearch } from 'lucide-react';
import {
  AnuActionLink,
  AnuChip,
  type AnuActionTone,
  type AnuChipTone,
  type AnuPanelTone,
  AnuSectionHeading,
  AnuSurfacePanel,
} from './surfacePrimitives';

interface AnuNarrativeSignal {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  tone?: AnuChipTone;
  icon?: LucideIcon;
}

interface AnuNarrativeAction {
  href: string;
  label: string;
  tone?: AnuActionTone;
  icon?: LucideIcon;
}

interface AnuNarrativeBriefPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  signals: AnuNarrativeSignal[];
  whyItMatters: ReactNode;
  actions?: AnuNarrativeAction[];
  tone?: AnuPanelTone;
  compact?: boolean;
  className?: string;
}

export function AnuNarrativeBriefPanel({
  eyebrow,
  title,
  description,
  signals,
  whyItMatters,
  actions = [],
  tone = 'soft',
  compact = false,
  className,
}: AnuNarrativeBriefPanelProps) {
  return (
    <AnuSurfacePanel tone={tone} className={className}>
      <AnuSectionHeading eyebrow={eyebrow} title={title} description={description} />

      <div className={`mt-5 grid gap-3 ${compact ? 'lg:grid-cols-3' : 'md:grid-cols-3'}`}>
        {signals.map((signal) => (
          <div
            key={signal.label}
            className={`rounded-2xl border border-white/10 bg-white/[0.03] ${
              compact ? 'px-4 py-4' : 'px-4 py-4'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <AnuChip tone={signal.tone ?? 'muted'} icon={signal.icon}>
                {signal.label}
              </AnuChip>
            </div>
            <div className={compact ? 'mt-3 text-base font-semibold text-white' : 'mt-3 text-lg font-semibold text-white'}>
              {signal.value}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-300/82">{signal.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <AnuChip tone="signal" icon={FileSearch}>
            Why this matters
          </AnuChip>
        </div>
        <div className="mt-3 text-sm leading-6 text-slate-200/84">{whyItMatters}</div>
        {actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((action) => (
              <AnuActionLink
                key={`${action.href}::${action.label}`}
                href={action.href}
                tone={action.tone ?? 'ghost'}
                iconLeft={action.icon}
                iconRight={ArrowRight}
              >
                {action.label}
              </AnuActionLink>
            ))}
          </div>
        ) : null}
      </div>
    </AnuSurfacePanel>
  );
}
