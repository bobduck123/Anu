import { PRESENCE_STUDIO_ROOM_SCHEMA_VERSION, type Chamber, type Room, type RoomObject } from "./model.ts";

export interface RoomValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export function validateRoomConfig(value: unknown): RoomValidationIssue[] {
  const issues: RoomValidationIssue[] = [];
  if (!value || typeof value !== "object") {
    return [{ path: "$", message: "Room config must be an object.", severity: "error" }];
  }

  const room = value as Partial<Room>;
  requireString(issues, room.id, "id", "Room id is required.");
  requireString(issues, room.slug, "slug", "Room slug is required.");
  requireString(issues, room.title, "title", "Room title is required.");
  requireString(issues, room.entryChamberId, "entryChamberId", "Entry chamber is required.");
  if (room.schemaVersion !== PRESENCE_STUDIO_ROOM_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: "Room schema version is not current.",
      severity: "error",
    });
  }
  if (!room.theme) issues.push({ path: "theme", message: "Theme tokens are required.", severity: "error" });
  if (!room.rendererConfig) {
    issues.push({ path: "rendererConfig", message: "Renderer config is required.", severity: "error" });
  }
  if (!Array.isArray(room.chambers) || room.chambers.length === 0) {
    issues.push({ path: "chambers", message: "At least one chamber is required.", severity: "error" });
    return issues;
  }

  const chamberIds = new Set<string>();
  for (const [index, chamber] of room.chambers.entries()) {
    validateChamber(issues, chamber, `chambers.${index}`);
    if (typeof chamber.id === "string") {
      if (chamberIds.has(chamber.id)) {
        issues.push({ path: `chambers.${index}.id`, message: "Chamber id must be unique.", severity: "error" });
      }
      chamberIds.add(chamber.id);
    }
  }
  if (typeof room.entryChamberId === "string" && !chamberIds.has(room.entryChamberId)) {
    issues.push({ path: "entryChamberId", message: "Entry chamber must exist in chambers.", severity: "error" });
  }
  return issues;
}

export function assertValidRoomConfig(room: Room): Room {
  const errors = validateRoomConfig(room).filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
  }
  return room;
}

function validateChamber(issues: RoomValidationIssue[], chamber: Partial<Chamber>, path: string) {
  requireString(issues, chamber.id, `${path}.id`, "Chamber id is required.");
  requireString(issues, chamber.type, `${path}.type`, "Chamber type is required.");
  requireString(issues, chamber.title, `${path}.title`, "Chamber title is required.");
  if (!Array.isArray(chamber.objects)) {
    issues.push({ path: `${path}.objects`, message: "Chamber objects must be a list.", severity: "error" });
    return;
  }
  const objectIds = new Set<string>();
  for (const [index, object] of chamber.objects.entries()) {
    validateObject(issues, object, `${path}.objects.${index}`);
    if (typeof object.id === "string") {
      if (objectIds.has(object.id)) {
        issues.push({ path: `${path}.objects.${index}.id`, message: "Object id must be unique within its chamber.", severity: "error" });
      }
      objectIds.add(object.id);
    }
  }
}

function validateObject(issues: RoomValidationIssue[], object: Partial<RoomObject>, path: string) {
  requireString(issues, object.id, `${path}.id`, "Object id is required.");
  requireString(issues, object.type, `${path}.type`, "Object type is required.");
  requireString(issues, object.label, `${path}.label`, "Object label is required.");
  if (!object.content || typeof object.content !== "object") {
    issues.push({ path: `${path}.content`, message: "Object content is required.", severity: "error" });
  }
  if (object.type === "image" && object.required && !object.content?.image?.alt) {
    issues.push({ path: `${path}.content.image.alt`, message: "Required images need alt text.", severity: "warning" });
  }
}

function requireString(issues: RoomValidationIssue[], value: unknown, path: string, message: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message, severity: "error" });
  }
}
