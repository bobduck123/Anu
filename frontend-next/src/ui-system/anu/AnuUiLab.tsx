import Link from 'next/link';
import { ArrowUpRight, Beaker, Compass, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import {
  ANU_PATTERN_EXPERIMENTS,
  ANU_PROMOTION_RULES,
  ANU_TOKEN_STAGING_GROUPS,
  formatPatternStatus,
  type AnuPatternExperiment,
} from './patternBank';

function ExperimentPreview({ experiment }: { experiment: AnuPatternExperiment }) {
  if (experiment.preview === 'shell') {
    return (
      <div className="anu-lab-preview">
        <div className="flex items-center justify-between rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7b06a]/45 bg-[#162847] text-[#f4d39e]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#e9d6b2]/75">Institution beacon</p>
              <p className="text-sm text-white">Cultural commons shell</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="anu-lab-chip">Pathway</span>
            <span className="anu-lab-chip">Private doorway</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[0.86fr_1.14fr]">
          <div className="rounded-[1.15rem] border border-white/10 bg-[#0b1323]/78 p-4">
            <div className="space-y-2">
              <div className="h-2 w-20 rounded-full bg-[#e0bf84]/65" />
              <div className="h-10 rounded-2xl bg-[linear-gradient(125deg,rgba(255,255,255,0.15),rgba(255,255,255,0.05))]" />
              <div className="h-10 rounded-2xl bg-[linear-gradient(125deg,rgba(107,141,184,0.26),rgba(26,47,77,0.62))]" />
              <div className="h-10 rounded-2xl bg-[linear-gradient(125deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-[#d7b06a]/24 bg-[linear-gradient(150deg,rgba(13,27,51,0.95),rgba(12,24,42,0.84))] p-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#f1d3a1]/82">Shell signature candidate</p>
            <h3 className="mt-3 text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Entry should feel like a beacon, not a dashboard.
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="anu-lab-chip">Route identity</span>
              <span className="anu-lab-chip">Authored edges</span>
              <span className="anu-lab-chip">Ceremonial hierarchy</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (experiment.preview === 'controls') {
    return (
      <div className="anu-lab-preview">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.15rem] border border-white/10 bg-[#0b1323]/78 p-4">
            <div className="flex flex-wrap gap-3">
              <button className="anu-lab-button anu-lab-button-primary" type="button">
                Advance route
              </button>
              <button className="anu-lab-button anu-lab-button-secondary" type="button">
                Open chamber
              </button>
              <span className="anu-lab-chip">Signal filter</span>
              <span className="anu-lab-chip">Trusted state</span>
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-[#d7b06a]/22 bg-[linear-gradient(145deg,rgba(20,28,46,0.9),rgba(10,18,31,0.82))] p-4">
            <div className="space-y-2">
              <div className="h-2 w-16 rounded-full bg-[#e0bf84]/65" />
              <div className="h-11 rounded-[1rem] border border-white/10 bg-white/[0.06]" />
              <div className="h-11 rounded-[1rem] border border-white/10 bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (experiment.preview === 'community') {
    return (
      <div className="anu-lab-preview">
        <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
          <div className="grid min-h-[16rem] grid-cols-[1.2fr_0.8fr] gap-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-[linear-gradient(150deg,rgba(30,56,98,0.78),rgba(13,23,42,0.92))] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#f1d3a1]/82">Featured commons signal</p>
              <div className="mt-4 h-24 rounded-[1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.06))]" />
            </div>
            <div className="grid gap-3">
              <div className="rounded-[1rem] border border-white/10 bg-[#101a2d]/82" />
              <div className="rounded-[1rem] border border-white/10 bg-[#16223c]/82" />
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-[#d7b06a]/22 bg-[#0d1729]/84 p-4">
            <div className="space-y-2">
              <div className="h-10 rounded-[0.9rem] border border-white/10 bg-white/[0.06]" />
              <div className="h-10 rounded-[0.9rem] border border-white/10 bg-white/[0.06]" />
              <div className="h-10 rounded-[0.9rem] border border-white/10 bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="anu-lab-preview">
      <div className="grid gap-3 md:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(150deg,rgba(15,22,38,0.92),rgba(11,18,30,0.84))] p-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#f1d3a1]/82">Private chamber stack</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1rem] border border-[#8f76dd]/28 bg-[#141f33]/86 p-3">
              <div className="h-2 w-24 rounded-full bg-[#8f76dd]/55" />
              <div className="mt-3 h-8 rounded-[0.85rem] bg-white/[0.05]" />
            </div>
            <div className="rounded-[1rem] border border-[#d7b06a]/24 bg-[#111a2c]/86 p-3">
              <div className="h-2 w-20 rounded-full bg-[#d7b06a]/55" />
              <div className="mt-3 h-8 rounded-[0.85rem] bg-white/[0.05]" />
            </div>
          </div>
        </div>
        <div className="rounded-[1.15rem] border border-white/10 bg-[#0b1323]/78 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.05] p-3">
              <div className="h-2 w-14 rounded-full bg-[#e0bf84]/55" />
              <div className="mt-3 h-10 rounded-[0.85rem] bg-white/[0.05]" />
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.05] p-3">
              <div className="h-2 w-16 rounded-full bg-[#7ba1ff]/55" />
              <div className="mt-3 h-10 rounded-[0.85rem] bg-white/[0.05]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnuUiLab() {
  const candidateCount = ANU_PATTERN_EXPERIMENTS.filter((experiment) => experiment.track === 'adapted production candidate').length;
  const highRiskCount = ANU_PATTERN_EXPERIMENTS.filter((experiment) => experiment.track === 'high-risk concept').length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <section className="anu-lab-shell rounded-[2rem] px-6 py-8 md:px-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="anu-lab-kicker">Phase 0 internal route</p>
            <h1 className="mt-3 text-4xl leading-[1.02] text-white md:text-[3.3rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              ANU UI lab and pattern-bank foundation
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-200/88 md:text-lg">
              This surface holds adapted experiments before they reach production. It is for ANU-specific restructuring,
              not raw example dumping. Every pattern here must prove its source, its target surface, and why it belongs in
              the product.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="anu-lab-chip">Shell first</span>
              <span className="anu-lab-chip">Pattern bank before rollout</span>
              <span className="anu-lab-chip">No raw clones</span>
              <span className="anu-lab-chip">Universe held separate</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="anu-lab-panel px-4 py-4">
              <div className="flex items-center gap-2 text-[#f1d3a1]">
                <Beaker className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.22em]">Experiments</span>
              </div>
              <p className="mt-4 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
                {ANU_PATTERN_EXPERIMENTS.length}
              </p>
              <p className="mt-2 text-sm text-slate-300/82">Adapted ANU concepts with explicit provenance.</p>
            </div>
            <div className="anu-lab-panel px-4 py-4">
              <div className="flex items-center gap-2 text-[#f1d3a1]">
                <Layers3 className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.22em]">Candidates</span>
              </div>
              <p className="mt-4 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
                {candidateCount}
              </p>
              <p className="mt-2 text-sm text-slate-300/82">Production-track experiments tied to shell and community surfaces.</p>
            </div>
            <div className="anu-lab-panel px-4 py-4">
              <div className="flex items-center gap-2 text-[#f1d3a1]">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.22em]">High risk</span>
              </div>
              <p className="mt-4 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
                {highRiskCount}
              </p>
              <p className="mt-2 text-sm text-slate-300/82">Subsystem ideas that need stronger proof before shipping.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="anu-lab-panel space-y-4 p-5 md:p-6">
          <div className="flex items-center gap-2 text-[#f1d3a1]">
            <Compass className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.22em]">Promotion rules</p>
          </div>
          <h2 className="text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
            What a pattern must prove before it ships
          </h2>
          <ul className="space-y-3 text-sm leading-6 text-slate-200/86">
            {ANU_PROMOTION_RULES.map((rule) => (
              <li key={rule} className="rounded-[1rem] border border-white/10 bg-white/[0.045] px-4 py-3">
                {rule}
              </li>
            ))}
          </ul>
        </article>

        <article className="anu-lab-panel space-y-4 p-5 md:p-6">
          <div className="flex items-center gap-2 text-[#f1d3a1]">
            <Sparkles className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.22em]">Token staging</p>
          </div>
          <h2 className="text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Shared ANU tokens now staged in code
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {ANU_TOKEN_STAGING_GROUPS.map((group) => (
              <div key={group.title} className="rounded-[1rem] border border-white/10 bg-white/[0.045] px-4 py-4">
                <p className="text-sm font-semibold text-white">{group.title}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#e9d6b2]/72">{group.tokenPrefix}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300/84">{group.intent}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="anu-lab-kicker">Pattern-bank manifest</p>
            <h2 className="mt-2 text-3xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Adapted experiments with explicit provenance
            </h2>
          </div>
          <Link
            href="/sandbox/maps"
            className="anu-lab-button anu-lab-button-secondary hidden min-h-11 items-center gap-2 md:inline-flex"
          >
            Maps sandbox
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-5">
          {ANU_PATTERN_EXPERIMENTS.map((experiment) => (
            <article key={experiment.id} className="anu-lab-panel space-y-5 p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="anu-lab-kicker">{experiment.surface}</p>
                  <h3 className="mt-2 text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
                    {experiment.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-200/86">{experiment.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="anu-lab-chip">{experiment.track}</span>
                  <span className="anu-lab-chip">{formatPatternStatus(experiment.status)}</span>
                  <span className="anu-lab-chip">{experiment.targetSurface}</span>
                </div>
              </div>

              <ExperimentPreview experiment={experiment} />

              <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#f1d3a1]/82">Extracted qualities</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200/86">
                    {experiment.extractedQualities.map((quality) => (
                      <li key={quality}>• {quality}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.045] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#f1d3a1]/82">Discarded qualities</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300/82">
                    {experiment.discardedQualities.map((quality) => (
                      <li key={quality}>• {quality}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-[1.15rem] border border-white/10 bg-[#0a1322]/78 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f1d3a1]/82">Source manifest</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {experiment.sources.map((source) => (
                    <div key={`${experiment.id}-${source.path}`} className="rounded-[1rem] border border-white/10 bg-white/[0.045] px-4 py-3">
                      <p className="text-sm font-semibold text-white">{source.label}</p>
                      <p className="mt-2 break-all text-xs text-slate-300/72">{source.path}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-200/82">{source.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
