'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type MetricDefinition = {
  key: string;
  version: number;
  output_units?: string;
};

export default function MetricsRegistryPage() {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/metrics-registry/`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: { metrics?: MetricDefinition[] } }) => setMetrics(data.data?.metrics || []))
      .catch(() => setError('Failed to load metrics registry'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Metrics Registry
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Versioned metrics with required primitives.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-2">
          {metrics.map((m) => (
            <div key={`${m.key}-${m.version}`} className="text-sm">
              {m.key} v{m.version} — {m.output_units}
            </div>
          ))}
          {metrics.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No metrics.</p>}
        </div>
      </div>
    </div>
  );
}


