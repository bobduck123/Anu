import type { Chamber, MobileVariant, Room, RoomObject, ThemeTokens } from "./model.ts";
import { toPublicRoomPayload } from "./sanitize.ts";

export type StudioRoomViewport = "desktop" | "mobile";

export interface RenderedRoomObject {
  id: string;
  type: RoomObject["type"];
  label: string;
  title: string;
  body: string;
  image?: { src: string; alt: string; objectPosition?: string };
  aspectRatio?: MobileVariant["aspectRatio"];
  action?: { label: string; href: string };
  priceLabel?: string;
  durationLabel?: string;
  attribution?: string;
  source?: string;
  issuer?: string;
  detail?: string;
}

export interface RenderedChamber {
  id: string;
  type: Chamber["type"];
  title: string;
  summary: string;
  mobileLayout?: MobileVariant["layout"];
  objects: RenderedRoomObject[];
}

export interface StudioRoomRenderTree {
  roomId: string;
  slug: string;
  title: string;
  state: Room["state"];
  theme: ThemeTokens;
  templateKitId?: string;
  chambers: RenderedChamber[];
}

export function renderStudioRoom(room: Room, options: { viewport?: StudioRoomViewport } = {}): StudioRoomRenderTree {
  const viewport = options.viewport ?? "desktop";
  const publicRoom = toPublicRoomPayload(room);
  const chambers = resolveChambers(publicRoom.chambers, viewport).map((chamber) => ({
    id: chamber.id,
    type: chamber.type,
    title: mobileLabel(chamber.mobile, chamber.title, viewport),
    summary: chamber.summary ?? "",
    mobileLayout: chamber.mobile?.layout,
    objects: resolveObjects(chamber.objects, viewport).map((object) => renderObject(object, viewport)),
  }));

  return {
    roomId: publicRoom.id,
    slug: publicRoom.slug,
    title: publicRoom.title,
    state: publicRoom.state,
    theme: publicRoom.theme,
    templateKitId: publicRoom.templateKitId,
    chambers,
  };
}

function renderObject(object: RoomObject, viewport: StudioRoomViewport): RenderedRoomObject {
  const image = object.content.image
    ? {
        src: object.content.image.src,
        alt: object.content.image.alt,
        objectPosition: object.content.image.focalPoint
          ? `${Math.round(object.content.image.focalPoint.x * 100)}% ${Math.round(object.content.image.focalPoint.y * 100)}%`
          : undefined,
      }
    : undefined;
  return {
    id: object.id,
    type: object.type,
    label: mobileLabel(object.mobile, object.label, viewport),
    title: object.content.title ?? object.label,
    body: object.content.body ?? object.content.quote ?? "",
    image,
    aspectRatio: object.mobile?.aspectRatio,
    action: object.content.action,
    priceLabel: object.content.priceLabel,
    durationLabel: object.content.durationLabel,
    attribution: object.content.attribution,
    source: object.content.source,
    issuer: object.content.issuer,
    detail: object.content.detail,
  };
}

function resolveChambers(chambers: Chamber[], viewport: StudioRoomViewport): Chamber[] {
  return orderForViewport(chambers, viewport);
}

function resolveObjects(objects: RoomObject[], viewport: StudioRoomViewport): RoomObject[] {
  return orderForViewport(objects, viewport);
}

function orderForViewport<T extends { mobile?: MobileVariant }>(items: T[], viewport: StudioRoomViewport): T[] {
  const visible = viewport === "mobile" ? items.filter((item) => item.mobile?.hidden !== true) : items;
  if (viewport !== "mobile") return [...visible];
  return [...visible].sort((a, b) => (a.mobile?.order ?? 1000) - (b.mobile?.order ?? 1000));
}

function mobileLabel(mobile: MobileVariant | undefined, fallback: string, viewport: StudioRoomViewport): string {
  if (viewport === "mobile" && mobile?.label) return mobile.label;
  return fallback;
}
