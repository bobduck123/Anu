import type { Chamber, ChamberType, RoomObject, RoomObjectType } from "./model";

export const EDITABLE_TEXT_CONTENT_KEYS = ["title", "body"] as const;

const EDITABLE_CONTENT_KEYS_BY_TYPE: Record<RoomObjectType, readonly string[]> = {
  text: EDITABLE_TEXT_CONTENT_KEYS,
  headline: EDITABLE_TEXT_CONTENT_KEYS,
  note: EDITABLE_TEXT_CONTENT_KEYS,
  image: EDITABLE_TEXT_CONTENT_KEYS,
  media: EDITABLE_TEXT_CONTENT_KEYS,
  work: EDITABLE_TEXT_CONTENT_KEYS,
  "work-card": EDITABLE_TEXT_CONTENT_KEYS,
  service: [...EDITABLE_TEXT_CONTENT_KEYS, "priceLabel", "durationLabel"],
  "service-card": [...EDITABLE_TEXT_CONTENT_KEYS, "priceLabel", "durationLabel"],
  proof: [...EDITABLE_TEXT_CONTENT_KEYS, "quote", "attribution", "source"],
  "proof-card": [...EDITABLE_TEXT_CONTENT_KEYS, "quote", "attribution", "source"],
  testimonial: [...EDITABLE_TEXT_CONTENT_KEYS, "quote", "attribution", "source"],
  link: [...EDITABLE_TEXT_CONTENT_KEYS, "action", "url", "linkType"],
  "link-card": [...EDITABLE_TEXT_CONTENT_KEYS, "action", "url", "linkType"],
  portal: [...EDITABLE_TEXT_CONTENT_KEYS, "action", "url", "linkType"],
  credential: [...EDITABLE_TEXT_CONTENT_KEYS, "issuer", "detail"],
  badge: [...EDITABLE_TEXT_CONTENT_KEYS, "issuer", "detail"],
  cta: [...EDITABLE_TEXT_CONTENT_KEYS, "action"],
  contact: EDITABLE_TEXT_CONTENT_KEYS,
  metadata: [],
};

const ACTION_EDITABLE_TYPES = new Set<RoomObjectType>(["cta", "link", "link-card", "portal"]);
const PUBLIC_ROUTE_BLOCKLIST = ["/studio", "/internal", "/api", "/admin"];

const DUPLICATABLE_OBJECT_TYPES = new Set<RoomObjectType>([
  "text",
  "headline",
  "note",
  "image",
  "media",
  "work",
  "work-card",
  "service",
  "service-card",
  "proof",
  "proof-card",
  "testimonial",
  "link",
  "link-card",
  "portal",
  "credential",
  "badge",
  "contact",
]);

const HIDEABLE_OBJECT_TYPES = new Set<RoomObjectType>([
  "text",
  "image",
  "media",
  "work",
  "work-card",
  "service",
  "service-card",
  "proof",
  "proof-card",
  "testimonial",
  "link",
  "link-card",
  "portal",
  "credential",
  "badge",
  "note",
  "metadata",
]);

const ROLE_LABEL_BY_OBJECT_TYPE: Record<RoomObjectType, string> = {
  text: "Body text",
  headline: "Headline",
  note: "Note",
  image: "Image",
  media: "Image",
  work: "Work proof",
  "work-card": "Work proof",
  service: "Service card",
  "service-card": "Service card",
  proof: "Proof / trust card",
  "proof-card": "Proof / trust card",
  testimonial: "Testimonial",
  link: "Public link",
  "link-card": "Public link",
  portal: "Portal link",
  credential: "Credential",
  badge: "Badge",
  cta: "Primary call to action",
  contact: "Public contact card",
  metadata: "Metadata",
};

const ROLE_DESCRIPTION_BY_OBJECT_TYPE: Record<RoomObjectType, string> = {
  text: "A short paragraph of public copy. Edit the title and body.",
  headline: "A bold statement. Keep it short — under 80 characters reads best.",
  note: "A small public note. Use it for one-line context.",
  image: "A public image card. Add alt text in Studio's media flow before publishing.",
  media: "A public image card. Add alt text in Studio's media flow before publishing.",
  work: "A piece of work shown as proof. Add title, body, and image.",
  "work-card": "A piece of work shown as proof. Add title, body, and image.",
  service: "A service offered. Add a title, short description, price label, and timing.",
  "service-card": "A service offered. Add a title, short description, price label, and timing.",
  proof: "A public proof note — a testimonial, outcome, or trust signal.",
  "proof-card": "A public proof note — a testimonial, outcome, or trust signal.",
  testimonial: "A public testimonial. Add the quote, the attribution, and the source.",
  link: "A public link card. Use the URL field for a safe public destination.",
  "link-card": "A public link card. Use the URL field for a safe public destination.",
  portal: "A public portal link. Use the URL field for a safe public destination.",
  credential: "A public credential, qualification, or trust marker. Add issuer and detail.",
  badge: "A public badge. Add issuer and detail.",
  cta: "The room's primary invitation. Pick a target chamber — visitors will jump there.",
  contact: "A public contact card. Only edit display copy here; private contact lives elsewhere.",
  metadata: "Metadata for this object. No public-facing copy.",
};

const ROLE_LABEL_BY_CHAMBER_TYPE: Record<ChamberType, string> = {
  threshold: "Threshold",
  entrance: "Entrance",
  gallery: "Gallery",
  works: "Works",
  story: "Story",
  statement: "Statement",
  services: "Services",
  proof: "Proof",
  testimonials: "Testimonials",
  invitation: "Invitation",
  contact: "Contact",
  enquiry: "Enquiry",
  portal: "Links",
  links: "Links",
};

const ROLE_DESCRIPTION_BY_CHAMBER_TYPE: Record<ChamberType, string> = {
  threshold: "First room a visitor sees. Set the tone and a clear invitation.",
  entrance: "First room a visitor sees. Set the tone and a clear invitation.",
  gallery: "A wall of selected work. Keep it tight — three to nine pieces reads best.",
  works: "A wall of selected work. Keep it tight — three to nine pieces reads best.",
  story: "The practice or story behind the work. Plain language, not sales copy.",
  statement: "A short public statement of practice or position.",
  services: "Concrete ways to work together. Include price ranges and timing.",
  proof: "Public proof — testimonials, outcomes, or partner signals.",
  testimonials: "Public testimonials. Short, attributed, and outcome-focused.",
  invitation: "The primary path for visitors to start a conversation.",
  contact: "Public contact methods. Only show what should be public.",
  enquiry: "An enquiry path for project conversations.",
  portal: "Public links — social, press kit, writing, booking pages.",
  links: "Public links — social, press kit, writing, booking pages.",
};

export const FIELD_LENGTH_LIMITS = {
  title: 120,
  summary: 320,
  label: 80,
  body: 1200,
  quote: 600,
  attribution: 120,
  source: 200,
  issuer: 160,
  detail: 320,
  priceLabel: 60,
  durationLabel: 60,
  linkType: 60,
  actionLabel: 80,
  url: 600,
} as const;

export function editableContentKeysForObjectType(type: RoomObjectType): readonly string[] {
  return EDITABLE_CONTENT_KEYS_BY_TYPE[type] ?? [];
}

export function isObjectActionEditable(type: RoomObjectType): boolean {
  return ACTION_EDITABLE_TYPES.has(type);
}

export function isSafeStudioRoomEditUrl(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (text.startsWith("#")) return /^#[A-Za-z0-9_-]+$/.test(text);
  if (text.startsWith("/")) {
    const lower = text.toLowerCase();
    if (text.split("/").includes("..")) return false;
    return !PUBLIC_ROUTE_BLOCKLIST.some((prefix) => lower.startsWith(prefix));
  }
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (!host || ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) return false;
    if (host.endsWith(".local") || host.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}

export function isEditableObjectType(type: RoomObjectType): boolean {
  return editableContentKeysForObjectType(type).length > 0;
}

export function isObjectDuplicatable(type: RoomObjectType): boolean {
  return DUPLICATABLE_OBJECT_TYPES.has(type);
}

export function isObjectHideable(type: RoomObjectType): boolean {
  return HIDEABLE_OBJECT_TYPES.has(type);
}

export function isObjectMovable(type: RoomObjectType): boolean {
  // CTA is anchored to the entrance and should not be reordered freely.
  return type !== "cta";
}

export function humanRoleLabelForObjectType(type: RoomObjectType): string {
  return ROLE_LABEL_BY_OBJECT_TYPE[type] ?? "Object";
}

export function humanRoleDescriptionForObjectType(type: RoomObjectType): string {
  return (
    ROLE_DESCRIPTION_BY_OBJECT_TYPE[type] ??
    "A safe room object. Edit the public copy below."
  );
}

export function humanRoleLabelForChamberType(type: ChamberType): string {
  return ROLE_LABEL_BY_CHAMBER_TYPE[type] ?? "Chamber";
}

export function humanRoleDescriptionForChamberType(type: ChamberType): string {
  return (
    ROLE_DESCRIPTION_BY_CHAMBER_TYPE[type] ??
    "A safe chamber. Edit the title and summary, then walk its objects."
  );
}

export function duplicateObjectInChamber(chamber: Chamber, objectId: string): Chamber {
  const index = chamber.objects.findIndex((object) => object.id === objectId);
  if (index === -1) return chamber;
  const source = chamber.objects[index];
  if (!isObjectDuplicatable(source.type)) return chamber;
  const newId = nextObjectId(chamber, source.id);
  const copy: RoomObject = {
    ...cloneObject(source),
    id: newId,
    label: appendCopySuffix(source.label),
    required: false,
    mobile: { ...(source.mobile ?? {}), order: (source.mobile?.order ?? index + 1) + 1, hidden: false },
  };
  const next = [
    ...chamber.objects.slice(0, index + 1),
    copy,
    ...chamber.objects.slice(index + 1),
  ];
  return { ...chamber, objects: reindexMobileOrder(next) };
}

export function moveObjectInChamber(
  chamber: Chamber,
  objectId: string,
  direction: "up" | "down",
): Chamber {
  const index = chamber.objects.findIndex((object) => object.id === objectId);
  if (index === -1) return chamber;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= chamber.objects.length) return chamber;
  const subject = chamber.objects[index];
  const neighbour = chamber.objects[target];
  if (!isObjectMovable(subject.type) || !isObjectMovable(neighbour.type)) return chamber;
  const next = [...chamber.objects];
  next[index] = neighbour;
  next[target] = subject;
  return { ...chamber, objects: reindexMobileOrder(next) };
}

export function setObjectMobileHidden(
  chamber: Chamber,
  objectId: string,
  hidden: boolean,
): Chamber {
  return {
    ...chamber,
    objects: chamber.objects.map((object) => {
      if (object.id !== objectId) return object;
      if (!isObjectHideable(object.type)) return object;
      return { ...object, mobile: { ...(object.mobile ?? {}), hidden } };
    }),
  };
}

export function isObjectMobileHidden(object: RoomObject): boolean {
  return Boolean(object.mobile?.hidden);
}

export interface FieldLengthIssue {
  field: keyof typeof FIELD_LENGTH_LIMITS;
  limit: number;
  length: number;
}

export function fieldLengthIssue(
  field: keyof typeof FIELD_LENGTH_LIMITS,
  value: string | undefined | null,
): FieldLengthIssue | null {
  const length = (value ?? "").length;
  const limit = FIELD_LENGTH_LIMITS[field];
  return length > limit ? { field, limit, length } : null;
}

function nextObjectId(chamber: Chamber, baseId: string): string {
  const existing = new Set(chamber.objects.map((object) => object.id));
  if (!existing.has(`${baseId}-copy`)) return `${baseId}-copy`;
  let i = 2;
  while (existing.has(`${baseId}-copy-${i}`)) i++;
  return `${baseId}-copy-${i}`;
}

function appendCopySuffix(label: string): string {
  if (/\(copy(?: \d+)?\)$/i.test(label)) return label;
  return `${label} (copy)`;
}

function reindexMobileOrder(objects: RoomObject[]): RoomObject[] {
  return objects.map((object, index) => ({
    ...object,
    mobile: { ...(object.mobile ?? {}), order: index + 1 },
  }));
}

function cloneObject(object: RoomObject): RoomObject {
  return JSON.parse(JSON.stringify(object)) as RoomObject;
}
