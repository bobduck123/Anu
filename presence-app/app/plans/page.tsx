import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Layers, Users, Building2, Briefcase, Truck } from "lucide-react";

export const metadata = {
  title: "Plans — Presence",
  description:
    "How Presence is offered during public beta — basic, creative, signature, organisation, professional, and service tiers.",
};

interface Plan {
  key: string;
  name: string;
  audience: string;
  tagline: string;
  highlights: string[];
  icon: typeof Sparkles;
  beta: string;
  accent: "accent" | "ink";
}

const PLANS: Plan[] = [
  {
    key: "basic",
    name: "Basic Presence",
    audience: "Anyone — a single public-world card.",
    tagline: "Digital card, links, enquiry, QR / vCard.",
    highlights: [
      "Single Presence with display name, headline, bio",
      "Public links + enquiry form",
      "Scanner-grade QR + vCard",
      "Basic aesthetic template",
    ],
    icon: Sparkles,
    beta: "Free during public beta",
    accent: "ink",
  },
  {
    key: "creative",
    name: "Creative Presence",
    audience: "Artists, makers, designers, writers.",
    tagline: "Portfolio, works, collections, statement, gallery template.",
    highlights: [
      "Selected works + collections (rooms, series, dossiers)",
      "Practice / curatorial statement",
      "Public works detail pages",
      "Gallery / portal / studio-practice templates",
      "Enquiry, viewing, commission paths",
    ],
    icon: Layers,
    beta: "Founding-pilot slots open",
    accent: "accent",
  },
  {
    key: "signature",
    name: "Signature Presence",
    audience: "Established practices and represented artists.",
    tagline: "Custom visual world, atmosphere layer, full proof kit.",
    highlights: [
      "Custom visual world (mood, intensity, entry behaviour)",
      "Atmosphere layer (CSS / SVG only — no heavy runtime)",
      "Opportunity modules tuned for your segment",
      "Proof kit + QR / NFC kit for physical use",
      "Studio-assisted setup",
    ],
    icon: Sparkles,
    beta: "Studio-assisted, application required",
    accent: "ink",
  },
  {
    key: "organisation",
    name: "Organisation / Venue",
    audience: "Galleries, venues, collectives, cultural orgs.",
    tagline: "Public noticeboard, programs, partnerships, archive readiness.",
    highlights: [
      "Public noticeboard / program wall",
      "Mission, team, programs, archive",
      "Visit / propose / partner / document routes",
      "Directory / map / archive readiness signals",
      "White-label network entry path",
    ],
    icon: Building2,
    beta: "Pilot venues — limited slots",
    accent: "accent",
  },
  {
    key: "professional",
    name: "Professional Presence",
    audience: "Consultants, fractional executives, advisors.",
    tagline: "Capability dossier, case studies, services, RFP enquiry.",
    highlights: [
      "Procurement-ready public summary",
      "Selected case studies / proof items",
      "Services and ways to work",
      "Referral / RFP enquiry path",
      "Speaking, advisory, board enquiries",
    ],
    icon: Briefcase,
    beta: "Alpha foundation — feedback welcome",
    accent: "ink",
  },
  {
    key: "service",
    name: "Service / Trade Presence",
    audience: "Tradies, field-service, allied professionals.",
    tagline: "Quote request, proof gallery, service areas, NFC card.",
    highlights: [
      "Quote request and variation-ready enquiry concept",
      "Proof-of-work gallery and trust signals",
      "Service areas, licences, credentials",
      "NFC business card for vehicle / handouts",
      "Source-tagged scan analytics",
    ],
    icon: Truck,
    beta: "Alpha foundation — feedback welcome",
    accent: "accent",
  },
];

export default function PlansPage() {
  return (
    <main className="min-h-dvh bg-[var(--p-bg)] px-5 py-8 text-[var(--p-text)] sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Presence
        </Link>

        <header className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-stone-500">
            Plans
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-5xl">
            Six ways to use Presence — chosen by what your public world is for.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-stone-600">
            During public beta, plans are organised by intent, not feature
            count. Every Presence begins as a draft or setup-pending request —
            nothing is published until you say so.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/auth/sign-up?returnTo=%2Fbeta%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Start your Presence
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/beta"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950"
            >
              About public beta
            </Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isAccent = plan.accent === "accent";
            return (
              <article
                key={plan.key}
                className={`flex flex-col gap-4 rounded-[2rem] border p-6 ${
                  isAccent
                    ? "border-stone-900 bg-stone-950 text-white"
                    : "border-stone-200 bg-white text-stone-950"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      isAccent ? "bg-[var(--p-studio-accent)] text-stone-950" : "bg-stone-950 text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                      isAccent ? "text-stone-300" : "text-stone-500"
                    }`}
                  >
                    {plan.beta}
                  </span>
                </div>

                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                      isAccent ? "text-stone-400" : "text-stone-500"
                    }`}
                  >
                    {plan.audience}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">{plan.name}</h2>
                  <p className={`mt-2 text-sm leading-6 ${isAccent ? "text-stone-300" : "text-stone-600"}`}>
                    {plan.tagline}
                  </p>
                </div>

                <ul className={`flex flex-col gap-2 text-sm ${isAccent ? "text-stone-200" : "text-stone-700"}`}>
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                          isAccent ? "bg-[var(--p-studio-accent)]" : "bg-stone-950"
                        }`}
                      />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2">
                  <Link
                    href={`/auth/sign-up?returnTo=%2Fbeta%2Fonboarding&plan=${plan.key}`}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      isAccent
                        ? "border border-stone-700 text-white hover:border-stone-500"
                        : "border border-stone-300 text-stone-900 hover:border-stone-950"
                    }`}
                  >
                    Start as {plan.name}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-stone-200 bg-stone-50 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 shrink-0 text-stone-700" />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-stone-900">Beta pricing</p>
              <p className="text-sm leading-6 text-stone-600">
                Public-beta accounts are free. Founding-pilot slots include
                studio-assisted setup. Pricing for v1 will be set after the
                first cohorts of artists, practitioners, venues, and
                organisations have published. Nothing is billed during beta.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
