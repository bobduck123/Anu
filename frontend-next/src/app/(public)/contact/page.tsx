import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Compass,
  FileText,
  LifeBuoy,
  MessageSquareText,
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

const intakeRoutes = [
  {
    eyebrow: 'Public guidance',
    title: 'Commons questions and orientation',
    description:
      'Use this lane when the question is where to start, how a public route works, or which trust surface already contains the answer.',
    links: [
      {
        href: '/docs',
        label: 'Read the operations library',
        detail: 'Start here if the question is about route relationships, doctrine, or subsystem entry points.',
      },
      {
        href: '/transparency',
        label: 'Check transparency first',
        detail: 'Use the public ledger for totals, pool balances, and relief-capacity state before escalating.',
      },
    ],
  },
  {
    eyebrow: 'Operational support',
    title: 'Issue reports and reproducible incidents',
    description:
      'Use this lane when there is a concrete product issue, a route failure, or a degradation that needs an operator to reproduce.',
    links: [
      {
        href: '/governance',
        label: 'Attach governance context',
        detail: 'Link the model, formula, or review surface if the issue concerns policy or system behavior.',
      },
      {
        href: '/community',
        label: 'Check community route state',
        detail: 'Use community when the issue concerns publication, trusted signals, or commons browsing behavior.',
      },
    ],
  },
  {
    eyebrow: 'Institutional escalation',
    title: 'Stewardship, partnerships, and serious review',
    description:
      'Use this lane for matters that require a steward, governance review, or relationship-building rather than routine product triage.',
    links: [
      {
        href: '/memberships',
        label: 'Membership and covenant context',
        detail: 'Use memberships when the matter concerns support, contribution, or continuity of commons funding.',
      },
      {
        href: '/flora-fauna',
        label: 'Subsystem-specific escalation',
        detail: 'Route subsystem-specific issues through their relevant operational surface when possible.',
      },
    ],
  },
];

const evidenceChecklist = [
  'State the exact route, page, or institutional surface involved.',
  'Describe whether the issue is public-trust, operator, or subsystem-specific.',
  'Attach the ledger, governance, or publication context already visible in the product.',
  'Note whether the issue is blocking action, degrading confidence, or only informational.',
];

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow="Routing surface"
          title="Route a question with the right evidence."
          description="This page is not a generic help fallback. It exists to route questions, incidents, and stewardship requests into the correct lane with enough context that the receiving surface can act."
          actions={
            <>
              <AnuActionLink href="/docs" tone="primary" iconLeft={Compass} iconRight={ArrowRight}>
                Open operations library
              </AnuActionLink>
              <AnuActionLink href="/transparency" tone="secondary" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                Check transparency first
              </AnuActionLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal" icon={MessageSquareText}>
                  Evidence first
                </AnuChip>
                <AnuChip tone="muted" icon={LifeBuoy}>
                  Right lane
                </AnuChip>
                <AnuChip tone="accent" icon={AlertCircle}>
                  Escalate with context
                </AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                The fastest path is usually not “contact us.” It is “start from the surface that already
                contains the relevant truth, then escalate with that context attached.”
              </p>
            </AnuSurfacePanel>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <AnuHeroMetric
              label="Primary mode"
              value="Route-aware support"
              detail="This surface chooses the correct institutional lane before it asks an operator to intervene."
            />
            <AnuHeroMetric
              label="Evidence bundle"
              value="Required"
              detail="Questions move faster when the originating route, state, and visible evidence are attached."
            />
            <AnuHeroMetric
              label="Escalation posture"
              value="Community first"
              detail="Public routes, docs, and transparency should resolve most uncertainty before governance review is needed."
            />
          </div>
        </AnuPageHero>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <AnuInstrumentationCard
            label="Orientation lane"
            value="Docs + transparency"
            detail="Use public-truth surfaces first when the issue is understanding, not failure."
            icon={Compass}
            tone="signal"
          />
          <AnuInstrumentationCard
            label="Incident lane"
            value="Reproducible context"
            detail="Operator issues should carry route state, visible symptoms, and the exact surface involved."
            icon={AlertCircle}
          />
          <AnuInstrumentationCard
            label="Stewardship lane"
            value="Institutional review"
            detail="Use governance, memberships, or subsystem entry points when the matter concerns policy, covenant, or relationship."
            icon={ShieldCheck}
          />
        </section>

        <section className="mt-12">
          <AnuSectionHeading
            eyebrow="Intake lanes"
            title="Choose the right route family"
            description="Each lane names when to use it and which surfaces already contain the context the next person will need."
          />

          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {intakeRoutes.map((route) => (
              <AnuChamberCard
                key={route.title}
                eyebrow={route.eyebrow}
                title={route.title}
                description={route.description}
              >
                <div className="space-y-3">
                  {route.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-white/18 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{link.label}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300/82">{link.detail}</p>
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

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.04fr_0.96fr]">
          <AnuSurfacePanel tone="soft" className="p-5">
            <AnuSectionHeading
              eyebrow="Evidence checklist"
              title="Send context, not just urgency"
              description="Before escalating, attach the surfaces and signals that already explain the situation."
            />
            <div className="mt-5 space-y-3">
              {evidenceChecklist.map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Bundle item {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200/86">{item}</p>
                </div>
              ))}
            </div>
          </AnuSurfacePanel>

          <AnuSurfacePanel tone="quiet" className="p-5">
            <AnuSectionHeading
              eyebrow="Fastest first moves"
              title="Open the route that already knows"
              description="Use these before escalating to a human steward whenever possible."
            />
            <div className="mt-5 grid gap-3">
              {[
                {
                  href: '/docs',
                  label: 'Unsure where to start',
                  detail: 'The operations library explains which route family you actually need.',
                  icon: FileText,
                },
                {
                  href: '/transparency',
                  label: 'Need the public state',
                  detail: 'Transparency shows totals, pools, receipts, and relief capacity.',
                  icon: ShieldCheck,
                },
                {
                  href: '/governance',
                  label: 'Need institutional reasoning',
                  detail: 'Governance surfaces explain models, registries, federation, and simulations.',
                  icon: Compass,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-white/18 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-[#f3cd92]">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300/82">{item.detail}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </AnuSurfacePanel>
        </section>
      </div>
    </div>
  );
}
