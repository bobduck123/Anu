'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { actionCommitmentsApi, type ActionCommitment } from '@/lib/api/actionCommitments';

export default function MyCommitmentsPage() {
  const [records, setRecords] = useState<ActionCommitment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    actionCommitmentsApi.mine()
      .then(setRecords)
      .catch(() => setError('Sign in or try again to view your commitments.'))
      .finally(() => setLoading(false));
  }, []);

  return <main className="min-h-screen bg-background px-4 py-12">
    <div className="mx-auto max-w-3xl card-civic">
      <h1 className="text-3xl font-semibold mb-3">My commitments</h1>
      <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">Your confirmed actions, evidence submissions, and steward decisions stay with your account.</p>
      {loading ? <p role="status">Loading commitments...</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && records.length === 0 ? <p>No commitments yet. <Link href="/actions" className="underline">Find an action</Link></p> : null}
      <div className="space-y-4">
        {records.map((record) => <article key={record.id} className="rounded-lg border border-[var(--color-border)] p-4">
          <h2 className="font-semibold">{record.action_title}</h2>
          <p>Status: {record.status.replaceAll('_', ' ').toLowerCase()}</p>
          {record.review_note ? <p>Steward note: {record.review_note}</p> : null}
          <Link href={`/actions/${record.action_id}`} className="underline">Open action and commitment</Link>
        </article>)}
      </div>
    </div>
  </main>;
}
