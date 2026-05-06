'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FolderOpen, Image as ImageIcon, Plus, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  getOwnerPresenceNodeCollections,
  getOwnerPresenceNodeWorks,
  getOwnerPresenceNodes,
  type PresenceCollection,
  type PresenceNode,
  type PresenceWork,
} from '@/lib/api/presence';
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

export function PresenceStudioCollectionsView() {
  const [loading, setLoading] = useState(true);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
  const [works, setWorks] = useState<PresenceWork[]>([]);
  const [error, setError] = useState<unknown>(null);

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
          description="This owner account does not have a Presence node attached yet, so there are no collections to review here."
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
              Collections studio
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Review the curated sets that frame public portfolio stories. This pass keeps the experience read-only and pilot-ready without adding editing or ordering flows yet.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AnuChip tone="accent">{node.display_name}</AnuChip>
              <AnuChip tone="muted">{labelize(node.status, 'draft')}</AnuChip>
              <AnuChip tone="muted">{labelize(node.visibility, 'public')}</AnuChip>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[#f6d4cb]/48"
            >
              <Plus className="h-4 w-4" />
              Add collection soon
            </button>
            <Link
              href={publicHref}
              className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]"
            >
              Open public page
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AnuSurfacePanel>

      {collections.length === 0 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState
            icon={FolderOpen}
            title="No collections added yet"
            description="There are no curated sets attached to this node yet. This screen will fill once collections are added in a later slice."
          />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {collections.map((collection) => {
            const workCount = collection.id ? workCountByCollectionId.get(collection.id) || 0 : 0;
            return (
              <AnuSurfacePanel key={collection.id ?? collection.title} tone="quiet" className="overflow-hidden p-4 md:p-5">
                <CollectionPreview url={collection.cover_image_url} alt={collection.title} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <AnuChip tone="accent">{collection.is_visible ? 'Visible' : 'Hidden'}</AnuChip>
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
              </AnuSurfacePanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
