'use client';

import { useEffect, useMemo, useState } from 'react';
import { constellationsApi, ConstellationAlert, ConstellationSummary } from '@/lib/api/endpoints';
import { Loader2, ShieldAlert } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export default function ConstellationAdminPage() {
  const [constellations, setConstellations] = useState<ConstellationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<ConstellationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await constellationsApi.list();
        setConstellations(res.constellations || []);
        if (res.constellations?.length) {
          setSelectedId(res.constellations[0].id);
        }
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Failed to load constellations'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const loadAlerts = async () => {
      try {
        const res = await constellationsApi.alerts(selectedId, false);
        setAlerts(res.alerts || []);
      } catch (error: unknown) {
        setError(getErrorMessage(error, 'Failed to load alerts'));
      }
    };
    loadAlerts();
  }, [selectedId]);

  const handleResolve = async (alertId: number) => {
    if (!selectedId) return;
    setWorking(true);
    try {
      await constellationsApi.resolveAlert(selectedId, alertId);
      const res = await constellationsApi.alerts(selectedId, false);
      setAlerts(res.alerts || []);
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to resolve alert'));
    } finally {
      setWorking(false);
    }
  };

  const selected = useMemo(() => constellations.find((c) => c.id === selectedId), [constellations, selectedId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-28 pb-20">
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-institutional)] mb-3">
            <ShieldAlert className="w-4 h-4" />
            Admin
          </span>
          <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)]" style={{ fontFamily: 'var(--font-serif)' }}>
            Constellation Drift Alerts
          </h1>
          <p className="text-[var(--color-earth-medium)] mt-2">
            Review and resolve drift alerts. No automatic enforcement is applied.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-accent)] mb-6">
            <p className="text-sm text-[var(--color-accent)]">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
          </div>
        ) : (
          <>
            <div className="card-civic mb-6">
              <label className="text-xs text-[var(--color-earth-medium)]">Select constellation</label>
              <select
                className="mt-2 w-full border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-foreground)]"
                value={selectedId ?? ''}
                onChange={(event) => setSelectedId(Number(event.target.value))}
              >
                {constellations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-sm text-[var(--color-earth-medium)] mt-2">
                  Domain: <span className="text-[var(--color-earth-dark)]">{selected.domain || 'general'}</span>
                </p>
              )}
            </div>

            <div className="card-civic">
              <h3 className="text-lg font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                Active Alerts
              </h3>
              {alerts.length === 0 ? (
                <p className="text-sm text-[var(--color-earth-medium)]">No active alerts.</p>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border border-[var(--color-border)] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-earth-dark)]">{alert.alertType}</p>
                          <p className="text-xs text-[var(--color-earth-medium)]">
                            Severity: <span className="font-semibold">{alert.severity}</span>
                          </p>
                          <p className="text-xs text-[var(--color-earth-medium)]">
                            Metric: {alert.metricValue ?? 'n/a'} / {alert.threshold ?? 'n/a'}
                          </p>
                        </div>
                        <button
                          className="text-xs font-semibold px-3 py-2 rounded-lg bg-[var(--color-forest)] text-[var(--color-foreground)] disabled:opacity-50"
                          onClick={() => handleResolve(alert.id)}
                          disabled={working}
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
