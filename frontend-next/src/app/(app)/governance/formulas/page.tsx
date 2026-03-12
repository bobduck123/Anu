'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type FormulaDefinition = {
  key: string;
  version: number;
};

export default function FormulaRegistryPage() {
  const [definitions, setDefinitions] = useState<FormulaDefinition[]>([]);
  const [error, setError] = useState('');
  const [activation, setActivation] = useState({ key: '', version: 1, params: '{}' });

  useEffect(() => {
    fetch(`${API_BASE}/api/formulas/`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: { definitions?: FormulaDefinition[] } }) => setDefinitions(data.data?.definitions || []))
      .catch(() => setError('Failed to load formulas'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Formula Registry
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Governance-controlled formula versions and defaults.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-2">
          {definitions.map((d) => (
            <div key={`${d.key}-${d.version}`} className="text-sm">
              {d.key} v{d.version}
            </div>
          ))}
          {definitions.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No formulas found.</p>}
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-lg font-semibold">Activate Formula</h2>
          <input
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
            placeholder="Key"
            value={activation.key}
            onChange={(e) => setActivation((prev) => ({ ...prev, key: e.target.value }))}
          />
          <input
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
            type="number"
            placeholder="Version"
            value={activation.version}
            onChange={(e) => setActivation((prev) => ({ ...prev, version: Number(e.target.value) }))}
          />
          <textarea
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg font-mono-data"
            placeholder='{"cert_weight": 10.0}'
            value={activation.params}
            onChange={(e) => setActivation((prev) => ({ ...prev, params: e.target.value }))}
          />
          <button
            className="btn-pill btn-pill-primary"
            onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/api/formulas/activate`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                  body: JSON.stringify({
                    key: activation.key,
                    version: activation.version,
                    params: JSON.parse(activation.params || '{}'),
                  }),
                });
                if (!res.ok) throw new Error();
              } catch {
                setError('Failed to activate formula');
              }
            }}
          >
            Activate
          </button>
        </div>
      </div>
    </div>
  );
}


