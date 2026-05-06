'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Sparkles, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { getOwnerPresenceNodes, type PresenceNode } from '@/lib/api/presence';
import { presenceStudioWorkspaceRoutes } from './presenceStudioRoutes';
import { describeOwnerPresenceError, getPresenceStudioPublicHref } from './presenceStudioOwnerUtils';

function labelize(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value.replace(/_/g, ' ') : fallback;
}

function StudioQuickLinks({ publicHref }: { publicHref?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {presenceStudioWorkspaceRoutes.map((route) => {
        const Icon = route.icon;
        return (
          <Link
            key={route.href}
            href={route.href}
            className="group rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f6d4cb]">
                <Icon className="h-4 w-4" />
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-[#f6d4cb]/50 transition-transform group-hover:translate-x-0.5 group-hover:text-[#f6d4cb]/80" />
            </div>
            <h2 className="mt-4 text-lg text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {route.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{route.summary}</p>
          </Link>
        );
      })}

      {publicHref ? (
        <Link
          href={publicHref}
          className="group rounded-[1.5rem] border border-[#f6d4cb]/14 bg-[rgba(246,212,203,0.06)] p-4 transition-colors hover:border-[#f6d4cb]/28 hover:bg-[rgba(246,212,203,0.1)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f6d4cb]">
              <ExternalLink className="h-4 w-4" />
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-[#f6d4cb]/50 transition-transform group-hover:translate-x-0.5 group-hover:text-[#f6d4cb]/80" />
          </div>
          <h2 className="mt-4 text-lg text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Open the public studio
          </h2>
          <p className="mt-2 break-all text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{publicHref}</p>
        </Link>
      ) : null}
    </div>
  );
}

export function PresenceStudioDashboard() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<PresenceNode[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getOwnerPresenceNodes();
        if (!active) return;
        setNodes(Array.isArray(rows) ? rows : []);
      } catch (loadError) {
        if (!active) return;
        setNodes([]);
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

  const primaryNode = nodes[0] ?? null;
  const publicHref = primaryNode ? getPresenceStudioPublicHref(primaryNode) : '';
  const errorState = error ? describeOwnerPresenceError(error) : null;

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f6d4cb]/68">Your studio</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.6rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Presence Studio
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              The private workroom behind your public presence. Shape what visitors see, prepare new works and gatherings, and tend to the people who reach out.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <AnuChip tone="accent" icon={Sparkles}>Portfolio-led</AnuChip>
            <AnuChip tone="muted">Owner-only</AnuChip>
          </div>
        </div>
      </AnuSurfacePanel>

      {loading ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <LoadingState message="Opening your studio…" />
        </AnuSurfacePanel>
      ) : errorState ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#f6d4cb]/64">Studio access</p>
          <h2 className="mt-3 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            {errorState.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">{errorState.description}</p>
          {errorState.actionHref && errorState.actionLabel ? (
            <div className="mt-5">
              <Link
                href={errorState.actionHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-[#f6d4cb]/88 transition-colors hover:border-white/24 hover:bg-white/[0.06]"
              >
                {errorState.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </AnuSurfacePanel>
      ) : !primaryNode ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <EmptyState
            icon={UserRound}
            title="Your studio is waiting"
            description="No public presence is attached to this account yet. As soon as one is, this room becomes its private workspace — for shaping identity, works, gatherings, and conversations."
          />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f6d4cb]/64">This presence</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                  {primaryNode.display_name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
                  {primaryNode.headline?.trim() || 'A headline gives the first sense of who you are. Add one whenever it feels right.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <AnuChip tone="accent">{labelize(primaryNode.status, 'draft')}</AnuChip>
                  <AnuChip tone="muted">{labelize(primaryNode.visibility, 'public')}</AnuChip>
                  <AnuChip tone="muted">{labelize(primaryNode.display_mode, 'profile card')}</AnuChip>
                  <AnuChip tone="muted">{labelize(primaryNode.plan_type, 'basic')}</AnuChip>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/app/presence"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-[#f6d4cb]/88 transition-colors hover:border-white/24 hover:bg-white/[0.06]"
                >
                  Shape this presence
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={publicHref}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]"
                >
                  View as visitors do
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">Public address</p>
                <p className="mt-2 text-sm text-[#fff7f2]">/{primaryNode.slug}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">Living URL</p>
                <p className="mt-2 break-all text-sm text-[#fff7f2]">{publicHref}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">Template</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(primaryNode.display_mode, 'profile card')}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">Tier</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(primaryNode.plan_type, 'basic')}</p>
              </div>
            </div>
          </AnuSurfacePanel>

          {nodes.length > 1 ? (
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Also accessible</p>
              <div className="mt-4 space-y-3">
                {nodes.slice(1).map((node) => (
                  <div key={node.id} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <p className="text-sm font-medium text-[#fff7f2]">{node.display_name}</p>
                    <p className="mt-1 text-xs text-[#f6d4cb]/72">/{node.slug}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AnuChip tone="muted">{labelize(node.status, 'draft')}</AnuChip>
                      <AnuChip tone="muted">{labelize(node.visibility, 'public')}</AnuChip>
                    </div>
                  </div>
                ))}
              </div>
            </AnuSurfacePanel>
          ) : null}
        </div>
      )}

      <StudioQuickLinks publicHref={publicHref || undefined} />

      <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Launch posture</p>
        <h2 className="mt-3 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
          Public website as output surface, app console as operating base.
        </h2>
        <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
          The studio now links the owner workflow into portfolio, works, collections, enquiries, scan tools, analytics, and publishing settings without relying on the staff control plane.
        </p>
      </AnuSurfacePanel>
    </div>
  );
}
