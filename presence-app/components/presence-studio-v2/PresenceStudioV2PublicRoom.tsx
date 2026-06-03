"use client";

import type { CSSProperties, ReactNode } from "react";
import type { StudioV2PublicObject, StudioV2PublicRoom } from "@/lib/presence/studio-v2";
import { WORLD_KITS } from "./worlds";
import "./presence-studio-v2-public.css";

interface PresenceStudioV2PublicRoomProps {
  room: StudioV2PublicRoom;
}

export default function PresenceStudioV2PublicRoom({ room }: PresenceStudioV2PublicRoomProps) {
  const world = WORLD_KITS.find((kit) => kit.id === room.worldId);
  const style = {
    "--v2-public-bg": room.skin.background,
    "--v2-public-accent": room.skin.accentColor,
    "--v2-public-radius": `${room.skin.objectRadius}px`,
    "--v2-public-shadow": `${Math.max(0.05, room.skin.shadowDepth)}`,
    "--v2-public-heading-weight": room.skin.headingWeight,
  } as CSSProperties;
  const visibleObjects = room.chambers.flatMap((chamber) => chamber.objects);
  const ctaObject = visibleObjects.find((object) => object.type === "cta" || object.role === "cta");
  const ctaLabel = ctaObject?.title || room.cta.label;
  const ctaHref = ctaObject?.link || room.cta.href;

  return (
    <main
      className={`presence-studio-v2-public world-${room.worldId} texture-${room.skin.texture} motion-${room.skin.motionIntensity}`}
      style={style}
    >
      <section className="v2-public-threshold">
        <div className="v2-public-world-mark">
          <span>{world?.name ?? room.worldId}</span>
          {world?.surface && <small>{world.surface}</small>}
        </div>
        <div className="v2-public-title-group">
          <h1>{room.title}</h1>
          {room.tagline && <p>{room.tagline}</p>}
        </div>
        {ctaLabel && (
          <PublicLink href={ctaHref} className="v2-public-primary-cta">
            {ctaLabel}
          </PublicLink>
        )}
      </section>

      <section className="v2-public-room-space" aria-label={`${room.title} public room`}>
        {room.chambers.map((chamber) => (
          <section className="v2-public-chamber" key={chamber.id} aria-labelledby={`v2-public-chamber-${chamber.id}`}>
            <div className="v2-public-chamber-head">
              <span>{world?.verb ?? "The room opens"}</span>
              <h2 id={`v2-public-chamber-${chamber.id}`}>{chamber.label}</h2>
            </div>
            <div className="v2-public-object-grid">
              {chamber.objects.map((object) => (
                <PublicObjectCard key={object.id} object={object} radius={room.skin.objectRadius} />
              ))}
            </div>
          </section>
        ))}

        {room.moodboardRefs.length > 0 && (
          <section className="v2-public-influence" aria-labelledby="v2-public-influence-title">
            <div className="v2-public-section-kicker">Influence layer</div>
            <h2 id="v2-public-influence-title">References and coordinates</h2>
            <div className="v2-public-influence-grid">
              {room.moodboardRefs.map((reference) => (
                <article className="v2-public-influence-card" key={reference.id}>
                  <span
                    className="v2-public-influence-dot"
                    style={{ background: reference.dot || room.skin.accentColor }}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="v2-public-influence-type">{reference.type}</div>
                    <h3>{reference.label}</h3>
                    {reference.detail && <p>{reference.detail}</p>}
                    {reference.url && (
                      <PublicLink href={reference.url} className="v2-public-subtle-link">
                        Open reference
                      </PublicLink>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {room.traces?.enabled && room.traces.demo && (
          <section className="v2-public-traces" aria-label="Illustrative room traces">
            <div className="v2-public-trace-disclosure">{room.traces.disclosure || "Demo traces"}</div>
            <div className="v2-public-trace-strip">
              {typeof room.traces.entries === "number" && <span>{room.traces.entries} entered</span>}
              {typeof room.traces.seeds === "number" && <span>{room.traces.seeds} seeds</span>}
              {typeof room.traces.guestbook === "number" && <span>{room.traces.guestbook} guestbook notes</span>}
            </div>
            {room.traces.guestbookEntries && room.traces.guestbookEntries.length > 0 && (
              <div className="v2-public-guestbook">
                {room.traces.guestbookEntries.slice(0, 3).map((entry) => (
                  <blockquote key={entry}>{entry}</blockquote>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

function PublicObjectCard({ object, radius }: { object: StudioV2PublicObject; radius: number }) {
  const hasLink = Boolean(object.link);
  const content = (
    <>
      {object.image?.src && (
        <img
          className="v2-public-object-image"
          src={object.image.src}
          alt={object.image.alt || object.title}
          loading="lazy"
        />
      )}
      <div className="v2-public-object-copy">
        <div className="v2-public-object-role">{object.role || object.type}</div>
        <h3>{object.title}</h3>
        {object.meta && <p className="v2-public-object-meta">{object.meta}</p>}
        {object.detail && <p className="v2-public-object-detail">{object.detail}</p>}
        {hasLink && <span className="v2-public-object-action">Open path</span>}
      </div>
    </>
  );

  const style: CSSProperties = {
    borderRadius: radius,
    transform: objectTransform(object),
    zIndex: object.transform.zIndex,
  };

  if (hasLink) {
    return (
      <PublicLink
        href={object.link}
        className={`v2-public-object v2-public-object-${object.type}${object.mobileVisible ? "" : " is-mobile-muted"}`}
        style={style}
      >
        {content}
      </PublicLink>
    );
  }

  return (
    <article
      className={`v2-public-object v2-public-object-${object.type}${object.mobileVisible ? "" : " is-mobile-muted"}`}
      style={style}
    >
      {content}
    </article>
  );
}

function PublicLink({
  href,
  className,
  style,
  children,
}: {
  href?: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <span className={`${className} is-disabled`} style={style}>
        {children}
      </span>
    );
  }
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a
      href={href}
      className={className}
      style={style}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function objectTransform(object: StudioV2PublicObject): string | undefined {
  const { x, y, rotation, scale } = object.transform;
  if (x === 0 && y === 0 && rotation === 0 && scale === 1) return undefined;
  return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
}
