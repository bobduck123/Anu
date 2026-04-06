'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, Plus, RefreshCw, Sparkles, Stars } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlag } from '@/lib/featureFlags';
import {
  AnuActionLink,
  AnuChip,
  AnuCommonsStatusRail,
  AnuControlButton,
  AnuControlLink,
  AnuFilterBar,
  AnuFilterGroup,
  AnuSectionHeading,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { AnuNarrativeBriefPanel } from '@/ui-system/anu/narrativePrimitives';
import {
  generateMockPosts,
  sortPosts,
  type CommunityPost,
  type SortMode,
} from '@/data/adapters/communityAdapter';
import { buildCommunityUniversePacket } from '@/components/maps/communityUniverseAdapter';
import {
  loadCommunityUniverseData,
  type CommunityTrustedNewsMeta,
} from '@/lib/community/loadCommunityUniverse';
import { buildAuthHref } from '@/lib/auth/returnTo';
import { DraggableGallery } from '@/ui/patterns/draggable-gallery';
import { PostDetailModal } from '@/ui/patterns/draggable-gallery/PostDetailModal';
import { CelestialNodeBubble } from '@/ui-system/realms/celestial/CelestialNodeBubble';
import { CelestialStarfieldShell } from '@/ui-system/realms/celestial/CelestialStarfieldShell';
import { CelestialTunnel } from '@/ui-system/realms/celestial/CelestialTunnel';
import {
  COMMUNITY_CELESTIAL_INTENTS,
  communityPostIdFromStarId,
  getCommunityIntentStarIds,
  getCommunityNodeSurface,
  prioritizeRelatedCommunityPosts,
  shouldAutoFallbackToTwoDimensional,
  type CommunityCelestialIntent,
} from '@/ui-system/realms/celestial/communityCelestialPresentation';
import CommunityComposerModal from './CommunityComposerModal';

export const dynamic = 'force-dynamic';

const CommunityLegacy = dynamicImport(() => import('./CommunityLegacy'), { ssr: false });

const COMMUNITY_SORT_OPTIONS: Array<{ mode: SortMode; label: string }> = [
  { mode: 'new', label: 'Newest' },
  { mode: 'trending', label: 'Trending' },
  { mode: 'near-me', label: 'Near me' },
];

function CommunityPageFallback() {
  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-[var(--color-background)]" style={{ isolation: 'isolate' }}>
      <div className="absolute inset-0 z-[11] flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.65)] p-8 text-[var(--color-foreground)] shadow-2xl backdrop-blur-xl">
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-[color:rgba(246,212,203,0.45)]">Loading</p>
          <h1 className="mb-4 text-3xl font-semibold">Preparing the community commons</h1>
          <p className="text-sm leading-relaxed text-[color:rgba(246,212,203,0.7)]">
            The celestial community surface is loading its public feed, trusted signals, and route state.
          </p>
        </div>
      </div>
    </div>
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
  const [trustedNewsMeta, setTrustedNewsMeta] = useState<CommunityTrustedNewsMeta>({
    count: 0,
    stale: false,
    sourceNames: [],
  });
  const [surfaceMode, setSurfaceMode] = useState<'celestial' | 'backup'>('celestial');
  const [autoFallbackReason, setAutoFallbackReason] = useState<string | null>(null);
  const [activeIntent, setActiveIntent] = useState<CommunityCelestialIntent>('stories');
  const [enteredStarfield, setEnteredStarfield] = useState(false);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [focusPostId, setFocusPostId] = useState<string | null>(null);

  const latestPostsRef = useRef<CommunityPost[]>([]);

  const demoPosts = useMemo(() => generateMockPosts(72, 20260319), []);
  const hasLivePosts = posts.length > 0;
  const sourcePosts = hasLivePosts ? posts : demoPosts;

  const authHref = useMemo(() => buildAuthHref('/community?compose=1'), []);

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
      setWarnings(
        preserveCurrentFeed
          ? ['Refresh failed. Showing the last successful community feed.']
          : nextData.warnings,
      );
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (shouldAutoFallbackToTwoDimensional(prefersReducedMotion)) {
      setSurfaceMode('backup');
      setAutoFallbackReason('Reduced-motion preference detected. The 2D gallery is active by default, but the celestial field remains available.');
    }
  }, []);

  const communityPacket = useMemo(() => {
    if (hasLivePosts) {
      return buildCommunityUniversePacket(sourcePosts, {
        mode: 'live',
        sourceSummary: `${sourcePosts.length} live traces / ${trustedNewsMeta.count} trusted news / celestial community packet`,
      });
    }

    return buildCommunityUniversePacket(sourcePosts, {
      mode: loadError ? 'read_only' : 'demo',
      sourceSummary: loadError
        ? `Read-only fallback packet / ${sourcePosts.length} deterministic traces`
        : `Demo community packet / ${sourcePosts.length} seeded traces`,
      fallbackMessage: loadError
        ? 'Live community sources are unavailable, so the celestial field is rendering a deterministic read-only packet.'
        : 'No public traces are published yet. The celestial field remains inspectable through a seeded deterministic packet.',
    });
  }, [hasLivePosts, loadError, sourcePosts, trustedNewsMeta.count]);

  const visibleStarIds = useMemo(
    () => getCommunityIntentStarIds(communityPacket, activeIntent),
    [communityPacket, activeIntent],
  );

  useEffect(() => {
    if (selectedStarId && !visibleStarIds.includes(selectedStarId)) {
      setSelectedStarId(null);
    }
  }, [selectedStarId, visibleStarIds]);

  const galleryPosts = useMemo(
    () => prioritizeRelatedCommunityPosts(sortPosts(sourcePosts, sortMode), focusPostId),
    [focusPostId, sortMode, sourcePosts],
  );

  const wantsComposer = searchParams.get('compose') === '1';
  const selectedStar = useMemo(
    () => communityPacket.stars.find((star) => star.id === selectedStarId) ?? null,
    [communityPacket, selectedStarId],
  );
  const selectedPost = useMemo(() => {
    if (!selectedStarId) {
      return null;
    }
    return sourcePosts.find((post) => post.id === communityPostIdFromStarId(selectedStarId)) ?? null;
  }, [selectedStarId, sourcePosts]);
  const selectedNodeSurface = selectedStar ? getCommunityNodeSurface(selectedStar) : null;

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

  const enterStarfield = useCallback(() => {
    setEnteredStarfield(true);
    setSurfaceMode('celestial');
  }, []);

  const openBackupGallery = useCallback(() => {
    if (selectedPost) {
      setFocusPostId(selectedPost.id);
    }
    setSurfaceMode('backup');
  }, [selectedPost]);

  const reopenStarfield = useCallback(() => {
    setSurfaceMode('celestial');
    setEnteredStarfield(true);
  }, []);

  if (!galleryEnabled) {
    return <CommunityLegacy />;
  }

  const warningMessage = warnings.length > 0 ? warnings[0] : null;
  const feedStateLabel = isLoading
    ? 'Syncing live commons'
    : hasLivePosts
      ? warningMessage
        ? 'Cached live commons'
        : 'Live commons'
      : loadError
        ? 'Read-only fallback commons'
        : 'Seeded demo commons';
  const feedStateTone = hasLivePosts && !warningMessage ? 'signal' : 'accent';
  const publicationStateLabel = hasLivePosts
    ? `${posts.length} public traces visible`
    : loadError
      ? 'Live publication unavailable'
      : 'Awaiting published traces';
  const trustedSignalsLabel = trustedNewsMeta.count > 0
    ? `${trustedNewsMeta.count} trusted signals${trustedNewsMeta.stale ? ' / stale' : ''}`
    : 'No trusted signals yet';
  const modeGuidance = hasLivePosts
    ? 'Browsing current public community traces with trusted signals layered into the commons.'
    : loadError
      ? 'Live community sources are unavailable, so the commons is presenting a deterministic local fallback.'
      : 'No public traces are published yet, so the commons remains inspectable through the seeded demo packet.';
  const showStarfield = surfaceMode === 'celestial';
  const isPreEntryTunnel = showStarfield && !enteredStarfield;
  const chamberOpen = showStarfield && enteredStarfield && selectedNodeSurface === 'chamber' && Boolean(selectedPost);

  const topChrome = (
    <AnuSurfacePanel tone="quiet" className="p-4 text-[var(--color-foreground)]">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="min-w-0">
          <AnuSectionHeading
            eyebrow="Community commons"
            title="Carved entry into the public field"
            description="The community route now opens as a celestial browsing surface. The gallery remains available as a 2D backup and deep-inspection path."
          />

          <AnuCommonsStatusRail
            className="mt-4"
            items={[
              {
                label: 'Feed mode',
                value: `${feedStateLabel} / ${showStarfield ? 'Celestial field' : '2D backup'}`,
                tone: feedStateTone,
                icon: Sparkles,
                detail: modeGuidance,
              },
              {
                label: 'Publication state',
                value: publicationStateLabel,
                tone: hasLivePosts ? 'signal' : 'accent',
                detail: hasLivePosts
                  ? 'Published traces are feeding both the starfield and the backup gallery.'
                  : 'The starfield remains inspectable even when live publication is thin or absent.',
              },
              {
                label: 'Trusted signal layer',
                value: trustedSignalsLabel,
                tone: trustedNewsMeta.count > 0 ? 'muted' : 'accent',
                detail: 'Trusted signals stay secondary to community publication and are clearly labeled inside the field.',
              },
            ]}
          />
        </div>

        <div className="min-w-0">
          <AnuSurfacePanel tone="soft" className="h-full">
            <div className="flex flex-wrap gap-2">
              <AnuChip tone={feedStateTone}>{feedStateLabel}</AnuChip>
              <AnuChip tone={enteredStarfield ? 'signal' : 'muted'}>
                {enteredStarfield ? 'Starfield active' : 'Tunnel not entered'}
              </AnuChip>
              {focusPostId ? <AnuChip tone="muted">Gallery focused on selected trace</AnuChip> : null}
            </div>

            <AnuFilterBar className="mt-4">
              <AnuFilterGroup>
                <AnuControlButton
                  onClick={reopenStarfield}
                  tone={showStarfield ? 'active' : 'default'}
                  iconLeft={Stars}
                >
                  Starfield
                </AnuControlButton>
                <AnuControlButton
                  onClick={() => setSurfaceMode('backup')}
                  tone={!showStarfield ? 'active' : 'default'}
                >
                  2D backup
                </AnuControlButton>
              </AnuFilterGroup>

              <AnuFilterGroup className="justify-end">
                {isPreEntryTunnel ? (
                  <AnuControlButton onClick={() => void loadFeed()} disabled={isLoading} iconLeft={RefreshCw}>
                    Refresh
                  </AnuControlButton>
                ) : (
                  <>
                    {COMMUNITY_SORT_OPTIONS.map((option) => (
                      <AnuControlButton
                        key={option.mode}
                        onClick={() => setSortMode(option.mode)}
                        tone={sortMode === option.mode ? 'active' : 'default'}
                      >
                        {option.label}
                      </AnuControlButton>
                    ))}

                    {authLoading ? (
                      <AnuControlButton disabled iconLeft={Loader2}>Session</AnuControlButton>
                    ) : isAuthenticated ? (
                      <AnuControlButton onClick={openComposer} iconLeft={Plus} tone="active">
                        Open composer
                      </AnuControlButton>
                    ) : (
                      <AnuControlLink href={authHref} iconLeft={Plus}>
                        Sign in to publish
                      </AnuControlLink>
                    )}

                    <AnuControlButton onClick={() => void loadFeed()} disabled={isLoading} iconLeft={RefreshCw}>
                      Refresh
                    </AnuControlButton>
                  </>
                )}
              </AnuFilterGroup>
            </AnuFilterBar>

            {isPreEntryTunnel ? (
              <p className="mt-4 text-sm text-[color:rgba(246,212,203,0.82)]">
                Choose intent chips in the carved entry panel to open the starfield around that region.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {COMMUNITY_CELESTIAL_INTENTS.map((intent) => (
                  <AnuControlButton
                    key={intent.id}
                    onClick={() => setActiveIntent(intent.id)}
                    tone={activeIntent === intent.id ? 'active' : 'default'}
                  >
                    {intent.label}
                  </AnuControlButton>
                ))}
              </div>
            )}

            {warningMessage || loadError || trustedNewsMeta.stale || autoFallbackReason ? (
              <div className="mt-4 space-y-3">
                {warningMessage ? (
                  <div className="rounded-2xl border border-[rgba(224,177,21,0.22)] bg-[rgba(224,177,21,0.08)] px-4 py-3 text-sm text-[#f6d4cb]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{warningMessage}</span>
                    </div>
                  </div>
                ) : null}
                {loadError && !warningMessage ? (
                  <div className="rounded-2xl border border-[rgba(224,177,21,0.22)] bg-[rgba(224,177,21,0.08)] px-4 py-3 text-sm text-[#f6d4cb]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{loadError}</span>
                    </div>
                  </div>
                ) : null}
                {trustedNewsMeta.stale ? (
                  <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                    Trusted signal sources are stale. Community publication remains primary until they refresh.
                  </div>
                ) : null}
                {autoFallbackReason && !showStarfield ? (
                  <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.84)]">
                    {autoFallbackReason}
                  </div>
                ) : null}
                {(loadError || warningMessage) ? (
                  <div className="rounded-2xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.3)] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.72)]">Working right now</p>
                    <p className="mt-1 text-sm text-[color:rgba(246,212,203,0.86)]">
                      Keep browsing via the read-only starfield or backup gallery, and use trust routes while live publication recovers.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AnuControlLink href="/transparency" tone="default">Open transparency</AnuControlLink>
                      <AnuControlLink href="/docs" tone="default">Open docs</AnuControlLink>
                      {!authLoading && !isAuthenticated ? (
                        <AnuControlLink href={authHref} tone="default">Open sign-in route</AnuControlLink>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <AnuNarrativeBriefPanel
              eyebrow="Route reading"
              title="How to read this commons surface"
              description="Community is now a celestial browsing route. It should still declare whether the user is reading live publication, cached state, or deterministic fallback."
              signals={[
                {
                  label: 'Output mode',
                  value: showStarfield ? 'Celestial primary' : '2D backup active',
                  detail: showStarfield
                    ? 'Community traces are being read as spatially arranged signals before they flatten into the backup gallery.'
                    : 'The backup gallery is active for preference or performance reasons, but it remains derived from the same packet and feed state.',
                  tone: showStarfield ? 'signal' : 'muted',
                  icon: Stars,
                },
                {
                  label: 'Source state',
                  value: `${publicationStateLabel} / ${trustedSignalsLabel}`,
                  detail: hasLivePosts
                    ? 'Published community traces lead both the starfield and the backup mode, with trusted signals clearly marked.'
                    : 'The route remains inspectable even when public publication is sparse or unavailable.',
                  tone: 'muted',
                  icon: RefreshCw,
                },
                {
                  label: 'Fallback truth',
                  value: loadError ? 'Deterministic fallback packet' : warningMessage ? 'Cached live packet' : 'Current route state declared',
                  detail: loadError
                    ? 'If live community sources fail, the route uses a deterministic packet instead of pretending the commons is fully live.'
                    : warningMessage
                      ? 'A failed refresh keeps the last successful feed visible and says so explicitly.'
                      : 'The route names its current state directly so public browsing remains trustworthy.',
                  tone: loadError || warningMessage ? 'accent' : 'signal',
                  icon: AlertCircle,
                },
              ]}
              whyItMatters="Public community browsing should remain legible as a commons function, not just a decorative starfield. People still need clear route truth and a stable backup path."
              compact
              className="mt-4"
            />
          </AnuSurfacePanel>
        </div>
      </div>
    </AnuSurfacePanel>
  );

  const bottomChrome = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.3)] px-4 py-3 text-xs text-[color:rgba(246,212,203,0.84)] shadow-[0_20px_50px_-32px_rgba(30,2,39,0.95)] backdrop-blur-xl">
      <span>
        Intent region: <strong className="font-semibold text-[var(--color-foreground)]">{COMMUNITY_CELESTIAL_INTENTS.find((intent) => intent.id === activeIntent)?.label}</strong>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-3 py-1">
          {communityPacket.packetMeta?.sourceSummary}
        </span>
        {focusPostId ? (
          <button
            type="button"
            onClick={() => setFocusPostId(null)}
            className="rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-3 py-1 transition hover:bg-[color:rgba(246,212,203,0.08)]"
          >
            Clear gallery focus
          </button>
        ) : null}
      </div>
    </div>
  );

  const bubble =
    showStarfield && enteredStarfield && selectedStar && selectedPost && selectedNodeSurface === 'bubble' ? (
      <CelestialNodeBubble
        eyebrow={selectedStar.metadata.sourceName ? 'Trusted signal' : 'Community trace'}
        title={selectedStar.label}
        summary={<p>{selectedPost.content}</p>}
        tags={selectedPost.tags}
        detail={
          <div className="space-y-2">
            <p>{selectedPost.microcosm ?? 'Shared commons'} / {selectedPost.author.pseudonym}</p>
            <p>{selectedStar.explainer.placementRationale}</p>
          </div>
        }
        actions={
          <>
            <AnuControlButton onClick={openBackupGallery} tone="active">
              Open related gallery
            </AnuControlButton>
            <AnuControlButton onClick={() => setSelectedStarId(null)}>
              Close bubble
            </AnuControlButton>
          </>
        }
      />
    ) : null;

  return (
    <>
      {showStarfield ? (
        <CelestialStarfieldShell
          packet={communityPacket}
          activeStarId={selectedStarId}
          visibleStarIds={visibleStarIds}
          onSelectStarId={setSelectedStarId}
          topChrome={topChrome}
          bottomChrome={enteredStarfield ? bottomChrome : null}
          bubble={bubble}
          tunnel={
            !enteredStarfield ? (
              <CelestialTunnel
                intents={COMMUNITY_CELESTIAL_INTENTS}
                activeIntent={activeIntent}
                onSelectIntent={setActiveIntent}
                onEnter={enterStarfield}
                loading={isLoading}
                secondaryActionHref={!authLoading && !isAuthenticated ? authHref : undefined}
                secondaryActionLabel="Sign in before entry"
              />
            ) : undefined
          }
        />
      ) : (
        <div className="fixed inset-0 z-[5] overflow-hidden bg-[#1e0227]" style={{ isolation: 'isolate' }}>
          <DraggableGallery
            posts={galleryPosts}
            sortMode={sortMode}
            onSortChange={setSortMode}
            showSortBar={false}
          />

          <div className="pointer-events-none fixed left-3 right-3 top-4 z-[12] flex justify-center md:left-[17rem] md:right-6">
            <div className="pointer-events-auto w-full max-w-6xl">{topChrome}</div>
          </div>

          <div className="pointer-events-none fixed bottom-5 left-4 right-4 z-[12] flex justify-center md:left-[17rem] md:right-6">
            <div className="pointer-events-auto w-full max-w-6xl">{bottomChrome}</div>
          </div>
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-[12] sm:hidden">
        {authLoading ? (
          <div className="manara-glass-chip inline-flex items-center gap-2 border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.6)] px-4 py-3 text-sm text-[color:rgba(246,212,203,0.68)] backdrop-blur-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking session
          </div>
        ) : isAuthenticated ? (
          <button
            type="button"
            onClick={openComposer}
            className="manara-glass-chip inline-flex items-center gap-2 border border-[color:rgba(246,212,203,0.14)] bg-[var(--color-foreground)] px-4 py-3 text-sm font-medium text-[var(--color-background)] shadow-lg transition hover:scale-[1.02] hover:bg-[color:rgba(246,212,203,0.92)]"
          >
            <Plus className="h-4 w-4" />
            Create post
          </button>
        ) : (
          <Link
            href={authHref}
            className="manara-glass-chip inline-flex items-center gap-2 border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.6)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] shadow-lg backdrop-blur-md transition hover:border-[color:rgba(246,212,203,0.25)] hover:bg-[color:rgba(30,2,39,0.75)]"
          >
            <Plus className="h-4 w-4" />
            Sign in to post
          </Link>
        )}
      </div>

      <PostDetailModal
        post={chamberOpen ? selectedPost : null}
        onClose={() => setSelectedStarId(null)}
        footerActions={
          chamberOpen ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openBackupGallery}
                className="inline-flex items-center rounded-xl border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(246,212,203,0.06)] px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.86)] transition-colors hover:border-[color:rgba(246,212,203,0.3)] hover:bg-[color:rgba(246,212,203,0.1)] hover:text-[var(--color-foreground)]"
              >
                Open related gallery
              </button>
              <AnuActionLink href="/constellations" tone="ghost">
                Open constellations
              </AnuActionLink>
            </div>
          ) : undefined
        }
      />

      <CommunityComposerModal
        open={(isComposerOpen || (wantsComposer && !authLoading)) && isAuthenticated}
        onClose={closeComposer}
        onPublished={handlePublished}
      />
    </>
  );
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<CommunityPageFallback />}>
      <CommunityPageContent />
    </Suspense>
  );
}
