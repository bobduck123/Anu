"use client";

import { use } from "react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading } from "@/components/ui";
import PresenceDnaPanel from "@/components/studio/PresenceDnaPanel";

export default function StudioDnaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, reload } = useOwnerNode(nodeId);

  if (loading) return <Loading label="Loading Presence DNA..." />;
  if (!node || !token) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/dna`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <PresenceDnaPanel node={node} nodeId={nodeId} token={token} onSaved={reload} />
      </div>
    </StudioShell>
  );
}
