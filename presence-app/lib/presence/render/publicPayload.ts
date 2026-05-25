import type { PresenceNode } from "../../api/types.ts";
import type { PresenceRenderModel } from "./model.ts";
import { resolveRenderModel } from "./resolver.ts";

export const RESTRICTED_PUBLIC_PAYLOAD_KEYS = [
  "editable_config",
  "asset_config",
  "content_config",
  "style_dna",
  "motion_config",
  "draft_config",
  "owner_user_id",
  "auth_subject",
  "platform_admin",
  "internal_lifetime_free",
  "preview_token",
  "bearer",
  "service_role",
] as const;

const restrictedKeys = new Set<string>(RESTRICTED_PUBLIC_PAYLOAD_KEYS);

const PUBLIC_DISPLAY_NODE_KEYS = [
  "id",
  "slug",
  "display_name",
  "headline",
  "bio",
  "node_type",
  "display_mode",
  "plan_type",
  "status",
  "visibility",
  "public_status",
  "room_type",
  "theme_preset",
  "accent_color",
  "profile_image_url",
  "cover_image_url",
  "hero_title",
  "hero_subtitle",
  "hero_image_url",
  "short_bio",
  "long_story",
  "location_label",
  "primary_cta_label",
  "primary_cta_url",
  "availability_status",
  "featured_notice",
  "media_embeds",
  "seo_title",
  "seo_description",
  "social_preview_image_url",
  "landing_enabled",
  "landing_title",
  "landing_subtitle",
  "landing_background_url",
  "landing_enter_label",
  "practice_statement",
  "curatorial_statement",
  "public_email",
  "public_phone",
  "public_url",
  "links",
  "services",
  "collections",
  "works",
  "gallery_items",
  "testimonials",
  "availability_chips",
  "credentials",
  "proof_items",
  "directory_ready",
  "map_ready",
  "archive_ready",
  "white_label_ready",
  "renderer_key",
  "metadata",
  "seo",
  "created_at",
  "updated_at",
  "published_at",
] as const satisfies readonly (keyof PresenceNode)[];

export interface PublicRenderPayload {
  node: PresenceNode;
  renderModel: PresenceRenderModel;
}

/**
 * Resolve visible published values before crossing from the server route into
 * client rendering, then remove editor/control-plane field names from the
 * serialised public props. Authenticated Studio routes continue to use their
 * complete nested editor contract.
 */
export function createPublicRenderPayload(node: PresenceNode): PublicRenderPayload {
  const renderModel = resolveRenderModel(node, "published");
  return {
    node: publicDisplayNode(node),
    renderModel: removeRestrictedKeys(renderModel) as PresenceRenderModel,
  };
}

export function findRestrictedPublicPayloadKeys(value: unknown): string[] {
  const found = new Set<string>();
  visitKeys(value, (key) => {
    if (restrictedKeys.has(key.toLowerCase())) found.add(key.toLowerCase());
  });
  return [...found].sort();
}

function removeRestrictedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeRestrictedKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !restrictedKeys.has(key.toLowerCase()))
      .map(([key, entry]) => [key, removeRestrictedKeys(entry)]),
  );
}

function publicDisplayNode(node: PresenceNode): PresenceNode {
  const display: Partial<PresenceNode> = {};
  for (const key of PUBLIC_DISPLAY_NODE_KEYS) {
    if (node[key] !== undefined) {
      Object.assign(display, { [key]: removeRestrictedKeys(node[key]) });
    }
  }
  return display as PresenceNode;
}

function visitKeys(value: unknown, visitor: (key: string) => void) {
  if (Array.isArray(value)) {
    value.forEach((entry) => visitKeys(entry, visitor));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    visitor(key);
    visitKeys(entry, visitor);
  }
}
