"use client";

import { use } from "react";
import { Loading } from "@/components/ui";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import { StudioRoomOwnerEditorShell } from "@/components/presence-studio/StudioRoomOwnerEditorShell";

export default function StudioRoomEditorPage({ params }: { params: Promise<{ id: string }> }) {
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
        returnTo={`/studio/${nodeId}/studio-room`}
        error={error ?? "Node not found or you do not have Studio Room access."}
        retryable={accessState === "unavailable"}
        onRetry={() => void reload()}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <StudioRoomOwnerEditorShell node={node} nodeId={nodeId} token={token} />
    </StudioShell>
  );
}
