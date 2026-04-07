import Link from 'next/link';
import { ArrowRight, BookOpenText, Compass, LibraryBig, ScrollText, ShieldCheck } from 'lucide-react';
import { AnuActionLink } from '@/ui-system/anu/surfacePrimitives';
import { LabyrinthArchiveShell } from '@/ui-system/realms/labyrinth/LabyrinthArchiveShell';
import { ObservatoryStatsRail } from '@/ui-system/realms/labyrinth/ObservatoryStatsRail';

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
    <div className="min-h-screen px-4 pb-20 pt-20 md:px-8">
      <div className="mx-auto max-w-[110rem]">
        <LabyrinthArchiveShell
          eyebrow="Operations library"
          title="Read the institution before you operate it."
          description="The docs route should feel like passing through the archive and arriving at manuscript chambers for trust, doctrine, and applied systems. It is an orientation surface, not a help-center grid."
          legend={
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#f6d4cb]/72">Library rule</p>
              <p className="text-sm leading-6 text-[#f6d4cb]/76">
                Separate public truth, operator doctrine, and applied systems so people learn the right path before they escalate or intervene.
              </p>
            </div>
          }
          stats={
            <ObservatoryStatsRail
              items={[
                {
                  label: 'Collections',
                  value: '3 route families',
                  detail:
                    'Trust, governance, and applied systems are separated so explanation is not confused with execution.',
                },
                {
                  label: 'Posture',
                  value: 'Editorial + inspectable',
                  detail:
                    'The library should behave like a curated operating archive, not a generic documentation grid.',
                },
                {
                  label: 'Protocol',
                  value: 'Truth before escalation',
                  detail:
                    'Transparency and route context should come before tickets, admin work, or governance review.',
                },
              ]}
            />
          }
          controls={
            <div className="anu-labyrinth-console">
              <div className="flex flex-wrap gap-2">
                <AnuActionLink href="/transparency" tone="primary" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                  Open transparency
                </AnuActionLink>
                <AnuActionLink href="/governance" tone="secondary" iconLeft={Compass} iconRight={ArrowRight}>
                  Enter governance observatory
                </AnuActionLink>
              </div>
              <p className="text-xs leading-6 text-[#f6d4cb]/72">
                The library should reduce wrong-route escalation by teaching which surfaces explain, which govern, and which act.
              </p>
            </div>
          }
        >
          <div className="anu-labyrinth-route-grid anu-labyrinth-route-grid-3">
            {libraryCollections.map((collection) => (
              <section key={collection.title} className="anu-labyrinth-manuscript-card">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">{collection.eyebrow}</p>
                <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  {collection.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#7c413c]">{collection.description}</p>

                <div className="mt-5 space-y-3">
                  {collection.links.map((link) => (
                    <Link key={link.href} href={link.href} className="anu-labyrinth-portal-link">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1e0227]">{link.label}</p>
                          <p className="mt-2 text-sm leading-6 text-[#7c413c]">{link.detail}</p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#7c413c]">{link.href}</p>
                        </div>
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#665700]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 anu-labyrinth-route-grid anu-labyrinth-route-grid-2">
            <section className="anu-labyrinth-manuscript-card">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Reading protocol</p>
              <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                How to read this library
              </h2>
              <div className="mt-5 space-y-3">
                {readingProtocol.map((item, index) => (
                  <div key={item.title} className="anu-labyrinth-portal-link">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#7c413c]">Step {index + 1}</p>
                    <p className="mt-2 text-sm font-semibold text-[#1e0227]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#7c413c]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="anu-labyrinth-manuscript-card">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Common first moves</p>
              <h2 className="mt-3 text-3xl text-[#1e0227]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Start with the right surface
              </h2>
              <div className="mt-5 space-y-3">
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
                  <Link key={route.href} href={route.href} className="anu-labyrinth-portal-link">
                    <p className="text-sm font-semibold text-[#1e0227]">{route.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[#7c413c]">{route.detail}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 anu-labyrinth-route-grid anu-labyrinth-route-grid-3">
            <div className="anu-labyrinth-archive-note">
              <div className="flex items-center gap-2 text-[#f6d4cb]">
                <LibraryBig className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em]">Inspectable first</span>
              </div>
              <p className="mt-3 text-sm leading-7">
                This route should reduce confusion before anyone reaches governance, memberships, or a subsystem-specific operator surface.
              </p>
            </div>
            <div className="anu-labyrinth-archive-note">
              <div className="flex items-center gap-2 text-[#f6d4cb]">
                <BookOpenText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em]">Route-aware</span>
              </div>
              <p className="mt-3 text-sm leading-7">
                The library is not neutral content. It teaches the relationship between trust routes, governance doctrine, and applied systems.
              </p>
            </div>
            <div className="anu-labyrinth-archive-note">
              <div className="flex items-center gap-2 text-[#f6d4cb]">
                <ScrollText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.16em]">Evidence before escalation</span>
              </div>
              <p className="mt-3 text-sm leading-7">
                Start from transparency, contact, or memberships before moving into deeper operator or subsystem lanes.
              </p>
            </div>
          </div>
        </LabyrinthArchiveShell>
      </div>
    </div>
  );
}
