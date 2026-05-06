'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Plus, UserRound } from 'lucide-react';
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

export function PresenceStudioWorksView() {
  const [loading, setLoading] = useState(true);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [works, setWorks] = useState<PresenceWork[]>([]);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
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

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading works..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Works library</p>
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
          description="This owner account does not have a Presence node attached yet, so there are no works to review here."
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
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Works</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Works library
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Review and prepare individual works for the public portfolio surface. This pass stays read-only, focused on pilot-ready review from a phone-sized owner console.
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
              Add work soon
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

      {works.length === 0 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState
            icon={ImageIcon}
            title="No works added yet"
            description="The node is ready, but there are no individual works in the library yet. This screen will fill once works are added in a later slice."
          />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {works.map((work) => {
            const collectionLabel = work.collection_id ? collectionMap.get(work.collection_id) : null;
            const detail = [work.year, work.medium, work.dimensions].filter(Boolean).join(' · ');
            return (
              <AnuSurfacePanel key={work.id ?? `${work.slug || work.title}-${detail}`} tone="quiet" className="overflow-hidden p-4 md:p-5">
                <WorkPreview url={work.thumbnail_url || work.image_url} alt={work.title} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <AnuChip tone="accent">{work.is_visible ? 'Visible' : 'Hidden'}</AnuChip>
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
              </AnuSurfacePanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
