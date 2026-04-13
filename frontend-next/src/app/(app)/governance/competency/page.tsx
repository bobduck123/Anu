'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type CompetencyDomain = {
  id: number | string;
  name: string;
  description?: string;
};

type DomainDraft = {
  name: string;
  description: string;
};

type PendingDomainDraft = CompetencyDomain & {
  queuedAt: string;
  statusFlag: 'pending_sync' | 'submitted';
};

const FALLBACK_DOMAINS: CompetencyDomain[] = [
  {
    id: 'D-01',
    name: 'Civic Mediation',
    description: 'Conflict de-escalation and community negotiation practice.',
  },
  {
    id: 'D-02',
    name: 'Care Logistics',
    description: 'Resource routing, queue triage, and delivery coordination.',
  },
  {
    id: 'D-03',
    name: 'Trust Reporting',
    description: 'Public accountability signals and documentation routines.',
  },
];

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function CompetencyAdminPage() {
  const [domains, setDomains] = useState<CompetencyDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [degradedMode, setDegradedMode] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState<DomainDraft>({ name: '', description: '' });
  const [pendingDomains, setPendingDomains] = useState<PendingDomainDraft[]>([]);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice(null);
    setDegradedMode(false);

    try {
      const response = await fetch(`${API_BASE}/api/competency/domains`, { headers: await getAuthHeaders() });
      if (!response.ok) {
        throw new Error('domains unavailable');
      }

      const data = await parseJsonSafe<{ data?: { domains?: CompetencyDomain[] } }>(response);
      const liveDomains = data?.data?.domains || [];

      if (liveDomains.length < 1) {
        setDomains(FALLBACK_DOMAINS);
        setDegradedMode(true);
        setNotice('Working now: fallback competency domains are shown while live data syncs.');
        return;
      }

      setDomains(liveDomains);
    } catch {
      setDomains(FALLBACK_DOMAINS);
      setDegradedMode(true);
      setError('Live competency domains are unavailable in this environment.');
      setNotice('Working now: fallback competency domains remain available for planning.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  const createDomain = async () => {
    setError('');
    setNotice(null);

    const name = newDomain.name.trim();
    const description = newDomain.description.trim();

    if (!name) {
      setError('Domain name is required.');
      return;
    }

    const pendingEntry: PendingDomainDraft = {
      id: `PD-${Date.now()}`,
      name,
      description,
      queuedAt: new Date().toISOString(),
      statusFlag: 'pending_sync',
    };

    setSaving(true);

    if (degradedMode) {
      setPendingDomains((current) => [pendingEntry, ...current].slice(0, 10));
      setNewDomain({ name: '', description: '' });
      setNotice('Working now: domain draft queued locally for replay after reconnect.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/competency/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error('create failed');
      }

      setPendingDomains((current) => [
        { ...pendingEntry, statusFlag: 'submitted' as const },
        ...current,
      ].slice(0, 10));
      setNewDomain({ name: '', description: '' });
      setNotice('Domain submitted. Refreshing list…');
      await loadDomains();
    } catch {
      setDegradedMode(true);
      setError('Live domain creation is unavailable right now.');
      setNotice('Working now: domain draft queued locally for replay after reconnect.');
      setPendingDomains((current) => [pendingEntry, ...current].slice(0, 10));
      setNewDomain({ name: '', description: '' });
    } finally {
      setSaving(false);
    }
  };

  const describedCount = useMemo(
    () => domains.filter((domain) => (domain.description || '').trim().length > 0).length,
    [domains],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Competency Domains
            </h1>
            <HoverBubble title="Why this matters" align="right">
              Domains define capability lanes for governance planning and review.
            </HoverBubble>
          </div>
          <p className="text-[color:rgba(246,212,203,0.82)]">Create and track capability domains with low-noise UI.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading competency domains…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">
                    Governance index
                  </Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">
                    Transparency
                  </Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
                    Docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Domains</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{domains.length}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">With summary</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{describedCount}</p>
          </article>
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Source</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{degradedMode ? 'Fallback' : 'Live'}</p>
          </article>
        </div>

        <section className="card-civic space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Add domain
            </h2>
            <HoverBubble title="Declutter mode" align="left">
              Description is optional and tucked in an advanced section.
            </HoverBubble>
          </div>

          <input
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
            placeholder="Domain name"
            value={newDomain.name}
            onChange={(event) => setNewDomain((current) => ({ ...current, name: event.target.value }))}
          />

          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3">
            <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">Optional description</summary>
            <textarea
              className="mt-3 w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-foreground)]/[0.02] text-[var(--color-foreground)]"
              placeholder="What this domain covers"
              value={newDomain.description}
              onChange={(event) => setNewDomain((current) => ({ ...current, description: event.target.value }))}
            />
          </details>

          <button className="btn-pill btn-pill-primary" onClick={() => void createDomain()} disabled={saving}>
            {saving ? 'Saving…' : 'Add domain'}
          </button>
        </section>

        <section className="card-civic space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Current domains
            </h2>
            <HoverBubble title="Fast scan" align="left">
              Cards show name first. Expand queued drafts only when needed.
            </HoverBubble>
          </div>

          {domains.length === 0 ? (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No domains available.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {domains.map((domain) => (
                <div key={domain.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3 text-sm">
                  <p className="font-semibold text-[var(--color-foreground)]">{domain.name}</p>
                  {domain.description ? (
                    <p className="mt-1 text-[color:rgba(246,212,203,0.82)]">{domain.description}</p>
                  ) : (
                    <p className="mt-1 text-[color:rgba(246,212,203,0.62)]">No description yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {pendingDomains.length > 0 ? (
            <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-3" open>
              <summary className="cursor-pointer text-sm text-[color:rgba(246,212,203,0.82)]">
                Pending / recent drafts ({pendingDomains.length})
              </summary>
              <div className="mt-3 space-y-2">
                {pendingDomains.map((domain) => (
                  <div key={domain.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] p-2 text-sm">
                    <span className="font-semibold text-[var(--color-foreground)]">{domain.name}</span>
                    <span className="ml-2 text-[color:rgba(246,212,203,0.65)]">
                      {domain.statusFlag === 'pending_sync' ? 'pending sync' : 'submitted'} · {new Date(domain.queuedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </div>
    </div>
  );
}




