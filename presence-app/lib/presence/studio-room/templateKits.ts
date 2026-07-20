import type { Room, StudioRoomTemplateKit } from "./model.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { renderStudioRoom } from "./renderer.ts";
import { toPublicRoomPayload } from "./sanitize.ts";
import { assertValidRoomConfig, validateRoomConfig, type RoomValidationIssue } from "./validation.ts";
import {
  consultantContractorKit,
  culturalCommunityArtistKit,
  galleryArtistKit,
  healingPractitionerKit,
  materialTradieKit,
  undergroundDjKit,
} from "./templates/index.ts";

export const STUDIO_ROOM_TEMPLATE_KITS: readonly StudioRoomTemplateKit[] = Object.freeze([
  galleryArtistKit,
  culturalCommunityArtistKit,
  materialTradieKit,
  healingPractitionerKit,
  consultantContractorKit,
  undergroundDjKit,
]);

export interface TemplateKitValidationResult {
  id: string;
  valid: boolean;
  issues: RoomValidationIssue[];
  restrictedPublicPayloadKeys: string[];
  ctaPresent: boolean;
  mobileVariantCount: number;
}

export interface TemplateKitPreviewMetadata {
  id: string;
  name: string;
  sourceCandidate: string;
  chamberCount: number;
  objectCount: number;
  ctaPresent: boolean;
  semanticCoverage: Record<string, number>;
  mobileVariantCount: number;
  restrictedPublicPayloadKeys: string[];
  deferredFields: string[];
}

export function listTemplateKits(): StudioRoomTemplateKit[] {
  return STUDIO_ROOM_TEMPLATE_KITS.map(cloneKit);
}

export function getTemplateKitById(id: string): StudioRoomTemplateKit | null {
  const kit = STUDIO_ROOM_TEMPLATE_KITS.find((candidate) => candidate.id === id);
  return kit ? cloneKit(kit) : null;
}

export function instantiateRoomFromTemplateKit(id: string, overrides: Partial<Pick<Room, "id" | "slug" | "title" | "state">> = {}): Room {
  const kit = getTemplateKitById(id);
  if (!kit) throw new Error(`Unknown Studio Room TemplateKit: ${id}`);
  return assertValidRoomConfig({
    ...cloneRoom(kit.defaultRoom),
    ...overrides,
    templateKitId: kit.id,
    theme: { ...kit.themeTokens },
    moodPresetId: kit.moodPreset.id,
  });
}

export function validateTemplateKit(kit: StudioRoomTemplateKit): TemplateKitValidationResult {
  const publicPayload = toPublicRoomPayload(kit.defaultRoom);
  const tree = renderStudioRoom(publicPayload, { viewport: "mobile" });
  const ctaPresent = tree.chambers.some((chamber) => chamber.objects.some((object) => object.action?.href));
  const mobileVariantCount = kit.defaultRoom.chambers.reduce((sum, chamber) => {
    return sum + (chamber.mobile ? 1 : 0) + chamber.objects.filter((object) => Boolean(object.mobile)).length;
  }, 0);
  const issues = validateRoomConfig(kit.defaultRoom);
  if (!ctaPresent && kit.ctaStrategy.appearsEarlyOnMobile) {
    issues.push({
      path: "ctaStrategy",
      severity: "warning",
      message: "TemplateKit expects an early mobile CTA but no CTA was rendered.",
    });
  }
  return {
    id: kit.id,
    valid: issues.filter((issue) => issue.severity === "error").length === 0,
    issues,
    restrictedPublicPayloadKeys: findRestrictedPublicPayloadKeys(publicPayload),
    ctaPresent,
    mobileVariantCount,
  };
}

export function templateKitPreviewMetadata(kit: StudioRoomTemplateKit): TemplateKitPreviewMetadata {
  const room = instantiateRoomFromTemplateKit(kit.id);
  const objects = room.chambers.flatMap((chamber) => chamber.objects);
  const validation = validateTemplateKit(kit);
  return {
    id: kit.id,
    name: kit.name,
    sourceCandidate: kit.sourceCandidate.id,
    chamberCount: room.chambers.length,
    objectCount: objects.length,
    ctaPresent: validation.ctaPresent,
    semanticCoverage: {
      contact: objects.filter((object) => object.type === "contact").length,
      services: objects.filter((object) => object.type === "service-card").length,
      proof: objects.filter((object) => object.type === "proof-card").length,
      links: objects.filter((object) => object.type === "link-card").length,
      credentials: objects.filter((object) => object.type === "credential").length,
    },
    mobileVariantCount: validation.mobileVariantCount,
    restrictedPublicPayloadKeys: validation.restrictedPublicPayloadKeys,
    deferredFields: kit.deferredFields ?? [],
  };
}

function cloneKit(kit: StudioRoomTemplateKit): StudioRoomTemplateKit {
  return {
    ...kit,
    intendedUserTypes: [...kit.intendedUserTypes],
    sourceCandidate: { ...kit.sourceCandidate },
    defaultRoom: cloneRoom(kit.defaultRoom),
    themeTokens: { ...kit.themeTokens },
    moodPreset: { ...kit.moodPreset, tokens: { ...kit.moodPreset.tokens } },
    chamberTypes: [...kit.chamberTypes],
    objectTypes: [...kit.objectTypes],
    orderedChambers: [...kit.orderedChambers],
    roomObjects: [...kit.roomObjects],
    ctaStrategy: { ...kit.ctaStrategy },
    requiredFields: [...kit.requiredFields],
    optionalFields: [...kit.optionalFields],
    copyScaffolds: kit.copyScaffolds.map((item) => ({ ...item })),
    validationExpectations: kit.validationExpectations.map((item) => ({ ...item })),
    publicSafeDefaults: [...kit.publicSafeDefaults],
    deferredFields: kit.deferredFields ? [...kit.deferredFields] : undefined,
    previewNotes: kit.previewNotes ? [...kit.previewNotes] : undefined,
  };
}

function cloneRoom(room: Room): Room {
  return {
    ...room,
    theme: { ...room.theme },
    rendererConfig: { ...room.rendererConfig },
    migration: room.migration ? { ...room.migration } : undefined,
    editorOnly: room.editorOnly ? { ...room.editorOnly } : undefined,
    internal: room.internal ? { ...room.internal } : undefined,
    chambers: room.chambers.map((chamber) => ({
      ...chamber,
      mobile: chamber.mobile ? { ...chamber.mobile } : undefined,
      editorOnly: chamber.editorOnly ? { ...chamber.editorOnly } : undefined,
      internal: chamber.internal ? { ...chamber.internal } : undefined,
      objects: chamber.objects.map((object) => ({
        ...object,
        content: {
          ...object.content,
          image: object.content.image ? { ...object.content.image, focalPoint: object.content.image.focalPoint ? { ...object.content.image.focalPoint } : undefined } : undefined,
          action: object.content.action ? { ...object.content.action } : undefined,
        },
        mobile: object.mobile ? { ...object.mobile } : undefined,
        editorOnly: object.editorOnly ? { ...object.editorOnly } : undefined,
        internal: object.internal ? { ...object.internal } : undefined,
      })),
    })),
  };
}
