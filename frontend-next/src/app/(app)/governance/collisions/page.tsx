'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type CollisionCheck = {
  event_id: number | string;
  created_at?: string;
  score?: number;
  reasons?: string[];
};

type CollisionReview = {
  id: number;
  event_id: number | string;
  status: string;
};

const FALLBACK_CHECKS: CollisionCheck[] = [
  {
    event_id: 'EV-4402',
    created_at: '2026-04-05T07:20:00.000Z',
    score: 0.81,
    reasons: ['resource overlap', 'timing compression', 'cross-route dependency'],
  },
  {
    event_id: 'EV-4415',
    created_at: '2026-04-05T19:35:00.000Z',
    score: 0.68,
    reasons: ['allocation contention', 'limited reviewer lane'],
  },
];

const FALLBACK_REVIEWS: CollisionReview[] = [
  { id: 9901, event_id: 'EV-4402', status: 'pending' },
  { id: 9902, event_id: 'EV-4415', status: 'approved' },
];

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatTimestamp(value?: string) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return date.toLocaleString();
}

export default function CollisionReviewPage() {
  const [checks, setChecks] = useState<CollisionCheck[]>([]);
  const [reviews, setReviews] = useState<CollisionReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingReviewId, setUpdatingReviewId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [degradedMode, setDegradedMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice(null);
    setDegradedMode(false);

    try {
      const [checksRes, reviewsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/collisions/checks`, { headers: await getAuthHeaders() }),
        fetch(`${API_BASE}/api/collisions/reviews`, { headers: await getAuthHeaders() }),
      ]);

      let nextChecks: CollisionCheck[] = [];
      let nextReviews: CollisionReview[] = [];
      let hasIssue = false;

      if (checksRes.status === 'fulfilled' && checksRes.value.ok) {
        const checksJson = await parseJsonSafe<{ data?: { checks?: CollisionCheck[] } }>(checksRes.value);
        nextChecks = checksJson?.data?.checks ?? [];
      } else {
        hasIssue = true;
      }

      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
        const reviewsJson = await parseJsonSafe<{ data?: { reviews?: CollisionReview[] } }>(reviewsRes.value);
        nextReviews = reviewsJson?.data?.reviews ?? [];
      } else {
        hasIssue = true;
      }

      if (hasIssue) {
        setDegradedMode(true);
        setNotice(
          'Working now: collision review practice remains available with fallback records while live moderation feeds recover.',
        );
      }

      setChecks(nextChecks.length > 0 ? nextChecks : FALLBACK_CHECKS);
      setReviews(nextReviews.length > 0 ? nextReviews : FALLBACK_REVIEWS);
    } catch {
      setError('Live collision feeds are unavailable in this environment.');
      setNotice('Working now: fallback collision checks and manual review practice are still available.');
      setDegradedMode(true);
      setChecks(FALLBACK_CHECKS);
      setReviews(FALLBACK_REVIEWS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateReview = async (id: number, status: string) => {
    setUpdatingReviewId(id);
    setError('');
    setNotice(null);

    if (degradedMode) {
      setReviews((current) => current.map((review) => (review.id === id ? { ...review, status } : review)));
      setNotice('Review updated in fallback mode.');
      setUpdatingReviewId(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/collisions/reviews/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('update failed');
      }

      setReviews((current) => current.map((review) => (review.id === id ? { ...review, status } : review)));
      setNotice('Review status updated.');
    } catch {
      setDegradedMode(true);
      setReviews((current) => current.map((review) => (review.id === id ? { ...review, status } : review)));
      setNotice('Live review update is unavailable. Applied fallback local status update instead.');
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const pendingCount = useMemo(
    () => reviews.filter((review) => review.status.toLowerCase() === 'pending').length,
    [reviews],
  );

  const highRiskCount = useMemo(
    () => checks.filter((check) => (check.score ?? 0) >= 0.75).length,
    [checks],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Collision Reviews
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Review and steward high-collision event decisions.</p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading collision routes…</div>
        ) : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">
                    Open governance index
                  </Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">
                    Open transparency
                  </Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
                    Open docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Checks visible</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{checks.length}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">High risk checks</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{highRiskCount}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Pending reviews</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{pendingCount}</p>
          </div>
        </div>

        <div className="card-civic space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Recent Collision Checks
            </h2>
            {degradedMode ? <span className="edu-pill">Fallback mode</span> : null}
          </div>

          {checks.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No checks yet.</p>
          ) : (
            <div className="space-y-2">
              {checks.map((check) => (
                <div key={`${check.event_id}-${check.created_at || 'fallback'}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">Event {check.event_id}</p>
                  <p className="text-xs text-[color:rgba(246,212,203,0.68)]">Scored at {formatTimestamp(check.created_at)}</p>
                  <p className="mt-1 text-sm text-[color:rgba(246,212,203,0.8)]">
                    Score {typeof check.score === 'number' ? check.score.toFixed(2) : 'n/a'} · Reasons: {(check.reasons || []).join(', ') || 'none'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Manual Reviews
          </h2>

          {reviews.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No reviews yet.</p>
          ) : (
            <div className="space-y-2">
              {reviews.map((review) => (
                <div key={review.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">Event {review.event_id}</p>
                    <p className="text-xs text-[color:rgba(246,212,203,0.7)]">Status: {review.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-pill btn-pill-secondary"
                      onClick={() => void updateReview(review.id, 'approved')}
                      disabled={updatingReviewId === review.id}
                    >
                      {updatingReviewId === review.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      className="btn-pill btn-pill-secondary"
                      onClick={() => void updateReview(review.id, 'rejected')}
                      disabled={updatingReviewId === review.id}
                    >
                      {updatingReviewId === review.id ? 'Saving…' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




