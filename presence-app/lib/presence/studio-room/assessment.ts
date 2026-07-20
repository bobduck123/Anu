import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PresenceNode } from "../../api/types.ts";
import { demoProfileForSlug, demoProfileSlugs } from "../demo/profiles.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import { resolveRenderModel } from "../render/resolver.ts";

import type { Room, RoomObject } from "./model";
import { studioRoomFromPresenceNode } from "./adapters/fromEditableConfig";
import { renderStudioRoom } from "./renderer";
import type { PublicRoomPayload } from "./sanitize";
import { toPublicRoomPayload } from "./sanitize";
import { validateRoomConfig } from "./validation";

export type StudioRoomAssessmentSourceKind =
  | "demo-profile"
  | "graph-fixture";

export type StudioRoomTemplateCandidateRating =
  | "strong"
  | "candidate"
  | "weak";

export type StudioRoomSemanticField =
  | "contact methods"
  | "services"
  | "proof/testimonials"
  | "links/portal cards"
  | "credentials"
  | "media embeds";

export type StudioRoomSemanticFieldStatus =
  | "absent"
  | "mapped"
  | "unmapped"
  | "deferred";

export interface StudioRoomAssessmentInput {
  id: string;
  label: string;
  sourceKind: StudioRoomAssessmentSourceKind;
  sourcePath: string;
  node: PresenceNode;
}

export interface StudioRoomAssessmentRoomResult {
  id: string;
  label: string;
  sourceKind: StudioRoomAssessmentSourceKind;
  sourcePath: string;
  originalCategory: string;
  existingRenderModel: {
    sceneCount: number;
    widgetCount: number;
    workCount: number;
    hasCta: boolean;
    rendererKey: string;
  };
  studioRoom: {
    id: string;
    schemaVersion: string;
    chamberCount: number;
    objectCount: number;
    mobileChamberVariantCount: number;
    mobileObjectVariantCount: number;
    validationIssueCount: number;
  };
  mappedFields: string[];
  unmappedFields: string[];
  sourceAbsentFields: string[];
  deferredFields: string[];
  semanticFieldStatus: Record<StudioRoomSemanticField, StudioRoomSemanticFieldStatus>;
  defaultedFields: string[];
  mobileVariantAvailability: "explicit" | "adapter-fallback" | "missing";
  ctaAvailability: "available" | "missing";
  mediaAvailability: "available" | "missing";
  focalPointAvailability: "available" | "missing";
  missingProofTrustActionAreas: string[];
  payloadHygiene: {
    status: "pass" | "fail";
    restrictedKeys: string[];
  };
  rendererFallbackUsage: string[];
  templateKitCandidate: {
    rating: StudioRoomTemplateCandidateRating;
    suggestedKit: string;
    reasons: string[];
  };
}

export interface StudioRoomAssessmentReport {
  generatedAt: string;
  requestedRepresentativeCount: number;
  discoveredRoomCount: number;
  assessedRoomCount: number;
  rooms: StudioRoomAssessmentRoomResult[];
  aggregate: {
    payloadHygienePassCount: number;
    payloadHygieneFailCount: number;
    roomsWithCta: number;
    roomsWithMedia: number;
    roomsWithFocalPoint: number;
    strongTemplateCandidates: string[];
    candidateTemplateCandidates: string[];
    commonUnmappedFields: Record<string, number>;
    commonDeferredFields: Record<string, number>;
    commonSourceAbsentFields: Record<string, number>;
    commonDefaultedFields: Record<string, number>;
    semanticCoverage: Record<
      StudioRoomSemanticField,
      Record<StudioRoomSemanticFieldStatus, number>
    >;
    gapPriority: Array<{ field: string; frequency: number; recommendation: string }>;
  };
}

interface PresenceGraphFixture {
  room?: PresenceNode;
}

const PRESENCE_GRAPH_FIXTURE = join(
  process.cwd(),
  "tests",
  "fixtures",
  "presenceGraph.json",
);

export function listStudioRoomAssessmentInputs(): StudioRoomAssessmentInput[] {
  const demoInputs = demoProfileSlugs().flatMap((slug) => {
    const node = demoProfileForSlug(slug);
    if (!node) {
      return [];
    }
    return {
      id: `demo:${slug}`,
      label: node.display_name || slug,
      sourceKind: "demo-profile" as const,
      sourcePath: "lib/presence/demo/profiles.ts",
      node,
    };
  });

  const graphFixtureInput = loadGraphFixtureInput();
  return graphFixtureInput ? [...demoInputs, graphFixtureInput] : demoInputs;
}

export function assessStudioRoomFixtures(
  inputs: StudioRoomAssessmentInput[] = listStudioRoomAssessmentInputs(),
): StudioRoomAssessmentReport {
  const rooms = inputs.map(assessStudioRoomInput);

  const commonUnmapped = countOccurrences(rooms.flatMap((room) => room.unmappedFields));
  const commonDeferred = countOccurrences(rooms.flatMap((room) => room.deferredFields));
  const commonSourceAbsent = countOccurrences(rooms.flatMap((room) => room.sourceAbsentFields));
  const commonDefaulted = countOccurrences(rooms.flatMap((room) => room.defaultedFields));

  return {
    generatedAt: new Date().toISOString(),
    requestedRepresentativeCount: inputs.length,
    discoveredRoomCount: inputs.length,
    assessedRoomCount: rooms.length,
    rooms,
    aggregate: {
      payloadHygienePassCount: rooms.filter(
        (room) => room.payloadHygiene.status === "pass",
      ).length,
      payloadHygieneFailCount: rooms.filter(
        (room) => room.payloadHygiene.status === "fail",
      ).length,
      roomsWithCta: rooms.filter((room) => room.ctaAvailability === "available")
        .length,
      roomsWithMedia: rooms.filter(
        (room) => room.mediaAvailability === "available",
      ).length,
      roomsWithFocalPoint: rooms.filter(
        (room) => room.focalPointAvailability === "available",
      ).length,
      strongTemplateCandidates: rooms
        .filter((room) => room.templateKitCandidate.rating === "strong")
        .map((room) => room.id),
      candidateTemplateCandidates: rooms
        .filter((room) => room.templateKitCandidate.rating === "candidate")
        .map((room) => room.id),
      commonUnmappedFields: commonUnmapped,
      commonDeferredFields: commonDeferred,
      commonSourceAbsentFields: commonSourceAbsent,
      commonDefaultedFields: commonDefaulted,
      semanticCoverage: getSemanticCoverage(rooms),
      gapPriority: rankGaps({ ...commonUnmapped, ...commonDeferred }, rooms.length),
    },
  };
}

export function assessStudioRoomInput(
  input: StudioRoomAssessmentInput,
): StudioRoomAssessmentRoomResult {
  const existingModel = resolveRenderModel(input.node, "draft");
  const studioRoom = studioRoomFromPresenceNode(input.node, {
    mode: "draft",
    roomState: "draft",
  });
  const publicPayload = toPublicRoomPayload(studioRoom);
  const validation = validateRoomConfig(studioRoom);
  renderStudioRoom(publicPayload, { viewport: "mobile" });
  renderStudioRoom(publicPayload, { viewport: "desktop" });

  const objects = flattenObjects(publicPayload);
  const mobileChamberVariantCount = publicPayload.chambers.filter(
    (chamber) => chamber.mobile,
  ).length;
  const mobileObjectVariantCount = objects.filter((object) => object.mobile)
    .length;
  const hasMedia = objects.some((object) => Boolean(object.content.image?.src));
  const hasCta = objects.some(
    (object) => object.type === "cta" || Boolean(object.content.action?.href),
  );
  const hasFocalPoint = objects.some((object) =>
    Boolean(object.content.image?.focalPoint),
  );
  const restrictedKeys = findRestrictedPublicPayloadKeys(publicPayload);
  const semanticFieldStatus = getSemanticFieldStatus(input.node, objects);

  return {
    id: input.id,
    label: input.label,
    sourceKind: input.sourceKind,
    sourcePath: input.sourcePath,
    originalCategory: getOriginalCategory(input.node),
    existingRenderModel: {
      sceneCount: existingModel.scenes.length,
      widgetCount: existingModel.scenes.reduce(
        (sum, scene) => sum + scene.widgets.length,
        0,
      ),
      workCount: existingModel.works.length,
      hasCta: hasRenderModelCta(existingModel),
      rendererKey: existingModel.identity.rendererKey,
    },
    studioRoom: {
      id: studioRoom.id,
      schemaVersion: studioRoom.schemaVersion,
      chamberCount: publicPayload.chambers.length,
      objectCount: objects.length,
      mobileChamberVariantCount,
      mobileObjectVariantCount,
      validationIssueCount: validation.length,
    },
    mappedFields: getMappedFields(input.node, publicPayload, existingModel, semanticFieldStatus),
    unmappedFields: fieldsWithStatus(semanticFieldStatus, "unmapped"),
    sourceAbsentFields: fieldsWithStatus(semanticFieldStatus, "absent"),
    deferredFields: fieldsWithStatus(semanticFieldStatus, "deferred"),
    semanticFieldStatus,
    defaultedFields: getDefaultedFields(
      input.node,
      studioRoom,
      mobileChamberVariantCount,
      mobileObjectVariantCount,
      hasFocalPoint,
    ),
    mobileVariantAvailability: getMobileVariantAvailability(
      mobileChamberVariantCount,
      mobileObjectVariantCount,
    ),
    ctaAvailability: hasCta ? "available" : "missing",
    mediaAvailability: hasMedia ? "available" : "missing",
    focalPointAvailability: hasFocalPoint ? "available" : "missing",
    missingProofTrustActionAreas: getMissingProofTrustActionAreas(
      input.node,
      objects,
      hasCta,
      hasMedia,
    ),
    payloadHygiene: {
      status: restrictedKeys.length === 0 ? "pass" : "fail",
      restrictedKeys,
    },
    rendererFallbackUsage: getRendererFallbackUsage(existingModel.provenanceSummary),
    templateKitCandidate: scoreTemplateCandidate(input.node, {
      hasCta,
      hasMedia,
      hasWorks: existingModel.works.length > 0,
      hasServices: hasArray(input.node.services),
      hasProof: hasProofSource(input.node),
      hasLinks: hasArray(input.node.links),
    }),
  };
}

export function studioRoomAssessmentToMarkdown(
  report: StudioRoomAssessmentReport,
): string {
  const roomRows = report.rooms
    .map(
      (room) =>
        `| ${room.label} | ${room.sourceKind} | ${room.existingRenderModel.sceneCount}/${room.existingRenderModel.widgetCount} | ${room.studioRoom.chamberCount}/${room.studioRoom.objectCount} | ${room.mappedFields.join(", ")} | ${room.unmappedFields.join(", ") || "none"} | ${room.payloadHygiene.status} | ${room.templateKitCandidate.rating} |`,
    )
    .join("\n");

  const gapRows = report.aggregate.gapPriority
    .map((gap) => `| ${gap.field} | ${gap.frequency}/${report.assessedRoomCount} | ${gap.recommendation} |`)
    .join("\n");

  return [
    "# Presence Studio Room Assessment",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Discovered ${report.discoveredRoomCount} existing demo/sample/generated room sources.`
    + ` All ${report.assessedRoomCount} available local fixtures were assessed.`,
    "",
    "## Aggregate",
    "",
    `- Payload hygiene pass: ${report.aggregate.payloadHygienePassCount} / ${report.assessedRoomCount}`,
    `- Payload hygiene fail: ${report.aggregate.payloadHygieneFailCount} / ${report.assessedRoomCount}`,
    `- Rooms with CTA: ${report.aggregate.roomsWithCta} / ${report.assessedRoomCount}`,
    `- Rooms with media: ${report.aggregate.roomsWithMedia} / ${report.assessedRoomCount}`,
    `- Rooms with focal point: ${report.aggregate.roomsWithFocalPoint} / ${report.assessedRoomCount}`,
    `- Strong template candidates: ${report.aggregate.strongTemplateCandidates.join(", ") || "none"}`,
    `- Template candidates: ${report.aggregate.candidateTemplateCandidates.join(", ") || "none"}`,
    "",
    "## Prioritized Gap Map",
    "",
    "| Gap | Frequency | Recommendation |",
    "| --- | ---: | --- |",
    gapRows,
    "",
    "## Room Detail Map",
    "",
    "| Room | Source | Existing scenes/widgets | Studio chambers/objects | Mapped | Unmapped | Payload | Candidate |",
    "| --- | --- | ---: | ---: | --- | --- | --- | --- |",
    roomRows,
    "",
    "## Defaulted Fields Note",
    "",
    "All assessed demo profiles lack `editable_config`, so the adapter falls back to node/render defaults."
    + " This is expected for demo fixtures. Real backend rooms with authored configs will show fewer defaults.",
    "",
  ].join("\n");
}

function loadGraphFixtureInput(): StudioRoomAssessmentInput | null {
  if (!existsSync(PRESENCE_GRAPH_FIXTURE)) {
    return null;
  }

  const raw = readFileSync(PRESENCE_GRAPH_FIXTURE, "utf8");
  const fixture = JSON.parse(raw) as PresenceGraphFixture;
  if (!fixture.room) {
    return null;
  }

  return {
    id: `graph:${fixture.room.slug || fixture.room.id}`,
    label: fixture.room.display_name || fixture.room.slug || "Graph fixture room",
    sourceKind: "graph-fixture",
    sourcePath: "tests/fixtures/presenceGraph.json",
    node: fixture.room,
  };
}

function flattenObjects(room: Pick<Room, "chambers">): RoomObject[] {
  return room.chambers.flatMap((chamber) => chamber.objects);
}

function getOriginalCategory(node: PresenceNode): string {
  const metadata = node.metadata as Record<string, unknown> | undefined;
  const customPresence = metadata?.custom_presence as
    | Record<string, unknown>
    | undefined;
  return [
    node.room_type,
    node.node_type,
    node.display_mode,
    customPresence?.kind,
    node.theme_preset,
  ]
    .filter(Boolean)
    .join(" / ");
}

function getMappedFields(
  node: PresenceNode,
  room: PublicRoomPayload,
  existingModel: ReturnType<typeof resolveRenderModel>,
  semanticFieldStatus: Record<StudioRoomSemanticField, StudioRoomSemanticFieldStatus>,
): string[] {
  const objects = flattenObjects(room);
  const mapped = new Set<string>();

  if (room.title || existingModel.identity.displayName.value) {
    mapped.add("identity/title");
  }
  if (existingModel.identity.headline.value) {
    mapped.add("headline");
  }
  if (existingModel.palette.bg.value || existingModel.palette.accent.value) {
    mapped.add("theme/palette");
  }
  if (
    existingModel.typography.headingFamily.value ||
    existingModel.typography.bodyFamily.value
  ) {
    mapped.add("typography");
  }
  if (existingModel.motion.intensity.value) {
    mapped.add("motion");
  }
  if (existingModel.scenes.length > 0 || room.chambers.length > 0) {
    mapped.add("scene/chamber structure");
  }
  if (existingModel.works.length > 0) {
    mapped.add("works");
  }
  if (objects.some((object) => object.content.image?.src)) {
    mapped.add("media");
  }
  if (objects.some((object) => object.content.action?.href)) {
    mapped.add("action/cta");
  }
  for (const [field, status] of Object.entries(semanticFieldStatus)) {
    if (status === "mapped") {
      mapped.add(field);
    }
  }
  if (
    node.bio ||
    node.short_bio ||
    existingModel.scenes.some((scene) =>
      scene.widgets.some((widget) => widget.type === "statement"),
    )
  ) {
    mapped.add("story/body");
  }

  return Array.from(mapped);
}

function getSemanticFieldStatus(
  node: PresenceNode,
  objects: RoomObject[],
): Record<StudioRoomSemanticField, StudioRoomSemanticFieldStatus> {
  return {
    "contact methods": semanticStatus(hasContactSource(node), hasObjectKind(objects, "contact")),
    services: semanticStatus(hasArray(node.services), hasObjectKind(objects, "service-card")),
    "proof/testimonials": semanticStatus(hasProofSource(node), hasObjectKind(objects, "proof-card")),
    "links/portal cards": semanticStatus(hasLinkSource(node), hasObjectKind(objects, "link-card")),
    credentials: semanticStatus(hasArray(node.credentials), hasObjectKind(objects, "credential")),
    "media embeds": hasArray(node.media_embeds) ? "deferred" : "absent",
  };
}

function semanticStatus(
  sourcePresent: boolean,
  mapped: boolean,
): StudioRoomSemanticFieldStatus {
  if (!sourcePresent) return "absent";
  return mapped ? "mapped" : "unmapped";
}

function fieldsWithStatus(
  statuses: Record<StudioRoomSemanticField, StudioRoomSemanticFieldStatus>,
  status: StudioRoomSemanticFieldStatus,
): string[] {
  return Object.entries(statuses)
    .filter(([, value]) => value === status)
    .map(([field]) => field);
}

function getDefaultedFields(
  node: PresenceNode,
  room: Room,
  mobileChamberVariantCount: number,
  mobileObjectVariantCount: number,
  hasFocalPoint: boolean,
): string[] {
  const defaulted = new Set<string>();

  if (!node.editable_config) {
    defaulted.add("editable draft config absent; adapter used node/render defaults");
  }
  if (!node.renderer_key && !node.editable_config?.renderer_key) {
    defaulted.add("renderer key absent; existing resolver default used");
  }
  if (!room.theme?.background) {
    defaulted.add("room background token");
  }
  if (mobileChamberVariantCount === 0 || mobileObjectVariantCount === 0) {
    defaulted.add("mobile variants generated by renderer fallback");
  }
  if (!hasFocalPoint) {
    defaulted.add("media focal point");
  }

  return Array.from(defaulted);
}

function getMobileVariantAvailability(
  chamberCount: number,
  objectCount: number,
): "explicit" | "adapter-fallback" | "missing" {
  if (chamberCount > 0 && objectCount > 0) {
    return "explicit";
  }
  if (chamberCount > 0 || objectCount > 0) {
    return "adapter-fallback";
  }
  return "missing";
}

function getMissingProofTrustActionAreas(
  node: PresenceNode,
  objects: RoomObject[],
  hasCta: boolean,
  hasMedia: boolean,
): string[] {
  const missing = new Set<string>();

  if (hasProofSource(node) && !hasObjectKind(objects, "proof-card")) {
    missing.add("proof/testimonials not mapped to proof chamber");
  }
  if (hasArray(node.services) && !hasObjectKind(objects, "service-card")) {
    missing.add("services not mapped to service cards");
  }
  if (!hasCta) {
    missing.add("room has no early CTA");
  }
  if (!hasMedia) {
    missing.add("room has no mapped media");
  }
  if (hasContactSource(node) && !hasObjectKind(objects, "contact")) {
    missing.add("contact details not mapped to contact chamber");
  }

  return Array.from(missing);
}

function getRendererFallbackUsage(
  provenance: ReturnType<typeof resolveRenderModel>["provenanceSummary"],
): string[] {
  const fallbacks = new Set<string>();

  if (provenance.canonical > 0) {
    fallbacks.add(`${provenance.canonical} canonical/inherited render fields`);
  }

  return Array.from(fallbacks);
}

function scoreTemplateCandidate(
  node: PresenceNode,
  signals: {
    hasCta: boolean;
    hasMedia: boolean;
    hasWorks: boolean;
    hasServices: boolean;
    hasProof: boolean;
    hasLinks: boolean;
  },
): StudioRoomAssessmentRoomResult["templateKitCandidate"] {
  const reasons: string[] = [];
  let score = 0;

  if (signals.hasMedia) {
    score += 1;
    reasons.push("visual media present");
  }
  if (signals.hasWorks) {
    score += 1;
    reasons.push("work wall/gallery content present");
  }
  if (signals.hasCta) {
    score += 1;
    reasons.push("action path present");
  }
  if (signals.hasServices) {
    score += 1;
    reasons.push("service structure present");
  }
  if (signals.hasProof) {
    score += 1;
    reasons.push("trust/proof material present");
  }
  if (signals.hasLinks) {
    score += 1;
    reasons.push("portal/link material present");
  }

  const suggestedKit = suggestedKitForRoom(node);

  return {
    rating: score >= 5 ? "strong" : score >= 3 ? "candidate" : "weak",
    suggestedKit,
    reasons: reasons.length > 0 ? reasons : ["limited mapped structured content"],
  };
}

function hasRenderModelCta(model: ReturnType<typeof resolveRenderModel>): boolean {
  return model.scenes.some((scene) =>
    scene.widgets.some(
      (widget) =>
        widget.type === "invitation" ||
        widget.type === "external-link" ||
        widget.type === "roomkey-chip",
    ),
  );
}

function hasObjectKind(objects: RoomObject[], kind: string): boolean {
  return objects.some((object) => object.type === kind);
}

function hasArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasProofSource(node: PresenceNode): boolean {
  return hasArray(node.proof_items) || hasArray(node.testimonials);
}

function hasLinkSource(node: PresenceNode): boolean {
  const recordNode = node as unknown as Record<string, unknown>;
  return hasArray(node.links) || Boolean(node.public_url || recordNode.website);
}

function hasContactSource(node: PresenceNode): boolean {
  const recordNode = node as unknown as Record<string, unknown>;
  return Boolean(
    node.public_email ||
      node.public_phone ||
      recordNode.publicEmail ||
      recordNode.publicPhone ||
      node.public_url ||
      recordNode.publicUrl ||
      recordNode.website,
  );
}

function getSemanticCoverage(
  rooms: StudioRoomAssessmentRoomResult[],
): Record<StudioRoomSemanticField, Record<StudioRoomSemanticFieldStatus, number>> {
  const fields: StudioRoomSemanticField[] = [
    "contact methods",
    "services",
    "proof/testimonials",
    "links/portal cards",
    "credentials",
    "media embeds",
  ];
  const statuses: StudioRoomSemanticFieldStatus[] = ["absent", "mapped", "unmapped", "deferred"];

  return Object.fromEntries(
    fields.map((field) => [
      field,
      Object.fromEntries(
        statuses.map((status) => [
          status,
          rooms.filter((room) => room.semanticFieldStatus[field] === status).length,
        ]),
      ),
    ]),
  ) as Record<StudioRoomSemanticField, Record<StudioRoomSemanticFieldStatus, number>>;
}

function suggestedKitForRoom(node: PresenceNode): string {
  const type = node.room_type || "";
  const display = node.display_mode || "";
  if (display.includes("cultural_archive") || type.includes("culture") || type.includes("community")) {
    return "Cultural-community artist / archive room";
  }
  if (type.includes("artist") || display.includes("gallery") || display.includes("artist")) {
    return "Artist studio / gallery room";
  }
  if (type.includes("music") || type.includes("performer") || display.includes("minimal_portal")) {
    return "Performer / nightlife room";
  }
  if (type.includes("maker") || type.includes("craft") || type.includes("carpenter") || type.includes("tradie")) {
    return "Maker / craft room";
  }
  if (type.includes("healer") || type.includes("practitioner") || display.includes("practitioner")) {
    return "Practitioner room";
  }
  if (type.includes("consultant") || type.includes("professional") || display.includes("contract")) {
    return "Expert / consultant room";
  }
  if (type.includes("organisation")) {
    return "Community organisation room";
  }
  return "General presence room";
}

function rankGaps(
  commonUnmapped: Record<string, number>,
  _totalRooms: number,
): Array<{ field: string; frequency: number; recommendation: string }> {
  const recommendations: Record<string, string> = {
    "contact methods": "Add contact chamber to adapter (email/phone → contact object). High impact for all room types.",
    "services": "Add services chamber with service-card objects. High impact for practitioners, makers, and consultants.",
    "proof/testimonials": "Add proof chamber with proof-card objects. High impact for trust conversion.",
    "links/portal cards": "Add portal chamber with link/portal objects. Medium impact for artists and performers.",
    credentials: "Add credential badges to entrance or proof chamber. Low-medium impact.",
    "media embeds": "Add media embed object support. Low impact; defer until embed pipeline is stable.",
  };

  return Object.entries(commonUnmapped)
    .map(([field, frequency]) => ({
      field,
      frequency,
      recommendation: recommendations[field] || `Map ${field} to Studio Room objects.`,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

function countOccurrences(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}
