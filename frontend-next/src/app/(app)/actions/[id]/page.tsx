'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamicImport from 'next/dynamic';
import { api, Action, ActionProof, ActionImpactMetric } from '@/lib/api';

const MapView = dynamicImport(() => import('@/components/shared/MapView'), { ssr: false });

export default function ActionDetailPage() {
  const params = useParams();
  const actionId = String(params?.id || '');
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState<ActionProof[]>([]);
  const [metrics, setMetrics] = useState<ActionImpactMetric[]>([]);
  const [proofForm, setProofForm] = useState({ before_url: '', after_url: '', proof_url: '' });
  const [metricForm, setMetricForm] = useState({ label: '', value: '', unit: '' });
  const [submittingProof, setSubmittingProof] = useState(false);
  const [submittingMetric, setSubmittingMetric] = useState(false);
  const [imageMode, setImageMode] = useState<'before' | 'after'>('before');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.actions.getById(actionId);
        setAction(data);
        const [proofData, metricData] = await Promise.all([
          api.actions.getProofs(actionId),
          api.actions.getMetrics(actionId),
        ]);
        setProofs(proofData);
        setMetrics(metricData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load action';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    if (actionId) {
      load();
    }
  }, [actionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-sage)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-12">
        <div className="max-w-3xl mx-auto card-civic">
          <p className="text-[var(--color-danger)] mb-4">{error}</p>
          <Link href="/actions" className="btn-pill btn-pill-outline">Back to actions</Link>
        </div>
      </div>
    );
  }

  if (!action) return null;

  const hasLocation = action.location?.coordinates;
  const hasVerified = proofs.some((proof) => proof.verified);
  const markers = hasLocation ? [{
    id: action._id,
    lat: action.location!.coordinates[1],
    lng: action.location!.coordinates[0],
    title: action.title,
    popup: `<strong>${action.title}</strong><br/>${action.address || ''}`,
    color: 'sage' as const,
  }] : [];

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-4xl mx-auto card-civic">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
              {action.title}
            </h1>
            {hasVerified && (
              <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-sage-light)] text-[var(--color-forest)]">
                Impact Verified
              </span>
            )}
          </div>
          <Link href="/actions" className="btn-pill btn-pill-outline text-sm">Back</Link>
        </div>

        <p className="text-[var(--color-muted-foreground)] mb-4">{action.details}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Type</div>
            <div>{action.actionType}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Points</div>
            <div className="font-mono-data">{action.pointsAssigned}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">End Date</div>
            <div>{new Date(action.endDate).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Completions</div>
            <div className="font-mono-data">{action.completions}</div>
          </div>
          <div>
            <div className="text-[var(--color-muted-foreground)] mb-1">Location</div>
            <div>
              {action.isOnline ? 'Online' : action.isGlobal ? 'Global' : `${action.city}, ${action.country}`}
            </div>
          </div>
        </div>

        {hasLocation && (
          <div className="card-civic">
            <MapView markers={markers} height="400px" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-3">Action Replay</h2>
            {proofs.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No proof uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setImageMode('before')} className={`btn-pill text-xs ${imageMode === 'before' ? 'btn-pill-primary' : 'btn-pill-outline'}`}>
                    Before
                  </button>
                  <button onClick={() => setImageMode('after')} className={`btn-pill text-xs ${imageMode === 'after' ? 'btn-pill-primary' : 'btn-pill-outline'}`}>
                    After
                  </button>
                </div>
                {proofs[0] && (
                  <div className="border border-[var(--color-border)] rounded-lg p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageMode === 'before' ? proofs[0].before_url || proofs[0].proof_url : proofs[0].after_url || proofs[0].proof_url}
                      alt="Proof"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <input
                value={proofForm.before_url}
                onChange={(e) => setProofForm((p) => ({ ...p, before_url: e.target.value }))}
                placeholder="Before photo URL"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <input
                value={proofForm.after_url}
                onChange={(e) => setProofForm((p) => ({ ...p, after_url: e.target.value }))}
                placeholder="After photo URL"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <input
                value={proofForm.proof_url}
                onChange={(e) => setProofForm((p) => ({ ...p, proof_url: e.target.value }))}
                placeholder="Proof media URL"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <button
                onClick={async () => {
                  setSubmittingProof(true);
                  try {
                    const created = await api.actions.addProof(actionId, proofForm);
                    setProofs((prev) => [created, ...prev]);
                    setProofForm({ before_url: '', after_url: '', proof_url: '' });
                  } finally {
                    setSubmittingProof(false);
                  }
                }}
                disabled={submittingProof}
                className="btn-pill btn-pill-sage text-sm w-full"
              >
                {submittingProof ? 'Saving...' : 'Upload Proof'}
              </button>
            </div>
          </div>

          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-3">Impact Metrics</h2>
            <div className="space-y-2 mb-4">
              {metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between text-sm">
                  <span>{metric.label}</span>
                  <span className="font-mono-data">{metric.value} {metric.unit}</span>
                </div>
              ))}
              {metrics.length === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">No impact metrics yet.</p>
              )}
            </div>
            <div className="space-y-2">
              <input
                value={metricForm.label}
                onChange={(e) => setMetricForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="Metric label (e.g. Trees planted)"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <input
                value={metricForm.value}
                onChange={(e) => setMetricForm((p) => ({ ...p, value: e.target.value }))}
                placeholder="Value"
                type="number"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <input
                value={metricForm.unit}
                onChange={(e) => setMetricForm((p) => ({ ...p, unit: e.target.value }))}
                placeholder="Unit (optional)"
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <button
                onClick={async () => {
                  if (!metricForm.label.trim()) return;
                  setSubmittingMetric(true);
                  try {
                    const created = await api.actions.addMetric(actionId, {
                      label: metricForm.label,
                      value: Number(metricForm.value),
                      unit: metricForm.unit,
                    });
                    setMetrics((prev) => [created, ...prev]);
                    setMetricForm({ label: '', value: '', unit: '' });
                  } finally {
                    setSubmittingMetric(false);
                  }
                }}
                disabled={submittingMetric}
                className="btn-pill btn-pill-primary text-sm w-full"
              >
                {submittingMetric ? 'Saving...' : 'Add Metric'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
