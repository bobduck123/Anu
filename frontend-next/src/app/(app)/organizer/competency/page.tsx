'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

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

export default function CompetencyGraphPage() {
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/competency/profile`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: { profile?: CompetencyProfile | null } }) => setProfile(data.data?.profile || null))
      .catch(() => setError('Failed to load competency profile'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Competency Graph
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Your current proficiency and suggested next steps.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic">
          <h2 className="text-lg font-semibold mb-2">Proficiency</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Level: {profile?.proficiency_level ?? '—'}
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Confidence: {profile?.confidence_score ?? '—'}
          </p>
          <div className="mt-4 text-sm">
            <p className="text-[var(--color-muted-foreground)]">Evidence sources are aggregated privately.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


