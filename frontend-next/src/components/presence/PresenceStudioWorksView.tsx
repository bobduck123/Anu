'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Pencil, Plus, Save, UserRound, X } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  createOwnerPresenceWork,
  getOwnerPresenceNodeCollections,
  getOwnerPresenceNodeWorks,
  getOwnerPresenceNodes,
  updateOwnerPresenceWork,
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

function WorkPreview({ url, alt }: { url?: string | null; alt: string }) {
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
        <span>No preview image</span>
      </div>
    </div>
  );
}

function emptyWork(): Partial<PresenceWork> {
  return {
    title: '',
    year: '',
    medium: '',
    dimensions: '',
    description: '',
    image_url: '',
    thumbnail_url: '',
    availability_status: '',
    collection_id: null,
    is_visible: true,
  };
}

function WorkForm({
  collections,
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  collections: PresenceCollection[];
  initial: Partial<PresenceWork>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: Partial<PresenceWork>) => void;
}) {
  const [form, setForm] = useState<Partial<PresenceWork>>(initial);

  const setField = <K extends keyof PresenceWork>(key: K, value: PresenceWork[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Work editor</p>
          <h2 className="mt-2 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {initial.id ? 'Refine selected work' : 'Add selected work'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#f6d4cb]/70">
            Add enough detail for the public page to treat this as proof, not just an image.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-full border border-white/12 px-3 py-2 text-sm text-[#f6d4cb]/82 hover:bg-white/[0.06]">
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[#f6d4cb]/78">
          Work title
          <input value={form.title || ''} onChange={(event) => setField('title', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78">
          Collection
          <select
            value={form.collection_id ?? ''}
            onChange={(event) => setField('collection_id', event.target.value ? Number(event.target.value) : null)}
            className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">No collection yet</option>
            {collections.map((collection) => (
              <option key={collection.id || collection.title} value={collection.id}>
                {collection.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78">
          Year
          <input value={form.year || ''} onChange={(event) => setField('year', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78">
          Medium
          <input value={form.medium || ''} onChange={(event) => setField('medium', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78">
          Dimensions
          <input value={form.dimensions || ''} onChange={(event) => setField('dimensions', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78">
          Availability
          <input value={form.availability_status || ''} onChange={(event) => setField('availability_status', event.target.value)} placeholder="available, sold, commissioned" className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <div className="md:col-span-2">
          <PresenceMediaUrlInput label="Work image URL" value={form.image_url} onChange={(value) => setField('image_url', value)} alt={`${form.title || 'Work'} preview`} />
        </div>
        <label className="space-y-2 text-sm text-[#f6d4cb]/78 md:col-span-2">
          Work description
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
        {saving ? 'Saving...' : initial.id ? 'Save work' : 'Add work'}
      </button>
    </AnuSurfacePanel>
  );
}

export function PresenceStudioWorksView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [works, setWorks] = useState<PresenceWork[]>([]);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
  const [editing, setEditing] = useState<Partial<PresenceWork> | null>(null);
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
          setWorks([]);
          setCollections([]);
          return;
        }

        const [workRows, collectionRows] = await Promise.all([
          getOwnerPresenceNodeWorks(primary.id),
          getOwnerPresenceNodeCollections(primary.id),
        ]);
        if (!active) return;
        setNode(primary);
        setWorks(Array.isArray(workRows) ? workRows : []);
        setCollections(Array.isArray(collectionRows) ? collectionRows : []);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setWorks([]);
        setCollections([]);
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

  const collectionMap = useMemo(() => {
    return new Map(collections.map((collection) => [collection.id, collection.title]));
  }, [collections]);

  const saveWork = async (payload: Partial<PresenceWork>) => {
    if (!node) return;
    setSaving(true);
    setMessage('');
    setError(null);
    try {
      const saved = payload.id ? await updateOwnerPresenceWork(payload.id, payload) : await createOwnerPresenceWork(node.id, payload);
      setWorks((rows) => {
        if (!payload.id) return [saved, ...rows];
        return rows.map((row) => (row.id === saved.id ? saved : row));
      });
      setEditing(null);
      setMessage(payload.id ? 'Selected work saved.' : 'Selected work added.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading selected works..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Selected works</p>
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
          description="This owner account does not have a Presence node attached yet, so there are no works to prepare here."
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Selected works</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Proof objects for the public world
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Add and refine the works, projects, proof items, or studies that make the Presence credible. Three visible works is the pilot target.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AnuChip tone="accent">{node.display_name}</AnuChip>
              <AnuChip tone="muted">{labelize(node.status, 'draft')}</AnuChip>
              <AnuChip tone="muted">{works.filter((work) => work.is_visible !== false).length} visible works</AnuChip>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(emptyWork())}
              className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/22 bg-[rgba(246,212,203,0.08)] px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/34 hover:bg-[rgba(246,212,203,0.12)]"
            >
              <Plus className="h-4 w-4" />
              Add selected work
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

      {editing ? <WorkForm collections={collections} initial={editing} saving={saving} onCancel={() => setEditing(null)} onSubmit={(payload) => void saveWork(payload)} /> : null}

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">What makes a strong work</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-[#f6d4cb]/76">A clear image or visual proof.</p>
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-[#f6d4cb]/76">A title, year, medium, or context cue.</p>
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-[#f6d4cb]/76">A short note explaining why it belongs in this world.</p>
        </div>
      </AnuSurfacePanel>

      {works.length === 0 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState
            icon={ImageIcon}
            title="No selected works yet"
            description="Add the first work, proof item, project, or study that helps a visitor understand what this Presence carries."
          />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {works.map((work) => {
            const collectionLabel = work.collection_id ? collectionMap.get(work.collection_id) : null;
            const detail = [work.year, work.medium, work.dimensions].filter(Boolean).join(' / ');
            const workHref = work.id ? `${publicHref}/works/${work.slug || work.id}` : publicHref;
            return (
              <AnuSurfacePanel key={work.id ?? `${work.slug || work.title}-${detail}`} tone="quiet" className="overflow-hidden p-4 md:p-5">
                <WorkPreview url={work.thumbnail_url || work.image_url} alt={work.title} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <AnuChip tone={work.is_visible === false ? 'muted' : 'accent'}>{work.is_visible === false ? 'Hidden' : 'Visible'}</AnuChip>
                  {work.availability_status ? <AnuChip tone="muted">{labelize(work.availability_status, 'available')}</AnuChip> : null}
                  {collectionLabel ? <AnuChip tone="muted">{collectionLabel}</AnuChip> : null}
                </div>
                <h2 className="mt-4 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  {work.title}
                </h2>
                {detail ? <p className="mt-2 text-sm text-[#f6d4cb]/78">{detail}</p> : null}
                {excerpt(work.description) ? (
                  <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{excerpt(work.description)}</p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.64)]">No description added yet.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(work)} className="inline-flex items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm text-[#f6d4cb]/84 hover:bg-white/[0.06]">
                    <Pencil className="h-4 w-4" />
                    Refine
                  </button>
                  <Link href={workHref} className="inline-flex items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm text-[#f6d4cb]/84 hover:bg-white/[0.06]">
                    Public detail
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
