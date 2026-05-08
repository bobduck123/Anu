"use client";

import { use } from "react";
import { Globe } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading, StatusPill, Button } from "@/components/ui";
import { publishNode, unpublishNode } from "@/lib/api/owner";
import { canonicalPublicUrl } from "@/lib/presence/url";

export default function StudioSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, reload } = useOwnerNode(nodeId);

  async function handlePublishToggle() {
    if (!token || !node) return;
    if (node.status === "published") {
      await unpublishNode(nodeId, token);
    } else {
      await publishNode(nodeId, token);
    }
    await reload();
  }

  if (loading) return <Loading label="Loading settings..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/settings`}
        error={error ?? "Node not found."}
      />
    );
  }

  const publicUrl = canonicalPublicUrl(node.slug);

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Publish controls
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--p-studio-text)]">
            Settings
          </h2>
        </div>

        <section className="flex flex-col gap-4 p-5 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Visibility</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-[var(--p-studio-text)]">Publication status</span>
              <StatusPill status={node.status} />
            </div>
            <Button variant={node.status === "published" ? "secondary" : "primary"} size="sm" onClick={() => void handlePublishToggle()}>
              {node.status === "published" ? "Unpublish" : "Publish"}
            </Button>
          </div>

          {node.status === "published" ? (
            <div className="flex items-center gap-2 text-sm text-[var(--p-studio-muted)]">
              <Globe className="w-4 h-4 shrink-0" />
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="truncate hover:text-[var(--p-studio-accent)] transition-colors">
                {publicUrl}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[var(--p-studio-muted)]">
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">Public URL reserved after publish: {publicUrl}</span>
            </div>
          )}
          <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
            Publishing makes the public route available when the backend marks
            this Presence public. Draft, private, suspended, and archived
            Presences remain hidden from public visitors.
          </p>
        </section>

        <section className="flex flex-col gap-3 p-5 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
          <h3 className="text-xs font-semibold text-[var(--p-studio-muted)] uppercase tracking-widest">Presence record</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Slug</dt>
              <dd className="text-[var(--p-studio-text)] font-mono">{node.slug}</dd>
            </div>
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Type</dt>
              <dd className="text-[var(--p-studio-text)]">{node.node_type}</dd>
            </div>
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Display mode</dt>
              <dd className="text-[var(--p-studio-text)]">{node.display_mode}</dd>
            </div>
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Plan</dt>
              <dd className="text-[var(--p-studio-text)]">{node.plan_type ?? "Not set"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </StudioShell>
  );
}
