"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Download,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  MapPin,
  Music,
  QrCode,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";
import { API_BASE } from "@/lib/api/client";
import type {
  PresenceCollection,
  PresenceMediaEmbed,
  PresenceNode,
  PresenceRoomType,
  PresenceService,
  PresenceWork,
} from "@/lib/api/types";
import { canonicalPublicUrl } from "@/lib/presence/url";

const ROOM_TYPES = new Set<string>([
  "minimal_card",
  "artist_studio",
  "practitioner",
  "performer_music",
  "organisation",
]);

const THEME_PRESETS = {
  clean_light: {
    bg: "#f8f7f2",
    surface: "#ffffff",
    elevated: "#f0eee6",
    text: "#1f2933",
    muted: "#65727f",
    border: "#ded8ca",
    accent: "#315f72",
    accentText: "#ffffff",
    hero: "linear-gradient(135deg,#fbfaf7,#e8eef0)",
    soft: "#eef4f5",
  },
  editorial_dark: {
    bg: "#121212",
    surface: "#1d1c19",
    elevated: "#292722",
    text: "#f5f0e8",
    muted: "#c7bfb2",
    border: "#3c3830",
    accent: "#e7b75f",
    accentText: "#15120c",
    hero: "linear-gradient(135deg,#151515,#2c241b)",
    soft: "#24221d",
  },
  warm_earth: {
    bg: "#f2eadf",
    surface: "#fff9f0",
    elevated: "#ead9c5",
    text: "#33251d",
    muted: "#735d4b",
    border: "#d8c4ad",
    accent: "#9a4f2e",
    accentText: "#ffffff",
    hero: "linear-gradient(135deg,#fbf2e5,#dfc1a2)",
    soft: "#f7e6d4",
  },
  gallery_white: {
    bg: "#fbfbf8",
    surface: "#ffffff",
    elevated: "#f0f0eb",
    text: "#20201d",
    muted: "#6f6f67",
    border: "#e3e1d7",
    accent: "#9f4f25",
    accentText: "#ffffff",
    hero: "linear-gradient(135deg,#ffffff,#efede4)",
    soft: "#f6f4ee",
  },
  neon_night: {
    bg: "#07070b",
    surface: "#11121a",
    elevated: "#171a25",
    text: "#f4f7fb",
    muted: "#a4aec0",
    border: "#2a3040",
    accent: "#22d3ee",
    accentText: "#051018",
    hero: "radial-gradient(circle at 20% 20%,rgba(34,211,238,0.22),transparent 32%),linear-gradient(135deg,#07070b,#171124)",
    soft: "#101827",
  },
  soft_healing: {
    bg: "#f5f3ec",
    surface: "#fffdf7",
    elevated: "#e8eddf",
    text: "#2e332c",
    muted: "#657060",
    border: "#d9dfcf",
    accent: "#527a52",
    accentText: "#ffffff",
    hero: "radial-gradient(circle at 18% 18%,rgba(204,226,198,0.8),transparent 34%),linear-gradient(135deg,#fbf8ef,#e8eddf)",
    soft: "#eef4e8",
  },
  cultural_org: {
    bg: "#f5f1ea",
    surface: "#fffaf2",
    elevated: "#eadfce",
    text: "#241f1a",
    muted: "#66594d",
    border: "#d8cabc",
    accent: "#b91c1c",
    accentText: "#ffffff",
    hero: "linear-gradient(135deg,#fff8ec,#ead6c2)",
    soft: "#f1e4d4",
  },
  minimal_mono: {
    bg: "#f7f7f5",
    surface: "#ffffff",
    elevated: "#ededeb",
    text: "#111111",
    muted: "#666666",
    border: "#d8d8d2",
    accent: "#111827",
    accentText: "#ffffff",
    hero: "linear-gradient(135deg,#ffffff,#eeeeea)",
    soft: "#f0f0ed",
  },
} as const;

type ThemePreset = keyof typeof THEME_PRESETS;

interface ProofItem {
  id?: number;
  title?: string | null;
  client_label?: string | null;
  testimonial?: string | null;
  outcome?: string | null;
}

interface PresenceRoomRendererProps {
  node: PresenceNode;
}

export function isPresenceRoomNode(node: PresenceNode): node is PresenceNode & { room_type: PresenceRoomType } {
  return Boolean(node.room_type && ROOM_TYPES.has(node.room_type));
}

export default function PresenceRoomRenderer({ node }: PresenceRoomRendererProps) {
  const theme = themeStyle(node);
  const roomType = node.room_type;

  return (
    <main
      className="min-h-dvh bg-[var(--room-bg)] text-[var(--room-text)]"
      style={theme}
      data-presence-room={roomType ?? "unknown"}
    >
      {roomType === "artist_studio" ? (
        <ArtistStudioRoom node={node} />
      ) : roomType === "practitioner" ? (
        <PractitionerRoom node={node} />
      ) : roomType === "performer_music" ? (
        <PerformerMusicRoom node={node} />
      ) : roomType === "organisation" ? (
        <OrganisationRoom node={node} />
      ) : (
        <MinimalCardRoom node={node} />
      )}
    </main>
  );
}

function themeStyle(node: PresenceNode): CSSProperties {
  const presetKey = isThemePreset(node.theme_preset) ? node.theme_preset : "clean_light";
  const preset = THEME_PRESETS[presetKey];
  const accent = isHexColor(node.accent_color) ? node.accent_color : preset.accent;
  return {
    "--room-bg": preset.bg,
    "--room-surface": preset.surface,
    "--room-elevated": preset.elevated,
    "--room-text": preset.text,
    "--room-muted": preset.muted,
    "--room-border": preset.border,
    "--room-accent": accent,
    "--room-accent-text": preset.accentText,
    "--room-hero": preset.hero,
    "--room-soft": preset.soft,
  } as CSSProperties;
}

function isThemePreset(value: string | null | undefined): value is ThemePreset {
  return Boolean(value && value in THEME_PRESETS);
}

function isHexColor(value: string | null | undefined) {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value));
}

function roomCopy(node: PresenceNode) {
  return {
    title: node.hero_title || node.landing_title || node.display_name,
    subtitle: node.hero_subtitle || node.headline || "",
    summary: node.short_bio || node.bio || "",
    story: node.long_story || node.practice_statement || node.curatorial_statement || node.bio || "",
    heroImage: node.hero_image_url || node.cover_image_url || node.landing_background_url || node.profile_image_url || "",
  };
}

function isHttpImage(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function RoomImage({
  src,
  alt,
  priority = false,
  className,
  fallbackIconClassName = "h-10 w-10",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className: string;
  fallbackIconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--room-elevated)]">
        <ImageIcon className={`${fallbackIconClassName} text-[var(--room-muted)]`} />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      unoptimized={isHttpImage(src)}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function visibleWorks(node: PresenceNode) {
  return (node.works ?? node.gallery_items ?? []).filter((item) => item.is_visible !== false);
}

function visibleCollections(node: PresenceNode) {
  return (node.collections ?? []).filter((item) => item.is_visible !== false);
}

function visibleServices(node: PresenceNode) {
  return (node.services ?? []).filter((item) => item.is_visible !== false);
}

function visibleLinks(node: PresenceNode) {
  return (node.links ?? []).filter((item) => item.is_visible !== false);
}

function proofItems(node: PresenceNode): ProofItem[] {
  const primary = node.proof_items ?? [];
  const testimonialAlias = (node.testimonials ?? []) as ProofItem[];
  const merged = [...primary, ...testimonialAlias];
  const seen = new Set<string>();
  return merged.filter((item) => {
    const key = `${item.id ?? ""}:${item.title ?? ""}:${item.testimonial ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(item.testimonial || item.title || item.outcome);
  });
}

function Section({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 ${className}`}>
      {(eyebrow || title) && (
        <div className="mb-6 max-w-3xl">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--room-accent)]">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-[var(--room-text)] sm:text-3xl">
              {title}
            </h2>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function RoomHero({
  node,
  eyebrow,
  variant = "split",
}: {
  node: PresenceNode;
  eyebrow: string;
  variant?: "split" | "center" | "editorial";
}) {
  const copy = roomCopy(node);
  const facts = [node.location_label, node.availability_status].filter(Boolean) as string[];
  const image = copy.heroImage;
  const centered = variant === "center";

  return (
    <header className="relative overflow-hidden border-b border-[var(--room-border)] bg-[image:var(--room-hero)]">
      <div className="absolute inset-0 opacity-[0.06]" aria-hidden style={{ backgroundImage: "linear-gradient(90deg,currentColor 1px,transparent 1px),linear-gradient(0deg,currentColor 1px,transparent 1px)", backgroundSize: "42px 42px" }} />
      <div
        className={`relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 ${
          centered ? "place-items-center text-center" : "lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)] lg:items-center"
        }`}
      >
        <div className={centered ? "max-w-3xl" : "max-w-3xl"}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--room-accent)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 break-words text-4xl font-semibold leading-[0.96] tracking-tight text-[var(--room-text)] sm:text-6xl">
            {copy.title}
          </h1>
          {copy.subtitle && (
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--room-muted)]">
              {copy.subtitle}
            </p>
          )}
          {copy.summary && (
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--room-muted)] sm:text-base">
              {copy.summary}
            </p>
          )}
          {facts.length > 0 && (
            <div className={`mt-6 flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}>
              {facts.map((fact) => (
                <span
                  key={fact}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--room-border)] bg-[var(--room-surface)] px-3 py-1 text-xs font-medium text-[var(--room-muted)]"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {fact}
                </span>
              ))}
            </div>
          )}
          <div className={`mt-7 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
            <PrimaryAction node={node} />
            <a
              href="#portal"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--room-text)] transition hover:border-[var(--room-accent)]"
            >
              <LinkIcon className="h-4 w-4" />
              Links
            </a>
          </div>
        </div>

        {!centered && (
          <div className="relative min-h-[18rem]">
            {image ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[var(--room-border)] bg-[var(--room-elevated)] shadow-2xl shadow-black/10">
                <RoomImage
                  src={image}
                  alt={`${node.display_name} room hero`}
                  priority
                  className="object-cover"
                  fallbackIconClassName="h-12 w-12"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-[var(--room-border)] bg-[var(--room-elevated)]">
                <ImageIcon className="h-12 w-12 text-[var(--room-muted)]" />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function PrimaryAction({ node }: { node: PresenceNode }) {
  const label = node.primary_cta_label || "Send enquiry";
  if (node.primary_cta_url) {
    return (
      <a
        href={node.primary_cta_url}
        target={node.primary_cta_url.startsWith("http") ? "_blank" : undefined}
        rel={node.primary_cta_url.startsWith("http") ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--room-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--room-accent-text)] transition hover:opacity-90"
      >
        {label}
        <ArrowUpRight className="h-4 w-4" />
      </a>
    );
  }
  return (
    <PublicEnquiryDialog
      slug={node.slug}
      displayName={node.display_name}
      nodeType={node.node_type}
      triggerLabel={label}
      triggerClassName="inline-flex items-center gap-2 rounded-lg bg-[var(--room-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--room-accent-text)] transition hover:opacity-90"
    />
  );
}

function Noticeboard({ node }: { node: PresenceNode }) {
  if (!node.featured_notice && !node.availability_status) return null;
  return (
    <div className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--room-accent)]">
        <CalendarDays className="h-4 w-4" />
        Noticeboard
      </div>
      {node.featured_notice && (
        <p className="mt-3 text-base font-medium leading-7 text-[var(--room-text)]">{node.featured_notice}</p>
      )}
      {node.availability_status && (
        <p className="mt-2 text-sm leading-6 text-[var(--room-muted)]">{node.availability_status}</p>
      )}
    </div>
  );
}

function StoryBlock({ node, title = "Room story" }: { node: PresenceNode; title?: string }) {
  const copy = roomCopy(node);
  if (!copy.story) return null;
  return (
    <Section eyebrow="Front door" title={title}>
      <p className="max-w-3xl whitespace-pre-wrap text-base leading-8 text-[var(--room-muted)]">
        {copy.story}
      </p>
    </Section>
  );
}

function ServicesDesk({
  services,
  title = "Desk",
  eyebrow = "Services and offers",
}: {
  services: PresenceService[];
  title?: string;
  eyebrow?: string;
}) {
  if (services.length === 0) return null;
  return (
    <Section eyebrow={eyebrow} title={title}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article key={service.id ?? service.title} className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-base font-semibold leading-snug text-[var(--room-text)]">{service.title}</h3>
              {service.price_label && <span className="shrink-0 text-xs font-medium text-[var(--room-accent)]">{service.price_label}</span>}
            </div>
            {service.description && <p className="mt-3 text-sm leading-6 text-[var(--room-muted)]">{service.description}</p>}
            {(service.duration_label || service.cta_url) && (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--room-muted)]">
                {service.duration_label && <span>{service.duration_label}</span>}
                {service.cta_url && (
                  <a href={service.cta_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--room-accent)]">
                    {service.cta_label || "Open"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function GalleryWall({
  node,
  works,
  collections = [],
  title = "Wall",
  eyebrow = "Gallery and work",
}: {
  node: PresenceNode;
  works: PresenceWork[];
  collections?: PresenceCollection[];
  title?: string;
  eyebrow?: string;
}) {
  if (works.length === 0 && collections.length === 0) return null;
  return (
    <Section eyebrow={eyebrow} title={title}>
      {works.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work, index) => (
            <Link
              key={work.id ?? work.slug ?? `${work.title}-${index}`}
              href={`/p/${node.slug}/works/${work.id ?? work.slug ?? index}`}
              className="group rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-2 transition hover:-translate-y-0.5 hover:border-[var(--room-accent)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[var(--room-elevated)]">
                {work.thumbnail_url || work.image_url ? (
                  <RoomImage
                    src={(work.thumbnail_url ?? work.image_url)!}
                    alt={work.title}
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    fallbackIconClassName="h-9 w-9"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-9 w-9 text-[var(--room-muted)]" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--room-accent)]">
                  Piece {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-base font-semibold leading-tight text-[var(--room-text)]">{work.title}</h3>
                {(work.year || work.medium || work.availability_status) && (
                  <p className="mt-1 text-xs leading-5 text-[var(--room-muted)]">
                    {[work.year, work.medium, work.availability_status].filter(Boolean).join(" / ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {collections.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {collections.map((collection, index) => (
            <Link
              key={collection.id ?? collection.title}
              href={`/p/${node.slug}/collections/${collection.id ?? index}`}
              className="group rounded-lg border border-[var(--room-border)] bg-[var(--room-elevated)] p-3 transition hover:border-[var(--room-accent)]"
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[var(--room-surface)]">
                {collection.cover_image_url ? (
                  <RoomImage
                    src={collection.cover_image_url}
                    alt={collection.title}
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    fallbackIconClassName="h-8 w-8"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-[var(--room-muted)]" />
                  </div>
                )}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--room-text)]">{collection.title}</h3>
              {collection.description && <p className="mt-2 text-sm leading-6 text-[var(--room-muted)]">{collection.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

function CredentialsShelf({ node }: { node: PresenceNode }) {
  const credentials = (node.credentials ?? []).filter((item) => item.is_public !== false);
  const proof = proofItems(node);
  if (credentials.length === 0 && proof.length === 0) return null;
  return (
    <Section eyebrow="Shelf" title="Proof, credentials and appreciations">
      <div className="grid gap-3 md:grid-cols-2">
        {credentials.map((credential) => (
          <article key={credential.id ?? credential.title} className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
            <BadgeCheck className="h-5 w-5 text-[var(--room-accent)]" />
            <h3 className="mt-3 break-words text-base font-semibold text-[var(--room-text)]">{credential.title}</h3>
            {(credential.issuer || credential.credential_type) && (
              <p className="mt-1 text-sm text-[var(--room-muted)]">
                {[credential.issuer, credential.credential_type].filter(Boolean).join(" / ")}
              </p>
            )}
            {credential.verification_url && (
              <a href={credential.verification_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--room-accent)]">
                Verify <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
        {proof.map((item) => (
          <article key={`${item.id ?? ""}-${item.title ?? item.testimonial}`} className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
            <Star className="h-5 w-5 text-[var(--room-accent)]" />
            {item.title && <h3 className="mt-3 break-words text-base font-semibold text-[var(--room-text)]">{item.title}</h3>}
            {item.testimonial && <p className="mt-3 break-words text-sm leading-7 text-[var(--room-muted)]">{item.testimonial}</p>}
            {(item.client_label || item.outcome) && (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--room-accent)]">
                {[item.client_label, item.outcome].filter(Boolean).join(" / ")}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function PortalLinks({ node }: { node: PresenceNode }) {
  const links = visibleLinks(node);
  if (links.length === 0) return null;
  return (
    <Section eyebrow="Portal" title="Links and next steps" className="pb-6" >
      <div id="portal" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <a
            key={link.id ?? link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] px-4 py-3 text-sm font-semibold text-[var(--room-text)] transition hover:border-[var(--room-accent)]"
          >
            <span className="min-w-0 break-words">{link.label}</span>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--room-accent)]" />
          </a>
        ))}
      </div>
    </Section>
  );
}

function ContactDesk({ node, title = "Contact and enquiry" }: { node: PresenceNode; title?: string }) {
  return (
    <Section eyebrow="Desk" title={title} className="pt-6">
      <div id="contact" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
          <Mail className="h-5 w-5 text-[var(--room-accent)]" />
          <h3 className="mt-3 text-lg font-semibold text-[var(--room-text)]">Start a direct conversation</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--room-muted)]">
            The enquiry form validates the message and records the source room before routing it to the configured inbox.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PublicEnquiryDialog
              slug={node.slug}
              displayName={node.display_name}
              nodeType={node.node_type}
              triggerLabel={node.primary_cta_label || "Send enquiry"}
              triggerClassName="inline-flex items-center gap-2 rounded-lg bg-[var(--room-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--room-accent-text)] transition hover:opacity-90"
            />
            {node.public_email && (
              <a href={`mailto:${node.public_email}`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--room-border)] px-4 py-2.5 text-sm font-semibold text-[var(--room-text)]">
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
          </div>
        </div>
        <ShareTools node={node} />
      </div>
    </Section>
  );
}

function ShareTools({ node }: { node: PresenceNode }) {
  const [copied, setCopied] = useState(false);
  const publicUrl = canonicalPublicUrl(node.slug);
  const qrUrl = `${API_BASE}/api/presence/public/${encodeURIComponent(node.slug)}/qr`;
  const vcardUrl = `${API_BASE}/api/presence/public/${encodeURIComponent(node.slug)}/vcard`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: node.display_name, url: publicUrl });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="rounded-lg border border-[var(--room-border)] bg-[var(--room-elevated)] p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--room-accent)]">
        <QrCode className="h-4 w-4" />
        Share
      </div>
      <div className="mt-4 rounded-md bg-white p-3">
        <img src={qrUrl} alt={`QR code for ${node.display_name}`} className="mx-auto h-36 w-36" />
      </div>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--room-accent)] px-3 py-2 text-xs font-semibold text-[var(--room-accent-text)]"
        >
          <Share2 className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Share room"}
        </button>
        <a
          href={vcardUrl}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] px-3 py-2 text-xs font-semibold text-[var(--room-text)]"
        >
          <Download className="h-3.5 w-3.5" />
          vCard
        </a>
      </div>
    </aside>
  );
}

function MediaEmbeds({ embeds }: { embeds: PresenceMediaEmbed[] | undefined }) {
  const safeEmbeds = (embeds ?? []).map((embed) => ({ embed, src: mediaEmbedSrc(embed.url) })).filter((item) => item.src || item.embed.url);
  if (safeEmbeds.length === 0) return null;
  return (
    <Section eyebrow="Media" title="Listen, watch, press play">
      <div className="grid gap-4 lg:grid-cols-2">
        {safeEmbeds.map(({ embed, src }) => (
          <article key={embed.url} className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--room-text)]">
              <Music className="h-4 w-4 text-[var(--room-accent)]" />
              {embed.label || embed.provider || "Media"}
            </div>
            {src ? (
              <iframe
                title={embed.label || embed.url}
                src={src}
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="h-56 w-full rounded-md border-0 bg-[var(--room-elevated)]"
              />
            ) : (
              <a href={embed.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[var(--room-border)] px-3 py-2 text-sm font-semibold text-[var(--room-accent)]">
                Open media <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}

function mediaEmbedSrc(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "youtu.be") {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
    }
    if (host === "open.spotify.com") {
      return `https://open.spotify.com/embed${url.pathname}`;
    }
  } catch {
    return null;
  }
  return null;
}

function ReadinessFlags({ node }: { node: PresenceNode }) {
  const flags = [
    node.map_ready ? "Map-ready" : null,
    node.directory_ready ? "Directory-ready" : null,
    node.archive_ready ? "Archive-ready" : null,
    node.white_label_ready ? "White-label ready" : null,
  ].filter(Boolean) as string[];
  if (flags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((flag) => (
        <span key={flag} className="rounded-full border border-[var(--room-border)] bg-[var(--room-soft)] px-3 py-1 text-xs font-semibold text-[var(--room-muted)]">
          {flag}
        </span>
      ))}
    </div>
  );
}

function MinimalCardRoom({ node }: { node: PresenceNode }) {
  const services = visibleServices(node);
  return (
    <>
      <RoomHero node={node} eyebrow="Minimal card room" variant="center" />
      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-6">
            <Briefcase className="h-5 w-5 text-[var(--room-accent)]" />
            <h2 className="mt-4 text-2xl font-semibold text-[var(--room-text)]">{node.display_name}</h2>
            {(node.short_bio || node.bio) && <p className="mt-3 text-sm leading-7 text-[var(--room-muted)]">{node.short_bio || node.bio}</p>}
            <div className="mt-6">
              <PrimaryAction node={node} />
            </div>
          </div>
          <Noticeboard node={node} />
        </div>
      </Section>
      <ServicesDesk services={services} title="Services" />
      <CredentialsShelf node={node} />
      <PortalLinks node={node} />
      <ContactDesk node={node} />
    </>
  );
}

function ArtistStudioRoom({ node }: { node: PresenceNode }) {
  const works = visibleWorks(node);
  const collections = visibleCollections(node);
  return (
    <>
      <RoomHero node={node} eyebrow="Artist studio room" variant="editorial" />
      <StoryBlock node={node} title="Statement and studio notes" />
      <GalleryWall node={node} works={works} collections={collections} title="Gallery wall" eyebrow="Wall" />
      <CredentialsShelf node={node} />
      <PortalLinks node={node} />
      <ContactDesk node={node} title="Commission enquiry" />
    </>
  );
}

function PractitionerRoom({ node }: { node: PresenceNode }) {
  const services = visibleServices(node);
  return (
    <>
      <RoomHero node={node} eyebrow="Practitioner room" />
      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <StoryBlockContent node={node} title="Practice and approach" />
          </div>
          <Noticeboard node={node} />
        </div>
      </Section>
      <ServicesDesk services={services} title="Ways to work" eyebrow="Desk" />
      <CredentialsShelf node={node} />
      <PortalLinks node={node} />
      <ContactDesk node={node} title="Booking request" />
    </>
  );
}

function PerformerMusicRoom({ node }: { node: PresenceNode }) {
  const works = visibleWorks(node);
  return (
    <>
      <RoomHero node={node} eyebrow="Performer and music room" />
      <MediaEmbeds embeds={node.media_embeds} />
      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <StoryBlockContent node={node} title="Bio" />
          <Noticeboard node={node} />
        </div>
      </Section>
      <GalleryWall node={node} works={works} title="Press shots and archive" eyebrow="Wall" />
      <CredentialsShelf node={node} />
      <PortalLinks node={node} />
      <ContactDesk node={node} title="Booking enquiry" />
    </>
  );
}

function OrganisationRoom({ node }: { node: PresenceNode }) {
  const services = visibleServices(node);
  const works = visibleWorks(node);
  return (
    <>
      <RoomHero node={node} eyebrow="Organisation room" />
      <Section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <StoryBlockContent node={node} title="Mission and public purpose" />
            <div className="mt-5">
              <ReadinessFlags node={node} />
            </div>
          </div>
          <Noticeboard node={node} />
        </div>
      </Section>
      <ServicesDesk services={services} title="Programs and pathways" eyebrow="Desk" />
      <GalleryWall node={node} works={works} title="Public record and gallery" eyebrow="Wall" />
      <CredentialsShelf node={node} />
      <PortalLinks node={node} />
      <ContactDesk node={node} title="Support, volunteer or contact" />
    </>
  );
}

function StoryBlockContent({ node, title }: { node: PresenceNode; title: string }) {
  const copy = roomCopy(node);
  if (!copy.story && !copy.summary) {
    return (
      <div className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
        <Heart className="h-5 w-5 text-[var(--room-accent)]" />
        <h2 className="mt-3 text-xl font-semibold text-[var(--room-text)]">{title}</h2>
      </div>
    );
  }
  return (
    <article className="rounded-lg border border-[var(--room-border)] bg-[var(--room-surface)] p-5">
      <Users className="h-5 w-5 text-[var(--room-accent)]" />
      <h2 className="mt-3 text-xl font-semibold text-[var(--room-text)]">{title}</h2>
      {copy.summary && <p className="mt-3 text-sm leading-7 text-[var(--room-muted)]">{copy.summary}</p>}
      {copy.story && copy.story !== copy.summary && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--room-muted)]">{copy.story}</p>
      )}
    </article>
  );
}
