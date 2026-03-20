'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/lib/featureFlags';
import {
  generateMockPosts,
  sortPosts,
  type CommunityPost,
  type SortMode,
} from '@/data/adapters/communityAdapter';
import { FalakMapViewer } from '@/components/maps/FalakMapViewer';
import { buildCommunityUniversePacket } from '@/components/maps/communityUniverseAdapter';
import { universePresentationTerms } from '@/components/maps/universe/presentationTerms';
import type { UniversePacket } from '@/components/maps/universe/types';
import {
  loadCommunityUniverseData,
  type CommunityTrustedNewsMeta,
} from '@/lib/community/loadCommunityUniverse';
import { DraggableGallery } from '@/ui/patterns/draggable-gallery';
import CommunityComposerModal from './CommunityComposerModal';

export const forceDynamic = 'force-dynamic';

const CommunityLegacy = dynamic(() => import('./CommunityLegacy'), { ssr: false });

function CommunityPageFallback() {
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 z-[11] flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-black/65 p-8 text-white shadow-2xl backdrop-blur-xl">
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">Loading</p>
          <h1 className="mb-4 text-3xl font-semibold">Preparing the community feed</h1>
          <p className="text-sm leading-relaxed text-white/70">
            The floating community surface is loading your route state and public feed sources.
          </p>
        </div>
      </div>
    </div>
  );
}

function CommunityUniversePanel({
  packet,
  loadError,
}: {
  packet: UniversePacket;
  loadError: string | null;
}) {
  return (
    <FalakMapViewer
      packet={packet}
      eyebrowLabel={packet.fallbackState?.active ? 'Deterministic community packet' : 'Live community packet'}
      titlePrefix="Community"
      showAdminLink={false}
      headerActions={
        <div className="space-y-2 text-xs text-slate-200">
          <div
            className={`inline-flex items-center rounded-xl px-3 py-1.5 ${
              packet.fallbackState?.active
                ? 'border border-amber-300/25 bg-amber-300/10 text-amber-100'
                : 'border border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
            }`}
          >
            {packet.fallbackState?.label ?? 'Live community universe'}
          </div>
          <p className="max-w-3xl leading-5 text-slate-300">
            {packet.fallbackState?.active
              ? loadError
                ? `Live community sources are unavailable, so this surface is rendering a deterministic local ${universePresentationTerms.readOnlyPacket} through the shared viewer, scene, and ${universePresentationTerms.explainer.toLowerCase()} path.`
                : 'No public community posts are published yet. This local packet keeps the community universe alive while seeding and live publishing continue.'
              : 'This surface is rendering current stories, trusted news, and community traces through the shared viewer, scene, and explainer path so public participation remains legible as part of the wider ANU universe.'}
          </p>
        </div>
      }
      footerActions={
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-xl border border-slate-700 px-3 py-1">
            {packet.fallbackState?.active
              ? 'Community fallback: deterministic demo packet'
              : packet.packetMeta?.sourceSummary ?? 'Live community packet'}
          </span>
          <span className="rounded-xl border border-slate-700 px-3 py-1">Shared scene and explainer path: enabled</span>
        </div>
      }
    />
  );
}

function CommunityPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const galleryEnabled = useFeatureFlag('draggableCommunityGallery');

  const [sortMode, setSortMode] = useState<SortMode>('new');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [showCommunityUniverse, setShowCommunityUniverse] = useState(false);
  const [trustedNewsMeta, setTrustedNewsMeta] = useState<CommunityTrustedNewsMeta>({
    count: 0,
    stale: false,
    sourceNames: [],
  });

  const latestPostsRef = useRef<CommunityPost[]>([]);

  const demoPosts = useMemo(() => generateMockPosts(72, 20260319), []);
  const hasLivePosts = posts.length > 0;
  const showingDemoGallery = !hasLivePosts;

  const galleryPosts = useMemo(
    () => sortPosts(hasLivePosts ? posts : demoPosts, sortMode),
    [demoPosts, hasLivePosts, posts, sortMode],
  );

  const authHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set('returnTo', '/community?compose=1');
    return `/auth?${params.toString()}`;
  }, []);

  const buildHref = useCallback(
    (compose: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (compose) {
        params.set('compose', '1');
      } else {
        params.delete('compose');
      }
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const nextData = await loadCommunityUniverseData();
      const preserveCurrentFeed =
        Boolean(nextData.loadError) &&
        latestPostsRef.current.length > 0;
      const nextPosts = preserveCurrentFeed ? latestPostsRef.current : nextData.posts;

      latestPostsRef.current = nextPosts;
      setPosts(nextPosts);
      if (!preserveCurrentFeed) {
        setTrustedNewsMeta(nextData.trustedNewsMeta);
      }
      setWarnings(preserveCurrentFeed ? ['Refresh failed. Showing the last successful community feed.'] : nextData.warnings);
      setLoadError(nextPosts.length < 1 ? nextData.loadError : null);
    } catch (err) {
      setWarnings(['Community feed refresh failed.']);
      setLoadError(err instanceof Error ? err.message : 'The live community feed could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const wantsComposer = searchParams.get('compose') === '1';

  const showUniverseFallback =
    showingDemoGallery && !isLoading && (Boolean(loadError) || process.env.NODE_ENV !== 'production');
  const communityPacket = useMemo(() => {
    if (hasLivePosts) {
      return buildCommunityUniversePacket(posts, {
        mode: 'live',
        sourceSummary: `${posts.length} live traces / ${trustedNewsMeta.count} trusted news / shared community packet`,
      });
    }

    if (!showUniverseFallback) {
      return null;
    }

    return buildCommunityUniversePacket(demoPosts, {
      mode: loadError ? 'read_only' : 'demo',
      sourceSummary: `Deterministic local packet / ${demoPosts.length} demo traces`,
      fallbackMessage: loadError
        ? 'Live community sources are unavailable, so this panel is rendering a deterministic local read-only packet.'
        : 'No live public community traces are published yet. This deterministic local packet keeps the community route inspectable while seeding continues.',
    });
  }, [demoPosts, hasLivePosts, loadError, posts, showUniverseFallback, trustedNewsMeta.count]);
  const communityUniverseVisible = showCommunityUniverse && Boolean(communityPacket);
  const canToggleCommunityUniverse = !isLoading && (hasLivePosts || showUniverseFallback);

  const openComposer = useCallback(() => {
    if (!isAuthenticated) {
      router.push(authHref);
      return;
    }
    setIsComposerOpen(true);
    router.replace(buildHref(true), { scroll: false });
  }, [authHref, buildHref, isAuthenticated, router]);

  const closeComposer = useCallback(() => {
    setIsComposerOpen(false);
    router.replace(buildHref(false), { scroll: false });
  }, [buildHref, router]);

  const handlePublished = useCallback(
    (post: CommunityPost) => {
      const nextPosts = [post, ...latestPostsRef.current.filter((item) => item.id !== post.id)];
      latestPostsRef.current = nextPosts;
      setPosts(nextPosts);
      setSortMode('new');
      setWarnings([]);
      setLoadError(null);
      closeComposer();
      void loadFeed();
    },
    [closeComposer, loadFeed],
  );

  if (!galleryEnabled) {
    return <CommunityLegacy />;
  }

  const warningMessage = warnings.length > 0 ? warnings[0] : null;

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[#02050c]" style={{ isolation: 'isolate' }}>
      <DraggableGallery posts={galleryPosts} sortMode={sortMode} onSortChange={setSortMode} />

      <div className="pointer-events-none fixed left-3 right-3 top-4 z-[12] flex justify-center md:left-[17rem] md:right-6">
        <div className="manara-grid-hero manara-glass-panel-muted pointer-events-auto w-full max-w-5xl rounded-[1.2rem] border border-white/14 bg-[linear-gradient(128deg,rgba(6,12,22,0.82),rgba(8,18,30,0.72))] p-3 text-white shadow-[0_20px_60px_-36px_rgba(0,0,0,0.95)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
              <span className="manara-glass-chip inline-flex items-center gap-2 border border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/88">
                <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                Community atlas
              </span>

              <span
                className={`manara-glass-chip inline-flex px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  showingDemoGallery
                    ? 'border border-amber-300/30 bg-amber-300/14 text-amber-100'
                    : 'border border-emerald-300/30 bg-emerald-300/14 text-emerald-100'
                }`}
              >
                {showingDemoGallery ? 'Demo gallery active' : 'Live gallery active'}
              </span>

              {isLoading ? (
                <span className="manara-glass-chip inline-flex items-center gap-2 border border-white/10 bg-black/28 px-3 py-1 text-xs text-white/72">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Syncing feed
                </span>
              ) : (
                <span className="manara-glass-chip inline-flex border border-white/10 bg-black/26 px-3 py-1 text-xs text-white/72">
                  {posts.length} live posts &middot; {trustedNewsMeta.count} trusted news
                </span>
              )}

              {warningMessage ? (
                <span className="manara-glass-chip inline-flex items-center gap-1 border border-amber-300/26 bg-amber-300/10 px-3 py-1 text-xs text-amber-100/90">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {warningMessage}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canToggleCommunityUniverse ? (
                <button
                  type="button"
                  onClick={() => setShowCommunityUniverse((open) => !open)}
                  className="manara-glass-chip inline-flex items-center gap-2 border border-white/12 bg-white/6 px-3 py-1.5 text-xs text-white transition-colors hover:border-white/22 hover:bg-white/12"
                >
                  {showCommunityUniverse ? 'Hide community universe' : 'Open community universe'}
                </button>
              ) : null}

              {authLoading ? (
                <span className="manara-glass-chip inline-flex items-center gap-2 border border-white/10 bg-black/26 px-3 py-1.5 text-xs text-white/65">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Session
                </span>
              ) : isAuthenticated ? (
                <button
                  type="button"
                  onClick={openComposer}
                  className="manara-glass-chip inline-flex items-center gap-2 border border-white/14 bg-white/8 px-3 py-1.5 text-xs text-white transition-colors hover:border-white/24 hover:bg-white/14"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New post
                </button>
              ) : (
                <Link
                  href={authHref}
                  className="manara-glass-chip inline-flex items-center gap-2 border border-white/14 bg-white/8 px-3 py-1.5 text-xs text-white transition-colors hover:border-white/24 hover:bg-white/14"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Sign in to post
                </Link>
              )}

              <button
                type="button"
                onClick={() => void loadFeed()}
                disabled={isLoading}
                className="manara-glass-chip inline-flex items-center gap-2 border border-white/12 bg-white/6 px-3 py-1.5 text-xs text-white transition-colors hover:border-white/22 hover:bg-white/12 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {communityUniverseVisible && communityPacket ? (
        <div className="pointer-events-none fixed bottom-20 left-4 right-4 z-[13] flex justify-center md:left-[17rem] md:right-6">
          <div className="manara-grid-hero manara-glass-panel pointer-events-auto w-full max-w-6xl rounded-[1.45rem] border border-white/14 bg-[linear-gradient(135deg,rgba(7,12,22,0.95),rgba(7,14,25,0.94))] p-4 shadow-[0_28px_80px_-34px_rgba(0,0,0,0.95)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-white/86">
              <p className="text-xs uppercase tracking-[0.2em]">
                {communityPacket.fallbackState?.active
                  ? `Fallback ${universePresentationTerms.readOnlyPacket}`
                  : universePresentationTerms.communityUniverse}
              </p>
              <button
                type="button"
                onClick={() => setShowCommunityUniverse(false)}
                className="manara-glass-chip border border-white/14 bg-white/7 px-3 py-1 text-xs text-white transition-colors hover:bg-white/14"
              >
                Hide
              </button>
            </div>
            <CommunityUniversePanel packet={communityPacket} loadError={loadError} />
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-5 right-5 z-[12] hidden sm:block">
        {authLoading ? (
          <div className="manara-glass-chip inline-flex items-center gap-2 border border-white/12 bg-black/60 px-4 py-3 text-sm text-white/68 backdrop-blur-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking session
          </div>
        ) : isAuthenticated ? (
          <button
            type="button"
            onClick={openComposer}
            className="manara-glass-chip inline-flex items-center gap-2 border border-white/14 bg-white px-4 py-3 text-sm font-medium text-black shadow-lg transition hover:scale-[1.02] hover:bg-white/92"
          >
            <Plus className="h-4 w-4" />
            Create post
          </button>
        ) : (
          <Link
            href={authHref}
            className="manara-glass-chip inline-flex items-center gap-2 border border-white/12 bg-black/60 px-4 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-md transition hover:border-white/25 hover:bg-black/75"
          >
            <Plus className="h-4 w-4" />
            Sign in to post
          </Link>
        )}
      </div>

      <CommunityComposerModal
        open={(isComposerOpen || (wantsComposer && !authLoading)) && isAuthenticated}
        onClose={closeComposer}
        onPublished={handlePublished}
      />
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<CommunityPageFallback />}>
      <CommunityPageContent />
    </Suspense>
  );
}
