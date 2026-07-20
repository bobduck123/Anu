"use client";

import { use } from "react";
import { Loading } from "@/components/ui";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import PresenceStudioEditorApp from "@/components/studio/editor/PresenceStudioEditorApp";
import PresenceStudioV2Editor from "@/components/presence-studio-v2/PresenceStudioV2Editor";
import { shouldUsePresenceStudioV2Editor } from "@/lib/presence/studio-v2/feature";

export default function StudioPresenceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, accessState, reload } = useOwnerNode(nodeId);

  if (loading && !node) {
    return (
      <Loading
        label={accessState === "confirming-room" ? "Confirming Room access..." : "Checking access..."}
      />
    );
  }
  if (!node || !token) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/editor`}
        error={error ?? "Node not found or you do not have editor access."}
        retryable={accessState === "unavailable"}
        onRetry={() => void reload()}
      />
    );
  }

  const isV2Enabled = shouldUsePresenceStudioV2Editor({
    roomId: nodeId,
    slug: node.slug,
    rendererKey: node.renderer_key,
    config: node.editable_config,
    node,
  });

  return (
    <StudioShell node={node}>
      {isV2Enabled ? (
        <PresenceStudioV2Editor node={node} nodeId={nodeId} token={token} onNodeReload={reload} />
      ) : (
        <PresenceStudioEditorApp node={node} nodeId={nodeId} token={token} onNodeReload={reload} />
      )}
    </StudioShell>
  );
}
