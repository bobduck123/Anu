'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Heart, MessageCircle, Share2, Clock, User } from 'lucide-react';
import type { CommunityPost } from '@/data/adapters/communityAdapter';

interface PostDetailModalProps {
  post: CommunityPost | null;
  onClose: () => void;
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

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Post by ${post.author.pseudonym}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[var(--color-muted)] hover:bg-[var(--color-border)] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-[var(--color-foreground)]" />
        </button>

        {/* Image */}
        {post.image && (
          <div className="relative w-full aspect-video overflow-hidden rounded-t-2xl">
            <Image
              src={post.image}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 512px"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-semibold text-sm">
              {post.author.pseudonym.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-sm text-[var(--color-foreground)]">
                {post.author.pseudonym}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                <span className="capitalize">{post.author.role}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(post.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Microcosm badge */}
          {post.microcosm && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <User className="w-3 h-3" />
              {post.microcosm}
            </div>
          )}

          {/* Content */}
          <p className="text-sm text-[var(--color-foreground)] leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--color-border)]" />

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                post.liked
                  ? 'text-red-500'
                  : 'text-[var(--color-muted-foreground)] hover:text-red-500'
              }`}
            >
              <Heart className="w-4 h-4" fill={post.liked ? 'currentColor' : 'none'} />
              <span>{post.likes}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
              <Share2 className="w-4 h-4" />
              <span>{post.shares}</span>
            </button>
          </div>

          {/* Comments placeholder */}
          <div className="p-4 rounded-lg bg-[var(--color-muted)] text-center">
            <MessageCircle className="w-6 h-6 mx-auto mb-2 text-[var(--color-muted-foreground)] opacity-50" />
            <p className="text-sm text-[var(--color-muted-foreground)]">Comments coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
