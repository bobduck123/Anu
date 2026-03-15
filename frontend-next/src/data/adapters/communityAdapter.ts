/**
 * Community feed data adapter for the Draggable Gallery.
 * Provides mock posts and integrates with the real community API.
 */

import type { Article, StoryPost } from '@/lib/api';
import { seededRandom, pickRandom } from './types';

/* -------------------------------------------------------------------------- */
/*  Layout types                                                              */
/* -------------------------------------------------------------------------- */

export type ImagePosition = 'left' | 'right' | 'top' | 'bottom';
export type ImageSize = 25 | 33 | 50;

export interface PostLayout {
  imagePosition: ImagePosition;
  imageSize: ImageSize;
}

/* -------------------------------------------------------------------------- */
/*  Post interface                                                            */
/* -------------------------------------------------------------------------- */

export interface CommunityPost {
  id: string;
  title?: string;
  author: {
    id: number;
    username: string;
    pseudonym: string;
    avatar?: string;
    role: string;
  };
  content: string;
  image?: string;
  coverImage: string;
  layout: PostLayout;
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  createdAt: string;
  microcosm?: string;
  liked?: boolean;
}

export type SortMode = 'new' | 'trending' | 'near-me';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const PSEUDONYMS = ['River Stone', 'Autumn Leaf', 'Morning Dew', 'Wild Fern', 'Coral Reef', 'Silver Fox', 'Gentle Rain', 'Mountain Echo', 'Starlight', 'Ocean Wave'];
const TAGS = ['mutual-aid', 'garden', 'skills', 'events', 'relief', 'education', 'marketplace', 'governance', 'impact', 'stories'];
const MICROCOSMS = ['Northside Gardens', 'Central Hub', 'Riverside Co-op', 'Tech for Good', 'Youth Collective', 'Elder Circle'];

const CONTENT_TEMPLATES = [
  'Just finished volunteering at the community garden — 3 hours of planting and already seeing sprouts!',
  'Reminder: the mutual aid potluck is this Saturday at the community center. Bring a dish to share!',
  'Our team completed the park restoration project ahead of schedule. Huge thanks to everyone involved.',
  'Looking for someone who can help with basic plumbing repairs. Happy to trade tutoring sessions!',
  'Attended the governance workshop today. Really eye-opening discussion about participatory budgeting.',
  'The new education module on regenerative agriculture is now live. Highly recommend it!',
  'Marketplace tip: check out the handmade soaps from the Riverside Co-op. Amazing quality.',
  'Our microcosm just hit 100 members! Celebrating with a community picnic next weekend.',
  'I pledged to reduce my energy usage by 20% this month. Who\'s joining the challenge?',
  'Incredible impact report from our relief fund — 47 families assisted this quarter.',
  'New to the platform? Feel free to reach out. The community here is wonderfully supportive.',
  'Just completed my certification in civic governance. The education track is really well designed.',
  'Sharing our success story: from food insecurity to running our own community kitchen in 6 months.',
  'The constellation synergy score for our network increased by 15% this month!',
  'Shoutout to the volunteers who helped with the emergency flood relief last week. Heroes.',
];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=400&fit=crop',
];

/** Default cover images keyed by tag — square-crop Unsplash photos */
const DEFAULT_COVERS: Record<string, string> = {
  'mutual-aid':   'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=400&fit=crop',
  'garden':       'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
  'skills':       'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=400&h=400&fit=crop',
  'events':       'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop',
  'relief':       'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=400&fit=crop',
  'education':    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop',
  'marketplace':  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop',
  'governance':   'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=400&h=400&fit=crop',
  'impact':       'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=400&fit=crop',
  'stories':      'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=400&fit=crop',
  'news':         'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=400&fit=crop',
  'opinion':      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=400&h=400&fit=crop',
  'creative':     'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop',
  'community':    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
};

const IMAGE_POSITIONS: ImagePosition[] = ['left', 'right', 'top', 'bottom'];
const IMAGE_SIZES: ImageSize[] = [25, 33, 50];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function resolveCoverImage(image: string | undefined, tags: string[]): string {
  if (image) return image;
  for (const tag of tags) {
    if (DEFAULT_COVERS[tag]) return DEFAULT_COVERS[tag];
  }
  return PLACEHOLDER_IMAGES[0];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function deriveLayout(seed: string): PostLayout {
  const hash = hashString(seed);
  return {
    imagePosition: IMAGE_POSITIONS[hash % IMAGE_POSITIONS.length],
    imageSize: IMAGE_SIZES[Math.floor(hash / IMAGE_POSITIONS.length) % IMAGE_SIZES.length],
  };
}

function toUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'community-member';
}

function isImageUrl(url?: string): boolean {
  return Boolean(url && /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(url));
}

function normalizeCategoryTag(category: string): string {
  return category.trim().toLowerCase() || 'community';
}

function countStoryReactions(story: StoryPost): number {
  return Object.values(story.reactions || {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

export function buildGalleryPostFromArticle(article: Article): CommunityPost {
  const categoryTag = normalizeCategoryTag(article.category);
  const tags = article.featured ? [categoryTag, 'community'] : [categoryTag];
  const authorName = article.authorPseudonym || 'Anonymous';

  return {
    id: `article-${article.id}`,
    title: article.title,
    author: {
      id: Number(article.authorId || article.id) || 0,
      username: toUsername(authorName),
      pseudonym: authorName,
      role: article.featured ? 'editor' : 'member',
    },
    content: article.content,
    coverImage: resolveCoverImage(undefined, tags),
    layout: deriveLayout(`article:${article.id}:${categoryTag}`),
    likes: article.likes ?? 0,
    comments: article.comments ?? 0,
    shares: 0,
    tags,
    createdAt: article.createdAt,
    liked: false,
  };
}

export function buildGalleryPostFromStory(story: StoryPost): CommunityPost {
  const authorName = story.author_pseudonym || 'Anonymous';
  const hasImage = isImageUrl(story.media_url);
  const tags = story.featured ? ['stories', 'community'] : ['stories'];

  return {
    id: `story-${story.id}`,
    title: story.title,
    author: {
      id: story.author_id,
      username: toUsername(authorName),
      pseudonym: authorName,
      role: story.featured ? 'featured storyteller' : 'storyteller',
    },
    content: story.content,
    image: hasImage ? story.media_url : undefined,
    coverImage: resolveCoverImage(hasImage ? story.media_url : undefined, tags),
    layout: deriveLayout(`story:${story.id}:${story.author_id}`),
    likes: countStoryReactions(story),
    comments: 0,
    shares: 0,
    tags,
    createdAt: story.created_at,
    liked: false,
  };
}

export function buildGalleryPosts({
  articles,
  stories,
}: {
  articles: { opinion: Article[]; news: Article[]; creative: Article[] };
  stories: StoryPost[];
}): CommunityPost[] {
  const articlePosts = [
    ...(articles.news || []),
    ...(articles.opinion || []),
    ...(articles.creative || []),
  ].map(buildGalleryPostFromArticle);
  const storyPosts = (stories || []).map(buildGalleryPostFromStory);
  const merged = [...storyPosts, ...articlePosts];
  const seen = new Set<string>();

  return merged.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/*  Mock generator                                                            */
/* -------------------------------------------------------------------------- */

export function generateMockPosts(count: number = 100, seed: number = 99): CommunityPost[] {
  const rng = seededRandom(seed);
  const posts: CommunityPost[] = [];

  for (let i = 0; i < count; i++) {
    const hasImage = rng() > 0.5;
    const daysAgo = Math.floor(rng() * 30);
    const hoursAgo = Math.floor(rng() * 24);
    const image = hasImage ? pickRandom(PLACEHOLDER_IMAGES, rng) : undefined;
    const tags = Array.from(
      { length: 1 + Math.floor(rng() * 3) },
      () => pickRandom(TAGS, rng)
    );

    posts.push({
      id: `post-${i}`,
      author: {
        id: Math.floor(rng() * 1000),
        username: `user_${Math.floor(rng() * 10000)}`,
        pseudonym: pickRandom(PSEUDONYMS, rng),
        role: pickRandom(['volunteer', 'organizer', 'member'], rng),
      },
      content: pickRandom(CONTENT_TEMPLATES, rng),
      image,
      coverImage: resolveCoverImage(image, tags),
      layout: {
        imagePosition: pickRandom(IMAGE_POSITIONS, rng),
        imageSize: pickRandom(IMAGE_SIZES, rng),
      },
      likes: Math.floor(rng() * 200),
      comments: Math.floor(rng() * 50),
      shares: Math.floor(rng() * 20),
      tags,
      createdAt: new Date(
        Date.now() - daysAgo * 86400000 - hoursAgo * 3600000
      ).toISOString(),
      microcosm: rng() > 0.3 ? pickRandom(MICROCOSMS, rng) : undefined,
      liked: rng() > 0.7,
    });
  }

  return posts;
}

export function sortPosts(posts: CommunityPost[], mode: SortMode): CommunityPost[] {
  const sorted = [...posts];

  switch (mode) {
    case 'new':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'trending':
      return sorted.sort((a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3));
    case 'near-me':
      // Placeholder — in production, sort by geo distance
      return sorted;
  }
}
