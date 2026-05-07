'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, ImageIcon, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { getOwnerPresenceNode, getOwnerPresenceNodes, updateOwnerPresenceNode, type PresenceNode, type PresenceNodeInput } from '@/lib/api/presence';
import { PresenceMediaUrlInput } from './PresenceMediaUrlInput';
import { describeOwnerPresenceError, getPresenceStudioPublicHref, hasRenderableRichText } from './presenceStudioOwnerUtils';

function labelize(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

function RichTextPanel({ label, value, emptyLabel = 'Not added yet.' }: { label: string; value?: string | null; emptyLabel?: string }) {
  const hasValue = hasRenderableRichText(value);

  return (
    <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">{label}</p>
      {hasValue ? (
        <div
          className="mt-4 space-y-3 text-sm leading-7 text-[color:rgba(246,212,203,0.9)] [&_p:not(:first-child)]:mt-3 [&_ul]:ml-5 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: value ?? '' }}
        />
      ) : (
        <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.72)]">{emptyLabel}</p>
      )}
    </AnuSurfacePanel>
  );
}

function ImagePanel({ label, url, alt }: { label: string; url?: string | null; alt: string }) {
  return (
    <AnuSurfacePanel tone="quiet" className="p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">{label}</p>
      {url ? (
        <>
          <img src={url} alt={alt} className="mt-3 h-40 w-full rounded-[1.35rem] object-cover" />
          <p className="mt-3 break-all text-xs leading-5 text-[#f6d4cb]/68">{url}</p>
        </>
      ) : (
        <div className="mt-3 flex min-h-[10rem] items-center justify-center rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.03] text-[#f6d4cb]/58">
          <div className="flex flex-col items-center gap-2 text-center text-sm">
            <ImageIcon className="h-5 w-5" />
            <span>No image added yet.</span>
          </div>
        </div>
      )}
    </AnuSurfacePanel>
  );
}

export function PresenceStudioPresenceView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [draft, setDraft] = useState<PresenceNodeInput>({});
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
          return;
        }
        const detail = await getOwnerPresenceNode(primary.id);
        if (!active) return;
        setNode(detail);
        setDraft({
          display_name: detail.display_name,
          headline: detail.headline,
          bio: detail.bio,
          visual_mood: detail.visual_mood,
          profile_image_url: detail.profile_image_url,
          cover_image_url: detail.cover_image_url,
          practice_statement: detail.practice_statement,
          curatorial_statement: detail.curatorial_statement,
        });
      } catch (loadError) {
        if (!active) return;
        setNode(null);
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

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading Presence profile..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Presence owner view</p>
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
          description="This owner account does not have a Presence profile to show yet. When a node is attached, the profile summary will appear here."
        />
      </AnuSurfacePanel>
    );
  }

  const publicHref = getPresenceStudioPublicHref(node);
  const dirty = JSON.stringify({
    display_name: node.display_name,
    headline: node.headline,
    bio: node.bio,
    visual_mood: node.visual_mood,
    profile_image_url: node.profile_image_url,
    cover_image_url: node.cover_image_url,
    practice_statement: node.practice_statement,
    curatorial_statement: node.curatorial_statement,
  }) !== JSON.stringify(draft);

  const updateDraft = (key: keyof PresenceNodeInput, value: PresenceNodeInput[keyof PresenceNodeInput]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError(null);
    try {
      const updated = await updateOwnerPresenceNode(node.id, draft);
      setNode(updated);
      setDraft({
        display_name: updated.display_name,
        headline: updated.headline,
        bio: updated.bio,
        visual_mood: updated.visual_mood,
        profile_image_url: updated.profile_image_url,
        cover_image_url: updated.cover_image_url,
        practice_statement: updated.practice_statement,
        curatorial_statement: updated.curatorial_statement,
      });
      setMessage('Presence profile saved.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">Public identity</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {node.display_name}
            </h1>
            {node.headline ? (
              <p className="mt-2 max-w-2xl text-lg leading-7 text-[#fff7f2]/88 md:text-xl">
                {node.headline}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Shape the name, headline, images, bio, and statements that make this Presence publicly understandable.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AnuChip tone="accent">{labelize(node.status, 'draft')}</AnuChip>
              <AnuChip tone="muted">{labelize(node.visibility, 'public')}</AnuChip>
              <AnuChip tone="muted">{labelize(node.display_mode, 'profile card')}</AnuChip>
              <AnuChip tone="muted">{labelize(node.plan_type, 'basic')}</AnuChip>
            </div>
          </div>

          <Link
            href={publicHref}
            className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]"
          >
            Public preview
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </AnuSurfacePanel>

      {message ? <p className="rounded-2xl border border-emerald-200/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Profile summary</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/60">Display mode</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.display_mode, 'profile card')}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/60">Visibility</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.visibility, 'public')}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/60">Status</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(node.status, 'draft')}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/60">Public route</p>
                <p className="mt-2 break-all text-sm text-[#fff7f2]">{publicHref}</p>
              </div>
            </div>
          </AnuSurfacePanel>

          <RichTextPanel label="Bio" value={node.bio} emptyLabel="No bio has been added yet." />
        </div>

        <div className="space-y-4">
          <ImagePanel label="Cover image" url={node.cover_image_url} alt={`${node.display_name} cover`} />
          <ImagePanel label="Profile image" url={node.profile_image_url} alt={`${node.display_name} profile`} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RichTextPanel label="Practice statement" value={node.practice_statement} emptyLabel="No practice statement has been added yet." />
        <RichTextPanel label="Curatorial statement" value={node.curatorial_statement} emptyLabel="No curatorial statement has been added yet." />
      </div>

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Shape public identity</p>
              <p className="mt-2 text-sm leading-6 text-[#f6d4cb]/70">
                These owner-safe fields update the public Presence. Use hosted image URLs for alpha media.
              </p>
            </div>
            <AnuChip tone={dirty ? 'accent' : 'muted'}>{dirty ? 'Unsaved changes' : 'Saved state'}</AnuChip>
          </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-[#f6d4cb]/78">
            Display name
            <input value={draft.display_name || ''} onChange={(event) => updateDraft('display_name', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-[#f6d4cb]/78">
            Headline
            <input value={draft.headline || ''} onChange={(event) => updateDraft('headline', event.target.value)} className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <PresenceMediaUrlInput label="Profile image URL" value={draft.profile_image_url} onChange={(value) => updateDraft('profile_image_url', value)} alt={`${draft.display_name || node.display_name} profile preview`} />
          <PresenceMediaUrlInput label="Cover image URL" value={draft.cover_image_url} onChange={(value) => updateDraft('cover_image_url', value)} alt={`${draft.display_name || node.display_name} cover preview`} />
          <label className="space-y-2 text-sm text-[#f6d4cb]/78 md:col-span-2">
            Bio
            <textarea value={draft.bio || ''} onChange={(event) => updateDraft('bio', event.target.value)} className="min-h-28 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-[#f6d4cb]/78">
            Practice statement
            <textarea value={draft.practice_statement || ''} onChange={(event) => updateDraft('practice_statement', event.target.value)} className="min-h-28 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 text-sm text-[#f6d4cb]/78">
            Curatorial statement
            <textarea value={draft.curatorial_statement || ''} onChange={(event) => updateDraft('curatorial_statement', event.target.value)} className="min-h-28 w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white outline-none" />
          </label>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving || !dirty} className="mt-5 rounded-md bg-[#e0b115] px-4 py-2 text-sm font-semibold text-[#1e0227] disabled:opacity-60">
          {saving ? 'Saving...' : 'Save public identity'}
        </button>
      </AnuSurfacePanel>
    </div>
  );
}
