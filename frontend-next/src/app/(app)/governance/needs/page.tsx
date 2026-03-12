'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type NeedsSignal = {
  id: number | string;
  severity_0_100?: number;
  reason_codes?: string[];
};

export default function NeedsSignalsPage() {
  const [signals, setSignals] = useState<NeedsSignal[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/needs-signals/`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: { signals?: NeedsSignal[] } }) => setSignals(data.data?.signals || []))
      .catch(() => setError('Failed to load needs signals'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Needs Signals
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Governance view of emerging capacity gaps.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-2">
          {signals.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No active signals.</p>}
          {signals.map((signal) => (
            <div key={signal.id} className="text-sm">
              Severity {signal.severity_0_100} — {signal.reason_codes?.join(', ')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


