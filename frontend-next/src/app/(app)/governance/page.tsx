import Link from 'next/link';
import { ArrowRight, Compass, FileSearch, Orbit, ShieldCheck, Waypoints } from 'lucide-react';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { LabyrinthArchiveShell } from '@/ui-system/realms/labyrinth/LabyrinthArchiveShell';
import { EmbeddedInstrumentPanel } from '@/ui-system/realms/labyrinth/EmbeddedInstrumentPanel';

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
    <div className="min-h-screen px-4 pb-20 pt-20 md:px-8">
      <div className="mx-auto max-w-[110rem]">
        <LabyrinthArchiveShell
          eyebrow="Governance observatory"
          title="Read models, pressure, and institutional shape."
          description="Governance now reads as a dark archive before it resolves into manuscript chambers. Collections are grouped by institutional function so the route feels like descending into civic memory, not browsing a dashboard."
          legend={
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#d2bf99]/72">Archive reading</p>
              <p className="text-sm leading-6 text-[#d8ccb6]/76">
                Move from modes and reviews into formal registries, then into federation and coordination surfaces. The archive should teach route meaning before you open any one instrument.
              </p>
            </div>
          }
          stats={
            <>
              <EmbeddedInstrumentPanel
                label="Collections"
                value="3 observatory families"
                detail="Modes and reviews, formal registries, and coordination surfaces."
              />
              <EmbeddedInstrumentPanel
                label="Posture"
                value="Calm + specific"
                detail="Governance should behave like institutional reasoning, not public spectacle."
              />
              <EmbeddedInstrumentPanel
                label="Linked routes"
                value="Truth -> doctrine"
                detail="Transparency explains public state; governance opens the deeper instruments."
              />
            </>
          }
          controls={
            <div className="anu-labyrinth-console">
              <div className="flex flex-wrap gap-2">
                <AnuActionLink href="/transparency" tone="secondary" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                  Back to public truth
                </AnuActionLink>
                <AnuActionLink href="/docs" tone="ghost" iconLeft={FileSearch} iconRight={ArrowRight}>
                  Open library doctrine
                </AnuActionLink>
              </div>
              <p className="text-xs leading-6 text-[#cdbd9f]/72">
                Governance is the first manuscript family after the model archive. It should stay navigable, but the archive atmosphere should remain intact.
              </p>
            </div>
          }
        >
          <div className="anu-labyrinth-route-grid anu-labyrinth-route-grid-3">
            {governanceCollections.map((collection) => (
              <section key={collection.title} className="anu-labyrinth-manuscript-card">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7d613b]">{collection.eyebrow}</p>
                <h2
                  className="mt-3 text-3xl text-[#2f1f12]"
                  style={{ fontFamily: 'var(--anu-type-display)' }}
                >
                  {collection.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#4f3d28]">{collection.description}</p>

                <div className="mt-5 space-y-3">
                  {collection.links.map((link) => (
                    <Link key={link.href} href={link.href} className="anu-labyrinth-portal-link">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#25170d]">{link.label}</p>
                          <p className="mt-2 text-sm leading-6 text-[#5f4930]">{link.detail}</p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#7e6848]">{link.href}</p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#7a5419]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 anu-labyrinth-route-grid anu-labyrinth-route-grid-3">
            <div className="anu-labyrinth-archive-note">
              <div className="flex items-center gap-2 text-[#f6e6c3]">
                <Compass className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em]">Modes and reviews</span>
              </div>
              <p className="mt-3 text-sm leading-7">
                Systemic mode, simulations, and collisions belong at the archive entrance because they tell you what kind of institutional weather you are stepping into.
              </p>
            </div>

            <div className="anu-labyrinth-archive-note">
              <div className="flex items-center gap-2 text-[#f6e6c3]">
                <Orbit className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em]">Formal instruments</span>
              </div>
              <p className="mt-3 text-sm leading-7">
                Registries, formulas, and competencies should feel like named carved instruments, not loose analytics pages.
              </p>
            </div>

            <div className="anu-labyrinth-archive-note">
              <div className="flex items-center gap-2 text-[#f6e6c3]">
                <Waypoints className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em]">Coordination surfaces</span>
              </div>
              <p className="mt-3 text-sm leading-7">
                Federation, sovereignty, capital, and needs are the passages where institutional reasoning turns outward into cross-node coordination.
              </p>
            </div>
          </div>
        </LabyrinthArchiveShell>
      </div>
    </div>
  );
}
