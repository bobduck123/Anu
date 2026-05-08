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

// ── Distinctive template treatments (v1.1 port) ────────────────────────────
// Three modes that previously rendered as the generic profile now have a
// dedicated visual mechanism: studio wall, care pathway, public noticeboard.

function StudioPracticeView({ node }: { node: PresenceNode }) {
  const slug = node.slug;
  const works = (node.works ?? []).filter((w) => w.is_visible !== false);
  const collections = (node.collections ?? []).filter((c) => c.is_visible !== false);
  const wallImages = [
    node.profile_image_url,
    ...works.map((w) => w.thumbnail_url || w.image_url).filter(Boolean),
  ].filter(Boolean).slice(0, 4) as string[];
  while (wallImages.length < 4) wallImages.push("");
  // Asymmetric polaroid wall positions
  const positions: Array<{ top: string; left?: string; right?: string; width: string; rotate: string; z: number }> = [
    { top: "0%",  left: "4%",  width: "52%", rotate: "-4deg",  z: 3 },
    { top: "8%",  right: "2%", width: "44%", rotate: "5deg",   z: 2 },
    { top: "52%", left: "14%", width: "46%", rotate: "-1.5deg",z: 4 },
    { top: "58%", right: "6%", width: "44%", rotate: "3deg",   z: 1 },
  ];
  const labels = [node.display_name, works[0]?.title, works[1]?.title, works[2]?.title];
  const studioFacts = [node.location_label, works[0]?.medium].filter(Boolean) as string[];

  return (
    <main className="min-h-dvh bg-[#2d211a] text-[#f5ecdf]">
      {/* Hero — STUDIO WALL */}
      <section className="relative overflow-hidden border-b border-[#6b5240]/40">
        {node.cover_image_url && (
          <div aria-hidden className="absolute inset-0 opacity-20">
            <Image src={node.cover_image_url} alt="" fill className="object-cover" />
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 22%,rgba(230,196,154,0.22),transparent 34%),radial-gradient(circle at 82% 18%,rgba(136,91,63,0.24),transparent 26%),linear-gradient(135deg,rgba(24,18,14,0.9),rgba(45,33,26,0.76) 48%,rgba(24,18,14,0.92))",
          }}
        />
        {/* Graph paper grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent 0 31px, rgba(220,196,158,0.6) 31px 32px), repeating-linear-gradient(0deg, transparent 0 31px, rgba(220,196,158,0.6) 31px 32px)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
            {/* Index card identity */}
            <div className="relative">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-[#dbc1a1]">
                <span className="inline-block h-px w-6 bg-[#dbc1a1]/60" /> Studio threshold
              </p>

              <div
                className="relative mt-6 inline-block max-w-2xl bg-[#fbf3e3] px-7 py-7 text-[#2d211a] shadow-[0_28px_60px_-20px_rgba(0,0,0,0.55),0_8px_20px_-8px_rgba(0,0,0,0.4)] sm:-rotate-[1.25deg]"
                style={{
                  backgroundImage: "linear-gradient(rgba(116,82,52,0.04) 1px, transparent 1px)",
                  backgroundSize: "100% 28px",
                }}
              >
                <span
                  aria-hidden
                  className="absolute -top-3 left-8 h-5 w-16 bg-[#e9d6a8]/85 shadow-[0_2px_3px_rgba(0,0,0,0.2)]"
                  style={{ transform: "rotate(-6deg)" }}
                />
                <h1
                  className="text-[2.4rem] font-semibold leading-[0.92] sm:text-5xl"
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
                {node.bio && (
                  <p className="mt-5 max-w-xl text-sm leading-7 text-[#3a2c20] whitespace-pre-wrap">
                    {node.bio}
                  </p>
                )}
              </div>

              <div className="mt-9 flex flex-wrap gap-4">
                <a href="#works" className="border-b border-[#f5ecdf] pb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8f1e8] transition hover:border-[#dbc1a1] hover:text-[#dbc1a1]">
                  Enter the workroom →
                </a>
                {node.public_email && (
                  <a href={`mailto:${node.public_email}`} className="border-b border-[#dbc1a1]/40 pb-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#dbc1a1] transition hover:border-[#f5ecdf] hover:text-[#f5ecdf]">
                    Start a conversation
                  </a>
                )}
              </div>

              {studioFacts.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {studioFacts.map((fact, idx) => (
                    <span
                      key={fact}
                      className="relative inline-block bg-[#fbf3e3] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#5a4638] shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                      style={{
                        transform: `rotate(${(idx % 2 === 0 ? -1 : 1) * (1 + idx * 0.3)}deg)`,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                      }}
                    >
                      <span aria-hidden className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#9a3412] shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                      {fact}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Polaroid mosaic */}
            <div className="relative h-[420px] sm:h-[540px] lg:h-[580px]">
              {wallImages.map((image, idx) => {
                const p = positions[idx];
                return (
                  <div
                    key={`${image || "empty"}-${idx}`}
                    className="absolute"
                    style={{ top: p.top, left: p.left, right: p.right, width: p.width, transform: `rotate(${p.rotate})`, zIndex: p.z }}
                  >
                    <span
                      aria-hidden
                      className="absolute -top-2 left-1/2 h-4 w-14 bg-[#e9d6a8]/80 shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
                      style={{ transform: `translateX(-50%) rotate(${idx % 2 === 0 ? -4 : 5}deg)` }}
                    />
                    <div className="bg-[#fbf3e3] p-2 pb-7 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55),0_4px_10px_rgba(0,0,0,0.3)]">
                      <div className="relative aspect-[4/5] w-full bg-stone-200">
                        {image ? (
                          <Image src={image} alt={labels[idx] ?? ""} fill className="object-cover" />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[#7b695c]"
                            style={{ background: "linear-gradient(135deg,#e7ddd1,#d5c8b9)" }}
                          >
                            Fragment {String(idx + 1).padStart(2, "0")}
                          </div>
                        )}
                      </div>
                      <p className="mt-2 truncate px-1 text-[10px] uppercase tracking-[0.2em] text-[#5a4638]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                        Fragment {String(idx + 1).padStart(2, "0")}
                        {labels[idx] ? ` — ${labels[idx]}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <span aria-hidden className="absolute -bottom-2 left-2 text-[11px] uppercase tracking-[0.32em] text-[#dbc1a1]/70" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                — wall / bench / notes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Practice + curatorial statements */}
      {(node.practice_statement || node.curatorial_statement) && (
        <section className="bg-[#e7dbcd] py-12 text-[#241a15]">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
            {node.practice_statement && (
              <article className="rounded-[2rem] border border-[#6b5240]/22 bg-[#f5ede1] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#8b6247]">Studio method</p>
                <p className="mt-4 text-base leading-7 text-[#241a15] whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {node.practice_statement}
                </p>
              </article>
            )}
            {node.curatorial_statement && (
              <article className="rounded-[1.5rem] border border-[#6b5240]/22 bg-[#e0d1c0] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#7b5942]">Context / lens</p>
                <p className="mt-3 text-sm leading-7 text-[#2f241d] whitespace-pre-wrap">{node.curatorial_statement}</p>
              </article>
            )}
          </div>
        </section>
      )}

      {/* Works on the wall */}
      {works.length > 0 && (
        <section id="works" className="bg-[#e7dbcd] py-12 text-[#241a15]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#8b6247]">Fragments / pieces / studies</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Work on the wall and bench
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {works.map((w, i) => (
                <Link
                  key={w.id ?? i}
                  href={`/p/${slug}/works/${w.id ?? w.slug ?? i}`}
                  className="group rounded-[1.4rem] border border-[#6b5240]/22 bg-[#f6efe5] p-2 transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(79,57,42,0.10)]"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.1rem] bg-stone-200">
                    {(w.thumbnail_url || w.image_url) ? (
                      <Image src={(w.thumbnail_url ?? w.image_url)!} alt={w.title} fill className="object-cover transition group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-[#7b695c]" style={{ background: "linear-gradient(135deg,#e7ddd1,#d5c8b9)" }}>
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-3 px-1 text-[10px] uppercase tracking-[0.2em] text-[#8b6247]">Fragment {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 px-1 text-base font-semibold leading-snug text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{w.title}</h3>
                  {w.year && <p className="mt-1 px-1 text-xs text-[#5a4638]">{w.year}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collections as shelves */}
      {collections.length > 0 && (
        <section className="bg-[#e7dbcd] pb-16 text-[#241a15]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#8b6247]">Shelves / rooms / series</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Bodies of work
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((c, i) => (
                <Link
                  key={c.id ?? c.title}
                  href={`/p/${slug}/collections/${c.id ?? c.title}`}
                  className="group rounded-[1.5rem] border border-[#6b5240]/22 bg-[#efe4d4] p-3 transition hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[1.1rem] bg-stone-200">
                    {c.cover_image_url ? (
                      <Image src={c.cover_image_url} alt={c.title} fill className="object-cover transition group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-[#7b695c]" style={{ background: "linear-gradient(135deg,#e7ddd1,#d5c8b9)" }}>
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#7b5942]">
                    <span>Shelf {String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold leading-tight text-[#241a15]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{c.title}</h3>
                  {c.description && <p className="mt-2 text-sm leading-6 text-[#4b3a2f] line-clamp-3">{c.description}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function PractitionerView({ node }: { node: PresenceNode }) {
  const services = (node.services ?? []).filter((s) => s.is_visible !== false);
  const works = (node.works ?? []).filter((w) => w.is_visible !== false);
  const slug = node.slug;
  const facts = [node.location_label].filter(Boolean) as string[];

  return (
    <main className="min-h-dvh bg-[#f5f0e7] text-[#2b2a26]">
      {/* Calm threshold */}
      <section className="relative overflow-hidden border-b border-[#d8cebf] bg-[#eef1ea]">
        {node.cover_image_url && (
          <div aria-hidden className="absolute inset-0 opacity-[0.18]">
            <Image src={node.cover_image_url} alt="" fill className="object-cover" />
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 24%,rgba(242,216,191,0.78),transparent 32%),radial-gradient(circle at 82% 20%,rgba(197,216,197,0.64),transparent 28%),linear-gradient(180deg,rgba(245,240,231,0.76),rgba(245,240,231,0.96))",
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#527A52]">Practitioner threshold</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[0.95] text-[#5C4232] sm:text-6xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {node.display_name}
            </h1>
            {node.headline && <p className="mt-4 max-w-2xl text-lg leading-7 text-[#527A52]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{node.headline}</p>}
            {node.bio && <p className="mt-6 max-w-2xl text-sm leading-7 text-[#4b4a45] whitespace-pre-wrap">{node.bio}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#contact" className="inline-flex items-center gap-2 rounded-full bg-[#5C4232] px-4 py-2 text-sm font-semibold text-white">
                Begin a conversation →
              </a>
              <a href="#services" className="inline-flex items-center gap-2 rounded-full border border-[#d8cebf] bg-white/70 px-4 py-2 text-sm font-semibold text-[#527A52] backdrop-blur-sm">
                See ways to work
              </a>
            </div>
            {facts.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {facts.map((f) => (
                  <span key={f} className="rounded-full border border-[#ddd2c4] bg-[#faf7f1] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#6B6B6B]">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          {node.profile_image_url && (
            <aside className="hidden lg:block">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.4rem] border border-[#ddd2c4] bg-stone-200 shadow-[0_18px_36px_rgba(92,66,50,0.08)]">
                <Image src={node.profile_image_url} alt={node.display_name} fill className="object-cover" />
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* CARE PATHWAY — the distinctive mechanism */}
      <section className="relative overflow-hidden bg-[#fbfaf6] px-4 py-14 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 28%, rgba(82,122,82,0.08), transparent 35%),radial-gradient(circle at 88% 72%, rgba(217,119,70,0.08), transparent 30%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#527A52]">A care pathway</p>
          <h2 className="mt-3 text-3xl leading-tight text-[#5C4232] sm:text-4xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            How working together unfolds
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#5f5d57]">
            Not a sales funnel. Four moments held with care — from the first
            conversation, through arriving and practising, to what is carried
            forward afterwards.
          </p>
        </div>

        <ol className="relative mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-4 md:gap-4">
          <div aria-hidden className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-[26px] hidden h-px bg-[linear-gradient(90deg,transparent,#c9d5c5_20%,#c9d5c5_80%,transparent)] md:block" />
          {[
            { tag: "Begin",         title: "A first conversation", body: "Send a note about what you are bringing. We meet briefly to see if this practice is the right fit, with no pressure either way.", accent: "#527A52" },
            { tag: "Settle",        title: "Arrive with care",     body: "A clear, unhurried welcome. We agree on what is offered, how it is held, and any access, cultural, or trauma-informed considerations.", accent: "#7B9A6B" },
            { tag: "Practice",      title: "The work itself",      body: "Whatever the session, circle, workshop, or programme is: held to its own pace, grounded in the method described below.",   accent: "#D97746" },
            { tag: "Carry forward", title: "After the work",       body: "A short reflection, anything you take away in writing or in body, and a clear path back if and when you want to return.",     accent: "#5C4232" },
          ].map((step, idx) => (
            <li key={step.tag} className="relative flex flex-col items-center text-center">
              <div
                className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 bg-[#fbfaf6] text-base font-semibold"
                style={{ borderColor: step.accent, color: step.accent, fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {String(idx + 1).padStart(2, "0")}
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: step.accent }}>{step.tag}</p>
              <h3 className="mt-2 text-lg leading-snug text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{step.title}</h3>
              <p className="mt-3 max-w-[18rem] text-sm leading-7 text-[#5f5d57]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Method statement */}
      {node.practice_statement && (
        <section className="bg-[#fbfaf6] px-4 pb-12 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <article className="rounded-[2rem] border border-[#ddd2c4] bg-white/76 p-6 shadow-[0_22px_44px_rgba(92,66,50,0.08)] sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#527A52]">Method and philosophy</p>
              <p className="mt-5 text-base leading-7 text-[#2b2a26] whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {node.practice_statement}
              </p>
            </article>
          </div>
        </section>
      )}

      {/* Services as ways to work */}
      {services.length > 0 && (
        <section id="services" className="bg-[#f5f0e7] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#527A52]">Sessions / workshops / consultations</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Ways to work together
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {services.map((s, i) => (
                <article key={`${s.title}-${i}`} className="rounded-[1.6rem] border border-[#ddd2c4] bg-[#fbfaf6] p-5 shadow-[0_14px_32px_rgba(92,66,50,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D97746]">Invitation {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{s.title}</h3>
                  {s.description && <p className="mt-3 text-sm leading-7 text-[#4b4a45] whitespace-pre-wrap">{s.description}</p>}
                  {(s.price_label || s.duration_label) && (
                    <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#527A52]">
                      {[s.price_label, s.duration_label].filter(Boolean).join(" / ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Documentation if any */}
      {works.length > 0 && (
        <section className="bg-[#f5f0e7] px-4 pb-12 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#527A52]">Practice notes</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Public records
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {works.slice(0, 6).map((w, i) => (
                <Link key={w.id ?? i} href={`/p/${slug}/works/${w.id ?? i}`} className="group rounded-[1.4rem] border border-[#ddd2c4] bg-white/80 p-2 transition hover:-translate-y-0.5">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.1rem] bg-stone-200">
                    {(w.thumbnail_url || w.image_url) ? (
                      <Image src={(w.thumbnail_url ?? w.image_url)!} alt={w.title} fill className="object-cover transition group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#6B6B6B]" style={{ background: "#e8e1d6" }}>
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-3 px-1 text-[10px] uppercase tracking-[0.2em] text-[#D97746]">Record {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 px-1 text-base font-semibold leading-tight text-[#5C4232]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{w.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      {(node.public_email || node.public_phone) && (
        <section id="contact" className="bg-[#5C4232] px-4 py-12 text-[#f7f2ea] sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#F2D8BF]">Begin a conversation</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Reach out about working together.
            </h2>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {node.public_email && (
                <a href={`mailto:${node.public_email}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
                  <Mail className="h-4 w-4" /> {node.public_email}
                </a>
              )}
              {node.public_phone && (
                <a href={`tel:${node.public_phone}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
                  <Phone className="h-4 w-4" /> {node.public_phone}
                </a>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function VenueView({ node }: { node: PresenceNode }) {
  const services = (node.services ?? []).filter((s) => s.is_visible !== false);
  const works = (node.works ?? []).filter((w) => w.is_visible !== false);
  const collections = (node.collections ?? []).filter((c) => c.is_visible !== false);

  return (
    <main className="min-h-dvh bg-[#f3eadc] text-[#161712]">
      {/* Institutional plaque hero */}
      <section className="relative overflow-hidden bg-[#2d241f] text-white">
        {node.cover_image_url && (
          <div aria-hidden className="absolute inset-0 opacity-30">
            <Image src={node.cover_image_url} alt="" fill className="object-cover" />
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 18%,rgba(228,200,150,0.2),transparent 28%),radial-gradient(circle at 82% 22%,rgba(108,133,108,0.16),transparent 26%),linear-gradient(180deg,rgba(22,18,15,0.76),rgba(28,23,19,0.9))",
          }}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#e4c896]">Public cultural node</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[0.95] sm:text-6xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {node.display_name}
          </h1>
          {node.headline && <p className="mt-5 max-w-3xl text-lg leading-7 text-[#f0e7da]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{node.headline}</p>}
          {node.bio && <p className="mt-6 max-w-3xl text-sm leading-7 text-white/78 whitespace-pre-wrap">{node.bio}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#programs" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              Explore programs
            </a>
            <a href="#contact" className="rounded-full border border-[#e4c896]/28 bg-[#e4c896]/12 px-4 py-2 text-sm font-semibold text-[#f7e8d2]">
              Visit / partner / support
            </a>
          </div>
        </div>
      </section>

      {/* Holding statement */}
      {(node.practice_statement || node.curatorial_statement) && (
        <section className="bg-[#f3eadc] py-12 text-[#161712]">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {node.practice_statement && (
              <article className="rounded-[2rem] border border-[#d7c7ad] bg-[#fbf6ef] p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b5d38]">Holding and purpose</p>
                <p className="mt-5 text-base leading-7 text-[#161712] whitespace-pre-wrap" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {node.practice_statement}
                </p>
              </article>
            )}
            {node.curatorial_statement && (
              <article className="rounded-[1.5rem] border border-[#d7c7ad] bg-[#f8f0e2] p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7b5d38]">Hosting notes</p>
                <p className="mt-4 text-sm leading-7 text-[#3c332a] whitespace-pre-wrap">{node.curatorial_statement}</p>
              </article>
            )}
          </div>
        </section>
      )}

      {/* PUBLIC NOTICEBOARD — programs as pinned paper notices on cork */}
      <section id="programs" className="relative overflow-hidden bg-[#7d603a] py-12 shadow-[inset_0_2px_8px_rgba(0,0,0,0.18)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55] mix-blend-multiply"
          style={{
            backgroundImage:
              "radial-gradient(rgba(60,40,20,0.6) 1.2px, transparent 1.4px),radial-gradient(rgba(120,90,50,0.4) 1px, transparent 1.4px)",
            backgroundSize: "14px 14px, 22px 22px",
            backgroundPosition: "0 0, 7px 11px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-[1.4rem] border border-[#a07d49]/40 p-3 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#f0d8a4]">Public noticeboard</p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#fbf6ef] sm:text-4xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  Programs and gatherings
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#f0d8a4]/82">
                Pinned here are the current public programs. Each notice opens
                for time, host, and the way into the room.
              </p>
            </div>

            {services.length > 0 ? (
              <ul className="relative mt-10 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
                {services.map((s, i) => {
                  const rot = [-1.2, 0.8, -0.5, 1.4, -1.6, 0.6][i % 6];
                  const pin = ["#cf3a3a", "#1f5fa3", "#d99427", "#3f8a4f", "#6e3aa0", "#222"][i % 6];
                  return (
                    <li key={`${s.title}-${i}`} className="relative" style={{ transform: `rotate(${rot}deg)` }}>
                      <span aria-hidden className="absolute -top-3 left-1/2 z-20 h-4 w-4 -translate-x-1/2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)]" style={{ background: pin }} />
                      <article className="relative bg-[#fbf6ef] px-5 py-5 shadow-[0_18px_30px_-12px_rgba(0,0,0,0.55),0_4px_8px_rgba(0,0,0,0.3)]">
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7b5d38]">Program {String(i + 1).padStart(2, "0")}</p>
                        <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{s.title}</h3>
                        {s.description && <p className="mt-3 text-sm leading-7 text-[#3c332a] whitespace-pre-wrap">{s.description}</p>}
                        {(s.price_label || s.duration_label) && (
                          <p className="mt-4 inline-block border-t border-[#d7c7ad] pt-2 text-[10px] uppercase tracking-[0.2em] text-[#6c855b]">
                            {[s.price_label, s.duration_label].filter(Boolean).join(" / ")}
                          </p>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="relative mt-8 inline-block bg-[#fbf6ef] px-6 py-5 text-sm leading-7 text-[#5f5648] shadow-[0_18px_30px_-12px_rgba(0,0,0,0.55)]">
                <span aria-hidden className="absolute -top-3 left-8 h-4 w-4 rounded-full bg-[#cf3a3a] shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
                The board is open. New programs, gatherings, residencies, or hosting offers will be pinned here as they are published.
              </div>
            )}

            <div className="mt-12 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-[10px] uppercase tracking-[0.26em] text-[#f0d8a4]/70">Ways in:</span>
              <a href="#contact" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] hover:bg-[#f0d8a4]/20">Visit</a>
              <a href="#contact" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] hover:bg-[#f0d8a4]/20">Propose a program</a>
              <a href="#contact" className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] hover:bg-[#f0d8a4]/20">Partner</a>
              <a href="#spaces"  className="rounded-full border border-[#f0d8a4]/40 bg-[#f0d8a4]/10 px-3 py-1.5 uppercase tracking-[0.18em] text-[#fbf6ef] hover:bg-[#f0d8a4]/20">Document</a>
            </div>
          </div>
        </div>
      </section>

      {/* Spaces / records */}
      {(works.length > 0 || collections.length > 0) && (
        <section id="spaces" className="bg-[#f3eadc] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#6c855b]">Rooms / scenes / records</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Spaces and public record
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {works.slice(0, 6).map((w, i) => (
                <Link key={w.id ?? i} href={`/p/${node.slug}/works/${w.id ?? i}`} className="group rounded-[1.4rem] border border-[#d7c7ad] bg-white/80 p-2 transition hover:-translate-y-0.5">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.1rem] bg-stone-200">
                    {(w.thumbnail_url || w.image_url) ? (
                      <Image src={(w.thumbnail_url ?? w.image_url)!} alt={w.title} fill className="object-cover transition group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#6d6559]" style={{ background: "#e8dfd0" }}>
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-3 px-1 text-[10px] uppercase tracking-[0.2em] text-[#7b5d38]">Scene {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-1 px-1 text-base font-semibold leading-tight text-[#161712]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{w.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// ── Display-mode routing ───────────────────────────────────────────────────

export default function PortfolioRenderer({ node }: PortfolioRendererProps) {
  // v1.1 — three distinctive template branches, each with a named visual mechanism.
  if (node.display_mode === "studio_practice") {
    return <StudioPracticeView node={node} />;
  }
  if (node.display_mode === "practitioner_profile") {
    return <PractitionerView node={node} />;
  }
  if (node.display_mode === "venue_profile" || node.display_mode === "organisation_profile") {
    return <VenueView node={node} />;
  }

  // Generic fallback for the other display modes (artist_gallery, gallery_portal,
  // editorial_portfolio, minimal_portal, portfolio_presence_kit, profile_card,
  // showcase, premium_profile, etc.).
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
