'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { Clock, Heart, MapPin, MessageCircle, Share2, Sparkles, User, X } from 'lucide-react';
import type { CommunityPost } from '@/data/adapters/communityAdapter';

interface PostDetailModalProps {
  post: CommunityPost | null;
  onClose: () => void;
  footerActions?: ReactNode;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PostDetailModal({ post, onClose, footerActions }: PostDetailModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [post, onClose]);

  if (!post) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Post by ${post.author.pseudonym}`}
    >
      <div className="absolute inset-0 bg-[rgba(2,6,14,0.78)] backdrop-blur-md" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(5,9,18,0.94)] text-white shadow-[0_35px_120px_rgba(0,0,0,0.55)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/[0.05] p-2 text-white/72 transition hover:border-white/25 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[18rem] bg-[rgba(4,10,20,0.9)]">
            {post.image || post.coverImage ? (
              <Image
                src={post.image || post.coverImage}
                alt={post.title || post.author.pseudonym}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(2,6,14,0.18)_36%,rgba(2,6,14,0.74)_100%)]" />
          </div>

          <div className="p-6 lg:p-8">
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
                    <Sparkles className="h-3.5 w-3.5" />
                    {post.sourceName ? 'Trusted signal' : 'Community trace'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
                    <MapPin className="h-3.5 w-3.5" />
                    {post.microcosm || 'Shared commons'}
                  </span>
                </div>

                <h2
                  className="mt-4 text-3xl leading-[1.02] text-white"
                  style={{ fontFamily: 'var(--anu-type-display)' }}
                >
                  {post.title || post.author.pseudonym}
                </h2>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.08] text-sm font-semibold text-white">
                    {post.author.pseudonym.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{post.author.pseudonym}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/52">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {post.author.role}
                      </span>
                      <span>/</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {timeAgo(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm leading-7 text-slate-200/86 whitespace-pre-wrap">
                {post.content}
              </p>

              {post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Likes</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white">
                    <Heart className={`h-4 w-4 ${post.liked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{post.likes}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Comments</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Shares</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white">
                    <Share2 className="h-4 w-4" />
                    <span>{post.shares}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300/82">
                Comments and threaded replies should inherit the same chamber grammar: accountable attribution first, novelty last.
              </div>

              {footerActions ? (
                <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
                  {footerActions}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
