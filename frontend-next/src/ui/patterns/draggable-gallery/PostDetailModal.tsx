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
      <div className="absolute inset-0 bg-[rgba(30,2,39,0.78)] backdrop-blur-md" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[rgba(30,2,39,0.94)] text-[var(--color-foreground)] shadow-[0_35px_120px_rgba(30,2,39,0.55)]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.05)] p-2 text-[color:rgba(246,212,203,0.72)] transition hover:border-[color:rgba(246,212,203,0.25)] hover:text-[var(--color-foreground)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[18rem] bg-[rgba(30,2,39,0.9)]">
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
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,212,203,0.04),rgba(30,2,39,0.18)_36%,rgba(30,2,39,0.74)_100%)]" />
          </div>

          <div className="p-6 lg:p-8">
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.72)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    {post.sourceName ? 'Trusted signal' : 'Community trace'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.72)]">
                    <MapPin className="h-3.5 w-3.5" />
                    {post.microcosm || 'Shared commons'}
                  </span>
                </div>

                <h2
                  className="mt-4 text-3xl leading-[1.02] text-[var(--color-foreground)]"
                  style={{ fontFamily: 'var(--anu-type-display)' }}
                >
                  {post.title || post.author.pseudonym}
                </h2>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.08)] text-sm font-semibold text-[var(--color-foreground)]">
                    {post.author.pseudonym.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-foreground)]">{post.author.pseudonym}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[color:rgba(246,212,203,0.52)]">
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

              <p className="text-sm leading-7 text-[color:rgba(246,212,203,0.86)] whitespace-pre-wrap">
                {post.content}
              </p>

              {post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.72)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.42)]">Likes</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                    <Heart className={`h-4 w-4 ${post.liked ? 'fill-[#7c413c] text-[#7c413c]' : ''}`} />
                    <span>{post.likes}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.42)]">Comments</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.42)]">Shares</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                    <Share2 className="h-4 w-4" />
                    <span>{post.shares}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] px-4 py-4 text-sm text-[color:rgba(246,212,203,0.82)]">
                Comments and threaded replies should inherit the same chamber grammar: accountable attribution first, novelty last.
              </div>

              {footerActions ? (
                <div className="flex flex-wrap gap-3 border-t border-[color:rgba(246,212,203,0.1)] pt-4">
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
