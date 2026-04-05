'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, FileText, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  buildGalleryPostFromArticle,
  buildGalleryPostFromStory,
  type CommunityPost,
} from '@/data/adapters/communityAdapter';
import {
  AnuChamberCard,
  AnuChip,
  AnuControlButton,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

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

const chamberInputClass =
  'w-full rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[color:rgba(246,212,203,0.64)] focus:border-[color:rgba(246,212,203,0.24)]';

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
        className="absolute inset-0 bg-[rgba(30,2,39,0.78)] backdrop-blur-sm"
      />

      <div className="relative w-full max-w-6xl rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[rgba(30,2,39,0.95)] text-[var(--color-foreground)] shadow-[0_35px_120px_rgba(30,2,39,0.55)]">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 z-10 rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] p-2 text-[color:rgba(246,212,203,0.72)] transition hover:border-[color:rgba(246,212,203,0.25)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-5">
            <div>
              <p className="anu-lab-kicker">Community composer</p>
              <h2
                className="mt-3 text-4xl leading-[1.02] text-[var(--color-foreground)]"
                style={{ fontFamily: 'var(--anu-type-display)' }}
              >
                {mode === 'story' ? 'Publish a commons story' : 'Publish a commons article'}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:rgba(246,212,203,0.84)]">
                Publishing here creates a public trace in the community commons. The composer should feel accountable, local, and clear about what enters the shared surface.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <AnuControlButton
                onClick={() => setMode('story')}
                tone={mode === 'story' ? 'active' : 'default'}
                iconLeft={Sparkles}
              >
                Story
              </AnuControlButton>
              <AnuControlButton
                onClick={() => setMode('article')}
                tone={mode === 'article' ? 'active' : 'default'}
                iconLeft={FileText}
              >
                Article
              </AnuControlButton>
              <AnuChip tone="signal">Public commons</AnuChip>
              <AnuChip tone="muted">Authenticated publication</AnuChip>
            </div>

            {error ? (
              <div className="rounded-2xl border border-[rgba(224,177,21,0.22)] bg-[rgba(224,177,21,0.08)] px-4 py-3 text-sm text-[#f6d4cb]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                <div>
                  <label htmlFor="community-composer-title" className="mb-2 block text-sm font-medium text-[color:rgba(246,212,203,0.8)]">Title</label>
                  <input
                    id="community-composer-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                    className={chamberInputClass}
                    placeholder={mode === 'story' ? 'What happened in your node?' : 'Headline for the public commons'}
                    type="text"
                  />
                </div>

                {mode === 'article' ? (
                  <div>
                    <label htmlFor="community-composer-category" className="mb-2 block text-sm font-medium text-[color:rgba(246,212,203,0.8)]">Category</label>
                    <select
                      id="community-composer-category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value as ArticleCategory)}
                      className={chamberInputClass}
                    >
                      <option value="news" className="bg-[#1e0227]">News</option>
                      <option value="opinion" className="bg-[#1e0227]">Opinion</option>
                      <option value="creative" className="bg-[#1e0227]">Creative</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="community-composer-media-url" className="mb-2 block text-sm font-medium text-[color:rgba(246,212,203,0.8)]">Media URL</label>
                    <input
                      id="community-composer-media-url"
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      className={chamberInputClass}
                      placeholder="Optional image or media link"
                      type="url"
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="community-composer-content" className="mb-2 block text-sm font-medium text-[color:rgba(246,212,203,0.8)]">Content</label>
                <textarea
                  id="community-composer-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={10}
                  className={`${chamberInputClass} resize-none`}
                  placeholder={
                    mode === 'story'
                      ? 'Share the moment, update, or field note that should enter the commons.'
                      : 'Write the article body that should open in the public detail view.'
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:rgba(246,212,203,0.1)] pt-5">
                <p className="text-xs leading-5 text-[color:rgba(246,212,203,0.5)]">
                  Published posts are public on the community route and should avoid destructive language.
                </p>
                <div className="flex flex-wrap gap-3">
                  <AnuControlButton onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </AnuControlButton>
                  <AnuControlButton type="submit" tone="active" disabled={isSubmitting}>
                    {isSubmitting
                      ? mode === 'story'
                        ? 'Publishing story...'
                        : 'Publishing article...'
                      : mode === 'story'
                        ? 'Publish story'
                        : 'Publish article'}
                  </AnuControlButton>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <AnuSurfacePanel tone="quiet">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal">{mode === 'story' ? 'Story trace' : 'Editorial trace'}</AnuChip>
                <AnuChip tone="muted">{mode === 'story' ? 'Reaction-led tile' : 'Inspectable detail view'}</AnuChip>
              </div>
              <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
                {mode === 'story'
                  ? 'Stories should feel local and immediate. They enter the commons as public social traces.'
                  : 'Articles should feel more formal and inspectable. They share the same commons surface but carry stronger editorial weight.'}
              </p>
            </AnuSurfacePanel>

            <AnuChamberCard
              eyebrow="Before publishing"
              title="Commons doctrine"
              description="Every public trace should clarify place, meaning, and accountability before style."
            >
              <div className="space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                <p>Use clear titles that help others understand the signal without opening the detail pane.</p>
                <p>Keep destructive or threatening language out of public publication.</p>
                <p>Stories can be immediate; articles should carry a stronger editorial frame.</p>
              </div>
            </AnuChamberCard>

            <AnuChamberCard
              eyebrow="Publication result"
              title="What happens next"
              description="Once published, the new trace is inserted into the commons feed and re-synced against live sources."
            >
              <div className="space-y-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">
                <p>The gallery updates immediately so the contribution is visible in the current browse session.</p>
                <p>Trusted signals stay secondary; your post enters the same shared commons layer as other community traces.</p>
              </div>
            </AnuChamberCard>
          </div>
        </div>
      </div>
    </div>
  );
}
