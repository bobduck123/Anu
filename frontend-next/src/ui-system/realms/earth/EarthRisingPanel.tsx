import type { ReactNode } from 'react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface EarthRisingPanelProps {
  eyebrow: string;
  title: string;
  summary: ReactNode;
  badges?: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function EarthRisingPanel({
  eyebrow,
  title,
  summary,
  badges,
  primary,
  secondary,
  footer,
  className,
}: EarthRisingPanelProps) {
  return (
    <article className={joinClasses('anu-earth-rising-panel', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#dfc28f]/78">{eyebrow}</p>
          <h2 className="mt-3 text-3xl text-white md:text-[2.55rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {title}
          </h2>
          <div className="mt-4 max-w-3xl text-sm leading-7 text-slate-200/82">{summary}</div>
        </div>
        {badges ? <div className="flex shrink-0 flex-wrap gap-2">{badges}</div> : null}
      </div>

      {(primary || secondary) ? (
        <div className={joinClasses('mt-6 grid gap-4', secondary ? 'xl:grid-cols-[1.08fr_0.92fr]' : undefined)}>
          {primary ? <div className="min-w-0">{primary}</div> : null}
          {secondary ? <div className="min-w-0">{secondary}</div> : null}
        </div>
      ) : null}

      {footer ? <div className="mt-6 border-t border-white/10 pt-5">{footer}</div> : null}
    </article>
  );
}
