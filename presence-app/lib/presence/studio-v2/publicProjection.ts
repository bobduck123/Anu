import type { PresenceEditableConfig, PresenceNode } from "../../api/types.ts";
import type { StudioV2PublicRoom } from "./model.ts";
import { publicRoomFromStudioV2State, studioV2FromPresenceConfig } from "./adapters.ts";
import { shouldUsePresenceStudioV2, type PresenceStudioV2FeatureEnv } from "./feature.ts";

export function studioV2PublicRoomFromPresenceNode(
  node: PresenceNode,
  config: PresenceEditableConfig | null | undefined = node.editable_config,
  env?: PresenceStudioV2FeatureEnv,
): StudioV2PublicRoom | undefined {
  const rendererKey = config?.renderer_key ?? node.renderer_key;
  if (!shouldUsePresenceStudioV2({
    roomId: node.id,
    slug: node.slug,
    rendererKey,
    config,
    node,
  }, env)) {
    return undefined;
  }
  return publicRoomFromStudioV2State(studioV2FromPresenceConfig(config, node));
}
