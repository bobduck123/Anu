import type { ReactNode } from 'react';

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
      <div className="anu-earth-field-frame">
        <div className="anu-earth-field-stage">
          {field}

          {(metrics || actions) ? (
            <div className="anu-earth-shell-topline">
              {metrics ? <div className="anu-earth-shell-metrics">{metrics}</div> : <div />}
              {actions ? <div className="anu-earth-shell-actions">{actions}</div> : null}
            </div>
          ) : null}

          <div className="anu-earth-title-block">
            <p className="anu-earth-title-eyebrow">{eyebrow}</p>
            <div className="anu-earth-title">{title}</div>
            <div className="anu-earth-description">{description}</div>
          </div>

          {risingPanel ? <div className="anu-earth-rising-panel-wrap">{risingPanel}</div> : null}
          <div className="anu-earth-nav-slot">{nav}</div>
        </div>
      </div>

      {(controls || fieldAside || utility) ? (
        <div className="anu-earth-support-stack">
          {controls ? <div className="anu-earth-support-block anu-earth-support-controls">{controls}</div> : null}
          {(fieldAside || utility) ? (
            <div
              className={joinClasses(
                'anu-earth-support-grid',
                fieldAside && utility ? 'xl:grid-cols-[0.96fr_1.04fr]' : undefined,
              )}
            >
              {fieldAside ? <div className="anu-earth-support-block">{fieldAside}</div> : null}
              {utility ? <div className="anu-earth-support-block">{utility}</div> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
