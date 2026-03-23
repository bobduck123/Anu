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
  movementHint?: ReactNode;
  entered?: boolean;
  onEnter?: () => void;
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
  movementHint,
  entered = true,
  onEnter,
  children,
  className,
}: LabyrinthArchiveShellProps) {
  return (
    <section className={joinClasses('anu-labyrinth-shell', className)}>
      <div className="anu-labyrinth-shell__vault">
        <div className="anu-labyrinth-shell__crosshair" aria-hidden="true" />

        <header className="anu-labyrinth-shell__header">
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#dfceb0]/74">{eyebrow}</p>
            <div
              className="mt-4 text-4xl leading-[1.02] text-[#f7ead2] md:text-[3.3rem]"
              style={{ fontFamily: 'var(--anu-type-display)' }}
            >
              {title}
            </div>
            <div className="mt-5 max-w-3xl text-base leading-relaxed text-[#dbcfbb]/84">{description}</div>
          </div>
        </header>

        {controls ? <div className="anu-labyrinth-shell__controls">{controls}</div> : null}

        {(legend || stats) ? (
          <aside className="anu-labyrinth-shell__sidecar">
            {legend ? <div className="anu-labyrinth-sidecar">{legend}</div> : null}
            {stats ? <div className="grid gap-3">{stats}</div> : null}
          </aside>
        ) : null}

        {movementHint ? <div className="anu-labyrinth-shell__movement">{movementHint}</div> : null}

        <div className="anu-labyrinth-shell__stage">{children}</div>

        {onEnter && !entered ? (
          <div className="anu-labyrinth-shell__blocker">
            <button
              type="button"
              onClick={onEnter}
              className="anu-labyrinth-shell__entry"
            >
              <span className="anu-labyrinth-shell__entry-label">Enter archive</span>
              <span className="anu-labyrinth-shell__entry-note">
                Click to descend. Use W A S D or arrow keys to move through the vault, then press Enter to open a manuscript chamber.
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
