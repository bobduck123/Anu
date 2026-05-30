import type {
  EditorDraft,
  PublishState,
  Room,
  RoomObject,
  RoomObjectContent,
  StudioRoomTemplateKit,
} from "./model.ts";
import { instantiateRoomFromTemplateKit, listTemplateKits } from "./templateKits.ts";
import { toPublicRoomPayload, type PublicRoomPayload } from "./sanitize.ts";
import { assertValidRoomConfig } from "./validation.ts";

export const TEMPLATE_DRAFT_PERSISTENCE_MODE = "staged-only" as const;

export interface TemplateKitDraftInstantiation {
  kit: Pick<StudioRoomTemplateKit, "id" | "name" | "description" | "ctaStrategy" | "requiredFields" | "optionalFields" | "copyScaffolds">;
  persistence: typeof TEMPLATE_DRAFT_PERSISTENCE_MODE;
  draft: EditorDraft;
  published: PublishState | null;
  publicPreviewPayload: PublicRoomPayload;
  saveablePayload: {
    schemaVersion: Room["schemaVersion"];
    templateKitId: string;
    room: Room;
    requiredFields: string[];
    optionalFields: string[];
    copyScaffolds: StudioRoomTemplateKit["copyScaffolds"];
    ctaStrategy: StudioRoomTemplateKit["ctaStrategy"];
    persistenceBoundary: typeof TEMPLATE_DRAFT_PERSISTENCE_MODE;
  };
}

export function listOwnerCreatableTemplateKits(): StudioRoomTemplateKit[] {
  return listTemplateKits().filter((kit) => kit.supportState === "primary");
}

export function listInternalTemplateKits(): StudioRoomTemplateKit[] {
  return listTemplateKits();
}

export function instantiateTemplateKitDraft(kitId: string): TemplateKitDraftInstantiation {
  const kit = listTemplateKits().find((candidate) => candidate.id === kitId);
  if (!kit) throw new Error(`Unknown TemplateKit: ${kitId}`);
  if (kit.supportState !== "primary") {
    throw new Error(`TemplateKit is not available for owner draft creation: ${kitId}`);
  }

  const room = scrubTemplateRoomForOwnerDraft(instantiateRoomFromTemplateKit(kit.id), kit);
  const draft: EditorDraft = {
    id: `template-draft:${kit.id}:v1`,
    roomId: room.id,
    basePublishedVersion: 0,
    room,
    updatedAt: "2026-05-29T00:00:00.000Z",
    hasUnsavedChanges: true,
  };
  const publicPreviewPayload = toPublicRoomPayload(room);

  return {
    kit: {
      id: kit.id,
      name: kit.name,
      description: kit.description,
      ctaStrategy: { ...kit.ctaStrategy },
      requiredFields: [...kit.requiredFields],
      optionalFields: [...kit.optionalFields],
      copyScaffolds: kit.copyScaffolds.map((scaffold) => ({ ...scaffold })),
    },
    persistence: TEMPLATE_DRAFT_PERSISTENCE_MODE,
    draft,
    published: null,
    publicPreviewPayload,
    saveablePayload: {
      schemaVersion: room.schemaVersion,
      templateKitId: kit.id,
      room,
      requiredFields: [...kit.requiredFields],
      optionalFields: [...kit.optionalFields],
      copyScaffolds: kit.copyScaffolds.map((scaffold) => ({ ...scaffold })),
      ctaStrategy: { ...kit.ctaStrategy },
      persistenceBoundary: TEMPLATE_DRAFT_PERSISTENCE_MODE,
    },
  };
}

function scrubTemplateRoomForOwnerDraft(room: Room, kit: StudioRoomTemplateKit): Room {
  const heroTitle = scaffoldPlaceholder(kit, "hero_title") ?? `Untitled ${kit.name} room`;
  const heroSubtitle = scaffoldPlaceholder(kit, "hero_subtitle") ?? kit.description;
  const practice = scaffoldPlaceholder(kit, "practice_statement") ?? "Add the story, approach, and details for this room.";
  const scrubbed: Room = {
    ...room,
    id: `starter-${kit.id}`,
    slug: `starter-${kit.id}`,
    title: `Untitled ${kit.name}`,
    state: "draft",
    templateKitId: kit.id,
    chambers: room.chambers.map((chamber, chamberIndex) => ({
      ...chamber,
      objects: chamber.objects.map((object, objectIndex) =>
        scrubObject(object, {
          kit,
          chamberIndex,
          objectIndex,
          heroTitle,
          heroSubtitle,
          practice,
        }),
      ),
    })),
    editorOnly: undefined,
    internal: undefined,
  };
  return assertValidRoomConfig(scrubbed);
}

function scrubObject(
  object: RoomObject,
  context: {
    kit: StudioRoomTemplateKit;
    chamberIndex: number;
    objectIndex: number;
    heroTitle: string;
    heroSubtitle: string;
    practice: string;
  },
): RoomObject {
  const content = scrubContent(object, context);
  return {
    ...object,
    label: scrubLabel(object),
    content,
    editorOnly: undefined,
    internal: undefined,
  };
}

function scrubContent(
  object: RoomObject,
  context: {
    kit: StudioRoomTemplateKit;
    chamberIndex: number;
    objectIndex: number;
    heroTitle: string;
    heroSubtitle: string;
    practice: string;
  },
): RoomObjectContent {
  if (object.id === "template-primary-cta" || object.type === "cta") {
    return {
      title: context.kit.ctaStrategy.label,
      body: "This button is staged for your Draft room. Visitors will not see it until the room is published.",
      action: { label: context.kit.ctaStrategy.label, href: `#${context.kit.ctaStrategy.primaryChamberId}` },
    };
  }

  if (context.chamberIndex === 0 && (object.type === "text" || object.type === "headline")) {
    return {
      title: context.heroTitle,
      body: context.heroSubtitle,
    };
  }

  if (object.type === "image" || object.type === "media" || object.type === "work" || object.type === "work-card") {
    return {
      title: object.type === "work" || object.type === "work-card" ? `Work proof ${context.objectIndex + 1}` : "Image placeholder",
      body: "Choose an image and add alt text before publishing.",
    };
  }

  if (object.type === "service" || object.type === "service-card") {
    return {
      title: `Service ${context.objectIndex + 1}`,
      body: "Describe this offer, price range, timing, and who it is for.",
    };
  }

  if (object.type === "testimonial" || object.type === "proof" || object.type === "proof-card") {
    return {
      title: `Proof ${context.objectIndex + 1}`,
      body: "Add a public testimonial, outcome, press quote, or trust signal.",
    };
  }

  if (object.type === "contact") {
    return {
      title: "Public contact",
      body: "Add an explicitly public email or phone number in Studio.",
    };
  }

  if (object.type === "credential" || object.type === "badge" || object.type === "metadata") {
    return {
      title: "Credential",
      body: "Add a public qualification, licence, certification, award, or trust marker.",
    };
  }

  if (object.type === "link" || object.type === "link-card" || object.type === "portal") {
    return {
      title: "Public link",
      body: "Add a public website, booking page, social profile, writing page, or proof link.",
    };
  }

  if (context.chamberIndex <= 2 && (object.type === "text" || object.type === "headline" || object.type === "note")) {
    return {
      title: scrubLabel(object),
      body: context.practice,
    };
  }

  if (object.type === "text" || object.type === "headline" || object.type === "note") {
    return {
      title: scrubLabel(object),
      body: object.content.body ? "Replace this scaffold copy with room-specific content." : "",
    };
  }

  return {
    title: object.content.title ?? object.label,
    body: object.content.body ? "Replace this scaffold copy with room-specific content." : "",
  };
}

function scrubLabel(object: RoomObject): string {
  if (object.type === "contact") return "Public contact";
  if (object.type === "link-card" || object.type === "link" || object.type === "portal") return "Public link";
  if (object.type === "credential") return "Credential";
  if (object.type === "proof-card" || object.type === "proof" || object.type === "testimonial") return "Proof";
  if (object.type === "service-card" || object.type === "service") return "Service";
  if (object.type === "image" || object.type === "media") return "Image";
  if (object.type === "work" || object.type === "work-card") return "Work proof";
  return object.label;
}

function scaffoldPlaceholder(kit: StudioRoomTemplateKit, field: string): string | null {
  return kit.copyScaffolds.find((scaffold) => scaffold.field === field)?.placeholder ?? null;
}
