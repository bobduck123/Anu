"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useOwnerNode } from "@/components/studio/useOwnerNode";
import StudioShell from "@/components/studio/StudioShell";
import { Loading, Empty, Button, Input, Textarea } from "@/components/ui";
import { listCollections, createCollection, updateCollection, deleteCollection } from "@/lib/api/owner";
import type { PresenceCollection } from "@/lib/api/types";

export default function StudioCollectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const nodeId = Number(id);
  const { node, token, loading } = useOwnerNode(nodeId);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PresenceCollection> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    listCollections(nodeId, token).then(setCollections).catch(console.error).finally(() => setListLoading(false));
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

  if (loading) return <Loading />;
  if (!node) return null;

  return (
    <StudioShell node={node}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--p-studio-text)]">Collections</h2>
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
            <Input label="Cover image URL" type="url" value={editing.cover_image_url ?? ""} onChange={(e) => setEditing((p) => ({ ...p, cover_image_url: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" loading={saving} onClick={() => void save()}>Save</Button>
            </div>
          </div>
        )}

        {listLoading && <Loading />}
        {!listLoading && collections.length === 0 && (
          <Empty title="No collections yet" body="Group related works into collections." />
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
              <button className="p-1.5 text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]" onClick={() => void toggleVisibility(col)}>
                {col.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button className="p-1.5 text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]" onClick={() => setEditing(col)}>✏️</button>
              <button className="p-1.5 text-red-500 hover:text-red-400" onClick={() => void remove(col)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </StudioShell>
  );
}
