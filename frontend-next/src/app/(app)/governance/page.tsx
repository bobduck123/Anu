import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  FileSearch,
  Orbit,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import {
  AnuActionLink,
  AnuChamberCard,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

const governanceCollections = [
  {
    eyebrow: 'System state',
    title: 'Modes, simulations, and reviews',
    description:
      'Enter the routes that model institutional behavior, expose conflict, and examine how the system changes under stress.',
    links: [
      { href: '/governance/systemic', label: 'Systemic mode', detail: 'State and health across the broader operating system.' },
      { href: '/governance/simulations', label: 'Governance simulations', detail: 'Scenario surfaces for institutional stress and policy rehearsal.' },
      { href: '/governance/collisions', label: 'Conflict reviews', detail: 'Review collision points, competing pressures, and unresolved tensions.' },
    ],
  },
  {
    eyebrow: 'Registries and formulas',
    title: 'Formal institutional instruments',
    description:
      'These routes carry the models, formulas, metrics, and competencies that underpin the institution.',
    links: [
      { href: '/governance/model-registry', label: 'Model registry', detail: 'Canonical system models, references, and reusable structures.' },
      { href: '/governance/metrics-registry', label: 'Metrics registry', detail: 'Named institutional measures and their recorded semantics.' },
      { href: '/governance/formulas', label: 'Formula library', detail: 'Operational formulas and computation surfaces.' },
      { href: '/governance/competency', label: 'Competency routes', detail: 'Skills, capability, and evaluative structures.' },
    ],
  },
  {
    eyebrow: 'Federation and institutional shape',
    title: 'Coordination surfaces',
    description:
      'These routes describe how institutions, nodes, sovereignty, capital, and needs relate across the commons.',
    links: [
      { href: '/governance/federation', label: 'Federation metrics', detail: 'Cross-node coordination and network-level federation state.' },
      { href: '/governance/institutional', label: 'Institutional review', detail: 'Higher-order institutional shape and decision framing.' },
      { href: '/governance/sovereignty', label: 'Sovereignty index', detail: 'Autonomy, dependency, and exposure across the system.' },
      { href: '/governance/capital', label: 'Capital heatmap', detail: 'Movement and concentration of available institutional capital.' },
      { href: '/governance/needs', label: 'Needs surface', detail: 'Outstanding needs and pressure signals visible to governance.' },
    ],
  },
];

export default function GovernanceIndexPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow="Governance observatory"
          title="Read models, pressure, and institutional shape."
          description="Governance is the observatory for institutional reasoning. It should feel calmer and more legible than the public shell, with state, registry, and review surfaces grouped by function instead of scattered as unrelated pages."
          actions={
            <>
              <AnuActionLink href="/transparency" tone="secondary" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                Back to public truth
              </AnuActionLink>
              <AnuActionLink href="/docs" tone="ghost" iconLeft={FileSearch} iconRight={ArrowRight}>
                Open library doctrine
              </AnuActionLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Observatory rule</p>
              <p className="mt-3 text-sm leading-6 text-slate-300/84">
                Charts, metrics, registries, and review surfaces are the primary grammar here. Public-shell spectacle should recede in favor of scanability and institutional specificity.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Collections"
              value="3 observatory families"
              detail="Modes and reviews, formal registries, and coordination surfaces are grouped separately."
            />
            <AnuHeroMetric
              label="Posture"
              value="Calm + specific"
              detail="Governance should feel like institutional instrumentation rather than a decorative hub."
            />
            <AnuHeroMetric
              label="Linked route"
              value="Truth -> doctrine"
              detail="Transparency explains public state; governance explains institutional reasoning and review."
            />
          </div>
        </AnuPageHero>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <AnuInstrumentationCard
            label="Modes and reviews"
            value="3"
            detail="System state, simulations, and collision reviews define how governance watches pressure and change."
            icon={Compass}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Formal instruments"
            value="4"
            detail="Registries and formulas hold named institutional semantics instead of leaving them implicit."
            icon={Orbit}
          />
          <AnuInstrumentationCard
            label="Coordination surfaces"
            value="5"
            detail="Federation, sovereignty, capital, and needs make cross-node coordination legible."
            icon={Waypoints}
          />
        </section>

        <section className="mt-12">
          <AnuSectionHeading
            eyebrow="Observatory index"
            title="Enter by institutional function"
            description="The governance index should reduce visual randomness and make route purpose obvious before someone dives into a specific analytical page."
          />

          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {governanceCollections.map((collection) => (
              <AnuChamberCard
                key={collection.title}
                eyebrow={collection.eyebrow}
                title={collection.title}
                description={collection.description}
                tone="default"
              >
                <div className="space-y-3">
                  {collection.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-white/18 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{link.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300/82">{link.detail}</p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">{link.href}</p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#f3cd92]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </AnuChamberCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
