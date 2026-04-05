import { ArrowUpRight, Beaker, FlaskConical, Map, ShieldCheck } from 'lucide-react';
import { ANU_PATTERN_EXPERIMENTS } from '@/ui-system/anu/patternBank';
import { SandboxAccessBoundary } from '@/ui-system/anu/SandboxAccessBoundary';
import { AnuActionLink, AnuHeroMetric, AnuHeroMetricsRail, AnuPageHero, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';

export default function SandboxIndexPage() {
  return (
    <SandboxAccessBoundary returnTo="/sandbox">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <AnuPageHero
          eyebrow="Internal sandbox"
          title="Experimental routes for ANU pattern work"
          description="Sandbox routes hold adapted ANU experiments and live-supporting internal surfaces. They are explicitly not public production showcase pages."
          actions={
            <>
              <AnuActionLink href="/sandbox/ui-lab" tone="primary" iconLeft={FlaskConical} iconRight={ArrowUpRight}>
                Open UI lab
              </AnuActionLink>
              <AnuActionLink href="/sandbox/maps" tone="secondary" iconLeft={Map} iconRight={ArrowUpRight}>
                Open maps sandbox
              </AnuActionLink>
            </>
          }
        >
          <AnuHeroMetricsRail columns="three">
            <AnuHeroMetric
              label="Experiments"
              value={String(ANU_PATTERN_EXPERIMENTS.length)}
              detail="Manifest-backed ANU patterns, never raw reference clones."
            />
            <AnuHeroMetric
              label="Track"
              value="Internal only"
              detail="Used for review, promotion proof, and safe experimentation before public rollout."
            />
            <AnuHeroMetric
              label="Guardrail"
              value="Universe held separate"
              detail="Map and universe work remains explicitly isolated from shell rollout decisions."
            />
          </AnuHeroMetricsRail>
        </AnuPageHero>

        <section className="grid gap-5 md:grid-cols-2">
          <AnuSurfacePanel tone="soft" className="flex flex-col gap-4 p-5 md:p-6">
            <div className="flex items-center gap-2 text-[#f6d4cb]">
              <Beaker className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-[0.22em]">Phase 0 foundation</p>
            </div>
            <h2 className="text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              ANU UI lab
            </h2>
            <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
              Manifest-backed experiments, staged tokens, and promotion rules for integrating the reference corpus into
              the ANU frontend without raw cloning.
            </p>
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">{ANU_PATTERN_EXPERIMENTS.length} active experiments.</p>
            <div className="mt-auto">
              <AnuActionLink href="/sandbox/ui-lab" tone="primary" iconLeft={ShieldCheck} iconRight={ArrowUpRight}>
                Open UI lab
              </AnuActionLink>
            </div>
          </AnuSurfacePanel>

          <AnuSurfacePanel tone="quiet" className="flex flex-col gap-4 p-5 md:p-6">
            <div className="flex items-center gap-2 text-[#f6d4cb]">
              <Map className="h-4 w-4" />
              <p className="text-[11px] uppercase tracking-[0.22em]">Separate track</p>
            </div>
            <h2 className="text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Maps sandbox
            </h2>
            <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
              The Falak and universe map surfaces remain available here as a separate track. Phase 0 shell work does not
              flatten or restyle them by default.
            </p>
            <div className="mt-auto">
              <AnuActionLink href="/sandbox/maps" tone="secondary" iconLeft={Map} iconRight={ArrowUpRight}>
                Open maps sandbox
              </AnuActionLink>
            </div>
          </AnuSurfacePanel>
        </section>
      </div>
    </SandboxAccessBoundary>
  );
}
