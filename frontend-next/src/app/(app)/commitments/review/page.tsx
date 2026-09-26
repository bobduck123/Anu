'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { actionCommitmentsApi, type ActionCommitment } from '@/lib/api/actionCommitments';

export default function CommitmentReviewPage() {
  const [records, setRecords] = useState<ActionCommitment[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => setRecords(await actionCommitmentsApi.reviewQueue());

  useEffect(() => {
    refresh().catch(() => setError('Steward access is required to review completions.')).finally(() => setLoading(false));
  }, []);

  const review = async (record: ActionCommitment, decision: 'verify' | 'request_changes') => {
    setBusy(record.id);
    setError(null);
    try {
      await actionCommitmentsApi.review(record.id, decision, notes[record.id] || '');
      await refresh();
    } catch {
      await refresh().catch(() => undefined);
      setError('Review could not be confirmed. Check the queue before trying again.');
    } finally {
      setBusy(null);
    }
  };

  return <main className="min-h-screen bg-background px-4 py-12">
    <div className="mx-auto max-w-3xl card-civic">
      <h1 className="text-3xl font-semibold mb-3">Completion review</h1>
      <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">Verify the submitted evidence before it contributes to the public outcome count.</p>
      {loading ? <p role="status">Loading review queue...</p> : null}
      {error ? <p role="alert" className="mb-4 text-[var(--color-danger)]">{error}</p> : null}
      {!loading && !error && records.length === 0 ? <p>No completions are awaiting review.</p> : null}
      <div className="space-y-5">
        {records.map((record) => <article key={record.id} className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
          <h2 className="font-semibold"><Link className="underline" href={`/actions/${record.action_id}`}>{record.action_title}</Link></h2>
          <p>Participant: {record.participant_name}</p>
          {record.evidence_note ? <p>Report: {record.evidence_note}</p> : null}
          {record.evidence_url ? <a className="underline" href={record.evidence_url} target="_blank" rel="noopener noreferrer">Open evidence link</a> : null}
          <label className="block text-sm" htmlFor={`review-note-${record.id}`}>Review note (required for changes)</label>
          <textarea id={`review-note-${record.id}`} maxLength={1000} value={notes[record.id] || ''} onChange={(event) => setNotes((previous) => ({ ...previous, [record.id]: event.target.value }))} className="w-full rounded border border-[var(--color-border)] bg-background px-3 py-2" />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-pill btn-pill-sage" disabled={busy !== null} onClick={() => void review(record, 'verify')}>Verify outcome</button>
            <button type="button" className="btn-pill btn-pill-outline" disabled={busy !== null || !notes[record.id]?.trim()} onClick={() => void review(record, 'request_changes')}>Request changes</button>
          </div>
        </article>)}
      </div>
    </div>
  </main>;
}
