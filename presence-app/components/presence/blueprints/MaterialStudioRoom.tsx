"use client";

// Blueprint: material_studio
//
// Material-first craft room. The first thing you see is timber and
// finishes. Materials board IS the signature, presented hero-level.
// Collage rhythm, slow reveal on every section.

import type { CSSProperties } from "react";
import Link from "next/link";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { themeClasses, themeStyle } from "@/lib/presence/theme/genome";
import MaterialReveal from "@/components/presence/behaviours/MaterialReveal";
import TreatedImage from "@/components/presence/TreatedImage";
import MaterialsBoard from "@/components/presence/signatures/MaterialsBoard";
import { PrimaryCta, SecondaryContact, visibleProof, visibleServices, visibleWorks, workLink, workThumb } from "./shared";

interface Props {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  ctaLabel: string;
}

export default function MaterialStudioRoom({ node, dna, theme, ctaLabel }: Props) {
  const works = visibleWorks(node);
  const services = visibleServices(node);
  const proof = visibleProof(node);

  return (
    <main
      className={themeClasses(theme)}
      style={themeStyle(theme) as CSSProperties}
      data-presence-blueprint="material_studio"
    >
      {/* MATERIAL-FIRST HERO */}
      <header className="presence-material-hero">
        <div className="hero-cap">
          <p className="eyebrow">— Workshop</p>
          <h1 className="presence-h1">{node.hero_title || node.display_name}</h1>
          {node.hero_subtitle && <p className="hero-sub">{node.hero_subtitle}</p>}
          {node.short_bio && <p className="hero-prose">{node.short_bio}</p>}
          <div className="hero-ctas">
            <PrimaryCta node={node} label={ctaLabel} className="presence-cta-material" />
            {node.location_label && <span className="hero-locale">{node.location_label}</span>}
          </div>
        </div>
        <MaterialReveal intensity={theme.motion_intensity} className="hero-materials">
          <MaterialsBoard works={works} />
        </MaterialReveal>
      </header>

      {/* STORY */}
      {(node.long_story || node.bio) && (
        <MaterialReveal intensity={theme.motion_intensity} className="presence-material-story">
          <p className="eyebrow">— Practice</p>
          <p className="story-prose">{node.long_story || node.bio}</p>
        </MaterialReveal>
      )}

      {/* WORKS — collage layout (broken grid + tilt) */}
      {works.length > 0 && (
        <MaterialReveal intensity={theme.motion_intensity} className="presence-material-works">
          <div className="works-cap">
            <p className="eyebrow">— Recent commissions</p>
            <h2 className="presence-h2">On the bench</h2>
          </div>
          <ul className="works-collage">
            {works.slice(0, 8).map((w, i) => (
              <li key={w.id ?? w.slug ?? i} className={`tile tile-${i % 4}`}>
                <Link href={workLink(node.slug, w, i)} className="tile-link">
                  <div className="tile-img">
                    <TreatedImage
                      src={workThumb(w)}
                      alt={w.title}
                      treatment={theme.image_treatment}
                      texture={theme.texture}
                      fill
                    />
                  </div>
                  <div className="tile-meta">
                    <p className="num">{String(i + 1).padStart(2, "0")}</p>
                    <p className="title">{w.title}</p>
                    {(w.year || w.medium) && <p className="line">{[w.year, w.medium].filter(Boolean).join(" · ")}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </MaterialReveal>
      )}

      {/* COMMISSION PATHWAY (service list as a pathway, not cards) */}
      {services.length > 0 && (
        <MaterialReveal intensity={theme.motion_intensity} className="presence-material-pathway">
          <p className="eyebrow">— Commission pathway</p>
          <h2 className="presence-h2">How a piece is made</h2>
          <ol className="pathway-list">
            {services.map((s, i) => (
              <li key={s.id ?? `${s.title}-${i}`}>
                <span className="step">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{s.title}</h3>
                  {s.description && <p className="desc">{s.description}</p>}
                  {(s.duration_label || s.price_label) && (
                    <p className="meta">{[s.duration_label, s.price_label].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </MaterialReveal>
      )}

      {/* PROOF */}
      {proof.length > 0 && (
        <MaterialReveal intensity={theme.motion_intensity} className="presence-material-proof">
          <p className="eyebrow">— Held by</p>
          <div className="proof-grid">
            {proof.slice(0, 4).map((p, i) => (
              <article key={p.id ?? i} className="proof-card">
                {p.testimonial && <p className="quote">"{p.testimonial}"</p>}
                {(p.client_label || p.outcome) && (
                  <p className="who">{[p.client_label, p.outcome].filter(Boolean).join(" · ")}</p>
                )}
              </article>
            ))}
          </div>
        </MaterialReveal>
      )}

      {/* CONTACT */}
      <section id="contact" className="presence-material-contact">
        <p className="eyebrow">— Begin a piece</p>
        <h2 className="presence-h2">{ctaLabel}</h2>
        <p className="contact-prose">
          Commissions begin with a conversation about the room the piece will live in.
        </p>
        <div className="contact-ctas">
          <PrimaryCta node={node} label={ctaLabel} className="presence-cta-material" />
          <SecondaryContact node={node} />
        </div>
      </section>
    </main>
  );
}
