"use client";

// Blueprint: glitch_gallery
//
// A glitch-led visual identity room, distinct from nocturnal_sonic in
// that the gallery — not the audio — is the central thing. Used as a
// fallback for performer/music/visual rooms where audio is absent.

import type { CSSProperties } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { themeClasses, themeStyle } from "@/lib/presence/theme/genome";
import ControlledGlitch from "@/components/presence/behaviours/ControlledGlitch";
import GlitchGalleryWall from "@/components/presence/signatures/GlitchGalleryWall";
import FloatingIndexNav, { type FloatingIndexEntry } from "@/components/presence/nav/FloatingIndexNav";
import TreatedImage from "@/components/presence/TreatedImage";
import { PrimaryCta, SecondaryContact, visibleWorks } from "./shared";

interface Props {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  ctaLabel: string;
}

export default function GlitchGalleryRoom({ node, theme, ctaLabel }: Props) {
  const works = visibleWorks(node);
  const heroImage = node.hero_image_url ?? node.cover_image_url ?? works[0]?.image_url ?? null;
  const indexEntries: FloatingIndexEntry[] = [
    { id: "front", label: "Threshold", glyph: "00" },
    { id: "wall", label: "Wall", glyph: "01" },
    { id: "contact", label: "Contact", glyph: "02" },
  ];

  return (
    <main
      className={themeClasses(theme)}
      style={themeStyle(theme) as CSSProperties}
      data-presence-blueprint="glitch_gallery"
    >
      <header id="front" className="presence-glitch-front">
        {heroImage && (
          <div className="hero-bg" aria-hidden>
            <TreatedImage src={heroImage} alt="" treatment="glitch" texture="scanline" fill priority />
          </div>
        )}
        <div className="hero-veil" aria-hidden />
        <div className="hero-cap">
          <p className="eyebrow">// gallery / index / wall</p>
          <ControlledGlitch intensity={theme.motion_intensity} chroma>
            <h1 className="presence-h1">{node.hero_title || node.display_name}</h1>
          </ControlledGlitch>
          {node.hero_subtitle && <p className="hero-sub">{node.hero_subtitle}</p>}
          <div className="hero-ctas">
            <PrimaryCta node={node} label={ctaLabel} className="presence-cta-nocturnal" />
          </div>
        </div>
      </header>

      <section id="wall" className="presence-glitch-wallsec">
        <GlitchGalleryWall works={works} intensity={theme.motion_intensity} treatment="glitch" texture="scanline" />
      </section>

      <section id="contact" className="presence-glitch-contact">
        <h2 className="presence-h2">{ctaLabel}</h2>
        <div className="contact-ctas">
          <PrimaryCta node={node} label={ctaLabel} className="presence-cta-nocturnal" />
          <SecondaryContact node={node} />
        </div>
      </section>

      <FloatingIndexNav entries={indexEntries} accent={theme.accent_hex ?? undefined} />
    </main>
  );
}
