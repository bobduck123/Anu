'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FolderOpen, Image as ImageIcon, Pencil, Plus, Save, UserRound, X } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  createOwnerPresenceCollection,
  getOwnerPresenceNodeCollections,
  getOwnerPresenceNodeWorks,
  getOwnerPresenceNodes,
  updateOwnerPresenceCollection,
  type PresenceCollection,
  type PresenceNode,
  type PresenceWork,
} from '@/lib/api/presence';
import { PresenceMediaUrlInput } from './PresenceMediaUrlInput';
import { describeOwnerPresenceError, getPresenceStudioPublicHref } from './presenceStudioOwnerUtils';

function labelize(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

function excerpt(value: string | null | undefined, max = 180) {
  const plain = (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}...`;
}

function CollectionPreview({ url, alt }: { url?: string | null; alt: string }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(url) && !broken;

  return showImage ? (
    <img
      src={url || undefined}
      alt={alt}
      className="h-40 w-full rounded-[1.25rem] object-cover"
      onError={() => setBroken(true)}
    />
  ) : (
    <div className="flex h-40 w-full items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] text-[#f6d4cb]/58">
      <div className="flex flex-col items-center gap-2 text-center text-sm">
        <ImageIcon className="h-5 w-5" />
        <span>No cover image</span>
      </div>
    </div>
  );
}

function emptyCollection(): Partial<PresenceCollection> {
  return {
    title: '',
    description: '',
    cover_image_url: '',
    is_visible: true,
  };
}

function CollectionForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: Partial<PresenceCollection>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: Partial<PresenceCollection>) => void;
}) {
  const [form, setForm] = useState<Partial<PresenceCollection>>(initial);

  const setField = <K extends keyof PresenceCollection>(key: K, value: PresenceCollection[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Collection editor</p>
          <h2 className="mt-2 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {initial.id ? 'Refine collection' : 'Create collection'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#f6d4cb]/70">
            Collections act as rooms, series, dossiers, shelves, or archive bodies inside the public Presence.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 text-sm text-[#f6d4cb]/82 hover:bg-white/[0.06]">
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[#f6d4cb]/78 md:col-span-2">
          Collection title
          <input value={form.title || ''} onChange={(event) => setField('title', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <div className="md:col-span-2">
          <PresenceMediaUrlInput label="Collection cover image URL" value={form.cover_image_url} onChange={(value) => setField('cover_image_url', value)} alt={`${form.title || 'Collection'} preview`} />
        </div>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78 md:col-span-2">
          Collection description
          <textarea value={form.description || ''} onChange={(event) => setField('description', event.target.value)} className="min-h-28 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="flex items-center gap-2 text-sm text-[#f6d4cb]/78">
          <input type="checkbox" checked={form.is_visible !== false} onChange={(event) => setField('is_visible', event.target.checked)} />
          Visible in public Presence
        </label>
      </div>

      <button
        type="button"
        onClick={() => onSubmit(form)}
        disabled={saving || !form.title?.trim()}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#e0b115] px-4 py-2 text-sm font-semibold text-[#1e0227] disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : initial.id ? 'Save collection' : 'Create collection'}
      </button>
    </AnuSurfacePanel>
  );
}

export function PresenceStudioCollectionsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
  const [works, setWorks] = useState<PresenceWork[]>([]);
  const [editing, setEditing] = useState<Partial<PresenceCollection> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nodes = await getOwnerPresenceNodes();
        if (!active) return;
        const primary = Array.isArray(nodes) ? nodes[0] : null;
        if (!primary) {
          setNode(null);
          setCollections([]);
          setWorks([]);
          return;
        }

        const [collectionRows, workRows] = await Promise.all([
          getOwnerPresenceNodeCollections(primary.id),
          getOwnerPresenceNodeWorks(primary.id),
        ]);
        if (!active) return;
        setNode(primary);
        setCollections(Array.isArray(collectionRows) ? collectionRows : []);
        setWorks(Array.isArray(workRows) ? workRows : []);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setCollections([]);
        setWorks([]);
        setError(loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const workCountByCollectionId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const work of works) {
      if (!work.collection_id) continue;
      counts.set(work.collection_id, (counts.get(work.collection_id) || 0) + 1);
    }
    return counts;
  }, [works]);

  const saveCollection = async (payload: Partial<PresenceCollection>) => {
    if (!node) return;
    setSaving(true);
    setMessage('');
    setError(null);
    try {
      const saved = payload.id ? await updateOwnerPresenceCollection(payload.id, payload) : await createOwnerPresenceCollection(node.id, payload);
      setCollections((rows) => {
        if (!payload.id) return [saved, ...rows];
        return rows.map((row) => (row.id === saved.id ? saved : row));
      });
      setEditing(null);
      setMessage(payload.id ? 'Collection saved.' : 'Collection created.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading collections..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Collections</p>
        <h1 className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
          {errorState.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{errorState.description}</p>
        {errorState.actionHref && errorState.actionLabel ? (
          <div className="mt-5">
            <Link
              href={errorState.actionHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-[#f6d4cb]/88 transition-colors hover:border-white/24 hover:bg-white/[0.06]"
            >
              {errorState.actionLabel}
            </Link>
          </div>
        ) : null}
      </AnuSurfacePanel>
    );
  }

  if (!node) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <EmptyState
          icon={UserRound}
          title="No Presence node available"
          description="This owner account does not have a Presence node attached yet, so there are no collections to prepare here."
        />
      </AnuSurfacePanel>
    );
  }

  const publicHref = getPresenceStudioPublicHref(node);

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Collections</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Rooms inside the public world
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Create and refine the curated sets that give selected works structure: rooms, series, dossiers, shelves, archives, or program bodies.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AnuChip tone="accent">{node.display_name}</AnuChip>
              <AnuChip tone="muted">{labelize(node.status, 'draft')}</AnuChip>
              <AnuChip tone="muted">{collections.filter((collection) => collection.is_visible !== false).length} visible collections</AnuChip>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(emptyCollection())}
              className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/22 bg-[rgba(246,212,203,0.08)] px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/34 hover:bg-[rgba(246,212,203,0.12)]"
            >
              <Plus className="h-4 w-4" />
              New collection
            </button>
            <Link
              href={publicHref}
              className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]"
            >
              Public preview
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AnuSurfacePanel>

      {message ? <p className="rounded-2xl border border-emerald-200/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

      {editing ? <CollectionForm initial={editing} saving={saving} onCancel={() => setEditing(null)} onSubmit={(payload) => void saveCollection(payload)} /> : null}

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Collection language</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {['Room', 'Series', 'Dossier', 'Archive'].map((label) => (
            <p key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-[#f6d4cb]/76">
              {label}
            </p>
          ))}
        </div>
      </AnuSurfacePanel>

      {collections.length === 0 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState
            icon={FolderOpen}
            title="No collections yet"
            description="Create the first body of work, room, series, dossier, or archive that helps visitors move through this Presence."
          />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {collections.map((collection) => {
            const workCount = collection.id ? workCountByCollectionId.get(collection.id) || 0 : 0;
            const collectionHref = collection.id ? `${publicHref}/collections/${collection.id}` : publicHref;
            return (
              <AnuSurfacePanel key={collection.id ?? collection.title} tone="quiet" className="overflow-hidden p-4 md:p-5">
                <CollectionPreview url={collection.cover_image_url} alt={collection.title} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <AnuChip tone={collection.is_visible === false ? 'muted' : 'accent'}>{collection.is_visible === false ? 'Hidden' : 'Visible'}</AnuChip>
                  <AnuChip tone="muted">{workCount} works</AnuChip>
                  {typeof collection.sort_order === 'number' ? <AnuChip tone="muted">Sort {collection.sort_order}</AnuChip> : null}
                </div>
                <h2 className="mt-4 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  {collection.title}
                </h2>
                {excerpt(collection.description) ? (
                  <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{excerpt(collection.description)}</p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.64)]">No collection description added yet.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(collection)} className="inline-flex items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm text-[#f6d4cb]/84 hover:bg-white/[0.06]">
                    <Pencil className="h-4 w-4" />
                    Refine
                  </button>
                  <Link href={collectionHref} className="inline-flex items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm text-[#f6d4cb]/84 hover:bg-white/[0.06]">
                    Public collection
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </AnuSurfacePanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
