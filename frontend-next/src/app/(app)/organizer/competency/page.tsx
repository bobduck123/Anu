'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type CompetencyProfile = {
  proficiency_level?: string;
  confidence_score?: number;
};

const fallbackProfile: CompetencyProfile = {
  proficiency_level: 'developing',
  confidence_score: 0.56,
};

export default function CompetencyGraphPage() {
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const response = await fetch(`${API_BASE}/api/competency/profile`, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error('request_failed');
        }

        const data = (await response.json()) as { data?: { profile?: CompetencyProfile | null } };
        if (!active) return;
        setProfile(data.data?.profile || fallbackProfile);
      } catch {
        if (!active) return;
        setProfile(fallbackProfile);
        setError('Live competency profile is unavailable in this environment.');
        setNotice('Working now: fallback competency snapshot remains visible while profile services recover.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Competency graph
            </h1>
            <HoverBubble title="How to use this" align="right">
              Check your current level first, then use this as a quick guide for next organizer practice steps.
            </HoverBubble>
          </div>
          <p className="text-sm text-[color:rgba(246,212,203,0.8)]">A short view of your current proficiency signal.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.8)]">Loading competency profile…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="space-y-2 min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href="/organizer/on-ramp" className="btn-pill btn-pill-outline text-xs">
                    Organizer path
                  </Link>
                  <Link href="/profile" className="btn-pill btn-pill-outline text-xs">
                    Open profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="card-civic space-y-2">
          <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.64)]">Current proficiency</p>
          <p className="text-sm text-[var(--color-foreground)]">Level: {profile?.proficiency_level ?? '—'}</p>
          <p className="text-sm text-[color:rgba(246,212,203,0.78)]">Confidence: {Math.round((profile?.confidence_score ?? 0) * 100)}%</p>
        </section>

        <details className="card-civic">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">Show evidence context</summary>
          <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.8)]">
            Evidence sources are aggregated privately. Use the confidence trend as directional guidance, not a final verdict.
          </p>
        </details>
      </div>
    </div>
  );
}
