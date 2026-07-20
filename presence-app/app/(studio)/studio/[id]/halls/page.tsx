"use client";

import { use } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import { OwnerHallStudio } from "@/components/presence/halls/OwnerHallStudio";

export default function StudioHallsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);

  if (loading) return <Loading label="Loading your Halls..." />;
  if (error || !node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/halls`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <OwnerHallStudio node={node} token={token} />
    </StudioShell>
  );
}
