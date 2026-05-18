"use client";

// Blueprint: program
//
// Warm practitioner / care pathway room. Service-first entry, a four-
// step care pathway as part of the blueprint itself, ritual booking
// panel (rendered inline since ritual_booking_panel signature is
// scaffolded), trust language, soft motion.

import type { CSSProperties } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { themeClasses, themeStyle } from "@/lib/presence/theme/genome";
import EditorialSnap from "@/components/presence/behaviours/EditorialSnap";
import GalleryBreath from "@/components/presence/behaviours/GalleryBreath";
import TreatedImage from "@/components/presence/TreatedImage";
import { PrimaryCta, SecondaryContact, visibleProof, visibleServices } from "./shared";

interface Props {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  ctaLabel: string;
}

const PATHWAY_STEPS = [
  { tag: "Begin", title: "A first conversation", body: "Send a note about what you are bringing. We meet briefly to see if this practice is the right fit, with no pressure either way." },
  { tag: "Settle", title: "Arrive with care", body: "A clear, unhurried welcome. We agree on what is offered, how it is held, and any access, cultural, or trauma-informed considerations." },
  { tag: "Practice", title: "The work itself", body: "Whatever the session, circle, workshop, or programme is: held to its own pace, grounded in the method described below." },
  { tag: "Carry forward", title: "After the work", body: "A short reflection, anything you take away in writing or in body, and a clear path back if and when you want to return." },
];

export default function ProgramCareRoom({ node, theme, ctaLabel }: Props) {
  const services = visibleServices(node);
  const proof = visibleProof(node);
  const heroImage = node.hero_image_url ?? node.cover_image_url ?? null;

  return (
    <main
      className={themeClasses(theme)}
      style={themeStyle(theme) as CSSProperties}
      data-presence-blueprint="program"
    >
      {/* WARM THRESHOLD */}
      <header className="presence-care-hero">
        <div className="hero-cap">
          <p className="eyebrow">Practitioner room — held with care</p>
          <h1 className="presence-h1">{node.hero_title || node.display_name}</h1>
          {node.headline && <p className="hero-sub">{node.headline}</p>}
          {(node.short_bio || node.bio) && <p className="hero-prose">{node.short_bio || node.bio}</p>}
          <div className="hero-ctas">
            <PrimaryCta node={node} label={ctaLabel} className="presence-cta-care" />
            {node.public_email && (
              <a href={`mailto:${node.public_email}`} className="presence-pill">{node.public_email}</a>
            )}
          </div>
        </div>
        {heroImage && (
          <GalleryBreath intensity="subtle" className="hero-side">
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
      </header>

      {/* SERVICES first — "ways to work" */}
      {services.length > 0 && (
        <EditorialSnap as="section" id="services" intensity={theme.motion_intensity} className="presence-care-services">
          <p className="eyebrow">Sessions, workshops, programmes</p>
          <h2 className="presence-h2">Ways to work together</h2>
          <div className="services-grid">
            {services.map((s, i) => (
              <article key={s.id ?? i} className="service-card">
                <p className="invitation">Invitation {String(i + 1).padStart(2, "0")}</p>
                <h3>{s.title}</h3>
                {s.description && <p className="desc">{s.description}</p>}
                {(s.duration_label || s.price_label) && (
                  <p className="meta">{[s.duration_label, s.price_label].filter(Boolean).join(" · ")}</p>
                )}
              </article>
            ))}
          </div>
        </EditorialSnap>
      )}

      {/* CARE PATHWAY (blueprint-level pattern, not a signature module) */}
      <section id="pathway" className="presence-care-pathway">
        <p className="eyebrow">A care pathway</p>
        <h2 className="presence-h2">How working together unfolds</h2>
        <p className="pathway-intro">
          Not a sales funnel. Four moments held with care — from the first conversation, through arriving and practising, to what is carried forward afterwards.
        </p>
        <ol className="pathway-steps">
          <div className="pathway-thread" aria-hidden />
          {PATHWAY_STEPS.map((step, idx) => (
            <li key={step.tag}>
              <div className="step-num">{String(idx + 1).padStart(2, "0")}</div>
              <p className="step-tag">{step.tag}</p>
              <h3>{step.title}</h3>
              <p className="step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* METHOD STATEMENT */}
      {(node.practice_statement || node.long_story) && (
        <EditorialSnap as="section" intensity={theme.motion_intensity} className="presence-care-method">
          <article className="method-card">
            <p className="eyebrow">Method and philosophy</p>
            <p className="method-prose">{node.practice_statement || node.long_story}</p>
          </article>
        </EditorialSnap>
      )}

      {/* RITUAL BOOKING PANEL (rendered inline — signature_module
          ritual_booking_panel is scaffolded, the blueprint owns it for now) */}
      <section id="booking" className="presence-care-booking">
        <p className="eyebrow">Begin a conversation</p>
        <h2 className="presence-h2">{ctaLabel}</h2>
        <p className="booking-prose">
          A short, no-pressure note about what you are bringing is enough to begin.
        </p>
        <div className="booking-ctas">
          <PrimaryCta node={node} label={ctaLabel} className="presence-cta-care" />
          <SecondaryContact node={node} />
        </div>
        {proof.length > 0 && (
          <div className="booking-proof">
            {proof.slice(0, 2).map((p, i) => (
              <blockquote key={p.id ?? i}>
                {p.testimonial && <p>"{p.testimonial}"</p>}
                {(p.client_label || p.outcome) && (
                  <footer>{[p.client_label, p.outcome].filter(Boolean).join(" · ")}</footer>
                )}
              </blockquote>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
