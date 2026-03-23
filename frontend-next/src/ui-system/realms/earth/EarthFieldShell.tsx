import type { ReactNode } from 'react';
import { AnuPageHero } from '@/ui-system/anu/surfacePrimitives';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface EarthFieldShellProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  metrics?: ReactNode;
  controls?: ReactNode;
  field: ReactNode;
  fieldAside?: ReactNode;
  risingPanel?: ReactNode;
  nav: ReactNode;
  utility?: ReactNode;
  className?: string;
}

export function EarthFieldShell({
  eyebrow,
  title,
  description,
  actions,
  metrics,
  controls,
  field,
  fieldAside,
  risingPanel,
  nav,
  utility,
  className,
}: EarthFieldShellProps) {
  return (
    <section className={joinClasses('anu-earth-shell', className)}>
      <div className="relative z-10 space-y-8">
        <AnuPageHero eyebrow={eyebrow} title={title} description={description} actions={actions} aside={metrics} />
        {controls ? <div>{controls}</div> : null}

        <div className="anu-earth-field-frame">
          <div className={joinClasses('anu-earth-field-grid', fieldAside ? 'xl:grid-cols-[1.12fr_0.88fr]' : undefined)}>
            <div className="anu-earth-field-stage">{field}</div>
            {fieldAside ? <div className="anu-earth-field-sidecar">{fieldAside}</div> : null}
          </div>

          {risingPanel ? <div className="anu-earth-rising-panel-wrap">{risingPanel}</div> : null}
          <div className="anu-earth-nav-slot">{nav}</div>
        </div>

        {utility ? <div className="anu-earth-utility-stack">{utility}</div> : null}
      </div>
    </section>
  );
}
