import type { PresenceEditableConfig, PresenceNode } from "../../../api/types.ts";
import {
  PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
  type Chamber,
  type ChamberType,
  type Room,
  type RoomObject,
  type RoomObjectType,
  type RoomState,
  type ThemeTokens,
} from "../model.ts";
import type { PresenceRenderModel, RenderMode, RenderWork, SceneInstance, WidgetInstance } from "../../render/model.ts";
import { resolveRenderModel } from "../../render/resolver.ts";

export interface StudioRoomAdapterOptions {
  mode?: RenderMode;
  roomState?: RoomState;
  roomId?: string;
}

export function studioRoomFromPresenceNode(
  node: PresenceNode,
  options: StudioRoomAdapterOptions = {},
): Room {
  const mode = options.mode ?? "published";
  const room = studioRoomFromRenderModel(resolveRenderModel(node, mode), {
    roomId: options.roomId ?? String(node.id),
    roomState: options.roomState ?? (mode === "draft" ? "draft" : "published"),
  });
  return appendNodeSemanticChambers(room, node);
}

export function studioRoomFromEditableConfig(
  config: PresenceEditableConfig | null | undefined,
  node: PresenceNode,
  options: StudioRoomAdapterOptions = {},
): Room {
  const mode = options.mode ?? (config?.status === "published" ? "published" : "draft");
  const editable_config = config ? { ...config, status: mode === "published" ? "published" : "draft" } : null;
  return studioRoomFromPresenceNode(
    { ...node, editable_config },
    { ...options, mode, roomState: options.roomState ?? (mode === "draft" ? "draft" : "published") },
  );
}

export function studioRoomFromRenderModel(
  model: PresenceRenderModel,
  options: { roomId?: string; roomState?: RoomState } = {},
): Room {
  const chambers = model.scenes.filter((scene) => scene.hidden !== true).map((scene, index) =>
    chamberFromScene(scene, index, model),
  );
  const entryChamberId = chambers[0]?.id ?? "room";

  return {
    schemaVersion: PRESENCE_STUDIO_ROOM_SCHEMA_VERSION,
    id: options.roomId ?? model.identity.slug,
    slug: model.identity.slug,
    title: model.identity.displayName.value || model.identity.slug,
    state: options.roomState ?? (model.mode === "draft" ? "draft" : "published"),
    entryChamberId,
    theme: themeFromRenderModel(model),
    rendererConfig: {
      renderer: "studio-room-basic",
      layout: "single-scroll",
      mobileLayout: "stacked",
      reducedMotion: model.motion.reducedMotionFallback.value,
      objectOpenMode: "sheet",
    },
    moodPresetId: model.palette.bg.provenance === "authored" ? "custom-room" : undefined,
    templateKitId: model.identity.rendererKey,
    chambers,
    internal: {
      sourceRendererKey: model.identity.rendererKey,
      sourceRenderMode: model.mode,
      provenanceSummary: model.provenanceSummary,
    },
  };
}

function chamberFromScene(scene: SceneInstance, index: number, model: PresenceRenderModel): Chamber {
  return {
    id: String(scene.id),
    type: chamberTypeForScene(scene.id),
    title: scene.label || `Scene ${index + 1}`,
    summary: scene.sub || "",
    mobile: { order: index + 1, layout: scene.id === "wall" ? "carousel" : "stack" },
    objects: scene.widgets
      .filter((widget) => widget.hidden !== true)
      .sort((a, b) => a.order - b.order)
      .map((widget) => objectFromWidget(widget, model)),
    internal: {
      sourceSceneLayout: scene.layout.value,
      sourceSceneBackground: scene.background.value,
      provenance: scene.layout.provenance,
    },
  };
}

function objectFromWidget(widget: WidgetInstance, model: PresenceRenderModel): RoomObject {
  const config = record(widget.config);
  const object: RoomObject = {
    id: widget.id,
    type: objectTypeForWidget(widget),
    label: labelForWidget(widget),
    content: contentForWidget(widget, model),
    mobile: { order: widget.order + 1 },
    internal: {
      sourceWidgetType: widget.type,
      sourceScene: widget.scene,
      provenance: widget.provenance,
    },
  };

  const style = model.elementStyles[widget.id] ?? widget.textStyle;
  if (style) {
    object.internal = { ...object.internal, textStyle: style };
  }
  if (text(config.text) || text(config.copy) || text(config.label)) {
    object.editorOnly = { editablePaths: [`widget:${widget.id}`] };
  }
  return object;
}

function contentForWidget(widget: WidgetInstance, model: PresenceRenderModel): RoomObject["content"] {
  const config = record(widget.config);
  const textValue = text(config.text);
  const copyValue = text(config.copy);
  const labelValue = text(config.label);
  const leadValue = text(config.lead);

  if (widget.type === "hero-image") {
    const asset = record(config.asset);
    return {
      image: {
        src: text(asset.url),
        alt: text(asset.altText) || text(asset.alt_text) || "Room image",
        focalPoint: focalPoint(asset.focalPoint),
      },
    };
  }
  if (widget.type === "invitation") {
    return {
      title: labelValue || "Invitation",
      action: {
        label: labelValue || "Begin a conversation",
        href: text(config.href) || "#invitation",
      },
    };
  }
  if (widget.type === "work-wall") {
    const works = Array.isArray(config.works) ? (config.works as RenderWork[]) : model.works;
    return {
      title: "Work wall",
      body: leadValue || `${works.filter((work) => work.visible !== false).length} works`,
    };
  }
  if (widget.type === "work-feature") {
    const workSlug = text(config.workSlug);
    const work = model.works.find((item) => item.slug === workSlug) ?? model.works[0];
    return {
      title: work?.title ?? "Featured work",
      body: work?.description ?? "",
      image: work ? {
        src: work.asset.url,
        alt: work.asset.altText || work.title,
        focalPoint: work.asset.focalPoint,
      } : undefined,
    };
  }
  return {
    title: textValue || labelValue || copyValue || labelForWidget(widget),
    body: copyValue || leadValue || "",
  };
}

function themeFromRenderModel(model: PresenceRenderModel): ThemeTokens {
  return {
    background: model.palette.bg.value,
    surface: model.palette.paper.value,
    text: model.palette.ink.value,
    muted: model.palette.muted.value,
    accent: model.palette.accent.value,
    radius: "round",
    fontHeading: model.typography.headingFamily.value,
    fontBody: model.typography.bodyFamily.value,
    motion: model.motion.intensity.value === "immersive" ? "living" : model.motion.intensity.value,
    spacing: "gallery",
  };
}

function chamberTypeForScene(id: string): ChamberType {
  if (id === "field") return "entrance";
  if (id === "wall") return "gallery";
  if (id === "card") return "invitation";
  return "story";
}

function objectTypeForWidget(widget: WidgetInstance): RoomObjectType {
  if (widget.type === "hero-image" || widget.type === "hero-slideshow" || widget.type === "work-feature") return "image";
  if (widget.type === "work-wall") return "work";
  if (widget.type === "invitation" || widget.type === "external-link") return "cta";
  if (widget.type === "roomkey-chip") return "note";
  return "text";
}

function appendNodeSemanticChambers(room: Room, node: PresenceNode): Room {
  const semanticChambers = [
    contactChamber(node, room.chambers.length + 1),
    servicesChamber(node, room.chambers.length + 2),
    proofChamber(node, room.chambers.length + 3),
    portalChamber(node, room.chambers.length + 4),
    credentialsChamber(node, room.chambers.length + 5),
  ].filter((chamber): chamber is Chamber => Boolean(chamber));

  if (semanticChambers.length === 0) {
    return room;
  }

  return {
    ...room,
    chambers: [...room.chambers, ...semanticChambers],
  };
}

function contactChamber(node: PresenceNode, order: number): Chamber | null {
  const recordNode = record(node);
  const objects: RoomObject[] = [];
  const email = publicEmail(recordNode.public_email, recordNode.publicEmail);
  const phone = publicPhone(recordNode.public_phone, recordNode.publicPhone);
  const website = safePublicUrl(recordNode.public_url ?? recordNode.publicUrl ?? recordNode.website);

  if (email) {
    objects.push({
      id: "contact-email",
      type: "contact",
      label: "Email",
      content: {
        title: "Email",
        body: email,
        action: { label: "Send email", href: `mailto:${email}` },
      },
      mobile: { order: 1 },
      internal: { source: "public_contact" },
    });
  }

  if (phone) {
    objects.push({
      id: "contact-phone",
      type: "contact",
      label: "Phone",
      content: {
        title: "Phone",
        body: phone,
        action: { label: "Call", href: `tel:${phone.replace(/[^\d+]/g, "")}` },
      },
      mobile: { order: 2 },
      internal: { source: "public_contact" },
    });
  }

  if (website) {
    objects.push({
      id: "contact-website",
      type: "contact",
      label: "Website",
      content: {
        title: "Website",
        body: website,
        action: { label: "Visit website", href: website },
      },
      mobile: { order: 3 },
      internal: { source: "public_contact" },
    });
  }

  if (objects.length === 0) return null;
  return {
    id: "contact",
    type: "contact",
    title: "Contact",
    summary: "Public ways to begin a conversation.",
    objects,
    mobile: { order, layout: "stack" },
    internal: { source: "presence_node_contact" },
  };
}

function servicesChamber(node: PresenceNode, order: number): Chamber | null {
  const services = arrayRecords(node.services).filter((service) => service.is_visible !== false);
  if (services.length === 0) return null;

  return {
    id: "services",
    type: "services",
    title: "Services",
    summary: "Ways this room can help.",
    mobile: { order, layout: "stack" },
    objects: services.map((service, index) => {
      const title = text(service.title ?? service.name) || `Service ${index + 1}`;
      const meta = [text(service.price_label ?? service.price ?? service.priceRange), text(service.duration_label ?? service.duration), text(service.category)]
        .filter(Boolean)
        .join(" · ");
      return {
        id: `service-${safeId(service.id, index)}`,
        type: "service-card",
        label: title,
        content: {
          title,
          body: [text(service.description), meta].filter(Boolean).join("\n"),
          action: publicAction(service.cta_label ?? service.ctaLabel, service.cta_url ?? service.ctaUrl),
        },
        mobile: { order: index + 1 },
        internal: { source: "presence_node_services" },
      };
    }),
    internal: { source: "presence_node_services" },
  };
}

function proofChamber(node: PresenceNode, order: number): Chamber | null {
  const proof = [
    ...arrayRecords(node.proof_items),
    ...arrayRecords((node as unknown as Record<string, unknown>).proofItems),
    ...arrayRecords(node.testimonials),
    ...arrayRecords((node as unknown as Record<string, unknown>).reviews),
  ].filter((item) => item.is_visible !== false && item.is_public !== false);

  if (proof.length === 0) return null;

  return {
    id: "proof",
    type: "proof",
    title: "Proof",
    summary: "Signals of trust from public room content.",
    mobile: { order, layout: "stack" },
    objects: proof.map((item, index) => {
      const quote = text(item.testimonial ?? item.quote ?? item.body ?? item.outcome);
      const attribution = text(item.client_label ?? item.clientLabel ?? item.source ?? item.name ?? item.title);
      const title = attribution || `Proof ${index + 1}`;
      return {
        id: `proof-${safeId(item.id, index)}`,
        type: "proof-card",
        label: title,
        content: {
          title,
          body: quote || text(item.outcome) || "Proof note pending.",
          action: publicAction(item.link_label ?? item.linkLabel ?? "Read more", item.url ?? item.link),
        },
        mobile: { order: index + 1 },
        internal: { source: "presence_node_proof" },
      };
    }),
    internal: { source: "presence_node_proof" },
  };
}

function portalChamber(node: PresenceNode, order: number): Chamber | null {
  const links = [
    ...arrayRecords(node.links),
    ...publicUrlRecord(node.public_url, "Website", "website"),
    ...publicUrlRecord((node as unknown as Record<string, unknown>).website, "Website", "website"),
  ].filter((link) => link.is_visible !== false);

  const objects = links.flatMap((link, index): RoomObject[] => {
    const href = safePublicUrl(link.url ?? link.href);
    if (!href) return [];
    const label = text(link.label ?? link.title ?? link.platform ?? link.link_type) || "Open link";
    return [{
      id: `link-${safeId(link.id, index)}`,
      type: "link-card",
      label,
      content: {
        title: label,
        body: text(link.link_type ?? link.type ?? link.platform),
        action: { label, href },
      },
      mobile: { order: index + 1 },
      internal: { source: "presence_node_links" },
    }];
  });

  if (objects.length === 0) return null;
  return {
    id: "portal",
    type: "portal",
    title: "Links",
    summary: "Public paths connected to this room.",
    mobile: { order, layout: "stack" },
    objects,
    internal: { source: "presence_node_links" },
  };
}

function credentialsChamber(node: PresenceNode, order: number): Chamber | null {
  const credentials = arrayRecords(node.credentials).filter((credential) => credential.is_public !== false);
  if (credentials.length === 0) return null;

  return {
    id: "credentials",
    type: "proof",
    title: "Credentials",
    summary: "Public qualifications and trust markers.",
    mobile: { order, layout: "stack" },
    objects: credentials.map((credential, index) => {
      const title = text(credential.title ?? credential.name) || `Credential ${index + 1}`;
      const issuer = text(credential.issuer);
      const kind = text(credential.credential_type ?? credential.type);
      return {
        id: `credential-${safeId(credential.id, index)}`,
        type: "credential",
        label: title,
        content: {
          title,
          body: [issuer, kind].filter(Boolean).join(" · "),
          action: publicAction("Verify", credential.verification_url ?? credential.url),
        },
        mobile: { order: index + 1 },
        internal: { source: "presence_node_credentials" },
      };
    }),
    internal: { source: "presence_node_credentials" },
  };
}

function labelForWidget(widget: WidgetInstance): string {
  const labels: Record<string, string> = {
    "hero-title": "Room title",
    "hero-caption": "Room caption",
    "hero-image": "Cover image",
    statement: "Statement",
    biography: "Biography",
    "process-notes": "Process notes",
    "calling-card": "Calling card",
    invitation: "Invitation",
    "work-wall": "Work wall",
    "work-feature": "Featured work",
    "studio-fragments": "Studio fragments",
    "roomkey-chip": "RoomKey note",
  };
  return labels[widget.type] ?? widget.id;
}

function publicAction(labelValue: unknown, hrefValue: unknown): RoomObject["content"]["action"] | undefined {
  const href = safePublicUrl(hrefValue);
  if (!href) return undefined;
  return {
    label: text(labelValue) || "Open",
    href,
  };
}

function publicUrlRecord(value: unknown, label: string, linkType: string): Record<string, unknown>[] {
  const url = safePublicUrl(value);
  return url ? [{ label, url, link_type: linkType, is_visible: true }] : [];
}

function publicEmail(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value).toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      return candidate;
    }
  }
  return "";
}

function publicPhone(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value);
    if (/^[+()\d\s.-]{7,}$/.test(candidate)) {
      return candidate;
    }
  }
  return "";
}

function safePublicUrl(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return "";
  if (candidate.startsWith("/")) {
    return isSafePublicPath(candidate) ? candidate : "";
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (!isSafePublicHost(url.hostname)) return "";
  if (isControlPlanePath(url.pathname)) return "";
  return candidate;
}

function isSafePublicPath(path: string): boolean {
  return !isControlPlanePath(path);
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

function isSafePublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return false;
  }

  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) {
    return false;
  }
  const private172 = /^172\.(1[6-9]|2\d|3[0-1])\./;
  return !private172.test(host);
}

function safeId(value: unknown, fallback: number): string {
  const candidate = text(value);
  return (candidate || String(fallback + 1))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record).filter((entry) => Object.keys(entry).length > 0) : [];
}

function focalPoint(value: unknown): { x: number; y: number } | undefined {
  const candidate = record(value);
  const x = number(candidate.x);
  const y = number(candidate.y);
  return x == null || y == null ? undefined : { x, y };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function number(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
