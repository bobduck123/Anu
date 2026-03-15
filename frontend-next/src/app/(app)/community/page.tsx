'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useFeatureFlag } from '@/lib/featureFlags';
import { api, type Article, type StoryPost } from '@/lib/api';
import {
  buildGalleryPosts,
  sortPosts,
  type CommunityPost,
  type SortMode,
} from '@/data/adapters/communityAdapter';
import { DraggableGallery } from '@/ui/patterns/draggable-gallery';

export const forceDynamic = 'force-dynamic';

const CommunityLegacy = dynamic(() => import('./CommunityLegacy'), { ssr: false });

type ArticleGroups = {
  opinion: Article[];
  news: Article[];
  creative: Article[];
};

function emptyArticleGroups(): ArticleGroups {
  return { opinion: [], news: [], creative: [] };
}

export default function CommunityPage() {
  const galleryEnabled = useFeatureFlag('draggableCommunityGallery');
  const [sortMode, setSortMode] = useState<SortMode>('new');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const latestPostsRef = useRef<CommunityPost[]>([]);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [articlesResult, storiesResult] = await Promise.allSettled([
      api.community.getArticles(),
      api.stories.getAll(1, 60),
    ]);

    let articles: ArticleGroups = emptyArticleGroups();
    let stories: StoryPost[] = [];
    const nextWarnings: string[] = [];

    if (articlesResult.status === 'fulfilled') {
      articles = articlesResult.value;
    } else {
      nextWarnings.push('Articles are unavailable right now.');
    }

    if (storiesResult.status === 'fulfilled') {
      stories = storiesResult.value.items;
    } else {
      nextWarnings.push('Stories are unavailable right now.');
    }

    const livePosts = buildGalleryPosts({ articles, stories });
    const preserveCurrentFeed =
      livePosts.length === 0 &&
      nextWarnings.length === 2 &&
      latestPostsRef.current.length > 0;
    const nextPosts = preserveCurrentFeed ? latestPostsRef.current : livePosts;

    latestPostsRef.current = nextPosts;
    setPosts(nextPosts);
    setWarnings(
      preserveCurrentFeed
        ? ['Refresh failed. Showing the last successful community feed.']
        : nextWarnings,
    );
    setLoadError(
      nextPosts.length === 0 && nextWarnings.length === 2
        ? 'The live community feed could not be loaded.'
        : null,
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  if (!galleryEnabled) {
    return <CommunityLegacy />;
  }

  const hasPosts = posts.length > 0;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black" style={{ isolation: 'isolate' }}>
      {hasPosts && (
        <DraggableGallery posts={sortedPosts} sortMode={sortMode} onSortChange={setSortMode} />
      )}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[12] flex justify-center px-4">
        <div className="pointer-events-auto flex max-w-4xl flex-wrap items-center justify-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs text-white/70 backdrop-blur-md">
          <span className="font-mono uppercase tracking-[0.24em] text-white/60">Community</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing live feed
            </span>
          ) : (
            <span>{posts.length} live posts</span>
          )}
          {warnings.length > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span className="text-amber-200/85">{warnings.join(' ')}</span>
            </>
          )}
          <button
            type="button"
            onClick={() => void loadFeed()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-white transition-colors hover:border-white/20 hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {!hasPosts && (
        <div className="absolute inset-0 z-[11] flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-black/65 p-8 text-white shadow-2xl backdrop-blur-xl">
            {isLoading ? (
              <>
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">Loading</p>
                <h1 className="mb-4 text-3xl font-semibold">Syncing the floating community feed</h1>
                <p className="text-sm leading-relaxed text-white/70">
                  The gallery is pulling live articles and stories now. Once public posts are available,
                  the grid will populate without switching layouts.
                </p>
              </>
            ) : loadError ? (
              <>
                <div className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-amber-200/80">
                  <AlertCircle className="h-4 w-4" />
                  Feed unavailable
                </div>
                <h1 className="mb-4 text-3xl font-semibold">Community is up, but its live data is not.</h1>
                <p className="text-sm leading-relaxed text-white/70">
                  Both the articles and stories sources failed to return data. The floating grid is being
                  held back instead of filling with mock content.
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">Live feed</p>
                <h1 className="mb-4 text-3xl font-semibold">No public community posts yet</h1>
                <p className="text-sm leading-relaxed text-white/70">
                  The floating gallery is ready, but there are no published public stories or articles to
                  display yet. When members publish, they will appear here automatically.
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadFeed()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh feed
              </button>
              <Link
                href="/auth"
                className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
