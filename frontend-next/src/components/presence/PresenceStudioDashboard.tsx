'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Image as ImageIcon, Inbox, QrCode, Sparkles, UserRound } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { EmptyState } from '@/ui-system/states/EmptyState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  getOwnerPresenceNode,
  getOwnerPresenceNodeAnalytics,
  getOwnerPresenceNodeCollections,
  getOwnerPresenceNodeEnquiries,
  getOwnerPresenceNodeWorks,
  getOwnerPresenceNodes,
  type PresenceAnalyticsSummary,
  type PresenceCollection,
  type PresenceEnquiry,
  type PresenceNode,
  type PresenceWork,
} from '@/lib/api/presence';
import { presenceStudioWorkspaceRoutes } from './presenceStudioRoutes';
import { describeOwnerPresenceError, getPresenceStudioPublicHref } from './presenceStudioOwnerUtils';
import { buildPresenceStudioReadiness, PresenceStudioReadinessCard } from './PresenceStudioReadiness';

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
            Public preview
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
  const [primaryNode, setPrimaryNode] = useState<PresenceNode | null>(null);
  const [works, setWorks] = useState<PresenceWork[]>([]);
  const [collections, setCollections] = useState<PresenceCollection[]>([]);
  const [enquiries, setEnquiries] = useState<PresenceEnquiry[]>([]);
  const [analytics, setAnalytics] = useState<PresenceAnalyticsSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getOwnerPresenceNodes();
        if (!active) return;
        const safeRows = Array.isArray(rows) ? rows : [];
        setNodes(safeRows);
        const primary = safeRows[0] || null;
        if (!primary) {
          setPrimaryNode(null);
          setWorks([]);
          setCollections([]);
          setEnquiries([]);
          setAnalytics(null);
          return;
        }

        const [detail, workRows, collectionRows, enquiryRows, analyticsSummary] = await Promise.all([
          getOwnerPresenceNode(primary.id),
          getOwnerPresenceNodeWorks(primary.id),
          getOwnerPresenceNodeCollections(primary.id),
          getOwnerPresenceNodeEnquiries(primary.id),
          getOwnerPresenceNodeAnalytics(primary.id),
        ]);
        if (!active) return;
        setPrimaryNode(detail);
        setWorks(Array.isArray(workRows) ? workRows : []);
        setCollections(Array.isArray(collectionRows) ? collectionRows : []);
        setEnquiries(Array.isArray(enquiryRows) ? enquiryRows : []);
        setAnalytics(analyticsSummary);
      } catch (loadError) {
        if (!active) return;
        setNodes([]);
        setPrimaryNode(null);
        setWorks([]);
        setCollections([]);
        setEnquiries([]);
        setAnalytics(null);
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

  const publicHref = primaryNode ? getPresenceStudioPublicHref(primaryNode) : '';
  const errorState = error ? describeOwnerPresenceError(error) : null;
  const readiness = primaryNode ? buildPresenceStudioReadiness({ node: primaryNode, works, collections, publicHref }) : null;
  const visibleWorks = works.filter((work) => work.is_visible !== false);
  const visibleCollections = collections.filter((collection) => collection.is_visible !== false);
  const nextActions = readiness?.missing.slice(0, 3) || [];
  const recentEnquiries = enquiries.slice(0, 3);

  return (
    <div className="space-y-4">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f6d4cb]/68">Presence Studio</p>
            <h1 className="mt-3 text-3xl text-[#fff7f2] md:text-[2.6rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Prepare your public world
            </h1>
            <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.86)] md:text-base">
              The private workroom behind your public Presence. Shape identity, selected works, collections, enquiries, QR/NFC surfaces, and the launch state visitors will experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <AnuChip tone="accent" icon={Sparkles}>Public world</AnuChip>
            <AnuChip tone="muted">Owner-only Studio</AnuChip>
          </div>
        </div>
      </AnuSurfacePanel>

      {loading ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <LoadingState message="Opening your Presence Studio..." />
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
            description="No public Presence is attached to this account yet. As soon as one is, this room becomes its private workspace for shaping identity, selected works, collections, opportunities, and launch readiness."
          />
        </AnuSurfacePanel>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#f6d4cb]/64">This Presence</p>
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
                  Shape this Presence
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={publicHref}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f6d4cb]/18 px-4 py-2 text-sm text-[#fff7f2] transition-colors hover:border-[#f6d4cb]/30 hover:bg-[rgba(246,212,203,0.08)]"
                >
                  Public preview
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
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">Published output</p>
                <p className="mt-2 break-all text-sm text-[#fff7f2]">{publicHref}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">World mode</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(primaryNode.display_mode, 'profile card')}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/60">Tier</p>
                <p className="mt-2 text-sm text-[#fff7f2]">{labelize(primaryNode.plan_type, 'basic')}</p>
              </div>
            </div>
          </AnuSurfacePanel>

          {readiness ? (
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Next actions</p>
              <h2 className="mt-3 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                {nextActions.length ? 'Strengthen these before launch' : 'Ready for final human review'}
              </h2>
              <div className="mt-4 space-y-3">
                {(nextActions.length ? nextActions : readiness.items.filter((item) => item.ready).slice(0, 3)).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                    <p className="text-sm font-medium text-[#fff7f2]">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#f6d4cb]/64">{item.description}</p>
                    {item.actionHref && item.actionLabel ? (
                      <Link href={item.actionHref} className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#f6d4cb] hover:text-white">
                        {item.actionLabel}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </AnuSurfacePanel>
          ) : null}
        </div>
      )}

      {primaryNode && readiness ? (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <PresenceStudioReadinessCard summary={readiness} compact />

          <div className="grid gap-4 sm:grid-cols-2">
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <ImageIcon className="h-4 w-4 text-[#f6d4cb]/70" />
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/56">Public proof</p>
              <p className="mt-2 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>{visibleWorks.length}</p>
              <p className="mt-1 text-sm leading-6 text-[#f6d4cb]/72">visible works, with {visibleCollections.length} bodies of work.</p>
            </AnuSurfacePanel>
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <Inbox className="h-4 w-4 text-[#f6d4cb]/70" />
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/56">Opportunities</p>
              <p className="mt-2 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>{enquiries.length}</p>
              <p className="mt-1 text-sm leading-6 text-[#f6d4cb]/72">owner-safe enquiries available for follow-up.</p>
            </AnuSurfacePanel>
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <QrCode className="h-4 w-4 text-[#f6d4cb]/70" />
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/56">Physical bridge</p>
              <p className="mt-2 text-2xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>{analytics?.top_sources?.length || 0}</p>
              <p className="mt-1 text-sm leading-6 text-[#f6d4cb]/72">QR/NFC source signals recorded.</p>
            </AnuSurfacePanel>
            <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
              <ExternalLink className="h-4 w-4 text-[#f6d4cb]/70" />
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#f6d4cb]/56">Public preview</p>
              <Link href={publicHref} className="mt-2 block break-all text-sm leading-6 text-[#fff7f2] hover:text-[#f6d4cb]">
                {publicHref}
              </Link>
            </AnuSurfacePanel>
          </div>
        </div>
      ) : null}

      {primaryNode ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Recent opportunities</p>
              <h2 className="mt-3 text-xl text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                {recentEnquiries.length ? 'People beginning a conversation' : 'No enquiries yet'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#f6d4cb]/72">
                Presence treats enquiries as possible relationships, commissions, visits, referrals, or support routes.
              </p>
            </div>
            <Link href="/app/enquiries" className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-[#f6d4cb]/88 transition-colors hover:border-white/24 hover:bg-white/[0.06]">
              Open enquiries
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recentEnquiries.length ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {recentEnquiries.map((enquiry) => (
                <div key={enquiry.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-sm font-medium text-[#fff7f2]">{enquiry.name}</p>
                  <p className="mt-1 text-xs text-[#f6d4cb]/62">{labelize(enquiry.enquiry_type, 'general')} / {labelize(enquiry.status, 'new')}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#f6d4cb]/70">{enquiry.message || 'No message provided.'}</p>
                </div>
              ))}
            </div>
          ) : null}
        </AnuSurfacePanel>
      ) : null}

      <StudioQuickLinks publicHref={publicHref || undefined} />

      {nodes.length > 1 ? (
        <AnuSurfacePanel tone="quiet" className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/64">Also accessible</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
  );
}
