"use client";

// Blueprint: trust_conversion
//
// Trust-led service room (local carpenter, tradie, restorer). Proof
// EARLY, service ladder, before/after slider as hero signature,
// testimonials. Direct CTA at the top and again at the bottom.

import type { CSSProperties } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { themeClasses, themeStyle } from "@/lib/presence/theme/genome";
import EditorialSnap from "@/components/presence/behaviours/EditorialSnap";
import BeforeAfterProofSlider, { type BeforeAfterPair } from "@/components/presence/signatures/BeforeAfterProofSlider";
import { PrimaryCta, SecondaryContact, visibleProof, visibleServices, visibleWorks } from "./shared";
import { BadgeCheck, MapPin, Star } from "lucide-react";

interface Props {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  ctaLabel: string;
}

export default function TrustConversionRoom({ node, theme, ctaLabel }: Props) {
  const services = visibleServices(node);
  const works = visibleWorks(node);
  const proof = visibleProof(node);
  const credentials = (node.credentials ?? []).filter((c) => c.is_public !== false);
  // Allow demo overlays to ship explicit before/after pairs via node.metadata
  type NodeMeta = { metadata?: { before_after_pairs?: BeforeAfterPair[] } | null };
  const pairs = (node as PresenceNode & NodeMeta).metadata?.before_after_pairs ?? [];

  return (
    <main
      className={themeClasses(theme)}
      style={themeStyle(theme) as CSSProperties}
      data-presence-blueprint="trust_conversion"
    >
      {/* HERO — quote-first: a clear practical promise, the location, a
          direct CTA, and a strip of trust badges. */}
      <header className="presence-trust-hero">
        <div className="hero-cap">
          <p className="eyebrow">Local · trusted · accountable</p>
          <h1 className="presence-h1">{node.hero_title || node.headline || node.display_name}</h1>
          {node.hero_subtitle && <p className="hero-sub">{node.hero_subtitle}</p>}
          <ul className="hero-trust-strip">
            {node.location_label && (
              <li>
                <MapPin className="h-4 w-4" aria-hidden /> {node.location_label}
              </li>
            )}
            {credentials.slice(0, 2).map((c) => (
              <li key={c.id ?? c.title}>
                <BadgeCheck className="h-4 w-4" aria-hidden /> {c.title}
              </li>
            ))}
            {node.availability_status && (
              <li>
                <Star className="h-4 w-4" aria-hidden /> {node.availability_status}
              </li>
            )}
          </ul>
          <div className="hero-ctas">
            <PrimaryCta node={node} label={ctaLabel} className="presence-cta-trust" />
            <SecondaryContact node={node} />
          </div>
        </div>
      </header>

      {/* BEFORE / AFTER signature — proof early per DNA */}
      <EditorialSnap as="section" id="proof-wall" intensity={theme.motion_intensity} className="presence-trust-ba">
        <p className="eyebrow">Before / after — real local work</p>
        <h2 className="presence-h2">Job by job</h2>
        <BeforeAfterProofSlider pairs={pairs} works={works} />
      </EditorialSnap>

      {/* SERVICE LADDER */}
      {services.length > 0 && (
        <EditorialSnap as="section" id="services" intensity={theme.motion_intensity} className="presence-trust-services">
          <p className="eyebrow">Services</p>
          <h2 className="presence-h2">What we quote on</h2>
          <ul className="ladder">
            {services.map((s, i) => (
              <li key={s.id ?? `${s.title}-${i}`} className="rung">
                <div>
                  <h3>{s.title}</h3>
                  {s.description && <p className="rung-desc">{s.description}</p>}
                </div>
                {(s.price_label || s.duration_label) && (
                  <p className="rung-meta">{[s.price_label, s.duration_label].filter(Boolean).join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </EditorialSnap>
      )}

      {/* TESTIMONIALS */}
      {proof.length > 0 && (
        <EditorialSnap as="section" id="testimonials" intensity={theme.motion_intensity} className="presence-trust-testimonials">
          <p className="eyebrow">What clients say</p>
          <div className="testimonials-grid">
            {proof.slice(0, 4).map((p, i) => (
              <blockquote key={p.id ?? i} className="testimonial">
                {p.testimonial && <p className="quote">"{p.testimonial}"</p>}
                {(p.client_label || p.outcome) && (
                  <footer>
                    <span className="who">{p.client_label}</span>
                    {p.outcome && <span className="outcome"> · {p.outcome}</span>}
                  </footer>
                )}
              </blockquote>
            ))}
          </div>
        </EditorialSnap>
      )}

      {/* CONTACT — direct quote pitch */}
      <section id="contact" className="presence-trust-contact">
        <p className="eyebrow">Direct, no-pressure quote</p>
        <h2 className="presence-h2">{ctaLabel}</h2>
        <p className="contact-prose">
          Tell us about the job and your timeline. You'll usually hear back the same day.
        </p>
        <div className="contact-ctas">
          <PrimaryCta node={node} label={ctaLabel} className="presence-cta-trust" />
          <SecondaryContact node={node} />
        </div>
      </section>
    </main>
  );
}
