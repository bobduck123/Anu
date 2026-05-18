"use client";

import { use, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import { Loading, StatusPill, Button } from "@/components/ui";
import { publishNode, unpublishNode, updateNode } from "@/lib/api/owner";
import { canonicalPublicUrl } from "@/lib/presence/url";

const PUBLIC_STATUS_OPTIONS = [
  ["draft", "Draft"],
  ["private", "Private"],
  ["public", "Public"],
] as const;

export default function StudioSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired, reload } = useOwnerNode(nodeId);
  const [publicStatus, setPublicStatus] = useState("draft");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!node) return;
    setPublicStatus(node.public_status ?? (node.status === "published" ? "public" : "draft"));
  }, [node]);

  async function handlePublishToggle() {
    if (!token || !node) return;
    if (node.status === "published") {
      await unpublishNode(nodeId, token);
    } else {
      await publishNode(nodeId, token);
    }
    await reload();
  }

  async function handlePublicStatusSave() {
    if (!token) return;
    setSavingStatus(true);
    setStatusError(null);
    try {
      await updateNode(nodeId, { public_status: publicStatus }, token);
      await reload();
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 1800);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not update public status.");
    } finally {
      setSavingStatus(false);
    }
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

          <div className="rounded-xl border border-[var(--p-studio-border)] bg-[var(--p-studio-bg)] p-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--p-studio-muted)]">Public status</span>
              <select
                value={publicStatus}
                onChange={(event) => {
                  setPublicStatus(event.target.value);
                  setStatusSaved(false);
                  setStatusError(null);
                }}
                className="w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2 text-sm text-[var(--p-text)] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[var(--p-accent)]"
              >
                {PUBLIC_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
                Public exposes the room, private reserves it, and draft keeps it hidden while editing.
              </p>
              <Button size="sm" loading={savingStatus} onClick={() => void handlePublicStatusSave()}>
                {statusSaved ? "Saved" : "Save"}
              </Button>
            </div>
            {statusError && (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {statusError}
              </p>
            )}
          </div>
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
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Public status</dt>
              <dd className="text-[var(--p-studio-text)]">{node.public_status ?? "legacy"}</dd>
            </div>
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Room type</dt>
              <dd className="text-[var(--p-studio-text)]">{node.room_type ?? "Legacy node"}</dd>
            </div>
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Theme</dt>
              <dd className="text-[var(--p-studio-text)]">{node.theme_preset ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-[var(--p-studio-muted)] text-xs">Enquiry inbox</dt>
              <dd className="text-[var(--p-studio-text)] break-all">{node.enquiry_email ?? node.public_email ?? "Owner email fallback"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </StudioShell>
  );
}
