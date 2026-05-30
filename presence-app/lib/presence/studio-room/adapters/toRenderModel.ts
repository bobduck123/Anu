import {
  authored,
  canonical,
  type MotionIntensity,
  type PresenceRenderModel,
  type RenderAsset,
  type RenderMode,
  type RenderWork,
  type SceneInstance,
  type WidgetInstance,
} from "../../render/model.ts";
import type { Chamber, Room, RoomObject, ThemeTokens } from "../model.ts";
import { toPublicRoomPayload } from "../sanitize.ts";

export function renderModelFromStudioRoom(room: Room, mode: RenderMode = room.state === "draft" ? "draft" : "published"): PresenceRenderModel {
  const publicRoom = toPublicRoomPayload(room);
  const works = worksFromRoom(publicRoom);
  const scenes = publicRoom.chambers.map((chamber, index) => sceneFromChamber(chamber, index, works));
  const heroSlides = works.length > 0 ? works : heroFromRoom(publicRoom);

  return {
    mode,
    empty: publicRoom.chambers.length === 0,
    identity: {
      slug: publicRoom.slug,
      displayName: authored(publicRoom.title),
      headline: authored(firstText(publicRoom) || ""),
      rendererKey: publicRoom.rendererConfig.renderer,
      publicUrl: `/p/${publicRoom.slug}`,
    },
    palette: {
      bg: authored(publicRoom.theme.background),
      paper: authored(publicRoom.theme.surface),
      paperWarm: authored(publicRoom.theme.surface),
      ink: authored(publicRoom.theme.text),
      muted: authored(publicRoom.theme.muted),
      line: authored(publicRoom.theme.muted),
      stage: authored(publicRoom.theme.background),
      accent: authored(publicRoom.theme.accent),
    },
    typography: {
      headingFamily: authored(publicRoom.theme.fontHeading),
      bodyFamily: authored(publicRoom.theme.fontBody),
      headingFontId: canonical(null),
      bodyFontId: canonical(null),
      fontPackId: canonical(null),
    },
    motion: {
      intensity: authored(motion(publicRoom.theme)),
      liquidStyle: canonical("ripple" as never),
      liquidIntensity: authored(publicRoom.theme.motion === "still" ? 0 : publicRoom.theme.motion === "gentle" ? 0.25 : 0.48),
      liquidDistortion: authored(publicRoom.theme.motion === "still" ? 0 : 0.35),
      liquidDurationMs: canonical(1200),
      ditherStrength: canonical(0.2),
      filmGrainStrength: canonical(0.15),
      blurAmount: canonical(0.15),
      parallaxDepth: canonical(0.35),
      customCursor: canonical(false),
      heavyMotion: canonical(false),
      reducedMotionFallback: authored(publicRoom.rendererConfig.reducedMotion),
      safetyCapApplied: false,
      requestedLiquidIntensity: publicRoom.theme.motion === "still" ? 0 : publicRoom.theme.motion === "gentle" ? 0.25 : 0.48,
    },
    scenes,
    works,
    hero: { primaryWorkSlug: heroSlides[0]?.slug ?? "", slides: heroSlides },
    roomKey: {
      provenanceChipText: canonical("Opened via RoomKey"),
      guestEntryCopy: canonical("You have entered this Presence Room."),
      invalidCopy: canonical("This Room Key is not available."),
      revokedCopy: canonical("This Room Key has been revoked."),
    },
    elementStyles: {},
    provenanceSummary: { authored: 9, node: 0, canonical: 11 },
  };
}

function sceneFromChamber(chamber: Chamber, index: number, works: RenderWork[]): SceneInstance {
  return {
    id: chamber.id,
    number: String(index + 1).padStart(2, "0"),
    label: chamber.title,
    sub: chamber.summary ?? "",
    layout: authored(chamber.type === "gallery" ? "gallery-wall" : chamber.type === "invitation" ? "calling-paper" : "hero-still"),
    background: authored(chamber.type === "gallery" ? "paper" : "stage"),
    widgets: chamber.objects.map((object, objectIndex) => widgetFromObject(object, chamber, objectIndex, works)),
  };
}

function widgetFromObject(object: RoomObject, chamber: Chamber, index: number, works: RenderWork[]): WidgetInstance {
  return {
    id: object.id,
    type: widgetTypeForObject(object, chamber, index),
    scene: chamber.id,
    order: object.mobile?.order ?? index,
    config: widgetConfigForObject(object, works),
    provenance: "authored",
  };
}

function widgetConfigForObject(object: RoomObject, works: RenderWork[]): Record<string, unknown> {
  if (object.type === "image") {
    return {
      asset: object.content.image ? assetFromObject(object) : null,
    };
  }
  if (object.type === "work") {
    return {
      works,
      layout: "gallery-wall",
      lead: object.content.body ?? "",
    };
  }
  if (object.type === "cta") {
    return {
      label: object.content.action?.label ?? object.content.title ?? object.label,
      href: object.content.action?.href ?? "#",
    };
  }
  return {
    text: object.content.title ?? object.label,
    copy: object.content.body ?? "",
  };
}

function widgetTypeForObject(object: RoomObject, chamber: Chamber, index: number): WidgetInstance["type"] {
  if (object.type === "image") return chamber.type === "entrance" || index === 0 ? "hero-image" : "work-feature";
  if (object.type === "work") return "work-wall";
  if (object.type === "cta") return "invitation";
  if (chamber.type === "entrance" && index === 0) return "hero-title";
  if (object.type === "note") return "process-notes";
  return "statement";
}

function worksFromRoom(room: Room): RenderWork[] {
  const objects = room.chambers.flatMap((chamber) => chamber.objects);
  return objects
    .filter((object) => object.type === "work" || object.content.image)
    .map((object, index) => ({
      slug: slug(object.id || `work-${index + 1}`),
      title: object.content.title ?? object.label,
      year: null,
      medium: "",
      dimensions: "",
      description: object.content.body ?? "",
      asset: assetFromObject(object),
      visible: true,
    }));
}

function heroFromRoom(room: Room): RenderWork[] {
  const image = room.chambers.flatMap((chamber) => chamber.objects).find((object) => object.content.image);
  return image ? [{
    slug: slug(image.id),
    title: image.content.title ?? image.label,
    year: null,
    medium: "",
    dimensions: "",
    description: image.content.body ?? "",
    asset: assetFromObject(image),
    visible: true,
  }] : [];
}

function assetFromObject(object: RoomObject): RenderAsset {
  return {
    id: object.id,
    slug: slug(object.id),
    url: object.content.image?.src ?? "",
    thumbnailUrl: object.content.image?.src ?? "",
    altText: object.content.image?.alt ?? object.content.title ?? object.label,
    focalPoint: object.content.image?.focalPoint,
  };
}

function firstText(room: Room): string {
  for (const object of room.chambers.flatMap((chamber) => chamber.objects)) {
    const value = object.content.body ?? object.content.title;
    if (value) return value;
  }
  return "";
}

function motion(theme: ThemeTokens): MotionIntensity {
  return theme.motion === "living" ? "living" : theme.motion === "gentle" ? "gentle" : "still";
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "room-object";
}
