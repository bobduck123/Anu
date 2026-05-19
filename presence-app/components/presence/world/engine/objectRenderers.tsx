"use client";

// Object + portal renderers shared by the three Pass 4 rooms.
//
// Renderers are pure functions that take a RoomObjectDef and emit a
// React node. Each room provides a slot renderer (how to arrange the
// chamber's objects spatially) and reuses these primitives for the
// objects themselves.

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { PresenceNode } from "@/lib/api/types";
import type { RoomObjectDef } from "@/lib/presence/world/graph";
import MagneticHover from "@/components/presence/world/MagneticHover";
import { PublicEnquiryDialog } from "@/components/portfolio/PublicEnquiryDialog";

function isHttp(src: string) {
  try {
    const u = new URL(src);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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

// ---------------------------------------------------------------------------
// In-chamber object cards (tap to inspect)
// ---------------------------------------------------------------------------
export function ObjectCard({
  object,
  onInspect,
  variant = "frame",
}: {
  object: RoomObjectDef;
  onInspect: (id: string) => void;
  variant?: "frame" | "tile" | "card" | "deck";
}) {
  const className = `room-object room-object-${variant} room-object-${object.kind}`;
  const onClick = () => onInspect(object.id);
  const ariaLabel = `Inspect ${object.title}`;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      data-position={object.position ?? "center"}
    >
      <MagneticHover strength={0.16} maxOffset={9}>
        <div className="room-object-inner">
          {object.media?.imageUrl && (
            <div className="room-object-img">
              <Image
                src={object.media.imageUrl}
                alt={object.title}
                fill
                sizes="(max-width: 768px) 80vw, 28vw"
                unoptimized={isHttp(object.media.imageUrl)}
              />
            </div>
          )}
          <div className="room-object-label">
            <p className="room-object-kind">{object.kind}</p>
            <p className="room-object-title">{object.title}</p>
            {object.summary && <p className="room-object-summary">{object.summary}</p>}
            {object.media?.meta && <p className="room-object-meta">{object.media.meta}</p>}
          </div>
        </div>
      </MagneticHover>
    </button>
  );
}

export function AudioObjectCard({ object, onInspect }: { object: RoomObjectDef; onInspect: (id: string) => void }) {
  const src = object.media?.audioUrl ? mediaSrc(object.media.audioUrl) : null;
  return (
    <article className="room-audio-deck room-object room-object-audio" data-position={object.position ?? "center"}>
      <header className="audio-head">
        <span className="audio-led" aria-hidden />
        <h3 className="audio-title">{object.title}</h3>
        {object.summary && <span className="audio-source">{object.summary}</span>}
      </header>
      {src ? (
        <iframe
          title={object.title}
          src={src}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="audio-frame"
        />
      ) : object.media?.audioUrl ? (
        <a href={object.media.audioUrl} target="_blank" rel="noopener noreferrer" className="audio-fallback">
          Open in source ↗
        </a>
      ) : null}
      <button
        type="button"
        className="audio-inspect"
        onClick={() => onInspect(object.id)}
        aria-label={`Inspect details for ${object.title}`}
      >
        Inspect →
      </button>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Portal panel content renderers (shared)
// ---------------------------------------------------------------------------
export function makePortalRenderer(node: PresenceNode) {
  return function renderPortal(object: RoomObjectDef) {
    if (object.kind === "booking") {
      return (
        <div className="portal-body-booking">
          <p className="portal-body-eyebrow">Invitation</p>
          <p className="portal-body-prose">
            Open a direct conversation. The studio will respond to verified enquiries.
          </p>
          {object.action?.kind === "open_url" && object.action.href ? (
            <a
              href={object.action.href}
              target={object.action.href.startsWith("http") ? "_blank" : undefined}
              rel={object.action.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="portal-cta"
            >
              {object.title} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          ) : (
            <PublicEnquiryDialog
              slug={node.slug}
              displayName={node.display_name}
              nodeType={node.node_type}
              triggerLabel={object.title}
              triggerClassName="portal-cta"
            />
          )}
        </div>
      );
    }

    if (object.kind === "statement" || object.kind === "memory") {
      return (
        <div className="portal-body-text">
          {object.media?.caption && (
            <blockquote className="portal-quote">
              {object.media.caption}
            </blockquote>
          )}
          {object.media?.meta && <p className="portal-meta">{object.media.meta}</p>}
        </div>
      );
    }

    if (object.kind === "audio") {
      const src = object.media?.audioUrl ? mediaSrc(object.media.audioUrl) : null;
      return (
        <div className="portal-body-audio">
          {src ? (
            <iframe
              title={object.title}
              src={src}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="portal-audio-frame"
            />
          ) : object.media?.audioUrl ? (
            <a href={object.media.audioUrl} target="_blank" rel="noopener noreferrer" className="portal-cta">
              Open the recording ↗
            </a>
          ) : (
            <p>No source available for this object.</p>
          )}
          {object.summary && <p className="portal-meta">{object.summary}</p>}
        </div>
      );
    }

    // work, gallery, service, external — default visual + meta
    return (
      <div className="portal-body-object">
        {object.media?.imageUrl && (
          <div className="portal-body-image">
            <Image
              src={object.media.imageUrl}
              alt={object.title}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              unoptimized={isHttp(object.media.imageUrl)}
            />
          </div>
        )}
        <div className="portal-body-meta">
          {object.summary && <p className="portal-body-summary">{object.summary}</p>}
          {object.media?.caption && <p className="portal-body-caption">{object.media.caption}</p>}
          {object.media?.meta && <p className="portal-meta">{object.media.meta}</p>}
          {object.media?.href && (
            <a href={object.media.href} className="portal-cta">
              Open detail page <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      </div>
    );
  };
}
