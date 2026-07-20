"use client";

import { use } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import { HallManagerClient } from "@/components/presence/halls/HallManagerClient";

export default function StudioHallManagerPage({
  params,
}: {
  params: Promise<{ id: string; hallId: string }>;
}) {
  const { id, hallId } = use(params);
  const nodeId = Number(id);
  const hallIdNum = Number(hallId);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);

  if (loading) return <Loading label="Loading this Hall..." />;
  if (error || !node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/halls/${hallId}`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <HallManagerClient node={node} hallId={hallIdNum} token={token} />
    </StudioShell>
  );
}
