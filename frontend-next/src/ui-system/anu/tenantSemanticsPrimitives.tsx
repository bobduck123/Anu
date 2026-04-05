import { Compass, ShieldCheck } from 'lucide-react';
import type { ThresholdDefinition, ThresholdKey } from '@/lib/tenantSemantics';
import { AnuChip, AnuSectionHeading, AnuSurfacePanel } from './surfacePrimitives';

interface AnuThresholdPathPanelProps {
  eyebrow: string;
  title: string;
  description: string;
  thresholds: ThresholdDefinition[];
  currentKey: ThresholdKey;
  nextKey?: ThresholdKey | null;
  className?: string;
}

export function AnuThresholdPathPanel({
  eyebrow,
  title,
  description,
  thresholds,
  currentKey,
  nextKey = null,
  className,
}: AnuThresholdPathPanelProps) {
  return (
    <AnuSurfacePanel tone="soft" className={className}>
      <AnuSectionHeading eyebrow={eyebrow} title={title} description={description} />

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {thresholds.map((threshold) => {
          const isCurrent = threshold.key === currentKey;
          const isNext = threshold.key === nextKey;

          return (
            <div
              key={threshold.key}
              className={`rounded-2xl border px-4 py-4 ${
                isCurrent
                  ? 'border-[rgba(246,212,203,0.34)] bg-[rgba(246,212,203,0.1)]'
                  : isNext
                    ? 'border-[rgba(224,177,21,0.26)] bg-[rgba(224,177,21,0.08)]'
                    : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <AnuChip tone={isCurrent ? 'signal' : isNext ? 'accent' : 'muted'} icon={isCurrent ? ShieldCheck : Compass}>
                  {threshold.label}
                </AnuChip>
                {isCurrent ? <AnuChip tone="signal">Current</AnuChip> : null}
                {isNext ? <AnuChip tone="accent">Next</AnuChip> : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.92)]">{threshold.summary}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">{threshold.routeFocus}</p>
            </div>
          );
        })}
      </div>
    </AnuSurfacePanel>
  );
}
