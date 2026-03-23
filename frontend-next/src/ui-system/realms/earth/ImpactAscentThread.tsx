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
    <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] px-5 py-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Ascent thread</p>
      <h3 className="mt-3 text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
        {title}
      </h3>
      <p className="mt-2 text-sm font-semibold text-[#f2d8a7]">{groundedValue}</p>

      <div className="mt-5 space-y-4">
        {[
          { label: 'Ground', detail: groundedDetail },
          { label: 'Ascent', detail: ascentDetail },
          { label: 'Sky influence', detail: celestialInfluence },
          { label: 'Provenance', detail: provenance },
        ].map((step, index) => (
          <div key={step.label} className="flex gap-4">
            <div className="flex w-10 flex-col items-center">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(231,194,127,0.24)] bg-[rgba(231,194,127,0.08)] text-[11px] font-semibold text-[#f4ddb3]">
                {index + 1}
              </span>
              {index < 3 ? <span className="mt-2 block h-full w-px bg-[linear-gradient(180deg,rgba(231,194,127,0.48),rgba(231,194,127,0.04))]" /> : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{step.label}</p>
              <div className="mt-2 text-sm leading-6 text-slate-200/82">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
