'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Archive, ExternalLink, PauseCircle, PlayCircle, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  getOwnerPresenceNode,
  getOwnerPresenceNodes,
  publishOwnerPresenceNode,
  unpublishOwnerPresenceNode,
  type PresenceNode,
} from '@/lib/api/presence';
import { describeOwnerPresenceError, getPresenceStudioPublicHref } from './presenceStudioOwnerUtils';

function labelize(value: string | null | undefined, fallback = 'not set') {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

function Flag({ enabled, label }: { enabled?: boolean; label: string }) {
  return (
    <span className={`rounded-md border px-3 py-1.5 text-sm ${enabled ? 'border-emerald-200/24 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-[#f6d4cb]/58'}`}>
      {label}: {enabled ? 'yes' : 'no'}
    </span>
  );
}

export function PresenceStudioSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nodes = await getOwnerPresenceNodes();
        const primary = Array.isArray(nodes) ? nodes[0] : null;
        if (!active) return;
        if (!primary) {
          setNode(null);
          return;
        }
        const detail = await getOwnerPresenceNode(primary.id);
        if (!active) return;
        setNode(detail);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setError(loadError);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const publishToggle = async () => {
    if (!node) return;
    setSaving(true);
    setMessage('');
    setError(null);
    try {
      const updated = node.status === 'published' ? await unpublishOwnerPresenceNode(node.id) : await publishOwnerPresenceNode(node.id);
      setNode(updated);
      setMessage(updated.status === 'published' ? 'Node published.' : 'Node unpublished.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading settings..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Settings</p>
        <h1 className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
          {errorState.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{errorState.description}</p>
      </AnuSurfacePanel>
    );
  }

  if (!node) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <EmptyState icon={UserRound} title="No Presence node available" description="Attach a Presence node before owner settings can render." />
      </AnuSurfacePanel>
    );
  }

  const publicHref = getPresenceStudioPublicHref(node);

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Settings</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Publishing state
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Owner-safe settings for visibility, display mode, template, readiness flags, and public route handling.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnuChip tone="accent">{labelize(node.status, 'draft')}</AnuChip>
            <AnuChip tone="muted">{labelize(node.visibility, 'public')}</AnuChip>
          </div>
        </div>
      </AnuSurfacePanel>

      {message ? <p className="rounded-2xl border border-emerald-200/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Node settings</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/54">Status</p>
              <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.status)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/54">Visibility</p>
              <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.visibility)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/54">Display mode</p>
              <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.display_mode)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/54">Plan</p>
              <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.plan_type)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/54">Template</p>
              <p className="mt-2 text-sm text-[#fff7f2]">{node.template?.name || node.template_id || 'No template assigned'}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f6d4cb]/54">Public URL</p>
              <p className="mt-2 break-all text-sm text-[#fff7f2]">{publicHref}</p>
            </div>
          </div>
        </AnuSurfacePanel>

        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Publishing action</p>
          <h2 className="mt-3 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {node.status === 'published' ? 'Public page is live' : 'Public page is not live'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#f6d4cb]/72">
            Published public or unlisted nodes are available at `/p/{node.slug}`. Draft, unpublished, private, suspended, and archived nodes remain hidden from public routes.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => void publishToggle()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[#e0b115] px-4 py-2 text-sm font-semibold text-[#1e0227] disabled:opacity-60">
              {node.status === 'published' ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              {saving ? 'Saving...' : node.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
            <Link href={publicHref} className="inline-flex items-center gap-2 rounded-md border border-white/14 px-4 py-2 text-sm text-[#f6d4cb]/84 hover:bg-white/[0.06]">
              View page
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </AnuSurfacePanel>
      </div>

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Network readiness</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Flag enabled={node.directory_ready} label="Directory" />
          <Flag enabled={node.map_ready} label="Map" />
          <Flag enabled={node.archive_ready} label="Archive" />
          <Flag enabled={node.marketplace_ready} label="Marketplace" />
          <Flag enabled={node.white_label_ready} label="White-label" />
        </div>
      </AnuSurfacePanel>

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="flex items-center gap-2 text-sm leading-6 text-[#f6d4cb]/62">
          <Archive className="h-4 w-4" />
          Danger-zone actions are intentionally not exposed in the owner console alpha. Suspension, archive, tenant moves, and deletion remain control-plane actions.
        </p>
      </AnuSurfacePanel>
    </div>
  );
}
