'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type IndexRecord = {
  index_value: number;
  formula_version: number;
  components: Record<string, number>;
  created_at?: string;
};

export default function SovereigntyIndexPage() {
  const [record, setRecord] = useState<IndexRecord | null>(null);
  const [error, setError] = useState('');

  const loadLatest = () => {
    fetch(`${API_BASE}/api/sovereignty-index/latest`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setRecord(data.data?.index || null))
      .catch(() => setError('Failed to load sovereignty index'));
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const computeIndex = async () => {
    const res = await fetch(`${API_BASE}/api/sovereignty-index/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setError('Failed to compute sovereignty index');
      return;
    }
    const data = await res.json();
    setRecord(data.data || null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Sovereignty Index
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Composite node resilience and capability indicator.
          </p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Latest snapshot</p>
              <p className="text-3xl font-semibold font-mono-data">{record?.index_value ?? '—'}</p>
            </div>
            <button className="btn-pill btn-pill-primary" onClick={computeIndex}>
              Compute Index
            </button>
          </div>
          {record?.components && (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {Object.entries(record.components).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-[var(--color-muted-foreground)]">{key}</span>
                  <span className="font-mono-data">{value.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
          {record?.created_at && (
            <div className="text-xs text-[var(--color-muted-foreground)]">
              Updated {new Date(record.created_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


