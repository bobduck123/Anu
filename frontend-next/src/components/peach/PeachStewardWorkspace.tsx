"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  listStewardPeachConsentOperations,
  listStewardPeachContributions,
  listStewardPeachSupportIntents,
  updateStewardPeachConsentOperation,
  updateStewardPeachContributionReview,
  type PeachConsentOperationRequest,
  type PeachConsentOperationStatus,
  type PeachReviewStatus,
  type PeachStewardContribution,
  type PeachSupportIntent,
} from '@/lib/api/peach';

const contributionStatuses: PeachReviewStatus[] = ['pending_review', 'held', 'accepted_private', 'rejected'];
const reviewTargetStatuses: Exclude<PeachReviewStatus, 'pending_review'>[] = ['held', 'accepted_private', 'rejected'];
const consentStatuses: PeachConsentOperationStatus[] = ['pending_steward_review', 'in_review', 'completed', 'rejected'];
const consentTargetStatuses: Exclude<PeachConsentOperationStatus, 'pending_steward_review'>[] = ['in_review', 'completed', 'rejected'];

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '--';
}

function StatusPill({ value }: { value: string }) {
  return <span className="rounded-full border border-[color:rgba(246,212,203,0.28)] px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.84)]">{value}</span>;
}

export function PeachStewardWorkspace() {
  const [contributionStatus, setContributionStatus] = useState<PeachReviewStatus>('pending_review');
  const [contributions, setContributions] = useState<PeachStewardContribution[]>([]);
  const [consentStatus, setConsentStatus] = useState<PeachConsentOperationStatus>('pending_steward_review');
  const [consentOperations, setConsentOperations] = useState<PeachConsentOperationRequest[]>([]);
  const [supportIntents, setSupportIntents] = useState<PeachSupportIntent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextContributions, nextConsentOperations, nextSupportIntents] = await Promise.all([
        listStewardPeachContributions(contributionStatus),
        listStewardPeachConsentOperations(consentStatus),
        listStewardPeachSupportIntents(),
      ]);
      setContributions(nextContributions);
      setConsentOperations(nextConsentOperations);
      setSupportIntents(nextSupportIntents);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load PEACH steward workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, [contributionStatus, consentStatus]);

  const pendingSupportCount = useMemo(
    () => supportIntents.filter((intent) => intent.status !== 'closed').length,
    [supportIntents],
  );

  async function submitContributionReview(event: FormEvent<HTMLFormElement>, contributionId: number) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reviewStatus = String(formData.get('reviewStatus') || 'held') as Exclude<PeachReviewStatus, 'pending_review'>;
    const stewardNote = String(formData.get('stewardNote') || '');
    setMutating(true);
    setMessage('');
    setError('');
    try {
      await updateStewardPeachContributionReview(contributionId, { reviewStatus, stewardNote });
      setMessage(`Contribution ${contributionId} moved to ${reviewStatus}. Public display remains disabled.`);
      await loadAll();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to update contribution review.');
    } finally {
      setMutating(false);
    }
  }

  async function submitConsentOperation(event: FormEvent<HTMLFormElement>, requestId: number) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const status = String(formData.get('status') || 'in_review') as Exclude<PeachConsentOperationStatus, 'pending_steward_review'>;
    const stewardNote = String(formData.get('stewardNote') || '');
    setMutating(true);
    setMessage('');
    setError('');
    try {
      await updateStewardPeachConsentOperation(requestId, { status, stewardNote });
      setMessage(`Consent operation ${requestId} moved to ${status}.`);
      await loadAll();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to update consent operation.');
    } finally {
      setMutating(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="space-y-8">
        <section className="rounded-lg border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(30,2,39,0.48)] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">PEACH steward rehearsal</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">Contribution, consent, and support review</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
            Control-plane workspace for adult-only, non-sensitive internal pilot rehearsal. Public display is disabled, support is non-payment, and all privileged requests flow through the control proxy.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-[color:rgba(246,212,203,0.16)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.64)]">Contributions in view</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{contributions.length}</p>
            </div>
            <div className="rounded-md border border-[color:rgba(246,212,203,0.16)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.64)]">Consent requests</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{consentOperations.length}</p>
            </div>
            <div className="rounded-md border border-[color:rgba(246,212,203,0.16)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:rgba(246,212,203,0.64)]">Open support intents</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-foreground)]">{pendingSupportCount}</p>
            </div>
          </div>
        </section>

        {message ? <p className="rounded-md border border-emerald-300/40 bg-emerald-900/20 p-3 text-sm text-emerald-100">{message}</p> : null}
        {error ? <p className="rounded-md border border-red-300/40 bg-red-900/20 p-3 text-sm text-red-100">{error}</p> : null}
        {loading ? <p className="text-sm text-[color:rgba(246,212,203,0.84)]">Loading PEACH steward workspace...</p> : null}

        <section className="rounded-lg border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(30,2,39,0.42)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Contribution review</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">Private submissions</h2>
            </div>
            <select value={contributionStatus} onChange={(event) => setContributionStatus(event.target.value as PeachReviewStatus)} className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.86)] px-3 py-2 text-sm text-[var(--color-foreground)]">
              {contributionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="mt-5 space-y-4">
            {contributions.length === 0 ? <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No contributions in this status.</p> : null}
            {contributions.map((contribution) => (
              <article key={contribution.id} className="rounded-md border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(39,10,42,0.5)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">#{contribution.id} {contribution.contributionType}</p>
                    <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.72)]">Credit: {contribution.contributorChosenCredit} | Contact: {contribution.contactMethod}</p>
                  </div>
                  <StatusPill value={contribution.reviewStatus} />
                </div>
                <dl className="mt-4 grid gap-3 text-xs text-[color:rgba(246,212,203,0.82)] md:grid-cols-4">
                  <div><dt>Consent</dt><dd>{contribution.consentRecord?.consentVersion || '--'} / {contribution.consentRecord?.consentLevel || '--'}</dd></div>
                  <div><dt>Visibility</dt><dd>{contribution.visibilityPreference}</dd></div>
                  <div><dt>Credit</dt><dd>{contribution.creditPreference}</dd></div>
                  <div><dt>Yield permission</dt><dd>{String(contribution.permissionForYield)}</dd></div>
                  <div><dt>Sensitive flag</dt><dd>{String(contribution.sensitiveMaterialFlag)}</dd></div>
                  <div><dt>Youth flag</dt><dd>{String(contribution.youthMaterialFlag)}</dd></div>
                  <div><dt>Created</dt><dd>{formatDate(contribution.createdAt)}</dd></div>
                  <div><dt>Public display</dt><dd>{String(contribution.publicDisplay)}</dd></div>
                </dl>
                <form onSubmit={(event) => void submitContributionReview(event, contribution.id)} className="mt-4 grid gap-3 md:grid-cols-[0.4fr_1fr_auto]">
                  <select name="reviewStatus" defaultValue="held" className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.86)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                    {reviewTargetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <input name="stewardNote" placeholder="Steward note" className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.86)] px-3 py-2 text-sm text-[var(--color-foreground)]" />
                  <button type="submit" disabled={mutating} className="rounded-md border border-[color:rgba(246,212,203,0.32)] px-3 py-2 text-sm text-[var(--color-foreground)] disabled:opacity-60">Update</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(30,2,39,0.42)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Consent operations</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">Manual requests</h2>
              </div>
              <select value={consentStatus} onChange={(event) => setConsentStatus(event.target.value as PeachConsentOperationStatus)} className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.86)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                {consentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div className="mt-5 space-y-4">
              {consentOperations.length === 0 ? <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No consent operation requests in this status.</p> : null}
              {consentOperations.map((request) => (
                <article key={request.id} className="rounded-md border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(39,10,42,0.5)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">#{request.id} {request.operationType}</p>
                      <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.72)]">{request.contributorCreditOrName} | {request.contributorContact}</p>
                    </div>
                    <StatusPill value={request.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{request.requestDetail}</p>
                  <form onSubmit={(event) => void submitConsentOperation(event, request.id)} className="mt-4 grid gap-3 md:grid-cols-[0.45fr_1fr_auto]">
                    <select name="status" defaultValue="in_review" className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.86)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                      {consentTargetStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <input name="stewardNote" placeholder="Steward note" className="rounded-md border border-[color:rgba(246,212,203,0.28)] bg-[color:rgba(39,10,42,0.86)] px-3 py-2 text-sm text-[var(--color-foreground)]" />
                    <button type="submit" disabled={mutating} className="rounded-md border border-[color:rgba(246,212,203,0.32)] px-3 py-2 text-sm text-[var(--color-foreground)] disabled:opacity-60">Update</button>
                  </form>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(30,2,39,0.42)] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:rgba(246,212,203,0.64)]">Support intents</p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">Non-payment follow-up</h2>
            <div className="mt-5 space-y-4">
              {supportIntents.length === 0 ? <p className="text-sm text-[color:rgba(246,212,203,0.72)]">No support intents recorded.</p> : null}
              {supportIntents.map((intent) => (
                <article key={intent.id} className="rounded-md border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(39,10,42,0.5)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">#{intent.id} {intent.supportType}</p>
                      <p className="mt-1 text-xs text-[color:rgba(246,212,203,0.72)]">{intent.fieldSlug || '--'} | {intent.supporterContact || 'No contact'}</p>
                    </div>
                    <StatusPill value={intent.status} />
                  </div>
                  <dl className="mt-3 grid gap-3 text-xs text-[color:rgba(246,212,203,0.82)] md:grid-cols-2">
                    <div><dt>Payment taken</dt><dd>{String(intent.paymentTaken)}</dd></div>
                    <div><dt>Amount intent</dt><dd>{intent.amountIntent || '--'} {intent.currency || ''}</dd></div>
                    <div><dt>Supporter</dt><dd>{intent.supporterName || '--'}</dd></div>
                    <div><dt>Created</dt><dd>{formatDate(intent.createdAt)}</dd></div>
                  </dl>
                  {intent.note ? <p className="mt-3 text-sm leading-6 text-[color:rgba(246,212,203,0.82)]">{intent.note}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
