import type { PresenceEditableConfig, PresenceEditorOverview, PresenceNode } from "../../api/types.ts";
import { findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import type { PresenceRenderModel, RenderMode } from "../render/model.ts";
import { resolveRenderModel } from "../render/resolver.ts";
import { studioRoomFromEditableConfig, studioRoomFromPresenceNode } from "./adapters/fromEditableConfig.ts";
import type { Room, RoomObject } from "./model.ts";
import { renderStudioRoom } from "./renderer.ts";
import { toPublicRoomPayload, type PublicRoomPayload } from "./sanitize.ts";

export interface StudioRoomRealRoomComparisonInput {
  node: PresenceNode;
  overview?: PresenceEditorOverview | null;
}

export interface StudioRoomRealRoomComparisonResult {
  nodeForDraftRender: PresenceNode;
  renderModel: PresenceRenderModel;
  studioRoom: Room;
  sanitizedStudioRoom: PublicRoomPayload;
  diagnostics: {
    roomId: number;
    slug: string;
    permissionStatus: "confirmed-owner-or-staff";
    mode: RenderMode;
    sourceConfig: "draft" | "published" | "node";
    sceneCount: number;
    widgetCount: number;
    chamberCount: number;
    objectCount: number;
    semanticMappedCounts: Record<string, number>;
    blockedPrivateFieldCount: number;
    sanitizedPayloadRestrictedKeyCount: number;
    mobileCtaPresent: boolean;
    mediaCount: number;
    missingSemanticFields: string[];
    absentSemanticFields: string[];
    deferredSemanticFields: string[];
  };
}

const DEFERRED_SEMANTIC_FIELDS = ["media embeds"];

export function buildStudioRoomRealRoomComparison(
  input: StudioRoomRealRoomComparisonInput,
): StudioRoomRealRoomComparisonResult {
  const source = pickSourceConfig(input.node, input.overview);
  const nodeForDraftRender = source.config
    ? {
        ...input.node,
        editable_config: {
          ...source.config,
          status: source.mode,
        },
      }
    : input.node;

  const renderModel = resolveRenderModel(nodeForDraftRender, source.mode);
  const studioRoom = source.config
    ? studioRoomFromEditableConfig(source.config, input.node, {
        mode: source.mode,
        roomState: source.mode === "draft" ? "draft" : "published",
      })
    : studioRoomFromPresenceNode(input.node, {
        mode: source.mode,
        roomState: source.mode === "draft" ? "draft" : "published",
      });
  const sanitizedStudioRoom = toPublicRoomPayload(studioRoom);
  const mobileTree = renderStudioRoom(sanitizedStudioRoom, { viewport: "mobile" });
  const objects = flattenObjects(sanitizedStudioRoom);
  const semanticMappedCounts = {
    contact: countObjects(objects, "contact"),
    services: countObjects(objects, "service-card"),
    proof: countObjects(objects, "proof-card"),
    links: countObjects(objects, "link-card"),
    credentials: countObjects(objects, "credential"),
  };
  const semanticStatus = semanticStatuses(input.node, semanticMappedCounts);
  const restrictedKeys = findRestrictedPublicPayloadKeys(sanitizedStudioRoom);

  return {
    nodeForDraftRender,
    renderModel,
    studioRoom,
    sanitizedStudioRoom,
    diagnostics: {
      roomId: input.node.id,
      slug: input.node.slug,
      permissionStatus: "confirmed-owner-or-staff",
      mode: source.mode,
      sourceConfig: source.source,
      sceneCount: renderModel.scenes.length,
      widgetCount: renderModel.scenes.reduce((sum, scene) => sum + scene.widgets.length, 0),
      chamberCount: sanitizedStudioRoom.chambers.length,
      objectCount: objects.length,
      semanticMappedCounts,
      blockedPrivateFieldCount: countBlockedPrivateFields(input.node),
      sanitizedPayloadRestrictedKeyCount: restrictedKeys.length,
      mobileCtaPresent: mobileTree.chambers.some((chamber) =>
        chamber.objects.some((object) => object.action?.href),
      ),
      mediaCount: objects.filter((object) => object.content.image?.src).length,
      missingSemanticFields: semanticStatus.missing,
      absentSemanticFields: semanticStatus.absent,
      deferredSemanticFields: semanticStatus.deferred,
    },
  };
}

function pickSourceConfig(
  node: PresenceNode,
  overview?: PresenceEditorOverview | null,
): { mode: RenderMode; source: "draft" | "published" | "node"; config: PresenceEditableConfig | null } {
  if (overview?.draft) {
    return { mode: "draft", source: "draft", config: { ...overview.draft, status: "draft" } };
  }
  const published = overview?.published ?? overview?.published_public_config ?? null;
  if (published) {
    return { mode: "published", source: "published", config: { ...published, status: "published" } };
  }
  if (node.editable_config) {
    const mode: RenderMode = node.editable_config.status === "published" ? "published" : "draft";
    return { mode, source: mode === "draft" ? "draft" : "published", config: node.editable_config };
  }
  return { mode: "draft", source: "node", config: null };
}

function semanticStatuses(
  node: PresenceNode,
  mapped: Record<string, number>,
): { missing: string[]; absent: string[]; deferred: string[] } {
  const missing: string[] = [];
  const absent: string[] = [];

  markStatus(publicContactPresent(node), mapped.contact > 0, "contact methods", missing, absent);
  markStatus(hasVisibleArray(node.services), mapped.services > 0, "services", missing, absent);
  markStatus(hasProofSource(node), mapped.proof > 0, "proof/testimonials", missing, absent);
  markStatus(hasLinkSource(node), mapped.links > 0, "links/portal cards", missing, absent);
  markStatus(hasVisibleArray(node.credentials), mapped.credentials > 0, "credentials", missing, absent);

  const deferred = hasVisibleArray(node.media_embeds) ? DEFERRED_SEMANTIC_FIELDS : [];
  if (!hasVisibleArray(node.media_embeds)) absent.push("media embeds");

  return { missing, absent, deferred };
}

function markStatus(
  sourcePresent: boolean,
  mapped: boolean,
  label: string,
  missing: string[],
  absent: string[],
) {
  if (!sourcePresent) {
    absent.push(label);
  } else if (!mapped) {
    missing.push(label);
  }
}

function countBlockedPrivateFields(node: PresenceNode): number {
  const recordNode = node as unknown as Record<string, unknown>;
  const privateFields = [
    recordNode.email,
    recordNode.phone,
    recordNode.contactEmail,
    recordNode.contactPhone,
    node.enquiry_email,
    recordNode.ownerEmail,
    recordNode.authEmail,
    recordNode.adminEmail,
    recordNode.staffEmail,
    recordNode.owner_email,
    recordNode.auth_email,
    recordNode.admin_email,
    recordNode.staff_email,
  ].filter((value) => typeof value === "string" && value.trim().length > 0).length;
  return privateFields + countUnsafeLinks(node);
}

function countUnsafeLinks(node: PresenceNode): number {
  const links = Array.isArray(node.links) ? node.links : [];
  return links.filter((link) => link.is_visible !== false && !safePublicUrl(link.url)).length;
}

function safePublicUrl(value: unknown): boolean {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) return false;
  if (candidate.startsWith("/")) return !isControlPlanePath(candidate);
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (isPrivateHost(url.hostname)) return false;
  return !isControlPlanePath(url.pathname);
}

function isControlPlanePath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return (
    path.startsWith("/api") ||
    path.startsWith("/auth") ||
    path.startsWith("/studio") ||
    path.startsWith("/internal") ||
    path.startsWith("/admin") ||
    path.includes("/dashboard")
  );
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function publicContactPresent(node: PresenceNode): boolean {
  const recordNode = node as unknown as Record<string, unknown>;
  return Boolean(node.public_email || node.public_phone || recordNode.publicEmail || recordNode.publicPhone);
}

function hasProofSource(node: PresenceNode): boolean {
  return hasVisibleArray(node.proof_items) || hasVisibleArray(node.testimonials);
}

function hasLinkSource(node: PresenceNode): boolean {
  return hasVisibleArray(node.links) || Boolean(node.public_url);
}

function hasVisibleArray(value: unknown): boolean {
  return Array.isArray(value) && value.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const record = entry as Record<string, unknown>;
    return record.is_visible !== false && record.is_public !== false;
  });
}

function flattenObjects(room: Pick<Room, "chambers">): RoomObject[] {
  return room.chambers.flatMap((chamber) => chamber.objects);
}

function countObjects(objects: RoomObject[], type: string): number {
  return objects.filter((object) => object.type === type).length;
}
