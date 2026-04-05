import type { ReactNode } from 'react';

interface ImpactAscentThreadProps {
  title: string;
  groundedValue: string;
  groundedDetail: ReactNode;
  ascentDetail: ReactNode;
  celestialInfluence: ReactNode;
  provenance: ReactNode;
}

export function ImpactAscentThread({
  title,
  groundedValue,
  groundedDetail,
  ascentDetail,
  celestialInfluence,
  provenance,
}: ImpactAscentThreadProps) {
  return (
    <div className="rounded-[1.8rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.03)] px-5 py-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.64)]">Ascent thread</p>
      <h3 className="mt-3 text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
        {title}
      </h3>
      <p className="mt-2 text-sm font-semibold text-[#f6d4cb]">{groundedValue}</p>

      <div className="mt-5 space-y-4">
        {[
          { label: 'Ground', detail: groundedDetail },
          { label: 'Ascent', detail: ascentDetail },
          { label: 'Sky influence', detail: celestialInfluence },
          { label: 'Provenance', detail: provenance },
        ].map((step, index) => (
          <div key={step.label} className="flex gap-4">
            <div className="flex w-10 flex-col items-center">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(246,212,203,0.24)] bg-[rgba(246,212,203,0.08)] text-[11px] font-semibold text-[#f6d4cb]">
                {index + 1}
              </span>
              {index < 3 ? <span className="mt-2 block h-full w-px bg-[linear-gradient(180deg,rgba(246,212,203,0.48),rgba(246,212,203,0.04))]" /> : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">{step.label}</p>
              <div className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
