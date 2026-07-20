import { demoProfileForSlug } from "../../demo/profiles.ts";
import { studioRoomFromPresenceNode } from "../adapters/fromEditableConfig.ts";
import {
  PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
  type Chamber,
  type ChamberType,
  type MoodPreset,
  type Room,
  type RoomObject,
  type RoomObjectType,
  type StudioRoomTemplateKit,
  type TemplateKitCtaStrategy,
  type ThemeTokens,
} from "../model.ts";
import { assertValidRoomConfig } from "../validation.ts";

export interface TemplateBuildOptions {
  id: string;
  name: string;
  description: string;
  intendedUserTypes: string[];
  sourceSlug: string;
  sourceLabel: string;
  themeTokens: ThemeTokens;
  moodPreset: MoodPreset;
  supportState?: StudioRoomTemplateKit["supportState"];
  chamberTitles: Partial<Record<string, { title: string; summary?: string; type?: ChamberType; mobileLabel?: string }>>;
  chamberOrder?: string[];
  ensureChambers?: Array<{ id: string; type: ChamberType; title: string; summary: string; objectLabel: string; objectType?: RoomObjectType }>;
  ctaStrategy: TemplateKitCtaStrategy;
  requiredFields: string[];
  optionalFields: string[];
  copyScaffolds: StudioRoomTemplateKit["copyScaffolds"];
  validationExpectations?: StudioRoomTemplateKit["validationExpectations"];
  publicSafeDefaults?: string[];
  deferredFields?: string[];
  previewNotes?: string[];
}

export function buildTemplateKit(options: TemplateBuildOptions): StudioRoomTemplateKit {
  const sourceNode = demoProfileForSlug(options.sourceSlug);
  if (!sourceNode) {
    throw new Error(`TemplateKit source candidate not found: ${options.sourceSlug}`);
  }

  const adaptedRoom = studioRoomFromPresenceNode(sourceNode, {
    mode: "published",
    roomState: "draft",
    roomId: `template:${options.id}`,
  });
  const chambers = normalizeChambers(adaptedRoom.chambers, options);
  const room: Room = assertValidRoomConfig({
    ...adaptedRoom,
    id: `template:${options.id}`,
    slug: `template-${options.id}`,
    title: options.name,
    state: "draft",
    entryChamberId: chambers[0]?.id ?? adaptedRoom.entryChamberId,
    theme: options.themeTokens,
    rendererConfig: {
      ...adaptedRoom.rendererConfig,
      renderer: "studio-room-basic",
      layout: "single-scroll",
      mobileLayout: "stacked",
      objectOpenMode: "sheet",
      reducedMotion: false,
    },
    moodPresetId: options.moodPreset.id,
    templateKitId: options.id,
    chambers,
    editorOnly: undefined,
    internal: undefined,
  });
  const objectTypes = unique(room.chambers.flatMap((chamber) => chamber.objects.map((object) => object.type)));
  const chamberTypes = unique(room.chambers.map((chamber) => chamber.type));

  return {
    id: options.id,
    label: options.name,
    name: options.name,
    description: options.description,
    intendedUserTypes: options.intendedUserTypes,
    sourceCandidate: {
      id: `demo:${options.sourceSlug}`,
      slug: options.sourceSlug,
      label: options.sourceLabel,
      source: "lib/presence/demo/profiles.ts",
    },
    defaultRoom: room,
    themeTokens: options.themeTokens,
    moodPreset: options.moodPreset,
    chamberTypes,
    objectTypes,
    orderedChambers: chamberTypes,
    roomObjects: objectTypes,
    defaultMoodPresetId: options.moodPreset.id,
    ctaStrategy: options.ctaStrategy,
    requiredFields: options.requiredFields,
    optionalFields: options.optionalFields,
    copyScaffolds: options.copyScaffolds,
    validationExpectations: options.validationExpectations ?? [
      { rule: "room-valid", severity: "error", message: "Template room must validate as a Studio Room." },
      { rule: "cta-visible", severity: "warning", message: "Primary CTA should appear early on mobile." },
      { rule: "public-safe", severity: "error", message: "Template payload must remain public-safe after sanitisation." },
    ],
    publicSafeDefaults: options.publicSafeDefaults ?? [
      "Only explicit public contact fields are mapped.",
      "No media embeds are activated.",
      "Internal/editor-only data is stripped before rendering.",
    ],
    schemaVersion: PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
    supportState: options.supportState ?? "primary",
    deferredFields: options.deferredFields,
    previewNotes: options.previewNotes,
  };
}

export function makeMoodPreset(id: string, label: string, description: string, tokens: ThemeTokens): MoodPreset {
  return { id, label, description, tokens };
}

function normalizeChambers(chambers: Chamber[], options: TemplateBuildOptions): Chamber[] {
  const renamed = chambers.map((chamber, index) => {
    const title = options.chamberTitles[chamber.id] ?? options.chamberTitles[chamber.type] ?? null;
    const normalized: Chamber = {
      ...chamber,
      type: title?.type ?? chamber.type,
      title: title?.title ?? chamber.title,
      summary: title?.summary ?? chamber.summary,
      mobile: {
        ...chamber.mobile,
        order: index + 1,
        layout: chamber.mobile?.layout ?? (chamber.type === "gallery" || chamber.type === "works" ? "carousel" : "stack"),
        label: title?.mobileLabel ?? chamber.mobile?.label ?? title?.title ?? chamber.title,
      },
      objects: chamber.objects.map((object, objectIndex) => normalizeObject(object, objectIndex)),
      editorOnly: undefined,
      internal: undefined,
    };
    return normalized;
  });

  const withCta = ensureEntranceCta(renamed, options.ctaStrategy);
  return orderChambers(ensureOptionalChambers(withCta, options.ensureChambers ?? []), options.chamberOrder);
}

function normalizeObject(object: RoomObject, index: number): RoomObject {
  return {
    ...object,
    mobile: { ...object.mobile, order: index + 1 },
    editorOnly: undefined,
    internal: undefined,
  };
}

function ensureEntranceCta(chambers: Chamber[], cta: TemplateKitCtaStrategy): Chamber[] {
  const first = chambers[0];
  if (!first || first.objects.some((object) => object.id === "template-primary-cta")) return chambers;
  const action: RoomObject = {
    id: "template-primary-cta",
    type: "cta",
    label: cta.label,
    content: {
      title: cta.label,
      action: { label: cta.label, href: `#${cta.primaryChamberId}` },
    },
    mobile: { order: 2, label: cta.label },
  };
  return [
    {
      ...first,
      objects: [first.objects[0], action, ...first.objects.slice(1)].filter((object): object is RoomObject => Boolean(object)),
    },
    ...chambers.slice(1),
  ].map((chamber, index) => ({
    ...chamber,
    mobile: { ...chamber.mobile, order: index + 1 },
    objects: chamber.objects.map((object, objectIndex) => ({
      ...object,
      mobile: { ...object.mobile, order: objectIndex + 1 },
    })),
  }));
}

function ensureOptionalChambers(chambers: Chamber[], ensure: TemplateBuildOptions["ensureChambers"]): Chamber[] {
  const existing = new Set(chambers.map((chamber) => chamber.id));
  const additions = (ensure ?? []).flatMap((item): Chamber[] => {
    if (existing.has(item.id)) return [];
    return [{
      id: item.id,
      type: item.type,
      title: item.title,
      summary: item.summary,
      mobile: { order: chambers.length + 1, layout: "stack", label: item.title },
      objects: [{
        id: `${item.id}-placeholder`,
        type: item.objectType ?? "note",
        label: item.objectLabel,
        content: {
          title: item.objectLabel,
          body: "Optional content can be added here when the room is authored.",
        },
        mobile: { order: 1 },
      }],
    }];
  });
  return [...chambers, ...additions].map((chamber, index) => ({
    ...chamber,
    mobile: { ...chamber.mobile, order: index + 1 },
  }));
}

function orderChambers(chambers: Chamber[], order: string[] | undefined): Chamber[] {
  if (!order || order.length === 0) return chambers;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...chambers]
    .sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    .map((chamber, index) => ({
      ...chamber,
      mobile: { ...chamber.mobile, order: index + 1 },
    }));
}

function unique<T extends string>(items: T[]): T[] {
  return Array.from(new Set(items));
}
