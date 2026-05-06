"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import type { PresenceNode, PresenceWork, PresenceCollection } from "@/lib/api/types";
import { Chip, StatusPill } from "@/components/ui";

interface PortfolioRendererProps {
  node: PresenceNode;
}

// ── Shared sub-components ──────────────────────────────────────────────────

function ProfileHeader({ node }: { node: PresenceNode }) {
  return (
    <header className="flex flex-col gap-5 pb-8 border-b border-[var(--p-border)]">
      <div className="flex items-start gap-4">
        {node.profile_image_url && (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
            <Image
              src={node.profile_image_url}
              alt={node.display_name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--p-text)] leading-tight">
            {node.display_name}
          </h1>
          {node.headline && (
            <p className="text-base text-[var(--p-text-muted)]">{node.headline}</p>
          )}
          {node.location_label && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--p-text-faint)]">
              <MapPin className="w-3.5 h-3.5" />
              {node.location_label}
            </div>
          )}
        </div>
      </div>

      {node.availability_chips && node.availability_chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {node.availability_chips
            .filter((c) => c.is_active)
            .map((c) => (
              <Chip key={c.id} variant="muted">{c.label}</Chip>
            ))}
        </div>
      )}

      {(node.public_email || node.public_phone) && (
        <div className="flex flex-wrap gap-4 text-sm text-[var(--p-text-muted)]">
          {node.public_email && (
            <a
              href={`mailto:${node.public_email}`}
              className="flex items-center gap-1.5 hover:text-[var(--p-accent)] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {node.public_email}
            </a>
          )}
          {node.public_phone && (
            <a
              href={`tel:${node.public_phone}`}
              className="flex items-center gap-1.5 hover:text-[var(--p-accent)] transition-colors"
            >
              <Phone className="w-4 h-4" />
              {node.public_phone}
            </a>
          )}
        </div>
      )}
    </header>
  );
}

function CoverBanner({ node }: { node: PresenceNode }) {
  if (!node.cover_image_url) return null;
  return (
    <div className="relative w-full h-52 md:h-80 rounded-2xl overflow-hidden mb-6">
      <Image
        src={node.cover_image_url}
        alt={`${node.display_name} cover`}
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}

function WorkGrid({ works, slug }: { works: PresenceWork[]; slug: string }) {
  const visible = works.filter((w) => w.is_visible !== false);
  if (visible.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">Works</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {visible.map((work) => (
          <Link
            key={work.id}
            href={`/p/${slug}/works/${work.id}`}
            className="group flex flex-col gap-2"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--p-surface-alt)]">
              {work.image_url || work.thumbnail_url ? (
                <Image
                  src={(work.thumbnail_url ?? work.image_url)!}
                  alt={work.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--p-text-faint)] text-xs">
                  No image
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--p-text)] leading-snug line-clamp-1">
                {work.title}
              </p>
              {work.year && (
                <p className="text-xs text-[var(--p-text-muted)]">{work.year}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CollectionGrid({ collections, slug }: { collections: PresenceCollection[]; slug: string }) {
  const visible = collections.filter((c) => c.is_visible !== false);
  if (visible.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">Collections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((col) => (
          <Link
            key={col.id}
            href={`/p/${slug}/collections/${col.id}`}
            className="group flex flex-col gap-2"
          >
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-[var(--p-surface-alt)]">
              {col.cover_image_url ? (
                <Image
                  src={col.cover_image_url}
                  alt={col.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--p-text-faint)] text-xs">
                  No cover
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-[var(--p-text)]">{col.title}</p>
              {col.description && (
                <p className="text-sm text-[var(--p-text-muted)] line-clamp-2">{col.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatementBlock({ label, text }: { label: string; text: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">{label}</h2>
      <p className="text-base text-[var(--p-text)] leading-relaxed whitespace-pre-wrap">{text}</p>
    </section>
  );
}

function ServicesBlock({ node }: { node: PresenceNode }) {
  const visible = (node.services ?? []).filter((s) => s.is_visible !== false);
  if (visible.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">Services</h2>
      <div className="flex flex-col gap-3">
        {visible.map((svc) => (
          <div key={svc.id} className="p-4 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)]">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-[var(--p-text)]">{svc.title}</p>
              {svc.price_label && (
                <span className="text-sm text-[var(--p-text-muted)] shrink-0">{svc.price_label}</span>
              )}
            </div>
            {svc.description && (
              <p className="text-sm text-[var(--p-text-muted)] mt-1">{svc.description}</p>
            )}
            {svc.cta_label && svc.cta_url && (
              <a
                href={svc.cta_url}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--p-accent)] font-medium hover:underline"
              >
                {svc.cta_label}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function LinksBlock({ node }: { node: PresenceNode }) {
  const visible = (node.links ?? []).filter((l) => l.is_visible !== false);
  if (visible.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">Links</h2>
      <div className="flex flex-col gap-2">
        {visible.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] hover:border-[var(--p-accent)] hover:bg-[var(--p-surface-alt)] transition-all group"
          >
            <span className="text-sm font-medium text-[var(--p-text)]">{link.label}</span>
            <ExternalLink className="w-4 h-4 text-[var(--p-text-faint)] group-hover:text-[var(--p-accent)] shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}

function BioBlock({ node }: { node: PresenceNode }) {
  if (!node.bio) return null;
  return (
    <section>
      <p className="text-base text-[var(--p-text)] leading-relaxed whitespace-pre-wrap">{node.bio}</p>
    </section>
  );
}

function LandingPortal({ node }: { node: PresenceNode }) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
      style={{ background: "var(--p-ink)" }}
    >
      {node.landing_background_url && (
        <Image
          src={node.landing_background_url}
          alt="background"
          fill
          className="object-cover opacity-30"
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-lg">
        {node.profile_image_url && (
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20">
            <Image src={node.profile_image_url} alt={node.display_name} fill className="object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-light text-white tracking-tight">
            {node.landing_title ?? node.display_name}
          </h1>
          {node.landing_subtitle && (
            <p className="text-lg text-white/60">{node.landing_subtitle}</p>
          )}
        </div>
        <Link
          href="#content"
          className="px-8 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors text-sm tracking-wide"
        >
          {node.landing_enter_label ?? "Enter"}
        </Link>
      </div>
    </div>
  );
}

// ── Display-mode routing ───────────────────────────────────────────────────

export default function PortfolioRenderer({ node }: PortfolioRendererProps) {
  const slug = node.slug;
  const hasLanding = node.landing_enabled && (node.display_mode === "minimal_portal" || node.display_mode === "studio_practice" || node.display_mode === "signature_artist");

  return (
    <div className="min-h-dvh bg-[var(--p-bg)]">
      {hasLanding && <LandingPortal node={node} />}

      <main
        id="content"
        className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-10"
      >
        {/* Cover image (editorial, studio, signature modes) */}
        {["editorial_portfolio", "studio_practice", "signature_artist"].includes(node.display_mode) && (
          <CoverBanner node={node} />
        )}

        <ProfileHeader node={node} />

        <BioBlock node={node} />

        {/* Practice / curatorial statements */}
        {node.practice_statement && (
          <StatementBlock label="Practice" text={node.practice_statement} />
        )}
        {node.curatorial_statement && (
          <StatementBlock label="Curatorial Statement" text={node.curatorial_statement} />
        )}

        {/* Collections before works for gallery/studio modes */}
        {["artist_gallery", "gallery_portal", "studio_practice", "portfolio_presence_kit"].includes(node.display_mode) && (
          <>
            {node.collections && node.collections.length > 0 && (
              <CollectionGrid collections={node.collections} slug={slug} />
            )}
          </>
        )}

        {/* Works grid */}
        {node.works && node.works.length > 0 && (
          <WorkGrid works={node.works} slug={slug} />
        )}

        {/* Collections after works for other modes */}
        {!["artist_gallery", "gallery_portal", "studio_practice", "portfolio_presence_kit"].includes(node.display_mode) && node.collections && node.collections.length > 0 && (
          <CollectionGrid collections={node.collections} slug={slug} />
        )}

        <ServicesBlock node={node} />
        <LinksBlock node={node} />

        {/* Enquiry CTA */}
        {node.public_url && (
          <section className="flex flex-col gap-3 items-start">
            <h2 className="text-xs font-semibold text-[var(--p-text-muted)] uppercase tracking-widest">Get in touch</h2>
            <a
              href={`mailto:${node.public_email ?? ""}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--p-accent)] text-white text-sm font-medium hover:bg-[var(--p-accent-dark)] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {node.primary_cta_label ?? "Send an enquiry"}
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
