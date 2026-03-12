'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { reliefApi, type ReliefDecision, type ReliefRequestRecord } from '@/lib/api/endpoints';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  Loader2,
  Save,
  BarChart3,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'var(--color-accent-light)', text: 'var(--color-accent)' },
  under_review: { bg: 'var(--color-institutional-light)', text: 'var(--color-institutional)' },
  approved: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
  disbursed: { bg: 'var(--color-forest-light)', text: 'var(--color-forest)' },
  escalated: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)' },
  rejected: { bg: 'var(--color-muted)', text: 'var(--color-earth-medium)' },
};

const urgencyColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)' },
  medium: { bg: 'var(--color-accent-light)', text: 'var(--color-accent)' },
  low: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
};

export default function ReliefDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ReliefRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{ approval_ratio: number; median_response_days: number } | null>(null);
  const [decisions, setDecisions] = useState<ReliefDecision[]>([]);
  const [triageScore, setTriageScore] = useState<number | null>(null);
  const [triageReason, setTriageReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = Number(params.id);
    reliefApi
      .getRequest(id)
      .then((d) => {
        setData(d);
        setTriageScore(d.triage_score || 0);
        setTriageReason(d.triage_reason || '');
      })
      .catch((err) => setError(err.message || 'Failed to load request'))
      .finally(() => setLoading(false));
    reliefApi.decisions(id).then(setDecisions).catch(() => null);
    reliefApi
      .metrics()
      .then((m) => setMetrics({ approval_ratio: m.approval_ratio, median_response_days: m.median_response_days }))
      .catch(() => null);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-institutional)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-28 pb-20">
          <Link href="/admin/relief" className="inline-flex items-center gap-2 text-sm text-[var(--color-institutional)] mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </Link>
          <div className="p-6 rounded-xl bg-[var(--color-danger-light)] border border-[var(--color-danger)]">
            <p className="text-[var(--color-danger)]">{error || 'Request not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const status = statusColors[data.status] || statusColors.pending;
  const urgency = urgencyColors[data.urgency] || urgencyColors.low;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-28 pb-20">
        {/* Back link */}
        <Link href="/admin/relief" className="inline-flex items-center gap-2 text-sm text-[var(--color-institutional)] hover:gap-3 transition-all mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-2xl md:text-3xl font-semibold text-[var(--color-earth-dark)]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Relief Request
              <span className="font-mono-data ml-2">#{data.id}</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full capitalize"
              style={{ backgroundColor: status.bg, color: status.text }}
            >
              {data.status}
            </span>
            <span
              className="text-xs font-medium px-3 py-1.5 rounded-full capitalize"
              style={{ backgroundColor: urgency.bg, color: urgency.text }}
            >
              {data.urgency} urgency
            </span>
          </div>
        </div>

        {/* Request Details */}
        <div className="card-civic mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider mb-1">Amount Requested</p>
              <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
                ${(data.amount_requested_cents / 100).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider mb-1">Purpose</p>
              <p className="text-lg text-[var(--color-earth-dark)] capitalize">{data.purpose}</p>
            </div>
            {data.triage_reason && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider mb-1">Triage Reason</p>
                <p className="text-sm text-[var(--color-earth-dark)]">{data.triage_reason}</p>
              </div>
            )}
            {data.description && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--color-earth-medium)] uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-[var(--color-earth-dark)]">{data.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Triage Override */}
        <div className="card-civic mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="font-semibold text-[var(--color-earth-dark)]">Triage Override</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="block sm:w-32">
              <span className="text-xs text-[var(--color-earth-medium)]">Score</span>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] font-mono-data focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)]"
                value={triageScore ?? 0}
                onChange={(e) => setTriageScore(Number(e.target.value))}
              />
            </label>
            <label className="block flex-1">
              <span className="text-xs text-[var(--color-earth-medium)]">Reason</span>
              <input
                className="w-full mt-1 px-3 py-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-earth-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-institutional)]"
                placeholder="Override reason..."
                value={triageReason}
                onChange={(e) => setTriageReason(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={async () => {
                  if (triageScore === null) return;
                  setSaving(true);
                  await reliefApi.overrideTriage(Number(params.id), triageScore, triageReason);
                  setSaving(false);
                }}
                disabled={saving}
                className="btn-pill btn-pill-accent text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Decision Timeline */}
        <div className="card-civic mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-[var(--color-institutional)]" />
            <h2 className="font-semibold text-[var(--color-earth-dark)]">Decision Timeline</h2>
          </div>
          {decisions.length > 0 ? (
            <div className="space-y-3">
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-3 pb-3 border-b border-[var(--color-border)] last:border-0"
                >
                  <div className="mt-0.5">
                    {d.decision === 'approve' ? (
                      <CheckCircle className="w-4 h-4 text-[var(--color-sage)]" />
                    ) : d.decision === 'reject' ? (
                      <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[var(--color-earth-medium)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-[var(--color-earth-dark)] capitalize">
                        {d.decision}
                      </span>
                      <span className="text-xs text-[var(--color-earth-medium)]">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-earth-medium)] mt-0.5">
                      {d.actor ? `By ${d.actor}` : 'System'}
                      {d.amount_cents ? ` · $${(d.amount_cents / 100).toFixed(2)}` : ''}
                      {d.reason ? ` · ${d.reason}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-earth-medium)]">No decisions yet.</p>
          )}
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="card-civic">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[var(--color-forest)]" />
              <h2 className="font-semibold text-[var(--color-earth-dark)]">Node Metrics</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-[var(--color-earth-medium)] mb-1">Approval Ratio</p>
                <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
                  {(metrics.approval_ratio * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-earth-medium)] mb-1">Median Response</p>
                <p className="text-2xl font-semibold text-[var(--color-earth-dark)] font-mono-data">
                  {metrics.median_response_days.toFixed(1)} <span className="text-sm font-normal">days</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
