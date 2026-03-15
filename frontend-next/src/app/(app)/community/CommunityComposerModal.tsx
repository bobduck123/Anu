'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, FileText, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  buildGalleryPostFromArticle,
  buildGalleryPostFromStory,
  type CommunityPost,
} from '@/data/adapters/communityAdapter';

type ComposerMode = 'story' | 'article';
type ArticleCategory = 'news' | 'opinion' | 'creative';

interface CommunityComposerModalProps {
  open: boolean;
  onClose: () => void;
  onPublished: (post: CommunityPost) => void;
}

const BANNED_WORDS = ['kill', 'harm', 'threat', 'violence', 'attack', 'abuse'];

function hasDestructiveContent(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}

const initialDraft = {
  title: '',
  content: '',
  mediaUrl: '',
  category: 'news' as ArticleCategory,
};

export default function CommunityComposerModal({
  open,
  onClose,
  onPublished,
}: CommunityComposerModalProps) {
  const [mode, setMode] = useState<ComposerMode>('story');
  const [title, setTitle] = useState(initialDraft.title);
  const [content, setContent] = useState(initialDraft.content);
  const [mediaUrl, setMediaUrl] = useState(initialDraft.mediaUrl);
  const [category, setCategory] = useState<ArticleCategory>(initialDraft.category);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose, open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [mode, open]);

  if (!open) return null;

  const resetDraft = () => {
    setTitle(initialDraft.title);
    setContent(initialDraft.content);
    setMediaUrl(initialDraft.mediaUrl);
    setCategory(initialDraft.category);
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextContent = content.trim();

    if (!nextTitle || !nextContent) {
      setError('Add both a title and content before publishing.');
      return;
    }

    if (hasDestructiveContent(`${nextTitle} ${nextContent}`)) {
      setError('This draft appears to violate community safety guidelines. Edit it before publishing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'story') {
        const created = await api.stories.create({
          title: nextTitle,
          content: nextContent,
          media_url: mediaUrl.trim() || undefined,
        });
        onPublished(buildGalleryPostFromStory(created));
      } else {
        const created = await api.community.createArticle({
          title: nextTitle,
          content: nextContent,
          category,
        });
        onPublished(buildGalleryPostFromArticle(created));
      }
      resetDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The post could not be published.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close composer"
        onClick={handleClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#101010] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.22em] text-white/45">Community composer</p>
            <h2 className="text-2xl font-semibold">
              {mode === 'story' ? 'Publish a story tile' : 'Publish an article tile'}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              {mode === 'story'
                ? 'Stories land in the floating feed with optional media and public reactions.'
                : 'Articles appear as editorial tiles in the same floating feed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('story')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                mode === 'story' ? 'bg-white text-black' : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Story
            </button>
            <button
              type="button"
              onClick={() => setMode('article')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                mode === 'article' ? 'bg-white text-black' : 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              Article
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                placeholder={mode === 'story' ? 'What happened in your node?' : 'Headline for the public feed'}
                type="text"
              />
            </div>
            {mode === 'article' ? (
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ArticleCategory)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                >
                  <option value="news" className="bg-[#101010]">News</option>
                  <option value="opinion" className="bg-[#101010]">Opinion</option>
                  <option value="creative" className="bg-[#101010]">Creative</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">Media URL</label>
                <input
                  value={mediaUrl}
                  onChange={(event) => setMediaUrl(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25"
                  placeholder="Optional image or media link"
                  type="url"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">Content</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={8}
              className="w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-white/25"
              placeholder={
                mode === 'story'
                  ? 'Share the moment, update, or field note you want the public feed to show.'
                  : 'Write the article body that should open in the detail pane.'
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-white/45">
              Published posts are public on the community route and should avoid destructive language.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-70"
              >
                {isSubmitting
                  ? (mode === 'story' ? 'Publishing story...' : 'Publishing article...')
                  : (mode === 'story' ? 'Publish story' : 'Publish article')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
