"use client";

// Blueprint: editorial_identity
//
// Quiet, restrained editorial scroll. Statement hero, work-or-quote,
// after-story proof. Used by the gallery painter AND the sharp
// consultant — same blueprint, different DNA → must read differently.
// (Gallery painter = work_first entry + gallery_matte treatment;
// consultant = statement_hero + editorial treatment.)

import type { CSSProperties } from "react";
import Link from "next/link";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { themeClasses, themeStyle } from "@/lib/presence/theme/genome";
import GalleryBreath from "@/components/presence/behaviours/GalleryBreath";
import EditorialSnap from "@/components/presence/behaviours/EditorialSnap";
import TreatedImage from "@/components/presence/TreatedImage";
import GalleryWall from "@/components/presence/signatures/GalleryWall";
import QuoteOracle from "@/components/presence/signatures/QuoteOracle";
import { PrimaryCta, SecondaryContact, visibleProof, visibleServices, visibleWorks, workLink, workThumb } from "./shared";

interface Props {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  ctaLabel: string;
}

export default function EditorialIdentityRoom({ node, dna, theme, ctaLabel }: Props) {
  const works = visibleWorks(node);
  const services = visibleServices(node);
  const proof = visibleProof(node);
  const heroImage = node.hero_image_url ?? node.cover_image_url ?? null;
  const heroTitle = node.hero_title || node.display_name;
  const workFirst = dna.composition.entry_type === "work_first" && works.length > 0;
  const story = node.long_story || node.bio || node.short_bio || "";
  // Signature module routing: painter → gallery_wall, consultant → quote_oracle.
  const sig = dna.signature.signature_module;
  const useGalleryWall = sig === "gallery_wall" && works.length > 0;
  const useQuoteOracle = sig === "quote_oracle" && proof.length > 0;

  return (
    <main
      className={themeClasses(theme)}
      style={themeStyle(theme) as CSSProperties}
      data-presence-blueprint="editorial_identity"
    >
      {workFirst ? (
        // Work-first entry: a single large piece IS the hero. Title is
        // small and below, museum-label style.
        <EditorialSnap as="header" intensity={theme.motion_intensity} className="presence-editorial-work-hero">
          <GalleryBreath intensity={theme.motion_intensity}>
            <div className="hero-work">
              <TreatedImage
                src={workThumb(works[0]) ?? heroImage}
                alt={works[0].title}
                treatment={theme.image_treatment}
                texture={theme.texture}
                fill
                priority
              />
            </div>
          </GalleryBreath>
          <figcaption className="hero-label">
            <p className="eyebrow">— Studio / commission room</p>
            <h1 className="presence-h1">{heroTitle}</h1>
            <p className="hero-piece">
              {[works[0].title, works[0].year, works[0].medium].filter(Boolean).join(" · ")}
            </p>
            {node.hero_subtitle && <p className="hero-sub">{node.hero_subtitle}</p>}
            <div className="hero-ctas">
              <PrimaryCta node={node} label={ctaLabel} className="presence-cta-editorial" />
            </div>
          </figcaption>
        </EditorialSnap>
      ) : (
        // Statement-first entry: a long-form statement is the hero.
        <EditorialSnap as="header" intensity={theme.motion_intensity} className="presence-editorial-statement-hero">
          <div className="statement">
            <p className="eyebrow">— Practice room</p>
            <h1 className="presence-h1">{heroTitle}</h1>
            {node.hero_subtitle && <p className="hero-sub">{node.hero_subtitle}</p>}
            {node.short_bio && <p className="hero-summary">{node.short_bio}</p>}
            <div className="hero-ctas">
              <PrimaryCta node={node} label={ctaLabel} className="presence-cta-editorial" />
            </div>
          </div>
          {heroImage && (
            <GalleryBreath intensity={theme.motion_intensity} className="statement-side">
              <TreatedImage
                src={heroImage}
                alt={node.display_name}
                treatment={theme.image_treatment}
                texture={theme.texture}
                fill
                priority
              />
            </GalleryBreath>
          )}
        </EditorialSnap>
      )}

      {/* STORY */}
      {story && (
        <EditorialSnap as="section" id="story" intensity={theme.motion_intensity} className="presence-editorial-story">
          <p className="eyebrow">— Statement</p>
          <p className="story-prose">{story}</p>
        </EditorialSnap>
      )}

      {/* WORKS — when DNA picks gallery_wall, render the signature.
          Otherwise fall through to the standard editorial grid. */}
      {useGalleryWall ? (
        <section id="works" className="presence-editorial-works presence-editorial-works-as-gallery-wall">
          <div className="works-cap">
            <p className="eyebrow">— Selected work</p>
            <h2 className="presence-h2">{workFirst ? "On the wall" : "The gallery wall"}</h2>
          </div>
          <GalleryWall
            works={works}
            slug={node.slug}
            treatment={theme.image_treatment}
            texture={theme.texture}
            intensity={theme.motion_intensity}
            skipFirst={workFirst}
          />
        </section>
      ) : works.length > (workFirst ? 1 : 0) ? (
        <section id="works" className="presence-editorial-works">
          <div className="works-cap">
            <p className="eyebrow">— Selected work</p>
            <h2 className="presence-h2">{workFirst ? "More from the studio" : "Selected pieces"}</h2>
          </div>
          <div className="works-grid">
            {works.slice(workFirst ? 1 : 0, workFirst ? 7 : 6).map((work, i) => (
              <Link key={work.id ?? work.slug ?? i} href={workLink(node.slug, work, i)} className="work-card">
                <GalleryBreath intensity="subtle">
                  <div className="work-img">
                    <TreatedImage
                      src={workThumb(work)}
                      alt={work.title}
                      treatment={theme.image_treatment}
                      texture={theme.texture}
                      fill
                    />
                  </div>
                </GalleryBreath>
                <div className="work-meta">
                  <p className="title">{work.title}</p>
                  {(work.year || work.medium) && (
                    <p className="meta-line">{[work.year, work.medium].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* CASE-STUDY / SERVICES (consulting variant) */}
      {services.length > 0 && (
        <EditorialSnap as="section" id="cases" intensity={theme.motion_intensity} className="presence-editorial-cases">
          <p className="eyebrow">— {dna.practice.field === "consulting" ? "Engagements" : "Services"}</p>
          <h2 className="presence-h2">
            {dna.practice.field === "consulting" ? "How we work together" : "Commission and study"}
          </h2>
          <ol className="cases-list">
            {services.map((s, i) => (
              <li key={s.id ?? `${s.title}-${i}`}>
                <p className="case-num">{String(i + 1).padStart(2, "0")}</p>
                <div>
                  <h3>{s.title}</h3>
                  {s.description && <p className="case-desc">{s.description}</p>}
                  {(s.price_label || s.duration_label) && (
                    <p className="case-meta">{[s.price_label, s.duration_label].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </EditorialSnap>
      )}

      {/* PROOF — when DNA picks quote_oracle, render the rotating
          oracle. Otherwise the standard editorial proof grid. */}
      {useQuoteOracle ? (
        <EditorialSnap as="section" id="proof" intensity={theme.motion_intensity} className="presence-editorial-proof presence-editorial-proof-as-oracle">
          <p className="eyebrow">— What clients say</p>
          <QuoteOracle
            quotes={proof
              .filter((p) => Boolean(p.testimonial))
              .map((p) => ({
                id: p.id,
                testimonial: p.testimonial as string,
                client_label: p.client_label ?? null,
                outcome: p.outcome ?? null,
              }))}
          />
        </EditorialSnap>
      ) : proof.length > 0 ? (
        <EditorialSnap as="section" id="proof" intensity={theme.motion_intensity} className="presence-editorial-proof">
          <p className="eyebrow">— Notes from collaborators</p>
          <div className="proof-grid">
            {proof.slice(0, 4).map((p, i) => (
              <blockquote key={p.id ?? `${p.title}-${i}`} className="proof-card">
                {p.testimonial && <p className="quote">"{p.testimonial}"</p>}
                <footer>
                  {p.client_label && <span className="who">{p.client_label}</span>}
                  {p.outcome && <span className="outcome"> · {p.outcome}</span>}
                </footer>
              </blockquote>
            ))}
          </div>
        </EditorialSnap>
      ) : null}

      {/* CONTACT */}
      <section id="contact" className="presence-editorial-contact">
        <p className="eyebrow">— Begin</p>
        <h2 className="presence-h2">{ctaLabel}</h2>
        <div className="contact-ctas">
          <PrimaryCta node={node} label={ctaLabel} className="presence-cta-editorial" />
          <SecondaryContact node={node} />
        </div>
      </section>
    </main>
  );
}
