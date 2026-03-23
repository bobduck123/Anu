import type { ReactNode } from 'react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface LabyrinthArchiveShellProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  controls?: ReactNode;
  legend?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LabyrinthArchiveShell({
  eyebrow,
  title,
  description,
  controls,
  legend,
  stats,
  children,
  className,
}: LabyrinthArchiveShellProps) {
  return (
    <section className={joinClasses('anu-labyrinth-shell', className)}>
      <div className="relative z-10 space-y-8">
        <header className="grid gap-6 xl:grid-cols-[1.14fr_0.86fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#d8c8a5]/74">{eyebrow}</p>
            <div className="mt-4 text-4xl leading-[1.02] text-[#f7ead2] md:text-[3.3rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {title}
            </div>
            <div className="mt-5 max-w-3xl text-base leading-relaxed text-[#dbcfbb]/84">{description}</div>
            {controls ? <div className="mt-6">{controls}</div> : null}
          </div>

          <div className="space-y-4">
            {legend ? <div className="anu-labyrinth-sidecar">{legend}</div> : null}
            {stats ? <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">{stats}</div> : null}
          </div>
        </header>

        <div className="relative z-10">{children}</div>
      </div>
    </section>
  );
}
