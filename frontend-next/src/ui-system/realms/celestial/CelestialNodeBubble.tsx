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
        'rounded-[1.75rem] border border-[color:rgba(246,212,203,0.1)] bg-[linear-gradient(180deg,rgba(30,2,39,0.86),rgba(30,2,39,0.94))] p-5 text-[var(--color-foreground)] shadow-[0_28px_90px_-38px_rgba(30,2,39,0.95)] backdrop-blur-2xl',
        variant === 'chamber' ? 'max-w-2xl' : 'max-w-lg',
        className,
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#f6d4cb]/76">{eyebrow}</p>
      <h2 className="mt-3 text-2xl leading-[1.02] text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
        {title}
      </h2>
      <div className="mt-4 text-sm leading-7 text-[color:rgba(246,212,203,0.84)]">{summary}</div>

      {tags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.76)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {detail ? <div className="mt-5 text-sm leading-7 text-[color:rgba(246,212,203,0.82)]">{detail}</div> : null}
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </article>
  );
}
