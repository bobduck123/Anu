'use client';

import { useEffect, useState } from 'react';
import { insightsApi, type Insight } from '@/lib/api/endpoints';

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    insightsApi.list()
      .then((data) => setInsights(data.insights || []))
      .catch(() => setError('Failed to load insights'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Local Knowledge Commons</h1>
          <p className="text-[var(--color-muted-foreground)]">Structured insights from the community.</p>
        </div>
        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {insights.map((insight) => (
            <div key={insight.id} className="card-civic">
              <div className="text-xs text-[var(--color-muted-foreground)]">{insight.domain_tag}</div>
              <div className="text-lg font-semibold">{insight.title}</div>
              <p className="text-sm mt-2">{insight.body}</p>
              <div className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                {insight.verification_level}
              </div>
            </div>
          ))}
          {insights.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No insights yet.</p>}
        </div>
      </div>
    </div>
  );
}
