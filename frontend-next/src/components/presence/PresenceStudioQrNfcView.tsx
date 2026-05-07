'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, RadioTower, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  createOwnerPresenceNfcTag,
  getOwnerPresenceNodeNfcTags,
  getOwnerPresenceNodes,
  presencePublicApiPath,
  type PresenceNfcTag,
  type PresenceNode,
} from '@/lib/api/presence';
import { PresenceCopyUrlButton, PresenceShareButton, PresenceVCardButton } from './PresenceActions';
import { describeOwnerPresenceError, getPresenceStudioPublicHref } from './presenceStudioOwnerUtils';

function labelize(value: string | null | undefined, fallback = 'not provided') {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

const PHYSICAL_USE_CASES = [
  'exhibition card',
  'studio wall',
  'business card',
  'event badge',
  'venue entrance',
  'flyer/poster',
  'artwork label',
];

export function PresenceStudioQrNfcView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [node, setNode] = useState<PresenceNode | null>(null);
  const [tags, setTags] = useState<PresenceNfcTag[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const [label, setLabel] = useState('');
  const [sourceCode, setSourceCode] = useState('');

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
          setTags([]);
          return;
        }
        const rows = await getOwnerPresenceNodeNfcTags(primary.id);
        if (!active) return;
        setNode(primary);
        setTags(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setTags([]);
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

  const publicHref = node ? getPresenceStudioPublicHref(node) : '';
  const qrSrc = useMemo(() => (node ? presencePublicApiPath(node.slug, '/qr') : ''), [node]);

  const createTag = async () => {
    if (!node) return;
    const cleanLabel = label.trim();
    const cleanSource = sourceCode.trim();
    if (!cleanLabel || !cleanSource) {
      setMessage('Add both a label and source code.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const tag = await createOwnerPresenceNfcTag(node.id, {
        label: cleanLabel,
        source_code: cleanSource,
        tag_type: 'business_card',
        destination_url: `${publicHref}?nfc=${encodeURIComponent(cleanSource)}`,
        is_active: true,
      });
      setTags((rows) => [tag, ...rows]);
      setLabel('');
      setSourceCode('');
      setMessage('NFC/source tag created.');
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading QR and NFC tools..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">QR and NFC</p>
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
        <EmptyState icon={UserRound} title="No Presence node available" description="Attach a Presence node before QR and NFC source tools can render." />
      </AnuSurfacePanel>
    );
  }

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">QR / NFC</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Physical-world bridge
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              Turn cards, labels, room entrances, event materials, and NFC tags into public-world entry points. Source codes track anonymous scan context without creating named contacts.
            </p>
          </div>
          <a href={publicHref} className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]">
            Public page
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </AnuSurfacePanel>

      {message ? <p className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-[#f6d4cb]/82">{message}</p> : null}

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Where this gets used</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PHYSICAL_USE_CASES.map((item) => (
            <AnuChip key={item} tone="muted">{item}</AnuChip>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-[#f6d4cb]/70">
          A custom QR or NFC tag can point to the whole Presence, a specific work, a collection, or an enquiry route. Hardware writing remains outside alpha; the Studio prepares the destination and source code.
        </p>
      </AnuSurfacePanel>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Canonical URL</p>
          <p className="mt-3 break-all text-sm leading-6 text-[#fff7f2]">{publicHref}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PresenceCopyUrlButton publicUrl={publicHref} />
            <PresenceShareButton slug={node.slug} displayName={node.display_name} publicUrl={publicHref} />
            <PresenceVCardButton slug={node.slug} />
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white p-3">
            <img src={qrSrc} alt={`Scanner-grade QR for ${publicHref}`} className="mx-auto h-56 w-56" />
          </div>
        </AnuSurfacePanel>

        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Create source tag</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-[#f6d4cb]/76">
              Label
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Gallery opening card" className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white" />
            </label>
            <label className="space-y-2 text-sm text-[#f6d4cb]/76">
              Source code
              <input value={sourceCode} onChange={(event) => setSourceCode(event.target.value)} placeholder="gallery-opening-card" className="w-full rounded-md border border-white/14 bg-[#1e0227]/70 px-3 py-2 text-sm text-white" />
            </label>
          </div>
          <button type="button" onClick={() => void createTag()} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#e0b115] px-4 py-2 text-sm font-semibold text-[#1e0227] disabled:opacity-60">
            <Plus className="h-4 w-4" />
            {saving ? 'Creating...' : 'Create source tag'}
          </button>
          <p className="mt-3 text-xs leading-5 text-[#f6d4cb]/58">
            This creates a source record for links such as `/p/{node.slug}?nfc=source-code`. Anonymous scans stay anonymous; named contacts only begin after a submitted enquiry or manual owner/admin entry.
          </p>
        </AnuSurfacePanel>
      </div>

      {tags.length === 0 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState icon={RadioTower} title="No NFC/source tags yet" description="Create tags for cards, labels, signs, or venue surfaces when you are ready to track real-world entry points." />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tags.map((tag) => (
            <AnuSurfacePanel key={tag.id || tag.source_code} tone="quiet" className="p-5 md:p-6">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone={tag.is_active === false ? 'muted' : 'accent'}>{tag.is_active === false ? 'Inactive' : 'Active'}</AnuChip>
                <AnuChip tone="muted">{labelize(tag.tag_type, 'custom')}</AnuChip>
              </div>
              <h2 className="mt-4 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                {tag.label}
              </h2>
              <p className="mt-2 text-sm text-[#f6d4cb]/74">Source: {tag.source_code}</p>
              <p className="mt-3 break-all text-xs leading-5 text-[#f6d4cb]/52">{tag.destination_url || `${publicHref}?nfc=${encodeURIComponent(tag.source_code)}`}</p>
            </AnuSurfacePanel>
          ))}
        </div>
      )}
    </div>
  );
}
