'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, FolderOpen, Image as ImageIcon, Mail, QrCode, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  getOwnerPresenceNode,
  getOwnerPresenceNodeCollections,
  getOwnerPresenceNodeWorks,
  getOwnerPresenceNodes,
  type PresenceCollection,
  type PresenceNode,
  type PresenceWork,
} from '@/lib/api/presence';
import { describeOwnerPresenceError, getPresenceStudioPublicHref, hasRenderableRichText } from './presenceStudioOwnerUtils';
import { buildPresenceStudioReadiness, PresenceStudioReadinessCard } from './PresenceStudioReadiness';

function labelize(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

export function PresenceStudioPortfolioView() {
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
        const primary = Array.isArray(nodes) ? nodes[0] : null;
        if (!active) return;
        if (!primary) {
          setNode(null);
          setWorks([]);
          setCollections([]);
          return;
        }
        const [detail, workRows, collectionRows] = await Promise.all([
          getOwnerPresenceNode(primary.id),
          getOwnerPresenceNodeWorks(primary.id),
          getOwnerPresenceNodeCollections(primary.id),
        ]);
        if (!active) return;
        setNode(detail);
        setWorks(Array.isArray(workRows) ? workRows : []);
        setCollections(Array.isArray(collectionRows) ? collectionRows : []);
      } catch (loadError) {
        if (!active) return;
        setNode(null);
        setWorks([]);
        setCollections([]);
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

  if (loading) {
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <LoadingState message="Loading portfolio overview..." />
      </AnuSurfacePanel>
    );
  }

  if (error) {
    const errorState = describeOwnerPresenceError(error);
    return (
      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Portfolio overview</p>
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
        <EmptyState title="No Presence node available" description="Attach a Presence node to this owner account before the portfolio overview can render." />
      </AnuSurfacePanel>
    );
  }

  const publicHref = getPresenceStudioPublicHref(node);
  const statementReady = hasRenderableRichText(node.practice_statement) || hasRenderableRichText(node.curatorial_statement);
  const visibleWorks = works.filter((work) => work.is_visible !== false);
  const visibleCollections = collections.filter((collection) => collection.is_visible !== false);
  const readiness = buildPresenceStudioReadiness({ node, works, collections, publicHref });

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/68">World builder</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.5rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Shape the public world
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              This is the owner map for turning raw material into a Presence: identity, statements, selected works, collections, opportunities, physical-world bridge, and launch state.
            </p>
          </div>
          <Link href={publicHref} className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]">
            Public preview
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </AnuSurfacePanel>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">Selected node</p>
          <h2 className="mt-3 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {node.display_name}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{node.headline || 'No headline added yet.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AnuChip tone="accent">{labelize(node.status, 'draft')}</AnuChip>
            <AnuChip tone="muted">{labelize(node.display_mode, 'profile card')}</AnuChip>
            <AnuChip tone="muted">{labelize(node.plan_type, 'basic')}</AnuChip>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/60">Works</p>
              <p className="mt-2 text-2xl text-[#fff7f2]">{visibleWorks.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/60">Collections</p>
              <p className="mt-2 text-2xl text-[#fff7f2]">{visibleCollections.length}</p>
            </div>
          </div>
        </AnuSurfacePanel>

        <PresenceStudioReadinessCard summary={readiness} compact />
      </div>

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/62">World guidance</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-sm font-medium text-[#fff7f2]">Works are proof objects</p>
            <p className="mt-2 text-xs leading-5 text-[#f6d4cb]/64">Use them to show what exists, what happened, what was made, or what can be trusted.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-sm font-medium text-[#fff7f2]">Collections are rooms</p>
            <p className="mt-2 text-xs leading-5 text-[#f6d4cb]/64">Treat each collection as a series, shelf, dossier, archive, program, or body of work.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-sm font-medium text-[#fff7f2]">Statements give the world meaning</p>
            <p className="mt-2 text-xs leading-5 text-[#f6d4cb]/64">{statementReady ? 'A statement is present. Review it against the public-world doctrine before launch.' : 'Add a bio, practice statement, or curatorial statement before pilot publication.'}</p>
          </div>
        </div>
      </AnuSurfacePanel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/app/presence" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#f6d4cb]/86 hover:bg-white/[0.08]">
          <UserRound className="mb-3 h-4 w-4" />
          Edit-ready profile fields
        </Link>
        <Link href="/app/works" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#f6d4cb]/86 hover:bg-white/[0.08]">
          <ImageIcon className="mb-3 h-4 w-4" />
          Review selected works
        </Link>
        <Link href="/app/collections" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#f6d4cb]/86 hover:bg-white/[0.08]">
          <FolderOpen className="mb-3 h-4 w-4" />
          Review collections
        </Link>
        <Link href="/app/qr-nfc" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#f6d4cb]/86 hover:bg-white/[0.08]">
          <QrCode className="mb-3 h-4 w-4" />
          Share and scan tools
        </Link>
        <Link href="/app/enquiries" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#f6d4cb]/86 hover:bg-white/[0.08]">
          <Mail className="mb-3 h-4 w-4" />
          Enquiry follow-up
        </Link>
        <Link href="/app/settings" className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-[#f6d4cb]/86 hover:bg-white/[0.08]">
          <ArrowRight className="mb-3 h-4 w-4" />
          Publishing settings
        </Link>
      </div>
    </div>
  );
}
