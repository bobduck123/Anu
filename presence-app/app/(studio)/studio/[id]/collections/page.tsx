"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { StudioNodeGate } from "@/components/studio/StudioFallbacks";
import PresenceMediaSlot from "@/components/studio/PresenceMediaSlot";
import { Loading, Empty, Button, Input, Textarea } from "@/components/ui";
import { listCollections, createCollection, updateCollection, deleteCollection } from "@/lib/api/owner";
import type { PresenceCollection, PresenceMediaUploadResult } from "@/lib/api/types";

export default function StudioCollectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading, error, authRequired } = useOwnerNode(nodeId);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<PresenceCollection> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    setListLoading(true);
    setListError(null);
    listCollections(nodeId, token)
      .then(setCollections)
      .catch((err) => setListError(err instanceof Error ? err.message : "Collections could not be loaded."))
      .finally(() => setListLoading(false));
  }, [nodeId, token]);

  async function save() {
    if (!token || !editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await updateCollection(editing.id, editing, token);
        setCollections((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCollection(nodeId, editing, token);
        setCollections((cs) => [created, ...cs]);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(col: PresenceCollection) {
    if (!token) return;
    const updated = await updateCollection(col.id!, { is_visible: !col.is_visible }, token);
    setCollections((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function remove(col: PresenceCollection) {
    if (!token || !confirm("Delete this collection?")) return;
    await deleteCollection(col.id!, token);
    setCollections((cs) => cs.filter((c) => c.id !== col.id));
  }

  function syncUploadedCollection(result: PresenceMediaUploadResult) {
    const updated = result.entity as PresenceCollection | undefined;
    if (!updated?.id) return;
    setEditing((current) => (current?.id === updated.id ? updated : current));
    setCollections((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
  }

  if (loading) return <Loading label="Loading collections..." />;
  if (!node) {
    return (
      <StudioNodeGate
        authRequired={authRequired}
        returnTo={`/studio/${nodeId}/collections`}
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
              Bodies of work
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--p-studio-text)]">
              Organise rooms, series, and dossiers
            </h2>
          </div>
          <Button size="sm" onClick={() => setEditing({ is_visible: true })}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {editing && (
          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
            <h3 className="text-sm font-semibold text-[var(--p-studio-text)]">
              {editing.id ? "Edit collection" : "New collection"}
            </h3>
            <Input label="Title" value={editing.title ?? ""} onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))} />
            <Textarea label="Description" value={editing.description ?? ""} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
            {editing.id ? (
              <PresenceMediaSlot
                label="Collection cover"
                description="Choose the image that frames this room, series, archive, or dossier."
                currentUrl={editing.cover_image_url}
                targetType="collection_cover"
                nodeId={nodeId}
                token={token}
                collectionId={editing.id}
                aspectHint="aspect-[4/3]"
                recommendedSize="Recommended: at least 1200 px wide."
                publicVisibilityNote={node.status === "published" ? "Visible while this collection is shown." : "Kept inside your private draft until publish."}
                onUploaded={syncUploadedCollection}
                onCleared={syncUploadedCollection}
                onManualUrlChange={(url) => setEditing((p) => ({ ...p, cover_image_url: url }))}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--p-studio-border)] bg-black/10 p-4 text-xs leading-5 text-[var(--p-studio-muted)]">
                Save this collection once, then add its cover image from the edit panel. Draft collections stay private until publish.
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>Save</Button>
            </div>
          </div>
        )}

        {listLoading && <Loading label="Loading collections..." />}
        {listError && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/25 p-4 text-sm leading-6 text-red-100">
            <p className="font-semibold">Collections could not be loaded</p>
            <p className="mt-1 text-xs text-red-100/80">{listError}</p>
          </div>
        )}
        {!listLoading && !listError && collections.length === 0 && (
          <Empty
            title="Create your first collection"
            body="Group related works into a room, series, shelf, dossier, or archive path. You can add a cover after the first save."
            action={<Button size="sm" onClick={() => setEditing({ is_visible: true })}>Add collection</Button>}
          />
        )}

        {collections.map((col) => (
          <div key={col.id} className="flex gap-3 p-3 rounded-xl bg-[var(--p-studio-surface)] border border-[var(--p-studio-border)]">
            {col.cover_image_url && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <Image src={col.cover_image_url} alt={col.title} fill className="object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--p-studio-text)] truncate">{col.title}</p>
              {col.description && <p className="text-xs text-[var(--p-studio-muted)] line-clamp-2">{col.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-1.5 text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]" onClick={() => void toggleVisibility(col)} title={col.is_visible ? "Hide" : "Show"}>
                {col.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button className="p-1.5 text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]" onClick={() => setEditing(col)} title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-red-500 hover:text-red-400" onClick={() => void remove(col)} title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </StudioShell>
  );
}
