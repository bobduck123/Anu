'use client';

import { useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type FederationSnapshot = {
  total_nodes: number;
  total_treasury_cents: number;
  total_users: number;
  total_certified_users: number;
  average_sovereignty_index: number;
  mutual_aid_pairs: number;
  protocol_versions: Record<string, string>;
  created_at?: string;
};

export default function FederationDashboardPage() {
  const [snapshot, setSnapshot] = useState<FederationSnapshot | null>(null);
  const [error, setError] = useState('');
  const [mutualAid, setMutualAid] = useState({ from_node_id: 1, to_node_id: 1, status: 'active' });

  const computeMetrics = async () => {
    const res = await fetch(`${API_BASE}/api/federation/metrics`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      setError('Failed to compute federation metrics');
      return;
    }
    const data = await res.json();
    setSnapshot(data.data?.snapshot || null);
  };

  const createMutualAid = async () => {
    const res = await fetch(`${API_BASE}/api/federation/mutual-aid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(mutualAid),
    });
    if (!res.ok) {
      setError('Failed to create mutual aid flag');
      return;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Federation Metrics
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Cross-node intelligence layer and mutual aid tracking.
          </p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="card-civic space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Snapshot</h2>
            <button className="btn-pill btn-pill-primary" onClick={computeMetrics}>
              Compute Metrics
            </button>
          </div>
          {!snapshot && <p className="text-sm text-[var(--color-muted-foreground)]">No snapshot yet.</p>}
          {snapshot && (
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>Total nodes: {snapshot.total_nodes}</div>
              <div>Total treasury: {snapshot.total_treasury_cents} cents</div>
              <div>Total users: {snapshot.total_users}</div>
              <div>Certified users: {snapshot.total_certified_users}</div>
              <div>Avg sovereignty index: {snapshot.average_sovereignty_index.toFixed(3)}</div>
              <div>Mutual aid pairs: {snapshot.mutual_aid_pairs}</div>
            </div>
          )}
        </div>

        <div className="card-civic space-y-3">
          <h2 className="text-lg font-semibold">Mutual Aid Flag</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              type="number"
              value={mutualAid.from_node_id}
              onChange={(e) => setMutualAid((prev) => ({ ...prev, from_node_id: Number(e.target.value) }))}
              placeholder="From node ID"
            />
            <input
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              type="number"
              value={mutualAid.to_node_id}
              onChange={(e) => setMutualAid((prev) => ({ ...prev, to_node_id: Number(e.target.value) }))}
              placeholder="To node ID"
            />
            <select
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
              value={mutualAid.status}
              onChange={(e) => setMutualAid((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
            </select>
          </div>
          <button className="btn-pill btn-pill-secondary" onClick={createMutualAid}>
            Create Mutual Aid Flag
          </button>
        </div>

        <div className="card-civic space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Silent Federation Nodes</h2>
            <span className="text-xs text-[var(--color-muted-foreground)]">Partner integration</span>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Partner products can embed our civic engine via reverse proxy or the widget SDK.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Bridge Identity</h3>
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">
                POST /api/node/auth/bridge
              </code>
              <h3 className="text-sm font-semibold">Accrue / Redeem Benefits</h3>
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">
                POST /api/node/benefits/accrue
              </code>
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">
                POST /api/node/benefits/redeem
              </code>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Widget Preview</h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Use a partner token and partner_user_id query to render benefits balance.
              </p>
              <iframe
                className="w-full min-h-[180px] rounded-lg border border-[var(--color-border)]"
                src={`${API_BASE}/community?widget=benefits`}
                title="Federation Widget Preview"
              />
              <code className="block text-xs p-3 rounded-lg bg-[var(--color-muted)]">
                /community?widget=benefits&token=PARTNER_JWT&partner_user_id=abc123
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


