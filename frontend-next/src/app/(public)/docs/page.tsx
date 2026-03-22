import Link from 'next/link';
import {
  ArrowRight,
  BookOpenText,
  Compass,
  FileSearch,
  LibraryBig,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import {
  AnuActionLink,
  AnuChamberCard,
  AnuChip,
  AnuHeroMetric,
  AnuInstrumentationCard,
  AnuPageHero,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

const libraryCollections = [
  {
    eyebrow: 'Public truth',
    title: 'Trust routes',
    description:
      'Public-facing surfaces that explain the institution before someone needs to escalate, subscribe, or intervene.',
    links: [
      {
        href: '/transparency',
        label: 'Transparency ledger',
        detail: 'Inspect pool balances, relief capacity, receipts, and privacy-preserving totals.',
      },
      {
        href: '/contact',
        label: 'Routing surface',
        detail: 'Choose the right escalation path and attach the right evidence bundle.',
      },
      {
        href: '/memberships',
        label: 'Commons memberships',
        detail: 'Evaluate contribution covenants through a trust-first, non-marketing route.',
      },
    ],
  },
  {
    eyebrow: 'Operator doctrine',
    title: 'Governance and system instruments',
    description:
      'Read the operating logic, the model registry, and the review surfaces that govern how the institution moves.',
    links: [
      {
        href: '/governance',
        label: 'Governance observatory',
        detail: 'Enter the main governance index for state, registry, federation, and simulation routes.',
      },
      {
        href: '/governance/systemic',
        label: 'Systemic mode',
        detail: 'Inspect system state, thresholds, and institutional health modeling.',
      },
      {
        href: '/governance/model-registry',
        label: 'Model registry',
        detail: 'Review formalized models, references, and simulation scaffolds.',
      },
    ],
  },
  {
    eyebrow: 'Templates and engines',
    title: 'Applied libraries',
    description:
      'Reference templates, applied engines, and subsystem-specific pattern libraries that shape delivery.',
    links: [
      {
        href: '/education/templates',
        label: 'Education templates',
        detail: 'Learning presentation systems, layered pathways, and reusable curriculum frames.',
      },
      {
        href: '/cost-lowering',
        label: 'Cost-lowering engine',
        detail: 'Weekly optimization routines and resilience pathways.',
      },
      {
        href: '/flora-fauna',
        label: 'Flora & Fauna subsystem',
        detail: 'Memetics, creator channels, and pool-backed circulation with its own operational logic.',
      },
    ],
  },
];

const readingProtocol = [
  {
    title: 'Start with the public truth surface',
    detail: 'Read transparency before governance when you need to understand present state rather than internal theory.',
  },
  {
    title: 'Move from explanation to instrumentation',
    detail: 'Use docs to understand route relationships, then enter governance or admin surfaces only when action is required.',
  },
  {
    title: 'Carry route context forward',
    detail: 'When escalating, link the exact trust, governance, or subsystem surface that already contains the relevant evidence.',
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow="Operations library"
          title="Read the institution before you operate it."
          description="This library is the connective tissue between public trust, operator doctrine, and applied systems. Use it to understand how routes relate before you move into governance, memberships, education, or subsystem work."
          actions={
            <>
              <AnuActionLink href="/transparency" tone="primary" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                Open transparency
              </AnuActionLink>
              <AnuActionLink href="/governance" tone="secondary" iconLeft={Compass} iconRight={ArrowRight}>
                Enter governance observatory
              </AnuActionLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal" icon={LibraryBig}>
                  Inspectable first
                </AnuChip>
                <AnuChip tone="muted" icon={BookOpenText}>
                  Route-aware
                </AnuChip>
                <AnuChip tone="accent" icon={FileSearch}>
                  Evidence before escalation
                </AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                The library should not feel like a link dump. It explains which surfaces are public truth,
                which are operator doctrine, and which are applied subsystem entry points.
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Collections"
              value="3 route families"
              detail="Trust, governance, and applied systems are separated so operators do not confuse explanation with execution."
            />
            <AnuHeroMetric
              label="Posture"
              value="Editorial + inspectable"
              detail="This surface should read like a curated operating library rather than a product landing page."
            />
            <AnuHeroMetric
              label="Protocol"
              value="Truth before escalation"
              detail="Transparency and route context should come before internal intervention, tickets, or governance review."
            />
          </div>
        </AnuPageHero>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <AnuInstrumentationCard
            label="Public trust routes"
            value="3"
            detail="Surfaces that explain the institution openly before anyone commits money, sends reports, or enters operator spaces."
            icon={ShieldCheck}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Observatory anchors"
            value="Governance"
            detail="Operator doctrine, registries, and simulations belong to a calmer observatory grammar instead of public marketing language."
            icon={Compass}
          />
          <AnuInstrumentationCard
            label="Applied systems"
            value="Education + Flora & Fauna"
            detail="Subsystem libraries should inherit ANU structure while keeping their own operational identities."
            icon={ScrollText}
          />
        </section>

        <section className="mt-12">
          <AnuSectionHeading
            eyebrow="Library collections"
            title="Move by route family"
            description="Each collection groups routes by institutional role so the library teaches navigation, not just destination names."
          />

          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {libraryCollections.map((collection) => (
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

        <section className="mt-12 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <AnuSurfacePanel tone="soft" className="p-5">
            <AnuSectionHeading
              eyebrow="Reading protocol"
              title="How to use this library"
              description="The library is an orientation surface. Its job is to reduce wrong-route escalation."
            />
            <div className="mt-5 space-y-4">
              {readingProtocol.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Step {index + 1}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/82">{item.detail}</p>
                </div>
              ))}
            </div>
          </AnuSurfacePanel>

          <AnuSurfacePanel tone="quiet" className="p-5">
            <AnuSectionHeading
              eyebrow="Common first moves"
              title="Start with the right surface"
              description="These are the default entry points when someone is unsure where to go."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                {
                  href: '/transparency',
                  label: 'Check live institutional totals',
                  detail: 'Use transparency for public truth, receipts, and relief capacity.',
                },
                {
                  href: '/contact',
                  label: 'Route a question or incident',
                  detail: 'Use contact when you need the correct escalation lane and evidence checklist.',
                },
                {
                  href: '/governance',
                  label: 'Open the governance observatory',
                  detail: 'Use governance for policy, model, federation, and registry surfaces.',
                },
                {
                  href: '/memberships',
                  label: 'Evaluate a contribution covenant',
                  detail: 'Use memberships when the question is trust, sustainability, and secure recurring support.',
                },
              ].map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-white/18 hover:bg-white/[0.05]"
                >
                  <p className="text-sm font-semibold text-white">{route.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300/82">{route.detail}</p>
                </Link>
              ))}
            </div>
          </AnuSurfacePanel>
        </section>
      </div>
    </div>
  );
}
