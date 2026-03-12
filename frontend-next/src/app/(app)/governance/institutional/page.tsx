'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type Config = {
  enabled: boolean;
  quorum_min: number;
  external_observer_enabled: boolean;
  extended_audit_logging: boolean;
  worm_audit_suggestion: boolean;
};

export default function InstitutionalModePage() {
  const [config, setConfig] = useState<Config>({
    enabled: false,
    quorum_min: 2,
    external_observer_enabled: false,
    extended_audit_logging: false,
    worm_audit_suggestion: false,
  });
  const [error, setError] = useState('');
  const [observer, setObserver] = useState({ name: '', organization: '', email: '' });

  const loadConfig = useCallback(() => {
    fetch(`${API_BASE}/api/institutional/config`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setConfig((prev) => data.data?.config || prev))
      .catch(() => setError('Failed to load institutional config'));
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const saveConfig = async () => {
    const res = await fetch(`${API_BASE}/api/institutional/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      setError('Failed to update institutional config');
      return;
    }
    const data = await res.json();
    setConfig((prev) => data.data?.config || prev);
  };

  const addObserver = async () => {
    const res = await fetch(`${API_BASE}/api/institutional/observers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(observer),
    });
    if (!res.ok) {
      setError('Failed to add observer');
      return;
    }
    setObserver({ name: '', organization: '', email: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Institutional Mode
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Compliance-grade governance controls and observer access.
          </p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-4">
          <h2 className="text-lg font-semibold">Configuration</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Enable institutional mode
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.external_observer_enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, external_observer_enabled: e.target.checked }))}
              />
              External observer seat
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.extended_audit_logging}
                onChange={(e) => setConfig((prev) => ({ ...prev, extended_audit_logging: e.target.checked }))}
              />
              Extended audit logging
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.worm_audit_suggestion}
                onChange={(e) => setConfig((prev) => ({ ...prev, worm_audit_suggestion: e.target.checked }))}
              />
              WORM audit suggestion
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">Quorum minimum</label>
            <input
              className="w-24 px-3 py-2 border border-[var(--color-border)] rounded-lg"
              type="number"
              value={config.quorum_min}
              onChange={(e) => setConfig((prev) => ({ ...prev, quorum_min: Number(e.target.value) }))}
            />
          </div>
          <button className="btn-pill btn-pill-primary" onClick={saveConfig}>
            Save Config
          </button>
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-lg font-semibold">Add External Observer</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              placeholder="Name"
              value={observer.name}
              onChange={(e) => setObserver((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              placeholder="Organization"
              value={observer.organization}
              onChange={(e) => setObserver((prev) => ({ ...prev, organization: e.target.value }))}
            />
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              placeholder="Email"
              value={observer.email}
              onChange={(e) => setObserver((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <button className="btn-pill btn-pill-secondary" onClick={addObserver}>
            Add Observer
          </button>
        </div>
      </div>
    </div>
  );
}


