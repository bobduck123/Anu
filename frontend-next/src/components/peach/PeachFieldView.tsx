import Link from 'next/link';
import type { PeachField, PeachOrchard } from '@/lib/peach/types';

const heldSurfaces = [
  'Public contribution display',
  'Real payments or checkout',
  'Uploads',
  'Youth or sensitive-material collection',
  'Public Yield or Commons release',
];

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4f2f]">{eyebrow}</p>
      <h2 className="text-2xl font-semibold text-[#24160f]">{title}</h2>
    </div>
  );
}

export function PeachFieldView({ orchard, field }: { orchard: PeachOrchard; field: PeachField }) {
  const statusItems = [
    ['Orchard', orchard.title],
    ['Mode', orchard.phase],
    ['Intake', field.contributionIntakeStatus === 'disabled' ? 'Not live' : field.contributionIntakeStatus],
    ['Support', 'Manual only'],
  ];

  return (
    <main className="min-h-screen bg-[#fbf7f1] px-4 py-16 text-[#24160f] md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4f2f]">
              <span>PEACH</span>
              <span className="h-px w-8 bg-[#d2a76d]" />
              <span>ANU collective-cultural vertical</span>
            </div>
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-normal text-[#24160f] md:text-6xl">{field.title}</h1>
              <p className="text-xl leading-8 text-[#5f493b] md:text-2xl">{field.seed.text}</p>
              <p className="max-w-3xl text-base leading-7 text-[#6b5647]">{field.shortDescription}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/peach/fields/${field.slug}`} className="rounded-md bg-[#24160f] px-4 py-2 text-sm font-semibold text-[#fff7ea] transition hover:bg-[#4a2b1d]">
                Field detail
              </Link>
              <Link href={`/peach/fields/${field.slug}/contribute`} className="rounded-md border border-[#d2a76d] px-4 py-2 text-sm font-semibold text-[#24160f] transition hover:bg-[#f4eadb]">
                Private pilot contribution
              </Link>
              <Link href="/peach/consent/request" className="rounded-md border border-[#d2a76d] px-4 py-2 text-sm font-semibold text-[#24160f] transition hover:bg-[#f4eadb]">
                Consent request
              </Link>
              <Link href="/peach/support" className="rounded-md border border-[#d2a76d] px-4 py-2 text-sm font-semibold text-[#24160f] transition hover:bg-[#f4eadb]">
                Manual support intent
              </Link>
            </div>
          </div>

          <aside className="rounded-lg border border-[#dfc8a8] bg-white/70 p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a4f2f]">Gate 10 status</p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {statusItems.map(([label, value]) => (
                <div key={label} className="rounded-md border border-[#eadbc4] bg-[#fffaf2] p-3">
                  <dt className="text-xs uppercase tracking-[0.12em] text-[#8a4f2f]">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#24160f]">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-6 text-[#6b5647]">
              This route reads PEACH through the ANU PEACH read model. It accepts private pilot submissions, consent operation requests, and non-payment support intents through ANU core API while never publishing contribution bodies.
            </p>
          </aside>
        </section>

                <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-[#dfc8a8] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a4f2f]">Field</p>
            <p className="mt-2 text-sm leading-6 text-[#5f493b]">A bounded cultural inquiry opened by a Seed and stewarded toward possible shared work.</p>
          </article>
          <article className="rounded-lg border border-[#dfc8a8] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a4f2f]">Yield</p>
            <p className="mt-2 text-sm leading-6 text-[#5f493b]">A later work made only from reviewed material with the right consent. No Yield is public in this pilot.</p>
          </article>
          <article className="rounded-lg border border-[#dfc8a8] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a4f2f]">Commons Return</p>
            <p className="mt-2 text-sm leading-6 text-[#5f493b]">The approved work, method, or learning that comes back to the community after consent and steward review.</p>
          </article>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-lg border border-[#dfc8a8] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a4f2f]">Season</p>
            <p className="mt-2 text-lg font-semibold">{field.season}</p>
          </div>
          <div className="rounded-lg border border-[#dfc8a8] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a4f2f]">Steward</p>
            <p className="mt-2 text-lg font-semibold">{field.steward.displayName}</p>
          </div>
          <div className="rounded-lg border border-[#dfc8a8] bg-white p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8a4f2f]">Field status</p>
            <p className="mt-2 text-lg font-semibold capitalize">{field.status}</p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="Soil" title="Why this Field matters now" />
          <div className="space-y-4 text-base leading-7 text-[#5f493b]">
            <p>{field.seed.reasonForNow}</p>
            {field.soil.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading eyebrow="Vessels" title="Source paths into the Field" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {field.vessels.map((vessel) => (
              <article key={vessel.id} className="rounded-lg border border-[#dfc8a8] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8a4f2f]">{vessel.type}</p>
                <h3 className="mt-2 text-lg font-semibold">{vessel.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5f493b]">{vessel.reason}</p>
                <p className="mt-4 text-xs leading-5 text-[#7a6556]">Access: {vessel.access}</p>
                <p className="mt-2 text-xs leading-5 text-[#7a6556]">Rights: {vessel.rights}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <SectionHeading eyebrow="Gatherings" title="Interpretive moments" />
            <div className="space-y-4">
              {field.gatherings.map((gathering) => (
                <article key={gathering.id} className="rounded-lg border border-[#dfc8a8] bg-white p-5">
                  <h3 className="text-lg font-semibold">{gathering.title}</h3>
                  <p className="mt-2 text-sm text-[#8a4f2f]">{gathering.format} - {gathering.timing}</p>
                  <p className="mt-3 text-sm leading-6 text-[#5f493b]">{gathering.purpose}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <SectionHeading eyebrow="Tending" title="Prompts held for private staging" />
            <div className="space-y-4">
              {field.prompts.map((prompt) => (
                <article key={prompt.id} className="rounded-lg border border-[#dfc8a8] bg-white p-5">
                  <h3 className="text-base font-semibold leading-6">{prompt.text}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5f493b]">{prompt.guidance}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#8a4f2f]">Intake {prompt.intakeStatus === 'disabled' ? 'not live' : prompt.intakeStatus}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border border-[#dfc8a8] bg-white p-6">
            <SectionHeading eyebrow="Yield and Return" title={field.yield.title} />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#8a4f2f]">{field.yield.status}</p>
            <p className="mt-4 text-base leading-7 text-[#5f493b]">{field.yield.description}</p>
            <p className="mt-4 text-base leading-7 text-[#5f493b]">{field.returnPlan}</p>
            {field.commonsEntries.map((entry) => (
              <div key={entry.id} className="mt-5 rounded-md border border-[#eadbc4] bg-[#fffaf2] p-4">
                <p className="text-sm font-semibold">{entry.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#5f493b]">{entry.summary}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#dfc8a8] bg-[#24160f] p-6 text-[#fff7ea]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#edc98e]">Held surfaces</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#f7e6ca]">
              {heldSurfaces.map((surface) => (
                <li key={surface} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#edc98e]" />
                  <span>{surface}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-5">
          <SectionHeading eyebrow="Support" title="Manual intent metadata only" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {field.supportOptions.map((option) => (
              <article key={option.id} className="rounded-lg border border-[#dfc8a8] bg-white p-5">
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-3 text-sm leading-6 text-[#5f493b]">{option.enables}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#8a4f2f]">Payment taken: {String(option.paymentTaken)}</p>
                <Link href="/peach/support" className="mt-4 inline-flex rounded-md border border-[#d2a76d] px-3 py-2 text-xs font-semibold text-[#24160f] transition hover:bg-[#f4eadb]">
                  Record manual intent
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}


