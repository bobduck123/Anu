'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export default function CollisionReviewPage() {
  const [checks, setChecks] = useState<CollisionCheck[]>([]);
  const [reviews, setReviews] = useState<CollisionReview[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([
      fetch(`${API_BASE}/api/collisions/checks`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/collisions/reviews`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([checksResp, reviewsResp]: [{ data?: { checks?: CollisionCheck[] } }, { data?: { reviews?: CollisionReview[] } }]) => {
        setChecks(checksResp.data?.checks || []);
        setReviews(reviewsResp.data?.reviews || []);
      })
      .catch(() => setError('Failed to load collisions'));
  };

  useEffect(() => {
    load();
  }, []);

  const updateReview = async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/api/collisions/reviews/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError('Failed to update review');
      return;
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Collision Reviews
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Review and approve high-collision events.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-2">
          <h2 className="text-lg font-semibold">Recent Collision Checks</h2>
          {checks.map((c) => (
            <div key={`${c.event_id}-${c.created_at}`} className="text-sm">
              Event {c.event_id} — score {c.score} ({c.reasons?.join(', ')})
            </div>
          ))}
          {checks.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No checks yet.</p>}
        </div>

        <div className="card-civic space-y-2">
          <h2 className="text-lg font-semibold">Manual Reviews</h2>
          {reviews.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <div>Event {r.event_id} — {r.status}</div>
              <div className="flex gap-2">
                <button className="btn-pill btn-pill-secondary" onClick={() => updateReview(r.id, 'approved')}>
                  Approve
                </button>
                <button className="btn-pill btn-pill-secondary" onClick={() => updateReview(r.id, 'rejected')}>
                  Reject
                </button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No reviews yet.</p>}
        </div>
      </div>
    </div>
  );
}


