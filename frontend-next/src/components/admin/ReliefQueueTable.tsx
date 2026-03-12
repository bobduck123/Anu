'use client';

import Link from 'next/link';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { ReliefRequestRecord } from '@/lib/api/endpoints';

type ReliefQueueItem = ReliefRequestRecord;

interface ReliefQueueTableProps {
  items: ReliefQueueItem[];
  onVote: (id: number, vote: 'approve' | 'reject') => void;
}

const urgencyStyles: Record<string, { bg: string; text: string }> = {
  high: { bg: 'var(--color-danger-light)', text: 'var(--color-danger)' },
  medium: { bg: 'var(--color-accent-light)', text: 'var(--color-accent)' },
  low: { bg: 'var(--color-sage-light)', text: 'var(--color-sage)' },
};

export default function ReliefQueueTable({ items, onVote }: ReliefQueueTableProps) {
  if (!items.length) {
    return (
      <div className="card-civic text-center py-10">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-[var(--color-earth-medium)] opacity-40" />
        <p className="text-sm text-[var(--color-earth-medium)]">No requests in queue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-muted)' }}>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-earth-medium)] text-xs uppercase tracking-wider">Request</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-earth-medium)] text-xs uppercase tracking-wider">Purpose</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-earth-medium)] text-xs uppercase tracking-wider">Urgency</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-earth-medium)] text-xs uppercase tracking-wider">Amount</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-earth-medium)] text-xs uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const requestId = item.id ?? item.request_id ?? 0;
            const urgency = urgencyStyles[item.urgency] || urgencyStyles.low;
            return (
              <tr
                key={requestId}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)] transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/relief/${requestId}`}
                    className="font-medium text-[var(--color-institutional)] hover:underline font-mono-data"
                  >
                    #{requestId}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize text-[var(--color-earth-dark)]">{item.purpose}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                    style={{ backgroundColor: urgency.bg, color: urgency.text }}
                  >
                    {item.urgency}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono-data text-[var(--color-earth-dark)]">
                  ${(item.amount_requested_cents / 100).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onVote(requestId, 'approve')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                      style={{ backgroundColor: 'var(--color-sage)' }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => onVote(requestId, 'reject')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: 'var(--color-muted)',
                        color: 'var(--color-earth-dark)',
                      }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
