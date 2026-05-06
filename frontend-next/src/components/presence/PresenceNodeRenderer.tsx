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
  const background = node.cover_image_url || node.landing_background_url;
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  return (
    <main className="min-h-screen bg-[#fbf8f1] text-stone-950">
      <PresenceSourceTracker slug={node.slug} />
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <a href="#top" className="text-base font-semibold uppercase tracking-[0.16em] text-stone-950">{node.display_name}</a>
        <PresencePilotNav
          items={[
            { label: 'Works', href: '#works' },
            { label: 'Collections', href: '#collections' },
            { label: 'Statement', href: '#statement' },
            { label: 'Contact', href: '#contact' },
          ]}
        />
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 pt-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
        <div className="flex flex-col justify-between border-y border-stone-300 py-7 lg:min-h-[34rem]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9f5f31]">{node.template?.name || 'Gallery Wall'}</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-stone-950 sm:text-6xl">{node.display_name}</h1>
            {node.headline ? <p className="mt-5 max-w-md text-base leading-8 text-stone-700">{node.headline}</p> : null}
          </div>
          <div className="mt-8 space-y-5">
            <PresenceLightActions node={node} publicUrl={publicUrl} />
            <p className="text-sm text-stone-500">{works.length} selected works / {collections.length} collections</p>
          </div>
        </div>

        <div className="grid min-h-[32rem] grid-cols-2 gap-3 sm:grid-cols-3">
          {works.slice(0, 6).map((work, index) => {
            const image = work.thumbnail_url || work.image_url;
            const span = index === 1 ? 'row-span-2' : index === 2 ? 'sm:row-span-2' : '';
            return (
              <a
                key={work.id || work.title}
                href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}
                className={`group relative overflow-hidden border border-stone-300 bg-stone-200 ${span}`}
              >
                <PresencePublicImage
                  src={image}
                  alt={work.title}
                  className="h-full min-h-[10rem] w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                  fallbackClassName="flex h-full min-h-[10rem] w-full items-center justify-center bg-stone-200 text-stone-500"
                  fallbackLabel="Work image"
                />
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.56))] px-3 pb-3 pt-10 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-xs font-medium text-white">{work.title}</p>
                </div>
              </a>
            );
          })}
          {!works.length && background ? (
            <PresencePublicImage
              src={background}
              alt=""
              className="col-span-full h-full min-h-[26rem] w-full object-cover"
              fallbackClassName="col-span-full flex min-h-[26rem] items-center justify-center bg-stone-200 text-stone-500"
              fallbackLabel="Portfolio image"
            />
          ) : null}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div>
          <div id="statement">
            <PresencePracticeStatement node={node} variant="light" />
          </div>
          <div id="collections">
            <PresenceCollectionList node={node} variant="light" />
          </div>
          <div id="works">
            <PresenceGalleryGrid node={node} variant="light" />
          </div>
          <PresenceCuratorialStatement node={node} variant="light" />
        </div>
        <div id="contact">
          <PresenceContactBlock node={node} publicUrl={publicUrl} title="Contact" />
        </div>
      </div>
    </main>
  );
}

export function PresenceMinimalPortal({ node, publicUrl }: PresenceNodeRendererProps) {
  const background = node.landing_background_url || node.cover_image_url;
  return (
    <main className="min-h-screen bg-[#0f0d0a] text-white">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        {background ? (
          <PresencePublicImage
            src={background}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-62"
            fallbackClassName="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(246,241,232,0.16),transparent_38%),linear-gradient(135deg,#07161a,#1d1410_58%,#090807)]"
            fallbackLabel=""
            loading="eager"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,13,10,0.86),rgba(15,13,10,0.34)_54%,rgba(15,13,10,0.84)),linear-gradient(180deg,rgba(15,13,10,0.14),rgba(15,13,10,0.84))]" />
        <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-6 sm:px-8">
          <a href="#top" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/86">{node.display_name}</a>
          <PresencePilotNav
            tone="dark"
            items={[
              { label: 'Works', href: '#works' },
              { label: 'Journal', href: '#statement' },
              { label: 'Contact', href: '#contact' },
            ]}
          />
        </header>
        <div id="top" className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-16 text-center sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e7c485]">{node.visual_mood || 'Artist Portal'}</p>
            <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold leading-tight sm:text-7xl">{node.landing_title || node.display_name}</h1>
            {(node.landing_subtitle || node.headline) ? <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">{node.landing_subtitle || node.headline}</p> : null}
            <a href="#presence-body" className="mt-8 inline-flex items-center gap-2 border-b border-white/70 px-1 pb-1 text-sm font-semibold uppercase tracking-[0.16em] text-white">
              <DoorOpen className="h-4 w-4" />
              {node.landing_enter_label || 'Enter'}
            </a>
          </div>
        </div>
        <footer className="relative z-10 flex items-end justify-between gap-4 px-4 pb-6 text-[11px] uppercase tracking-[0.18em] text-white/60 sm:px-8">
          <span>{node.location_label || 'Presence'}</span>
          <span>Public portfolio</span>
        </footer>
      </section>
      <div id="presence-body" className="bg-[#f6f1e8] text-stone-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-8">
          <div>
            <div id="statement">
              <PresencePracticeStatement node={node} variant="light" />
            </div>
            <div id="works">
              <PresenceGalleryGrid node={node} variant="light" />
            </div>
            <PresenceCollectionList node={node} variant="light" />
            <PresenceCuratorialStatement node={node} variant="light" />
          </div>
          <div id="contact">
            <PresenceContactBlock node={node} publicUrl={publicUrl} title="Contact" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function PresenceEditorialPortfolio({ node, publicUrl }: PresenceNodeRendererProps) {
  const heroImage = node.cover_image_url || node.profile_image_url || visibleWorks(node)[0]?.image_url;
  return (
    <main className="min-h-screen bg-[#fbf8f1] text-stone-950">
      <PresenceSourceTracker slug={node.slug} />
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-stone-300 px-4 py-5 sm:px-6 lg:px-8">
        <a href="#top" className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-950">{node.display_name}</a>
        <PresencePilotNav
          items={[
            { label: 'Work', href: '#works' },
            { label: 'Services', href: '#services' },
            { label: 'About', href: '#about' },
            { label: 'Contact', href: '#contact' },
          ]}
        />
      </header>
      <section id="top" className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.72fr_1fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9f5f31]">{node.template?.name || 'Editorial Portfolio'}</p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight sm:text-6xl">
            {node.headline || node.display_name}
          </h1>
          {node.bio ? (
            <div id="about" className="mt-6 max-w-lg text-sm leading-7 text-stone-700 [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.bio }} />
          ) : null}
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#works" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-stone-950">
              View selected work
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
        <PresencePublicImage
          src={heroImage}
          alt=""
          className="aspect-[16/11] w-full border border-stone-300 bg-stone-200 object-cover"
          fallbackClassName="flex aspect-[16/11] w-full items-center justify-center border border-stone-300 bg-stone-200 text-stone-500"
          fallbackLabel="Editorial image"
          loading="eager"
        />
      </section>
      <section id="works" className="mx-auto max-w-7xl border-t border-stone-300 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {visibleWorks(node).slice(0, 3).map((work, index) => (
            <a key={work.id || work.title} href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`} className="group">
              <PresencePublicImage
                src={work.thumbnail_url || work.image_url}
                alt={work.title}
                className="aspect-[16/9] w-full border border-stone-300 bg-stone-200 object-cover transition-opacity group-hover:opacity-90"
                fallbackClassName="flex aspect-[16/9] w-full items-center justify-center border border-stone-300 bg-stone-200 text-stone-500"
                fallbackLabel="Project image"
              />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{String(index + 1).padStart(2, '0')} / {work.medium || 'Selected work'}</p>
              <h2 className="mt-1 text-lg font-semibold text-stone-950">{work.title}</h2>
              {work.description ? <p className="mt-2 text-sm leading-6 text-stone-700">{work.description}</p> : null}
            </a>
          ))}
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div>
          <PresencePracticeStatement node={node} variant="light" />
          <PresenceCollectionList node={node} variant="light" />
          <div id="services">
            {visibleServices(node).length ? (
              <section className="border-t border-stone-300 py-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-700">Services</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {visibleServices(node).map((service) => (
                    <article key={`${service.title}-${service.sort_order}`} className="border-l border-stone-300 pl-4">
                      <h3 className="text-lg font-semibold text-stone-950">{service.title}</h3>
                      {service.description ? <p className="mt-2 text-sm leading-6 text-stone-700">{service.description}</p> : null}
                      {[service.price_label, service.duration_label].filter(Boolean).length ? <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#9f5f31]">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
          <PresenceCuratorialStatement node={node} variant="light" />
        </div>
        <div id="contact">
          <PresenceContactBlock node={node} publicUrl={publicUrl} title="Enquiry" />
        </div>
      </div>
    </main>
  );
}

export function PresenceStudioPractice({ node, publicUrl }: PresenceNodeRendererProps) {
  const works = visibleWorks(node);
  return (
    <main className="min-h-screen bg-[#efe4d4] text-[#2f251d]">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative overflow-hidden bg-[#2f251d] text-white">
        {node.cover_image_url ? (
          <PresencePublicImage
            src={node.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-52"
            fallbackClassName="absolute inset-0 bg-[linear-gradient(135deg,#5e4a38,#1e1712)]"
            fallbackLabel=""
            loading="eager"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(47,37,29,0.9),rgba(47,37,29,0.26)_62%,rgba(47,37,29,0.82))]" />
        <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-6 sm:px-8">
          <a href="#top" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/86">{node.display_name}</a>
          <PresencePilotNav
            tone="dark"
            items={[
              { label: 'Practice', href: '#practice' },
              { label: 'Works', href: '#works' },
              { label: 'Journal', href: '#statement' },
              { label: 'Contact', href: '#contact' },
            ]}
          />
        </header>
        <div id="top" className="relative z-10 mx-auto flex min-h-[72vh] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8c79a]">{node.template?.name || 'Studio Practice'}</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">{node.headline || node.display_name}</h1>
            {node.bio ? <div className="mt-5 max-w-lg text-sm leading-7 text-white/78 [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.bio }} /> : null}
            <a href="#works" className="mt-7 inline-flex items-center gap-2 border-b border-white/70 pb-1 text-sm font-semibold uppercase tracking-[0.12em] text-white">
              Explore our work
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div>
          <div id="practice">
            <PresencePracticeStatement node={node} variant="light" />
          </div>
          {works.length ? (
            <section id="works" className="border-t border-stone-400/70 py-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f4e35]">Studio works</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {works.slice(0, 4).map((work) => (
                  <a key={work.id || work.title} href={`/p/${encodeURIComponent(node.slug)}/works/${encodeURIComponent(String(work.id || work.slug || work.title))}`}>
                    <PresencePublicImage
                      src={work.thumbnail_url || work.image_url}
                      alt={work.title}
                      className="aspect-[3/4] w-full bg-stone-200 object-cover"
                      fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-stone-200 text-stone-500"
                      fallbackLabel="Studio image"
                    />
                    <p className="mt-2 text-sm font-semibold text-[#2f251d]">{work.title}</p>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
          <PresenceCollectionList node={node} variant="light" />
          <div id="statement">
            <PresenceCuratorialStatement node={node} variant="light" />
          </div>
          <PresenceLightServices node={node} title="Offerings" />
        </div>
        <div id="contact">
          <PresenceContactBlock node={node} publicUrl={publicUrl} title="Studio enquiry" />
        </div>
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
  const cover = node.cover_image_url || node.profile_image_url;
  return (
    <main className="min-h-screen bg-[#f4f0e7] text-[#1f2c23]">
      <PresenceSourceTracker slug={node.slug} />
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-[#cfc8b7] px-4 py-5 sm:px-6 lg:px-8">
        <a href="#top" className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1f2c23]">{node.display_name}</a>
        <PresencePilotNav
          items={[
            { label: 'About', href: '#about' },
            { label: 'Services', href: '#services' },
            { label: 'Praise', href: '#proof' },
            { label: 'Contact', href: '#contact' },
          ]}
        />
      </header>
      <section id="top" className="mx-auto grid max-w-7xl border-b border-[#cfc8b7] sm:grid-cols-2">
        <div className="flex min-h-[30rem] flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#546b4f]">{node.template?.name || 'Practitioner Presence'}</p>
          <h1 className="sr-only">{node.display_name}</h1>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-tight sm:text-6xl">{node.headline || node.display_name}</h2>
          {node.bio ? <div id="about" className="mt-5 max-w-lg text-sm leading-7 text-[#455349] [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.bio }} /> : null}
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 rounded-md bg-[#243c2f] px-4 py-2 text-sm font-semibold text-white">
              Work with me
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href="#services" className="inline-flex items-center gap-2 rounded-md border border-[#bfb6a4] bg-white/54 px-4 py-2 text-sm font-semibold text-[#243c2f]">
              View offerings
            </a>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#455349]">
            {node.location_label ? <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#546b4f]" />{node.location_label}</span> : null}
            {node.service_area ? <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-[#546b4f]" />{node.service_area}</span> : null}
            {node.organisation ? <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-[#546b4f]" />{node.organisation.name}</span> : null}
          </div>
        </div>
        <PresencePublicImage
          src={cover}
          alt=""
          className="min-h-[24rem] w-full object-cover sm:min-h-[30rem]"
          fallbackClassName="flex min-h-[24rem] w-full items-center justify-center bg-[#d8d0bf] text-[#546b4f] sm:min-h-[30rem]"
          fallbackLabel="Practitioner image"
          loading="eager"
        />
      </section>
      <section className="mx-auto max-w-7xl border-b border-[#cfc8b7] px-4 py-7 sm:px-6 lg:px-8">
        <PresenceLightAvailabilityChips chips={node.availability_chips} />
        {services.length ? (
          <div id="services" className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article key={`${service.title}-${service.sort_order}`} className="border-l border-[#cfc8b7] pl-4">
                <h2 className="text-base font-semibold text-[#1f2c23]">{service.title}</h2>
                {service.description ? <p className="mt-2 text-sm leading-6 text-[#536154]">{service.description}</p> : null}
                {[service.price_label, service.duration_label].filter(Boolean).length ? <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#546b4f]">{[service.price_label, service.duration_label].filter(Boolean).join(' / ')}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div>
          <PresencePracticeStatement node={node} variant="light" />
          <div id="proof">
            <PresenceLightProof node={node} />
          </div>
          <PresenceGalleryGrid node={node} variant="light" />
          <PresenceCollectionList node={node} variant="light" />
          <PresenceLightPortfolio node={node} />
        </div>
        <div id="contact">
          <PresenceContactBlock node={node} publicUrl={publicUrl} title="Book or enquire" />
        </div>
      </div>
    </main>
  );
}

export function PresenceVenueCollective({ node, publicUrl }: PresenceNodeRendererProps) {
  const cover = node.cover_image_url || visibleWorks(node)[0]?.image_url;
  const facts = [
    node.location_label,
    node.service_area,
    node.directory_ready ? 'Directory ready' : null,
    node.map_ready ? 'Map ready' : null,
    node.archive_ready ? 'Archive ready' : null,
    node.white_label_ready ? 'Network ready' : null,
  ].filter(Boolean);
  return (
    <main className="min-h-screen bg-[#f3eadc] text-[#161712]">
      <PresenceSourceTracker slug={node.slug} />
      <section className="relative min-h-[72vh] overflow-hidden bg-[#161712] text-white">
        <PresencePublicImage
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          fallbackClassName="absolute inset-0 bg-[linear-gradient(135deg,#2d2d25,#12130f)]"
          fallbackLabel=""
          loading="eager"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,23,18,0.94),rgba(22,23,18,0.42)_62%,rgba(22,23,18,0.68))]" />
        <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-6 sm:px-8">
          <a href="#top" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/86">{node.display_name}</a>
          <PresencePilotNav
            tone="dark"
            items={[
              { label: 'About', href: '#about' },
              { label: 'Programs', href: '#programs' },
              { label: 'Spaces', href: '#works' },
              { label: 'Visit', href: '#contact' },
            ]}
          />
        </header>
        <div id="top" className="relative z-10 mx-auto flex min-h-[58vh] max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e4c896]">{displayLabel(node.display_mode, 'Venue / Collective Presence')}</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">{node.headline || node.display_name}</h1>
            {node.bio ? <div id="about" className="mt-5 max-w-lg text-sm leading-7 text-white/78 [&_p+_p]:mt-3" dangerouslySetInnerHTML={{ __html: node.bio }} /> : null}
            <a href="#programs" className="mt-7 inline-flex items-center gap-2 border border-white/74 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white">
              Explore programs
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
      {facts.length ? (
        <section className="border-b border-[#d7c7ad] bg-[#f8f0e2]">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {facts.map((fact) => (
              <div key={String(fact)} className="border-l border-[#d7c7ad] pl-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7b5d38]">Signal</p>
                <p className="mt-2 text-sm font-semibold text-[#161712]">{String(fact)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8">
        <div>
          <div id="programs">
            <PresenceLightServices node={node} title="Programs and services" />
          </div>
          <PresencePracticeStatement node={node} variant="light" />
          <PresenceGalleryGrid node={node} variant="light" />
          <PresenceCollectionList node={node} variant="light" />
          <PresenceLightPortfolio node={node} />
        </div>
        <div id="contact">
          <PresenceContactBlock node={node} publicUrl={publicUrl} title="Enquiry and visit" />
        </div>
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
