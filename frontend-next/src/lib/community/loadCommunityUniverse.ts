import { api, type Article, type CommunityNewsFeed, type StoryPost } from '@/lib/api';
import { buildGalleryPosts, type CommunityPost } from '@/data/adapters/communityAdapter';

type ArticleGroups = {
  opinion: Article[];
  news: Article[];
  creative: Article[];
};

export interface CommunityTrustedNewsMeta {
  count: number;
  stale: boolean;
  sourceNames: string[];
}

export interface CommunityUniverseLoadResult {
  posts: CommunityPost[];
  warnings: string[];
  loadError: string | null;
  degraded: boolean;
  trustedNewsMeta: CommunityTrustedNewsMeta;
}

function emptyArticleGroups(): ArticleGroups {
  return { opinion: [], news: [], creative: [] };
}

export async function loadCommunityUniverseData(): Promise<CommunityUniverseLoadResult> {
  const [articlesResult, storiesResult, trustedNewsResult] = await Promise.allSettled([
    api.community.getArticles(),
    api.stories.getAll(1, 60),
    api.community.getTrustedNews(12),
  ]);

  let articles: ArticleGroups = emptyArticleGroups();
  let stories: StoryPost[] = [];
  let trustedNews: CommunityNewsFeed['items'] = [];
  const warnings: string[] = [];
  let trustedNewsMeta: CommunityTrustedNewsMeta = {
    count: 0,
    stale: false,
    sourceNames: [],
  };

  if (articlesResult.status === 'fulfilled') {
    articles = articlesResult.value;
  } else {
    warnings.push('Articles are unavailable right now.');
  }

  if (storiesResult.status === 'fulfilled') {
    stories = storiesResult.value.items;
  } else {
    warnings.push('Stories are unavailable right now.');
  }

  if (trustedNewsResult.status === 'fulfilled') {
    trustedNews = trustedNewsResult.value.items;
    trustedNewsMeta = {
      count: trustedNewsResult.value.items.length,
      stale: trustedNewsResult.value.stale,
      sourceNames: trustedNewsResult.value.sources.map((source) => source.sourceName),
    };

    if (trustedNewsResult.value.stale && trustedNewsResult.value.items.length > 0) {
      warnings.push('Trusted news is showing cached items.');
    }
  } else {
    warnings.push('Trusted news is unavailable right now.');
  }

  const posts = buildGalleryPosts({ articles, stories, newsFeed: trustedNews });
  const loadError = posts.length < 1 && warnings.length === 3 ? 'The live community feed could not be loaded.' : null;

  return {
    posts,
    warnings,
    loadError,
    degraded: warnings.length > 0,
    trustedNewsMeta,
  };
}
