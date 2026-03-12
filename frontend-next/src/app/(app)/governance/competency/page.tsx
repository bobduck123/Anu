'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type CompetencyDomain = {
  id: number | string;
  name: string;
  description?: string;
};

export default function CompetencyAdminPage() {
  const [domains, setDomains] = useState<CompetencyDomain[]>([]);
  const [error, setError] = useState('');
  const [newDomain, setNewDomain] = useState({ name: '', description: '' });

  const loadDomains = () => {
    fetch(`${API_BASE}/api/competency/domains`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: { domains?: CompetencyDomain[] } }) => setDomains(data.data?.domains || []))
      .catch(() => setError('Failed to load domains'));
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const createDomain = async () => {
    const res = await fetch(`${API_BASE}/api/competency/domains`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(newDomain),
    });
    if (!res.ok) {
      setError('Failed to create domain');
      return;
    }
    setNewDomain({ name: '', description: '' });
    loadDomains();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Competency Management
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Manage domains and nodes.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-3">
          <h2 className="text-lg font-semibold">Create Domain</h2>
          <input
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
            placeholder="Name"
            value={newDomain.name}
            onChange={(e) => setNewDomain((prev) => ({ ...prev, name: e.target.value }))}
          />
          <textarea
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
            placeholder="Description"
            value={newDomain.description}
            onChange={(e) => setNewDomain((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button className="btn-pill btn-pill-primary" onClick={createDomain}>
            Add Domain
          </button>
        </div>

        <div className="card-civic space-y-2">
          <h2 className="text-lg font-semibold">Domains</h2>
          {domains.map((domain) => (
            <div key={domain.id} className="text-sm">
              {domain.name} — {domain.description}
            </div>
          ))}
          {domains.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No domains yet.</p>}
        </div>
      </div>
    </div>
  );
}


