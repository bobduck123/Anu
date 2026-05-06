/* eslint-disable @next/next/no-img-element */

import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ClipboardCheck,
  DoorOpen,
  FileCheck2,
  Globe2,
  HardHat,
  Images,
  Layers,
  Mail,
  MapPin,
  Palette,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { PresenceCollection, PresenceNode, PresenceWork } from '@/lib/api/presence';
import { PresenceEnquiryForm } from '@/components/presence/PresenceEnquiryForm';
import { PresenceQuoteRequestForm } from '@/components/presence/PresenceQuoteRequestForm';
import { PresenceCopyUrlButton, PresenceQRCode, PresenceShareButton, PresenceVCardButton } from '@/components/presence/PresenceActions';
import { PresencePublicImage } from '@/components/presence/PresencePublicImage';
import { PresenceSourceTracker } from '@/components/presence/PresenceSourceTracker';
import { PresenceTrackedLink } from '@/components/presence/PresenceTrackedLink';

interface PresenceNodeRendererProps {
  node: PresenceNode;
  publicUrl: string;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function visibleWorks(node: PresenceNode) {
  return (node.works || []).filter((work) => work.is_visible !== false);
}

function visibleCollections(node: PresenceNode) {
  return (node.collections || []).filter((collection) => collection.is_visible !== false);
}

function visibleServices(node: PresenceNode) {
  return (node.services || []).filter((service) => service.is_visible !== false);
}

function displayLabel(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

function PresencePilotNav({ items, tone = 'light' }: { items: Array<{ label: string; href: string }>; tone?: 'light' | 'dark' }) {
  return (
    <nav aria-label="Presence page sections" className="flex flex-wrap items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
      {items.map((item) => (
        <a key={item.href} href={item.href} className={tone === 'light' ? 'text-stone-700 hover:text-stone-950' : 'text-white/76 hover:text-white'}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function PresenceLightActions({ node, publicUrl }: PresenceNodeRendererProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone="light" />
      <PresenceVCardButton slug={node.slug} tone="light" />
      <PresenceCopyUrlButton publicUrl={publicUrl} tone="light" />
    </div>
  );
}

function PresenceContactBlock({ node, publicUrl, tone = 'light', title = 'Contact' }: PresenceNodeRendererProps & { tone?: 'light' | 'dark'; title?: string }) {
  const light = tone === 'light';
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <section className={light ? 'border-t border-stone-300 pt-5' : 'rounded-lg border border-white/12 bg-white/[0.07] p-4'}>
        <h2 className={light ? 'flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-700' : 'flex items-center gap-2 text-base font-semibold text-white'}>
          <Mail className={light ? 'h-4 w-4 text-[#9f5f31]' : 'h-4 w-4 text-[#e0b115]'} />
          {title}
        </h2>
        <div className={light ? 'mt-4 rounded-lg border border-stone-300 bg-white/72 p-4' : 'mt-4'}>
          <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} tone={tone} />
        </div>
      </section>
      <section className={light ? 'border-t border-stone-300 pt-5' : 'rounded-lg border border-white/12 bg-white/[0.07] p-4'}>
        <h2 className={light ? 'text-sm font-semibold uppercase tracking-[0.16em] text-stone-700' : 'text-base font-semibold text-white'}>Save and share</h2>
        <div className={light ? 'mt-4 rounded-lg border border-stone-300 bg-white/72 p-4' : 'mt-4'}>
          <div className="mb-4 flex flex-wrap gap-2">
            <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone={tone} />
            <PresenceVCardButton slug={node.slug} tone={tone} />
            <PresenceCopyUrlButton publicUrl={publicUrl} tone={tone} />
          </div>
          <PresenceQRCode slug={node.slug} publicUrl={publicUrl} tone={tone} />
        </div>
      </section>
    </aside>
  );
}

function PresenceLightAvailabilityChips({ chips }: { chips?: PresenceNode['availability_chips'] }) {
  const active = (chips || []).filter((chip) => chip.is_active !== false);
  if (!active.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {active.map((chip) => (
        <span key={`${chip.label}-${chip.sort_order}`} className="rounded-md border border-[#cfc8b7] bg-white/58 px-3 py-1.5 text-sm text-[#455349]">
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function PresenceProfileHeader({ node, publicUrl }: PresenceNodeRendererProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#1e0227]">
      {node.cover_image_url ? (
        <img src={node.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-28" />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,2,39,0.42),#1e0227_86%)]" />
      <div className="relative mx-auto flex min-h-[74vh] max-w-5xl flex-col justify-end px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-end gap-4">
            {node.profile_image_url ? (
              <img
                src={node.profile_image_url}
                alt={node.display_name}
                className="h-24 w-24 rounded-lg border border-white/18 object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-white/18 bg-white/[0.10] text-2xl font-semibold text-white">
                {initials(node.display_name)}
              </div>
            )}
            <div className="mb-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-[#e0b115]/36 bg-[#e0b115]/14 px-2.5 py-1 text-xs font-medium text-[#f6d4cb]">
                <BadgeCheck className="h-3.5 w-3.5" />
                {node.template?.name || 'Presence Node'}
              </span>
              <span className="inline-flex rounded-md border border-white/14 bg-white/[0.08] px-2.5 py-1 text-xs font-medium capitalize text-white/78">
                {node.node_type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">{node.display_name}</h1>
          {node.headline ? <p className="mt-4 max-w-2xl text-lg leading-8 text-[#f6d4cb]/86">{node.headline}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/76">
            {node.location_label ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#e0b115]" />
                {node.location_label}
              </span>
            ) : null}
            {node.service_area ? (
              <span className="inline-flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-[#e0b115]" />
                {node.service_area}
              </span>
            ) : null}
            {node.organisation ? (
              <PresenceOrganisationBadge organisation={node.organisation} />
            ) : null}
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
            <PresenceVCardButton slug={node.slug} />
            <PresenceCopyUrlButton publicUrl={publicUrl} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function PresenceOrganisationBadge({ organisation }: { organisation: NonNullable<PresenceNode['organisation']> }) {
  return (
    <span className="inline-flex items-center gap-2">
      <BriefcaseBusiness className="h-4 w-4 text-[#e0b115]" />
      {organisation.name}
    </span>
  );
}

export function PresenceAvailabilityChips({ chips }: { chips?: PresenceNode['availability_chips'] }) {
  const active = (chips || []).filter((chip) => chip.is_active !== false);
  if (!active.length) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {active.map((chip) => (
        <span key={`${chip.label}-${chip.sort_order}`} className="rounded-md border border-white/14 bg-white/[0.08] px-3 py-1.5 text-sm text-white/82">
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function PresenceLinks({ node }: { node: PresenceNode }) {
  const links = (node.links || []).filter((link) => link.is_visible !== false);
  if (!links.length) {
    return null;
  }
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Sparkles className="h-4 w-4 text-[#e0b115]" />
        Links
      </h2>
      <div className="mt-4 grid gap-2">
        {links.map((link) => (
          <PresenceTrackedLink
            key={`${link.label}-${link.url}`}
            slug={node.slug}
            href={link.url}
            eventType={link.link_type === 'social' ? 'social_clicked' : 'link_clicked'}
            metadata={{ label: link.label, url: link.url, link_type: link.link_type }}
            className="group flex items-center justify-between rounded-md border border-white/12 bg-[#1e0227]/56 px-4 py-3 text-sm font-medium text-white hover:border-[#e0b115]/48"
          >
            <span>{link.label}</span>
            <ArrowUpRight className="h-4 w-4 text-white/48 group-hover:text-[#e0b115]" />
          </PresenceTrackedLink>
        ))}
      </div>
    </section>
  );
}

export function PresenceServices({ node }: { node: PresenceNode }) {
  const services = (node.services || []).filter((service) => service.is_visible !== false);
  if (!services.length) {
    return null;
  }
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <CalendarClock className="h-4 w-4 text-[#e0b115]" />
        Services
      </h2>
      <div className="mt-4 space-y-3">
        {services.map((service) => (
          <article key={`${service.title}-${service.sort_order}`} className="rounded-md border border-white/12 bg-[#1e0227]/48 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{service.title}</h3>
                {service.description ? <p className="mt-2 text-sm leading-6 text-white/70">{service.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/72">
                {service.price_label ? <span className="rounded-md bg-white/[0.08] px-2 py-1">{service.price_label}</span> : null}
                {service.duration_label ? <span className="rounded-md bg-white/[0.08] px-2 py-1">{service.duration_label}</span> : null}
              </div>
            </div>
            {service.cta_url ? (
              <PresenceTrackedLink
                slug={node.slug}
                href={service.cta_url}
                eventType="service_clicked"
                metadata={{ title: service.title, url: service.cta_url }}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#e0b115]/36 px-3 py-2 text-xs font-semibold text-[#f6d4cb] hover:bg-[#e0b115]/14"
              >
                {service.cta_label || 'Enquire'}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </PresenceTrackedLink>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function PresenceOfferCards({ node }: { node: PresenceNode }) {
  const offers = (node.services || []).filter((service) => service.is_visible !== false);
  if (!offers.length) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <BriefcaseBusiness className="h-4 w-4 text-[#e0b115]" />
        Offers
      </h2>
      <div className="mt-4 grid gap-3">
        {offers.map((service) => (
          <article key={`${service.title}-${service.sort_order}`} className="rounded-md border border-white/12 bg-[#1e0227]/48 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{service.title}</h3>
              {[service.price_label, service.duration_label].filter(Boolean).length ? (
                <span className="rounded-md bg-white/[0.08] px-2 py-1 text-xs text-white/72">
                  {[service.price_label, service.duration_label].filter(Boolean).join(' / ')}
                </span>
              ) : null}
            </div>
            {service.problem_solved ? <p className="mt-3 text-sm leading-6 text-white/72">{service.problem_solved}</p> : null}
            {service.who_it_is_for ? <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/46">{service.who_it_is_for}</p> : null}
            {service.deliverables ? <p className="mt-3 text-sm leading-6 text-white/66">{service.deliverables}</p> : service.description ? <p className="mt-3 text-sm leading-6 text-white/66">{service.description}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function PresenceCapabilityStatement({ node }: { node: PresenceNode }) {
  if (!node.capability_statement && !node.procurement_summary) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <FileCheck2 className="h-4 w-4 text-[#e0b115]" />
        Capability
      </h2>
      {node.capability_statement ? (
        <div className="mt-3 text-sm leading-7 text-white/76" dangerouslySetInnerHTML={{ __html: node.capability_statement }} />
      ) : null}
      {node.procurement_summary ? (
        <p className="mt-3 rounded-md border border-white/12 bg-[#1e0227]/42 p-3 text-sm leading-6 text-white/68">{node.procurement_summary}</p>
      ) : null}
    </section>
  );
}

export function PresenceProofLedger({ node }: { node: PresenceNode }) {
  const proof = (node.proof_items || []).filter((item) => item.is_public !== false);
  if (!proof.length && !node.proof_summary) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <ShieldCheck className="h-4 w-4 text-[#e0b115]" />
        Proof Ledger
      </h2>
      {node.proof_summary ? <p className="mt-3 text-sm leading-7 text-white/72">{node.proof_summary}</p> : null}
      {proof.length ? (
        <div className="mt-4 grid gap-3">
          {proof.map((item) => (
            <article key={item.id || item.title} className="rounded-md border border-white/12 bg-[#1e0227]/48 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                {[item.client_label, item.industry].filter(Boolean).length ? (
                  <span className="text-xs uppercase tracking-[0.12em] text-white/46">{[item.client_label, item.industry].filter(Boolean).join(' / ')}</span>
                ) : null}
              </div>
              {item.challenge ? <p className="mt-3 text-sm leading-6 text-white/68">{item.challenge}</p> : null}
              {item.outcome ? <p className="mt-2 text-sm leading-6 text-white/78">{item.outcome}</p> : null}
              {item.testimonial ? <blockquote className="mt-3 border-l border-[#e0b115]/42 pl-3 text-sm italic leading-6 text-[#f6d4cb]">{item.testimonial}</blockquote> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function PresenceCaseStudyList({ node }: { node: PresenceNode }) {
  return <PresenceProofLedger node={node} />;
}

export function PresenceProcurementPanel({ node }: { node: PresenceNode }) {
  const profile = node.procurement_profile;
  if (!profile) return null;
  const facts = [
    profile.business_name,
    profile.rate_label,
    profile.insurance_status,
    profile.nda_ready ? 'NDA ready' : null,
    profile.payment_terms_label,
  ].filter(Boolean);
  if (!facts.length) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <ClipboardCheck className="h-4 w-4 text-[#e0b115]" />
        Procurement Ready
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {facts.map((fact) => (
          <span key={String(fact)} className="rounded-md border border-white/12 bg-[#1e0227]/46 px-3 py-1.5 text-sm text-white/74">
            {String(fact)}
          </span>
        ))}
      </div>
    </section>
  );
}

export function PresenceLicenceWallet({ node }: { node: PresenceNode }) {
  const credentials = (node.credentials || []).filter((item) => item.is_public !== false);
  if (!credentials.length) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <ShieldCheck className="h-4 w-4 text-[#e0b115]" />
        Licences and Credentials
      </h2>
      <div className="mt-4 grid gap-2">
        {credentials.map((item) => (
          <div key={item.id || item.title} className="rounded-md border border-white/12 bg-[#1e0227]/48 p-3">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-xs text-white/56">{[item.issuer, item.credential_type].filter(Boolean).join(' / ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PresenceBeforeAfterGallery({ node }: { node: PresenceNode }) {
  return <PresencePortfolio node={node} />;
}

export function PresenceHandoverSummary({ node }: { node: PresenceNode }) {
  if (!node.business_functions?.some((item) => item.function_type === 'proof_of_work_handover')) return null;
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <ClipboardCheck className="h-4 w-4 text-[#e0b115]" />
        Handover Ready
      </h2>
      <p className="mt-3 text-sm leading-7 text-white/72">Proof-of-work notes, before/after media, warranty details, and customer acceptance can be attached by the owner after a job.</p>
    </section>
  );
}

export function PresencePortfolio({ node }: { node: PresenceNode }) {
  const items = (node.portfolio_items || []).filter((item) => item.is_visible !== false);
  if (!items.length) {
    return null;
  }
  return (
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Images className="h-4 w-4 text-[#e0b115]" />
        Portfolio
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const image = item.thumbnail_url || item.media_url;
          const body = (
            <article className="h-full overflow-hidden rounded-md border border-white/12 bg-[#1e0227]/48">
              {image ? <img src={image} alt="" className="aspect-[4/3] w-full object-cover" /> : null}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                {item.description ? <p className="mt-2 text-sm leading-6 text-white/68">{item.description}</p> : null}
              </div>
            </article>
          );
          return item.external_url ? (
            <PresenceTrackedLink
              key={`${item.title}-${item.sort_order}`}
              slug={node.slug}
              href={item.external_url}
              eventType="portfolio_item_clicked"
              metadata={{ title: item.title, url: item.external_url }}
              className="block"
            >
              {body}
            </PresenceTrackedLink>
          ) : (
            <div key={`${item.title}-${item.sort_order}`}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}

function PresenceLightServices({ node, title = 'Services' }: { node: PresenceNode; title?: string }) {
  const services = visibleServices(node);
  if (!services.length) return null;
  return (
    <section className="border-t border-stone-300 py-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <article key={`${service.title}-${service.sort_order}`} className="border-l border-stone-300 pl-4">
            <h3 className="text-lg font-semibold text-stone-950">{service.title}</h3>
            {service.description ? <p className="mt-2 text-sm leading-6 text-stone-700">{service.description}</p> : null}
            {[service.price_label, service.duration_label].filter(Boolean).length ? (
              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#9f5f31]">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function PresenceLightProof({ node }: { node: PresenceNode }) {
  const proof = (node.proof_items || []).filter((item) => item.is_public !== false);
  const credentials = (node.credentials || []).filter((item) => item.is_public !== false);
  if (!proof.length && !credentials.length && !node.proof_summary) return null;
  return (
    <section className="border-t border-stone-300 py-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">Trust and proof</h2>
      {node.proof_summary ? <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700">{node.proof_summary}</p> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {proof.map((item) => (
          <article key={item.id || item.title} className="border-l border-stone-300 pl-4">
            <h3 className="text-lg font-semibold text-stone-950">{item.title}</h3>
            {item.outcome ? <p className="mt-2 text-sm leading-6 text-stone-700">{item.outcome}</p> : item.challenge ? <p className="mt-2 text-sm leading-6 text-stone-700">{item.challenge}</p> : null}
            {item.testimonial ? <blockquote className="mt-3 text-sm italic leading-6 text-[#6f4e35]">{item.testimonial}</blockquote> : null}
          </article>
        ))}
        {credentials.map((item) => (
          <article key={item.id || item.title} className="border-l border-stone-300 pl-4">
            <h3 className="text-lg font-semibold text-stone-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{[item.issuer, item.credential_type].filter(Boolean).join(' / ')}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PresenceLightPortfolio({ node }: { node: PresenceNode }) {
  const items = (node.portfolio_items || []).filter((item) => item.is_visible !== false);
  if (!items.length) return null;
  return (
    <section className="border-t border-stone-300 py-8">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">Media</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const image = item.thumbnail_url || item.media_url;
          const body = (
            <article className="group">
              <PresencePublicImage
                src={image}
                alt={item.title}
                className="aspect-[4/3] w-full border border-stone-300 bg-stone-200 object-cover transition-opacity group-hover:opacity-90"
                fallbackClassName="flex aspect-[4/3] w-full items-center justify-center border border-stone-300 bg-stone-200 text-stone-500"
                fallbackLabel="Media image"
              />
              <h3 className="mt-3 text-base font-semibold text-stone-950">{item.title}</h3>
              {item.description ? <p className="mt-2 text-sm leading-6 text-stone-700">{item.description}</p> : null}
            </article>
          );
          return item.external_url ? (
            <PresenceTrackedLink key={`${item.title}-${item.sort_order}`} slug={node.slug} href={item.external_url} eventType="portfolio_item_clicked" metadata={{ title: item.title, url: item.external_url }} className="block">
              {body}
            </PresenceTrackedLink>
          ) : (
            <div key={`${item.title}-${item.sort_order}`}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}

export function PresencePracticeStatement({ node, variant = 'dark' }: { node: PresenceNode; variant?: 'dark' | 'light' }) {
  if (!node.practice_statement) return null;
  const light = variant === 'light';
  return (
    <section className={light ? 'border-t border-stone-300 py-8' : 'rounded-lg border border-white/12 bg-white/[0.07] p-4'}>
      <h2 className={light ? 'flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-700' : 'flex items-center gap-2 text-base font-semibold text-white'}>
        <Palette className={light ? 'h-4 w-4 text-[#9f5f31]' : 'h-4 w-4 text-[#e0b115]'} />
        Practice Statement
      </h2>
      <div
        className={light ? 'mt-4 max-w-3xl text-lg leading-9 text-stone-800' : 'mt-3 text-sm leading-7 text-white/72'}
        dangerouslySetInnerHTML={{ __html: node.practice_statement }}
      />
    </section>
  );
}

export function PresenceCuratorialStatement({ node, variant = 'dark' }: { node: PresenceNode; variant?: 'dark' | 'light' }) {
  if (!node.curatorial_statement) return null;
  const light = variant === 'light';
  return (
    <section className={light ? 'border-t border-stone-300 py-8' : 'rounded-lg border border-white/12 bg-white/[0.07] p-4'}>
      <h2 className={light ? 'flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-700' : 'flex items-center gap-2 text-base font-semibold text-white'}>
        <BookOpen className={light ? 'h-4 w-4 text-[#9f5f31]' : 'h-4 w-4 text-[#e0b115]'} />
        Curatorial Statement
      </h2>
      <div
        className={light ? 'mt-4 max-w-3xl text-base leading-8 text-stone-700' : 'mt-3 text-sm leading-7 text-white/72'}
        dangerouslySetInnerHTML={{ __html: node.curatorial_statement }}
      />
    </section>
  );
}

export function PresenceWorkCard({ node, work, variant = 'light' }: { node: PresenceNode; work: PresenceWork; variant?: 'light' | 'dark' }) {
  const image = work.thumbnail_url || work.image_url;
  const light = variant === 'light';
  const content = (
    <article className={light ? 'group border-t border-stone-300 py-4' : 'group overflow-hidden rounded-md border border-white/12 bg-[#1e0227]/48'}>
      {image ? (
        <PresencePublicImage
          src={image}
          alt={work.title}
          className={light ? 'aspect-[4/5] w-full object-cover transition duration-500 group-hover:opacity-90' : 'aspect-[4/3] w-full object-cover'}
          fallbackClassName={light ? 'flex aspect-[4/5] w-full items-center justify-center bg-stone-200 text-stone-500' : 'flex aspect-[4/3] w-full items-center justify-center bg-white/[0.08] text-white/50'}
          fallbackLabel="Work image"
        />
      ) : (
        <div className={light ? 'flex aspect-[4/5] items-center justify-center bg-stone-200 text-stone-500' : 'flex aspect-[4/3] items-center justify-center bg-white/[0.08] text-white/50'}>
          <Images className="h-6 w-6" />
        </div>
      )}
      <div className={light ? 'pt-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-3">
          <h3 className={light ? 'text-base font-semibold text-stone-950' : 'text-sm font-semibold text-white'}>{work.title}</h3>
          {work.year ? <span className={light ? 'text-sm text-stone-500' : 'text-xs text-white/54'}>{work.year}</span> : null}
        </div>
        {[work.medium, work.dimensions].filter(Boolean).length ? (
          <p className={light ? 'mt-1 text-sm text-stone-600' : 'mt-1 text-xs text-white/56'}>
            {[work.medium, work.dimensions].filter(Boolean).join(' / ')}
          </p>
        ) : null}
        {work.description ? <p className={light ? 'mt-3 text-sm leading-6 text-stone-700' : 'mt-2 text-sm leading-6 text-white/68'}>{work.description}</p> : null}
        {[work.availability_status, work.price_label].filter(Boolean).length ? (
          <p className={light ? 'mt-3 text-xs uppercase tracking-[0.14em] text-[#9f5f31]' : 'mt-3 text-xs uppercase tracking-[0.14em] text-[#e0b115]'}>
            {[work.availability_status, work.price_label].filter(Boolean).join(' / ')}
          </p>
        ) : null}
      </div>
    </article>
  );
  return work.external_url ? (
    <PresenceTrackedLink
      slug={node.slug}
      href={work.external_url}
      eventType="work_clicked"
      metadata={{ title: work.title, url: work.external_url, work_id: work.id }}
      className="block"
    >
      {content}
    </PresenceTrackedLink>
  ) : (
    <a id={work.slug ? `work-${work.slug}` : undefined} href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`} className="block">
      {content}
    </a>
  );
}

export function PresenceGalleryGrid({ node, variant = 'light' }: { node: PresenceNode; variant?: 'light' | 'dark' }) {
  const works = visibleWorks(node);
  if (!works.length) return null;
  return (
    <section className={variant === 'light' ? 'py-8' : 'rounded-lg border border-white/12 bg-white/[0.07] p-4'}>
      <div className={variant === 'light' ? 'mb-5 flex items-end justify-between gap-4 border-t border-stone-300 pt-5' : 'mb-4 flex items-center gap-2'}>
        <h2 className={variant === 'light' ? 'text-sm font-semibold uppercase tracking-[0.16em] text-stone-700' : 'flex items-center gap-2 text-base font-semibold text-white'}>
          <Images className={variant === 'light' ? 'mr-2 inline h-4 w-4 text-[#9f5f31]' : 'h-4 w-4 text-[#e0b115]'} />
          Selected Works
        </h2>
        {variant === 'light' ? <p className="text-sm text-stone-500">{works.length} works</p> : null}
      </div>
      <div className={variant === 'light' ? 'grid gap-7 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>
        {works.map((work) => (
          <PresenceWorkCard key={work.id || `${work.title}-${work.sort_order}`} node={node} work={work} variant={variant} />
        ))}
      </div>
    </section>
  );
}

export function PresenceCollectionList({ node, variant = 'light' }: { node: PresenceNode; variant?: 'light' | 'dark' }) {
  const collections = visibleCollections(node);
  if (!collections.length) return null;
  const light = variant === 'light';
  return (
    <section className={light ? 'border-t border-stone-300 py-8' : 'rounded-lg border border-white/12 bg-white/[0.07] p-4'}>
      <h2 className={light ? 'flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-700' : 'flex items-center gap-2 text-base font-semibold text-white'}>
        <Layers className={light ? 'h-4 w-4 text-[#9f5f31]' : 'h-4 w-4 text-[#e0b115]'} />
        Collections
      </h2>
      <div className={light ? 'mt-5 grid gap-4 md:grid-cols-2' : 'mt-4 grid gap-3'}>
        {collections.map((collection: PresenceCollection) => (
          <a
            key={collection.id || collection.title}
            href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
            className={light ? 'grid gap-3 border-l border-stone-300 pl-4 hover:border-[#9f5f31]' : 'rounded-md border border-white/12 bg-[#1e0227]/48 p-4 hover:border-[#e0b115]/42'}
          >
            {collection.cover_image_url ? (
              <PresencePublicImage
                src={collection.cover_image_url}
                alt=""
                className={light ? 'aspect-[16/9] w-full object-cover' : 'aspect-[16/9] w-full rounded-md object-cover'}
                fallbackClassName={light ? 'flex aspect-[16/9] w-full items-center justify-center bg-stone-200 text-stone-500' : 'flex aspect-[16/9] w-full items-center justify-center rounded-md bg-white/[0.08] text-white/50'}
                fallbackLabel="Collection image"
              />
            ) : null}
            <div>
              <h3 className={light ? 'text-lg font-semibold text-stone-950' : 'text-sm font-semibold text-white'}>{collection.title}</h3>
              {collection.description ? <p className={light ? 'mt-2 text-sm leading-6 text-stone-700' : 'mt-2 text-sm leading-6 text-white/68'}>{collection.description}</p> : null}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export function PresenceWorkDetail({ node, work }: { node: PresenceNode; work: PresenceWork }) {
  const image = work.image_url || work.thumbnail_url;
  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        {image ? (
          <PresencePublicImage
            src={image}
            alt={work.title}
            className="aspect-[4/5] w-full bg-stone-200 object-cover"
            fallbackClassName="flex aspect-[4/5] w-full items-center justify-center bg-stone-200 text-stone-500"
            fallbackLabel="Work image"
          />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center bg-stone-200 text-stone-500">
            <Images className="h-8 w-8" />
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9f5f31]">Selected work</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-950">{work.title}</h1>
        {[work.year, work.medium, work.dimensions].filter(Boolean).length ? (
          <p className="mt-4 text-base leading-7 text-stone-600">{[work.year, work.medium, work.dimensions].filter(Boolean).join(' / ')}</p>
        ) : null}
        {work.description ? <p className="mt-5 text-base leading-8 text-stone-700">{work.description}</p> : null}
        {[work.availability_status, work.price_label].filter(Boolean).length ? (
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#9f5f31]">
            {[work.availability_status, work.price_label].filter(Boolean).join(' / ')}
          </p>
        ) : null}
        {work.exhibition_history ? (
          <section className="mt-8 border-t border-stone-300 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">Exhibition history</h2>
            <p className="mt-3 text-sm leading-7 text-stone-700">{work.exhibition_history}</p>
          </section>
        ) : null}
        {work.external_url ? (
          <PresenceTrackedLink
            slug={node.slug}
            href={work.external_url}
            eventType="work_clicked"
            metadata={{ title: work.title, url: work.external_url, work_id: work.id }}
            className="mt-7 inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-stone-100"
          >
            Open related link
            <ArrowUpRight className="h-4 w-4" />
          </PresenceTrackedLink>
        ) : null}
      </div>
    </article>
  );
}

export function PresenceCollectionDetail({ node, collection, works = [] }: { node: PresenceNode; collection: PresenceCollection; works?: PresenceWork[] }) {
  const detailNode: PresenceNode = { ...node, works };
  return (
    <article className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          {collection.cover_image_url ? (
            <PresencePublicImage
              src={collection.cover_image_url}
              alt={collection.title}
              className="aspect-[16/10] w-full bg-stone-200 object-cover"
              fallbackClassName="flex aspect-[16/10] w-full items-center justify-center bg-stone-200 text-stone-500"
              fallbackLabel="Collection image"
            />
          ) : (
            <div className="flex aspect-[16/10] w-full items-center justify-center bg-stone-200 text-stone-500">
              <Layers className="h-8 w-8" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9f5f31]">Collection</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-950">{collection.title}</h1>
          {collection.description ? <p className="mt-5 text-base leading-8 text-stone-700">{collection.description}</p> : null}
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#9f5f31]">{works.length} works</p>
        </div>
      </section>
      <PresenceGalleryGrid node={detailNode} variant="light" />
    </article>
  );
}

export function PresenceArtistGallery({ node, publicUrl }: PresenceNodeRendererProps) {
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  const services = visibleServices(node);
  const featuredWork = works[0] || null;
  const fieldWorks = works.slice(1, 10);
  const fieldLayout = [
    'left-[4%] top-[10%] w-[17%] aspect-[4/5]',
    'left-[20%] top-[2%] w-[25%] aspect-[5/4]',
    'left-[47%] top-[4%] w-[21%] aspect-[4/5]',
    'right-[8%] top-[9%] w-[16%] aspect-[5/4]',
    'left-[2%] bottom-[16%] w-[15%] aspect-square',
    'left-[19%] bottom-[6%] w-[18%] aspect-[4/5]',
    'right-[18%] bottom-[8%] w-[21%] aspect-[5/4]',
    'right-[2%] bottom-[16%] w-[14%] aspect-[4/5]',
    'left-[40%] bottom-[1%] w-[16%] aspect-square',
  ];
  const streamLayout = [
    { shell: 'xl:col-span-7', aspect: 'aspect-[16/10]' },
    { shell: 'xl:col-span-5', aspect: 'aspect-[5/6]' },
    { shell: 'xl:col-span-4', aspect: 'aspect-square' },
    { shell: 'xl:col-span-4', aspect: 'aspect-[4/5]' },
    { shell: 'xl:col-span-4', aspect: 'aspect-[5/4]' },
  ];
  const wallBackdrop = node.cover_image_url || node.landing_background_url || featuredWork?.image_url || featuredWork?.thumbnail_url;

  return (
    <main className="min-h-screen bg-[#020202] text-[#f5e7c4]">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative overflow-hidden border-b border-[#3b2a0d] bg-[#020202]">
        {wallBackdrop ? (
          <PresencePublicImage
            src={wallBackdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-12 blur-[1px]"
            fallbackClassName="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(255,216,77,0.08),transparent_38%),linear-gradient(135deg,#050505,#0f0a03_55%,#000000)]"
            fallbackLabel=""
            loading="eager"
          />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_40%,rgba(255,216,77,0.12),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.3),rgba(0,0,0,0.82)_68%,#020202_100%)]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-3 pt-6 sm:px-6 lg:px-8">
          <a href="#top" className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f3cf74]">{node.template?.name || 'Gallery Wall'}</a>
          <PresencePilotNav
            tone="dark"
            items={[
              { label: 'Wall', href: '#works' },
              { label: 'Rooms', href: '#collections' },
              { label: 'Texts', href: '#statement' },
              { label: 'Contact', href: '#contact' },
            ]}
          />
        </header>

        <div id="top" className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-2 sm:px-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:px-8">
          <div className="flex flex-col gap-6 lg:pt-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#f3cf74]/76">Immersive artist presence</p>
              <h1 className="mt-4 max-w-md text-4xl font-semibold leading-[0.95] text-[#ffe8a8] [text-shadow:0_0_18px_rgba(255,216,77,0.22)] sm:text-6xl">
                {node.display_name}
              </h1>
              {node.headline ? <p className="mt-4 max-w-sm text-sm leading-7 text-[#dfcfac]/80 sm:text-base">{node.headline}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
              <PresenceVCardButton slug={node.slug} />
              <PresenceCopyUrlButton publicUrl={publicUrl} />
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/68">
              <span>{works.length} selected works</span>
              <span>{collections.length} curated rooms</span>
              {node.visual_mood ? <span>{node.visual_mood}</span> : null}
            </div>
            {collections.length ? (
              <div className="rounded-[1.5rem] border border-[#4a3512] bg-black/36 p-5 backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffd84d]">Curated rooms</h2>
                <div className="mt-4 space-y-3">
                  {collections.slice(0, 4).map((collection, index) => {
                    const workCount = works.filter((work) => collection.id != null && work.collection_id === collection.id).length;
                    return (
                      <a
                        key={collection.id || collection.title}
                        href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                        className="block rounded-2xl border border-[#3d2b0c] bg-[#070707] px-4 py-3 transition hover:border-[#ffd84d]/64 hover:bg-[#0b0b0b]"
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/60">Room {String(index + 1).padStart(2, '0')} / {workCount} works</p>
                        <p className="mt-2 text-sm font-semibold text-[#fff4d4]">{collection.title}</p>
                        {collection.description ? <p className="mt-2 text-sm leading-6 text-[#d6c39a]/70">{collection.description}</p> : null}
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            {works.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
                {works.slice(0, 6).map((work, index) => {
                  const image = work.thumbnail_url || work.image_url;
                  const featured = index === 0;
                  return (
                    <a
                      key={work.id || `${work.title}-${work.sort_order}`}
                      href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                      className={`group rounded-[1.4rem] border border-[#4a3512] bg-[#080808] p-2 ${featured ? 'col-span-full' : ''}`}
                    >
                      <PresencePublicImage
                        src={image}
                        alt={work.title}
                        className={`w-full rounded-[1rem] object-cover ${featured ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}
                        fallbackClassName={`flex w-full items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#090909,#1f1606)] text-[#d6c39a]/62 ${featured ? 'aspect-[16/10]' : 'aspect-[4/5]'}`}
                        fallbackLabel="Work image pending"
                      />
                      <div className="px-2 pb-2 pt-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/62">{[work.year, work.medium].filter(Boolean).join(' / ') || 'Selected work'}</p>
                        <p className="mt-2 text-sm font-semibold text-[#fff4d4]">{work.title}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : null}

            <div className="relative hidden min-h-[42rem] lg:block">
              {fieldWorks.map((work, index) => {
                const image = work.thumbnail_url || work.image_url;
                return (
                  <a
                    key={work.id || `${work.title}-${work.sort_order}`}
                    href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                    className={`group absolute overflow-hidden rounded-[1.2rem] border border-[#2e210a] bg-black shadow-[0_0_18px_rgba(0,0,0,0.55)] transition hover:border-[#ffd84d]/78 ${fieldLayout[index % fieldLayout.length]}`}
                    style={{ animation: `presenceGalleryFloat ${11 + (index % 4)}s ease-in-out infinite`, animationDelay: `${index * 0.45}s` }}
                  >
                    <PresencePublicImage
                      src={image}
                      alt={work.title}
                      className="h-full w-full object-cover opacity-82 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#070707,#1a1205)] text-[#d6c39a]/62"
                      fallbackLabel="Work image pending"
                    />
                  </a>
                );
              })}

              {featuredWork ? (
                <a
                  href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(featuredWork.id || featuredWork.slug || featuredWork.title))}`}
                  className="group absolute left-1/2 top-1/2 block w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-[1.8rem] border border-[#ffd84d] bg-black p-2 shadow-[0_0_36px_rgba(255,216,77,0.28)]"
                  style={{ animation: 'presenceGalleryPulse 8s ease-in-out infinite' }}
                >
                  <PresencePublicImage
                    src={featuredWork.image_url || featuredWork.thumbnail_url}
                    alt={featuredWork.title}
                    className="aspect-[5/6] w-full rounded-[1.35rem] object-cover"
                    fallbackClassName="flex aspect-[5/6] w-full items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#090909,#201705)] text-[#d6c39a]/62"
                    fallbackLabel="Featured work"
                  />
                  <div className="flex flex-wrap items-end justify-between gap-3 px-3 pb-2 pt-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/62">Selected work</p>
                      <h2 className="mt-2 text-lg font-semibold text-[#fff4d4]">{featuredWork.title}</h2>
                      {[featuredWork.year, featuredWork.medium].filter(Boolean).length ? (
                        <p className="mt-2 text-sm text-[#d6c39a]/72">{[featuredWork.year, featuredWork.medium].filter(Boolean).join(' / ')}</p>
                      ) : null}
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-[#ffd84d]" />
                  </div>
                </a>
              ) : wallBackdrop ? (
                <div className="absolute inset-0 rounded-[2rem] border border-[#4a3512] bg-black/34 p-2">
                  <PresencePublicImage
                    src={wallBackdrop}
                    alt="Gallery wall"
                    className="h-full w-full rounded-[1.6rem] object-cover opacity-82"
                    fallbackClassName="flex h-full w-full items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#090909,#1f1606)] text-[#d6c39a]/62"
                    fallbackLabel="Gallery wall"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] border border-dashed border-[#4a3512] bg-black/34 p-8 text-center text-sm leading-7 text-[#d6c39a]/72">
                  The wall is open. Publish the first works to turn this presence into a gallery field.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-8">
        <div className="space-y-8">
          <section id="works" className="border-b border-[#342912] pb-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#c9b78b]/66">Gallery field</p>
                <h2 className="mt-3 text-2xl font-semibold text-[#fff4d4] sm:text-4xl">Selected works</h2>
              </div>
              <p className="text-sm text-[#d6c39a]/72">Artwork first. Text second.</p>
            </div>
            {works.length ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-12">
                {works.map((work, index) => {
                  const image = work.image_url || work.thumbnail_url;
                  const layout = streamLayout[index % streamLayout.length];
                  const roomLabel = collections.find((collection) => collection.id != null && collection.id === work.collection_id)?.title;
                  return (
                    <a
                      key={work.id || `${work.title}-${work.sort_order}`}
                      href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                      className={`group rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-2 transition hover:border-[#ffd84d]/72 hover:bg-[#0b0b0b] ${layout.shell}`}
                    >
                      <PresencePublicImage
                        src={image}
                        alt={work.title}
                        className={`w-full rounded-[1.15rem] object-cover ${layout.aspect}`}
                        fallbackClassName={`flex w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#090909,#1f1606)] text-[#d6c39a]/62 ${layout.aspect}`}
                        fallbackLabel="Work image pending"
                      />
                      <div className="flex flex-wrap items-start justify-between gap-3 px-2 pb-2 pt-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/62">
                            {[work.year, work.medium].filter(Boolean).join(' / ') || 'Selected work'}
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-[#fff4d4]">{work.title}</h3>
                          {work.description ? <p className="mt-2 text-sm leading-6 text-[#d6c39a]/72">{work.description}</p> : null}
                        </div>
                        <div className="text-right text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/62">
                          {roomLabel ? <p>{roomLabel}</p> : null}
                          {work.availability_status ? <p className="mt-1">{work.availability_status}</p> : null}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.6rem] border border-dashed border-[#4a3512] bg-[#070707] px-5 py-8 text-sm leading-7 text-[#d6c39a]/72">
                No selected works are visible yet. The gallery shell is ready for the first published image field.
              </div>
            )}
          </section>

          <section id="collections" className="border-b border-[#342912] pb-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#c9b78b]/66">
              <Layers className="h-4 w-4" />
              Curated rooms
            </div>
            {collections.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {collections.map((collection) => {
                  const roomWorks = works.filter((work) => collection.id != null && work.collection_id === collection.id);
                  return (
                    <a
                      key={collection.id || collection.title}
                      href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                      className="group rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-2 transition hover:border-[#ffd84d]/72 hover:bg-[#0b0b0b]"
                    >
                      <PresencePublicImage
                        src={collection.cover_image_url || roomWorks[0]?.image_url || roomWorks[0]?.thumbnail_url}
                        alt={collection.title}
                        className="aspect-[16/10] w-full rounded-[1.15rem] object-cover"
                        fallbackClassName="flex aspect-[16/10] w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#090909,#1f1606)] text-[#d6c39a]/62"
                        fallbackLabel="Collection image pending"
                      />
                      <div className="px-2 pb-2 pt-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/62">{roomWorks.length} works</p>
                        <h3 className="mt-2 text-lg font-semibold text-[#fff4d4]">{collection.title}</h3>
                        {collection.description ? <p className="mt-2 text-sm leading-6 text-[#d6c39a]/72">{collection.description}</p> : null}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-dashed border-[#4a3512] bg-[#070707] px-5 py-8 text-sm leading-7 text-[#d6c39a]/72">
                No curated rooms yet. Collections can hold a series, exhibition room, or thematic cluster without turning the wall into a directory.
              </div>
            )}
          </section>

          <section id="statement" className="grid gap-4 lg:grid-cols-2">
            {node.bio ? (
              <article className="rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">Wall text</h2>
                <div className="mt-4 text-sm leading-7 text-[#d6c39a]/78 [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.bio }} />
              </article>
            ) : null}
            {node.practice_statement ? (
              <article className="rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">
                  <Palette className="h-4 w-4 text-[#ffd84d]" />
                  Practice Statement
                </h2>
                <div className="mt-4 text-sm leading-7 text-[#d6c39a]/78 [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.practice_statement }} />
              </article>
            ) : null}
            {node.curatorial_statement ? (
              <article className="rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-6 lg:col-span-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">
                  <BookOpen className="h-4 w-4 text-[#ffd84d]" />
                  Curatorial Statement
                </h2>
                <div className="mt-4 max-w-3xl text-sm leading-7 text-[#d6c39a]/78 [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.curatorial_statement }} />
              </article>
            ) : null}
            {!node.bio && !node.practice_statement && !node.curatorial_statement ? (
              <article className="rounded-[1.6rem] border border-dashed border-[#4a3512] bg-[#070707] p-6 text-sm leading-7 text-[#d6c39a]/72 lg:col-span-2">
                Add a wall text, practice statement, or curatorial statement to deepen the atmosphere around the work.
              </article>
            ) : null}
          </section>

          {services.length ? (
            <section className="border-t border-[#342912] pt-8">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#c9b78b]/66">
                <ArrowUpRight className="h-4 w-4" />
                Commissions and offers
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <article key={`${service.title}-${service.sort_order}`} className="rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-5">
                    <h3 className="text-lg font-semibold text-[#fff4d4]">{service.title}</h3>
                    {service.description ? <p className="mt-3 text-sm leading-6 text-[#d6c39a]/72">{service.description}</p> : null}
                    {[service.price_label, service.duration_label].filter(Boolean).length ? (
                      <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#c9b78b]/62">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p>
                    ) : null}
                    {service.cta_url ? (
                      <PresenceTrackedLink
                        slug={node.slug}
                        href={service.cta_url}
                        eventType="service_clicked"
                        metadata={{ title: service.title, url: service.cta_url }}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ffd84d]"
                      >
                        {service.cta_label || 'Open offer'}
                        <ArrowUpRight className="h-4 w-4" />
                      </PresenceTrackedLink>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside id="contact" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">
              <Mail className="h-4 w-4 text-[#ffd84d]" />
              Enquiry desk
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#d6c39a]/74">Use this channel for commissions, exhibitions, acquisitions, and private viewings.</p>
            <div className="mt-4">
              <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} />
            </div>
          </section>
          <section className="rounded-[1.6rem] border border-[#4a3512] bg-[#070707] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">Share and save</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
              <PresenceVCardButton slug={node.slug} />
              <PresenceCopyUrlButton publicUrl={publicUrl} />
            </div>
            <div className="mt-4">
              <PresenceQRCode slug={node.slug} publicUrl={publicUrl} />
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        @keyframes presenceGalleryFloat {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -12px, 0); }
        }
        @keyframes presenceGalleryPulse {
          0%, 100% { box-shadow: 0 0 28px rgba(255, 216, 77, 0.22); }
          50% { box-shadow: 0 0 48px rgba(255, 216, 77, 0.42); }
        }
      `}</style>
    </main>
  );
}

export function PresenceMinimalPortal({ node, publicUrl }: PresenceNodeRendererProps) {
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  const services = visibleServices(node);
  const heroSlides = Array.from(
    new Map(
      [
        node.landing_background_url ? { src: node.landing_background_url, label: node.landing_title || node.display_name } : null,
        node.cover_image_url ? { src: node.cover_image_url, label: node.display_name } : null,
        node.profile_image_url ? { src: node.profile_image_url, label: node.display_name } : null,
        ...collections.map((collection) =>
          collection.cover_image_url ? { src: collection.cover_image_url, label: collection.title } : null,
        ),
        ...works.flatMap((work) =>
          [work.image_url, work.thumbnail_url, ...(work.gallery_images || [])]
            .filter((src): src is string => Boolean(src))
            .map((src) => ({ src, label: work.title })),
        ),
      ]
        .filter((item): item is { src: string; label: string } => Boolean(item?.src))
        .map((item) => [item.src, item]),
    ).values(),
  ).slice(0, 10);
  const portalCycleSeconds = Math.max(heroSlides.length, 1) * 5;
  const introCopy = node.landing_subtitle || node.headline;

  return (
    <main className="min-h-screen bg-[#030303] text-[#f8e7b4]">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#030303]">
        {heroSlides.length ? (
          heroSlides.map((slide, index) => (
            <div
              key={`${slide.src}-${index}`}
              className="absolute inset-0"
              style={
                heroSlides.length > 1
                  ? {
                      opacity: 0,
                      animation: `presenceMinimalPortalFade ${portalCycleSeconds}s linear infinite`,
                      animationDelay: `${index * 5}s`,
                    }
                  : { opacity: 0.82 }
              }
            >
              <PresencePublicImage
                src={slide.src}
                alt={slide.label}
                className="h-full w-full object-cover"
                fallbackClassName="h-full w-full bg-[radial-gradient(circle_at_50%_24%,rgba(255,216,77,0.16),transparent_35%),linear-gradient(135deg,#050505,#17110a_55%,#000000)]"
                fallbackLabel="Portal image pending"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(255,216,77,0.16),transparent_35%),linear-gradient(135deg,#050505,#17110a_55%,#000000)]" />
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,216,77,0.12),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.76)_72%,#030303_100%),linear-gradient(90deg,rgba(0,0,0,0.74),rgba(0,0,0,0.16)_55%,rgba(0,0,0,0.82))]" />

        <header className="relative z-10 flex items-start justify-between gap-4 px-4 pb-4 pt-6 sm:px-8">
          <div className="max-w-[16rem] sm:max-w-sm">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#f2cd6b]/72">{node.template?.name || 'Minimal Artist Portal'}</p>
            <a
              href="#top"
              className="mt-5 block text-5xl font-semibold leading-[0.9] text-[#ffd84d] [text-shadow:0_0_12px_rgba(255,216,77,0.72),0_0_34px_rgba(255,216,77,0.38)] sm:text-7xl"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {node.landing_title || node.display_name}
            </a>
          </div>
          <PresencePilotNav
            tone="dark"
            items={[
              { label: 'Works', href: '#works' },
              { label: 'Collections', href: '#collections' },
              { label: 'Statement', href: '#statement' },
              { label: 'Contact', href: '#contact' },
            ]}
          />
        </header>

        <div id="top" className="relative z-10 mt-auto px-4 pb-10 sm:px-8">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#f2cd6b]/74">{node.visual_mood || 'Public portfolio'}</p>
            <p className="mt-4 text-sm leading-7 text-[#f7ecd1]/82 sm:text-base">
              {introCopy || 'A quiet portal for selected works, living statements, and direct contact.'}
            </p>
          </div>
          <div className="mt-8 flex items-end justify-between gap-4">
            <div className="flex flex-wrap gap-2" aria-hidden="true">
              {Array.from({ length: heroSlides.length || 1 }).map((_, index) => (
                <span key={`portal-dot-${index}`} className="h-2.5 w-2.5 rounded-full bg-[#ffd84d]/78 shadow-[0_0_10px_rgba(255,216,77,0.65)]" />
              ))}
            </div>
            <a
              href="#presence-body"
              className="inline-flex items-center gap-2 rounded-full border border-[#ffd84d]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd84d] transition hover:bg-[#ffd84d] hover:text-black"
            >
              <DoorOpen className="h-4 w-4" />
              {node.landing_enter_label || 'Enter'}
            </a>
          </div>
        </div>
      </section>

      <div id="presence-body" className="border-t border-[#6c5320] bg-[#030303]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div className="space-y-8">
            <section className="grid gap-6 border-b border-[#342912] pb-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.8fr)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#f2cd6b]/66">Portal index</p>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[#fff4d4] sm:text-5xl">{node.headline || node.display_name}</h2>
                {node.bio ? (
                  <div
                    className="mt-5 max-w-2xl text-sm leading-7 text-[#f2e2bc]/80 [&_p+_p]:mt-3"
                    dangerouslySetInnerHTML={{ __html: node.bio }}
                  />
                ) : (
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-[#f2e2bc]/68">
                    This public portal is ready for first statements, collections, and selected works.
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-2">
                  <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
                  <PresenceVCardButton slug={node.slug} />
                  <PresenceCopyUrlButton publicUrl={publicUrl} />
                </div>
              </div>
              <div id="collections" className="rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-5">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#ffd84d]">
                  <Layers className="h-4 w-4" />
                  Collection index
                </h3>
                {collections.length ? (
                  <div className="mt-4 space-y-3">
                    {collections.map((collection, index) => {
                      const workCount = works.filter((work) => collection.id != null && work.collection_id === collection.id).length;
                      return (
                        <a
                          key={collection.id || collection.title}
                          href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                          className="block rounded-2xl border border-[#3f3115] bg-black/40 px-4 py-3 transition hover:border-[#ffd84d]/62 hover:bg-black/60"
                        >
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#f2cd6b]/62">{String(index + 1).padStart(2, '0')} / {workCount} works</p>
                          <p className="mt-2 text-sm font-semibold text-[#fff4d4]">{collection.title}</p>
                          {collection.description ? <p className="mt-2 text-sm leading-6 text-[#d6c39a]/72">{collection.description}</p> : null}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[#d6c39a]/72">
                    No collections published yet. The portal can still lead directly through individual works.
                  </p>
                )}
              </div>
            </section>

            <section id="works" className="border-b border-[#342912] pb-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#f2cd6b]/66">Selected images</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[#fff4d4] sm:text-4xl">Works and fragments</h2>
                </div>
                <p className="text-sm text-[#d6c39a]/72">{works.length} published works</p>
              </div>
              {works.length ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {works.slice(0, 9).map((work, index) => {
                    const image = work.image_url || work.thumbnail_url;
                    const collectionLabel = collections.find((collection) => collection.id != null && collection.id === work.collection_id)?.title;
                    const featured = index === 0;
                    return (
                      <a
                        key={work.id || `${work.title}-${work.sort_order}`}
                        href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                        className={`group rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-2 transition hover:border-[#ffd84d]/68 hover:bg-[#0c0c0c] ${featured ? 'sm:col-span-2' : ''}`}
                      >
                        <PresencePublicImage
                          src={image}
                          alt={work.title}
                          className={`w-full rounded-[1rem] object-cover ${featured ? 'aspect-[16/9]' : 'aspect-[4/5]'}`}
                          fallbackClassName={`flex w-full items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#101010,#1f1606)] text-[#d6c39a]/62 ${featured ? 'aspect-[16/9]' : 'aspect-[4/5]'}`}
                          fallbackLabel="Work image pending"
                        />
                        <div className="flex flex-wrap items-start justify-between gap-3 px-2 pb-2 pt-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#f2cd6b]/62">
                              {[work.year, work.medium].filter(Boolean).join(' / ') || 'Published work'}
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-[#fff4d4]">{work.title}</h3>
                            {work.description ? <p className="mt-2 text-sm leading-6 text-[#d6c39a]/72">{work.description}</p> : null}
                          </div>
                          <div className="text-right text-[11px] uppercase tracking-[0.18em] text-[#f2cd6b]/62">
                            {collectionLabel ? <p>{collectionLabel}</p> : null}
                            {work.availability_status ? <p className="mt-1">{work.availability_status}</p> : null}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.6rem] border border-dashed border-[#6c5320]/72 bg-[#080808] px-5 py-8 text-sm leading-7 text-[#d6c39a]/72">
                  No works are published yet. The landing portal is live and ready for the first image sequence.
                </div>
              )}
            </section>

            {services.length ? (
              <section className="border-b border-[#342912] pb-8">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#f2cd6b]/66">
                  <ArrowUpRight className="h-4 w-4" />
                  Offerings
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {services.map((service) => (
                    <article key={`${service.title}-${service.sort_order}`} className="rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-5">
                      <h3 className="text-lg font-semibold text-[#fff4d4]">{service.title}</h3>
                      {service.description ? <p className="mt-3 text-sm leading-6 text-[#d6c39a]/72">{service.description}</p> : null}
                      {[service.price_label, service.duration_label].filter(Boolean).length ? (
                        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#f2cd6b]/62">
                          {[service.price_label, service.duration_label].filter(Boolean).join(' / ')}
                        </p>
                      ) : null}
                      {service.cta_url ? (
                        <PresenceTrackedLink
                          slug={node.slug}
                          href={service.cta_url}
                          eventType="service_clicked"
                          metadata={{ title: service.title, url: service.cta_url }}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ffd84d]"
                        >
                          {service.cta_label || 'Open offer'}
                          <ArrowUpRight className="h-4 w-4" />
                        </PresenceTrackedLink>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section id="statement" className="grid gap-4 lg:grid-cols-2">
              {node.practice_statement ? (
                <article className="rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">
                    <Palette className="h-4 w-4 text-[#ffd84d]" />
                    Practice statement
                  </h2>
                  <div
                    className="mt-4 text-sm leading-7 text-[#d6c39a]/78 [&_p+_p]:mt-3"
                    dangerouslySetInnerHTML={{ __html: node.practice_statement }}
                  />
                </article>
              ) : null}
              {node.curatorial_statement ? (
                <article className="rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-6">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">
                    <BookOpen className="h-4 w-4 text-[#ffd84d]" />
                    Curatorial statement
                  </h2>
                  <div
                    className="mt-4 text-sm leading-7 text-[#d6c39a]/78 [&_p+_p]:mt-3"
                    dangerouslySetInnerHTML={{ __html: node.curatorial_statement }}
                  />
                </article>
              ) : null}
              {!node.practice_statement && !node.curatorial_statement ? (
                <article className="rounded-[1.6rem] border border-dashed border-[#6c5320]/72 bg-[#080808] p-6 text-sm leading-7 text-[#d6c39a]/72 lg:col-span-2">
                  Add a practice or curatorial statement to turn the portal into a richer editorial surface.
                </article>
              ) : null}
            </section>
          </div>

          <aside id="contact" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">
                <Mail className="h-4 w-4 text-[#ffd84d]" />
                Enquiry portal
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#d6c39a]/74">
                Use this channel for commissions, exhibitions, collaborations, and private viewings.
              </p>
              <div className="mt-4">
                <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} />
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-[#6c5320]/72 bg-[#080808] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#fff4d4]">Share and save</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
                <PresenceVCardButton slug={node.slug} />
                <PresenceCopyUrlButton publicUrl={publicUrl} />
              </div>
              <div className="mt-4">
                <PresenceQRCode slug={node.slug} publicUrl={publicUrl} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <style>{`
        @keyframes presenceMinimalPortalFade {
          0% { opacity: 0; }
          4% { opacity: 0.82; }
          30% { opacity: 0.82; }
          38% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>
    </main>
  );
}

export function PresenceEditorialPortfolio({ node, publicUrl }: PresenceNodeRendererProps) {
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  const services = visibleServices(node);
  const proof = (node.proof_items || []).filter((item) => item.is_public !== false);
  const credentials = (node.credentials || []).filter((item) => item.is_public !== false);
  const activeChips = (node.availability_chips || []).filter((chip) => chip.is_active !== false);
  const heroImage = node.cover_image_url || node.profile_image_url || works[0]?.image_url || works[0]?.thumbnail_url;
  const workLayouts = [
    { shell: 'xl:col-span-7', aspect: 'aspect-[16/10]' },
    { shell: 'xl:col-span-5', aspect: 'aspect-[4/5]' },
    { shell: 'xl:col-span-4', aspect: 'aspect-square' },
    { shell: 'xl:col-span-4', aspect: 'aspect-[5/6]' },
    { shell: 'xl:col-span-4', aspect: 'aspect-[5/4]' },
  ];
  const hasTrustSection = Boolean(node.proof_summary || proof.length || credentials.length);
  const statusLabel = node.status ? `${displayLabel(node.status, 'published')} dossier` : null;

  return (
    <main className="min-h-screen bg-[#f3ede3] text-[#14110d]">
      <PresenceSourceTracker slug={node.slug} />
      <header className="border-b-2 border-[#14110d] bg-[#f3ede3]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <a href="#top" className="truncate text-[11px] font-semibold uppercase tracking-[0.34em] text-[#14110d]">{node.template?.name || 'Editorial Portfolio'}</a>
            <div className="hidden h-5 w-px bg-[#14110d]/20 sm:block" />
            <p className="hidden text-[11px] uppercase tracking-[0.22em] text-[#746a5e] sm:block">Living public dossier</p>
          </div>
          <PresencePilotNav
            items={[
              { label: 'Dossier', href: '#statement' },
              { label: 'Projects', href: '#works' },
              { label: 'Issues', href: '#collections' },
              { label: 'Contact', href: '#contact' },
            ]}
          />
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[11rem_minmax(0,1fr)_18rem] lg:px-8">
        <aside className="border-b border-[#14110d] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#746a5e]">Dossier 01</p>
          <p className="mt-8 text-4xl font-semibold leading-[0.9] text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {node.display_name}
          </p>
          <div className="mt-8 space-y-3 border-t border-[#14110d]/14 pt-5 text-[11px] uppercase tracking-[0.22em] text-[#746a5e]">
            <p>{node.node_type.replace(/_/g, ' ')}</p>
            {statusLabel ? <p>{statusLabel}</p> : null}
            {node.plan_type ? <p>{displayLabel(node.plan_type, node.plan_type)}</p> : null}
          </div>
        </aside>

        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#8a6f46]">Point of view / Evidence / Contact</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[0.94] text-[#14110d] sm:text-6xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {node.headline || node.display_name}
          </h1>
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem]">
            {node.bio ? (
              <div id="about" className="max-w-2xl text-sm leading-8 text-[#2f2921] [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.bio }} />
            ) : (
              <p className="max-w-2xl text-sm leading-8 text-[#5f5548]">
                This dossier is ready to hold projects, proof, and public-facing editorial statements when they are published.
              </p>
            )}
            <div className="rounded-[1.4rem] border border-[#14110d] bg-[#14110d] p-5 text-[#f3ede3]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#d2b583]">Issue notes</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#e9dfcf]/84">
                <p>{works.length} selected works/projects</p>
                <p>{collections.length} issues or chapters</p>
                {activeChips.length ? <p>{activeChips[0]?.label}</p> : null}
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#works" className="inline-flex items-center gap-2 border-b border-[#14110d] pb-1 text-sm font-semibold uppercase tracking-[0.16em] text-[#14110d]">
              View selected work
              <ArrowUpRight className="h-4 w-4" />
            </a>
            {node.primary_cta_url ? (
              <PresenceTrackedLink
                slug={node.slug}
                href={node.primary_cta_url}
                eventType="link_clicked"
                metadata={{ label: node.primary_cta_label || 'Primary CTA', url: node.primary_cta_url }}
                className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#8a6f46]"
              >
                {node.primary_cta_label || 'Open brief'}
                <ArrowUpRight className="h-4 w-4" />
              </PresenceTrackedLink>
            ) : null}
          </div>
        </div>

        <aside className="border-t border-[#14110d] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#746a5e]">Public markers</p>
            <div className="flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <span key={`${chip.label}-${chip.sort_order}`} className="rounded-full border border-[#14110d]/18 bg-white/66 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#4c4338]">
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <figure className="grid gap-3 border-y border-[#14110d] py-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <PresencePublicImage
            src={heroImage}
            alt={node.display_name}
            className="aspect-[16/10] w-full bg-stone-200 object-cover"
            fallbackClassName="flex aspect-[16/10] w-full items-center justify-center bg-[linear-gradient(135deg,#ebe4d9,#d9d1c4)] text-[#746a5e]"
            fallbackLabel="Dossier image"
            loading="eager"
          />
          <figcaption className="grid gap-4 lg:pl-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8a6f46]">Lead image</p>
              <p className="mt-2 text-2xl font-semibold leading-tight text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {works[0]?.title || node.display_name}
              </p>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#5f5548]">
              {works[0]?.description || node.proof_summary || 'An editorial public face for meaningful projects, sharp thinking, and selective evidence.'}
            </p>
          </figcaption>
        </figure>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-8">
        <div className="space-y-8">
          <section id="statement" className="grid gap-4 border-t border-[#14110d] pt-8 lg:grid-cols-[9rem_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#746a5e]">02 / Position</p>
            </div>
            <div className="space-y-4">
              {node.practice_statement ? (
                <article className="border-l-2 border-[#14110d] pl-5">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#8a6f46]">Practice Statement</p>
                  <div className="mt-4 max-w-3xl text-lg leading-9 text-[#1f1a14] [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.practice_statement }} />
                </article>
              ) : null}
              {node.curatorial_statement ? (
                <article className="rounded-[1.4rem] border border-[#14110d] bg-[#14110d] px-6 py-5 text-[#f3ede3]">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#d2b583]">Curatorial Statement</p>
                  <div className="mt-4 max-w-3xl text-base leading-8 text-[#e9dfcf]/88 [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.curatorial_statement }} />
                </article>
              ) : null}
              {!node.practice_statement && !node.curatorial_statement ? (
                <article className="rounded-[1.4rem] border border-dashed border-[#14110d]/28 bg-white/54 px-6 py-5 text-sm leading-7 text-[#5f5548]">
                  Add a practice or curatorial statement to turn this page into a sharper public dossier.
                </article>
              ) : null}
            </div>
          </section>

          <section id="works" className="grid gap-4 border-t border-[#14110d] pt-8 lg:grid-cols-[9rem_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#746a5e]">03 / Evidence</p>
            </div>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-3xl font-semibold leading-tight text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Selected works and projects</h2>
                <p className="text-[11px] uppercase tracking-[0.26em] text-[#8a6f46]">Case-study rhythm</p>
              </div>
              {works.length ? (
                <div className="mt-6 grid gap-5 xl:grid-cols-12">
                  {works.map((work, index) => {
                    const image = work.thumbnail_url || work.image_url;
                    const layout = workLayouts[index % workLayouts.length];
                    const issueLabel = collections.find((collection) => collection.id != null && collection.id === work.collection_id)?.title;
                    return (
                      <a
                        key={work.id || `${work.title}-${work.sort_order}`}
                        href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                        className={`group rounded-[1.6rem] border border-[#14110d] bg-[#fcf8f1] p-2 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(20,17,13,0.08)] ${layout.shell}`}
                      >
                        <PresencePublicImage
                          src={image}
                          alt={work.title}
                          className={`w-full bg-stone-200 object-cover ${layout.aspect}`}
                          fallbackClassName={`flex w-full items-center justify-center bg-[linear-gradient(135deg,#ebe4d9,#d9d1c4)] text-[#746a5e] ${layout.aspect}`}
                          fallbackLabel="Case-study image"
                        />
                        <div className="grid gap-4 px-3 pb-3 pt-4 lg:grid-cols-[4.5rem_minmax(0,1fr)]">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[#8a6f46]">
                            <p>{String(index + 1).padStart(2, '0')}</p>
                            {work.year ? <p className="mt-2">{work.year}</p> : null}
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[#746a5e]">{[issueLabel, work.medium].filter(Boolean).join(' / ') || 'Selected work'}</p>
                            <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{work.title}</h3>
                            {work.description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3a332a]">{work.description}</p> : null}
                            {[work.availability_status, work.price_label].filter(Boolean).length ? (
                              <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#8a6f46]">{[work.availability_status, work.price_label].filter(Boolean).join(' / ')}</p>
                            ) : null}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.4rem] border border-dashed border-[#14110d]/28 bg-white/54 px-6 py-5 text-sm leading-7 text-[#5f5548]">
                  No selected works are visible yet. Publish the first projects to turn this into a living editorial record.
                </div>
              )}
            </div>
          </section>

          <section id="collections" className="grid gap-4 border-t border-[#14110d] pt-8 lg:grid-cols-[9rem_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#746a5e]">04 / Issues</p>
            </div>
            <div>
              {collections.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {collections.map((collection, index) => {
                    const issueWorks = works.filter((work) => collection.id != null && work.collection_id === collection.id);
                    return (
                      <a
                        key={collection.id || collection.title}
                        href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                        className="group rounded-[1.6rem] border border-[#14110d] bg-[#fcf8f1] p-2 transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(20,17,13,0.08)]"
                      >
                        <PresencePublicImage
                          src={collection.cover_image_url || issueWorks[0]?.image_url || issueWorks[0]?.thumbnail_url}
                          alt={collection.title}
                          className="aspect-[16/10] w-full bg-stone-200 object-cover"
                          fallbackClassName="flex aspect-[16/10] w-full items-center justify-center bg-[linear-gradient(135deg,#ebe4d9,#d9d1c4)] text-[#746a5e]"
                          fallbackLabel="Issue image"
                        />
                        <div className="grid gap-4 px-3 pb-3 pt-4 lg:grid-cols-[4.5rem_minmax(0,1fr)]">
                          <div className="text-[11px] uppercase tracking-[0.24em] text-[#8a6f46]">Issue {String(index + 1).padStart(2, '0')}</div>
                          <div>
                            <h3 className="text-2xl font-semibold leading-tight text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{collection.title}</h3>
                            <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#746a5e]">{issueWorks.length} works in dossier</p>
                            {collection.description ? <p className="mt-3 text-sm leading-7 text-[#3a332a]">{collection.description}</p> : null}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-[#14110d]/28 bg-white/54 px-6 py-5 text-sm leading-7 text-[#5f5548]">
                  No issues or chapters yet. Collections can hold a campaign sequence, research thread, or curated chapter when ready.
                </div>
              )}
            </div>
          </section>

          {services.length ? (
            <section id="services" className="grid gap-4 border-t border-[#14110d] pt-8 lg:grid-cols-[9rem_minmax(0,1fr)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#746a5e]">05 / Engagements</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <article key={`${service.title}-${service.sort_order}`} className="rounded-[1.4rem] border border-[#14110d] bg-[#14110d] px-5 py-5 text-[#f3ede3]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#d2b583]">Available commission</p>
                    <h3 className="mt-3 text-2xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{service.title}</h3>
                    {service.description ? <p className="mt-3 text-sm leading-7 text-[#e9dfcf]/84">{service.description}</p> : null}
                    {[service.price_label, service.duration_label].filter(Boolean).length ? (
                      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#d2b583]">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {hasTrustSection ? (
            <section className="grid gap-4 border-t border-[#14110d] pt-8 lg:grid-cols-[9rem_minmax(0,1fr)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#746a5e]">06 / Trust</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {node.proof_summary ? (
                  <article className="rounded-[1.4rem] border border-[#14110d] bg-[#14110d] px-6 py-5 text-[#f3ede3] md:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#d2b583]">Proof summary</p>
                    <p className="mt-4 max-w-3xl text-base leading-8 text-[#e9dfcf]/88">{node.proof_summary}</p>
                  </article>
                ) : null}
                {proof.map((item, index) => (
                  <article key={item.id || item.title} className="rounded-[1.4rem] border border-[#14110d] bg-[#fcf8f1] px-5 py-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a6f46]">Proof {String(index + 1).padStart(2, '0')}</p>
                    <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                    {item.outcome ? <p className="mt-3 text-sm leading-7 text-[#3a332a]">{item.outcome}</p> : item.challenge ? <p className="mt-3 text-sm leading-7 text-[#3a332a]">{item.challenge}</p> : null}
                    {item.testimonial ? <blockquote className="mt-4 border-l-2 border-[#8a6f46] pl-4 text-sm italic leading-7 text-[#5f5548]">“{item.testimonial}”</blockquote> : null}
                  </article>
                ))}
                {credentials.map((item) => (
                  <article key={item.id || item.title} className="rounded-[1.4rem] border border-[#14110d] bg-white/66 px-5 py-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a6f46]">Credential</p>
                    <h3 className="mt-3 text-xl font-semibold leading-tight text-[#14110d]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#3a332a]">{[item.issuer, item.credential_type].filter(Boolean).join(' / ')}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside id="contact" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-[1.5rem] border border-[#14110d] bg-[#14110d] p-5 text-[#f3ede3]">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#d2b583]">Editorial brief</p>
            <p className="mt-4 text-2xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {node.primary_cta_label || 'Open an enquiry'}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#e9dfcf]/82">
              Use this channel for commissions, campaigns, advisory work, cultural direction, collaborations, and research-led briefs.
            </p>
            <div className="mt-4">
              <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[#14110d] bg-white/66 p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8a6f46]">Share / save</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone="light" />
              <PresenceVCardButton slug={node.slug} tone="light" />
              <PresenceCopyUrlButton publicUrl={publicUrl} tone="light" />
            </div>
            <div className="mt-4">
              <PresenceQRCode slug={node.slug} publicUrl={publicUrl} tone="light" />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function PresenceStudioPractice({ node, publicUrl }: PresenceNodeRendererProps) {
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  const services = visibleServices(node);
  const proof = (node.proof_items || []).filter((item) => item.is_public !== false);
  const credentials = (node.credentials || []).filter((item) => item.is_public !== false);
  const activeChips = (node.availability_chips || []).filter((chip) => chip.is_active !== false);
  const heroImage = node.cover_image_url || node.profile_image_url || works[0]?.image_url || works[0]?.thumbnail_url;
  const thresholdImages = [node.profile_image_url, ...works.map((work) => work.thumbnail_url || work.image_url).filter(Boolean)].filter(Boolean).slice(0, 2) as string[];
  const studioFacts = [node.location_label, node.service_area, works[0]?.medium, activeChips[0]?.label].filter(Boolean) as string[];
  const hasTrustSection = Boolean(node.proof_summary || proof.length || credentials.length);

  return (
    <main className="min-h-screen bg-[#e7dbcd] text-[#241a15]">
      <PresenceSourceTracker slug={node.slug} />

      <section id="top" className="relative overflow-hidden border-b border-[#6b5240]/28 bg-[#2d211a] text-[#f5ecdf]">
        <PresencePublicImage
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-36"
          fallbackClassName="absolute inset-0 bg-[linear-gradient(135deg,#4e3c2f,#241913)]"
          fallbackLabel=""
          loading="eager"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(230,196,154,0.22),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(136,91,63,0.24),transparent_26%),linear-gradient(135deg,rgba(24,18,14,0.9),rgba(45,33,26,0.76)_48%,rgba(24,18,14,0.92))]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent,rgba(45,33,26,0.94))]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <a href="#top" className="truncate text-[11px] font-semibold uppercase tracking-[0.32em] text-white/88">{node.template?.name || 'Studio Practice'}</a>
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#dbc1a1]">Public threshold / living body of work</p>
            </div>
            <PresencePilotNav
              tone="dark"
              items={[
                { label: 'Method', href: '#practice' },
                { label: 'Works', href: '#works' },
                { label: 'Bodies', href: '#collections' },
                { label: 'Contact', href: '#contact' },
              ]}
            />
          </div>
        </header>

        {/* STUDIO WALL COMPOSITION — graph paper grid, taped polaroids, index-card identity */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          {/* Graph-paper grid backdrop, very subtle */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 31px, rgba(220,196,158,0.6) 31px 32px), repeating-linear-gradient(0deg, transparent 0 31px, rgba(220,196,158,0.6) 31px 32px)',
            }}
          />

          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
            {/* Identity column — index card on a wall */}
            <div className="relative">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[#dbc1a1]">
                <span className="inline-block h-px w-6 bg-[#dbc1a1]/60" />
                Studio threshold
              </p>

              {/* The index card — slightly rotated, paper background, deep shadow */}
              <div
                className="mt-6 inline-block max-w-2xl bg-[#fbf3e3] px-7 py-7 text-[#2d211a] shadow-[0_28px_60px_-20px_rgba(0,0,0,0.55),0_8px_20px_-8px_rgba(0,0,0,0.4)] sm:-rotate-[1.25deg]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(116,82,52,0.04) 1px, transparent 1px)',
                  backgroundSize: '100% 28px',
                }}
              >
                {/* Tape strip top-left */}
                <span
                  aria-hidden
                  className="absolute -top-3 left-8 h-5 w-16 bg-[#e9d6a8]/85 shadow-[0_2px_3px_rgba(0,0,0,0.2)]"
                  style={{ transform: 'rotate(-6deg)' }}
                />
                <h1
                  className="text-[2.6rem] font-semibold leading-[0.92] sm:text-6xl"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {node.headline || node.display_name}
                </h1>
                <p
                  className="mt-3 text-xs uppercase tracking-[0.26em] text-[#7b5942]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  — {node.display_name}
                </p>
                {node.bio ? (
                  <div
                    className="mt-5 max-w-xl text-sm leading-7 text-[#3a2c20] [&_p+_p]:mt-3"
                    dangerouslySetInnerHTML={{ __html: node.bio }}
                  />
                ) : (
                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#5a4638]">
                    A living studio page for process, atmosphere, materials, and the work that keeps unfolding in public.
                  </p>
                )}
              </div>

              {/* CTAs — handled as marginalia, not standard buttons */}
              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#works"
                  className="group inline-flex items-center gap-2 border-b border-[#f5ecdf] pb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f1e8] transition hover:border-[#dbc1a1] hover:text-[#dbc1a1]"
                >
                  <DoorOpen className="h-4 w-4" />
                  Enter the workroom
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
                <a
                  href="#contact"
                  className="group inline-flex items-center gap-2 border-b border-[#dbc1a1]/40 pb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#dbc1a1] transition hover:border-[#f5ecdf] hover:text-[#f5ecdf]"
                >
                  <Mail className="h-4 w-4" />
                  Start a conversation
                </a>
              </div>

              {/* Studio facts as pinned paper labels with tiny pin */}
              {studioFacts.length ? (
                <div className="mt-9 flex flex-wrap gap-3">
                  {studioFacts.map((fact, idx) => (
                    <span
                      key={fact}
                      className="relative inline-block bg-[#fbf3e3] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#5a4638] shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                      style={{
                        transform: `rotate(${(idx % 2 === 0 ? -1 : 1) * (1 + idx * 0.3)}deg)`,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#9a3412] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      />
                      {fact}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Studio wall — polaroid mosaic with hand-pinned feel */}
            <div className="relative h-[460px] sm:h-[560px] lg:h-[600px]">
              {(() => {
                const wallImages = [
                  node.profile_image_url,
                  ...works.map((w) => w.thumbnail_url || w.image_url).filter(Boolean),
                ]
                  .filter(Boolean)
                  .slice(0, 4) as string[];
                while (wallImages.length < 4) wallImages.push(''); // placeholder slots
                const positions: Array<{ top: string; left?: string; right?: string; width: string; rotate: string; z: number }> = [
                  { top: '0%', left: '4%', width: '52%', rotate: '-4deg', z: 3 },
                  { top: '8%', right: '2%', width: '44%', rotate: '5deg', z: 2 },
                  { top: '52%', left: '14%', width: '46%', rotate: '-1.5deg', z: 4 },
                  { top: '58%', right: '6%', width: '44%', rotate: '3deg', z: 1 },
                ];
                const labels = [
                  node.display_name,
                  works[0]?.title,
                  works[1]?.title,
                  works[2]?.title,
                ];
                return wallImages.map((image, index) => {
                  const p = positions[index];
                  return (
                    <div
                      key={`${image || 'empty'}-${index}`}
                      className="absolute"
                      style={{
                        top: p.top,
                        left: p.left,
                        right: p.right,
                        width: p.width,
                        transform: `rotate(${p.rotate})`,
                        zIndex: p.z,
                      }}
                    >
                      {/* Tape strip across the top of polaroid */}
                      <span
                        aria-hidden
                        className="absolute -top-2 left-1/2 h-4 w-14 bg-[#e9d6a8]/80 shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
                        style={{ transform: `translateX(-50%) rotate(${index % 2 === 0 ? -4 : 5}deg)` }}
                      />
                      {/* Polaroid frame */}
                      <div className="bg-[#fbf3e3] p-2 pb-7 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55),0_4px_10px_rgba(0,0,0,0.3)]">
                        <PresencePublicImage
                          src={image || undefined}
                          alt={labels[index] || `Studio fragment ${index + 1}`}
                          className="aspect-[4/5] w-full bg-stone-200 object-cover"
                          fallbackClassName="flex aspect-[4/5] w-full items-center justify-center bg-[linear-gradient(135deg,#e7ddd1,#d5c8b9)] text-[10px] uppercase tracking-[0.18em] text-[#7b695c]"
                          fallbackLabel={index === 0 ? 'Studio portrait' : `Fragment ${String(index + 1).padStart(2, '0')}`}
                        />
                        <p
                          className="mt-2 truncate px-1 text-[10px] uppercase tracking-[0.2em] text-[#5a4638]"
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                          Fragment {String(index + 1).padStart(2, '0')}
                          {labels[index] ? ` — ${labels[index]}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
              {/* Hand-written annotation label */}
              <span
                aria-hidden
                className="absolute -bottom-2 left-2 text-[11px] uppercase tracking-[0.32em] text-[#dbc1a1]/70"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                — wall / bench / notes
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section id="practice" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <article className="rounded-[2rem] border border-[#6b5240]/22 bg-[#f5ede1] p-6 shadow-[0_22px_50px_rgba(84,61,44,0.08)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#8b6247]">
              <Layers className="h-4 w-4" />
              Studio method
            </div>
            {node.practice_statement ? (
              <div className="mt-5 max-w-3xl text-lg leading-9 text-[#241a15] [&_p+_p]:mt-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }} dangerouslySetInnerHTML={{ __html: node.practice_statement }} />
            ) : (
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#5a4638]">
                Add a practice statement to show the method, material logic, and point of view behind the studio.
              </p>
            )}
          </article>

          <div className="space-y-4">
            <article className="rounded-[1.5rem] border border-[#6b5240]/22 bg-[#e0d1c0] p-5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#7b5942]">
                <BookOpen className="h-4 w-4" />
                Context / lens / notes
              </div>
              {node.curatorial_statement ? (
                <div className="mt-4 text-sm leading-7 text-[#2f241d] [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.curatorial_statement }} />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#5f4b3d]">
                  Curatorial notes can sit here as atmosphere, framing, and context when the owner is ready to publish them.
                </p>
              )}
            </article>
            {activeChips.length ? (
              <article className="rounded-[1.5rem] border border-[#6b5240]/22 bg-white/50 p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#7b5942]">
                  <Palette className="h-4 w-4" />
                  Practice markers
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeChips.map((chip) => (
                    <span key={`${chip.label}-${chip.sort_order}`} className="rounded-full border border-[#6b5240]/18 bg-[#f7f2ea] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#5a4638]">
                      {chip.label}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section id="works" className="mt-10 border-t border-[#6b5240]/22 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8b6247]">Fragments / pieces / studies</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Work on the wall and bench
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#5a4638]">A studio page should feel active. These works read as fragments of an ongoing body, not just thumbnails in a grid.</p>
          </div>

          {works.length ? (
            <div className="mt-6 space-y-6">
              {works.map((work, index) => {
                const collectionLabel = collections.find((collection) => collection.id != null && collection.id === work.collection_id)?.title;
                const image = work.thumbnail_url || work.image_url;
                const imageOrder = index % 2 === 0 ? 'lg:order-1' : 'lg:order-2';
                const noteOrder = index % 2 === 0 ? 'lg:order-2' : 'lg:order-1';
                return (
                  <a
                    key={work.id || `${work.title}-${work.sort_order}`}
                    href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                    className="group grid gap-4 rounded-[1.75rem] border border-[#6b5240]/24 bg-[#f6efe5] p-3 shadow-[0_18px_42px_rgba(79,57,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(79,57,42,0.12)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
                  >
                    <div className={imageOrder}>
                      <PresencePublicImage
                        src={image}
                        alt={work.title}
                        className="aspect-[4/5] w-full rounded-[1.2rem] bg-stone-200 object-cover"
                        fallbackClassName="flex aspect-[4/5] w-full items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,#e7ddd1,#d5c8b9)] text-[#7b695c]"
                        fallbackLabel="Studio fragment"
                      />
                    </div>
                    <div className={`${noteOrder} flex items-center`}>
                      <article className="w-full rounded-[1.35rem] border border-[#6b5240]/18 bg-[#ede1d1] p-5 sm:p-6">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b6247]">Fragment {String(index + 1).padStart(2, '0')}</p>
                        <h3 className="mt-3 text-3xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{work.title}</h3>
                        {[work.year, work.medium, work.dimensions].filter(Boolean).length ? (
                          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#665041]">{[work.year, work.medium, work.dimensions].filter(Boolean).join(' / ')}</p>
                        ) : null}
                        {work.description ? (
                          <p className="mt-4 text-sm leading-7 text-[#3e3027]">{work.description}</p>
                        ) : (
                          <p className="mt-4 text-sm leading-7 text-[#5f4b3d]">Open this fragment for the fuller notes, process, and public detail.</p>
                        )}
                        <div className="mt-5 flex flex-wrap gap-2">
                          {collectionLabel ? <span className="rounded-full border border-[#6b5240]/18 bg-[#f7f2ea] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#5a4638]">{collectionLabel}</span> : null}
                          {work.availability_status ? <span className="rounded-full border border-[#6b5240]/18 bg-[#f7f2ea] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#5a4638]">{work.availability_status}</span> : null}
                          {work.price_label ? <span className="rounded-full border border-[#6b5240]/18 bg-[#f7f2ea] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#5a4638]">{work.price_label}</span> : null}
                        </div>
                      </article>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#6b5240]/24 bg-[#f5ede1] px-6 py-5 text-sm leading-7 text-[#5f4b3d]">
              No public fragments yet. Publish the first works to turn this page into a living studio threshold.
            </div>
          )}
        </section>

        <section id="collections" className="mt-10 border-t border-[#6b5240]/22 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8b6247]">Shelves / rooms / series</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Bodies of work
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#5a4638]">Collections read like rooms inside the studio: chapters, shelves, seasons, or recurring material conversations.</p>
          </div>

          {collections.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {collections.map((collection, index) => {
                const issueWorks = works.filter((work) => collection.id != null && work.collection_id === collection.id);
                return (
                  <a
                    key={collection.id || collection.title}
                    href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                    className="group rounded-[1.55rem] border border-[#6b5240]/24 bg-[#efe4d4] p-3 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(79,57,42,0.10)]"
                  >
                    <PresencePublicImage
                      src={collection.cover_image_url || issueWorks[0]?.image_url || issueWorks[0]?.thumbnail_url}
                      alt={collection.title}
                      className="aspect-[4/3] w-full rounded-[1.1rem] bg-stone-200 object-cover"
                      fallbackClassName="flex aspect-[4/3] w-full items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,#e7ddd1,#d5c8b9)] text-[#7b695c]"
                      fallbackLabel="Studio shelf"
                    />
                    <div className="mt-4 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-[#7b5942]">
                      <span>Shelf {String(index + 1).padStart(2, '0')}</span>
                      <span>{issueWorks.length} pieces</span>
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{collection.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#4b3a2f]">{collection.description || 'Open this body of work for related fragments, context, and sequence.'}</p>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#6b5240]/24 bg-[#f5ede1] px-6 py-5 text-sm leading-7 text-[#5f4b3d]">
              No shelves are public yet. Collections can hold a room, series, season, or body of work when they are ready.
            </div>
          )}
        </section>

        {services.length ? (
          <section id="services" className="mt-10 border-t border-[#6b5240]/22 pt-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8b6247]">Commissions / visits / workshops</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Ways into the practice
              </h2>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {services.map((service, index) => (
                <article key={`${service.title}-${service.sort_order}`} className="rounded-[1.55rem] border border-[#6b5240]/24 bg-[#35271f] px-5 py-5 text-[#f5ecdf]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#dbc1a1]">Invitation {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{service.title}</h3>
                  {service.description ? <p className="mt-3 text-sm leading-7 text-[#f5ecdf]/78">{service.description}</p> : null}
                  {[service.price_label, service.duration_label].filter(Boolean).length ? <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-[#dbc1a1]">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p> : null}
                  {service.cta_url ? (
                    <PresenceTrackedLink
                      slug={node.slug}
                      href={service.cta_url}
                      eventType="service_clicked"
                      metadata={{ title: service.title, url: service.cta_url }}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#f8e5ce]"
                    >
                      {service.cta_label || 'Open studio invitation'}
                      <ArrowUpRight className="h-4 w-4" />
                    </PresenceTrackedLink>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {hasTrustSection ? (
          <section id="statement" className="mt-10 border-t border-[#6b5240]/22 pt-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8b6247]">Public notes / trust</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                What supports the work
              </h2>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {node.proof_summary ? (
                <article className="rounded-[1.5rem] border border-[#6b5240]/24 bg-[#f6efe5] px-5 py-5 md:col-span-2 xl:col-span-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#8b6247]">
                    <Sparkles className="h-4 w-4" />
                    Proof summary
                  </div>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#3f3026]">{node.proof_summary}</p>
                </article>
              ) : null}
              {proof.map((item, index) => (
                <article key={item.id || item.title} className="rounded-[1.5rem] border border-[#6b5240]/24 bg-[#efe4d4] px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8b6247]">Note {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                  {item.outcome ? <p className="mt-3 text-sm leading-7 text-[#3f3026]">{item.outcome}</p> : item.challenge ? <p className="mt-3 text-sm leading-7 text-[#3f3026]">{item.challenge}</p> : null}
                  {item.testimonial ? <blockquote className="mt-4 border-l-2 border-[#8b6247] pl-4 text-sm italic leading-7 text-[#5f4b3d]">“{item.testimonial}”</blockquote> : null}
                </article>
              ))}
              {credentials.map((item) => (
                <article key={item.id || item.title} className="rounded-[1.5rem] border border-[#6b5240]/24 bg-white/55 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8b6247]">Credential</p>
                  <h3 className="mt-3 text-xl font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#3f3026]">{[item.issuer, item.credential_type].filter(Boolean).join(' / ')}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section id="contact" className="mt-10 border-t border-[#6b5240]/22 pt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <article className="rounded-[1.8rem] border border-[#6b5240]/24 bg-[#2d211a] p-6 text-[#f5ecdf] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-[#dbc1a1]">
                <Mail className="h-4 w-4" />
                Studio enquiry
              </div>
              <h2 className="mt-4 text-3xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Bring a brief, a collaboration, a studio visit, or a question.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f5ecdf]/76">
                Use this doorway for commissions, sessions, workshops, collaborations, releases, or a first conversation about the work.
              </p>
              <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/6 p-4 sm:p-5">
                <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} tone="light" />
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <article className="rounded-[1.5rem] border border-[#6b5240]/24 bg-[#f6efe5] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b6247]">Share / save</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone="light" />
                  <PresenceVCardButton slug={node.slug} tone="light" />
                  <PresenceCopyUrlButton publicUrl={publicUrl} tone="light" />
                </div>
                <div className="mt-4">
                  <PresenceQRCode slug={node.slug} publicUrl={publicUrl} tone="light" />
                </div>
              </article>
              {node.primary_cta_url ? (
                <article className="rounded-[1.5rem] border border-[#6b5240]/24 bg-[#e0d1c0] p-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#7b5942]">Additional doorway</p>
                  <PresenceTrackedLink
                    slug={node.slug}
                    href={node.primary_cta_url}
                    eventType="link_clicked"
                    metadata={{ label: node.primary_cta_label || 'Primary CTA', url: node.primary_cta_url }}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#2f241d]"
                  >
                    {node.primary_cta_label || 'Open studio notes'}
                    <ArrowUpRight className="h-4 w-4" />
                  </PresenceTrackedLink>
                </article>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PresencePremiumProfile({ node, publicUrl }: PresenceNodeRendererProps) {
  return (
    <main className="min-h-screen bg-[#1e0227] text-white">
      <PresenceSourceTracker slug={node.slug} />
      <PresenceProfileHeader node={node} publicUrl={publicUrl} />

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div className="space-y-4">
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <PresenceAvailabilityChips chips={node.availability_chips} />
            {node.bio ? (
              <div
                className="mt-4 text-base leading-8 text-white/78 [&_a]:text-[#e0b115] [&_p+_p]:mt-3"
                dangerouslySetInnerHTML={{ __html: node.bio }}
              />
            ) : (
              <p className="text-sm leading-6 text-white/64">This Presence Node is published and ready for direct enquiries.</p>
            )}
          </section>
          <PresenceLinks node={node} />
          <PresenceServices node={node} />
          <PresencePracticeStatement node={node} />
          <PresencePortfolio node={node} />
          <PresenceGalleryGrid node={node} variant="dark" />
          <PresenceCollectionList node={node} variant="dark" />
          {(node.sections || []).map((section) =>
            section.content ? (
              <section key={`${section.section_type}-${section.sort_order}`} className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
                {section.title ? <h2 className="text-base font-semibold text-white">{section.title}</h2> : null}
                <div
                  className="mt-3 text-sm leading-7 text-white/72"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </section>
            ) : null,
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Mail className="h-4 w-4 text-[#e0b115]" />
              Enquire
            </h2>
            <div className="mt-4">
              <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} />
            </div>
          </section>
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <h2 className="text-base font-semibold text-white">Save and share</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
              <PresenceVCardButton slug={node.slug} />
              <PresenceCopyUrlButton publicUrl={publicUrl} />
            </div>
            <div className="mt-4">
              <PresenceQRCode slug={node.slug} publicUrl={publicUrl} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function PresencePractitionerPresence({ node, publicUrl }: PresenceNodeRendererProps) {
  const services = visibleServices(node);
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  const proof = (node.proof_items || []).filter((item) => item.is_public !== false);
  const credentials = (node.credentials || []).filter((item) => item.is_public !== false);
  const activeChips = (node.availability_chips || []).filter((chip) => chip.is_active !== false);
  const cover = node.cover_image_url || node.profile_image_url || works[0]?.image_url || works[0]?.thumbnail_url;
  const imageNotes = [node.profile_image_url, works[0]?.thumbnail_url || works[0]?.image_url].filter(Boolean) as string[];
  const contextFacts = [node.location_label, node.service_area, node.organisation?.name].filter(Boolean) as string[];
  const hasTrustSection = Boolean(node.proof_summary || proof.length || credentials.length);
  const hasDocumentation = Boolean(works.length || collections.length);

  return (
    <main className="min-h-screen bg-[#f5f0e7] text-[#2b2a26]">
      <PresenceSourceTracker slug={node.slug} />

      <section id="top" className="relative overflow-hidden border-b border-[#d8cebf] bg-[#eef1ea]">
        <PresencePublicImage
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-18"
          fallbackClassName="absolute inset-0 bg-[linear-gradient(135deg,#e8e1d6,#d9e2d3)]"
          fallbackLabel=""
          loading="eager"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(242,216,191,0.78),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(197,216,197,0.64),transparent_28%),linear-gradient(180deg,rgba(245,240,231,0.76),rgba(245,240,231,0.96))]" />

        <header className="relative z-10 border-b border-[#d8cebf]/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <a href="#top" className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5c4232]">{node.template?.name || 'Practitioner Presence'}</a>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#6b6b6b]">Grounded care / method / trust</p>
            </div>
            <PresencePilotNav
              items={[
                { label: 'Method', href: '#method' },
                { label: 'Sessions', href: '#services' },
                { label: 'Trust', href: '#trust' },
                { label: 'Contact', href: '#contact' },
              ]}
            />
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#527A52]">Practitioner threshold</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.95] text-[#5C4232] sm:text-6xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {node.display_name}
            </h1>
            {node.headline ? (
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#527A52]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {node.headline}
              </p>
            ) : null}
            {node.bio ? (
              <div id="about" className="mt-6 max-w-2xl text-sm leading-8 text-[#4b4a45] [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.bio }} />
            ) : (
              <p className="mt-6 max-w-2xl text-sm leading-8 text-[#5f5d57]">
                This public presence can hold method, invitations into the work, and trustworthy documentation when it is ready to be shared.
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full bg-[#5C4232] px-4 py-2 text-sm font-semibold text-white">
                Begin with a conversation
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a href="#services" className="inline-flex items-center gap-2 rounded-full border border-[#d8cebf] bg-white/70 px-4 py-2 text-sm font-semibold text-[#527A52] backdrop-blur-sm">
                View sessions and offerings
              </a>
            </div>

            {(activeChips.length || contextFacts.length) ? (
              <div className="mt-7 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <span key={`${chip.label}-${chip.sort_order}`} className="rounded-full border border-[#c9d5c5] bg-[#f7faf6] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#527A52]">
                    {chip.label}
                  </span>
                ))}
                {contextFacts.map((fact) => (
                  <span key={fact} className="rounded-full border border-[#ddd2c4] bg-[#faf7f1] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">
                    {fact}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <article className="rounded-[1.5rem] border border-[#ddd2c4] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_18px_36px_rgba(92,66,50,0.08)] sm:col-span-2 lg:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#D97746]">Grounded practice</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#4b4a45]">
                <p>{services.length ? `${services.length} current invitations into the work` : 'Published and open for thoughtful enquiry.'}</p>
                <p>{hasTrustSection ? 'Public proof and credentials are visible below.' : 'Trust notes can be added as the practice grows.'}</p>
              </div>
            </article>
            {imageNotes.map((image, index) => (
              <PresencePublicImage
                key={`${image}-${index}`}
                src={image}
                alt={index === 0 ? node.display_name : works[0]?.title || 'Practice note'}
                className={`w-full rounded-[1.3rem] border border-[#ddd2c4] bg-stone-200 object-cover shadow-[0_18px_36px_rgba(92,66,50,0.08)] ${index === 0 ? 'aspect-[4/5] sm:rotate-1' : 'aspect-[5/4] sm:-rotate-1'}`}
                fallbackClassName={`flex w-full items-center justify-center rounded-[1.3rem] border border-[#ddd2c4] bg-[#e8e1d6] text-[#6B6B6B] ${index === 0 ? 'aspect-[4/5] sm:rotate-1' : 'aspect-[5/4] sm:-rotate-1'}`}
                fallbackLabel={index === 0 ? 'Practitioner portrait' : 'Practice note'}
              />
            ))}
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* CARE PATHWAY — what other templates don't have. A vertical 4-step ritual. */}
        <section id="pathway" className="relative -mt-4 mb-12 overflow-hidden rounded-[2rem] border border-[#ddd2c4] bg-[linear-gradient(180deg,#fbfaf6_0%,#f7f2ea_100%)] px-5 py-10 sm:px-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 12% 28%, rgba(82,122,82,0.08), transparent 35%), radial-gradient(circle at 88% 72%, rgba(217,119,70,0.08), transparent 30%)',
            }}
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#527A52]">A care pathway</p>
            <h2
              className="mt-3 text-3xl leading-tight text-[#5C4232] sm:text-4xl"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              How working together unfolds
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#5f5d57]">
              Not a sales funnel. Four moments held with care — from the first conversation, through arriving and practising, to what is carried forward afterwards.
            </p>
          </div>

          {/* Four-step diagram with connectors */}
          <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-4">
            {/* Connector line on desktop (between numbers) */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[26px] hidden h-px bg-[linear-gradient(90deg,transparent,#c9d5c5_20%,#c9d5c5_80%,transparent)] md:block"
            />

            {[
              {
                tag: 'Begin',
                title: 'A first conversation',
                body: 'Send a note about what you are bringing. We meet briefly to see if this practice is the right fit, with no pressure either way.',
                accent: '#527A52',
              },
              {
                tag: 'Settle',
                title: 'Arrive with care',
                body: 'A clear, unhurried welcome. We agree on what is offered, how it is held, and any access, cultural, or trauma-informed considerations.',
                accent: '#7B9A6B',
              },
              {
                tag: 'Practice',
                title: 'The work itself',
                body: 'Whatever the session, circle, workshop, or programme is: held to its own pace, grounded in the method described below.',
                accent: '#D97746',
              },
              {
                tag: 'Carry forward',
                title: 'After the work',
                body: 'A short reflection, anything you take away in writing or in body, and a clear path back if and when you want to return.',
                accent: '#5C4232',
              },
            ].map((step, idx) => (
              <li key={step.tag} className="relative flex flex-col items-center text-center">
                {/* Numbered ring */}
                <div
                  className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 bg-[#fbfaf6] text-base font-semibold"
                  style={{ borderColor: step.accent, color: step.accent, fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <p
                  className="mt-4 text-[11px] uppercase tracking-[0.28em]"
                  style={{ color: step.accent }}
                >
                  {step.tag}
                </p>
                <h3
                  className="mt-2 text-lg leading-snug text-[#5C4232]"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[18rem] text-sm leading-7 text-[#5f5d57]">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-[#5C4232] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(92,66,50,0.18)] transition hover:bg-[#3f2d22]"
            >
              Begin a conversation
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full border border-[#5C4232]/24 bg-white/72 px-5 py-2.5 text-sm font-semibold text-[#5C4232] backdrop-blur-sm transition hover:border-[#5C4232]/48"
            >
              See offerings
            </a>
          </div>
        </section>

        <section id="method" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <article className="rounded-[2rem] border border-[#ddd2c4] bg-white/76 p-6 shadow-[0_22px_44px_rgba(92,66,50,0.08)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#527A52]">
              <BookOpen className="h-4 w-4" />
              Method and philosophy
            </div>
            {node.practice_statement ? (
              <div className="mt-5 max-w-3xl text-lg leading-9 text-[#2b2a26] [&_p+_p]:mt-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }} dangerouslySetInnerHTML={{ __html: node.practice_statement }} />
            ) : (
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f5d57]">
                Add a practice statement to show the grounded method, philosophy, and human approach behind this work.
              </p>
            )}
          </article>

          <div className="space-y-4">
            <article className="rounded-[1.5rem] border border-[#ddd2c4] bg-[#F2D8BF]/54 p-5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#D97746]">
                <Sparkles className="h-4 w-4" />
                Care and context
              </div>
              {node.curatorial_statement ? (
                <div className="mt-4 text-sm leading-7 text-[#4b4a45] [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.curatorial_statement }} />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#5f5d57]">
                  This section can hold approach notes, care framing, lineage, or the context that helps people understand how the practice is held.
                </p>
              )}
            </article>
            {(node.location_label || node.service_area) ? (
              <article className="rounded-[1.5rem] border border-[#ddd2c4] bg-[#f7faf6] p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#527A52]">
                  <Globe2 className="h-4 w-4" />
                  Availability and place
                </div>
                <div className="mt-4 space-y-2 text-sm leading-7 text-[#4b4a45]">
                  {node.location_label ? <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#527A52]" />{node.location_label}</p> : null}
                  {node.service_area ? <p>{node.service_area}</p> : null}
                </div>
              </article>
            ) : null}
          </div>
        </section>

        <section id="services" className="mt-10 border-t border-[#ddd2c4] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#527A52]">Sessions / workshops / consultations</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Ways to work together
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#5f5d57]">Services are framed here as invitations into the practice, with enough clarity to understand what is offered without turning the page into a hard sales funnel.</p>
          </div>

          {services.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service, index) => (
                <article key={`${service.title}-${service.sort_order}`} className="rounded-[1.6rem] border border-[#ddd2c4] bg-[#fbfaf6] p-5 shadow-[0_14px_32px_rgba(92,66,50,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D97746]">Invitation {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{service.title}</h3>
                  {service.description ? <p className="mt-3 text-sm leading-7 text-[#4b4a45]">{service.description}</p> : null}
                  {[service.price_label, service.duration_label].filter(Boolean).length ? (
                    <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#527A52]">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p>
                  ) : null}
                  {service.cta_url ? (
                    <PresenceTrackedLink
                      slug={node.slug}
                      href={service.cta_url}
                      eventType="service_clicked"
                      metadata={{ title: service.title, url: service.cta_url }}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5C4232]"
                    >
                      {service.cta_label || 'Learn more'}
                      <ArrowUpRight className="h-4 w-4" />
                    </PresenceTrackedLink>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#ddd2c4] bg-[#fbfaf6] px-6 py-5 text-sm leading-7 text-[#5f5d57]">
              No public invitations are listed yet. Sessions, circles, workshops, consultations, or programs can be added when they are ready to share.
            </div>
          )}
        </section>

        <section id="trust" className="mt-10 border-t border-[#ddd2c4] pt-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#527A52]">Proof / trust / lineage</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Grounding and trust
            </h2>
          </div>
          {hasTrustSection ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {node.proof_summary ? (
                <article className="rounded-[1.6rem] border border-[#ddd2c4] bg-[#f7faf6] px-5 py-5 md:col-span-2 xl:col-span-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#527A52]">
                    <ShieldCheck className="h-4 w-4" />
                    Proof summary
                  </div>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#4b4a45]">{node.proof_summary}</p>
                </article>
              ) : null}
              {proof.map((item, index) => (
                <article key={item.id || item.title} className="rounded-[1.6rem] border border-[#ddd2c4] bg-white/76 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D97746]">Evidence {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                  {item.outcome ? <p className="mt-3 text-sm leading-7 text-[#4b4a45]">{item.outcome}</p> : item.challenge ? <p className="mt-3 text-sm leading-7 text-[#4b4a45]">{item.challenge}</p> : null}
                  {item.testimonial ? <blockquote className="mt-4 border-l-2 border-[#C5D8C5] pl-4 text-sm italic leading-7 text-[#5f5d57]">“{item.testimonial}”</blockquote> : null}
                </article>
              ))}
              {credentials.map((item) => (
                <article key={item.id || item.title} className="rounded-[1.6rem] border border-[#ddd2c4] bg-[#F2D8BF]/34 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#527A52]">Credential</p>
                  <h3 className="mt-3 text-xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#4b4a45]">{[item.issuer, item.credential_type].filter(Boolean).join(' / ')}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#ddd2c4] bg-[#fbfaf6] px-6 py-5 text-sm leading-7 text-[#5f5d57]">
              Public trust markers are not published yet. Credentials, proof notes, and testimonials can appear here when safe to share.
            </div>
          )}
        </section>

        {hasDocumentation ? (
          <section id="documentation" className="mt-10 border-t border-[#ddd2c4] pt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#527A52]">Documentation / media / field notes</p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  Practice notes and public records
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#5f5d57]">Works and collections can support practitioners who also publish workshop documentation, community records, creative outputs, or process-led media.</p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-4">
                {works.length ? works.slice(0, 3).map((work, index) => (
                  <a
                    key={work.id || `${work.title}-${work.sort_order}`}
                    href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                    className="group grid gap-4 rounded-[1.6rem] border border-[#ddd2c4] bg-white/76 p-3 shadow-[0_14px_32px_rgba(92,66,50,0.06)] sm:grid-cols-[10rem_minmax(0,1fr)]"
                  >
                    <PresencePublicImage
                      src={work.thumbnail_url || work.image_url}
                      alt={work.title}
                      className="aspect-[4/5] w-full rounded-[1.1rem] bg-stone-200 object-cover"
                      fallbackClassName="flex aspect-[4/5] w-full items-center justify-center rounded-[1.1rem] bg-[#e8e1d6] text-[#6B6B6B]"
                      fallbackLabel="Practice record"
                    />
                    <article className="flex items-center">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#D97746]">Record {String(index + 1).padStart(2, '0')}</p>
                        <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{work.title}</h3>
                        {[work.year, work.medium, work.dimensions].filter(Boolean).length ? <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#527A52]">{[work.year, work.medium, work.dimensions].filter(Boolean).join(' / ')}</p> : null}
                        {work.description ? <p className="mt-3 text-sm leading-7 text-[#4b4a45]">{work.description}</p> : null}
                      </div>
                    </article>
                  </a>
                )) : null}
              </div>

              <aside className="space-y-4">
                {collections.length ? collections.map((collection, index) => (
                  <a
                    key={collection.id || collection.title}
                    href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                    className="block rounded-[1.5rem] border border-[#ddd2c4] bg-[#fbfaf6] p-5"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#527A52]">Collection {String(index + 1).padStart(2, '0')}</p>
                    <h3 className="mt-3 text-xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{collection.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#4b4a45]">{collection.description || 'A grouped body of documentation, shared practice materials, or public work.'}</p>
                  </a>
                )) : null}
              </aside>
            </div>
          </section>
        ) : null}

        <section id="contact" className="mt-10 border-t border-[#ddd2c4] pt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <article className="rounded-[1.8rem] border border-[#ddd2c4] bg-[#5C4232] p-6 text-[#f7f2ea] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#F2D8BF]">
                <Mail className="h-4 w-4" />
                Contact and enquiry
              </div>
              <h2 className="mt-4 text-3xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Book or enquire
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f7f2ea]/78">
                Begin with a conversation about sessions, workshops, facilitation, collaboration, or whether this practice is the right fit.
              </p>
              <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/8 p-4 sm:p-5">
                <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} tone="light" />
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <article className="rounded-[1.5rem] border border-[#ddd2c4] bg-white/76 p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#527A52]">Share / save</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone="light" />
                  <PresenceVCardButton slug={node.slug} tone="light" />
                  <PresenceCopyUrlButton publicUrl={publicUrl} tone="light" />
                </div>
                <div className="mt-4">
                  <PresenceQRCode slug={node.slug} publicUrl={publicUrl} tone="light" />
                </div>
              </article>
              {node.primary_cta_url ? (
                <article className="rounded-[1.5rem] border border-[#ddd2c4] bg-[#f7faf6] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#527A52]">Further information</p>
                  <PresenceTrackedLink
                    slug={node.slug}
                    href={node.primary_cta_url}
                    eventType="link_clicked"
                    metadata={{ label: node.primary_cta_label || 'Primary CTA', url: node.primary_cta_url }}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#5C4232]"
                  >
                    {node.primary_cta_label || 'Open more details'}
                    <ArrowUpRight className="h-4 w-4" />
                  </PresenceTrackedLink>
                </article>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PresenceVenueCollective({ node, publicUrl }: PresenceNodeRendererProps) {
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  const services = visibleServices(node);
  const proof = (node.proof_items || []).filter((item) => item.is_public !== false);
  const activeChips = (node.availability_chips || []).filter((chip) => chip.is_active !== false);
  const cover = node.cover_image_url || works[0]?.image_url || works[0]?.thumbnail_url || node.profile_image_url;
  const venueImages = [node.profile_image_url, works[0]?.thumbnail_url || works[0]?.image_url].filter(Boolean) as string[];
  const facts = [
    node.location_label,
    node.service_area,
    node.directory_ready ? 'Directory ready' : null,
    node.map_ready ? 'Map ready' : null,
    node.archive_ready ? 'Archive ready' : null,
    node.white_label_ready ? 'Network ready' : null,
  ].filter(Boolean) as string[];
  const hasTrust = Boolean(node.proof_summary || proof.length);

  return (
    <main className="min-h-screen bg-[#f3eadc] text-[#161712]">
      <PresenceSourceTracker slug={node.slug} />

      <section id="top" className="relative overflow-hidden border-b border-[#d7c7ad] bg-[#2d241f] text-white">
        <PresencePublicImage
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-36"
          fallbackClassName="absolute inset-0 bg-[linear-gradient(135deg,#3a3028,#191612)]"
          fallbackLabel=""
          loading="eager"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(228,200,150,0.2),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(108,133,108,0.16),transparent_26%),linear-gradient(180deg,rgba(22,18,15,0.76),rgba(28,23,19,0.9))]" />

        <header className="relative z-10 border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <a href="#top" className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-white/86">{node.template?.name || 'Venue / Collective Presence'}</a>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#e4c896]">Gathering / programs / public life</p>
            </div>
            <PresencePilotNav
              tone="dark"
              items={[
                { label: 'Holding', href: '#holding' },
                { label: 'Programs', href: '#programs' },
                { label: 'Spaces', href: '#spaces' },
                { label: 'Visit', href: '#contact' },
              ]}
            />
          </div>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#e4c896]">Venue threshold</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.95] text-white sm:text-6xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {node.display_name}
            </h1>
            {node.headline ? (
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[#f0e7da]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {node.headline}
              </p>
            ) : null}
            {node.bio ? (
              <div id="about" className="mt-6 max-w-2xl text-sm leading-8 text-white/78 [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.bio }} />
            ) : (
              <p className="mt-6 max-w-2xl text-sm leading-8 text-white/72">
                This public presence can hold the spirit of a place: what it gathers, how it hosts, and the kinds of work and connection that happen there.
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#programs" className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                Explore programs
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full border border-[#e4c896]/28 bg-[#e4c896]/12 px-4 py-2 text-sm font-semibold text-[#f7e8d2]">
                Visit and enquire
              </a>
            </div>

            {(facts.length || activeChips.length) ? (
              <div className="mt-7 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <span key={`${chip.label}-${chip.sort_order}`} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#f3dec0]">
                    {chip.label}
                  </span>
                ))}
                {facts.slice(0, 3).map((fact) => (
                  <span key={fact} className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/72">
                    {fact}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <article className="rounded-[1.5rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#e4c896]">Community notes</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/78">
                <p>{services.length ? `${services.length} active programs or offers` : 'Published and open for community enquiry.'}</p>
                <p>{works.length ? `${works.length} visible scenes, records, or space fragments` : 'No public spatial records yet.'}</p>
              </div>
            </article>
            {venueImages.map((image, index) => (
              <PresencePublicImage
                key={`${image}-${index}`}
                src={image}
                alt={index === 0 ? node.display_name : works[0]?.title || 'Venue note'}
                className={`w-full rounded-[1.3rem] border border-white/10 bg-stone-200 object-cover shadow-[0_18px_36px_rgba(0,0,0,0.18)] ${index === 0 ? 'aspect-[4/5] sm:rotate-1' : 'aspect-[5/4] sm:-rotate-1'}`}
                fallbackClassName={`flex w-full items-center justify-center rounded-[1.3rem] border border-white/10 bg-white/10 text-[#f3dec0] ${index === 0 ? 'aspect-[4/5] sm:rotate-1' : 'aspect-[5/4] sm:-rotate-1'}`}
                fallbackLabel={index === 0 ? 'Venue portrait' : 'Venue note'}
              />
            ))}
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section id="holding" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="rounded-[2rem] border border-[#d7c7ad] bg-[#fbf6ef] p-6 shadow-[0_22px_44px_rgba(81,61,39,0.08)] sm:p-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#7b5d38]">
              <Building2 className="h-4 w-4" />
              Holding and purpose
            </div>
            {node.practice_statement ? (
              <div className="mt-5 max-w-3xl text-lg leading-9 text-[#161712] [&_p+_p]:mt-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }} dangerouslySetInnerHTML={{ __html: node.practice_statement }} />
            ) : (
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f5648]">
                Add a practice or place statement to show what this venue holds, who it gathers, and why the space exists.
              </p>
            )}
          </article>

          <div className="space-y-4">
            <article className="rounded-[1.5rem] border border-[#d7c7ad] bg-[#f8f0e2] p-5">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#7b5d38]">
                <Sparkles className="h-4 w-4" />
                Hosting notes
              </div>
              {node.curatorial_statement ? (
                <div className="mt-4 text-sm leading-7 text-[#3c332a] [&_p+_p]:mt-4" dangerouslySetInnerHTML={{ __html: node.curatorial_statement }} />
              ) : (
                <p className="mt-4 text-sm leading-7 text-[#5f5648]">
                  Use this space for how the venue is held: protocols, atmosphere, context, or the lens through which programs and gatherings are offered.
                </p>
              )}
            </article>
            {facts.length ? (
              <article className="rounded-[1.5rem] border border-[#d7c7ad] bg-white/72 p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#6c855b]">
                  <Globe2 className="h-4 w-4" />
                  Public signals
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {facts.map((fact) => (
                    <span key={fact} className="rounded-full border border-[#d7c7ad] bg-[#fbf6ef] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#5f5648]">
                      {fact}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>

        {/* PUBLIC NOTICEBOARD — programs as taped notices on a corkboard wall */}
        <section id="programs" className="relative mt-10 overflow-hidden rounded-[2rem] border-t-[3px] border-x border-b border-[#7b5d38]/40 bg-[#7d603a] px-5 py-10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.18)] sm:px-10 sm:py-14">
          {/* Cork texture via radial repeats */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-multiply"
            style={{
              backgroundImage:
                'radial-gradient(rgba(60,40,20,0.6) 1.2px, transparent 1.4px), radial-gradient(rgba(120,90,50,0.4) 1px, transparent 1.4px)',
              backgroundSize: '14px 14px, 22px 22px',
              backgroundPosition: '0 0, 7px 11px',
            }}
          />
          {/* Noticeboard frame double-line */}
          <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[1.4rem] border border-[#a07d49]/40" />

          <div className="relative">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f0d8a4]">Public noticeboard</p>
                <h2
                  className="mt-2 text-3xl font-semibold leading-tight text-[#fbf6ef] sm:text-4xl"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  Programs and gatherings
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#f0d8a4]/82">
                Pinned here are the current public programs. Each notice can be opened for time, host, and the way into the room.
              </p>
            </div>

            {services.length ? (
              <ul className="relative mt-10 grid gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
                {services.map((service, index) => {
                  // Vary rotation slightly so the notices don't read as a uniform grid
                  const rot = [-1.2, 0.8, -0.5, 1.4, -1.6, 0.6][index % 6];
                  const pinColor = ['#cf3a3a', '#1f5fa3', '#d99427', '#3f8a4f', '#6e3aa0', '#222'][index % 6];
                  return (
                    <li
                      key={`${service.title}-${service.sort_order}`}
                      className="relative"
                      style={{ transform: `rotate(${rot}deg)` }}
                    >
                      {/* Push pin */}
                      <span
                        aria-hidden
                        className="absolute -top-3 left-1/2 z-20 h-4 w-4 -translate-x-1/2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)]"
                        style={{ background: pinColor }}
                      />
                      {/* Notice paper */}
                      <article className="relative bg-[#fbf6ef] px-5 py-5 shadow-[0_18px_30px_-12px_rgba(0,0,0,0.55),0_4px_8px_rgba(0,0,0,0.3)]">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7b5d38]">Program {String(index + 1).padStart(2, '0')}</p>
                        <h3
                          className="mt-2 text-2xl font-semibold leading-tight text-[#161712]"
                          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                          {service.title}
                        </h3>
                        {service.description ? (
                          <p className="mt-3 text-sm leading-7 text-[#3c332a]">{service.description}</p>
                        ) : null}
                        {[service.price_label, service.duration_label].filter(Boolean).length ? (
                          <p className="mt-4 inline-block border-t border-[#d7c7ad] pt-2 text-[10px] uppercase tracking-[0.2em] text-[#6c855b]">
                            {[service.price_label, service.duration_label].filter(Boolean).join(' / ')}
                          </p>
                        ) : null}
                        {service.cta_url ? (
                          <PresenceTrackedLink
                            slug={node.slug}
                            href={service.cta_url}
                            eventType="service_clicked"
                            metadata={{ title: service.title, url: service.cta_url }}
                            className="mt-5 inline-flex items-center gap-2 border-b border-[#161712] pb-0.5 text-sm font-semibold text-[#161712]"
                          >
                            {service.cta_label || 'Open notice'}
                            <ArrowUpRight className="h-4 w-4" />
                          </PresenceTrackedLink>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="relative mt-8 inline-block bg-[#fbf6ef] px-6 py-5 text-sm leading-7 text-[#5f5648] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.55)] sm:-rotate-[0.5deg]">
                <span aria-hidden className="absolute -top-3 left-8 h-4 w-4 rounded-full bg-[#cf3a3a] shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                The board is open. New programs, gatherings, residencies, or hosting offers will be pinned here as they are published.
              </div>
            )}

            {/* Routing chips: visit / propose / partner / document */}
            <div className="mt-12 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-[10px] uppercase tracking-[0.26em] text-[#f0d8a4]/70">Ways in:</span>
              <a href="#contact" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] backdrop-blur transition hover:bg-[#f0d8a4]/20">Visit</a>
              <a href="#contact" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] backdrop-blur transition hover:bg-[#f0d8a4]/20">Propose a program</a>
              <a href="#contact" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] backdrop-blur transition hover:bg-[#f0d8a4]/20">Partner</a>
              <a href="#spaces" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] backdrop-blur transition hover:bg-[#f0d8a4]/20">Document</a>
            </div>
          </div>
        </section>

        <section id="spaces" className="mt-10 border-t border-[#d7c7ad] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6c855b]">Rooms / scenes / records</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Spaces and public record
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#5f5648]">Works and collections can hold scenes from the venue: rooms, exhibitions, gatherings, archives, or documentation of community life.</p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-4">
              {works.length ? works.slice(0, 3).map((work, index) => (
                <a
                  key={work.id || `${work.title}-${work.sort_order}`}
                  href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                  className="group grid gap-4 rounded-[1.6rem] border border-[#d7c7ad] bg-white/76 p-3 shadow-[0_14px_32px_rgba(81,61,39,0.06)] sm:grid-cols-[10rem_minmax(0,1fr)]"
                >
                  <PresencePublicImage
                    src={work.thumbnail_url || work.image_url}
                    alt={work.title}
                    className="aspect-[4/5] w-full rounded-[1.1rem] bg-stone-200 object-cover"
                    fallbackClassName="flex aspect-[4/5] w-full items-center justify-center rounded-[1.1rem] bg-[#e8dfd0] text-[#6d6559]"
                    fallbackLabel="Venue record"
                  />
                  <article className="flex items-center">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b5d38]">Scene {String(index + 1).padStart(2, '0')}</p>
                      <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{work.title}</h3>
                      {[work.year, work.medium].filter(Boolean).length ? <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#6c855b]">{[work.year, work.medium].filter(Boolean).join(' / ')}</p> : null}
                      {work.description ? <p className="mt-3 text-sm leading-7 text-[#3c332a]">{work.description}</p> : null}
                    </div>
                  </article>
                </a>
              )) : (
                <div className="rounded-[1.5rem] border border-dashed border-[#d7c7ad] bg-[#fbf6ef] px-6 py-5 text-sm leading-7 text-[#5f5648]">
                  No public space records yet. Works can document rooms, events, displays, or moments of community activity.
                </div>
              )}
            </div>

            <aside className="space-y-4">
              {collections.length ? collections.map((collection, index) => (
                <a
                  key={collection.id || collection.title}
                  href={`/p/${encodeURIComponent(node.slug)}/collections/${encodeURIComponent(String(collection.id || collection.title))}`}
                  className="block rounded-[1.5rem] border border-[#d7c7ad] bg-[#f8f0e2] p-5"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c855b]">Room {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{collection.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#3c332a]">{collection.description || 'A grouped archive of programs, exhibitions, gatherings, or themed public documentation.'}</p>
                </a>
              )) : null}
            </aside>
          </div>
        </section>

        {hasTrust ? (
          <section id="trust" className="mt-10 border-t border-[#d7c7ad] pt-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6c855b]">Trust / evidence / public memory</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                What supports the space
              </h2>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {node.proof_summary ? (
                <article className="rounded-[1.6rem] border border-[#d7c7ad] bg-[#f8f0e2] px-5 py-5 md:col-span-2 xl:col-span-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b5d38]">Proof summary</p>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-[#3c332a]">{node.proof_summary}</p>
                </article>
              ) : null}
              {proof.map((item, index) => (
                <article key={item.id || item.title} className="rounded-[1.6rem] border border-[#d7c7ad] bg-white/76 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b5d38]">Record {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{item.title}</h3>
                  {item.outcome ? <p className="mt-3 text-sm leading-7 text-[#3c332a]">{item.outcome}</p> : item.challenge ? <p className="mt-3 text-sm leading-7 text-[#3c332a]">{item.challenge}</p> : null}
                  {item.testimonial ? <blockquote className="mt-4 border-l-2 border-[#d7c7ad] pl-4 text-sm italic leading-7 text-[#5f5648]">“{item.testimonial}”</blockquote> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section id="contact" className="mt-10 border-t border-[#d7c7ad] pt-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <article className="rounded-[1.8rem] border border-[#d7c7ad] bg-[#2d241f] p-6 text-[#f4ede2] sm:p-8">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#e4c896]">
                <DoorOpen className="h-4 w-4" />
                Visit and enquire
              </div>
              <h2 className="mt-4 text-3xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                Visit and enquire
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f4ede2]/78">
                Reach out about programs, visits, hosting, collaborations, community use, or whether this place is the right fit for what you are planning.
              </p>
              <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/8 p-4 sm:p-5">
                <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} tone="light" />
              </div>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <article className="rounded-[1.5rem] border border-[#d7c7ad] bg-white/76 p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6c855b]">Share / save</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone="light" />
                  <PresenceVCardButton slug={node.slug} tone="light" />
                  <PresenceCopyUrlButton publicUrl={publicUrl} tone="light" />
                </div>
                <div className="mt-4">
                  <PresenceQRCode slug={node.slug} publicUrl={publicUrl} tone="light" />
                </div>
              </article>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export function PresenceProfessionalContract({ node, publicUrl }: PresenceNodeRendererProps) {
  return (
    <main className="min-h-screen bg-[#151515] text-white">
      <PresenceSourceTracker slug={node.slug} />
      <section className="border-b border-white/10 bg-[#151515]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#e0b115]/32 bg-[#e0b115]/12 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#f6d4cb]">
            <FileCheck2 className="h-4 w-4" />
            Professional Contract Presence
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{node.display_name}</h1>
          {node.headline ? <p className="mt-5 max-w-2xl text-lg leading-8 text-white/76">{node.headline}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/68">
            {node.location_label ? <span>{node.location_label}</span> : null}
            {node.service_area ? <span>{node.service_area}</span> : null}
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
            <PresenceVCardButton slug={node.slug} />
            <PresenceCopyUrlButton publicUrl={publicUrl} />
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:px-8">
        <div className="space-y-4">
          {node.bio ? <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4 text-base leading-8 text-white/74" dangerouslySetInnerHTML={{ __html: node.bio }} /> : null}
          <PresenceCapabilityStatement node={node} />
          <PresenceOfferCards node={node} />
          <PresenceProofLedger node={node} />
          <PresenceProcurementPanel node={node} />
          <PresencePortfolio node={node} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Mail className="h-4 w-4 text-[#e0b115]" />
              Deal intake
            </h2>
            <div className="mt-4">
              <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} />
            </div>
          </section>
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <PresenceQRCode slug={node.slug} publicUrl={publicUrl} />
          </section>
        </aside>
      </div>
    </main>
  );
}

export function PresenceTradieProfile({ node, publicUrl }: PresenceNodeRendererProps) {
  return (
    <main className="min-h-screen bg-[#16211e] text-white">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative overflow-hidden border-b border-white/10 bg-[#16211e]">
        {node.cover_image_url ? <img src={node.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-22" /> : null}
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#e0b115]/36 bg-[#e0b115]/13 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#f6d4cb]">
            <HardHat className="h-4 w-4" />
            Field Service Presence
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{node.display_name}</h1>
          {node.headline ? <p className="mt-5 max-w-2xl text-lg leading-8 text-white/78">{node.headline}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/72">
            {node.location_label ? <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#e0b115]" />{node.location_label}</span> : null}
            {node.service_area ? <span className="inline-flex items-center gap-2"><Wrench className="h-4 w-4 text-[#e0b115]" />{node.service_area}</span> : null}
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
            <PresenceVCardButton slug={node.slug} />
            <PresenceCopyUrlButton publicUrl={publicUrl} />
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div className="space-y-4">
          {node.bio ? <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4 text-base leading-8 text-white/76" dangerouslySetInnerHTML={{ __html: node.bio }} /> : null}
          <PresenceAvailabilityChips chips={node.availability_chips} />
          <PresenceLicenceWallet node={node} />
          <PresenceServices node={node} />
          <PresenceBeforeAfterGallery node={node} />
          <PresenceProofLedger node={node} />
          <PresenceHandoverSummary node={node} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <ClipboardCheck className="h-4 w-4 text-[#e0b115]" />
              Request a quote
            </h2>
            <div className="mt-4">
              <PresenceQuoteRequestForm slug={node.slug} displayName={node.display_name} />
            </div>
          </section>
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <h2 className="text-base font-semibold text-white">Save and share</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} />
              <PresenceVCardButton slug={node.slug} />
              <PresenceCopyUrlButton publicUrl={publicUrl} />
            </div>
            <div className="mt-4">
              <PresenceQRCode slug={node.slug} publicUrl={publicUrl} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function PresenceProfileCard({ node, publicUrl }: PresenceNodeRendererProps) {
  const activeChips = (node.availability_chips || []).filter((chip) => chip.is_active !== false);
  const links = (node.links || []).filter((link) => link.is_visible !== false);
  return (
    <main className="min-h-screen bg-[#f7f2e9] px-4 py-8 text-stone-950 sm:px-6">
      <PresenceSourceTracker slug={node.slug} />
      <section className="mx-auto max-w-md overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
        {node.cover_image_url ? <img src={node.cover_image_url} alt="" className="h-36 w-full object-cover" /> : null}
        <div className="p-5">
          <div className="flex items-end gap-4">
            {node.profile_image_url ? (
              <img src={node.profile_image_url} alt={node.display_name} className="h-20 w-20 rounded-lg border border-stone-200 object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-stone-900 text-xl font-semibold text-white">
                {initials(node.display_name)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold leading-tight">{node.display_name}</h1>
              {node.headline ? <p className="mt-1 text-sm leading-6 text-stone-600">{node.headline}</p> : null}
            </div>
          </div>
          {node.bio ? <div className="mt-5 text-sm leading-7 text-stone-700" dangerouslySetInnerHTML={{ __html: node.bio }} /> : null}
          {activeChips.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <span key={`${chip.label}-${chip.sort_order}`} className="rounded-md border border-stone-300 bg-stone-50 px-3 py-1.5 text-sm text-stone-700">
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
          {links.length ? (
            <div className="mt-5 grid gap-2">
              {links.map((link) => (
                <PresenceTrackedLink
                  key={`${link.label}-${link.url}`}
                  slug={node.slug}
                  href={link.url}
                  eventType={link.link_type === 'social' ? 'social_clicked' : 'link_clicked'}
                  metadata={{ label: link.label, url: link.url, link_type: link.link_type }}
                  className="flex items-center justify-between rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 hover:border-stone-500"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-stone-500" />
                </PresenceTrackedLink>
              ))}
            </div>
          ) : null}
          <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} tone="light" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicUrl} tone="light" />
            <PresenceVCardButton slug={node.slug} tone="light" />
            <PresenceCopyUrlButton publicUrl={publicUrl} tone="light" />
          </div>
          <div className="mt-5">
            <PresenceQRCode slug={node.slug} publicUrl={publicUrl} tone="light" />
          </div>
        </div>
      </section>
    </main>
  );
}

export function PresenceOrganisationProfile({ node, publicUrl }: PresenceNodeRendererProps) {
  return (
    <main className="min-h-screen bg-[#10211c] text-white">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative border-b border-white/10 bg-[#10211c]">
        {node.cover_image_url ? <img src={node.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-24" /> : null}
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/[0.08] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/72">
            <Building2 className="h-4 w-4 text-[#e0b115]" />
            {node.display_mode?.replace(/_/g, ' ')}
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight sm:text-6xl">{node.display_name}</h1>
          {node.headline ? <p className="mt-5 max-w-2xl text-lg leading-8 text-white/78">{node.headline}</p> : null}
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div className="space-y-4">
          <PresencePracticeStatement node={node} />
          <PresenceServices node={node} />
          <PresencePortfolio node={node} />
          <PresenceCollectionList node={node} variant="dark" />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <PresenceEnquiryForm slug={node.slug} displayName={node.display_name} />
          </section>
          <section className="rounded-lg border border-white/12 bg-white/[0.07] p-4">
            <PresenceQRCode slug={node.slug} publicUrl={publicUrl} />
          </section>
        </aside>
      </div>
    </main>
  );
}

export function PresenceNodeRenderer({ node, publicUrl }: PresenceNodeRendererProps) {
  switch (node.display_mode) {
    // Gallery / portal modes
    case 'artist_gallery':
    case 'gallery_portal':
    case 'signature_artist':
      return <PresenceArtistGallery node={node} publicUrl={publicUrl} />;
    case 'minimal_portal':
      return <PresenceMinimalPortal node={node} publicUrl={publicUrl} />;
    case 'studio_practice':
      return <PresenceStudioPractice node={node} publicUrl={publicUrl} />;
    // Organisation / venue modes
    case 'organisation_profile':
    case 'venue_profile':
    case 'white_label_network_entry':
      return <PresenceVenueCollective node={node} publicUrl={publicUrl} />;
    // Professional / contract modes (alpha foundation)
    case 'professional_contract':
      return <PresenceProfessionalContract node={node} publicUrl={publicUrl} />;
    // Tradie / field service modes (alpha foundation)
    case 'tradie_profile':
    case 'field_service_profile':
      return <PresenceTradieProfile node={node} publicUrl={publicUrl} />;
    // Portfolio / premium / practitioner modes
    case 'portfolio_presence_kit':
      return <PresenceArtistGallery node={node} publicUrl={publicUrl} />;
    case 'editorial_portfolio':
      return <PresenceEditorialPortfolio node={node} publicUrl={publicUrl} />;
    case 'practitioner_profile':
      return <PresencePractitionerPresence node={node} publicUrl={publicUrl} />;
    case 'opportunity_profile':
    case 'premium_profile':
      return <PresencePremiumProfile node={node} publicUrl={publicUrl} />;
    // Showcase / profile card modes
    case 'showcase':
    case 'profile_card':
    default:
      return <PresenceProfileCard node={node} publicUrl={publicUrl} />;
  }
}
