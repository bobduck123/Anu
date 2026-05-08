"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import PresenceMediaSlot from "@/components/studio/PresenceMediaSlot";
import { Loading, Empty, Button, Input, Textarea } from "@/components/ui";
import { listWorks, createWork, updateWork, deleteWork } from "@/lib/api/owner";
import type { PresenceMediaUploadResult, PresenceWork } from "@/lib/api/types";

export default function StudioWorksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);
  const [works, setWorks] = useState<PresenceWork[]>([]);
  const [worksLoading, setWorksLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<PresenceWork> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    setWorksLoading(true);
    setListError(null);
    listWorks(nodeId, token)
      .then(setWorks)
      .catch((err) => setListError(err instanceof Error ? err.message : "Works could not be loaded."))
      .finally(() => setWorksLoading(false));
  }, [nodeId, token]);

  async function save() {
    if (!token || !editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await updateWork(editing.id, editing, token);
        setWorks((ws) => ws.map((w) => (w.id === updated.id ? updated : w)));
      } else {
        const created = await createWork(nodeId, editing, token);
        setWorks((ws) => [created, ...ws]);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(work: PresenceWork) {
    if (!token) return;
    const updated = await updateWork(work.id!, { is_visible: !work.is_visible }, token);
    setWorks((ws) => ws.map((w) => (w.id === updated.id ? updated : w)));
  }

  async function remove(work: PresenceWork) {
    if (!token || !confirm("Delete this work?")) return;
    await deleteWork(work.id!, token);
    setWorks((ws) => ws.filter((w) => w.id !== work.id));
  }

  function syncUploadedWork(result: PresenceMediaUploadResult) {
    const updated = result.entity as PresenceWork | undefined;
    if (!updated?.id) return;
    setEditing((current) => (current?.id === updated.id ? updated : current));
    setWorks((ws) => ws.map((w) => (w.id === updated.id ? updated : w)));
  }

  if (loading) return <Loading label="Loading works..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/works`}
        error={error ?? "Node not found."}
      />
    );
  }

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
              Selected works
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--p-studio-text)]">
              Build the proof wall
            </h2>
          </div>
          <Button size="sm" onClick={() => setEditing({ is_visible: true })}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {editing && (
          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
            <h3 className="text-sm font-semibold text-[var(--p-studio-text)]">
              {editing.id ? "Edit work" : "New work"}
            </h3>
            <Input label="Title" value={editing.title ?? ""} onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Year" value={editing.year ?? ""} onChange={(e) => setEditing((p) => ({ ...p, year: e.target.value }))} />
              <Input label="Medium" value={editing.medium ?? ""} onChange={(e) => setEditing((p) => ({ ...p, medium: e.target.value }))} />
            </div>
            {editing.id ? (
              <PresenceMediaSlot
                label="Work image"
                description="Upload the image visitors should see first for this work."
                currentUrl={editing.image_url ?? editing.thumbnail_url}
                targetType="work_image"
                nodeId={nodeId}
                token={token}
                workId={editing.id}
                aspectHint="aspect-[4/3]"
                recommendedSize="Recommended: at least 1200 px wide."
                publicVisibilityNote={node.status === "published" ? "Visible while this work is shown." : "Kept inside your private draft until publish."}
                onUploaded={syncUploadedWork}
                onCleared={syncUploadedWork}
                onManualUrlChange={(url) => setEditing((p) => ({ ...p, image_url: url, thumbnail_url: url }))}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--p-studio-border)] bg-black/10 p-4 text-xs leading-5 text-[var(--p-studio-muted)]">
                Save this work once, then add its image from the edit panel. Draft works stay private until the Presence is published.
              </div>
            )}
            <Textarea label="Description" value={editing.description ?? ""} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>Save</Button>
            </div>
          </div>
        )}

        {worksLoading && <Loading label="Loading works..." />}
        {listError && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/25 p-4 text-sm leading-6 text-red-100">
            <p className="font-semibold">Works could not be loaded</p>
            <p className="mt-1 text-xs text-red-100/80">{listError}</p>
          </div>
        )}

        {!worksLoading && !listError && works.length === 0 && (
          <Empty
            title="Add your first work"
            body="Start with one project, image, object, case study, or proof item. You can upload its image after the first save."
            action={<Button size="sm" onClick={() => setEditing({ is_visible: true })}>Add work</Button>}
          />
        )}

        {works.map((work) => (
          <div key={work.id} className="flex gap-3 p-3 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
            {(work.thumbnail_url ?? work.image_url) && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <Image src={(work.thumbnail_url ?? work.image_url)!} alt={work.title} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--p-studio-text)] truncate">{work.title}</p>
              {work.year && <p className="text-xs text-[var(--p-studio-muted)]">{work.year}</p>}
              {work.medium && <p className="text-xs text-[var(--p-studio-muted)]">{work.medium}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-1.5 text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)] transition-colors" onClick={() => void toggleVisibility(work)} title={work.is_visible ? "Hide" : "Show"}>
                {work.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button className="p-1.5 text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)] transition-colors" onClick={() => setEditing(work)} title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-red-500 hover:text-red-400 transition-colors" onClick={() => void remove(work)} title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </StudioShell>
  );
}
