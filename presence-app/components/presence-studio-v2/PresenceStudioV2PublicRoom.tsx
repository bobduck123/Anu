"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { StudioV2PublicObject, StudioV2PublicRoom } from "@/lib/presence/studio-v2";
import { WORLD_KITS } from "./worlds";
import "./presence-studio-v2-public.css";

interface PresenceStudioV2PublicRoomProps {
  room: StudioV2PublicRoom;
}

export default function PresenceStudioV2PublicRoom({ room }: PresenceStudioV2PublicRoomProps) {
  const [focusedArtwork, setFocusedArtwork] = useState<StudioV2PublicObject | null>(null);
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
  const thresholdObject = visibleObjects.find((object) => object.image?.src) ?? visibleObjects[0];
  const thresholdImage = thresholdObject?.image;
  const entryHref = ctaHref || "#v2-public-room-space";
  const entryLabel = ctaLabel || "Enter room";
  const isGallery = room.worldId === "gallery";
  const thresholdIndex = isGallery
    ? room.chambers
        .filter((chamber) => chamber.objects.length > 0)
        .slice(0, 4)
        .map((chamber) => ({ href: `#v2-public-room-${chamber.id}`, label: chamber.label, marker: "" }))
    : visibleObjects
        .slice(0, 4)
        .map((object, index) => ({
          href: `#v2-public-object-${object.id}`,
          label: object.title,
          marker: String(index + 1).padStart(2, "0"),
        }));

  useEffect(() => {
    if (!focusedArtwork) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusedArtwork(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [focusedArtwork]);

  return (
    <main
      className={`presence-studio-v2-public world-${room.worldId} texture-${room.skin.texture} motion-${room.skin.motionIntensity}${thresholdImage?.src ? " has-threshold-image" : ""}`}
      style={style}
    >
      <section className="v2-public-threshold">
        <div className="v2-public-threshold-atmosphere" aria-hidden="true" />
        {thresholdImage?.src && (
          <div className="v2-public-threshold-image-field" aria-hidden="true">
            <img src={thresholdImage.src} alt="" loading="eager" />
          </div>
        )}
        <div className="v2-public-world-mark">
          <span>{world?.name ?? room.worldId}</span>
          {world?.surface && <small>{world.surface}</small>}
        </div>
        <div className="v2-public-title-group">
          <h1>{room.title}</h1>
          {room.tagline && <p>{room.tagline}</p>}
        </div>
        <PublicLink href={entryHref} className="v2-public-primary-cta">
          {entryLabel}
        </PublicLink>
        {thresholdObject && (
          <aside className="v2-public-threshold-artifact" aria-label="Room entry object">
            {thresholdObject.image?.src ? (
              <img
                src={thresholdObject.image.src}
                alt={thresholdObject.image.alt || thresholdObject.title}
                loading="eager"
              />
            ) : (
              <div className="v2-public-threshold-artifact-blank" aria-hidden="true" />
            )}
            <div>
              <strong>{thresholdObject.title}</strong>
              {thresholdObject.meta && <span>{thresholdObject.meta}</span>}
            </div>
          </aside>
        )}
        {thresholdObject && (
          <div className="v2-public-threshold-caption">
            <span>Opening work</span>
            <strong>{thresholdObject.title}</strong>
          </div>
        )}
        {thresholdIndex.length > 0 && (
          <nav className="v2-public-threshold-index" aria-label={isGallery ? "Threshold room wayfinding" : "Room objects"}>
            {thresholdIndex.map((item) => (
              <a key={item.href} href={item.href}>
                <span aria-hidden={isGallery ? "true" : undefined}>{item.marker}</span>
                <strong>{item.label}</strong>
              </a>
            ))}
          </nav>
        )}
      </section>
      <div className="v2-public-threshold-transition" aria-hidden="true" />

      <section className="v2-public-room-space" id="v2-public-room-space" aria-label={`${room.title} public room`}>
        {room.chambers.map((chamber, chamberIndex) => (
          <section
            id={`v2-public-room-${chamber.id}`}
            className={`v2-public-chamber room-tone-${chamberIndex % 3}${chamberIndex === 0 ? " is-first-room" : ""}`}
            key={chamber.id}
            data-testid="presence-public-chamber-room"
            data-v2-public-chamber-id={chamber.id}
            aria-labelledby={`v2-public-chamber-${chamber.id}`}
          >
            <div className="v2-public-chamber-head">
              <span>{isGallery ? "Gallery room" : world?.verb ?? "The room opens"}</span>
              <h2 id={`v2-public-chamber-${chamber.id}`}>{chamber.label}</h2>
            </div>
            <div className="v2-public-object-grid">
              {chamber.objects.map((object, objectIndex) => (
                <PublicObjectCard
                  key={object.id}
                  object={object}
                  radius={room.skin.objectRadius}
                  isGallery={isGallery}
                  isFeatured={isGallery && chamberIndex === 0 && objectIndex === 0 && Boolean(object.image?.src)}
                  onFocusArtwork={isGallery ? setFocusedArtwork : undefined}
                />
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

      {focusedArtwork?.image?.src && (
        <div
          className="v2-public-artwork-focus"
          data-testid="presence-public-artwork-focus"
          role="dialog"
          aria-modal="true"
          aria-label={`Artwork focus: ${focusedArtwork.title}`}
        >
          <button
            className="v2-public-artwork-focus-backdrop"
            type="button"
            aria-label="Close artwork focus"
            onClick={() => setFocusedArtwork(null)}
          />
          <figure className="v2-public-artwork-focus-stage">
            <button
              className="v2-public-artwork-focus-close"
              data-testid="presence-public-artwork-focus-close"
              type="button"
              onClick={() => setFocusedArtwork(null)}
            >
              Close
            </button>
            <img
              data-testid="presence-public-artwork-focus-image"
              src={focusedArtwork.image.src}
              alt={focusedArtwork.image.alt || focusedArtwork.title}
            />
            <figcaption>
              <strong>{focusedArtwork.title}</strong>
              {focusedArtwork.meta && <span>{focusedArtwork.meta}</span>}
              {focusedArtwork.detail && <p>{focusedArtwork.detail}</p>}
            </figcaption>
          </figure>
        </div>
      )}
    </main>
  );
}

function PublicObjectCard({
  object,
  radius,
  isGallery = false,
  isFeatured = false,
  onFocusArtwork,
}: {
  object: StudioV2PublicObject;
  radius: number;
  isGallery?: boolean;
  isFeatured?: boolean;
  onFocusArtwork?: (object: StudioV2PublicObject) => void;
}) {
  const hasLink = Boolean(object.link);
  const roleLabel = publicObjectRoleLabel(object);
  const canFocusArtwork = isGallery && Boolean(object.image?.src) && !hasLink && Boolean(onFocusArtwork);
  const content = (
    <>
      {object.image?.src && (
        <div className="v2-public-object-media">
          <img
            className="v2-public-object-media-img"
            src={object.image.src}
            alt={object.image.alt || object.title}
            loading="lazy"
          />
          {canFocusArtwork && (
            <button
              className="v2-public-artwork-focus-trigger"
              data-testid="presence-public-artwork-focus-trigger"
              type="button"
              aria-haspopup="dialog"
              aria-label={`View ${object.title}`}
              onClick={() => onFocusArtwork?.(object)}
            >
              View work
            </button>
          )}
        </div>
      )}
      <div className="v2-public-object-copy">
        {roleLabel && <div className="v2-public-object-role">{roleLabel}</div>}
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
        id={`v2-public-object-${object.id}`}
        className={`v2-public-object v2-public-object-${object.type}${object.mobileVisible ? "" : " is-mobile-muted"}${isGallery && object.image?.src ? " is-artwork" : ""}${isFeatured ? " is-featured" : ""}`}
        style={style}
      >
        {content}
      </PublicLink>
    );
  }

  return (
    <article
      id={`v2-public-object-${object.id}`}
      className={`v2-public-object v2-public-object-${object.type}${object.mobileVisible ? "" : " is-mobile-muted"}${isGallery && object.image?.src ? " is-artwork" : ""}${isFeatured ? " is-featured" : ""}`}
      style={style}
      tabIndex={object.detail ? 0 : undefined}
    >
      {content}
    </article>
  );
}

function PublicLink({
  href,
  id,
  className,
  style,
  children,
}: {
  href?: string;
  id?: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!href) {
    return (
      <span id={id} className={`${className} is-disabled`} style={style}>
        {children}
      </span>
    );
  }
  const external = href.startsWith("http://") || href.startsWith("https://");
  return (
    <a
      id={id}
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

function publicObjectRoleLabel(object: StudioV2PublicObject): string | undefined {
  const label = object.role || object.type;
  if (!label) return undefined;
  const normalized = label.toLowerCase();
  if (["image", "text", "note", "link", "moodboard"].includes(normalized)) return undefined;
  if (normalized === object.type.toLowerCase()) return undefined;
  return label;
}
