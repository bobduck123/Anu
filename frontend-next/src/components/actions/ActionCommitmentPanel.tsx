'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { actionCommitmentsApi, type ActionCommitment } from '@/lib/api/actionCommitments';

const statusLabel: Record<ActionCommitment['status'], string> = {
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  PENDING_REVIEW: 'Awaiting steward review',
  NEEDS_CHANGES: 'Changes requested',
  VERIFIED: 'Verified outcome',
};

export function ActionCommitmentPanel({ actionId }: { actionId: string }) {
  const [record, setRecord] = useState<ActionCommitment | null>(null);
  const [verifiedCount, setVerifiedCount] = useState<number | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountUnavailable, setAccountUnavailable] = useState(false);

  const refresh = async () => {
    const [mine, publicResult] = await Promise.allSettled([
      actionCommitmentsApi.forAction(actionId),
      actionCommitmentsApi.publicOutcome(actionId),
    ]);
    if (mine.status === 'fulfilled') {
      setRecord(mine.value);
      setAccountUnavailable(false);
    }
    if (publicResult.status === 'fulfilled') setVerifiedCount(publicResult.value.verified_outcomes);
    return mine.status === 'fulfilled' ? mine.value : null;
  };

  useEffect(() => {
    let active = true;
    Promise.allSettled([actionCommitmentsApi.forAction(actionId), actionCommitmentsApi.publicOutcome(actionId)])
      .then(([mine, publicResult]) => {
        if (!active) return;
        if (mine.status === 'fulfilled') setRecord(mine.value);
        else setAccountUnavailable(true);
        if (publicResult.status === 'fulfilled') setVerifiedCount(publicResult.value.verified_outcomes);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [actionId]);

  const mutate = async (operation: () => Promise<ActionCommitment>, expectedStatus: ActionCommitment['status']) => {
    setBusy(true);
    setError(null);
    try {
      setRecord(await operation());
      await refresh();
    } catch {
      // A response can be lost after a successful commit. Re-read before reporting failure.
      const current = await refresh();
      if (current?.status !== expectedStatus) {
        setError('We could not confirm that change. Check the status below before trying again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-civic mt-6" aria-label="Action commitment">
      <h2 className="text-lg font-semibold mb-2">Your commitment</h2>
      <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
        Confirm that you intend to do this action. Completion requires evidence and a steward review.
      </p>
      {verifiedCount !== null ? <p className="text-sm mb-4">{verifiedCount} steward-verified {verifiedCount === 1 ? 'outcome' : 'outcomes'} for this action.</p> : null}
      {loading ? <p role="status">Loading commitment...</p> : accountUnavailable ? (
        <p>Sign in to confirm an action commitment. <Link href="/auth" className="underline">Sign in</Link></p>
      ) : (
        <div className="space-y-4">
          {record ? <p role="status">Status: <strong>{statusLabel[record.status]}</strong></p> : <p>No commitment has been confirmed yet.</p>}
          {record?.review_note ? <p>Steward note: {record.review_note}</p> : null}
          {record?.evidence_url ? <p>Evidence: <a className="underline" href={record.evidence_url} target="_blank" rel="noopener noreferrer">Open submitted link</a></p> : null}
          {error ? <p role="alert" className="text-[var(--color-danger)]">{error}</p> : null}
          {(!record || record.status === 'CANCELLED') ? (
            <button type="button" className="btn-pill btn-pill-primary" disabled={busy} onClick={() => void mutate(() => actionCommitmentsApi.confirm(actionId), 'CONFIRMED')}>
              {busy ? 'Confirming...' : 'Confirm commitment'}
            </button>
          ) : null}
          {record?.status === 'CONFIRMED' ? (
            <button type="button" className="btn-pill btn-pill-outline" disabled={busy} onClick={() => void mutate(() => actionCommitmentsApi.cancel(record.id), 'CANCELLED')}>
              Cancel commitment
            </button>
          ) : null}
          {record && (record.status === 'CONFIRMED' || record.status === 'NEEDS_CHANGES') ? (
            <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault();
              void mutate(() => actionCommitmentsApi.complete(record.id, evidenceUrl, evidenceNote), 'PENDING_REVIEW');
            }}>
              <label className="block text-sm" htmlFor="commitment-evidence-url">Evidence link (HTTPS)</label>
              <input id="commitment-evidence-url" type="url" required pattern="https://.*" maxLength={500} value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} className="w-full rounded border border-[var(--color-border)] bg-background px-3 py-2" />
              <label className="block text-sm" htmlFor="commitment-evidence-note">What happened? (optional)</label>
              <textarea id="commitment-evidence-note" maxLength={1000} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} className="w-full rounded border border-[var(--color-border)] bg-background px-3 py-2" />
              <button type="submit" className="btn-pill btn-pill-sage" disabled={busy}>{busy ? 'Submitting...' : 'Submit completion for review'}</button>
            </form>
          ) : null}
          <Link href="/commitments" className="inline-block underline">View my commitments</Link>
        </div>
      )}
    </section>
  );
}
