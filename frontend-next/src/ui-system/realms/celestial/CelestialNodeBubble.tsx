import type { ReactNode } from 'react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface CelestialNodeBubbleProps {
  eyebrow: string;
  title: string;
  summary: ReactNode;
  tags?: readonly string[];
  detail?: ReactNode;
  actions?: ReactNode;
  variant?: 'bubble' | 'chamber';
  className?: string;
}

export function CelestialNodeBubble({
  eyebrow,
  title,
  summary,
  tags = [],
  detail,
  actions,
  variant = 'bubble',
  className,
}: CelestialNodeBubbleProps) {
  return (
    <article
      className={joinClasses(
        'rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,24,0.86),rgba(5,8,16,0.94))] p-5 text-white shadow-[0_28px_90px_-38px_rgba(0,0,0,0.95)] backdrop-blur-2xl',
        variant === 'chamber' ? 'max-w-2xl' : 'max-w-lg',
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#f0d2a2]/76">{eyebrow}</p>
      <h2 className="mt-3 text-2xl leading-[1.02] text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
        {title}
      </h2>
      <div className="mt-4 text-sm leading-7 text-slate-200/84">{summary}</div>

      {tags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200/76"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {detail ? <div className="mt-5 text-sm leading-7 text-slate-300/82">{detail}</div> : null}
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </article>
  );
}
