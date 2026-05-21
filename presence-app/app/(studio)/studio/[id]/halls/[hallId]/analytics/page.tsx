"use client";

import { use } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import { HallAnalyticsClient } from "@/components/presence/halls/HallAnalyticsClient";

export default function StudioHallAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string; hallId: string }>;
}) {
  const { id, hallId } = use(params);
  const nodeId = Number(id);
  const hallIdNum = Number(hallId);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);

  if (loading) return <Loading label="Loading Hall analytics..." />;
  if (error || !node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/halls/${hallId}/analytics`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <HallAnalyticsClient nodeId={nodeId} hallId={hallIdNum} token={token} />
    </StudioShell>
  );
}
