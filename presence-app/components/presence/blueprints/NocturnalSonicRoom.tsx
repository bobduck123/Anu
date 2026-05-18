"use client";

// Blueprint: nocturnal_sonic
//
// Performer-led nocturnal room. Booking-pathway-as-hero, audio embeds
// front and centre, glitch gallery as signature, event archive. Uses
// the floating index mobile nav as a deliberate identity layer.

import type { CSSProperties } from "react";
import type { PresenceNode } from "@/lib/api/types";
import type { PresenceDna, ThemeGenome } from "@/lib/presence/dna/types";
import { themeClasses, themeStyle } from "@/lib/presence/theme/genome";
import ControlledGlitch from "@/components/presence/behaviours/ControlledGlitch";
import EditorialSnap from "@/components/presence/behaviours/EditorialSnap";
import GlitchGalleryWall from "@/components/presence/signatures/GlitchGalleryWall";
import FloatingIndexNav, { type FloatingIndexEntry } from "@/components/presence/nav/FloatingIndexNav";
import TreatedImage from "@/components/presence/TreatedImage";
import { PrimaryCta, SecondaryContact, visibleLinks, visibleWorks } from "./shared";

interface Props {
  node: PresenceNode;
  dna: PresenceDna;
  theme: ThemeGenome;
  ctaLabel: string;
}

function mediaSrc(raw: string): string | null {
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
    if (host === "open.spotify.com") return `https://open.spotify.com/embed${url.pathname}`;
    if (host === "soundcloud.com") return `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&color=%23ffd84d`;
  } catch {
    return null;
  }
  return null;
}

export default function NocturnalSonicRoom({ node, dna, theme, ctaLabel }: Props) {
  const works = visibleWorks(node);
  const links = visibleLinks(node);
  const embeds = (node.media_embeds ?? []).map((e) => ({ ...e, src: mediaSrc(e.url) }));
  const hero = node.hero_image_url ?? node.cover_image_url ?? null;
  const heroTitle = node.hero_title || node.display_name;

  const indexEntries: FloatingIndexEntry[] = [
    { id: "front", label: "Threshold", glyph: "00" },
    embeds.length > 0 ? { id: "audio", label: "Audio", glyph: "01" } : null,
    works.length > 0 ? { id: "wall", label: "Wall", glyph: "02" } : null,
    { id: "archive", label: "Archive", glyph: "03" },
    { id: "booking", label: "Booking", glyph: "04" },
  ].filter(Boolean) as FloatingIndexEntry[];

  return (
    <main
      className={themeClasses(theme)}
      style={themeStyle(theme) as CSSProperties}
      data-presence-blueprint="nocturnal_sonic"
    >
      {/* THRESHOLD */}
      <header id="front" className="presence-nocturnal-front">
        {hero && (
          <div className="hero-bg" aria-hidden>
            <TreatedImage
              src={hero}
              alt=""
              treatment={theme.image_treatment}
              texture={theme.texture}
              fill
              priority
            />
          </div>
        )}
        <div className="hero-fog" aria-hidden />
        <div className="hero-grid" aria-hidden />

        <div className="hero-content">
          <p className="eyebrow">— Set / DJ / live — booking room</p>
          <ControlledGlitch intensity={theme.motion_intensity} chroma>
            <h1 className="presence-h1 hero-title">{heroTitle}</h1>
          </ControlledGlitch>
          {node.hero_subtitle && <p className="hero-sub">{node.hero_subtitle}</p>}
          {node.location_label && <p className="hero-locale">/ {node.location_label}</p>}
          <div className="hero-ctas">
            <PrimaryCta node={node} label={ctaLabel} className="presence-cta-nocturnal" />
            {links.find((l) => /soundcloud|mix|set/i.test(l.label)) && (
              <a
                href={links.find((l) => /soundcloud|mix|set/i.test(l.label))!.url}
                target="_blank"
                rel="noopener noreferrer"
                className="presence-cta-ghost-noct"
              >
                Latest set →
              </a>
            )}
          </div>
        </div>
      </header>

      {/* AUDIO STRIP */}
      {embeds.length > 0 && (
        <EditorialSnap as="section" id="audio" intensity={theme.motion_intensity}>
          <div className="presence-noct-band">
            <p className="band-eyebrow">// audio</p>
            <h2 className="band-h">Listen back</h2>
            <div className="audio-grid">
              {embeds.map((embed) => (
                <article key={embed.url} className="audio-card">
                  <p className="label">{embed.label || embed.provider || "Media"}</p>
                  {embed.src ? (
                    <iframe
                      title={embed.label || embed.url}
                      src={embed.src}
                      loading="lazy"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      className="audio-frame"
                    />
                  ) : (
                    <a href={embed.url} target="_blank" rel="noopener noreferrer" className="audio-link">
                      Open media ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </EditorialSnap>
      )}

      {/* GLITCH GALLERY signature */}
      {works.length > 0 && (
        <section id="wall" className="presence-noct-section">
          <div className="band-head">
            <p className="band-eyebrow">// signature</p>
            <h2 className="band-h">Wall</h2>
          </div>
          <GlitchGalleryWall
            works={works}
            intensity={theme.motion_intensity}
            treatment={theme.image_treatment}
            texture={theme.texture}
          />
        </section>
      )}

      {/* EVENT ARCHIVE (uses bio / long_story for prose history) */}
      <section id="archive" className="presence-noct-archive">
        <div className="archive-cap">
          <p className="band-eyebrow">// archive</p>
          <h2 className="band-h">Rooms played, rooms held</h2>
        </div>
        {(node.long_story || node.bio) && (
          <p className="archive-prose">{node.long_story || node.bio}</p>
        )}
        {dna.proof.proof_type.includes("event_history") && (
          <p className="archive-tag">event_history is part of this room's trust pathway.</p>
        )}
      </section>

      {/* BOOKING / CONTACT */}
      <section id="booking" className="presence-noct-booking">
        <p className="band-eyebrow">// booking</p>
        <h2 className="band-h">Book the room</h2>
        <p className="booking-sub">Direct enquiries for sets, residencies, takeovers, and recordings.</p>
        <div className="booking-ctas">
          <PrimaryCta node={node} label={ctaLabel} className="presence-cta-nocturnal" />
          <SecondaryContact node={node} />
        </div>
      </section>

      <FloatingIndexNav entries={indexEntries} accent={theme.accent_hex ?? undefined} />
    </main>
  );
}
