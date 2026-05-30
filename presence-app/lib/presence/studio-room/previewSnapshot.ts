import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import { createPublicRenderPayload, findRestrictedPublicPayloadKeys } from "../render/publicPayload.ts";
import type { PresenceRenderModel } from "../render/model.ts";
import { resolveRenderModel } from "../render/resolver.ts";
import type { PublicRoomPayload } from "./sanitize.ts";
import { renderStudioRoom, type StudioRoomRenderTree } from "./renderer.ts";
import { toPublicRoomPayload } from "./sanitize.ts";
import { studioRoomFromEditableConfig } from "./adapters/fromEditableConfig.ts";

export interface StudioRoomPreviewSnapshot {
  sourceLabel: string;
  existingRenderModel: PresenceRenderModel;
  studioRoom: PublicRoomPayload;
  studioRoomRenderTree: StudioRoomRenderTree;
  debug: {
    renderMode: "draft";
    existingSceneCount: number;
    existingWidgetCount: number;
    studioChamberCount: number;
    studioObjectCount: number;
    restrictedKeysInStudioPayload: string[];
    restrictedKeysInPublicPayload: string[];
  };
}

export function buildStudioRoomPreviewSnapshot(): StudioRoomPreviewSnapshot {
  const node = studioRoomPreviewNode();
  const draft = studioRoomPreviewDraftConfig();
  const draftNode = { ...node, editable_config: { ...draft, status: "draft" } };
  const existingRenderModel = resolveRenderModel(draftNode, "draft");
  const studioRoom = toPublicRoomPayload(studioRoomFromEditableConfig(draft, node, { mode: "draft" }));
  const studioRoomRenderTree = renderStudioRoom(studioRoom);
  const publicPayload = createPublicRenderPayload({
    ...node,
    editable_config: { ...draft, status: "published" },
  });

  return {
    sourceLabel: "GGM structured draft fixture",
    existingRenderModel,
    studioRoom,
    studioRoomRenderTree,
    debug: {
      renderMode: "draft",
      existingSceneCount: existingRenderModel.scenes.length,
      existingWidgetCount: existingRenderModel.scenes.reduce((sum, scene) => sum + scene.widgets.length, 0),
      studioChamberCount: studioRoom.chambers.length,
      studioObjectCount: studioRoom.chambers.reduce((sum, chamber) => sum + chamber.objects.length, 0),
      restrictedKeysInStudioPayload: findRestrictedPublicPayloadKeys(studioRoom),
      restrictedKeysInPublicPayload: findRestrictedPublicPayloadKeys(publicPayload),
    },
  };
}

function studioRoomPreviewNode(): PresenceNode {
  return {
    id: 11,
    slug: "ggm-christina-goddard",
    display_name: "Christina Kerkvliet Goddard",
    headline: "Selected watercolour works",
    bio: "A room for watercolours, memory colours and studio invitations.",
    node_type: "artist",
    display_mode: "artist_gallery",
    status: "published",
    visibility: "public",
    renderer_key: "ggm-faithful-room-v1",
    works: [
      {
        id: 1,
        slug: "bridle-road",
        title: "Bridle Road",
        description: "A quiet study of path, brush and light.",
        image_url: "/ggm/works/bridle-road-2005.webp",
        thumbnail_url: "/ggm/works/bridle-road-2005.webp",
        is_visible: true,
      },
    ],
  } as PresenceNode;
}

function studioRoomPreviewDraftConfig(): PresenceEditableConfig {
  return {
    id: 901,
    room_id: 11,
    status: "draft",
    renderer_key: "ggm-faithful-room-v1",
    content_config: {
      display_name: "Studio Room Preview Draft",
      headline: "A draft-rendered living room.",
      about: {
        artist_statement: "This fixture compares the existing resolved model with the new structured Studio Room path.",
        biography: "Draft biography used for internal comparison only.",
      },
      contact: {
        contact_title: "Invitation",
        contact_copy: "Use this preview to inspect the bridge, not as public route output.",
      },
    },
    scene_config: {
      scenes: [
        { id: "artwork_field", title: "Internal Studio Room Preview", statement: "Current render model into Room / Chamber / Object." },
        { id: "work_wall", title: "Preview Work Wall", artwork_order: ["bridle-road"] },
        { id: "practice_studio", about_title: "Preview Practice" },
        { id: "calling_card", contact_title: "Preview Invitation" },
      ],
    },
    style_dna: {
      palette: {
        bg: "#f4efe5",
        paper: "#fffaf0",
        ink: "#241f18",
        muted: "#756a5a",
        accent: "#b87938",
      },
      typography: {
        heading_stack: "Georgia, serif",
        body_stack: "Inter, sans-serif",
      },
    },
    motion_config: {
      intensity: "gentle",
      reduced_motion_fallback: true,
    },
    asset_config: {
      hero_image: {
        url: "/ggm/works/bridle-road-2005.webp",
        alt_text: "A watercolour landscape used as an internal preview fixture.",
      },
    },
    roomkey_config: {},
    enquiry_config: { cta_label: "Preview the bridge" },
    locked_fields: {},
    created_by_user_id: 123,
  };
}
