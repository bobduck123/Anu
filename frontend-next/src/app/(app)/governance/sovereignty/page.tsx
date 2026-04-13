'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type IndexRecord = {
  index_value: number;
  formula_version: number;
  components: Record<string, number>;
  created_at?: string;
};

const FALLBACK_RECORD: IndexRecord = {
  index_value: 0.62,
  formula_version: 3,
  created_at: '2026-04-06T00:00:00.000Z',
  components: {
    autonomy_reserve: 0.67,
    service_redundancy: 0.58,
    dependency_exposure: 0.61,
    civic_response: 0.64,
  },
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatValue(value?: number) {
  return typeof value === 'number' ? value.toFixed(3) : 'n/a';
}

export default function SovereigntyIndexPage() {
  const [record, setRecord] = useState<IndexRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [degradedMode, setDegradedMode] = useState(false);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice(null);
    setDegradedMode(false);

    try {
      const response = await fetch(`${API_BASE}/api/sovereignty-index/latest`, { headers: await getAuthHeaders() });
      if (!response.ok) {
        throw new Error('latest index unavailable');
      }

      const data = await parseJsonSafe<{ data?: { index?: IndexRecord | null } }>(response);
      const liveRecord = data?.data?.index ?? null;

      if (!liveRecord) {
        setRecord(FALLBACK_RECORD);
        setDegradedMode(true);
        setNotice('No live sovereignty snapshot is published yet. Running fallback sovereignty reading for continuity.');
        return;
      }

      setRecord(liveRecord);
    } catch {
      setRecord(FALLBACK_RECORD);
      setDegradedMode(true);
      setError('Live sovereignty index is unavailable in this environment.');
      setNotice('Working now: governance routing and sovereignty review remain available while live index services recover.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const componentCount = useMemo(() => Object.keys(record?.components || {}).length, [record]);

  const computeIndex = async () => {
    setComputing(true);
    setError('');
    setNotice(null);

    if (degradedMode) {
      const baseline = record ?? FALLBACK_RECORD;
      const nextValue = Math.min(1, Number((baseline.index_value + 0.01).toFixed(3)));
      setRecord({
        ...baseline,
        index_value: nextValue,
        created_at: new Date().toISOString(),
      });
      setNotice('Index recomputed in fallback mode using local placeholder weights.');
      setComputing(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/sovereignty-index/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('compute unavailable');
      }

      const data = await parseJsonSafe<{ data?: IndexRecord | null }>(response);
      setRecord(data?.data ?? null);
    } catch {
      setDegradedMode(true);
      const baseline = record ?? FALLBACK_RECORD;
      const nextValue = Math.max(0, Number((baseline.index_value - 0.01).toFixed(3)));
      setRecord({
        ...baseline,
        index_value: nextValue,
        created_at: new Date().toISOString(),
      });
      setNotice('Live compute is unavailable. Returned a fallback local sovereignty estimate instead.');
    } finally {
      setComputing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold mb-2 text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
            Sovereignty Index
          </h1>
          <p className="text-[color:rgba(246,212,203,0.82)]">Composite node resilience and capability indicator.</p>
        </div>

        {loading ? (
          <div className="card-civic text-sm text-[color:rgba(246,212,203,0.78)]">Loading sovereignty signals…</div>
        ) : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/governance" className="btn-pill btn-pill-outline text-xs">
                    Open governance index
                  </Link>
                  <Link href="/transparency" className="btn-pill btn-pill-outline text-xs">
                    Open transparency
                  </Link>
                  <Link href="/docs" className="btn-pill btn-pill-outline text-xs">
                    Open docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Latest index</p>
            <p className="text-2xl font-semibold font-mono-data text-[var(--color-foreground)]">{formatValue(record?.index_value)}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Formula version</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">v{record?.formula_version ?? 'n/a'}</p>
          </div>
          <div className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.66)]">Components</p>
            <p className="text-2xl font-semibold text-[var(--color-foreground)]">{componentCount}</p>
          </div>
        </div>

        <div className="card-civic space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[color:rgba(246,212,203,0.66)]">Snapshot details</p>
              <p className="text-sm text-[color:rgba(246,212,203,0.78)]">
                {record?.created_at ? `Updated ${new Date(record.created_at).toLocaleString()}` : 'No timestamp available.'}
              </p>
            </div>
            <button className="btn-pill btn-pill-primary" onClick={() => void computeIndex()} disabled={computing}>
              {computing ? 'Computing…' : degradedMode ? 'Recompute (fallback)' : 'Compute index'}
            </button>
          </div>

          {record?.components ? (
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {Object.entries(record.components).map(([key, value]) => (
                <div key={key} className="flex justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-foreground)]/[0.02] px-3 py-2">
                  <span className="text-[color:rgba(246,212,203,0.72)]">{key}</span>
                  <span className="font-mono-data text-[var(--color-foreground)]">{formatValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No component telemetry available.</p>
          )}
        </div>
      </div>
    </div>
  );
}




